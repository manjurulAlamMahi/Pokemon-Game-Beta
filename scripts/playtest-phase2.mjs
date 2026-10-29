// Phase 2 playtest: Professor scene, starter selection, reveal, rival/Z picks,
// group moment, follower, and all updated dialogue. Real keyboard input.
// Usage: node scripts/playtest-phase2.mjs   (dev server must be running)
import { createHarness, DIRS, same, sleep } from './lib.mjs';

const h = await createHarness();
const { page, check } = h;

const NAMES = { bulbasaur: 'Bulbasaur', charmander: 'Charmander', squirtle: 'Squirtle' };
const EXPECTED = {
  charmander: { rival: 'squirtle', opposite: 'bulbasaur' },
  squirtle: { rival: 'bulbasaur', opposite: 'charmander' },
  bulbasaur: { rival: 'charmander', opposite: 'squirtle' },
};
const BALL_X = { bulbasaur: 6, charmander: 7, squirtle: 8 };
const ORDER = ['bulbasaur', 'charmander', 'squirtle'];

const INTRO = [
  ['Professor Max', 'Welcome, X!'],
  ['Professor Max', 'Y and Z have been waiting for you to arrive.'],
  ['Professor Max', "Now that you're all here..."],
  ['Professor Max', "Let's begin choosing your first Pokémon."],
  ['Y', "I'll choose later."],
  ['Y', 'Let X pick first.'],
  ['Z', "That's fine with me."],
  ['Z', 'X can choose first.'],
  ['Z', 'We can wait.'],
  ['Professor Max', 'Before you are three Poké Balls.'],
  ['Professor Max', 'Inside each one is a Pokémon waiting for its new Trainer.'],
];
const DREAMS = [
  ['Professor Max', 'So...'],
  ['Professor Max', 'What are your dreams?'],
  ['X', "I'll become the best Pokémon Trainer in the world."],
  ['Y', 'Ha!'],
  ['Y', "We'll see about that."],
  ['Y', "I'll become the Pokémon Champion of the world."],
  ['Z', 'I just want to explore the world.'],
  ['Z', "I haven't decided what my dream is yet."],
  ['Professor Max', 'Your journey is about to begin.'],
  ['Professor Max', 'You should visit the market in the next town.'],
  ['Professor Max', 'I have a friend there.'],
  ['Professor Max', 'Tell him I sent you.'],
  ['Professor Max', 'He will give you a special gift.'],
];

const containsSeq = (transcript, expected) => {
  const flat = transcript.map((l) => `${l.speaker ?? '-'}|${l.text}`);
  const want = expected.map(([s, t]) => `${s}|${t}`);
  const i = flat.indexOf(want[0]);
  return i >= 0 && same(flat.slice(i, i + want.length), want);
};

async function goToLabFromTown() {
  await h.walkTo(17, 8);
  await h.face('up');
  await h.step('up');
  await page.waitForFunction(() => window.__wildbound.state().player.currentMap === 'lab', null, { timeout: 4000 });
  await sleep(500);
}

