// Original overworld trainer sprites in the spirit of GBA-era handheld RPGs:
// 16x24 frames, three-tone shading per material, colour-matched outlines.
// One base body + hair / headwear / bag overlays + palette swaps = every NPC.
//
// Sheet layout: for dir in [down, up, left]: [idle, walkA, walkB, breathe]
//   frame = dir * 4 + n. Right-facing frames flip the left frames at runtime.

import type { CharacterLook, HairStyle } from '../../types';
import { PixelCanvas, shade } from './pixel';

export const CHAR_W = 16;
export const CHAR_H = 24;
export const FRAMES_PER_DIR = 4;

type Dir = 'down' | 'up' | 'left';
const DIRS: Dir[] = ['down', 'up', 'left'];

// Palette keys:
//  h/H/k hair (base/shade/deep)   s/S skin   e eye   w white   m mouth
//  c/C shirt   j/J trim/collar    p/P pants  f/F shoes (top/sole)
//  a/A/x headwear (base/shade/brim)   b/B bag

// --- Heads (13 rows: 2 rows of headroom for buns and spikes) ----------------

const HEAD: Record<Dir, string[]> = {
  down: [
    '................',
    '................',
    '......hhhh......',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhHhhhhHhh...',
    '...HhHhhhhHhH...',
    '...HsshHHhssH...',
    '...HsessssesH...',
    '...ssessssess...',
    '...SsssmmsssS...',
    '....SSssssSS....',
  ],
  up: [
    '................',
    '................',
    '......hhhh......',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hHhhhhhhHh...',
    '...HhHhhhhHhH...',
    '...sHHHhhHHHs...',
    '...SkHHHHHHkS...',
    '....SSSSSSSS....',
  ],
  left: [
    '................',
    '................',
    '.......hhhh.....',
    '.....hhhhhhh....',
    '....hhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhhhhhhhhh...',
    '...hhhhhhhHhh...',
    '..sshhhhhHHhh...',
    '..ssesshhHhhh...',
    '..ssesssSHhh....',
    '...ssmsssSHh....',
    '....SSSSSS......',
  ],
};

// Overlays: '.' keeps the base pixel, '-' erases it. Rows past 12 fall over
// the body (long hair, beards).
const HAIR: Record<HairStyle, Partial<Record<Dir, string[]>>> = {
  short: {},
  spiky: {
    down: ['.....h....h.....', '....hh.hh.hh....', '....hhhhhhhh....'],
    up: ['.....h....h.....', '....hh.hh.hh....', '....hhhhhhhh....'],
    left: ['.......h..h.h...', '......hh.hh.hh..', '......hhhhhhhh..'],
  },
  long: {
    down: [
      '', '', '', '', '', '', '',
      '..h..........h..',
      '..hH........Hh..',
      '..hH........Hh..',
      '..hH........Hh..',
      '..hH........Hh..',
      '..hH........Hh..',
      '..hh........hh..',
      '..Hh........hH..',
      '...H........H...',
    ],
    up: [
      '', '', '', '', '', '', '', '', '', '',
      '...hhhhhhhhhh...',
      '...hhhhhhhhhh...',
      '...hhhhhhhhhh...',
      '...hHhhhhhhHh...',
      '...HhhhhhhhhH...',
      '....HhhhhhhH....',
      '.....HHHHHH.....',
    ],
    left: [
      '', '', '', '', '', '', '', '', '', '',
      '..........hhh...',
      '.........Hhhh...',
      '........hhhhh...',
      '........hhhhH...',
      '.........hhhH...',
      '..........hH....',
    ],
  },
  bun: {
    down: ['......hhhh......', '.....hHHHHh.....'],
    up: ['......hhhh......', '.....hhhhhh.....'],
    left: ['..........hhh...', '.........hHHhh..'],
  },
  bald: {
    down: [
      '', '',
      '......SSSS......',
      '....SssssssS....',
      '...Ssssssssss...',
      '...hssssssssh...',
      '...hssssssssh...',
      '...hshhsshhsh...',
      '...hssssssssh...',
    ],
    up: [
      '', '',
      '......SSSS......',
      '....SssssssS....',
      '...Ssssssssss...',
      '...ssssssssss...',
      '...Ssssssssss...',
      '...hSssssssSh...',
      '...hhhhhhhhhh...',
    ],
    left: [
      '', '',
      '.......SSSS.....',
      '.....Sssssss....',
      '....sssssssss...',
      '...ssssssssss...',
      '...sssssssshh...',
      '...shhssssshh...',
      '..sssssssHhhh...',
    ],
  },
};

