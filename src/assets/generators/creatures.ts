// Original placeholder starter creatures, drawn procedurally.
//
// Each species has ONE parametric drawer that works in a 24x24 "design space".
// It is rendered at scale 1 for the overworld follower sheet and at ~2.6x for
// the large portrait, so both stay consistent. Replacing these with final art
// only means providing textures under the same keys (see data/starters.ts).

import type { StarterId } from '../../types';
import { PixelCanvas } from './pixel';

export const CREATURE_W = 24;
export const CREATURE_H = 24;
export const PORTRAIT_SIZE = 64;

type Dir = 'down' | 'up' | 'left';
type Ramp = readonly [string, string, string, string];

const EYE = '#2a1c24';

/** Scaled drawing helper: all coordinates are in 24x24 design space. */
class Painter {
  constructor(
    readonly c: PixelCanvas,
    readonly s: number,
    readonly ox: number,
    readonly oy: number,
  ) {}

  X(x: number) {
    return this.ox + x * this.s;
  }

  Y(y: number) {
    return this.oy + y * this.s;
  }

  blob(cx: number, cy: number, rx: number, ry: number, ramp: Ramp) {
    this.c.shadedEllipse(this.X(cx), this.Y(cy), rx * this.s, ry * this.s, ramp);
  }

  flat(cx: number, cy: number, rx: number, ry: number, color: string) {
    this.c.ellipse(this.X(cx), this.Y(cy), rx * this.s, ry * this.s, color);
  }

  line(x: number, y: number, w: number, color: string) {
    this.c.rect(this.X(x), this.Y(y), Math.max(1, w * this.s), Math.max(1, Math.round(this.s * 0.6)), color);
  }

  /** Eye: 1x2 pixels at small scale, glossy oval with highlight when large. */
  eye(cx: number, cy: number, blink = false, color = EYE) {
    const s = this.s;
    if (blink) {
      this.c.rect(this.X(cx - 0.8), this.Y(cy), Math.max(1, 1.6 * s), Math.max(1, Math.round(s * 0.5)), color);
      return;
    }
    if (s < 1.5) {
      this.c.rect(Math.round(this.X(cx - 0.5)), Math.round(this.Y(cy - 1)), 1, 2, color);
      return;
    }
    this.c.ellipse(this.X(cx), this.Y(cy), 0.85 * s, 1.25 * s, color);
    this.c.ellipse(this.X(cx - 0.3), this.Y(cy - 0.5), 0.35 * s, 0.4 * s, '#ffffff');
    this.c.px(this.X(cx + 0.35), this.Y(cy + 0.6), '#7a6a80');
  }
}

interface DrawOpts {
  dir: Dir;
  frame: number; // 0 idle, 1 walkA, 2 walkB, 3 breathe
  blink?: boolean;
  /** Flame/flicker frame for glowing parts (defaults to frame). */
  glowFrame?: number;
}

// --- Fire lizard ("Charmander" placeholder) ----------------------------------

const FIRE = {
  body: ['#b8461e', '#e8682c', '#f78c44', '#ffb070'] as Ramp,
  belly: ['#d8a858', '#f0ca78', '#fbe09a', '#fff2c4'] as Ramp,
};

function flame(p: Painter, x: number, y: number, frame: number) {
  const big = frame % 2 === 1 ? 1.15 : 1;
  p.flat(x, y, 1.9 * big, 2.8 * big, '#f05a28');
  p.flat(x, y + 0.4, 1.3 * big, 2 * big, '#ffa630');
  p.flat(x, y + 0.9, 0.7, 1.1, '#fff2b0');
}