/** Plays the lab scene with real input. Previews every capsule when `previewAll`. */
async function labScene(gender, pick, { previewAll = false, shots = false } = {}) {
  const tag = `${gender}-${pick}`;
  await page.waitForFunction(() => window.__wildbound.dialogue().open, null, { timeout: 8000 });
  const zSprite = gender === 'boy' ? 'z_girl' : 'z_boy';
  const npcIds = (await h.api('npcs')).map((n) => n.id);
  check(`[${tag}] Professor Max, Y and Z are in the lab`, ['professor_max', 'rival_y', zSprite].every((id) => npcIds.includes(id)), npcIds.join(','));
  if (shots) await h.shot(`P2-${tag}-01-welcome`);
  const intro = await h.talkThrough(async () => !(await h.api('cutscene')));
  check(`[${tag}] Intro dialogue (Professor, Y, Z)`, containsSeq(intro, INTRO), JSON.stringify(intro.map((l) => l.text)));
  check(`[${tag}] professorMet set`, (await h.state()).story.professorMet === true);

  if (previewAll) {
    // Leaving before choosing is blocked by the Professor.
    await h.walkTo(7, 10);
    await h.step('down');
    await sleep(300);
    const guard = await h.talkThrough();
    await h.waitIdle();
    check(`[${tag}] Cannot leave the lab before choosing`, (await h.mapId()) === 'lab' && guard.some((l) => l.text.startsWith('Wait, X!')), JSON.stringify(guard));

    for (const id of ORDER) {
      await h.walkTo(BALL_X[id], 5);
      await h.face('up');
      await sleep(350);
      check(`[${tag}] Hologram preview of ${id} when facing its capsule`, (await h.api('preview')) === id);
      if (shots) await h.shot(`P2-${tag}-02-hologram-${id}`);
      await page.keyboard.press('e');
      await page.waitForFunction(() => window.__wildbound.ui().starterPanel !== null, null, { timeout: 2000 });
      const ui = await h.api('ui');
      const text = await page.textContent('.starter-panel');
      check(`[${tag}] Preview panel shows ${id.toUpperCase()}`, ui.starterPanel.focus === id && text.includes(id.toUpperCase()) && text.includes('CHOOSE'), ui.starterPanel.focus);
      if (shots) await h.shot(`P2-${tag}-03-panel-${id}`);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => window.__wildbound.ui().starterPanel === null, null, { timeout: 2000 });
      await sleep(250);
    }
    check(`[${tag}] Backing out keeps the starter unchosen`, (await h.state()).story.starterChosen === false);
  }

  // Choose: open the panel at the first capsule and browse with the arrow keys.
  await h.walkTo(BALL_X.bulbasaur, 5);
  await h.face('up');
  await sleep(250);
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__wildbound.ui().starterPanel !== null, null, { timeout: 2000 });
  for (let i = 0; i < ORDER.indexOf(pick); i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(120);
  }
  check(`[${tag}] Browsing with arrows focuses ${pick}`, (await h.api('ui')).starterPanel.focus === pick);
  await page.keyboard.press('Enter');

  const toReveal = await h.talkThrough(async () => (await h.api('ui')).reveal !== null);
  check(`[${tag}] Professor confirms the choice`, toReveal.some((l) => l.text.includes(`you want ${pick.toUpperCase()}`)), JSON.stringify(toReveal.map((l) => l.text)));
  const mineOnField = (await h.api('npcs')).some((n) => n.id === `creature_${pick}`);
  check(`[${tag}] Capsule opened and ${pick} appeared in the lab`, mineOnField);
  await sleep(1200);
  if (shots) await h.shot(`P2-${tag}-04-reveal`);
  await sleep(1600);
  const banner = await page.textContent('.reveal').catch(() => '');
  check(`[${tag}] Reveal presentation names ${pick.toUpperCase()}`, banner.includes(`X received ${pick.toUpperCase()}!`), banner);
  if (shots) await h.shot(`P2-${tag}-05-reveal-banner`);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__wildbound.ui().reveal === null, null, { timeout: 3000 });

  const s = (await h.state()).story;
  const exp = EXPECTED[pick];
  check(`[${tag}] State: player=${pick}, rival=${exp.rival}, Z=${exp.opposite}`,
    s.playerStarter === pick && s.rivalStarter === exp.rival && s.oppositeStarter === exp.opposite && s.starterChosen === true,
    JSON.stringify(s));

  // Play the rest, checking that all three creatures share the scene.
  const rest = [];
  let allThree = false;
  let lastKey = -1;
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const d = await h.dialogue();
    if (!(await h.api('cutscene')) && !d.open) break;
    if (d.open && !d.lineDone) {
      await page.keyboard.press('Space');
      await sleep(40);
      continue;
    }
    if (d.open && d.lineKey !== lastKey) {
      lastKey = d.lineKey;
      rest.push({ speaker: d.speaker ?? null, text: d.text });
      if (d.text === 'So...') {
        const ids = (await h.api('npcs')).map((n) => n.id);
        allThree = ORDER.every((id) => ids.includes(`creature_${id}`)) && ids.includes('rival_y') && ids.includes(zSprite);
        if (shots) await h.shot(`P2-${tag}-06-group`);
      }
    }
    if (d.open) await page.keyboard.press('e');
    await sleep(90);
  }
  check(`[${tag}] Rival announces taking ${exp.rival.toUpperCase()}`, rest.some((l) => l.speaker === 'Y' && l.text.includes(exp.rival.toUpperCase())));
  check(`[${tag}] Z greets ${NAMES[exp.opposite]}`, rest.some((l) => l.speaker === 'Z' && l.text.includes(NAMES[exp.opposite])));
  check(`[${tag}] All three trainers and all three Pokémon together on screen`, allThree);
  check(`[${tag}] Dreams + journey dialogue`, containsSeq(rest, DREAMS), JSON.stringify(rest.map((l) => l.text)));
  const after = await h.state();
  check(`[${tag}] journeyStarted + objective set`, after.story.journeyStarted && after.story.objective === 'Visit the market in the next town.');
  const leftIds = (await h.api('npcs')).map((n) => n.id);
  check(`[${tag}] Y and Z left the lab`, !leftIds.includes('rival_y') && !leftIds.includes(zSprite), leftIds.join(','));
  const f = await h.api('follower');
  check(`[${tag}] ${pick} is now following the player`, f && f.starter === pick && f.visible);
  if (shots) await h.shot(`P2-${tag}-07-after`);
}

