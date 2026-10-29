// End-to-end playtest driven by real keyboard input in headless Chrome.
// Walks the player around with BFS over the live collision grid, talks to
// every NPC, reads every dialogue, and probes all collision cases.
// Usage: node scripts/playtest.mjs   (dev server must be running)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });
const SIZES = { town: [36, 46], red_house_1f: [10, 8], red_house_2f: [10, 8], pink_house_1f: [10, 8], pink_house_2f: [10, 8], blue_house: [10, 8], elder_house: [10, 8], lab: [14, 11] };
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const WASD = { up: 'w', down: 's', left: 'a', right: 'd' };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const api = (fn, ...args) => page.evaluate(([f, a]) => window.__wildbound[f](...a), [fn, args]);
const player = () => api('player');
const state = () => api('state');
const dialogue = () => api('dialogue');
const mapId = async () => (await state()).player.currentMap;

async function waitIdle() {
  await page.waitForFunction(() => window.__wildbound?.ready() && !window.__wildbound.player().moving, null, { timeout: 4000 });
}

/** Press a direction until the player starts moving (or 450ms passes). */
async function step(dir, keys = KEY) {
  const before = await player();
  await page.keyboard.down(keys[dir]);
  const t0 = Date.now();
  let moved = false;
  while (Date.now() - t0 < 450) {
    const p = await player().catch(() => null);
    if (!p || p.moving || p.x !== before.x || p.y !== before.y) {
      moved = true;
      break;
    }
    await sleep(8);
  }
  await page.keyboard.up(keys[dir]);
  return moved;
}

/** Tap a direction briefly: turns in place if not already facing it. */
async function face(dir) {
  const p = await player();
  if (p.facing === dir) return;
  await page.keyboard.down(KEY[dir]);
  await sleep(35);
  await page.keyboard.up(KEY[dir]);
  await sleep(60);
}

async function bfs(goal) {
  const map = await mapId();
  const [W, H] = SIZES[map];
  const start = await player();
  const free = await page.evaluate(
    ([W, H]) => {
      const out = {};
      for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) out[`${x},${y}`] = window.__wildbound.free(x, y);
      return out;
    },
    [W, H],
  );
  const key = (x, y) => `${x},${y}`;
  const prev = new Map([[key(start.x, start.y), null]]);
  const q = [[start.x, start.y]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === goal.x && y === goal.y) break;
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (prev.has(k) || !free[k]) continue;
      prev.set(k, { from: key(x, y), dir: d });
      q.push([nx, ny]);
    }
  }
  if (!prev.has(key(goal.x, goal.y))) return null;
  const path = [];
  let k = key(goal.x, goal.y);
  while (prev.get(k)) {
    path.unshift(prev.get(k).dir);
    k = prev.get(k).from;
  }
  return path;
}

/** Walk to a tile with real key presses, re-planning if an NPC gets in the way. */
async function walkTo(x, y, { keys = KEY } = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await waitIdle();
    const p = await player();
    if (p.x === x && p.y === y) return true;
    const path = await bfs({ x, y });
    if (!path) {
      await sleep(400);
      continue;
    }
    let ok = true;
    let cur = { x: p.x, y: p.y };
    for (const dir of path) {
      const startMap = await mapId();
      await step(dir, keys);
      await waitIdle().catch(() => {});
      if ((await mapId()) !== startMap) return true; // warped
      const now = await player();
      const want = { x: cur.x + DIRS[dir][0], y: cur.y + DIRS[dir][1] };
      if (now.x !== want.x || now.y !== want.y) {
        ok = false; // blocked (e.g. a wandering NPC stepped in) -> re-plan
        break;
      }
      cur = want;
    }
    const end = await player();
    if (ok && end.x === x && end.y === y) return true;
  }
  return false;
}

