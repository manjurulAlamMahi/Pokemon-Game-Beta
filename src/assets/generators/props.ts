// Outdoor decorations and interior furniture.

import { PAL } from './palette';
import { mulberry32, PixelCanvas, shade } from './pixel';

const SHADOW = 'rgba(30, 50, 30, 0.25)';

function tree(variant: 'round' | 'autumn' | 'pine'): HTMLCanvasElement {
  const c = new PixelCanvas(32, 40);
  const rng = mulberry32(variant.length * 31);
  const pal =
    variant === 'autumn'
      ? { dark: '#c96a2c', mid: '#e48a3a', light: '#f3b45a', hi: '#ffd98a', outline: '#6b3420' }
      : { dark: PAL.leafDark, mid: PAL.leaf, light: PAL.leafLight, hi: PAL.leafHighlight, outline: PAL.leafOutline };

  // Trunk.
  c.rect(12, 26, 8, 12, PAL.trunk);
  c.rect(12, 26, 2, 12, PAL.trunkDark);
  c.rect(10, 36, 12, 2, PAL.trunk);
  c.px(17, 30, PAL.trunkDark).px(16, 33, PAL.trunkDark);

  if (variant === 'pine') {
    // Stacked tiers, lit from the upper left.
    const tiers = [
      { y: 30, w: 15 },
      { y: 22, w: 12 },
      { y: 14, w: 9 },
      { y: 7, w: 5 },
    ];
    for (const t of tiers) {
      for (let r = 0; r < 9; r++) {
        const half = Math.round((t.w * (r + 1)) / 9);
        for (let x = 16 - half; x < 16 + half; x++) {
          const rel = (x - (16 - half)) / Math.max(1, half * 2);
          const color = r >= 7 ? pal.dark : rel < 0.3 ? pal.light : rel < 0.75 ? pal.mid : pal.dark;
          c.px(x, t.y - 9 + r, color);
        }
      }
      // Branch tips dither.
      for (let i = 0; i < 4; i++) c.px(16 - t.w + 2 + Math.floor(rng() * t.w * 2 - 2), t.y - 2, pal.dark);
    }
    c.px(15, 0, pal.hi).px(14, 3, pal.hi).px(12, 10, pal.hi).px(10, 18, pal.hi).px(8, 26, pal.hi);
  } else {
    // Canopy of overlapping leaf clumps, each with its own spherical shading.
    const clumps: [number, number, number][] = [
      [10, 9, 8], [22, 9, 8], [16, 5, 7],
      [7, 16, 7], [25, 16, 7], [16, 13, 9],
      [11, 21, 7], [21, 21, 7], [16, 23, 6],
    ];
    for (const [cx, cy, r] of clumps) leafClump(c, cx, cy, r, pal);
    for (let i = 0; i < 26; i++) {
      const x = 3 + Math.floor(rng() * 26);
      const y = 2 + Math.floor(rng() * 25);
      const cur = c.ctx.getImageData(x, y, 1, 1).data;
      if (cur[3] > 0) c.px(x, y, rng() > 0.5 ? pal.dark : pal.light);
    }
    if (variant === 'autumn') {
      c.px(22, 20, '#fff1b0').px(8, 18, '#fff1b0');
    } else {
      c.px(22, 18, '#f05d5e').px(9, 20, '#f05d5e').px(19, 9, '#f05d5e').px(13, 15, '#f05d5e');
    }
  }
  c.outline();
  // Ground shadow (added after outline so it stays soft).
  const s = new PixelCanvas(32, 40);
  s.ellipse(16, 37.5, 13, 2.5, SHADOW);
  s.blit(c, 0, 0);
  return s.canvas;
}

interface LeafPalette {
  dark: string;
  mid: string;
  light: string;
  hi: string;
}

/** A round clump of leaves lit from the upper left. */
function leafClump(c: PixelCanvas, cx: number, cy: number, r: number, pal: LeafPalette): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const lit = (-dx - dy * 1.2) / (r * 1.5);
      c.px(x, y, lit > 0.5 ? pal.hi : lit > 0.12 ? pal.light : lit > -0.42 ? pal.mid : pal.dark);
    }
  }
}

