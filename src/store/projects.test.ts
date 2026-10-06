import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS } from '../core/adjust';
import { deleteProject, listProjects, loadProject, projectFromFile, projectToFile, saveProject, type Project } from './projects';

const sample = (id: string, updatedAt = 1): Project => ({
  id,
  name: `Projet ${id}`,
  imageBytes: new Uint8Array([1, 2, 3, 250, 251]).buffer,
  imageType: 'image/png',
  n: 4,
  swatchIds: ['noir', 'rouge-vermillon'],
  updatedAt,
});

beforeEach(async () => {
  for (const p of await listProjects()) await deleteProject(p.id);
});

describe('IndexedDB', () => {
  test('sauvegarde puis relit un projet', async () => {
    await saveProject(sample('a'));
    const loaded = await loadProject('a');
    expect(loaded?.name).toBe('Projet a');
    expect(Array.from(new Uint8Array(loaded!.imageBytes))).toEqual([1, 2, 3, 250, 251]);
  });

  test('listProjects : plus récent d\'abord', async () => {
    await saveProject(sample('old', 1));
    await saveProject(sample('new', 2));
    expect((await listProjects()).map((p) => p.id)).toEqual(['new', 'old']);
  });

  test('deleteProject', async () => {
    await saveProject(sample('a'));
    await deleteProject('a');
    expect(await loadProject('a')).toBeUndefined();
  });
});

describe('fichier projet', () => {
  test('aller-retour', async () => {
    const back = await projectFromFile(projectToFile(sample('a')));
    expect(back.id).toBe('a');
    expect(back.n).toBe(4);
    expect(back.swatchIds).toEqual(['noir', 'rouge-vermillon']);
    expect(Array.from(new Uint8Array(back.imageBytes))).toEqual([1, 2, 3, 250, 251]);
  });

  test('les réglages font l\'aller-retour', async () => {
    const settings = { ...DEFAULT_SETTINGS, brightness: 25, invert: true, definition: 800 };
    const back = await projectFromFile(projectToFile({ ...sample('a'), settings }));
    expect(back.settings).toEqual(settings);
  });

  test('fichier sans réglages (ancienne version) -> réglages par défaut', async () => {
    const legacy = JSON.stringify({
      version: 1,
      id: 'old',
      name: 'old.png',
      n: 3,
      swatchIds: ['noir'],
      updatedAt: 1,
      imageType: 'image/png',
      image: 'AQID',
    });
    expect((await projectFromFile(new Blob([legacy]))).settings).toEqual(DEFAULT_SETTINGS);
  });

  test.each([
    ['pas du JSON', 'ceci n\'est pas du json'],
    ['mauvaise version', JSON.stringify({ version: 2 })],
    ['champs manquants', JSON.stringify({ version: 1, id: 'x' })],
  ])('rejette : %s', async (_l, text) => {
    await expect(projectFromFile(new Blob([text]))).rejects.toThrow('Fichier projet invalide.');
  });
});
