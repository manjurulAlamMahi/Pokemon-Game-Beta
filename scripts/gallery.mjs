// Renders generated art (characters, props, buildings) scaled up for review.
// Usage: node scripts/gallery.mjs   (dev server must be running)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

mkdirSync('scripts/shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5173/');
const args = process.argv.slice(2);
await page.evaluate(([only, scale]) => { window.__only = only; window.__scale = Number(scale); }, [args[0] ?? '', args[1] ?? '3']);
await page.evaluate(async () => {
  const chars = await import('/src/assets/generators/characters.ts');
  const looks = (await import('/src/game/data/characterLooks.ts')).CHARACTER_LOOKS;
  const props = (await import('/src/assets/generators/props.ts')).buildPropTextures();
  const b = await import('/src/assets/generators/buildings.ts');
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:#7cc95c;display:flex;flex-wrap:wrap;gap:8px;padding:8px;align-items:flex-end';
  const show = (canvas, scale, label) => {
    const c = document.createElement('canvas');
    c.width = canvas.width * scale;
    c.height = canvas.height * scale;
    c.title = label;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, c.width, c.height);
    c.style.imageRendering = 'pixelated';
    document.body.appendChild(c);
  };
  const only = (window.__only || '').split(',').filter(Boolean);
  for (const [k, look] of Object.entries(looks)) if (!only.length || only.includes(k)) show(chars.buildCharacterSheet(look), window.__scale || 3, k);
  const want = window.location.hash.slice(1).split(',').filter(Boolean);
  for (const k of want) if (props[k]) show(props[k], 3, k);
  void b;
});
await page.screenshot({ path: 'scripts/shots/gallery-characters.png', fullPage: true });
await browser.close();
