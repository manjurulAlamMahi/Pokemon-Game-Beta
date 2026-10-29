// Exploratory run of the lab scene with screenshots at each beat.
// Usage: node scripts/lab-run.mjs [boy|girl] [bulbasaur|charmander|squirtle]
import { createHarness, sleep } from './lib.mjs';

const gender = process.argv[2] ?? 'boy';
const pick = process.argv[3] ?? 'charmander';
const h = await createHarness();
const { page } = h;

await h.boot(gender);
await h.api('warp', 'town', 17, 8, 'up');
await h.waitMap('town');
await h.step('up');
await page.waitForFunction(() => window.__wildbound.state().player.currentMap === 'lab', null, { timeout: 4000 });
await sleep(1600);
await h.shot(`L01-${gender}-lab-arrive`);
await page.waitForFunction(() => window.__wildbound.dialogue().open, null, { timeout: 8000 });
await sleep(700);
await h.shot(`L02-${gender}-welcome`);
const intro = await h.talkThrough(async () => !(await h.api('cutscene')));
console.log('INTRO', JSON.stringify(intro));

// Preview: face the Bulbasaur capsule.
await h.walkTo(6, 5);
await h.face('up');
await sleep(500);
await h.shot(`L03-${gender}-hologram`);
await page.keyboard.press('e');
await sleep(500);
await h.shot(`L04-${gender}-panel`);
const order = ['bulbasaur', 'charmander', 'squirtle'];
for (let i = 0; i < order.indexOf(pick); i++) {
  await page.keyboard.press('ArrowRight');
  await sleep(150);
}
await h.shot(`L05-${gender}-panel-${pick}`);
await page.keyboard.press('Enter');
// Through the professor's confirmation to the reveal.
await h.talkThrough(async () => (await h.api('ui')).reveal !== null);
await sleep(700);
await h.shot(`L06-${gender}-reveal-drop`);
await sleep(900);
await h.shot(`L07-${gender}-reveal-open`);
await sleep(1400);
await h.shot(`L08-${gender}-reveal-banner`);
await page.keyboard.press('Enter');
await sleep(600);
const rest = [];
let groupShot = false;
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  const d = await h.dialogue();
  const cut = await h.api('cutscene');
  if (!cut && !d.open) break;
  if (d.open && d.lineDone) {
    if (!rest.length || rest[rest.length - 1].key !== d.lineKey) {
      rest.push({ key: d.lineKey, speaker: d.speaker, text: d.text });
      if (d.text.startsWith('So...') && !groupShot) {
        groupShot = true;
        await h.shot(`L09-${gender}-group`);
      }
      if (d.text.startsWith('Ha!')) await h.shot(`L10-${gender}-rival-laugh`);
      if (d.text.startsWith("Then I'll take")) await h.shot(`L11-${gender}-rival-pick`);
      if (d.text.startsWith('See you around')) await h.shot(`L12-${gender}-departure`);
    }
    await page.keyboard.press('e');
    await sleep(90);
  } else if (d.open) {
    await page.keyboard.press('Space');
    await sleep(40);
  } else {
    await sleep(100);
  }
}
console.log('REST', JSON.stringify(rest.map((r) => `${r.speaker ?? '-'}: ${r.text}`), null, 1));
await sleep(500);
await h.shot(`L13-${gender}-after`);
console.log('STATE', JSON.stringify((await h.state()).story), 'FOLLOWER', JSON.stringify(await h.api('follower')));
console.log('ERRORS', h.errors);
await h.finish();