/** Walks a route step by step, verifying the follower trails one tile behind. */
async function checkFollowing(tag, dirs) {
  let ok = true;
  let detail = '';
  let prev = await h.player();
  for (const d of dirs) {
    await h.step(d);
    await h.waitIdle();
    const p = await h.player();
    const f = await h.api('follower');
    if (p.x === prev.x && p.y === prev.y) continue; // blocked step: follower must stay put
    const walkable = await h.api('walkable', f.x, f.y);
    const trailing = f.x === prev.x && f.y === prev.y;
    if (!trailing || !walkable || (f.x === p.x && f.y === p.y)) {
      ok = false;
      detail = `player (${p.x},${p.y}) prev (${prev.x},${prev.y}) follower (${f.x},${f.y}) walkable=${walkable}`;
      break;
    }
    prev = p;
  }
  check(`[${tag}] Follower trails one tile behind, never overlapping, always on walkable ground`, ok, detail);
}

// =============================================================================
// Run A: Boy + Charmander — the complete flow.
// =============================================================================
await h.boot('boy');
check('[boy] Game starts with boy selected', (await h.state()).player.gender === 'boy');
await h.useStairs('red_house_1f');
await h.exitInterior(4, 7);
check('[boy] Reached town from home', (await h.mapId()) === 'town');
await goToLabFromTown();
check('[boy] The lab can be entered now', (await h.mapId()) === 'lab');
await labScene('boy', 'charmander', { previewAll: true, shots: true });

// Leave the lab and test the follower in town.
await h.exitInterior(7, 10);
await sleep(200);
let f = await h.api('follower');
check('[boy-charmander] Follower comes along out of the lab', f && f.starter === 'charmander');
await checkFollowing('boy-charmander', ['down', 'down', 'left', 'left', 'down', 'down', 'right', 'right', 'right', 'down', 'down', 'up', 'up']);
await h.shot('P2-boy-charmander-08-follow-town');
// Walk into a house wall and the pool: follower must not end up inside anything.
await h.walkTo(5, 17);
await h.step('up');
await h.walkTo(8, 21);
for (let i = 0; i < 3; i++) await h.step('down');
await h.waitIdle();
f = await h.api('follower');
check('[boy-charmander] Follower stays on walkable ground next to obstacles', await h.api('walkable', f.x, f.y), JSON.stringify(f));
await h.shot('P2-boy-charmander-09-follow-pool');
// Stop: the follower stops too.
await sleep(600);
const f1 = await h.api('follower');
await sleep(400);
const f2 = await h.api('follower');
check('[boy-charmander] Follower stops when the player stops', !f2.moving && f1.x === f2.x && f1.y === f2.y);
// Talk to the follower.
{
  const p = await h.player();
  const fl = await h.api('follower');
  const dir = Object.entries(DIRS).find(([, [dx, dy]]) => p.x + dx === fl.x && p.y + dy === fl.y)?.[0];
  if (dir) {
    await h.face(dir);
    await page.keyboard.press('e');
    await page.waitForFunction(() => window.__wildbound.dialogue().open, null, { timeout: 2000 });
    await sleep(300);
    await h.shot('P2-boy-charmander-09b-partner-heart');
    const lines = await h.talkThrough();
    check('[boy-charmander] Talking to the partner works', lines[0]?.text.startsWith('Charmander looks up at you'), JSON.stringify(lines));
  }
}