function bush(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  const pal = { dark: PAL.leafDark, mid: PAL.leaf, light: PAL.leafLight, hi: PAL.leafHighlight };
  leafClump(c, 5, 9, 4.5, pal);
  leafClump(c, 11, 9, 4.5, pal);
  leafClump(c, 8, 7, 5, pal);
  leafClump(c, 8, 11, 4, pal);
  c.px(10, 10, '#f05d5e').px(4, 10, '#f05d5e').px(11, 6, '#f05d5e');
  c.outline();
  return c.canvas;
}

function rock(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 10, 6, 4.5, PAL.stoneDark);
  c.ellipse(7.5, 9, 5, 3.5, PAL.stone);
  c.rect(5, 7, 3, 1, PAL.stoneLight).px(4, 8, PAL.stoneLight);
  c.outline();
  return c.canvas;
}

/** Wooden fence auto-tile. mask bits: 1=N 2=E 4=S 8=W (connected sides). */
function fence(mask: number): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  const rail = PAL.woodLight;
  const railDark = PAL.wood;
  if (mask & 8) {
    c.rect(0, 6, 8, 2, rail).hline(0, 8, 8, railDark);
    c.rect(0, 10, 8, 1, railDark);
  }
  if (mask & 2) {
    c.rect(8, 6, 8, 2, rail).hline(8, 8, 8, railDark);
    c.rect(8, 10, 8, 1, railDark);
  }
  if (mask & 1) c.rect(7, 0, 2, 6, rail);
  if (mask & 4) c.rect(7, 10, 2, 6, rail);
  // Post.
  c.rect(6, 3, 4, 10, PAL.woodLight);
  c.vline(9, 3, 10, PAL.wood);
  c.hline(6, 3, 4, '#e8bb86');
  c.outline();
  return c.canvas;
}

function sign(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(7, 9, 2, 6, PAL.woodDark);
  c.rect(1, 2, 14, 8, PAL.woodLight);
  c.hline(1, 9, 14, PAL.wood);
  c.hline(1, 2, 14, '#e8bb86');
  c.hline(3, 4, 9, PAL.woodDark).hline(3, 6, 7, PAL.woodDark);
  c.outline();
  return c.canvas;
}

function mailbox(color: string): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(7, 8, 2, 7, PAL.woodDark);
  c.rect(3, 3, 10, 6, color);
  c.hline(3, 3, 10, shade(color, 0.3));
  c.rect(3, 7, 10, 2, shade(color, -0.25));
  c.rect(11, 1, 1, 4, '#f5d76e');
  c.outline();
  return c.canvas;
}

function lamp(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 32);
  c.rect(7, 8, 2, 22, '#4a4f5c');
  c.rect(5, 28, 6, 3, '#4a4f5c');
  c.rect(4, 2, 8, 7, '#4a4f5c');
  c.rect(5, 3, 6, 5, '#ffe9a0');
  c.rect(6, 4, 2, 2, '#ffffff');
  c.rect(3, 1, 10, 2, '#363a45');
  c.outline();
  return c.canvas;
}

function planter(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(2, 8, 12, 6, '#b5653d');
  c.hline(2, 8, 12, '#d17f52');
  c.ellipse(8, 7, 6, 3, PAL.leaf);
  c.px(5, 5, '#ffd84d').px(8, 4, '#f05d5e').px(11, 5, '#ffffff').px(6, 7, '#f05d5e').px(10, 7, '#ffd84d');
  c.outline();
  return c.canvas;
}

function crate(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(2, 3, 12, 11, PAL.woodLight);
  c.rect(2, 3, 12, 2, '#e8bb86');
  c.rect(2, 12, 12, 2, PAL.wood);
  c.vline(7, 5, 7, PAL.wood);
  c.px(4, 7, '#f05d5e').px(5, 8, '#f05d5e').px(10, 7, '#ffd84d');
  c.outline();
  return c.canvas;
}

// --- Interior furniture ----------------------------------------------------

function bed(blanket: string): HTMLCanvasElement {
  const c = new PixelCanvas(16, 32);
  c.rect(1, 1, 14, 6, PAL.woodDark);
  c.hline(1, 1, 14, PAL.woodLight);
  c.rect(2, 6, 12, 24, '#f4f1ea');
  c.rect(3, 7, 10, 6, '#ffffff');
  c.hline(3, 12, 10, '#d9d6cf');
  c.rect(2, 14, 12, 16, blanket);
  c.hline(2, 14, 12, shade(blanket, 0.25));
  c.rect(2, 26, 12, 4, shade(blanket, -0.2));
  for (let x = 4; x < 13; x += 4) c.vline(x, 16, 9, shade(blanket, -0.1));
  c.outline();
  return c.canvas;
}

