import type { ProcessResult } from '../core/pipeline';
import type { RgbaImage } from '../core/types';
import type { ProcessRequest, ProcessResponse } from './protocol';

export interface WorkerLike {
  postMessage(msg: ProcessRequest): void;
  terminate(): void;
  onmessage: ((e: { data: ProcessResponse }) => void) | null;
}

export class CancelledError extends Error {
  constructor() {
    super('Traitement annulé.');
    this.name = 'CancelledError';
  }
}

interface Pending {
  id: number;
  reject: (e: Error) => void;
}

export class ProcessingClient {
  private worker: WorkerLike | null = null;
  private pending: Pending | null = null;
  private nextId = 0;

  constructor(private readonly factory: () => WorkerLike) {}

  run(image: RgbaImage, n: number): Promise<ProcessResult> {
    this.cancel();
    const worker = this.factory();
    this.worker = worker;
    const id = ++this.nextId;
    return new Promise<ProcessResult>((resolve, reject) => {
      this.pending = { id, reject };
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.id !== id || this.pending?.id !== id) return;
        this.pending = null;
        if (msg.ok) resolve(msg.result);
        else reject(new Error(msg.error));
      };
      worker.postMessage({ id, image, n });
    });
  }

  cancel(): void {
    if (this.pending) {
      this.pending.reject(new CancelledError());
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
  }
}
