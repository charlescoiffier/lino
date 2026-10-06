import { describe, expect, test } from 'vitest';
import { adjustImage, DEFAULT_SETTINGS, normalizeSettings, type Settings } from './adjust';
import type { RgbaImage } from './types';

const img = (w: number, h: number, pixel: (x: number, y: number) => [number, number, number, number]): RgbaImage => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(pixel(x, y), (y * w + x) * 4);
  return { width: w, height: h, data };
};
const settings = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...patch });
const px = (i: RgbaImage, x: number, y: number) => Array.from(i.data.slice((y * i.width + x) * 4, (y * i.width + x) * 4 + 4));

describe('adjustImage', () => {
  test('réglages par défaut : image opaque inchangée', () => {
    const src = img(3, 2, (x, y) => [x * 40, y * 90, 200, 255]);
    expect(Array.from(adjustImage(src, DEFAULT_SETTINGS).data)).toEqual(Array.from(src.data));
  });

  test('pixels transparents deviennent blancs et opaques', () => {
    const src = img(2, 1, (x) => (x === 0 ? [0, 0, 0, 0] : [10, 20, 30, 255]));
    const out = adjustImage(src, DEFAULT_SETTINGS);
    expect(px(out, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(px(out, 1, 0)).toEqual([10, 20, 30, 255]);
  });

  test('la transparence reste blanche même après inversion de luminosité', () => {
    const src = img(1, 1, () => [0, 0, 0, 0]);
    const out = adjustImage(src, settings({ brightness: 50 }));
    expect(px(out, 0, 0)).toEqual([255, 255, 255, 255]);
  });

  test('luminosité : éclaircit et borne à 255', () => {
    const src = img(1, 1, () => [100, 200, 250, 255]);
    const out = adjustImage(src, settings({ brightness: 20 }));
    expect(px(out, 0, 0)).toEqual([151, 251, 255, 255]);
  });

  test('contraste positif écarte les gris du milieu', () => {
    const src = img(2, 1, (x) => (x === 0 ? [100, 100, 100, 255] : [160, 160, 160, 255]));
    const out = adjustImage(src, settings({ contrast: 50 }));
    expect(out.data[0]).toBeLessThan(100);
    expect(out.data[4]).toBeGreaterThan(160);
  });

  test('saturation -100 donne des gris', () => {
    const src = img(1, 1, () => [255, 0, 0, 255]);
    const [r, g, b] = px(adjustImage(src, settings({ saturation: -100 })), 0, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  test('inversion', () => {
    const src = img(1, 1, () => [10, 100, 250, 255]);
    expect(px(adjustImage(src, settings({ invert: true })), 0, 0)).toEqual([245, 155, 5, 255]);
  });

  test('miroir horizontal (largeur impaire incluse)', () => {
    const src = img(3, 1, (x) => [x * 100, 0, 0, 255]);
    const out = adjustImage(src, settings({ mirror: true }));
    expect([0, 1, 2].map((x) => out.data[x * 4])).toEqual([200, 100, 0]);
  });

  test('lissage : une image unie reste unie', () => {
    const src = img(6, 5, () => [40, 80, 120, 255]);
    const out = adjustImage(src, settings({ blur: 3 }));
    expect(Array.from(out.data)).toEqual(Array.from(src.data));
  });

  test('lissage : un point isolé est atténué sans sortir de l\'image', () => {
    const src = img(7, 7, (x, y) => (x === 3 && y === 3 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const out = adjustImage(src, settings({ blur: 1 }));
    expect(px(out, 3, 3)[0]).toBeGreaterThan(150);
    expect(px(out, 3, 3)[0]).toBeLessThan(255);
    expect(px(out, 0, 0)[0]).toBe(255);
  });

  test('ne modifie pas l\'image source', () => {
    const src = img(2, 2, () => [10, 20, 30, 255]);
    adjustImage(src, settings({ blur: 1, invert: true, mirror: true, brightness: 30 }));
    expect(px(src, 0, 0)).toEqual([10, 20, 30, 255]);
  });
});

describe('normalizeSettings', () => {
  test('valeurs absentes ou invalides -> valeurs par défaut', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ brightness: 'beaucoup', invert: 'oui', blur: Number.NaN })).toEqual(DEFAULT_SETTINGS);
  });

  test('valeurs hors bornes ramenées dans les bornes', () => {
    const s = normalizeSettings({ brightness: 999, contrast: -999, blur: 40, cleanup: -2, definition: 50 });
    expect(s).toMatchObject({ brightness: 100, contrast: -100, blur: 5, cleanup: 0, definition: 400 });
  });

  test('valeurs valides conservées', () => {
    const wanted = settings({ brightness: 12, invert: true, mirror: true, definition: 800, cleanup: 2 });
    expect(normalizeSettings(wanted)).toEqual(wanted);
  });
});