function table(cloth?: string): HTMLCanvasElement {
  const c = new PixelCanvas(32, 32);
  c.rect(3, 22, 3, 8, PAL.woodDark).rect(26, 22, 3, 8, PAL.woodDark);
  c.rect(1, 6, 30, 17, PAL.woodLight);
  c.hline(1, 6, 30, '#e8bb86');
  c.rect(1, 20, 30, 3, PAL.wood);
  if (cloth) {
    c.rect(6, 7, 20, 13, cloth);
    c.rect(6, 7, 20, 1, shade(cloth, 0.3));
    for (let x = 8; x < 26; x += 4) c.px(x, 19, '#ffffff');
  }
  // A cup and a bowl of fruit.
  c.rect(8, 10, 3, 3, '#ffffff').px(11, 11, '#ffffff');
  c.ellipse(20, 13, 4, 2.5, '#e8e1d4');
  c.px(19, 11, '#f05d5e').px(21, 11, '#ffd84d').px(20, 10, '#6fbf4a');
  c.outline();
  return c.canvas;
}

function chair(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(3, 1, 10, 7, PAL.wood);
  c.rect(4, 2, 8, 2, PAL.woodLight);
  c.rect(3, 8, 10, 4, PAL.woodLight);
  c.rect(3, 12, 2, 3, PAL.woodDark).rect(11, 12, 2, 3, PAL.woodDark);
  c.outline();
  return c.canvas;
}

function tv(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 24);
  c.rect(1, 12, 14, 11, PAL.woodDark);
  c.rect(2, 13, 12, 3, PAL.wood);
  c.rect(2, 17, 12, 5, PAL.wood);
  c.px(7, 14, '#e8bb86').px(7, 19, '#e8bb86');
  c.rect(1, 1, 14, 11, '#3a3f4b');
  c.rect(2, 2, 12, 8, '#7fd3f0');
  c.rect(2, 2, 12, 3, '#a8e6fa');
  c.rect(4, 6, 3, 3, '#6fbf4a').rect(9, 5, 4, 4, '#ffd84d');
  c.outline();
  return c.canvas;
}

function bookshelf(): HTMLCanvasElement {
  const c = new PixelCanvas(32, 32);
  const rng = mulberry32(42);
  c.rect(1, 1, 30, 30, PAL.woodDark);
  c.rect(2, 2, 28, 28, PAL.wood);
  const books = ['#e8423f', '#4a7fd0', '#6fbf4a', '#ffd84d', '#a56be0', '#f08a3c', '#f4f1ea'];
  for (const shelfY of [3, 12, 21]) {
    let x = 3;
    while (x < 28) {
      const w = 2 + Math.floor(rng() * 2);
      const h = 6 + Math.floor(rng() * 2);
      c.rect(x, shelfY + 8 - h, w, h, books[Math.floor(rng() * books.length)]);
      x += w + (rng() > 0.8 ? 1 : 0);
    }
    c.rect(2, shelfY + 8, 28, 1, PAL.woodDark);
  }
  c.outline();
  return c.canvas;
}

function plant(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 24);
  c.rect(4, 15, 8, 8, '#c56b43');
  c.hline(4, 15, 8, '#e08b5f');
  c.ellipse(8, 9, 6, 6, PAL.leafDark);
  c.ellipse(7, 7, 4, 4, PAL.leaf);
  c.px(5, 5, PAL.leafHighlight).px(10, 3, PAL.leaf).px(11, 2, PAL.leafLight).px(3, 4, PAL.leaf);
  c.outline();
  return c.canvas;
}

function rug(color: string): HTMLCanvasElement {
  const c = new PixelCanvas(48, 32);
  c.rect(1, 1, 46, 30, shade(color, -0.25));
  c.rect(3, 3, 42, 26, color);
  c.rect(7, 7, 34, 18, shade(color, 0.2));
  c.rect(10, 10, 28, 12, color);
  for (let x = 4; x < 45; x += 3) c.px(x, 0, shade(color, -0.25)).px(x, 31, shade(color, -0.25));
  return c.canvas;
}

function windowTex(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 1, 14, 11, PAL.white);
  c.rect(2, 2, 12, 9, '#9fdcf5');
  c.rect(2, 2, 12, 3, '#c9eefb');
  c.vline(7, 2, 9, PAL.white).vline(8, 2, 9, PAL.white);
  c.rect(0, 12, 16, 2, '#e8e1d4');
  c.rect(1, 1, 3, 11, '#f08aa0').rect(12, 1, 3, 11, '#f08aa0');
  c.outline();
  return c.canvas;
}

