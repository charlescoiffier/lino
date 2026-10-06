import { normalizeSettings } from '../core/adjust';
import { processImage } from '../core/pipeline';
import type { ProcessRequest, ProcessResponse } from './protocol';

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<ProcessRequest>) => {
  const { id, image, n, settings } = e.data;
  try {
    const result = processImage(image, n, normalizeSettings(settings));
    const response: ProcessResponse = { id, ok: true, result };
    ctx.postMessage(response, [result.indices.buffer]);
  } catch (err) {
    const response: ProcessResponse = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
    ctx.postMessage(response);
  }
};