async function readDialogue() {
  await page.waitForFunction(() => window.__wildbound.dialogue().open, null, { timeout: 2500 });
  const lines = [];
  let speaker;
  let lastKey = -1;
  const advanceKeys = ['e', 'Space', 'Enter'];
  for (let i = 0; i < 20; i++) {
    const d = await dialogue();
    if (!d.open) break;
    speaker = d.speaker;
    // Let the typewriter run on the first line, skip it on later ones.
    if (i > 0 && !d.lineDone) await page.keyboard.press('Space');
    await page.waitForFunction(() => { const v = window.__wildbound.dialogue(); return v.lineDone || !v.open; }, null, { timeout: 6000 });
    const d2 = await dialogue();
    if (!d2.open) break;
    if (d2.lineKey !== lastKey) {
      lines.push(d2.text);
      lastKey = d2.lineKey;
    }
    await page.keyboard.press(advanceKeys[i % 3]);
    await sleep(70);
  }
  await page.waitForFunction(() => !window.__wildbound.dialogue().open, null, { timeout: 2000 });
  return { speaker, lines };
}

/** Walk next to a target tile, face it and press E. */
async function talkTo(targetFn, label) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const t = await targetFn();
    const options = [];
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const sx = t.x - dx;
      const sy = t.y - dy;
      if (await api('free', sx, sy)) options.push({ x: sx, y: sy, dir: d });
      const p = await player();
      if (p.x === sx && p.y === sy) options.unshift({ x: sx, y: sy, dir: d });
    }
    for (const o of options) {
      if (!(await walkTo(o.x, o.y))) continue;
      await face(o.dir);
      const t2 = await targetFn();
      const p = await player();
      const [dx, dy] = DIRS[p.facing];
      if (p.x + dx !== t2.x || p.y + dy !== t2.y) break; // target moved, retry
      await page.keyboard.press('e');
      return readDialogue();
    }
  }
  throw new Error(`Could not reach ${label}`);
}

const npcPos = (id) => async () => (await api('npcs')).find((n) => n.id === id);
const fixed = (x, y) => async () => ({ x, y });

async function enterDoor(doorX, doorY, expectedMap) {
  await walkTo(doorX, doorY + 1);
  await step('up');
  await page.waitForFunction((m) => window.__wildbound.state().player.currentMap === m, expectedMap, { timeout: 3000 });
  await sleep(450);
  await waitIdle();
  const p = await player();
  check(`enter ${expectedMap}`, true, `arrived at (${p.x},${p.y}) facing ${p.facing}`);
}

async function exitHouse(expectX, expectY) {
  await walkTo(4, 7);
  await step('down');
  await page.waitForFunction(() => window.__wildbound.state().player.currentMap === 'town', null, { timeout: 3000 });
  await sleep(450);
  await waitIdle();
  const p = await player();
  check('exit to town in front of door', p.x === expectX && p.y === expectY, `(${p.x},${p.y})`);
}

async function expectBlocked(name, dir) {
  await waitIdle();
  const before = await player();
  await page.keyboard.down(KEY[dir]);
  await sleep(450);
  await page.keyboard.up(KEY[dir]);
  await sleep(120);
  const after = await player();
  check(name, after.x === before.x && after.y === before.y && after.facing === dir, `stayed at (${after.x},${after.y})`);
}

// ---------------------------------------------------------------------------
async function boot(gender) {
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('text=START GAME');
  check('title screen shows START GAME', await page.isVisible('text=START GAME'));
  await page.screenshot({ path: `${OUT}/t01-title.png` });
  await page.hover('text=START GAME');
  await page.click('text=START GAME');
  await page.waitForSelector('text=Choose your character');
  check('character select shown', await page.isVisible('text=BOY') && await page.isVisible('text=GIRL'));
  await page.click(`text=${gender.toUpperCase()}`);
  await page.waitForFunction(() => window.__wildbound?.ready());
  await sleep(500);
  const s = await state();
  check(`${gender} selection stored in state`, s.player.gender === gender && s.gameStarted === true && s.story.playerStarter === null && s.story.starterChosen === false && s.story.professorMet === false);
}


