import { describe, expect, test } from 'vitest';
import { fitSize, loadImage, MAX_DIMENSION } from './loadImage';

describe('fitSize', () => {
  test('ne change pas une petite image', () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  test('réduit une grande image en gardant le ratio', () => {
    expect(fitSize(6400, 3200)).toEqual({ width: MAX_DIMENSION, height: 800 });
  });

  test('image extrêmement allongée : minimum 1 pixel', () => {
    expect(fitSize(100_000, 10)).toEqual({ width: MAX_DIMENSION, height: 1 });
  });

  test('portrait', () => {
    expect(fitSize(1000, 4000, 2000)).toEqual({ width: 500, height: 2000 });
  });
});

describe('loadImage', () => {
  test('rejette un fichier qui n\'est pas une image', async () => {
    const file = new File(['bonjour'], 'notes.txt', { type: 'text/plain' });
    await expect(loadImage(file)).rejects.toThrow(/Format non supporté/);
  });
});
