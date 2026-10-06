import type { RgbaImage } from './types';

export interface Settings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  cleanup: number;
  invert: boolean;
  mirror: boolean;
  definition: number;
}

export const DEFAULT_SETTINGS: Settings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  cleanup: 1,
  invert: false,
  mirror: false,
  definition: 1600,
};

export const SETTING_LIMITS = {
  brightness: { min: -100, max: 100, step: 1 },
  contrast: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  blur: { min: 0, max: 5, step: 1 },
  cleanup: { min: 0, max: 3, step: 1 },
  definition: { min: 400, max: 1600, step: 100 },
} as const;

type NumericKey = keyof typeof SETTING_LIMITS;

function numeric(raw: Record<string, unknown>, key: NumericKey): number {
  const v = raw[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_SETTINGS[key];
  const { min, max } = SETTING_LIMITS[key];
  return Math.round(Math.min(max, Math.max(min, v)));
}

/** Accepte n'importe quelle valeur (ancien projet, fichier modifié) et renvoie des réglages valides. */
export function normalizeSettings(raw: unknown): Settings {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    brightness: numeric(r, 'brightness'),
    contrast: numeric(r, 'contrast'),
    saturation: numeric(r, 'saturation'),
    blur: numeric(r, 'blur'),
    cleanup: numeric(r, 'cleanup'),
    invert: typeof r.invert === 'boolean' ? r.invert : DEFAULT_SETTINGS.invert,
    mirror: typeof r.mirror === 'boolean' ? r.mirror : DEFAULT_SETTINGS.mirror,
    definition: numeric(r, 'definition'),
  };
}

/** Pose l'image sur fond blanc : les pixels transparents deviennent blancs, l'alpha vaut 255 ensuite. */
function flattenOnWhite(img: RgbaImage): Uint8ClampedArray {
  const px = img.width * img.height;
  const out = new Uint8ClampedArray(px * 4);
  const d = img.data;
  for (let i = 0; i < px; i++) {
    const a = d[i * 4 + 3] / 255;
    out[i * 4] = d[i * 4] * a + 255 * (1 - a);
    out[i * 4 + 1] = d[i * 4 + 1] * a + 255 * (1 - a);
    out[i * 4 + 2] = d[i * 4 + 2] * a + 255 * (1 - a);
    out[i * 4 + 3] = 255;
  }
  return out;
}

function blurPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, width: number, height: number, r: number, horizontal: boolean) {
  const len = horizontal ? width : height;
  const lines = horizontal ? height : width;
  const stride = horizontal ? 4 : width * 4;
  const lineStride = horizontal ? width * 4 : 4;
  const size = 2 * r + 1;
  const at = (i: number) => Math.min(len - 1, Math.max(0, i));
  for (let line = 0; line < lines; line++) {
    for (let ch = 0; ch < 3; ch++) {
      const base = line * lineStride + ch;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[base + at(k) * stride];
      for (let i = 0; i < len; i++) {
        dst[base + i * stride] = sum / size;
        sum += src[base + at(i + r + 1) * stride] - src[base + at(i - r) * stride];
      }
    }
  }
}

function boxBlur(data: Uint8ClampedArray, width: number, height: number, r: number): Uint8ClampedArray {
  const tmp = data.slice();
  const out = data.slice();
  blurPass(data, tmp, width, height, r, true);
  blurPass(tmp, out, width, height, r, false);
  return out;
}

function tone(data: Uint8ClampedArray, s: Settings): void {
  const offset = s.brightness * 2.55;
  const c = s.contrast * 2.55;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const sat = 1 + s.saturation / 100;
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (sat !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * sat;
      g = gray + (g - gray) * sat;
      b = gray + (b - gray) * sat;
    }
    r = clamp(factor * (r + offset - 128) + 128);
    g = clamp(factor * (g + offset - 128) + 128);
    b = clamp(factor * (b + offset - 128) + 128);
    if (s.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

function mirrorRows(data: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.floor(width / 2); x++) {
      const a = (y * width + x) * 4;
      const b = (y * width + (width - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) {
        const t = data[a + k];
        data[a + k] = data[b + k];
        data[b + k] = t;
      }
    }
  }
}

/** Applique les réglages de tonalité à l'image source. Renvoie une nouvelle image opaque. */
export function adjustImage(img: RgbaImage, s: Settings): RgbaImage {
  const { width, height } = img;
  let data = flattenOnWhite(img);
  if (s.blur > 0) data = boxBlur(data, width, height, s.blur);
  tone(data, s);
  if (s.mirror) mirrorRows(data, width, height);
  return { width, height, data };
}
