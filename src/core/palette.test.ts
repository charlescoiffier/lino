import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { hexToRgb, loadPalette, nearestSwatch, parsePalette } from './palette';

const valid = {
  id: 'test',
  name: 'Test',
  swatches: [
    { id: 'noir', name: 'Noir', hex: '#111111' },
    { id: 'rouge', name: 'Rouge', hex: '#d62828', ref: 'R-01' },
  ],
};

describe('parsePalette', () => {
  test('accepte une palette valide', () => {
    expect(parsePalette(valid).swatches).toHaveLength(2);
  });

  test.each([
    ['null', null],
    ['sans swatches', { id: 'x', name: 'x' }],
    ['swatches vide', { id: 'x', name: 'x', swatches: [] }],
    ['hex invalide', { id: 'x', name: 'x', swatches: [{ id: 'a', name: 'A', hex: 'rouge' }] }],
    ['id dupliqué', { id: 'x', name: 'x', swatches: [{ id: 'a', name: 'A', hex: '#000000' }, { id: 'a', name: 'B', hex: '#ffffff' }] }],
  ])('rejette : %s', (_label, json) => {
    expect(() => parsePalette(json)).toThrow(/Palette invalide/);
  });
});

describe('loadPalette', () => {
  test('charge et valide via fetch', async () => {
    const fakeFetch = (async () => new Response(JSON.stringify(valid))) as typeof fetch;
    expect((await loadPalette('/p.json', fakeFetch)).id).toBe('test');
  });

  test('erreur HTTP -> erreur claire', async () => {
    const fakeFetch = (async () => new Response('', { status: 404 })) as typeof fetch;
    await expect(loadPalette('/p.json', fakeFetch)).rejects.toThrow(/Impossible de charger les teintes/);
  });
});

describe('hexToRgb / nearestSwatch', () => {
  test('hexToRgb', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
  });

  test('nearestSwatch choisit la teinte perceptuellement la plus proche', () => {
    const sw = parsePalette(valid).swatches;
    expect(nearestSwatch(sw, [200, 30, 40]).id).toBe('rouge');
    expect(nearestSwatch(sw, [20, 20, 20]).id).toBe('noir');
  });
});

describe('palette livrée avec l\'application', () => {
  const shipped = parsePalette(JSON.parse(readFileSync('public/palettes/linocut-inks.json', 'utf8')));

  test('est valide et contient les 24 encres', () => {
    expect(shipped.swatches).toHaveLength(24);
  });

  test('chaque teinte a une référence, toutes différentes', () => {
    const refs = shipped.swatches.map((s) => s.ref);
    expect(refs.every((r) => typeof r === 'string' && r.length > 0)).toBe(true);
    expect(new Set(refs).size).toBe(refs.length);
  });

  test('la teinte la plus proche d\'un jaune vif est un jaune', () => {
    expect(nearestSwatch(shipped.swatches, [255, 240, 80]).name).toMatch(/^Jaune/);
  });
});