function drawFire(p: Painter, o: DrawOpts) {
  const b = o.frame === 3 ? 0.5 : 0;
  const l1 = o.frame === 1 ? -1 : 0;
  const l2 = o.frame === 2 ? -1 : 0;
  if (o.dir === 'down') {
    p.blob(17.8, 18.2, 2, 1.6, FIRE.body);
    p.blob(19.6, 15.8, 1.5, 1.6, FIRE.body);
    p.blob(9.4, 20.6 + l1, 2.3, 1.8, FIRE.body);
    p.blob(14.6, 20.6 + l2, 2.3, 1.8, FIRE.body);
    p.blob(12, 16.4 + b, 5, 4.8, FIRE.body);
    p.blob(12, 17.4 + b, 3.2, 3.3, FIRE.belly);
    p.blob(7.3, 15.4 + b, 1.5, 1.9, FIRE.body);
    p.blob(16.7, 15.4 + b, 1.5, 1.9, FIRE.body);
    p.flat(12, 10.1 + b, 5.80, 5.04, FIRE.body[0]);
    p.blob(12, 9 + b, 6.3, 5.6, FIRE.body);
    p.eye(9.6, 9.2 + b, o.blink);
    p.eye(14.4, 9.2 + b, o.blink);
    p.line(11, 12.3 + b, 2, '#8a2a14');
  } else if (o.dir === 'left') {
    p.blob(18, 18.4, 2.3, 1.6, FIRE.body);
    p.blob(20.2, 15.6, 1.6, 1.7, FIRE.body);
    p.blob(14.2, 20.6 + l2, 2.1, 1.8, FIRE.body);
    p.blob(13, 16.4 + b, 4.3, 4.8, FIRE.body);
    p.blob(10.8, 17.4 + b, 2.2, 3, FIRE.belly);
    p.blob(10.6, 20.6 + l1, 2.2, 1.8, FIRE.body);
    p.blob(10.4, 15.6 + b, 1.4, 1.8, FIRE.body);
    p.flat(10.2, 10.2 + b, 5.5, 4.9, FIRE.body[0]);
    p.blob(10.2, 9 + b, 6, 5.4, FIRE.body);
    p.blob(5.4, 10.6 + b, 2.6, 2.3, FIRE.body);
    p.eye(7.4, 8.8 + b, o.blink);
    p.line(3.6, 12 + b, 2.6, '#8a2a14');
  } else {
    p.blob(9.4, 20.6 + l1, 2.3, 1.8, FIRE.body);
    p.blob(14.6, 20.6 + l2, 2.3, 1.8, FIRE.body);
    p.blob(12, 16.4 + b, 5, 4.8, FIRE.body);
    p.blob(7.3, 15.4 + b, 1.5, 1.9, FIRE.body);
    p.blob(16.7, 15.4 + b, 1.5, 1.9, FIRE.body);
    p.blob(12, 9 + b, 6.3, 5.6, FIRE.body);
    p.blob(15, 19.8, 2, 1.6, FIRE.body);
    p.blob(17.4, 17.8, 1.6, 1.6, FIRE.body);
  }
}

function drawFireGlow(p: Painter, o: DrawOpts) {
  if (o.dir === 'down') flame(p, 19.8, 12.6, o.glowFrame ?? o.frame);
  else if (o.dir === 'left') flame(p, 20.6, 12.2, o.glowFrame ?? o.frame);
  else flame(p, 18, 14.4, o.glowFrame ?? o.frame);
}

// --- Water turtle ("Squirtle" placeholder) -------------------------------------

const WATER = {
  body: ['#3a86b8', '#5cb0e0', '#82c8f0', '#b8e6fb'] as Ramp,
  shell: ['#6a3e1c', '#9a5e2a', '#c08040', '#dca460'] as Ramp,
  plastron: ['#d0aa58', '#e8cc74', '#f6e29a', '#fff4c8'] as Ramp,
};

function curlTail(p: Painter, x: number, y: number) {
  p.blob(x, y, 2.4, 2.2, WATER.body);
  p.flat(x + 0.2, y + 0.1, 1, 0.9, '#3a86b8');
  p.flat(x + 0.4, y, 0.5, 0.45, '#82c8f0');
}

