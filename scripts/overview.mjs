// Renders whole-map overviews of the town and every interior for review.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1152, height: 1472 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

await page.goto('http://localhost:5173/');
await page.getByText('START GAME').click();
await page.getByText('BOY', { exact: true }).click();
await page.waitForFunction(() => window.__wildbound?.ready());
await page.evaluate(() => window.__wildbound.warp('town', 6, 17, 'down'));
await page.waitForTimeout(3000); // let the banner and hint fade
await page.evaluate(() => window.__wildbound.overview(2));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/overview-town.png` });

await page.setViewportSize({ width: 1280, height: 800 });
for (const map of ['red_house_2f', 'red_house_1f', 'pink_house_2f', 'pink_house_1f', 'blue_house', 'elder_house']) {
  await page.evaluate((m) => window.__wildbound.warp(m, 8, 2, 'left'), map);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${OUT}/overview-${map}.png` });
}
await browser.close();
