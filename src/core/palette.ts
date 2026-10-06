import { rgbToLab } from './color';
import type { Rgb } from './types';

export interface Swatch {
  id: string;
  name: string;
  hex: string;
  ref?: string;
}

export interface Palette {
  id: string;
  name: string;
  swatches: Swatch[];
}

const HEX = /^#[0-9a-f]{6}$/i;

function invalid(reason: string): never {
  throw new Error(`Palette invalide : ${reason}`);
}

export function parsePalette(json: unknown): Palette {
  if (typeof json !== 'object' || json === null) invalid('objet attendu');
  const p = json as Record<string, unknown>;
  if (typeof p.id !== 'string' || typeof p.name !== 'string') invalid('id et name requis');
  if (!Array.isArray(p.swatches) || p.swatches.length === 0) invalid('au moins une teinte requise');
  const seen = new Set<string>();
  const swatches = p.swatches.map((raw: unknown): Swatch => {
    if (typeof raw !== 'object' || raw === null) invalid('teinte invalide');
    const s = raw as Record<string, unknown>;
    if (typeof s.id !== 'string' || typeof s.name !== 'string') invalid('id et name requis pour chaque teinte');
    if (typeof s.hex !== 'string' || !HEX.test(s.hex)) invalid(`hex invalide pour « ${s.id} »`);
    if (seen.has(s.id)) invalid(`id dupliqué « ${s.id} »`);
    seen.add(s.id);
    return { id: s.id, name: s.name, hex: s.hex, ...(typeof s.ref === 'string' ? { ref: s.ref } : {}) };
  });
  return { id: p.id, name: p.name, swatches };
}

export async function loadPalette(url: string, fetchFn: typeof fetch = fetch): Promise<Palette> {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Impossible de charger les teintes (${res.status}).`);
  return parsePalette(await res.json());
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function nearestSwatch(swatches: Swatch[], rgb: Rgb): Swatch {
  const target = rgbToLab(...rgb);
  let best = swatches[0];
  let bestDist = Infinity;
  for (const s of swatches) {
    const lab = rgbToLab(...hexToRgb(s.hex));
    const d = (lab[0] - target[0]) ** 2 + (lab[1] - target[1]) ** 2 + (lab[2] - target[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}