function drawWater(p: Painter, o: DrawOpts) {
  const b = o.frame === 3 ? 0.5 : 0;
  const l1 = o.frame === 1 ? -1 : 0;
  const l2 = o.frame === 2 ? -1 : 0;
  if (o.dir === 'down') {
    curlTail(p, 18, 18.6);
    p.blob(9.4, 20.6 + l1, 2.3, 1.8, WATER.body);
    p.blob(14.6, 20.6 + l2, 2.3, 1.8, WATER.body);
    p.blob(12, 16.4 + b, 5.7, 5, WATER.shell);
    p.blob(12, 16.8 + b, 4.1, 4.2, WATER.plastron);
    p.line(9.6, 15.4 + b, 4.8, '#c09a50');
    p.line(9.8, 17.8 + b, 4.4, '#c09a50');
    p.blob(6.6, 15.2 + b, 1.6, 2, WATER.body);
    p.blob(17.4, 15.2 + b, 1.6, 2, WATER.body);
    p.flat(12, 9.9 + b, 5.52, 4.95, WATER.body[0]);
    p.blob(12, 8.8 + b, 6, 5.5, WATER.body);
    p.eye(9.5, 9 + b, o.blink, '#3a1a20');
    p.eye(14.5, 9 + b, o.blink, '#3a1a20');
    p.line(10.6, 12.2 + b, 2.8, '#2a5a80');
  } else if (o.dir === 'left') {
    curlTail(p, 19.6, 19.2);
    p.blob(14.4, 20.6 + l2, 2, 1.8, WATER.body);
    p.blob(14.6, 16.2 + b, 4.4, 5.2, WATER.shell);
    p.flat(15.4, 15.6 + b, 2.4, 3, '#c08040');
    p.blob(10.4, 16.8 + b, 3, 4, WATER.plastron);
    p.blob(10.4, 20.6 + l1, 2.2, 1.8, WATER.body);
    p.blob(9.8, 15.6 + b, 1.5, 1.9, WATER.body);
    p.flat(9.6, 9.9 + b, 5.34, 4.86, WATER.body[0]);
    p.blob(9.6, 8.8 + b, 5.8, 5.4, WATER.body);
    p.eye(6.8, 8.8 + b, o.blink, '#3a1a20');
    p.line(4, 11.8 + b, 2.6, '#2a5a80');
  } else {
    p.blob(9.4, 20.6 + l1, 2.3, 1.8, WATER.body);
    p.blob(14.6, 20.6 + l2, 2.3, 1.8, WATER.body);
    p.blob(6.4, 15.2 + b, 1.6, 2, WATER.body);
    p.blob(17.6, 15.2 + b, 1.6, 2, WATER.body);
    p.blob(12, 8.8 + b, 6, 5.5, WATER.body);
    p.blob(12, 16.2 + b, 6.2, 5.6, WATER.shell);
    // Shell plates.
    p.flat(12, 15.6 + b, 2.2, 2, '#c08040');
    p.line(9, 18.4 + b, 6, '#6a3e1c');
    p.line(11.6, 11.6 + b, 0.8, '#6a3e1c');
    curlTail(p, 12.4, 21.4);
  }
}

// --- Leaf sprout quadruped ("Bulbasaur" placeholder) ---------------------------

const GRASS = {
  body: ['#2e8a78', '#48b096', '#6ccab0', '#a0e6cc'] as Ramp,
  bud: ['#357a32', '#58aa48', '#82cc62', '#b4ea8e'] as Ramp,
  leaf: ['#2e6e2a', '#4a9a3c', '#6cbc50', '#98dc78'] as Ramp,
};

function bud(p: Painter, x: number, y: number, r: number) {
  p.blob(x - r * 0.62, y - r * 0.35, r * 0.62, r * 0.85, GRASS.leaf);
  p.blob(x + r * 0.62, y - r * 0.35, r * 0.62, r * 0.85, GRASS.leaf);
  p.blob(x, y, r, r * 0.95, GRASS.bud);
  p.line(x - 0.2, y - r * 0.8, 0.5, '#357a32');
  p.flat(x, y - r * 1.05, r * 0.25, r * 0.35, '#b4ea8e');
}