async function useStairs(expectedMap) {
  await walkTo(9, 2);
  await page.waitForFunction((m) => window.__wildbound.state().player.currentMap === m, expectedMap, { timeout: 3000 });
  await sleep(450);
  await waitIdle();
  const p = await player();
  check(`stairs lead to ${expectedMap}`, p.x === 8 && p.y === 2, `(${p.x},${p.y})`);
}

const MOM_FIRST = ['Good morning!', 'You should go meet the Professor.', 'Your rivals have already gone to the lab.'];
const WREN = ["My daughter went to the Professor's lab to choose her first creature.", "She's been waiting for this day forever!"];

await boot('boy');
await page.screenshot({ path: `${OUT}/t02-start-boy.png` });
{
  const p = await player();
  check('boy starts in his bedroom upstairs in the red house', (await mapId()) === 'red_house_2f' && p.x === 2 && p.y === 4, `${await mapId()} (${p.x},${p.y})`);
  const pc = await talkTo(fixed(0, 2), 'PC');
  check('Bedroom PC is usable', pc.lines[0] === 'You booted up the PC.', JSON.stringify(pc.lines));
}
await useStairs('red_house_1f');
await page.screenshot({ path: `${OUT}/t08-player-house.png` });
{
  const d = await talkTo(npcPos('mom'), 'Mom');
  check('Mom (red house 1F) first dialogue', d.speaker === 'Mom' && same(d.lines, MOM_FIRST), JSON.stringify(d));
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__wildbound.dialogue().open);
  await sleep(500);
  await page.screenshot({ path: `${OUT}/t09-mom-dialogue.png` });
  const d2 = await readDialogue();
  check('Mom repeat dialogue', same(d2.lines, ["Don't keep the Professor waiting!"]), JSON.stringify(d2));
  const tv = await talkTo(fixed(3, 2), 'TV');
  check('TV is inspectable', tv.lines.length === 2, JSON.stringify(tv.lines));
  await walkTo(0, 6);
  await expectBlocked('Interior left boundary blocks', 'left');
}
await useStairs('red_house_2f');
await useStairs('red_house_1f');
await exitHouse(6, 17);
// --- Movement ---------------------------------------------------------------
{
  await step('down');
  await waitIdle();
  let p = await player();
  check('arrow-key movement', p.x === 6 && p.y === 18, `(${p.x},${p.y})`);
  await step('right', WASD);
  await waitIdle();
  p = await player();
  check('WASD movement (turn + step)', p.x === 7 && p.y === 18, `(${p.x},${p.y})`);
  // Run: hold shift + right for 600ms, compare distance with walking.
  await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowRight');
  await sleep(600);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('Shift');
  await waitIdle();
  const run = await player();
  await page.keyboard.down('ArrowRight');
  await sleep(600);
  await page.keyboard.up('ArrowRight');
  await waitIdle();
  const walk = await player();
  check('Shift runs faster than walking', run.x - 7 > walk.x - run.x, `run ${run.x - 7} tiles vs walk ${walk.x - run.x} tiles in 600ms`);
}

// --- Collision ----------------------------------------------------------------
await walkTo(5, 17);
await expectBlocked('house wall blocks movement', 'up');
await walkTo(8, 21);
await expectBlocked('pool water blocks movement (north shore)', 'down');
await walkTo(5, 23);
await expectBlocked('pool water blocks movement (west shore)', 'right');
await page.screenshot({ path: `${OUT}/t03-pool.png` });
await walkTo(4, 29);
await expectBlocked('tree blocks movement', 'left');

