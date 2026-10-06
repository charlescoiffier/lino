import type { RgbaImage } from '../core/types';

export const MAX_DIMENSION = 1600;

export function fitSize(width: number, height: number, max = MAX_DIMENSION): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function loadImage(file: File): Promise<RgbaImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Format non supporté : choisissez une image (PNG, JPEG ou WebP).');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Impossible de lire cette image.');
  }
  const { width, height } = fitSize(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Le navigateur ne permet pas de traiter cette image.');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { width, height, data: ctx.getImageData(0, 0, width, height).data };
}
