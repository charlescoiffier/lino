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

  await page.getByLabel('Teinte du calque 1').selectOption({ label: 'Violet' });
  await expect(page.getByLabel('Teinte du calque 1')).toHaveValue('violet');

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
  await page.getByLabel('Teinte du calque 2').selectOption({ label: 'Rose' });
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await page.reload();
  await page.getByLabel('Projets enregistrés').selectOption({ label: 'quad.png' });
  await expect(page.getByTestId('layer-card')).toHaveCount(4);
  await expect(page.getByLabel('Teinte du calque 2')).toHaveValue('rose');
});
