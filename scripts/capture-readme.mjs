// Régénère les images du README (docs/images/).
// Usage : npm run capture:readme
// Navigateur : celui de Playwright, ou CHROME_PATH / PW_CHROMIUM_PATH pour un Chromium déjà installé.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const PORT = 4175;
const OUT = new URL('../docs/images/', import.meta.url).pathname;

// Image d'exemple des captures (une cigale sur fond blanc).
const IMAGE_NAME = 'cigale.webp';
const IMAGE = readFileSync(new URL(`./assets/${IMAGE_NAME}`, import.meta.url));

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
  await page.getByTestId('file-input').setInputFiles({ name: IMAGE_NAME, mimeType: 'image/webp', buffer: IMAGE });
  await page.getByTestId('layer-card').first().waitFor();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByRole('button', { name: IMAGE_NAME, exact: true }).waitFor();
  await page.waitForTimeout(400);
}

await mkdir(OUT, { recursive: true });
execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
try {
  await waitForServer(`http://localhost:${PORT}/`);
  const executablePath = process.env.CHROME_PATH || process.env.PW_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({ executablePath });

  const bureau = await browser.newPage({ viewport: { width: 1440, height: 1060 } });
  await charge(bureau);
  await bureau.screenshot({ path: `${OUT}apercu-bureau.png` });
  await bureau.getByRole('complementary', { name: 'Réglages' }).screenshot({ path: `${OUT}reglages.png` });

  const sombre = await browser.newPage({ viewport: { width: 1440, height: 1060 }, colorScheme: 'dark' });
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
