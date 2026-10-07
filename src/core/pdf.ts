import type { Rgb } from './types';

/** Une page = un calque : masque binaire (1 = encre), légende et couleur de la teinte. */
export interface PdfLayerPage {
  mask: Uint8Array;
  width: number;
  height: number;
  caption: string;
  color: Rgb;
}

export interface PdfOptions {
  title?: string;
}

export interface PageLayout {
  pageWidth: number;
  pageHeight: number;
  /** Rectangle de l'image, en points PDF (origine en bas à gauche). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ligne de base de la légende. */
  captionY: number;
}

const A4 = { short: 595.28, long: 841.89 };
const MARGIN = 36;
const CAPTION_BAND = 28;
const CAPTION_SIZE = 11;
const SWATCH = 10;

/**
 * Page A4 en portrait ou en paysage selon le format de l'image ; l'image est mise à l'échelle pour tenir dans les
 * marges (sous la légende) et centrée. Deux calques de même taille tombent donc exactement au même endroit.
 */
export function pageLayout(width: number, height: number): PageLayout {
  const landscape = width > height;
  const pageWidth = landscape ? A4.long : A4.short;
  const pageHeight = landscape ? A4.short : A4.long;
  const availW = pageWidth - 2 * MARGIN;
  const availH = pageHeight - 2 * MARGIN - CAPTION_BAND;
  const scale = Math.min(availW / width, availH / height);
  const w = width * scale;
  const h = height * scale;
  return {
    pageWidth,
    pageHeight,
    x: MARGIN + (availW - w) / 2,
    y: MARGIN + (availH - h) / 2,
    w,
    h,
    captionY: pageHeight - MARGIN - CAPTION_SIZE,
  };
}

/** Masque (1 = encre) → bitmap 1 bit par pixel, lignes alignées sur l'octet. Bit 0 = noir (encre), 1 = blanc. */
export function packMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const rowBytes = Math.ceil(width / 8);
  const out = new Uint8Array(rowBytes * height).fill(0xff);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) out[y * rowBytes + (x >> 3)] &= ~(0x80 >> (x & 7));
    }
  }
  return out;
}

/** Compresse en zlib (FlateDecode). Sans CompressionStream, renvoie null et l'image est stockée telle quelle. */
async function deflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Octets d'une chaîne en Latin-1 (WinAnsi) ; ce qui sort du Latin-1 devient « ? ». */
function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    out[i] = c < 256 ? c : 0x3f;
  }
  return out;
}

function pdfString(text: string): Uint8Array {
  const bytes = latin1(text);
  const out: number[] = [0x28];
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c);
    out.push(b);
  }
  out.push(0x29);
  return Uint8Array.from(out);
}

const num = (n: number): string => (Math.round(n * 100) / 100).toString();
const ascii = (s: string): Uint8Array => latin1(s);

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * Assemble un PDF multipages : une page par calque, avec l'image en noir et blanc 1 bit, un fin cadre, et une légende
 * précédée d'un carré de la couleur de la teinte. Aucun lecteur ni dépendance : le fichier est écrit à la main.
 */
export async function layersToPdf(pages: PdfLayerPage[], options: PdfOptions = {}): Promise<Uint8Array> {
  if (pages.length === 0) throw new RangeError('Aucun calque à exporter.');

  // Numérotation : 1 catalogue, 2 liste des pages, 3 police, 4 informations, puis 3 objets par page.
  const firstPage = 5;
  const pageObj = (i: number) => firstPage + i * 3;
  const objects: Uint8Array[] = [];
  const set = (id: number, body: Uint8Array) => {
    objects[id] = concat([ascii(`${id} 0 obj\n`), body, ascii('\nendobj\n')]);
  };

  set(1, ascii('<< /Type /Catalog /Pages 2 0 R >>'));
  set(2, ascii(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>`));
  set(3, ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  set(4, concat([ascii('<< /Producer (Lino) /Title '), pdfString(options.title ?? 'Calques'), ascii(' >>')]));

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (page.mask.length !== page.width * page.height || page.width < 1 || page.height < 1) {
      throw new RangeError(`Calque ${i + 1} : dimensions incohérentes.`);
    }
    const layout = pageLayout(page.width, page.height);
    const [r, g, b] = page.color.map((v) => num(v / 255));
    const textX = MARGIN + SWATCH + 6;

    const content = concat([
      ascii(`q ${r} ${g} ${b} rg ${num(MARGIN)} ${num(layout.captionY - 1)} ${SWATCH} ${SWATCH} re f Q\n`),
      ascii('q 0.4 G 0.5 w '),
      ascii(`${num(MARGIN)} ${num(layout.captionY - 1)} ${SWATCH} ${SWATCH} re S Q\n`),
      ascii(`BT /F1 ${CAPTION_SIZE} Tf ${num(textX)} ${num(layout.captionY)} Td `),
      pdfString(page.caption),
      ascii(' Tj ET\n'),
      ascii(`q ${num(layout.w)} 0 0 ${num(layout.h)} ${num(layout.x)} ${num(layout.y)} cm /Im0 Do Q\n`),
      ascii(`q 0.6 G 0.5 w ${num(layout.x)} ${num(layout.y)} ${num(layout.w)} ${num(layout.h)} re S Q\n`),
    ]);

    const raw = packMask(page.mask, page.width, page.height);
    const packed = await deflate(raw);
    const imageData = packed ?? raw;
    const filter = packed ? '/Filter /FlateDecode ' : '';

    set(
      pageObj(i),
      ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(layout.pageWidth)} ${num(layout.pageHeight)}] ` +
          `/Resources << /Font << /F1 3 0 R >> /XObject << /Im0 ${pageObj(i) + 2} 0 R >> >> /Contents ${pageObj(i) + 1} 0 R >>`,
      ),
    );
    set(pageObj(i) + 1, concat([ascii(`<< /Length ${content.length} >>\nstream\n`), content, ascii('endstream')]));
    set(
      pageObj(i) + 2,
      concat([
        ascii(
          `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceGray ` +
            `/BitsPerComponent 1 ${filter}/Length ${imageData.length} >>\nstream\n`,
        ),
        imageData,
        ascii('\nendstream'),
      ]),
    );
  }

  const header = concat([ascii('%PDF-1.4\n%'), Uint8Array.of(0xe2, 0xe3, 0xcf, 0xd3), ascii('\n')]);
  const parts: Uint8Array[] = [header];
  const offsets: number[] = [];
  let position = header.length;
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = position;
    parts.push(objects[id]);
    position += objects[id].length;
  }
  const size = objects.length;
  const xref =
    `xref\n0 ${size}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
      .join('');
  parts.push(ascii(`${xref}trailer\n<< /Size ${size} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${position}\n%%EOF\n`));
  return concat(parts);
}