function drawGrass(p: Painter, o: DrawOpts) {
  const b = o.frame === 3 ? 0.5 : 0;
  const l1 = o.frame === 1 ? -1 : 0;
  const l2 = o.frame === 2 ? -1 : 0;
  if (o.dir === 'down') {
    p.blob(4.6, 19.8 + l2, 2, 1.7, GRASS.body);
    p.blob(19.4, 19.8 + l1, 2, 1.7, GRASS.body);
    p.blob(12, 16.6 + b, 7.6, 4.6, GRASS.body);
    p.flat(6.6, 16.4 + b, 1.1, 0.8, '#2a6e5e');
    p.flat(17.4, 17 + b, 1.2, 0.8, '#2a6e5e');
    bud(p, 12, 6.6 + b, 4.4);
    p.blob(8.2, 20.6 + l1, 2.3, 1.8, GRASS.body);
    p.blob(15.8, 20.6 + l2, 2.3, 1.8, GRASS.body);
    p.flat(12, 13.4 + b, 6.6, 4.4, GRASS.body[0]);
    p.blob(12, 12.2 + b, 7, 4.8, GRASS.body);
    p.blob(6.2, 8.6 + b, 1.3, 1.3, GRASS.body);
    p.blob(17.8, 8.6 + b, 1.3, 1.3, GRASS.body);
    p.flat(9.4, 10 + b, 1, 0.7, '#2a6e5e');
    p.eye(8.8, 12.4 + b, o.blink);
    p.eye(15.2, 12.4 + b, o.blink);
    p.line(10.2, 15 + b, 3.6, '#1e5a4a');
  } else if (o.dir === 'left') {
    p.blob(15.6, 20.8 + l1, 2, 1.7, GRASS.body);
    p.blob(10.4, 20.8 + l2, 2, 1.7, GRASS.body);
    p.blob(13.4, 16.4 + b, 6.6, 4.2, GRASS.body);
    p.flat(16, 17.2 + b, 1.2, 0.8, '#2a6e5e');
    bud(p, 15, 9.8 + b, 4.4);
    p.blob(18.6, 20.6 + l2, 2.2, 1.8, GRASS.body);
    p.blob(8, 20.6 + l1, 2.2, 1.8, GRASS.body);
    p.flat(7, 14.1 + b, 4.8, 4, GRASS.body[0]);
    p.blob(6.6, 13 + b, 5.2, 4.4, GRASS.body);
    p.blob(8.6, 8.8 + b, 1.3, 1.3, GRASS.body);
    p.eye(4.8, 12.6 + b, o.blink);
    p.line(1.8, 15 + b, 3, '#1e5a4a');
  } else {
    p.blob(8.2, 20.6 + l1, 2.3, 1.8, GRASS.body);
    p.blob(15.8, 20.6 + l2, 2.3, 1.8, GRASS.body);
    p.blob(12, 12.6 + b, 6.8, 4.6, GRASS.body);
    p.blob(6.2, 9 + b, 1.3, 1.3, GRASS.body);
    p.blob(17.8, 9 + b, 1.3, 1.3, GRASS.body);
    p.blob(12, 16.8 + b, 7.6, 4.6, GRASS.body);
    p.flat(7, 17.6 + b, 1.2, 0.8, '#2a6e5e');
    p.flat(16.6, 15.8 + b, 1, 0.7, '#2a6e5e');
    bud(p, 12, 12 + b, 5.2);
  }
}

const DRAWERS: Record<StarterId, { body: (p: Painter, o: DrawOpts) => void; glow?: (p: Painter, o: DrawOpts) => void }> = {
  charmander: { body: drawFire, glow: drawFireGlow },
  squirtle: { body: drawWater },
  bulbasaur: { body: drawGrass },
};

