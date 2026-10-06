import type { ProcessResult } from '../core/pipeline';
import type { Settings } from '../core/adjust';
import type { RgbaImage } from '../core/types';

export interface ProcessRequest {
  id: number;
  image: RgbaImage;
  n: number;
  settings?: Settings;
}

export type ProcessResponse =
  | { id: number; ok: true; result: ProcessResult }
  | { id: number; ok: false; error: string };
