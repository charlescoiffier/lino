import { labToRgb, rgbToLab } from './color';
import type { Lab, Rgb, RgbaImage } from './types';

export const MIN_COLORS = 2;
export const MAX_COLORS = 16;
const SAMPLE_TARGET = 50_000;
const MAX_ITERATIONS = 20;
const CONVERGENCE = 0.01;

export interface QuantizeResult {
  indices: Uint8Array;
  centroids: Lab[];
  centroidsRgb: Rgb[];
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toLabBuffer(img: RgbaImage): Float32Array {
  const px = img.width * img.height;
  const out = new Float32Array(px * 3);
  const d = img.data;
  for (let i = 0; i < px; i++) {
    const a = d[i * 4 + 3] / 255;
    const r = d[i * 4] * a + 255 * (1 - a);
    const g = d[i * 4 + 1] * a + 255 * (1 - a);
    const b = d[i * 4 + 2] * a + 255 * (1 - a);
    const lab = rgbToLab(r, g, b);
    out[i * 3] = lab[0];
    out[i * 3 + 1] = lab[1];
    out[i * 3 + 2] = lab[2];
  }
  return out;
}

function nearest(labs: Float32Array, pixel: number, cent: Float32Array, k: number): number {
  const l = labs[pixel * 3];
  const a = labs[pixel * 3 + 1];
  const b = labs[pixel * 3 + 2];
  let best = 0;
  let bestDist = Infinity;
  for (let c = 0; c < k; c++) {
    const dl = l - cent[c * 3];
    const da = a - cent[c * 3 + 1];
    const db = b - cent[c * 3 + 2];
    const d = dl * dl + da * da + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function initCentroids(labs: Float32Array, sample: Int32Array, k: number, rand: () => number): Float32Array {
  const cent = new Float32Array(k * 3);
  const setFrom = (c: number, pixel: number) => {
    cent[c * 3] = labs[pixel * 3];
    cent[c * 3 + 1] = labs[pixel * 3 + 1];
    cent[c * 3 + 2] = labs[pixel * 3 + 2];
  };
  setFrom(0, sample[Math.floor(rand() * sample.length)]);
  const dist = new Float64Array(sample.length).fill(Infinity);
  for (let c = 1; c < k; c++) {
    let total = 0;
    for (let s = 0; s < sample.length; s++) {
      const p = sample[s];
      const dl = labs[p * 3] - cent[(c - 1) * 3];
      const da = labs[p * 3 + 1] - cent[(c - 1) * 3 + 1];
      const db = labs[p * 3 + 2] - cent[(c - 1) * 3 + 2];
      const d = dl * dl + da * da + db * db;
      if (d < dist[s]) dist[s] = d;
      total += dist[s];
    }
    let pick = sample.length - 1;
    if (total > 0) {
      let r = rand() * total;
      for (let s = 0; s < sample.length; s++) {
        r -= dist[s];
        if (r <= 0) {
          pick = s;
          break;
        }
      }
    } else {
      pick = Math.floor(rand() * sample.length);
    }
    setFrom(c, sample[pick]);
  }
  return cent;
}

export function quantize(img: RgbaImage, n: number, seed = 1): QuantizeResult {
  if (!Number.isInteger(n) || n < MIN_COLORS || n > MAX_COLORS) {
    throw new RangeError(`Le nombre de couleurs doit être un entier entre ${MIN_COLORS} et ${MAX_COLORS}.`);
  }
  const px = img.width * img.height;
  if (px === 0) throw new RangeError('Image vide.');

  const labs = toLabBuffer(img);
  const rand = mulberry32(seed);
  const step = Math.max(1, Math.floor(px / SAMPLE_TARGET));
  const sample = new Int32Array(Math.ceil(px / step));
  for (let j = 0; j < sample.length; j++) sample[j] = j * step;

  const cent = initCentroids(labs, sample, n, rand);
  const sums = new Float64Array(n * 3);
  const counts = new Int32Array(n);
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    sums.fill(0);
    counts.fill(0);
    for (let s = 0; s < sample.length; s++) {
      const p = sample[s];
      const c = nearest(labs, p, cent, n);
      counts[c]++;
      sums[c * 3] += labs[p * 3];
      sums[c * 3 + 1] += labs[p * 3 + 1];
      sums[c * 3 + 2] += labs[p * 3 + 2];
    }
    let moved = 0;
    for (let c = 0; c < n; c++) {
      if (counts[c] === 0) continue;
      for (let j = 0; j < 3; j++) {
        const next = sums[c * 3 + j] / counts[c];
        moved = Math.max(moved, Math.abs(next - cent[c * 3 + j]));
        cent[c * 3 + j] = next;
      }
    }
    if (moved < CONVERGENCE) break;
  }

  const indices = new Uint8Array(px);
  const total = new Int32Array(n);
  for (let i = 0; i < px; i++) {
    const c = nearest(labs, i, cent, n);
    indices[i] = c;
    total[c]++;
  }

  const order: number[] = [];
  for (let c = 0; c < n; c++) if (total[c] > 0) order.push(c);
  order.sort((a, b) => cent[b * 3] - cent[a * 3]);
  const remap = new Uint8Array(n);
  order.forEach((c, newIndex) => {
    remap[c] = newIndex;
  });
  for (let i = 0; i < px; i++) indices[i] = remap[indices[i]];

  const centroids: Lab[] = order.map((c) => [cent[c * 3], cent[c * 3 + 1], cent[c * 3 + 2]]);
  return { indices, centroids, centroidsRgb: centroids.map((l) => labToRgb(l[0], l[1], l[2])) };
}