function picture(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(2, 2, 12, 10, '#c9952f');
  c.rect(3, 3, 10, 8, '#bfe6ff');
  c.rect(3, 8, 10, 3, '#6fbf4a');
  c.ellipse(9, 8, 3, 2, '#4f9e3d');
  c.px(5, 5, '#ffd84d');
  c.outline();
  return c.canvas;
}

function clock(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.circle(8, 7, 5, '#8a5a3a');
  c.circle(8, 7, 4, '#fff6e2');
  c.vline(8, 4, 3, PAL.outline).hline(8, 7, 3, PAL.outline);
  c.outline();
  return c.canvas;
}

function counter(): HTMLCanvasElement {
  const c = new PixelCanvas(32, 24);
  c.rect(0, 4, 32, 19, '#e8e4dc');
  c.rect(0, 4, 32, 4, '#c9c3b6');
  c.rect(2, 10, 13, 11, '#d6cfc0').rect(17, 10, 13, 11, '#d6cfc0');
  c.px(13, 15, PAL.outline).px(19, 15, PAL.outline);
  // Stove top.
  c.rect(20, 4, 10, 4, '#4a4f5c');
  c.circle(23, 6, 1.5, '#e8423f').circle(27, 6, 1.5, '#7a7f8c');
  c.rect(5, 1, 6, 4, '#f05d5e').rect(6, 0, 4, 1, '#c63d4b');
  c.outline();
  return c.canvas;
}

function bigCushion(): HTMLCanvasElement {
  const c = new PixelCanvas(32, 24);
  c.ellipse(16, 13, 15, 10, '#c4503d');
  c.ellipse(16, 12, 12, 7, '#e2725a');
  c.ellipse(16, 13, 8, 4, '#c4503d');
  c.px(10, 9, '#f6a08a').px(11, 8, '#f6a08a');
  // A few singe marks — something warm sleeps here.
  c.px(19, 14, '#6b2a20').px(21, 13, '#6b2a20').px(13, 15, '#6b2a20');
  c.outline();
  return c.canvas;
}

function armchair(color: string): HTMLCanvasElement {
  const c = new PixelCanvas(16, 20);
  c.rect(2, 1, 12, 10, shade(color, -0.15));
  c.rect(3, 2, 10, 3, shade(color, 0.2));
  c.rect(1, 9, 14, 8, color);
  c.rect(1, 9, 3, 8, shade(color, -0.15)).rect(12, 9, 3, 8, shade(color, -0.15));
  c.rect(2, 17, 2, 2, PAL.woodDark).rect(12, 17, 2, 2, PAL.woodDark);
  c.outline();
  return c.canvas;
}

function fireplace(): HTMLCanvasElement {
  const c = new PixelCanvas(32, 32);
  c.rect(1, 2, 30, 29, '#a8574a');
  for (let y = 4; y < 30; y += 4) c.hline(1, y, 30, '#8f4a40');
  c.rect(0, 0, 32, 4, PAL.woodDark);
  c.rect(7, 12, 18, 18, '#2a1f24');
  c.rect(10, 24, 12, 4, '#8a5a3a');
  return c.canvas;
}

/** Animated flames for the fireplace (separate so they can flicker). */
function flame(frame: number): HTMLCanvasElement {
  const c = new PixelCanvas(16, 12);
  const s = frame === 0 ? 0 : 1;
  c.ellipse(8, 8, 6, 4, '#f08a3c');
  c.ellipse(8 - s, 7, 4, 4, '#ffb02e');
  c.ellipse(8 + s, 8, 2, 3, '#fff1b0');
  c.px(4 + s, 3, '#f08a3c').px(11 - s, 2, '#ffb02e');
  return c.canvas;
}

function doormat(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 4, 14, 10, '#b2553f');
  c.rect(2, 5, 12, 8, '#d06d52');
  for (let x = 3; x < 13; x += 2) c.vline(x, 6, 6, '#b2553f');
  return c.canvas;
}

function toyBox(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 5, 14, 10, '#4a7fd0');
  c.rect(1, 5, 14, 2, '#7aa8ec');
  c.circle(6, 4, 3, '#e8423f');
  c.circle(6, 4, 1, '#ffffff');
  c.rect(10, 1, 3, 4, '#ffd84d');
  c.outline();
  return c.canvas;
}

