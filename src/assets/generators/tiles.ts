// Generates the ground tileset (16x16 tiles) used by every map.
// Paths and water are auto-tiled: each edge combination gets its own tile so
// borders blend into the surrounding grass.

import { INTERIOR_THEMES, PAL } from './palette';
import { mulberry32, PixelCanvas, type Rng } from './pixel';

export const TILE = 16;

/** Edge bit flags: set when the neighbour on that side is a *different* terrain. */
export const EDGE = { N: 1, E: 2, S: 4, W: 8 } as const;

export const WATER_FRAMES = 3;
export const FLOWER_FRAMES = 2;
export const TALLGRASS_FRAMES = 2;

export interface TileAtlas {
  canvas: HTMLCanvasElement;
  index: Map<string, number>;
}

type TileDrawer = (c: PixelCanvas, ox: number, oy: number) => void;

// Small deterministic wiggle used for organic edges (same for every tile so
// neighbouring tiles line up seamlessly).
const WIGGLE = [1, 2, 2, 1, 1, 2, 1, 1, 2, 2, 2, 1, 1, 2, 1, 2];

function drawGrass(c: PixelCanvas, ox: number, oy: number, rng: Rng, detail = 1): void {
  c.rect(ox, oy, TILE, TILE, PAL.grass);
  // Fine checker dither in lighter green gives the lawn some grain.
  for (let y = 0; y < TILE; y++) {
    for (let x = (y % 2) * 2; x < TILE; x += 4) {
      if (rng() < 0.22) c.px(ox + x, oy + y, PAL.grassLight);
    }
  }
  // Sparse grass tufts: a small dark "v" pair with a soft highlight.
  for (let i = 0; i < detail; i++) {
    const x = ox + 2 + Math.floor(rng() * 9);
    const y = oy + 4 + Math.floor(rng() * 9);
    c.px(x, y - 1, PAL.grassDark).px(x + 1, y, PAL.grassDark).px(x + 2, y - 1, PAL.grassDark).px(x + 3, y, PAL.grassDark);
    c.px(x, y - 2, PAL.grassLight).px(x + 2, y - 2, PAL.grassLight);
  }
}

function drawPath(c: PixelCanvas, ox: number, oy: number, mask: number): void {
  const rng = mulberry32(900 + mask);
  c.rect(ox, oy, TILE, TILE, PAL.sand);
  c.speckle(ox, oy, TILE, TILE, PAL.sandDark, 0.06, rng);
  c.speckle(ox, oy, TILE, TILE, PAL.sandLight, 0.05, rng);
  // Occasional pebbles.
  for (let i = 0; i < 2; i++) {
    const x = ox + 3 + Math.floor(rng() * 10);
    const y = oy + 3 + Math.floor(rng() * 10);
    c.px(x, y, PAL.sandEdge).px(x + 1, y, PAL.sandDark);
  }
  // Grass overhang on edges that touch non-path terrain.
  for (let i = 0; i < TILE; i++) {
    const d = WIGGLE[i];
    if (mask & EDGE.N) {
      c.rect(ox + i, oy, 1, d, PAL.grass).px(ox + i, oy + d, PAL.sandEdge);
    }
    if (mask & EDGE.S) {
      const dd = WIGGLE[(i + 5) % 16];
      c.rect(ox + i, oy + TILE - dd, 1, dd, PAL.grass).px(ox + i, oy + TILE - dd - 1, PAL.sandDark);
    }
    if (mask & EDGE.W) {
      const dd = WIGGLE[(i + 3) % 16];
      c.rect(ox, oy + i, dd, 1, PAL.grass).px(ox + dd, oy + i, PAL.sandEdge);
    }
    if (mask & EDGE.E) {
      const dd = WIGGLE[(i + 9) % 16];
      c.rect(ox + TILE - dd, oy + i, dd, 1, PAL.grass).px(ox + TILE - dd - 1, oy + i, PAL.sandEdge);
    }
  }
  // Tiny tufts poking over the border.
  if (mask & EDGE.N) c.px(ox + 5, oy + 2, PAL.grassDark).px(ox + 12, oy + 2, PAL.grassDark);
  if (mask & EDGE.S) c.px(ox + 3, oy + 13, PAL.grassDark).px(ox + 10, oy + 13, PAL.grassDark);
}