// --- Outside NPCs ----------------------------------------------------------------
{
  const d = await talkTo(npcPos('pool_kid'), 'Pip');
  check('Pool NPC dialogue', same(d.lines, ['If I had a fishing rod...', "I'd catch a Magikarp from this pool!"]), JSON.stringify(d));
  const pip = await (npcPos('pool_kid'))();
  const p = await player();
  if (Math.abs(pip.x - p.x) + Math.abs(pip.y - p.y) === 1) {
    const dir = Object.entries(DIRS).find(([, [dx, dy]]) => p.x + dx === pip.x && p.y + dy === pip.y)[0];
    await expectBlocked('NPC blocks movement', dir);
  }
}
{
  const d = await talkTo(fixed(8, 22), 'pool');
  check('Pool is inspectable', d.lines[0] === 'The water is clear and calm.', JSON.stringify(d.lines));
}
{
  const d = await talkTo(npcPos('hiker'), 'Rowan');
  check('Wild-creatures NPC dialogue', same(d.lines, ['The outside world is full of wild creatures.', "You never know what you'll find in the tall grass."]), JSON.stringify(d));
}
{
  const d = await talkTo(fixed(19, 20), 'town sign');
  check('Town sign readable', d.lines[0] === 'WILLOWBROOK', JSON.stringify(d.lines));
}

// --- Wild-area blocker ------------------------------------------------------------
{
  await walkTo(17, 34);
  await face('down');
  // Walking into the ranger triggers their dialogue automatically.
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => window.__wildbound.dialogue().open, null, { timeout: 2000 }).catch(() => {});
  await page.keyboard.up('ArrowDown');
  await sleep(500);
  await page.screenshot({ path: `${OUT}/t05-guard-bump.png` });
  const d = await readDialogue();
  check('Bumping the ranger triggers dialogue', same(d.lines, ['Hey!', "You can't go out there yet.", 'You should meet the Professor first.']), JSON.stringify(d));
  let p = await player();
  check('Ranger physically blocks the gate', p.x === 17 && p.y === 34, `(${p.x},${p.y})`);
  await page.keyboard.press('e');
  const d2 = await readDialogue();
  check('Ranger repeat dialogue', same(d2.lines, ["Sorry, you can't go this way yet.", 'Go meet the Professor first.']), JSON.stringify(d2));
  // Holding down against the ranger after the chat must not let the player through.
  await page.keyboard.down('ArrowDown');
  await sleep(700);
  await page.keyboard.up('ArrowDown');
  if ((await dialogue()).open) await readDialogue();
  p = await player();
  check('Cannot slip past the ranger', p.y === 34, `(${p.x},${p.y})`);
  await walkTo(16, 34);
  await expectBlocked('Fence beside the gate blocks', 'down');
  const route = await bfs({ x: 17, y: 38 });
  check('No walkable route into the tall grass', route === null);
}

// --- Map boundary (debug teleport behind the gate) ------------------------------------
{
  await api('warp', 'town', 17, 45, 'down');
  await sleep(700);
  await waitIdle();
  await expectBlocked('Bottom map boundary blocks', 'down');
  await page.screenshot({ path: `${OUT}/t06-tallgrass.png` });
  await api('warp', 'town', 17, 33, 'up');
  await sleep(700);
}

// (Lab door checks moved to scripts/playtest-phase2.mjs: the lab is open now.)

// --- Blue house: male rival's mother and younger brother (inside) ------------------
await enterDoor(12, 16, 'blue_house');
{
  const d = await talkTo(npcPos('rival_boy_mom'), 'rival boy mom');
  check("Male rival's mother dialogue", same(d.lines, ["My son went to the Professor's lab to choose his first creature.", "I wonder what he'll choose..."]), JSON.stringify(d));
  const b = await talkTo(npcPos('rival_boy_brother'), 'Tobi');
  check('Younger brother is inside his house', true);
  check('Younger brother dialogue', same(b.lines, ["One day I'll be older and I'll get to choose my own starter!", "I'm definitely picking the Water-type!"]), JSON.stringify(b));
  await page.screenshot({ path: `${OUT}/t04-brother.png` });
}
await exitHouse(12, 17);
{
  const outside = (await api('npcs')).some((n) => n.id === 'rival_boy_brother');
  check('Younger brother no longer wanders outside', !outside);
}