/** Ellipse with spherical shading lit from the upper left. */
function blob(c: PixelCanvas, cx: number, cy: number, rx: number, ry: number, ramp: [string, string, string, string]): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const lit = (-dx - dy * 1.3) / 2;
      c.px(x, y, lit > 0.45 ? ramp[3] : lit > 0.08 ? ramp[2] : lit > -0.4 ? ramp[1] : ramp[0]);
    }
  }
}

/**
 * Placeholder fire dragon curled up asleep (original design, stands in for
 * the old man's partner until final creature art exists).
 */
function restingDragon(frame: number): HTMLCanvasElement {
  const c = new PixelCanvas(40, 32);
  const body: [string, string, string, string] = ['#9c3a24', '#c8542f', '#e07440', '#f39a5c'];
  const belly: [string, string, string, string] = ['#c87a3c', '#e89a50', '#f4b86a', '#ffd48c'];
  const wing: [string, string, string, string] = ['#5a1e18', '#7a2a1e', '#983a26', '#b44e30'];
  const breathe = frame === 1 ? -1 : 0;

  // Ground shadow.
  c.ellipse(21, 29, 17, 3, 'rgba(30, 50, 30, 0.28)');
  // Tail curling around the front.
  const tail: [number, number, number][] = [[33, 24, 4], [31, 27, 3.5], [27, 29, 3], [22, 29.5, 2.6], [17, 29, 2.2]];
  for (const [x, y, r] of tail) blob(c, x, y, r, r * 0.85, body);
  // Body and belly.
  blob(c, 22, 19 + breathe, 12, 8.5, body);
  blob(c, 20, 23 + breathe, 8, 3.5, belly);
  // Folded wing on the back with ribs.
  blob(c, 24, 13 + breathe, 9, 5, wing);
  for (const x of [19, 23, 27]) c.vline(x, 10 + breathe, 6, wing[0]);
  c.px(16, 9 + breathe, wing[2]).px(31, 10 + breathe, wing[1]);
  // Ridge of back spikes along the spine.
  for (const x of [18, 22, 26, 30]) c.px(x, 8 + breathe, '#e8d8b8').px(x, 9 + breathe, '#c8b898');
  // Front feet.
  blob(c, 14, 26, 2.5, 2, body);
  blob(c, 28, 26, 2.5, 2, body);
  // Head resting on the ground, snout to the left.
  blob(c, 10, 19, 6.5, 5.2, body);
  blob(c, 4.5, 21, 3.5, 2.8, body);
  c.px(3, 20, '#5a2416').px(5, 20, '#5a2416'); // nostrils
  c.hline(8, 18, 3, '#3a1a14'); // closed eye
  c.px(11, 17, '#3a1a14');
  // Horns.
  c.rect(11, 12, 2, 3, '#e8d8b8').px(12, 11, '#e8d8b8');
  c.rect(14, 13, 2, 3, '#e8d8b8').px(15, 12, '#e8d8b8');
  c.outline();

  // Tail flame (drawn after the outline so it glows).
  const fx = 14;
  const fy = 27;
  const big = frame === 1;
  c.ellipse(fx, fy - (big ? 3 : 2), big ? 3 : 2.5, big ? 4.5 : 3.5, '#f07a2a');
  c.ellipse(fx, fy - (big ? 2 : 1.5), big ? 2 : 1.5, big ? 3 : 2.2, '#ffc24a');
  c.ellipse(fx, fy - 1, 1, 1.5, '#fff4c0');
  return c.canvas;
}

/** Staircase drawn over the wall row and the floor tile in front of it. */
function stairs(direction: 'up' | 'down'): HTMLCanvasElement {
  const c = new PixelCanvas(16, 32);
  const rail = PAL.woodDark;
  if (direction === 'up') {
    // Steps rising into the wall: lighter near the viewer, darker toward the top.
    for (let i = 0; i < 8; i++) {
      const y = 28 - i * 4;
      const tone = shade('#c89a6a', -i * 0.06);
      c.rect(2, y, 12, 4, tone);
      c.hline(2, y, 12, shade(tone, 0.2));
      c.hline(2, y + 3, 12, shade(tone, -0.25));
    }
  } else {
    // Opening in the floor with steps descending into shadow.
    c.rect(2, 2, 12, 30, '#2a2030');
    for (let i = 0; i < 6; i++) {
      const y = 6 + i * 4;
      const tone = shade('#b08860', -0.12 - i * 0.1);
      c.rect(3, y, 10, 3, tone);
      c.hline(3, y, 10, shade(tone, 0.2));
    }
  }
  c.rect(0, 2, 2, 30, rail).rect(14, 2, 2, 30, rail);
  c.rect(0, 0, 2, 3, PAL.woodLight).rect(14, 0, 2, 3, PAL.woodLight);
  c.outline();
  return c.canvas;
}

