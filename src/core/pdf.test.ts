import { inflateSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { layersToPdf, packMask, PAGE_MARGIN, pageLayout, PT_PER_MM, registrationMarks, type PdfLayerPage } from './pdf';

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
    expect(l.x).toBeGreaterThanOrEqual(PAGE_MARGIN - 1e-9);
    expect(l.y).toBeGreaterThanOrEqual(PAGE_MARGIN - 1e-9);
    expect(l.x + l.w).toBeLessThanOrEqual(l.pageWidth - PAGE_MARGIN + 1e-9);
    expect(l.y + l.h).toBeLessThan(l.captionY);
  });

  test('deux calques de même taille tombent au même endroit', () => {
    expect(pageLayout(800, 600)).toEqual(pageLayout(800, 600));
  });
});

describe('pageLayout avec une largeur en mm', () => {
  test('sans largeur : A4 et image ajustée', () => {
    const l = pageLayout(400, 300);
    expect(l.format).toBe('A4');
    expect(l.landscape).toBe(true);
  });

  test('l\'image est imprimée exactement à la largeur demandée, proportions conservées', () => {
    const l = pageLayout(400, 300, 100);
    expect(l.w / PT_PER_MM).toBeCloseTo(100, 6);
    expect(l.h / PT_PER_MM).toBeCloseTo(75, 6);
    expect(l.imageWidthMm).toBeCloseTo(100, 6);
    expect(l.imageHeightMm).toBeCloseTo(75, 6);
  });

  test.each([
    [100, 'A4'],
    [170, 'A4'],
    [250, 'A3'],
    [380, 'A2'],
    [560, 'A1'],
    [800, 'A0'],
  ])('image carrée de %i mm : plus petit format A où elle tient = %s', (mm, format) => {
    expect(pageLayout(500, 500, mm).format).toBe(format);
  });

  test('image large : paysage d\'abord ; si seule la hauteur gêne, on passe au format supérieur', () => {
    const l = pageLayout(400, 300, 250); // 250 x 187,5 mm : trop haut pour l'A4 paysage (210 mm de haut avec marges et légende)
    expect(l.format).toBe('A3');
    expect(l.landscape).toBe(true);
  });

  test('au-delà de l\'A0 : page sur mesure, image toujours dans les marges', () => {
    const l = pageLayout(500, 500, 1500);
    expect(l.format).toBe('sur mesure');
    expect(l.tooLarge).toBe(false);
    expect(l.x).toBeCloseTo(PAGE_MARGIN, 6);
    expect(l.x + l.w).toBeCloseTo(l.pageWidth - PAGE_MARGIN, 6);
    expect(l.y + l.h).toBeLessThan(l.captionY);
  });

  test('page plus grande que ce qu\'un PDF accepte : tooLarge', () => {
    expect(pageLayout(500, 500, 6000).tooLarge).toBe(true);
  });

  test('l\'image reste dans la page et sous la légende, quel que soit le format choisi', () => {
    for (const mm of [30, 150, 200, 300, 450, 700, 1000]) {
      const l = pageLayout(640, 480, mm);
      expect(l.x).toBeGreaterThanOrEqual(PAGE_MARGIN - 1e-6);
      expect(l.x + l.w).toBeLessThanOrEqual(l.pageWidth - PAGE_MARGIN + 1e-6);
      expect(l.y).toBeGreaterThanOrEqual(PAGE_MARGIN - 1e-6);
      expect(l.y + l.h).toBeLessThanOrEqual(l.captionY + 1e-6);
    }
  });
});

