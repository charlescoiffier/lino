import { useMemo } from 'react';
import { maskRgba } from '../core/render';
import type { Swatch } from '../core/palette';
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
  const current = swatches.find((s) => s.id === swatchId);
  return (
    <article data-testid="layer-card" style={{ border: '1px solid #ccc', borderRadius: 8, padding: 8 }}>
      <h3>Calque {position}</h3>
      <RgbaCanvas data={preview} width={width} height={height} label={`Calque ${position}`} />
      <label>
        <span style={{ display: 'inline-block', width: 16, height: 16, background: current?.hex, marginRight: 6 }} />
        <select aria-label={`Teinte du calque ${position}`} value={swatchId} onChange={(e) => onSwatchChange(e.target.value)}>
          {swatches.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onExport}>
        Exporter le calque {position}
      </button>
    </article>
  );
}
