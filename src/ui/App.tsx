import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../core/adjust';
import { layerMasks } from '../core/layers';
import { hexToRgb, loadPalette, nearestSwatch, type Palette } from '../core/palette';
import type { ProcessResult } from '../core/pipeline';
import { layersToPdf, pageLayout } from '../core/pdf';
import { compositeRgba, maskRgba } from '../core/render';
import type { RgbaImage } from '../core/types';
import { deleteProject, listProjects, loadProject, projectFromFile, projectToFile, saveProject, type Project } from '../store/projects';
import { CancelledError, ProcessingClient, type WorkerLike } from '../workers/client';
import { downloadBlob, rgbaToPngBlob } from './export';
import { Icon } from './Icon';
import { LayerCard } from './LayerCard';
import { loadImage } from './loadImage';
import { RgbaCanvas } from './RgbaCanvas';
import { SettingsPanel } from './SettingsPanel';
import { Sidebar } from './Sidebar';

export interface Source {
  name: string;
  type: string;
  bytes: ArrayBuffer;
}

const PALETTE_URL = `${import.meta.env.BASE_URL}palettes/linocut-inks.json`;
const SETTINGS_DEBOUNCE_MS = 150;

export function App() {
  const [source, setSource] = useState<Source | null>(null);
  const [image, setImage] = useState<RgbaImage | null>(null);
  const [n, setN] = useState(4);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [applied, setApplied] = useState<Settings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [swatchIds, setSwatchIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const pendingIds = useRef<string[] | null>(null);
  // Teintes choisies à la main (par position de calque) : conservées quand un réglage change sans changer le nombre de calques.
  const manualIds = useRef<Map<number, string>>(new Map());
  const lastCount = useRef(0);

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

  // Les curseurs réagissent tout de suite, le recalcul attend une courte pause.
  useEffect(() => {
    const t = setTimeout(() => setApplied(settings), SETTINGS_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [settings]);

  const { brightness, contrast, saturation, blur, cleanup, invert, mirror, definition } = applied;
  // La définition agit au chargement de l'image, pas dans le worker.
  const processSettings = useMemo<Settings>(
    () => ({ brightness, contrast, saturation, blur, cleanup, invert, mirror, definition: DEFAULT_SETTINGS.definition, printWidthMm: DEFAULT_SETTINGS.printWidthMm }),
    [brightness, contrast, saturation, blur, cleanup, invert, mirror],
  );

  useEffect(() => {
    client.cancel();
    setBusy(false);
    setImage(null);
    setResult(null);
    if (!source) return;
    let live = true;
    loadImage(new File([source.bytes], source.name, { type: source.type }), definition).then(
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
  }, [source, definition, client]);

  useEffect(() => {
    if (!image) return;
    let live = true;
    setBusy(true);
    client.run(image, n, processSettings).then(
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
  }, [image, n, processSettings, client]);

  useEffect(() => {
    if (!result || !palette) return;
    const count = result.centroidsRgb.length;
    const pending = pendingIds.current;
    pendingIds.current = null;
    if (pending) manualIds.current = new Map(pending.map((id, i) => [i, id]));
    else if (count !== lastCount.current) manualIds.current.clear();
    lastCount.current = count;
    setSwatchIds(
      result.centroidsRgb.map((rgb, i) => {
        const wanted = manualIds.current.get(i);
        return wanted && palette.swatches.some((s) => s.id === wanted) ? wanted : nearestSwatch(palette.swatches, rgb).id;
      }),
    );
  }, [result, palette]);

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

  const masks = useMemo(() => (result ? layerMasks(result.indices, result.centroidsRgb.length) : []), [result]);
  const ready = result && palette && swatchIds.length === masks.length;
  const colors = useMemo(
    () => (palette ? swatchIds.map((id) => hexToRgb(palette.swatches.find((s) => s.id === id)?.hex ?? '#000000')) : []),
    [palette, swatchIds],
  );
  const printLayout = useMemo(
    () => (result ? pageLayout(result.width, result.height, settings.printWidthMm) : null),
    [result, settings.printWidthMm],
  );
  const composite = useMemo(() => (ready ? compositeRgba(result.indices, colors) : null), [ready, result, colors]);

  async function onAddImage(file: File) {
    manualIds.current.clear();
    lastCount.current = 0;
    pendingIds.current = null;
    setProjectId(null);
    setSource({ name: file.name, type: file.type, bytes: await file.arrayBuffer() });
  }

  function currentProject(): Project | null {
    if (!source || !result) return null;
    return {
      id: projectId ?? crypto.randomUUID(),
      name: source.name,
      imageBytes: source.bytes,
      imageType: source.type,
      n,
      swatchIds,
      settings,
      updatedAt: Date.now(),
    };
  }

  function applyProject(p: Project) {
    const restored = normalizeSettings(p.settings);
    pendingIds.current = p.swatchIds;
    setProjectId(p.id);
    setN(p.n);
    setSettings(restored);
    setApplied(restored);
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

  async function onDelete(id: string) {
    try {
      await deleteProject(id);
      if (id === projectId) setProjectId(null);
      await refreshProjects();
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

  async function exportLayer(k: number) {
    if (!result) return;
    const blob = await rgbaToPngBlob(maskRgba(masks[k]), result.width, result.height);
    downloadBlob(blob, `calque-${k + 1}.png`);
  }

  async function exportPdf() {
    if (!result || !palette || !source) return;
    const base = source.name.replace(/\.[^.]+$/, '');
    setPdfBusy(true);
    try {
      const pages = masks.map((mask, k) => {
        const swatch = palette.swatches.find((sw) => sw.id === swatchIds[k]);
        const label = swatch ? `${swatch.name}${swatch.ref ? ` \u00b7 r\u00e9f. ${swatch.ref}` : ''}` : '';
        return {
          mask,
          width: result.width,
          height: result.height,
          caption: `Calque ${k + 1}/${masks.length}${label ? ` \u00b7 ${label}` : ''}`,
          color: colors[k],
        };
      });
      const bytes = await layersToPdf(pages, { title: `${base} \u00b7 calques`, widthMm: settings.printWidthMm });
      downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), `${base}-calques.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer le PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function exportComposite() {
    if (!result || !composite) return;
    downloadBlob(await rgbaToPngBlob(composite, result.width, result.height), 'apercu.png');
  }

  return (
    <div className="app">
      <Sidebar
        projects={projects}
        activeId={projectId}
        canSave={Boolean(ready)}
        storageAvailable={storageAvailable}
        onAddImage={onAddImage}
        onSave={onSave}
        onOpen={onOpen}
        onDelete={onDelete}
        onExportFile={onExportFile}
        onImportFile={onImportFile}
      />

      <main className="content">
        <header className="content-head">
          <h1>{source ? source.name : 'Lino'}</h1>
          {busy && <span className="busy">Calcul…</span>}
        </header>

        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}

        {ready && composite ? (
          <>
            <section className="card">
              <div className="section-head">
                <h2>Aperçu</h2>
                <button type="button" className="btn btn-secondary" onClick={exportComposite}>
                  <Icon name="download" size={16} />
                  Exporter l'aperçu
                </button>
              </div>
              <RgbaCanvas data={composite} width={result.width} height={result.height} label="Aperçu final" className="preview" />
            </section>

            <section>
              <div className="section-head">
                <h2>
                  Calques <span className="count">{masks.length}</span>
                </h2>
                <button type="button" className="btn btn-secondary" disabled={pdfBusy || printLayout?.tooLarge} onClick={exportPdf}>
                  <Icon name="download" size={16} />
                  {pdfBusy ? 'Création du PDF…' : 'Exporter tous les calques (PDF)'}
                </button>
              </div>
              <ul className="layers">
                {masks.map((mask, k) => (
                  <LayerCard
                    key={k}
                    position={k + 1}
                    mask={mask}
                    width={result.width}
                    height={result.height}
                    swatches={palette.swatches}
                    swatchId={swatchIds[k]}
                    onSwatchChange={(id) => {
                      manualIds.current.set(k, id);
                      setSwatchIds((prev) => prev.map((p, i) => (i === k ? id : p)));
                    }}
                    onExport={() => exportLayer(k)}
                  />
                ))}
              </ul>
            </section>
          </>
        ) : (
          !source &&
          !error && (
            <div className="empty">
              <Icon name="image" size={40} />
              <h2>Préparez votre linogravure</h2>
              <p>Ajoutez une image : Lino la sépare en calques, un par passage d'encre.</p>
            </div>
          )
        )}
      </main>

      <SettingsPanel
        n={n}
        onN={setN}
        printLayout={printLayout}
        settings={settings}
        onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        onReset={() => {
          setSettings(DEFAULT_SETTINGS);
          setApplied(DEFAULT_SETTINGS);
          setN(4);
        }}
      />
    </div>
  );
}
