import { describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS } from '../core/adjust';
import { CancelledError, ProcessingClient, type WorkerLike } from './client';
import type { ProcessRequest, ProcessResponse } from './protocol';
import type { ProcessResult } from '../core/pipeline';
import type { RgbaImage } from '../core/types';

class FakeWorker implements WorkerLike {
  terminated = false;
  sent: ProcessRequest[] = [];
  onmessage: WorkerLike['onmessage'] = null;
  postMessage(msg: ProcessRequest) {
    this.sent.push(msg);
  }
  terminate() {
    this.terminated = true;
  }
  reply(res: ProcessResponse) {
    this.onmessage?.({ data: res });
  }
}

const img: RgbaImage = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
const result = (tag: number): ProcessResult => ({ width: 1, height: 1, indices: new Uint8Array([tag]), centroidsRgb: [[0, 0, 0]] });

describe('ProcessingClient', () => {
  test('transmet les réglages au worker', () => {
    const w = new FakeWorker();
    const client = new ProcessingClient(() => w);
    const settings = { ...DEFAULT_SETTINGS, contrast: 30 };
    client.run(img, 4, settings).catch(() => undefined);
    expect(w.sent[0].settings).toEqual(settings);
  });

  test('résout avec le résultat du worker', async () => {
    const w = new FakeWorker();
    const client = new ProcessingClient(() => w);
    const p = client.run(img, 4);
    w.reply({ id: w.sent[0].id, ok: true, result: result(1) });
    expect((await p).indices[0]).toBe(1);
  });

  test('un second run annule le premier et termine son worker', async () => {
    const workers: FakeWorker[] = [];
    const client = new ProcessingClient(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    const first = client.run(img, 3);
    const second = client.run(img, 4);
    await expect(first).rejects.toBeInstanceOf(CancelledError);
    expect(workers[0].terminated).toBe(true);
    workers[1].reply({ id: workers[1].sent[0].id, ok: true, result: result(2) });
    expect((await second).indices[0]).toBe(2);
  });

  test('une réponse périmée est ignorée', async () => {
    const workers: FakeWorker[] = [];
    const client = new ProcessingClient(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    const first = client.run(img, 3).catch(() => 'annulé');
    const second = client.run(img, 4);
    workers[0].reply({ id: workers[0].sent[0].id, ok: true, result: result(9) });
    workers[1].reply({ id: workers[1].sent[0].id, ok: true, result: result(2) });
    expect(await first).toBe('annulé');
    expect((await second).indices[0]).toBe(2);
  });

  test('erreur du worker -> promesse rejetée avec le message', async () => {
    const w = new FakeWorker();
    const client = new ProcessingClient(() => w);
    const p = client.run(img, 4);
    w.reply({ id: w.sent[0].id, ok: false, error: 'boom' });
    await expect(p).rejects.toThrow('boom');
  });

  test('cancel() rejette la promesse en cours', async () => {
    const w = new FakeWorker();
    const client = new ProcessingClient(() => w);
    const p = client.run(img, 4);
    client.cancel();
    await expect(p).rejects.toBeInstanceOf(CancelledError);
    expect(w.terminated).toBe(true);
  });
});
