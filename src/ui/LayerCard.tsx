import { useMemo } from 'react';
import { maskRgba } from '../core/render';
import type { Swatch } from '../core/palette';
import { Icon } from './Icon';
import { RgbaCanvas } from './RgbaCanvas';

interface Props {
  position: number; // 1-based
  mask: Uint8Array;
  width: number;
  height: number;
  swatches: Swatch[];
  swatchId: string;
  onSwatchChange: (id: string) => void;
  onExport: () => void;
}

export function LayerCard({ position, mask, width, height, swatches, swatchId, onSwatchChange, onExport }: Props) {
  const preview = useMemo(() => maskRgba(mask), [mask]);
  const coverage = useMemo(() => {
    let ink = 0;
    for (let i = 0; i < mask.length; i++) ink += mask[i];
    return Math.round((ink / mask.length) * 100);
  }, [mask]);
  const current = swatches.find((s) => s.id === swatchId);
  const hex = current?.hex ?? '#000000';
  return (
    <li data-testid="layer-card" className="layer">
      <span className="layer-dot" style={{ borderColor: hex, background: `${hex}40` }} aria-hidden="true" />
      <RgbaCanvas data={preview} width={width} height={height} label={`Calque ${position}`} className="layer-thumb" />
      <div className="layer-text">
        <h3>Calque {position}</h3>
        <p>{coverage} % de l'image</p>
      </div>
      <select className="select" aria-label={`Teinte du calque ${position}`} value={swatchId} onChange={(e) => onSwatchChange(e.target.value)}>
        {swatches.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-secondary" onClick={onExport}>
        <Icon name="download" size={16} />
        Exporter le calque {position}
      </button>
    </li>
  );
}
