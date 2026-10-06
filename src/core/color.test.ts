import { describe, expect, test } from 'vitest';
import { labToRgb, rgbToLab } from './color';

describe('rgbToLab', () => {
  test('blanc -> L=100, a=b=0', () => {
    const [l, a, b] = rgbToLab(255, 255, 255);
    expect(l).toBeCloseTo(100, 1);
    expect(a).toBeCloseTo(0, 1);
    expect(b).toBeCloseTo(0, 1);
  });

  test('noir -> L=0', () => {
    const [l] = rgbToLab(0, 0, 0);
    expect(l).toBeCloseTo(0, 1);
  });

  test('rouge pur a un a* fortement positif', () => {
    const [, a] = rgbToLab(255, 0, 0);
    expect(a).toBeGreaterThan(70);
  });
});

describe('labToRgb', () => {
  test.each([
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [12, 200, 90],
    [128, 128, 128],
  ])('aller-retour %i,%i,%i', (r, g, b) => {
    const lab = rgbToLab(r, g, b);
    const [r2, g2, b2] = labToRgb(...lab);
    expect(Math.abs(r2 - r)).toBeLessThanOrEqual(1);
    expect(Math.abs(g2 - g)).toBeLessThanOrEqual(1);
    expect(Math.abs(b2 - b)).toBeLessThanOrEqual(1);
  });

  test('valeurs hors gamut sont bornées à 0-255', () => {
    const rgb = labToRgb(50, 120, 120);
    for (const c of rgb) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    }
  });
});