// --- Pink house (female rival's family when the player is a boy) -----------------------
await enterDoor(23, 16, 'pink_house_1f');
{
  const d = await talkTo(npcPos('rival_girl_mom'), 'rival girl mom');
  check("Female rival's mother dialogue (pink house, boy)", same(d.lines, WREN), JSON.stringify(d));
  await page.screenshot({ path: `${OUT}/t10-rival-girl-house.png` });
}
await useStairs('pink_house_2f');
{
  const notes = await talkTo(fixed(8, 7), 'rival notes');
  check("Female rival's upstairs room", notes.lines[0] === 'A notebook full of creature sketches.', JSON.stringify(notes.lines));
}
await useStairs('pink_house_1f');
await exitHouse(23, 17);

// --- Elders' house + their sleeping partner ----------------------------------------------
await enterDoor(24, 25, 'elder_house');
{
  const d = await talkTo(npcPos('old_man'), 'old man');
  check('Old man dialogue', same(d.lines, ['I used to be quite the trainer when I was young.', 'These days, my Charizard and I just need a little rest.']), JSON.stringify(d));
  const w = await talkTo(npcPos('old_woman'), 'old woman');
  check('Old woman dialogue (no starter yet)', same(w.lines, ['So, what starter did you pick?', 'Oh...', "You haven't picked one yet.", "Choose the one you think you'll like the most."]), JSON.stringify(w));
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__wildbound.dialogue().open);
  await sleep(700);
  await page.screenshot({ path: `${OUT}/t11-elder-dialogue.png` });
  await readDialogue();
  const d2 = await talkTo(npcPos('old_man'), 'old man again');
  check('Gender-aware line for boy', d2.lines[0].includes('young man'), d2.lines[0]);
}
await exitHouse(24, 26);
{
  const c = await talkTo(fixed(27, 24), 'Charizard');
  check('Charizard sleeps outside the elders\' house', c.lines[0] === 'Charizard is snoozing in the warm sun.', JSON.stringify(c.lines));
  await page.screenshot({ path: `${OUT}/t13-charizard.png` });
  const p = await player();
  const dir = Object.entries(DIRS).find(([, [dx, dy]]) => {
    const tx = p.x + dx;
    const ty = p.y + dy;
    return tx >= 27 && tx <= 28 && ty >= 24 && ty <= 25;
  })[0];
  await expectBlocked('Charizard blocks movement', dir);
}

const boyErrors = [...errors];
check('No console/page errors (boy run)', boyErrors.length === 0, boyErrors.join(' | '));

// --- Girl run: home is the pink house; the Wrens live in the red one ------------------------
errors.length = 0;
await boot('girl');
await page.screenshot({ path: `${OUT}/t12-start-girl.png` });
{
  const p = await player();
  check('girl starts in her bedroom upstairs in the pink house', (await mapId()) === 'pink_house_2f' && p.x === 2 && p.y === 4, `${await mapId()} (${p.x},${p.y})`);
}
await useStairs('pink_house_1f');
{
  const d = await talkTo(npcPos('mom'), 'Mom');
  check('Mom lives in the pink house for a girl', d.speaker === 'Mom' && same(d.lines, MOM_FIRST), JSON.stringify(d));
}
await exitHouse(23, 17);
await enterDoor(6, 16, 'red_house_1f');
{
  const d = await talkTo(npcPos('rival_girl_mom'), 'rival girl mom');
  check("Z's family (son, for a girl player) lives in the red house", same(d.lines, ["My son went to the Professor's lab to choose his first creature.", "He's been waiting for this day forever!"]), JSON.stringify(d));
}
await exitHouse(6, 17);
await enterDoor(24, 25, 'elder_house');
{
  await talkTo(npcPos('old_man'), 'old man');
  const d2 = await talkTo(npcPos('old_man'), 'old man again');
  check('Gender-aware line for girl', d2.lines[0].includes('young lady'), d2.lines[0]);
}
check('No console/page errors (girl run)', errors.length === 0, errors.join(' | '));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
