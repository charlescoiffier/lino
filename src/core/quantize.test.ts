import { describe, expect, test } from 'vitest';
import { MAX_COLORS, quantize } from './quantize';
import type { RgbaImage } from './types';

function image(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number]): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.set(pixel(x, y), (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

const quadrants = (w = 20, h = 20) =>
  image(w, h, (x, y) => {
    const right = x >= w / 2;
    const bottom = y >= h / 2;
    if (!right && !bottom) return [255, 0, 0, 255];
    if (right && !bottom) return [0, 200, 0, 255];
    if (!right && bottom) return [0, 0, 255, 255];
    return [255, 255, 0, 255];
  });

describe('quantize', () => {
  test('4 couleurs distinctes, n=4 -> 4 calques, un par quadrant', () => {
    const img = quadrants();
    const { indices, centroids } = quantize(img, 4);
    expect(centroids).toHaveLength(4);
    const at = (x: number, y: number) => indices[y * 20 + x];
    const labels = new Set([at(2, 2), at(15, 2), at(2, 15), at(15, 15)]);
    expect(labels.size).toBe(4);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) expect(at(x, y)).toBe(at(2, 2));
  });

  test('calques triés du plus clair au plus sombre', () => {
    const { centroids } = quantize(quadrants(), 4);
    for (let i = 1; i < centroids.length; i++) {
      expect(centroids[i - 1][0]).toBeGreaterThanOrEqual(centroids[i][0]);
    }
  });

  test('résultat déterministe pour une même graine', () => {
    const a = quantize(quadrants(), 3, 7);
    const b = quantize(quadrants(), 3, 7);
    expect(Array.from(a.indices)).toEqual(Array.from(b.indices));
  });

  test('image d\'une seule couleur avec n=4 -> 1 calque, sans erreur', () => {
    const img = image(8, 8, () => [10, 20, 30, 255]);
    const { indices, centroids } = quantize(img, 4);
    expect(centroids).toHaveLength(1);
    expect(new Set(indices).size).toBe(1);
  });

  test('n supérieur au nombre de couleurs distinctes -> moins de calques', () => {
    const img = image(8, 8, (x) => (x < 4 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const { centroids } = quantize(img, 6);
    expect(centroids).toHaveLength(2);
  });

  test('pixels transparents traités comme blancs', () => {
    const img = image(8, 8, (x) => (x < 4 ? [0, 0, 0, 0] : [255, 255, 255, 255]));
    const { centroids } = quantize(img, 2);
    expect(centroids).toHaveLength(1);
    expect(centroids[0][0]).toBeCloseTo(100, 0);
  });

  test.each([1, 0, -3, MAX_COLORS + 1, 2.5, Number.NaN])('n=%s hors bornes -> RangeError', (n) => {
    expect(() => quantize(quadrants(), n)).toThrow(RangeError);
  });

  test('image vide -> RangeError', () => {
    expect(() => quantize({ width: 0, height: 0, data: new Uint8ClampedArray(0) }, 4)).toThrow(RangeError);
  });
});
