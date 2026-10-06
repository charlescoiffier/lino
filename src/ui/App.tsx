import { useEffect, useMemo, useRef, useState } from 'react';
import { layerMasks } from '../core/layers';
import { hexToRgb, loadPalette, nearestSwatch, type Palette } from '../core/palette';
import type { ProcessResult } from '../core/pipeline';
import { MAX_COLORS, MIN_COLORS } from '../core/quantize';
import { compositeRgba, maskRgba } from '../core/render';
import type { RgbaImage } from '../core/types';
import { listProjects, loadProject, projectFromFile, projectToFile, saveProject, type Project } from '../store/projects';
import { CancelledError, ProcessingClient, type WorkerLike } from '../workers/client';
import { downloadBlob, rgbaToPngBlob } from './export';
import { LayerCard } from './LayerCard';
import { loadImage } from './loadImage';
import { ProjectBar } from './ProjectBar';
import { RgbaCanvas } from './RgbaCanvas';

export interface Source {
  name: string;
  type: string;
  bytes: ArrayBuffer;
}

const PALETTE_URL = `${import.meta.env.BASE_URL}palettes/linocut-inks.json`;

export function App() {
  const [source, setSource] = useState<Source | null>(null);
  const [image, setImage] = useState<RgbaImage | null>(null);
  const [n, setN] = useState(4);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [swatchIds, setSwatchIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingIds = useRef<string[] | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageAvailable, setStorageAvailable] = useState(true);

  async function refreshProjects() {
    try {
      setProjects(await listProjects());
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }
  useEffect(() => {
    refreshProjects();
  }, []);

  function currentProject(): Project | null {
    if (!source || !result) return null;
    return {
      id: projectId ?? crypto.randomUUID(),
      name: source.name,
      imageBytes: source.bytes,
      imageType: source.type,
      n,
      swatchIds,
      updatedAt: Date.now(),
    };
  }

  function applyProject(p: Project) {
    pendingIds.current = p.swatchIds;
    setProjectId(p.id);
    setN(p.n);
    setSource({ name: p.name, type: p.imageType, bytes: p.imageBytes });
  }

  async function onSave() {
    const p = currentProject();
    if (!p) return;
    try {
      await saveProject(p);
      setProjectId(p.id);
      await refreshProjects();
    } catch {
      setStorageAvailable(false);
    }
  }

  async function onOpen(id: string) {
    try {
      const p = await loadProject(id);
      if (p) applyProject(p);
    } catch {
      setStorageAvailable(false);
    }
  }

  function onExportFile() {
    const p = currentProject();
    if (p) downloadBlob(projectToFile(p), `${p.name.replace(/\.[^.]+$/, '')}.lino.json`);
  }

  async function onImportFile(file: File) {
    try {
      applyProject(await projectFromFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fichier projet invalide.');
    }
  }

  const client = useMemo(
    () =>
      new ProcessingClient(
        () => new Worker(new URL('../workers/process.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike,
      ),
    [],
  );
  useEffect(() => () => client.cancel(), [client]);

  useEffect(() => {
    loadPalette(PALETTE_URL).then(setPalette, (e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    client.cancel();
    setBusy(false);
    setImage(null);
    setResult(null);
    if (!source) return;
    let live = true;
    loadImage(new File([source.bytes], source.name, { type: source.type })).then(
      (img) => {
        if (live) {
          setError(null);
          setImage(img);
        }
      },
      (e: Error) => {
        if (live) setError(e.message);
      },
    );
    return () => {
      live = false;
    };
  }, [source, client]);

  useEffect(() => {
    if (!image) return;
    let live = true;
    setBusy(true);
    client.run(image, n).then(
      (r) => {
        if (!live) return;
        setError(null);
        setResult(r);
        setBusy(false);
      },
      (e: Error) => {
        if (e instanceof CancelledError || !live) return;
        setError(e.message);
        setBusy(false);
      },
    );
    return () => {
      live = false;
    };
  }, [image, n, client]);

  useEffect(() => {
    if (!result || !palette) return;
    const pending = pendingIds.current;
    pendingIds.current = null;
    setSwatchIds(
      result.centroidsRgb.map((rgb, i) => {
        const wanted = pending?.[i];
        return wanted && palette.swatches.some((s) => s.id === wanted) ? wanted : nearestSwatch(palette.swatches, rgb).id;
      }),
    );
  }, [result, palette]);

  const masks = useMemo(() => (result ? layerMasks(result.indices, result.centroidsRgb.length) : []), [result]);
  const ready = result && palette && swatchIds.length === masks.length;
  const colors = useMemo(
    () => (palette ? swatchIds.map((id) => hexToRgb(palette.swatches.find((s) => s.id === id)?.hex ?? '#000000')) : []),
    [palette, swatchIds],
  );
  const composite = useMemo(() => (ready ? compositeRgba(result.indices, colors) : null), [ready, result, colors]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setSource({ name: file.name, type: file.type, bytes: await file.arrayBuffer() });
  }

  async function exportLayer(k: number) {
    if (!result) return;
    const blob = await rgbaToPngBlob(maskRgba(masks[k]), result.width, result.height);
    downloadBlob(blob, `calque-${k + 1}.png`);
  }

  async function exportComposite() {
    if (!result || !composite) return;
    downloadBlob(await rgbaToPngBlob(composite, result.width, result.height), 'apercu.png');
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Lino</h1>
      {error && (
        <p role="alert" style={{ color: '#b00020' }}>
          {error}
        </p>
      )}
      <ProjectBar
        projects={projects}
        canSave={Boolean(ready)}
        storageAvailable={storageAvailable}
        onSave={onSave}
        onOpen={onOpen}
        onExportFile={onExportFile}
        onImportFile={onImportFile}
      />
      <section style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Image{' '}
          <input data-testid="file-input" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <label>
          Nombre de couleurs : {n}{' '}
          <input
            type="range"
            aria-label="Nombre de couleurs"
            min={MIN_COLORS}
            max={MAX_COLORS}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        {busy && <span>Calcul…</span>}
      </section>
      {ready && composite && (
        <>
          <section>
            <h2>Aperçu</h2>
            <RgbaCanvas data={composite} width={result.width} height={result.height} label="Aperçu final" />
            <button type="button" onClick={exportComposite}>
              Exporter l'aperçu
            </button>
          </section>
          <section>
            <h2>Calques</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {masks.map((mask, k) => (
                <LayerCard
                  key={k}
                  position={k + 1}
                  mask={mask}
                  width={result.width}
                  height={result.height}
                  swatches={palette.swatches}
                  swatchId={swatchIds[k]}
                  onSwatchChange={(id) => setSwatchIds((prev) => prev.map((p, i) => (i === k ? id : p)))}
                  onExport={() => exportLayer(k)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
