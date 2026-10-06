import { adjustImage, DEFAULT_SETTINGS, type Settings } from './adjust';
import { despeckle } from './layers';
import { quantize } from './quantize';
import type { Rgb, RgbaImage } from './types';

export interface ProcessResult {
  width: number;
  height: number;
  indices: Uint8Array;
  centroidsRgb: Rgb[];
}

export function processImage(img: RgbaImage, n: number, settings: Settings = DEFAULT_SETTINGS): ProcessResult {
  const adjusted = adjustImage(img, settings);
  const q = quantize(adjusted, n);
  let indices = q.indices;
  for (let pass = 0; pass < settings.cleanup; pass++) indices = despeckle(indices, img.width, img.height);
  return { width: img.width, height: img.height, indices, centroidsRgb: q.centroidsRgb };
}