// Mom (red house).
await h.enterDoor(6, 16, 'red_house_1f');
check('[boy-charmander] Follower appears indoors too', !!(await h.api('follower')));
{
  const d = await h.talkTo(h.npcPos('mom'), 'Mom');
  check('[boy-charmander] Mom reacts to Charmander', same(d.lines, ['Oh!', 'You chose Charmander? What a wonderful Pokémon!', 'Nice choice.', 'I hope you have an amazing journey.']), JSON.stringify(d.lines));
  await h.shot('P2-boy-charmander-10-mom');
}
await h.exitInterior(4, 7);

// Rival's mother (blue house).
await h.enterDoor(12, 16, 'blue_house');
{
  const d = await h.talkTo(h.npcPos('rival_boy_mom'), 'rival mom');
  check("[boy-charmander] Rival's mother: father is a Gym Leader", same(d.lines, [
    "He's already gone ahead.",
    'He wants to become better than his father.',
    'His father is the Gym Leader of Thornvale City.',
    'He wants to prove that he can become even better than his father.',
  ]), JSON.stringify(d.lines));
}
await h.exitInterior(4, 7);

// Z's house (pink for a boy player): mother, upstairs Z with Bulbasaur.
await h.enterDoor(23, 16, 'pink_house_1f');
{
  const d = await h.talkTo(h.npcPos('rival_girl_mom'), 'Z mom');
  check("[boy-charmander] Z's mother: 'My daughter is upstairs.'", d.lines[0] === 'My daughter is upstairs.', JSON.stringify(d.lines));
}
await h.useStairs('pink_house_2f');
{
  const npcs = await h.api('npcs');
  const z = npcs.find((n) => n.id === 'z_girl');
  const mon = npcs.find((n) => n.id === 'zcreature_bulbasaur');
  check("[boy-charmander] Z (girl) is upstairs with her Bulbasaur beside her", !!z && !!mon && mon.x === z.x + 1 && mon.y === z.y, JSON.stringify(npcs));
  await h.shot('P2-boy-charmander-11-z-room');
  const d = await h.talkTo(h.npcPos('z_girl'), 'Z');
  check('[boy-charmander] Z talks about seeing a real Bulbasaur', same(d.lines, ['Seeing a real Bulbasaur this close...', "It's my first time.", 'I want to learn more about Pokémon like this.']), JSON.stringify(d.lines));
}
await h.useStairs('pink_house_1f');
await h.exitInterior(4, 7);

// Old woman.
await h.enterDoor(24, 25, 'elder_house');
{
  const d = await h.talkTo(h.npcPos('old_woman'), 'old woman');
  check('[boy-charmander] Old woman: final-evolution gift promise', same(d.lines, [
    'Oh!', 'You chose Charmander!', "That's a nice choice.", 'I hope you have a wonderful journey.',
    'When your Pokémon reaches its final evolution...', 'Come back and see me.', "I'll have a special gift waiting for you.",
  ]), JSON.stringify(d.lines));
}
await h.exitInterior(4, 7);