const HATS: Record<'cap' | 'bucket', Record<Dir, string[]>> = {
  cap: {
    down: [
      '', '',
      '......aaaa......',
      '....aaaaaaaa....',
      '...aaaawwaaaa...',
      '...aaaaaaaaaa...',
      '..xxxxxxxxxxxx..',
      '...HhhhhhhhhH...',
    ],
    up: [
      '', '',
      '......aaaa......',
      '....aaaaaaaa....',
      '...aaaaaaaaaa...',
      '...aaaaaaaaaa...',
      '...AAAAAAAAAA...',
      '...hhhhAAhhhh...',
    ],
    left: [
      '', '',
      '.......aaaa.....',
      '.....aaaaaaa....',
      '....aawaaaaaa...',
      '...aaaaaaaaaa...',
      '.xxxxxAaaaaaa...',
    ],
  },
  bucket: {
    down: [
      '', '',
      '......aaaa......',
      '....aaaaaaaa....',
      '....aaaaaaaa....',
      '...xxxxxxxxxx...',
      '..AaaaaaaaaaaA..',
      '..AAhhhhhhhhAA..',
    ],
    up: [
      '', '',
      '......aaaa......',
      '....aaaaaaaa....',
      '....aaaaaaaa....',
      '...xxxxxxxxxx...',
      '..AaaaaaaaaaaA..',
      '..AAAAAAAAAAAA..',
    ],
    left: [
      '', '',
      '.......aaaa.....',
      '......aaaaaa....',
      '.....aaaaaaaa...',
      '....xxxxxxxxx...',
      '..Aaaaaaaaaaaa..',
      '..AAAhhhhhhAAA..',
    ],
  },
};

const GLASSES: Partial<Record<Dir, string[]>> = {
  down: ['', '', '', '', '', '', '', '', '', '....geggggeg....'],
  up: ['', '', '', '', '', '', '', '', '', '...g........g...'],
  left: ['', '', '', '', '', '', '', '', '', '..geggg.........'],
};

const BEARD: Partial<Record<Dir, string[]>> = {
  down: ['', '', '', '', '', '', '', '', '', '', '', '...ShhhhhhhhS...', '....hhhhhhhh....', '.....hHHHHh.....'],
  left: ['', '', '', '', '', '', '', '', '', '', '', '...hhhhhSSHh....', '....hhhhh.......'],
};

// --- Bodies (10 rows) ---------------------------------------------------------

