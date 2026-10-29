// Renders the starter creatures (overworld sheets + portraits) and balls for review.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

mkdirSync('scripts/shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5173/');
await page.evaluate(async () => {
  const cr = await import('/src/assets/generators/creatures.ts');
  const chars = await import('/src/assets/generators/characters.ts');
  const looks = (await import('/src/game/data/characterLooks.ts')).CHARACTER_LOOKS;
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:#86c66a;display:flex;flex-wrap:wrap;gap:12px;padding:12px;align-items:flex-end';
  const show = (canvas, scale) => {
    const c = document.createElement('canvas');
    c.width = canvas.width * scale;
    c.height = canvas.height * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, c.width, c.height);
    document.body.appendChild(c);
  };
  for (const id of ['bulbasaur', 'charmander', 'squirtle']) {
    for (const p of cr.buildCreaturePortraits(id).slice(0, 3)) show(p, 3);
  }
  for (const id of ['bulbasaur', 'charmander', 'squirtle']) show(cr.buildCreatureSheet(id), 4);
  show(cr.buildBall('closed', 1), 6);
  show(cr.buildBall('open', 1), 6);
  show(cr.buildSparkle(), 6);
  for (const k of ['professor_max', 'rival_y', 'z_girl', 'z_boy']) if (looks[k]) show(chars.buildCharacterSheet(looks[k]), 4);
});
await page.screenshot({ path: 'scripts/shots/gallery-creatures.png', fullPage: true });
await browser.close();