// Other NPCs still work; wild area still blocked.
{
  const d = await h.talkTo(h.npcPos('pool_kid'), 'Pip');
  check('[boy-charmander] Pool NPC unchanged', same(d.lines, ['If I had a fishing rod...', "I'd catch a Magikarp from this pool!"]));
  const r = await h.talkTo(h.npcPos('hiker'), 'Rowan');
  check('[boy-charmander] Wild-creatures NPC unchanged', r.lines[0] === 'The outside world is full of wild creatures.');
  await h.walkTo(17, 34);
  await h.face('down');
  await sleep(200);
  // Facing the ranger may already have bumped into them (auto-talk); otherwise press E.
  if (!(await h.dialogue()).open) await page.keyboard.press('e');
  await page.waitForFunction(() => window.__wildbound.dialogue().open, null, { timeout: 2000 });
  const g = await h.talkThrough();
  check('[boy-charmander] Ranger acknowledges the starter', same(g.map((l) => l.text), ["You're back already?", "Looks like you've chosen your first Pokémon.", "But the road ahead isn't ready for you yet."]), JSON.stringify(g));
  await h.shot('P2-boy-charmander-12-ranger');
  await page.keyboard.down('ArrowDown');
  await sleep(700);
  await page.keyboard.up('ArrowDown');
  if ((await h.dialogue()).open) await h.talkThrough();
  const p = await h.player();
  check('[boy-charmander] Still cannot pass the ranger', p.y === 34, `(${p.x},${p.y})`);
  check('[boy-charmander] No walkable route into the tall grass', (await h.bfs({ x: 17, y: 38 })) === null);
}
check('[boy-charmander] No console/page errors', h.errors.length === 0, h.errors.join(' | '));

// =============================================================================
// Run B: Boy + Squirtle — starter logic and reveal.
// =============================================================================
h.errors.length = 0;
await h.boot('boy');
await h.api('warp', 'town', 17, 9, 'up');
await h.waitMap('town');
await goToLabFromTown();
await labScene('boy', 'squirtle');
check('[boy-squirtle] No console/page errors', h.errors.length === 0, h.errors.join(' | '));

// =============================================================================
// Run C: Girl + Bulbasaur — Z is a boy, lives in the red house.
// =============================================================================
h.errors.length = 0;
await h.boot('girl');
await h.useStairs('pink_house_1f');
await h.exitInterior(4, 7);
await goToLabFromTown();
await labScene('girl', 'bulbasaur', { shots: true });
await h.exitInterior(7, 10);
await checkFollowing('girl-bulbasaur', ['down', 'down', 'down', 'right', 'right', 'down', 'down', 'left', 'left', 'left', 'left']);
await h.enterDoor(23, 16, 'pink_house_1f');
{
  const d = await h.talkTo(h.npcPos('mom'), 'Mom');
  check('[girl-bulbasaur] Mom reacts to Bulbasaur', d.lines[1] === 'You chose Bulbasaur? What a wonderful Pokémon!', JSON.stringify(d.lines));
}
await h.exitInterior(4, 7);
await h.enterDoor(6, 16, 'red_house_1f');
{
  const d = await h.talkTo(h.npcPos('rival_girl_mom'), 'Z mom');
  check("[girl-bulbasaur] Z's mother: 'My son is upstairs.'", d.lines[0] === 'My son is upstairs.', JSON.stringify(d.lines));
}
await h.useStairs('red_house_2f');
{
  const npcs = await h.api('npcs');
  const z = npcs.find((n) => n.id === 'z_boy');
  const mon = npcs.find((n) => n.id === 'zcreature_squirtle');
  check('[girl-bulbasaur] Z (boy) is upstairs with his Squirtle', !!z && !!mon, JSON.stringify(npcs));
  await h.shot('P2-girl-bulbasaur-11-z-room');
  const d = await h.talkTo(h.npcPos('z_boy'), 'Z');
  check('[girl-bulbasaur] Z talks about seeing a real Squirtle', d.lines[0] === 'Seeing a real Squirtle this close...', JSON.stringify(d.lines));
}
check('[girl-bulbasaur] No console/page errors', h.errors.length === 0, h.errors.join(' | '));

process.exit(await h.finish());