describe('registrationMarks', () => {
  const sizes: [number, number, number][] = [
    [500, 500, 0],
    [1600, 900, 0],
    [300, 1200, 0],
    [640, 480, 120],
    [640, 480, 380],
    [300, 1200, 150],
    [500, 500, 1500],
  ];

  test('quatre repères, un par coin, décalés en diagonale vers l\'extérieur', () => {
    const l = pageLayout(640, 480, 120);
    const marks = registrationMarks(l);
    expect(marks).toHaveLength(4);
    const [bl, br, tl, tr] = marks;
    expect(bl[0]).toBeLessThan(l.x);
    expect(bl[1]).toBeLessThan(l.y);
    expect(br[0]).toBeGreaterThan(l.x + l.w);
    expect(br[1]).toBeLessThan(l.y);
    expect(tl[0]).toBeLessThan(l.x);
    expect(tl[1]).toBeGreaterThan(l.y + l.h);
    expect(tr[0]).toBeGreaterThan(l.x + l.w);
    expect(tr[1]).toBeGreaterThan(l.y + l.h);
    expect(bl[0] - tl[0]).toBeCloseTo(0, 9);
    expect(br[0] - tr[0]).toBeCloseTo(0, 9);
  });

  test.each(sizes)('image %ix%i, largeur %i mm : repères dans la page, à 6 mm du bord au moins', (w, h, mm) => {
    const l = pageLayout(w, h, mm);
    const clearance = 6 * PT_PER_MM - 1e-6;
    for (const [cx, cy] of registrationMarks(l)) {
      expect(cx - 9).toBeGreaterThanOrEqual(clearance);
      expect(cy - 9).toBeGreaterThanOrEqual(clearance);
      expect(l.pageWidth - (cx + 9)).toBeGreaterThanOrEqual(clearance);
      expect(l.pageHeight - (cy + 9)).toBeGreaterThanOrEqual(clearance);
    }
  });

  test.each(sizes)('image %ix%i, largeur %i mm : les repères du haut ne touchent pas la légende', (w, h, mm) => {
    const l = pageLayout(w, h, mm);
    for (const [, cy] of registrationMarks(l)) expect(cy + 9).toBeLessThanOrEqual(l.captionY - 2);
  });

  test('mêmes repères pour deux calques de même taille', () => {
    expect(registrationMarks(pageLayout(800, 600, 200))).toEqual(registrationMarks(pageLayout(800, 600, 200)));
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

  test('widthMm : la page et la taille de l\'image du fichier suivent la largeur demandée', async () => {
    const text = latin1(await layersToPdf([page(40, 40, () => true)], { widthMm: 100 }));
    // carré de 100 mm = 283,46 pt, sur une page A4 portrait
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(text).toContain('q 283.46 0 0 283.46 ');
    const big = latin1(await layersToPdf([page(40, 40, () => true)], { widthMm: 250 }));
    expect(big).toContain('/MediaBox [0 0 841.89 1190.55]'); // A3 portrait
    expect(big).toContain('q 708.66 0 0 708.66 ');
  });

  test('widthMm trop grand pour une page PDF -> RangeError', async () => {
    await expect(layersToPdf([page(10, 10, () => true)], { widthMm: 6000 })).rejects.toThrow(RangeError);
  });

  test('repères de calage : 4 croix (16 courbes) par page, désactivables', async () => {
    const curves = (text: string) => (text.match(/\d c\n/g) ?? []).length;
    const withMarks = latin1(await layersToPdf(pages));
    expect(curves(withMarks)).toBe(4 * 4 * pages.length);
    const explicit = latin1(await layersToPdf(pages, { registrationMarks: true }));
    expect(curves(explicit)).toBe(curves(withMarks));
    const without = latin1(await layersToPdf(pages, { registrationMarks: false }));
    expect(curves(without)).toBe(0);
    expect(without.length).toBeLessThan(withMarks.length);
  });

  test('les repères sont aux mêmes coordonnées sur toutes les pages', async () => {
    const text = latin1(await layersToPdf(pages));
    const blocks = [...text.matchAll(/q 0 G 0\.5 w\n([^Q]*)Q\n/g)].map((m) => m[1]);
    expect(blocks).toHaveLength(pages.length);
    expect(new Set(blocks).size).toBe(1);
  });
});
