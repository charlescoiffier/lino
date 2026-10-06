import { despeckle } from './layers';
import { quantize } from './quantize';
import type { Rgb, RgbaImage } from './types';

export interface ProcessResult {
  width: number;
  height: number;
  indices: Uint8Array;
  centroidsRgb: Rgb[];
}

export function processImage(img: RgbaImage, n: number): ProcessResult {
  const q = quantize(img, n);
  return {
    width: img.width,
    height: img.height,
    indices: despeckle(q.indices, img.width, img.height),
    centroidsRgb: q.centroidsRgb,
  };
}
