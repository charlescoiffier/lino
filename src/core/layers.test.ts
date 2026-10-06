import { describe, expect, test } from 'vitest';
import { despeckle, layerMasks } from './layers';

describe('despeckle', () => {
  test('un pixel isolé prend l\'étiquette de ses voisins', () => {
    const w = 5;
    const h = 5;
    const idx = new Uint8Array(w * h);
    idx[2 * w + 2] = 1;
    const out = despeckle(idx, w, h);
    expect(Array.from(out)).toEqual(new Array(w * h).fill(0));
  });

  test('ne modifie pas l\'entrée', () => {
    const idx = new Uint8Array(25);
    idx[12] = 1;
    despeckle(idx, 5, 5);
    expect(idx[12]).toBe(1);
  });

  test('conserve une zone de 2 pixels de large', () => {
    const w = 6;
    const h = 4;
    const idx = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      idx[y * w + 2] = 1;
      idx[y * w + 3] = 1;
    }
    expect(Array.from(despeckle(idx, w, h))).toEqual(Array.from(idx));
  });

  test('image 1x1 inchangée', () => {
    expect(Array.from(despeckle(new Uint8Array([3]), 1, 1))).toEqual([3]);
  });
});

describe('layerMasks', () => {
  test('masques disjoints dont l\'union couvre l\'image', () => {
    const idx = new Uint8Array([0, 1, 2, 1, 0, 2]);
    const masks = layerMasks(idx, 3);
    expect(masks).toHaveLength(3);
    for (let i = 0; i < idx.length; i++) {
      const sum = masks.reduce((acc, m) => acc + m[i], 0);
      expect(sum).toBe(1);
      expect(masks[idx[i]][i]).toBe(1);
    }
  });
});