function drawWater(c: PixelCanvas, ox: number, oy: number, mask: number, frame: number): void {
  c.rect(ox, oy, TILE, TILE, PAL.water);
  // Gentle depth bands.
  for (let y = 0; y < TILE; y++) {
    if ((y + frame) % 8 === 0) c.hline(ox, oy + y, TILE, PAL.waterDeep);
  }
  // Animated wave sparkles.
  const waves: [number, number][] = [
    [2, 3],
    [9, 6],
    [4, 11],
    [11, 13],
  ];
  for (const [wx, wy] of waves) {
    const x = (wx + frame * 2) % 14;
    c.hline(ox + x, oy + wy, 3, PAL.waterLight);
    c.px(ox + x + 1, oy + wy - 1, PAL.foam);
  }

  // Stone rim + shadow + foam along land edges.
  const rim = (side: number) => {
    for (let i = 0; i < TILE; i++) {
      const foamOn = (i + frame) % 4 !== 0;
      const set = (a: number, color: string) => {
        if (side === EDGE.N) c.px(ox + i, oy + a, color);
        if (side === EDGE.S) c.px(ox + i, oy + TILE - 1 - a, color);
        if (side === EDGE.W) c.px(ox + a, oy + i, color);
        if (side === EDGE.E) c.px(ox + TILE - 1 - a, oy + i, color);
      };
      set(0, PAL.rim);
      set(1, PAL.rim);
      set(2, PAL.rimDark);
      set(3, PAL.waterShadow);
      if (foamOn) set(4, PAL.foam);
    }
  };
  if (mask & EDGE.N) rim(EDGE.N);
  if (mask & EDGE.S) rim(EDGE.S);
  if (mask & EDGE.W) rim(EDGE.W);
  if (mask & EDGE.E) rim(EDGE.E);

  // Round outer corners with grass.
  const corner = (cx: number, cy: number, dx: number, dy: number) => {
    const pts: [number, number, string][] = [
      [0, 0, PAL.grass],
      [1, 0, PAL.grass],
      [0, 1, PAL.grass],
      [1, 1, PAL.rim],
      [2, 0, PAL.rim],
      [0, 2, PAL.rim],
    ];
    for (const [px, py, col] of pts) c.px(ox + cx + px * dx, oy + cy + py * dy, col);
  };
  if (mask & EDGE.N && mask & EDGE.W) corner(0, 0, 1, 1);
  if (mask & EDGE.N && mask & EDGE.E) corner(15, 0, -1, 1);
  if (mask & EDGE.S && mask & EDGE.W) corner(0, 15, 1, -1);
  if (mask & EDGE.S && mask & EDGE.E) corner(15, 15, -1, -1);
}

function drawTallGrass(c: PixelCanvas, ox: number, oy: number, frame: number): void {
  c.rect(ox, oy, TILE, TILE, PAL.tallGrassDark);
  // Two staggered rows of chunky tufts.
  const tufts: [number, number][] = [
    [1, 7],
    [9, 7],
    [5, 15],
    [13, 15],
    [-3, 15],
  ];
  for (const [tx, ty] of tufts) {
    const sway = frame === 1 ? 1 : 0;
    for (let i = 0; i < 7; i++) {
      const h = [3, 5, 6, 7, 6, 5, 3][i];
      const x = tx + i;
      if (x < 0 || x > 15) continue;
      for (let j = 0; j < h; j++) {
        const y = ty - j;
        if (y < 0 || y > 15) continue;
        const tip = j >= h - 2;
        const px = j >= h - 2 && i % 2 === 0 ? Math.min(15, x + sway) : x;
        c.px(ox + px, oy + y, tip ? PAL.tallGrassTip : j > 1 ? PAL.tallGrassLight : PAL.tallGrass);
      }
    }
  }
}

const FLOWER_COLORS: Record<string, [string, string]> = {
  red: ['#f05d5e', '#c63d4b'],
  yellow: ['#ffd84d', '#e0a92c'],
  white: ['#ffffff', '#cfd6e6'],
};

function drawFlowers(c: PixelCanvas, ox: number, oy: number, color: string, frame: number): void {
  drawGrass(c, ox, oy, mulberry32(77), 0);
  const [petal, petalShade] = FLOWER_COLORS[color];
  const spots: [number, number][] = [
    [3, 4],
    [11, 6],
    [6, 11],
    [13, 13],
  ];
  spots.forEach(([fx, fy], i) => {
    const sway = frame === 1 && i % 2 === 0 ? 1 : 0;
    const x = ox + fx + sway;
    const y = oy + fy;
    c.px(ox + fx, y + 2, PAL.grassDeep).px(ox + fx - 1, y + 2, PAL.grassDark);
    c.px(x, y - 1, petal).px(x - 1, y, petal).px(x + 1, y, petalShade).px(x, y + 1, petalShade);
    c.px(x, y, '#ffb02e');
  });
}

