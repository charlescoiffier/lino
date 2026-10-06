import { expect, test } from 'vitest';
import { DEFAULT_SETTINGS } from './adjust';
import { processImage } from './pipeline';

test('processImage renvoie dimensions, indices et couleurs', () => {
  const w = 10;
  const h = 10;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const dark = i % w < 5;
    data.set(dark ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4);
  }
  const result = processImage({ width: w, height: h, data }, 2);
  expect(result.width).toBe(w);
  expect(result.height).toBe(h);
  expect(result.indices).toHaveLength(w * h);
  expect(result.centroidsRgb).toHaveLength(2);
  expect(result.centroidsRgb[0]).toEqual([255, 255, 255]);
});

test('le miroir retourne la carte des calques', () => {
  const w = 10;
  const h = 4;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(i % w < 5 ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4);
  const img = { width: w, height: h, data };
  const plain = processImage(img, 2);
  const mirrored = processImage(img, 2, { ...DEFAULT_SETTINGS, mirror: true });
  expect(mirrored.indices[0]).toBe(plain.indices[w - 1]);
  expect(mirrored.indices[w - 1]).toBe(plain.indices[0]);
});

test('cleanup 0 conserve les pixels isolés, cleanup 1 les supprime', () => {
  const w = 9;
  const h = 9;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(i === 4 * w + 4 ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4);
  const img = { width: w, height: h, data };
  const dark = (r: ReturnType<typeof processImage>) => r.indices.filter((v) => v === 1).length;
  expect(dark(processImage(img, 2, { ...DEFAULT_SETTINGS, cleanup: 0 }))).toBe(1);
  expect(dark(processImage(img, 2, { ...DEFAULT_SETTINGS, cleanup: 1 }))).toBe(0);
});
