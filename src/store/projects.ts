import { del, get, getMany, keys, set } from 'idb-keyval';

export interface Project {
  id: string;
  name: string;
  imageBytes: ArrayBuffer;
  imageType: string;
  n: number;
  swatchIds: string[];
  updatedAt: number;
}

const PREFIX = 'project:';

export const saveProject = (p: Project): Promise<void> => set(PREFIX + p.id, p);
export const loadProject = (id: string): Promise<Project | undefined> => get<Project>(PREFIX + id);
export const deleteProject = (id: string): Promise<void> => del(PREFIX + id);

export async function listProjects(): Promise<Project[]> {
  const all = (await keys()).filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX));
  const projects = (await getMany<Project>(all)).filter((p): p is Project => p !== undefined);
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

function toBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 0x8000) {
    binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

export function projectToFile(p: Project): Blob {
  const json = JSON.stringify({
    version: 1,
    id: p.id,
    name: p.name,
    n: p.n,
    swatchIds: p.swatchIds,
    updatedAt: p.updatedAt,
    imageType: p.imageType,
    image: toBase64(p.imageBytes),
  });
  return new Blob([json], { type: 'application/json' });
}

export async function projectFromFile(blob: Blob): Promise<Project> {
  const fail = () => new Error('Fichier projet invalide.');
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(await blob.text());
  } catch {
    throw fail();
  }
  if (raw === null || typeof raw !== 'object' || raw.version !== 1) throw fail();
  const { id, name, n, swatchIds, updatedAt, imageType, image } = raw;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof n !== 'number' ||
    !Array.isArray(swatchIds) ||
    !swatchIds.every((s) => typeof s === 'string') ||
    typeof updatedAt !== 'number' ||
    typeof imageType !== 'string' ||
    typeof image !== 'string'
  ) {
    throw fail();
  }
  try {
    return { id, name, n, swatchIds: swatchIds as string[], updatedAt, imageType, imageBytes: fromBase64(image) };
  } catch {
    throw fail();
  }
}
