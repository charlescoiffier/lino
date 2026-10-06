// Régénère les images du README (docs/images/).
// Usage : npm run capture:readme
// Navigateur : celui de Playwright, ou CHROME_PATH / PW_CHROMIUM_PATH pour un Chromium déjà installé.
import { spawn, execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';

const PORT = 4175;
const OUT = new URL('../docs/images/', import.meta.url).pathname;

// Image d'exemple fabriquée ici : un paysage simple, bien séparé en quatre couleurs.
function paysage() {
  const w = 480;
  const h = 320;
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sun = (x - 340) ** 2 + (y - 80) ** 2 < 40 ** 2;
      const hill = y > 150 + 30 * Math.sin(x / 50);
      const sky = y < 190;
      const [r, g, b] = sun ? [250, 200, 40] : hill ? [30 + (x % 60), 110, 60] : sky ? [60 + y / 3, 120 + y / 3, 210] : [30, 30, 80];
      png.data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return PNG.sync.write(png);
}

async function waitForServer(url) {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* le serveur démarre */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Le serveur ne répond pas : ${url}`);
}

async function charge(page) {
  await page.goto(`http://localhost:${PORT}/`);
  await page.getByTestId('file-input').setInputFiles({ name: 'paysage.png', mimeType: 'image/png', buffer: paysage() });
  await page.getByTestId('layer-card').first().waitFor();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByRole('button', { name: 'paysage.png', exact: true }).waitFor();
  await page.waitForTimeout(400);
}

await mkdir(OUT, { recursive: true });
execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
try {
  await waitForServer(`http://localhost:${PORT}/`);
  const executablePath = process.env.CHROME_PATH || process.env.PW_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({ executablePath });

  const bureau = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await charge(bureau);
  await bureau.screenshot({ path: `${OUT}apercu-bureau.png` });
  await bureau.getByRole('complementary', { name: 'Réglages' }).screenshot({ path: `${OUT}reglages.png` });

  const sombre = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await charge(sombre);
  await sombre.screenshot({ path: `${OUT}apercu-sombre.png` });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await charge(mobile);
  await mobile.screenshot({ path: `${OUT}mobile.png` });

  await browser.close();
} finally {
  server.kill();
}
console.log(`Images écrites dans ${OUT}`);