const BODY = {
  front: [
    '......jSSj......',
    '....cjjccjjc....',
    '...CcccjjcccC...',
    '...CcccjjcccC...',
    '...sCccjjccCs...',
    '....JJJJJJJJ....',
    '....pppPPppp....',
    '....ppP..Ppp....',
    '....ffF..Fff....',
    '....FFF..FFF....',
  ],
  frontWalk: [
    '......jSSj......',
    '....cjjccjjc....',
    '...CcccjjcccC...',
    '...CcccjjcccC...',
    '...sCccjjccC....',
    '....JJJJJJJJs...',
    '....pppPPppp....',
    '....ppP..Ppp....',
    '....ffF..fff....',
    '....FFF.........',
  ],
  back: [
    '......cSSc......',
    '....cccccccc....',
    '...CccccccccC...',
    '...CccccccccC...',
    '...sCccccccCs...',
    '....JJJJJJJJ....',
    '....pppPPppp....',
    '....ppP..Ppp....',
    '....ffF..Fff....',
    '....FFF..FFF....',
  ],
  backWalk: [
    '......cSSc......',
    '....cccccccc....',
    '...CccccccccC...',
    '...CccccccccC...',
    '...sCccccccC....',
    '....JJJJJJJJs...',
    '....pppPPppp....',
    '....ppP..Ppp....',
    '....ffF..fff....',
    '....FFF.........',
  ],
  side: [
    '.......jSj......',
    '......cjjcc.....',
    '.....cccCcc.....',
    '.....ccCCcc.....',
    '.....ccsCcc.....',
    '.....JJJJJJ.....',
    '......pppp......',
    '......pPPp......',
    '.....fffF.......',
    '.....FFFF.......',
  ],
  sideWalkA: [
    '.......jSj......',
    '......cjjcc.....',
    '.....cccCcc.....',
    '....sccCccc.....',
    '.....ccCccc.....',
    '.....JJJJJJ.....',
    '.....pp..pp.....',
    '....pP....Pp....',
    '...ffF....fff...',
    '...FFF....FFF...',
  ],
  sideWalkB: [
    '.......jSj......',
    '......cjjcc.....',
    '.....cccCcc.....',
    '.....cccCCc.....',
    '.....cccCcCs....',
    '.....JJJJJJ.....',
    '......pppp......',
    '.....pP.Pp......',
    '....ffF.fF......',
    '....FFF.FF......',
  ],
};

// Backpack overlays, relative to the body rows.
const BAG: Record<Dir, string[]> = {
  down: ['', '.....b....b.....', '.....b....b.....', '.....B....B.....'],
  up: ['', '.....bbbbbb.....', '....bbbbbbbb....', '....bBbbbbBb....', '....bBBBBBBb....', '.....BBBBBB.....'],
  left: ['', '..........bb....', '..........bbb...', '..........bbB...', '..........bBB...', '..........BB....'],
};

function merge(base: string[], overlay?: string[]): string[] {
  if (!overlay) return base;
  const rows = Math.max(base.length, overlay.length);
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    const b = (base[y] ?? '').padEnd(16, '.');
    const o = (overlay[y] ?? '').padEnd(16, '.');
    let row = '';
    for (let x = 0; x < 16; x++) row += o[x] === '.' ? b[x] : o[x] === '-' ? '.' : o[x];
    out.push(row);
  }
  return out;
}

function paletteFor(look: CharacterLook): Record<string, string> {
  const hat = look.hatColor ?? '#e8423f';
  const trim = look.trim ?? shade(look.shirt, 0.55);
  const bag = look.bag ?? '#e0a92c';
  return {
    h: look.hairColor,
    H: shade(look.hairColor, -0.22),
    k: shade(look.hairColor, -0.42),
    s: look.skin,
    S: shade(look.skin, -0.16),
    m: shade(look.skin, -0.32),
    e: '#2a2238',
    w: '#ffffff',
    // With a coat, the coat takes the shirt slots and the shirt peeks
    // through the open front (the trim slot).
    c: look.coat ?? look.shirt,
    C: shade(look.coat ?? look.shirt, -0.16),
    j: look.coat ? look.shirt : trim,
    g: '#3a3448',
    J: look.belt ?? shade(look.pants, -0.35),
    p: look.pants,
    P: shade(look.pants, -0.24),
    f: look.shoes,
    F: shade(look.shoes, -0.35),
    a: hat,
    A: shade(hat, -0.22),
    x: look.hatBrim ?? shade(hat, -0.45),
    b: bag,
    B: shade(bag, -0.25),
  };
}

function bodyRows(dir: Dir, frame: number): { rows: string[]; flip: boolean } {
  if (dir === 'left') {
    return { rows: frame === 1 ? BODY.sideWalkA : frame === 2 ? BODY.sideWalkB : BODY.side, flip: false };
  }
  const idle = dir === 'down' ? BODY.front : BODY.back;
  const walk = dir === 'down' ? BODY.frontWalk : BODY.backWalk;
  if (frame === 1) return { rows: walk, flip: false };
  if (frame === 2) return { rows: walk, flip: true };
  return { rows: idle, flip: false };
}

