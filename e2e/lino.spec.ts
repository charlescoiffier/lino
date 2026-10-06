import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

function quadrantsPng(): Buffer {
  const size = 40;
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] =
        x < size / 2 ? (y < size / 2 ? [255, 0, 0] : [0, 0, 255]) : y < size / 2 ? [0, 200, 0] : [255, 255, 0];
      const i = (y * size + x) * 4;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

test('charger, séparer en 4 calques, attribuer une teinte, exporter', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({ name: 'quad.png', mimeType: 'image/png', buffer: quadrantsPng() });
  await expect(page.getByTestId('layer-card')).toHaveCount(4);

  await page.getByLabel('Teinte du calque 1').selectOption({ label: 'Gris Payne' });
  await expect(page.getByLabel('Teinte du calque 1')).toHaveValue('gris-payne');

  const [layerDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le calque 1' }).click(),
  ]);
  expect(layerDownload.suggestedFilename()).toBe('calque-1.png');

  const [previewDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: "Exporter l'aperçu" }).click(),
  ]);
  expect(previewDownload.suggestedFilename()).toBe('apercu.png');
});

test('changer N met à jour le nombre de calques', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({ name: 'quad.png', mimeType: 'image/png', buffer: quadrantsPng() });
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  await page.getByLabel('Nombre de couleurs').fill('3');
  await expect(page.getByTestId('layer-card')).toHaveCount(3);
});

test('un fichier qui n\'est pas une image affiche un message clair', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('bonjour') });
  await expect(page.getByRole('alert')).toContainText('Format non supporté');
  await expect(page.getByTestId('layer-card')).toHaveCount(0);
});

test('sauvegarde puis réouverture d\'un projet restaure les teintes', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({ name: 'quad.png', mimeType: 'image/png', buffer: quadrantsPng() });
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  await page.getByLabel('Teinte du calque 2').selectOption({ label: 'Bistre' });
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  // Attendre la fin de l'écriture IndexedDB avant de recharger.
  await expect(page.getByRole('button', { name: 'quad.png', exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'quad.png', exact: true }).click();
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  await expect(page.getByLabel('Teinte du calque 2')).toHaveValue('bistre');
});

test('les réglages d\'image modifient le résultat et se réinitialisent', async ({ page }) => {
  await page.goto('/');
  const big = new PNG({ width: 2000, height: 1000 });
  for (let i = 0; i < 2000 * 1000; i++) big.data.set(i % 2000 < 1000 ? [255, 0, 0, 255] : [0, 0, 255, 255], i * 4);
  await page.getByTestId('file-input').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: PNG.sync.write(big) });
  const preview = page.getByRole('img', { name: 'Aperçu final' });
  await expect(preview).toBeVisible();
  expect(await preview.evaluate((c: HTMLCanvasElement) => c.width)).toBe(1600);

  await page.getByLabel('Définition maximale').fill('800');
  await expect.poll(() => preview.evaluate((c: HTMLCanvasElement) => c.width)).toBe(800);

  await page.getByLabel('Luminosité').fill('30');
  await expect(page.getByLabel('Luminosité')).toHaveValue('30');
  await page.getByRole('button', { name: 'Réinitialiser les réglages' }).click();
  await expect(page.getByLabel('Luminosité')).toHaveValue('0');
  await expect(page.getByLabel('Définition maximale')).toHaveValue('1600');
  await expect.poll(() => preview.evaluate((c: HTMLCanvasElement) => c.width)).toBe(1600);
});

test('les réglages sont enregistrés avec le projet et teintes choisies conservées', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({ name: 'quad.png', mimeType: 'image/png', buffer: quadrantsPng() });
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  await page.getByLabel('Teinte du calque 1').selectOption({ label: 'Gris Payne' });
  await page.getByLabel('Contraste').fill('20');
  await page.getByLabel('Miroir horizontal').check();
  // Un réglage qui ne change pas le nombre de calques garde la teinte choisie à la main.
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  await expect(page.getByLabel('Teinte du calque 1')).toHaveValue('gris-payne');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  // Attendre la fin de l'écriture IndexedDB avant de recharger.
  await expect(page.getByRole('button', { name: 'quad.png', exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'quad.png', exact: true }).click();
  await expect(page.getByLabel('Contraste')).toHaveValue('20');
  await expect(page.getByLabel('Miroir horizontal')).toBeChecked();
  await expect(page.getByLabel('Teinte du calque 1')).toHaveValue('gris-payne');
});
