import { expect, test } from 'vitest';
import { compositeRgba, maskRgba } from './render';

test('compositeRgba colorie chaque pixel selon son calque', () => {
  const out = compositeRgba(new Uint8Array([0, 1]), [[255, 0, 0], [0, 0, 255]]);
  expect(Array.from(out)).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
});

test('maskRgba : encre noire sur fond blanc', () => {
  const out = maskRgba(new Uint8Array([1, 0]));
  expect(Array.from(out)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
});