/** Builds a 12-frame character sheet canvas. */
export function buildCharacterSheet(look: CharacterLook): HTMLCanvasElement {
  const sheet = new PixelCanvas(CHAR_W * DIRS.length * FRAMES_PER_DIR, CHAR_H);
  const pal = paletteFor(look);

  DIRS.forEach((dir, d) => {
    let head = merge(HEAD[dir], HAIR[look.hair][dir]);
    if (look.glasses) head = merge(head, GLASSES[dir]);
    if (look.beard) head = merge(head, BEARD[dir]);
    if (look.hat) head = merge(head, HATS[look.hat][dir]);

    for (let f = 0; f < FRAMES_PER_DIR; f++) {
      const frame = new PixelCanvas(CHAR_W, CHAR_H);
      const { rows, flip } = bodyRows(dir, f === 3 ? 0 : f);
      // Bag overlays are symmetric front/back, so flipped walk frames stay correct.
      let body = look.bag ? merge(rows, BAG[dir]) : rows;
      // Children drop two body rows -> shorter silhouette.
      // Coats hang past the belt and over the top of the legs.
      if (look.coat) {
        body = body.map((row, i) => (i === 5 ? row.replace(/J/g, 'c') : i === 6 ? row.replace(/^(.*)p/, '$1C').replace(/p(.*)$/, 'C$1') : row));
      }
      if (look.child) body = body.filter((_, i) => i !== 2 && i !== 6);
      const bodyY = CHAR_H - 1 - body.length;
      const bounce = f === 1 || f === 2 ? -1 : 0; // head bobs mid-stride
      const breathe = f === 3 ? 1 : 0;
      const headY = bodyY - 13 + bounce + breathe;

      frame.pattern(body, pal, 0, bodyY, flip);
      frame.pattern(head, pal, 0, headY);
      frame.outline();
      sheet.blit(frame, (d * FRAMES_PER_DIR + f) * CHAR_W, 0);
    }
  });
  return sheet.canvas;
}

/** Soft oval shadow drawn under every character. */
export function buildShadow(): HTMLCanvasElement {
  const c = new PixelCanvas(12, 5);
  c.ellipse(6, 2.5, 6, 2.5, 'rgba(30, 40, 30, 0.28)');
  return c.canvas;
}

/** Speech-bubble emote ("!" or "..."). */
export function buildEmote(kind: 'exclaim' | 'dots' | 'note' | 'heart'): HTMLCanvasElement {
  const c = new PixelCanvas(14, 14);
  c.rect(1, 1, 12, 10, '#ffffff');
  c.clear(1, 1, 1, 1).clear(12, 1, 1, 1).clear(1, 10, 1, 1).clear(12, 10, 1, 1);
  c.rect(5, 11, 3, 1, '#ffffff').px(6, 12, '#ffffff');
  c.outline('#2a2433');
  if (kind === 'exclaim') {
    c.rect(6, 3, 2, 4, '#e8423f').rect(6, 8, 2, 1, '#e8423f');
  } else if (kind === 'note') {
    c.rect(8, 2, 1, 6, '#2a2433').rect(9, 2, 2, 1, '#2a2433').px(11, 3, '#2a2433');
    c.rect(5, 7, 3, 2, '#2a2433').px(4, 8, '#2a2433');
  } else if (kind === 'heart') {
    c.rect(4, 3, 2, 2, '#e8423f').rect(8, 3, 2, 2, '#e8423f').rect(3, 4, 8, 2, '#e8423f');
    c.rect(4, 6, 6, 1, '#e8423f').rect(5, 7, 4, 1, '#e8423f').rect(6, 8, 2, 1, '#e8423f');
    c.px(4, 4, '#ff9a9a');
  } else {
    c.px(4, 6, '#2a2433').px(7, 6, '#2a2433').px(10, 6, '#2a2433');
  }
  return c.canvas;
}
