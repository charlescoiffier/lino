import { expect, test } from 'vitest';
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