function renderCreature(id: StarterId, size: number, scale: number, o: DrawOpts): PixelCanvas {
  const c = new PixelCanvas(size, size);
  const off = (size - CREATURE_W * scale) / 2;
  const p = new Painter(c, scale, off, size - CREATURE_H * scale);
  DRAWERS[id].body(p, o);
  c.outline();
  DRAWERS[id].glow?.(p, o);
  return c;
}

/** 12-frame overworld sheet: [down, up, left] x [idle, walkA, walkB, breathe]. */
export function buildCreatureSheet(id: StarterId): HTMLCanvasElement {
  const sheet = new PixelCanvas(CREATURE_W * 12, CREATURE_H);
  (['down', 'up', 'left'] as Dir[]).forEach((dir, d) => {
    for (let f = 0; f < 4; f++) {
      sheet.blit(renderCreature(id, CREATURE_W, 1, { dir, frame: f }), (d * 4 + f) * CREATURE_W, 0);
    }
  });
  return sheet.canvas;
}

/** Large front-facing portrait frames: [idle, breathe, blink, idle-flicker]. */
export function buildCreaturePortraits(id: StarterId): HTMLCanvasElement[] {
  const s = PORTRAIT_SIZE / CREATURE_W;
  return [
    renderCreature(id, PORTRAIT_SIZE, s * 0.98, { dir: 'down', frame: 0 }),
    renderCreature(id, PORTRAIT_SIZE, s * 0.98, { dir: 'down', frame: 3 }),
    renderCreature(id, PORTRAIT_SIZE, s * 0.98, { dir: 'down', frame: 0, blink: true }),
    renderCreature(id, PORTRAIT_SIZE, s * 0.98, { dir: 'down', frame: 0, glowFrame: 1 }),
  ].map((c) => c.canvas);
}

// --- Capsule ball ---------------------------------------------------------------

const BALL_TOP: Ramp = ['#a8202a', '#d8343a', '#f05a58', '#ff9a8e'];
const BALL_BOTTOM: Ramp = ['#b8b4c4', '#e4e2ea', '#f6f6fa', '#ffffff'];

/** Capsule ball, closed or open, drawn in a 16x16 canvas (scaled by `scale`). */
export function buildBall(state: 'closed' | 'open', scale = 1): HTMLCanvasElement {
  const S = 16 * scale;
  const c = new PixelCanvas(S, S);
  const k = scale;
  const cx = 8 * k;
  if (state === 'closed') {
    c.shadedEllipse(cx, 9 * k, 6 * k, 6 * k, BALL_BOTTOM);
    // Top half: redraw shaded red over the upper semicircle.
    const top = new PixelCanvas(S, S);
    top.shadedEllipse(cx, 9 * k, 6 * k, 6 * k, BALL_TOP);
    c.ctx.drawImage(top.canvas, 0, 0, S, 9 * k, 0, 0, S, 9 * k);
    c.rect(2 * k, 8.5 * k, 12 * k, Math.max(1, k), '#2a2433');
    c.circle(cx, 9 * k, 1.9 * k, '#2a2433');
    c.circle(cx, 9 * k, 1.2 * k, '#ffffff');
  } else {
    c.shadedEllipse(cx, 11 * k, 6 * k, 4 * k, BALL_BOTTOM);
    c.ellipse(cx, 10 * k, 4.6 * k, 1.6 * k, '#fff6c8');
    c.ellipse(cx, 4.5 * k, 6 * k, 3 * k, BALL_TOP[1]);
    c.ellipse(cx - 1 * k, 4 * k, 3.5 * k, 1.5 * k, BALL_TOP[3]);
  }
  c.outline();
  return c.canvas;
}

export function buildSparkle(): HTMLCanvasElement {
  const c = new PixelCanvas(7, 7);
  c.vline(3, 0, 7, '#fff6c0').hline(0, 3, 7, '#fff6c0');
  c.px(3, 3, '#ffffff').px(2, 2, '#ffe080').px(4, 4, '#ffe080').px(4, 2, '#ffe080').px(2, 4, '#ffe080');
  return c.canvas;
}

export function buildGlow(size = 48): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,250,210,0.7)');
  g.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}
