// Shared helpers for browser-driven playtests (real keyboard input).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

export const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });

export const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
export const WASD = { up: 'w', down: 's', left: 'a', right: 'd' };
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const SIZES = {
  town: [36, 46], red_house_1f: [10, 8], red_house_2f: [10, 8], pink_house_1f: [10, 8], pink_house_2f: [10, 8],
  blue_house: [10, 8], elder_house: [10, 8], lab: [14, 11],
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function createHarness({ width = 1280, height = 800 } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const results = [];

  const h = {
    browser, page, errors, results,
    check(name, ok, detail = '') {
      results.push({ name, ok, detail });
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
      return ok;
    },
    api: (fn, ...args) => page.evaluate(([f, a]) => window.__wildbound[f](...a), [fn, args]),
    player: () => h.api('player'),
    state: () => h.api('state'),
    dialogue: () => h.api('dialogue'),
    mapId: async () => (await h.api('state')).player.currentMap,
    shot: (name) => page.screenshot({ path: `${OUT}/${name}.png` }),

    async boot(gender) {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('text=START GAME');
      await page.click('text=START GAME');
      await page.waitForSelector('text=Choose your character');
      await page.click(`text=${gender.toUpperCase()}`);
      await page.waitForFunction(() => window.__wildbound?.ready());
      await sleep(500);
    },

    async waitIdle(timeout = 6000) {
      await page.waitForFunction(
        () => window.__wildbound?.ready() && !window.__wildbound.player().moving && !window.__wildbound.cutscene(),
        null,
        { timeout },
      );
    },

    /** Press a direction until the player starts moving (or 450ms passes). */
    async step(dir, keys = KEY) {
      const before = await h.player();
      await page.keyboard.down(keys[dir]);
      const t0 = Date.now();
      while (Date.now() - t0 < 450) {
        const p = await h.player().catch(() => null);
        if (!p || p.moving || p.x !== before.x || p.y !== before.y) break;
        await sleep(8);
      }
      await page.keyboard.up(keys[dir]);
    },

    async face(dir) {
      const p = await h.player();
      if (p.facing === dir) return;
      await page.keyboard.down(KEY[dir]);
      await sleep(35);
      await page.keyboard.up(KEY[dir]);
      await sleep(60);
    },

    async bfs(goal) {
      const map = await h.mapId();
      const [W, H] = SIZES[map];
      const start = await h.player();
      const free = await page.evaluate(([W, H]) => {
        const out = {};
        for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) out[`${x},${y}`] = window.__wildbound.free(x, y);
        return out;
      }, [W, H]);
      const key = (x, y) => `${x},${y}`;
      const prev = new Map([[key(start.x, start.y), null]]);
      const q = [[start.x, start.y]];
      while (q.length) {
        const [x, y] = q.shift();
        if (x === goal.x && y === goal.y) break;
        for (const [d, [dx, dy]] of Object.entries(DIRS)) {
          const k = key(x + dx, y + dy);
          if (prev.has(k) || !free[k]) continue;
          prev.set(k, { from: key(x, y), dir: d });
          q.push([x + dx, y + dy]);
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
    },

    /** Walk with real key presses, re-planning if an NPC gets in the way. */
    async walkTo(x, y, keys = KEY) {
      for (let attempt = 0; attempt < 6; attempt++) {
        await h.waitIdle();
        const p = await h.player();
        if (p.x === x && p.y === y) return true;
        const path = await h.bfs({ x, y });
        if (!path) {
          await sleep(400);
          continue;
        }
        let cur = { x: p.x, y: p.y };
        let ok = true;
        for (const dir of path) {
          const startMap = await h.mapId();
          await h.step(dir, keys);
          await h.waitIdle().catch(() => {});
          if ((await h.mapId()) !== startMap) return true;
          const now = await h.player();
          const want = { x: cur.x + DIRS[dir][0], y: cur.y + DIRS[dir][1] };
          if (now.x !== want.x || now.y !== want.y) {
            ok = false;
            break;
          }
          cur = want;
        }
        const end = await h.player();
        if (ok && end.x === x && end.y === y) return true;
      }
      return false;
    },

    /**
     * Advance any dialogue until `until()` is true (or the box closes when no
     * predicate is given). Returns the transcript [{speaker, text}].
     */
    async talkThrough(until, { maxMs = 60000 } = {}) {
      const transcript = [];
      let lastKey = -1;
      const t0 = Date.now();
      while (Date.now() - t0 < maxMs) {
        if (until && (await until())) break;
        const d = await h.dialogue();
        if (!d.open) {
          if (!until) break;
          await sleep(80);
          continue;
        }
        if (!d.lineDone) {
          await page.keyboard.press('Space'); // skip typewriter
          await sleep(40);
          continue;
        }
        if (d.lineKey !== lastKey) {
          transcript.push({ speaker: d.speaker ?? null, text: d.text });
          lastKey = d.lineKey;
        }
        await page.keyboard.press('e');
        await sleep(90);
      }
      return transcript;
    },

    async talkTo(targetFn, label) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const t = await targetFn();
        const options = [];
        const p0 = await h.player();
        for (const [d, [dx, dy]] of Object.entries(DIRS)) {
          const sx = t.x - dx;
          const sy = t.y - dy;
          if (p0.x === sx && p0.y === sy) options.unshift({ x: sx, y: sy, dir: d });
          else if (await h.api('free', sx, sy)) options.push({ x: sx, y: sy, dir: d });
        }
        for (const o of options) {
          if (!(await h.walkTo(o.x, o.y))) continue;
          await h.face(o.dir);
          const t2 = await targetFn();
          const p = await h.player();
          const [dx, dy] = DIRS[p.facing];
          if (p.x + dx !== t2.x || p.y + dy !== t2.y) break;
          await page.keyboard.press('e');
          await page.waitForFunction(() => window.__wildbound.dialogue().open, null, { timeout: 2500 });
          const lines = await h.talkThrough();
          return { speaker: lines[0]?.speaker, lines: lines.map((l) => l.text) };
        }
      }
      throw new Error(`Could not reach ${label}`);
    },

    npcPos: (id) => async () => (await h.api('npcs')).find((n) => n.id === id),
    fixed: (x, y) => async () => ({ x, y }),

    async waitMap(m) {
      await page.waitForFunction((mm) => window.__wildbound.state().player.currentMap === mm, m, { timeout: 4000 });
      await sleep(450);
      await h.waitIdle();
    },

    async enterDoor(doorX, doorY, expectedMap) {
      await h.walkTo(doorX, doorY + 1);
      await h.step('up');
      await h.waitMap(expectedMap);
    },

    async exitInterior(matX, matY) {
      await h.walkTo(matX, matY);
      await h.step('down');
      await h.waitMap('town');
    },

    async useStairs(expectedMap) {
      await h.walkTo(9, 2);
      await h.waitMap(expectedMap);
    },

    async finish() {
      const failed = results.filter((r) => !r.ok);
      console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
      await browser.close();
      return failed.length;
    },
  };
  return h;
}
