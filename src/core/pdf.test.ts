import { inflateSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { layersToPdf, packMask, pageLayout, type PdfLayerPage } from './pdf';

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

function page(width: number, height: number, ink: (x: number, y: number) => boolean, caption = 'Calque 1'): PdfLayerPage {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) mask[y * width + x] = ink(x, y) ? 1 : 0;
  return { mask, width, height, caption, color: [200, 30, 40] };
}

describe('packMask', () => {
  test('1 bit par pixel, encre = 0 (noir), fond = 1 (blanc), lignes alignées sur l\'octet', () => {
    // 10 pixels de large : 2 octets par ligne ; ligne 1 : encre sur les 3 premiers pixels et le dernier.
    const mask = new Uint8Array(20);
    [0, 1, 2, 9].forEach((x) => (mask[x] = 1));
    expect(Array.from(packMask(mask, 10, 2))).toEqual([0b00011111, 0b10111111, 0xff, 0xff]);
  });

  test('image d\'un seul pixel', () => {
    expect(Array.from(packMask(new Uint8Array([1]), 1, 1))).toEqual([0b01111111]);
    expect(Array.from(packMask(new Uint8Array([0]), 1, 1))).toEqual([0xff]);
  });
});

describe('pageLayout', () => {
  test('image large : page A4 en paysage ; image haute : en portrait', () => {
    const wide = pageLayout(400, 200);
    const tall = pageLayout(200, 400);
    expect(wide.pageWidth).toBeGreaterThan(wide.pageHeight);
    expect(tall.pageWidth).toBeLessThan(tall.pageHeight);
  });

  test.each([
    [1600, 1600],
    [1600, 900],
    [300, 1200],
    [1, 1],
  ])('image %ix%i : proportions conservées et contenue dans les marges', (w, h) => {
    const l = pageLayout(w, h);
    expect(l.w / l.h).toBeCloseTo(w / h, 6);
    expect(l.x).toBeGreaterThanOrEqual(36 - 1e-9);
    expect(l.y).toBeGreaterThanOrEqual(36 - 1e-9);
    expect(l.x + l.w).toBeLessThanOrEqual(l.pageWidth - 36 + 1e-9);
    expect(l.y + l.h).toBeLessThan(l.captionY);
  });

  test('deux calques de même taille tombent au même endroit', () => {
    expect(pageLayout(800, 600)).toEqual(pageLayout(800, 600));
  });
});

describe('layersToPdf', () => {
  const pages = [
    page(10, 6, (x) => x < 3, 'Calque 1/3 · Blanc (réf. 1)'),
    page(10, 6, (x, y) => (x + y) % 2 === 0, 'Calque 2/3 · Jaune'),
    page(10, 6, () => true, 'Calque 3/3 · (Noir) \\ doux'),
  ];

  test('fichier PDF bien formé : en-tête, fin, nombre de pages', async () => {
    const bytes = await layersToPdf(pages, { title: 'Cigale' });
    const text = latin1(bytes);
    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Count 3');
    expect(text.match(/\/Type \/Page\b(?!s)/g)).toHaveLength(3);
    expect(text).toContain('/Title (Cigale)');
  });

  test('la table xref pointe exactement sur chaque objet', async () => {
    const bytes = await layersToPdf(pages);
    const text = latin1(bytes);
    const start = Number(/startxref\n(\d+)\n/.exec(text)![1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    const entries = [...text.slice(start).matchAll(/^(\d{10}) \d{5} n $/gm)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(4 + 3 * pages.length);
    entries.forEach((offset, i) => expect(text.slice(offset).startsWith(`${i + 1} 0 obj\n`)).toBe(true));
    expect(text).toContain(`/Size ${entries.length + 1}`);
  });

  test('chaque image décompressée redonne le masque du calque', async () => {
    const bytes = await layersToPdf(pages);
    const text = latin1(bytes);
    const streams = [...text.matchAll(/\/Subtype \/Image \/Width (\d+) \/Height (\d+) [^>]*?\/Length (\d+) >>\nstream\n/g)];
    expect(streams).toHaveLength(pages.length);
    streams.forEach((m, i) => {
      const begin = m.index! + m[0].length;
      const data = bytes.slice(begin, begin + Number(m[3]));
      const raw = new Uint8Array(inflateSync(data));
      expect(Number(m[1])).toBe(pages[i].width);
      expect(Number(m[2])).toBe(pages[i].height);
      expect(Array.from(raw)).toEqual(Array.from(packMask(pages[i].mask, pages[i].width, pages[i].height)));
    });
  });

  test('légende : accents conservés (Latin-1), parenthèses et antislash échappés', async () => {
    const text = latin1(await layersToPdf(pages));
    expect(text).toContain('(Calque 1/3 \u00b7 Blanc \\(r\u00e9f. 1\\)) Tj');
    expect(text).toContain('\\(Noir\\) \\\\ doux');
  });

  test('caractère hors Latin-1 remplacé par « ? » sans casser le fichier', async () => {
    const bytes = await layersToPdf([page(4, 4, () => true, 'Calque — test ’')]);
    expect(latin1(bytes)).toContain('(Calque ? test ?) Tj');
  });

  test('liste vide ou dimensions incohérentes -> RangeError', async () => {
    await expect(layersToPdf([])).rejects.toThrow(RangeError);
    await expect(layersToPdf([{ ...pages[0], mask: new Uint8Array(3) }])).rejects.toThrow(RangeError);
  });
});