function drawFloor(c: PixelCanvas, ox: number, oy: number, theme: number): void {
  const t = INTERIOR_THEMES[theme];
  c.rect(ox, oy, TILE, TILE, t.floor);
  if (t.pattern === 'tiles') {
    // Two 8x8 polished tiles per row with grout lines and a soft sheen.
    for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
      c.hline(ox + x, oy + y, 8, t.floorLight).vline(ox + x, oy + y, 8, t.floorLight);
      c.hline(ox + x, oy + y + 7, 8, t.floorDark).vline(ox + x + 7, oy + y, 8, t.floorDark);
      c.px(ox + x + 2, oy + y + 2, '#ffffff').px(ox + x + 3, oy + y + 2, '#ffffff');
    }
    return;
  }
  // Horizontal planks, staggered seams.
  for (let row = 0; row < 4; row++) {
    const y = oy + row * 4;
    c.hline(ox, y, TILE, t.floorLight);
    c.hline(ox, y + 3, TILE, t.floorDark);
    const seam = row % 2 === 0 ? 5 : 12;
    c.vline(ox + seam, y + 1, 2, t.floorDark);
  }
}

function drawWallTop(c: PixelCanvas, ox: number, oy: number, theme: number): void {
  const t = INTERIOR_THEMES[theme];
  c.rect(ox, oy, TILE, TILE, '#4a3a40');
  c.hline(ox, oy + TILE - 2, TILE, t.trim);
  c.hline(ox, oy + TILE - 1, TILE, '#2e2430');
}

function drawWallFace(c: PixelCanvas, ox: number, oy: number, theme: number): void {
  const t = INTERIOR_THEMES[theme];
  c.rect(ox, oy, TILE, TILE, t.wall);
  for (let x = 1; x < TILE; x += 4) c.vline(ox + x, oy, 12, t.wallStripe);
  c.hline(ox, oy, TILE, '#00000022');
  c.rect(ox, oy + 12, TILE, 4, t.trim);
  c.hline(ox, oy + 12, TILE, '#ffffff55');
  c.hline(ox, oy + 15, TILE, '#00000044');
}

export function buildTileAtlas(): TileAtlas {
  const drawers: [string, TileDrawer][] = [];

  for (let v = 0; v < 4; v++) {
    drawers.push([`grass_${v}`, (c, x, y) => drawGrass(c, x, y, mulberry32(10 + v), [0, 1, 2, 1][v])]);
  }
  for (let m = 0; m < 16; m++) drawers.push([`path_${m}`, (c, x, y) => drawPath(c, x, y, m)]);
  for (let m = 0; m < 16; m++) {
    for (let f = 0; f < WATER_FRAMES; f++) {
      drawers.push([`water_${m}_${f}`, (c, x, y) => drawWater(c, x, y, m, f)]);
    }
  }
  for (let f = 0; f < TALLGRASS_FRAMES; f++) drawers.push([`tallgrass_${f}`, (c, x, y) => drawTallGrass(c, x, y, f)]);
  for (const color of Object.keys(FLOWER_COLORS)) {
    for (let f = 0; f < FLOWER_FRAMES; f++) {
      drawers.push([`flowers_${color}_${f}`, (c, x, y) => drawFlowers(c, x, y, color, f)]);
    }
  }
  INTERIOR_THEMES.forEach((_, t) => {
    drawers.push([`floor_${t}`, (c, x, y) => drawFloor(c, x, y, t)]);
    drawers.push([`wall_top_${t}`, (c, x, y) => drawWallTop(c, x, y, t)]);
    drawers.push([`wall_face_${t}`, (c, x, y) => drawWallFace(c, x, y, t)]);
  });
  drawers.push(['void', (c, x, y) => c.rect(x, y, TILE, TILE, PAL.void)]);

  const cols = 16;
  const rows = Math.ceil(drawers.length / cols);
  const canvas = new PixelCanvas(cols * TILE, rows * TILE);
  const index = new Map<string, number>();
  drawers.forEach(([name, draw], i) => {
    const x = (i % cols) * TILE;
    const y = Math.floor(i / cols) * TILE;
    draw(canvas, x, y);
    index.set(name, i);
  });
  return { canvas: canvas.canvas, index };
}