function pcDesk(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 24);
  c.rect(0, 12, 16, 11, PAL.woodDark);
  c.rect(1, 13, 14, 3, PAL.wood);
  c.rect(1, 17, 6, 5, PAL.wood).rect(9, 17, 6, 5, PAL.wood);
  c.rect(2, 1, 12, 10, '#d8d8e0');
  c.rect(3, 2, 10, 7, '#3a6ab0');
  c.rect(4, 3, 4, 2, '#8ad0ff').rect(4, 6, 7, 1, '#8ad0ff');
  c.rect(6, 11, 4, 1, '#a8a8b8');
  c.rect(3, 12, 10, 2, '#e8e8f0');
  c.outline();
  return c.canvas;
}

function sleepZ(): HTMLCanvasElement {
  const c = new PixelCanvas(7, 7);
  c.hline(1, 1, 5, '#ffffff').px(4, 2, '#ffffff').px(3, 3, '#ffffff').px(2, 4, '#ffffff').hline(1, 5, 5, '#ffffff');
  c.outline('#3a3450');
  return c.canvas;
}

function smoke(): HTMLCanvasElement {
  const c = new PixelCanvas(6, 6);
  c.circle(3, 3, 3, '#e9e6f0');
  c.circle(2.5, 2.5, 1.6, '#ffffff');
  return c.canvas;
}

function butterfly(frame: number, color: string): HTMLCanvasElement {
  const c = new PixelCanvas(7, 5);
  if (frame === 0) {
    c.rect(0, 0, 3, 3, color).rect(4, 0, 3, 3, color);
    c.px(1, 3, shade(color, -0.2)).px(5, 3, shade(color, -0.2));
  } else {
    c.rect(1, 1, 2, 2, color).rect(4, 1, 2, 2, color);
  }
  c.vline(3, 0, 4, PAL.outline);
  return c.canvas;
}

export function buildPropTextures(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {
    tree_round: tree('round'),
    tree_autumn: tree('autumn'),
    tree_pine: tree('pine'),
    bush: bush(),
    rock: rock(),
    sign: sign(),
    mailbox_red: mailbox('#e8423f'),
    mailbox_blue: mailbox('#4a7fd0'),
    mailbox_pink: mailbox('#e87fa0'),
    mailbox_green: mailbox('#5f9c5a'),
    lamp: lamp(),
    planter: planter(),
    crate: crate(),
    bed_red: bed('#e8605a'),
    bed_blue: bed('#4a7fd0'),
    bed_pink: bed('#ef8fb0'),
    bed_green: bed('#6aa25a'),
    table: table(),
    table_cloth: table('#f6d8e0'),
    chair: chair(),
    tv: tv(),
    bookshelf: bookshelf(),
    plant: plant(),
    rug_red: rug('#d0604c'),
    rug_blue: rug('#5a86c8'),
    rug_pink: rug('#e58aa6'),
    rug_green: rug('#7aa05a'),
    window: windowTex(),
    picture: picture(),
    clock: clock(),
    counter: counter(),
    big_cushion: bigCushion(),
    armchair: armchair('#7a9a5a'),
    armchair_purple: armchair('#8a6ab0'),
    fireplace: fireplace(),
    flame_0: flame(0),
    flame_1: flame(1),
    doormat: doormat(),
    toybox: toyBox(),
    smoke: smoke(),
    dragon_0: restingDragon(0),
    dragon_1: restingDragon(1),
    sleep_z: sleepZ(),
    stairs_up: stairs('up'),
    stairs_down: stairs('down'),
    pc: pcDesk(),
    butterfly_white_0: butterfly(0, '#ffffff'),
    butterfly_white_1: butterfly(1, '#ffffff'),
    butterfly_yellow_0: butterfly(0, '#ffd84d'),
    butterfly_yellow_1: butterfly(1, '#ffd84d'),
  };
  for (let m = 0; m < 16; m++) out[`fence_${m}`] = fence(m);
  return out;
}
