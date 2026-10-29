// Original building art: family houses and the research laboratory.
// Houses use a GBA-like construction: shaded shingle roof with cream trim,
// lap-siding walls with a shaded side, framed windows and a recessed door.

import { PAL } from './palette';
import { mulberry32, PixelCanvas, shade } from './pixel';

export interface HouseStyle {
  widthTiles: number;
  roof: string;
  wall: string;
  door: string;
  flowerBox?: string;
  /** Wall material accent: plain siding or timber frame. */
  timber?: boolean;
  /** Two-storey houses are one tile taller with an upper row of windows. */
  floors?: 1 | 2;
}

/** Extra pixels above the footprint for chimneys. */
export const HOUSE_TOP_PAD = 10;

export function houseHeightTiles(style: HouseStyle): number {
  return style.floors === 2 ? 5 : 4;
}

function windowAt(c: PixelCanvas, wx: number, wy: number, w: number, h: number, flowerBox?: string): void {
  const frame = '#fbf6ea';
  const frameShade = '#c9bfa8';
  // Frame and sill.
  c.rect(wx - 2, wy - 2, w + 4, h + 4, frame);
  c.rect(wx - 2, wy + h + 1, w + 4, 1, frameShade);
  c.rect(wx - 3, wy + h + 2, w + 6, 2, frame);
  c.hline(wx - 3, wy + h + 4, w + 6, 'rgba(0,0,0,0.22)');
  // Glass: dark top (reflected eave), light lower half, diagonal glints.
  c.rect(wx, wy, w, h, '#8fcbe8');
  c.rect(wx, wy, w, 3, '#4d87b0');
  c.rect(wx, wy + 3, w, 2, '#6aaad0');
  for (let i = 0; i < 4; i++) c.px(wx + 2 + i, wy + h - 2 - i, '#d8f2ff');
  c.px(wx + w - 4, wy + h - 2, '#d8f2ff').px(wx + w - 3, wy + h - 3, '#d8f2ff');
  // Mullions.
  c.vline(wx + Math.floor(w / 2), wy, h, frame);
  c.hline(wx, wy + Math.floor(h / 2), w, frame);
  // Curtains peeking in from the sides.
  c.rect(wx, wy, 2, h, '#f2e2c4').rect(wx + w - 2, wy, 2, h, '#f2e2c4');
  if (flowerBox) {
    c.rect(wx - 2, wy + h + 2, w + 4, 3, '#8a5a3a');
    c.hline(wx - 2, wy + h + 2, w + 4, '#a8744a');
    for (let i = 0; i < w + 2; i += 2) {
      c.px(wx - 1 + i, wy + h + 1, i % 4 ? flowerBox : '#4f9e3d');
      if (i % 4 === 0) c.px(wx + i, wy + h, flowerBox);
    }
  }
}

export function buildHouse(style: HouseStyle): HTMLCanvasElement {
  const W = style.widthTiles * 16;
  const H = houseHeightTiles(style) * 16 + HOUSE_TOP_PAD;
  const c = new PixelCanvas(W, H);
  const top = HOUSE_TOP_PAD;
  const roofBottom = top + 34;
  const trim = '#f4ecd8';
  const trimShade = '#cbbd9c';

  // Chimney (behind the roof).
  const chX = W - 26;
  c.rect(chX, 0, 10, top + 12, '#b0604c');
  for (let y = 2; y < top + 12; y += 3) {
    c.hline(chX, y, 10, '#8f4a3c');
    c.vline(chX + ((y / 3) % 2 ? 3 : 7), y - 2, 2, '#8f4a3c');
  }
  c.rect(chX - 1, 0, 12, 2, '#5a4a4a');
  c.vline(chX + 9, 0, top + 12, '#8f4a3c');

  // --- Walls -------------------------------------------------------------
  const wallTop = roofBottom - 1;
  const wallLight = shade(style.wall, 0.35);
  const wallShade = shade(style.wall, -0.1);
  c.rect(3, wallTop, W - 6, H - wallTop, style.wall);
  // Lap siding: each 4px board has a light top edge and a shaded underside.
  for (let y = wallTop + 3; y < H - 4; y += 4) {
    c.hline(3, y, W - 6, wallLight);
    c.hline(3, y + 3, W - 6, wallShade);
  }
  // Right side falls into shade; corner boards on both edges.
  c.rect(W - 9, wallTop, 6, H - wallTop, 'rgba(40, 30, 60, 0.12)');
  c.rect(3, wallTop, 2, H - wallTop - 4, trim).rect(W - 5, wallTop, 2, H - wallTop - 4, trimShade);
  if (style.timber) {
    const beam = '#7a5236';
    c.rect(5, wallTop, 2, H - wallTop - 4, beam).rect(W - 7, wallTop, 2, H - wallTop - 4, beam);
    c.rect(3, wallTop + 2, W - 6, 2, beam);
  }
  // Soft shadow under the eaves.
  c.rect(3, wallTop, W - 6, 3, 'rgba(30, 20, 40, 0.25)');
  // Stone foundation.
  c.rect(3, H - 4, W - 6, 4, PAL.stoneDark);
  for (let x = 4; x < W - 4; x += 6) c.rect(x, H - 4, 4, 2, PAL.stone).px(x, H - 4, PAL.stoneLight);

  // --- Roof ------------------------------------------------------------------
  const ramp = [shade(style.roof, 0.28), shade(style.roof, 0.12), style.roof, shade(style.roof, -0.12), shade(style.roof, -0.24)];
  for (let y = top; y < roofBottom - 3; y++) {
    const inset = Math.max(0, Math.round((roofBottom - y) / 7) - 1);
    const t = (y - top) / (roofBottom - 3 - top);
    const band = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
    c.hline(inset, y, W - inset * 2, band);
  }
  // Shingle courses: highlight on top, shadow underneath, staggered seams.
  for (let row = 0; top + row * 4 < roofBottom - 4; row++) {
    const y = top + row * 4;
    const inset = Math.max(0, Math.round((roofBottom - y) / 7) - 1);
    c.hline(inset + 1, y + 3, W - inset * 2 - 2, shade(style.roof, -0.3));
    c.hline(inset + 1, y, W - inset * 2 - 2, shade(style.roof, 0.16 - row * 0.03));
    for (let x = inset + 2 + (row % 2) * 3; x < W - inset - 2; x += 6) c.vline(x, y + 1, 2, shade(style.roof, -0.2));
  }
  // Ridge cap.
  const ridgeInset = Math.max(0, Math.round(34 / 7) - 1);
  c.rect(ridgeInset, top, W - ridgeInset * 2, 2, shade(style.roof, 0.38));
  // Fascia trim along the bottom edge of the roof.
  c.rect(0, roofBottom - 4, W, 3, trim);
  c.hline(0, roofBottom - 2, W, trimShade);
  c.hline(0, roofBottom - 1, W, 'rgba(30, 20, 40, 0.35)');

  // --- Windows ---------------------------------------------------------------
  const doorTile = Math.floor(style.widthTiles / 2);
  const twoFloors = style.floors === 2;
  const windowXs = W >= 96 ? [9, W - 25, 28] : [9, W - 25];
  if (twoFloors) {
    const upperY = wallTop + 6;
    [9, doorTile * 16 + 1, W - 25].forEach((wx) => windowAt(c, wx, upperY, 14, 9));
    // Floor divider band between the storeys.
    const divider = upperY + 15;
    c.rect(3, divider, W - 6, 2, trim);
    c.hline(3, divider + 2, W - 6, trimShade);
    windowXs.forEach((wx) => windowAt(c, wx, divider + 7, 14, 9, style.flowerBox));
  } else {
    windowXs.forEach((wx) => windowAt(c, wx, H - 30, 14, 11, style.flowerBox));
  }

  // --- Door ------------------------------------------------------------------
  const dx = doorTile * 16 + 2;
  const doorTop = H - 22;
  c.rect(dx - 2, doorTop - 2, 16, 22, trim);
  c.vline(dx + 13, doorTop - 2, 22, trimShade);
  c.rect(dx, doorTop, 12, 19, shade(style.door, -0.35)); // recess
  c.rect(dx + 1, doorTop + 1, 10, 18, style.door);
  c.rect(dx + 2, doorTop + 2, 3, 6, shade(style.door, 0.18)).rect(dx + 7, doorTop + 2, 3, 6, shade(style.door, 0.18));
  c.rect(dx + 2, doorTop + 10, 3, 7, shade(style.door, 0.1)).rect(dx + 7, doorTop + 10, 3, 7, shade(style.door, 0.1));
  c.px(dx + 9, doorTop + 10, '#f5d76e').px(dx + 9, doorTop + 11, '#b8902a');
  // Small porch roof.
  c.rect(dx - 4, doorTop - 5, 20, 3, shade(style.roof, -0.1));
  c.hline(dx - 4, doorTop - 5, 20, shade(style.roof, 0.25));
  c.hline(dx - 3, doorTop - 2, 18, 'rgba(30,20,40,0.3)');
  // Stone step.
  c.rect(dx - 1, H - 3, 14, 3, PAL.stoneLight);
  c.hline(dx - 1, H - 1, 14, PAL.stone);

  c.outline();
  return c.canvas;
}

export const LAB_W = 8 * 16;
export const LAB_TOP_PAD = 14;

export function buildLab(): HTMLCanvasElement {
  const W = LAB_W;
  const H = 5 * 16 + LAB_TOP_PAD;
  const c = new PixelCanvas(W, H);
  const top = LAB_TOP_PAD;
  const rng = mulberry32(5);

  // Antenna + dish on the roof.
  c.vline(100, 0, top + 4, '#6b7280');
  c.rect(98, 0, 5, 2, '#e8423f');
  c.ellipse(24, top - 1, 9, 5, '#d8dee6');
  c.ellipse(24, top - 2, 6, 3, '#f2f5f8');
  c.vline(24, top - 1, 6, '#6b7280');

  // Flat roof with solar panels.
  const roofBottom = top + 26;
  c.rect(0, top, W, roofBottom - top, '#5c8ea3');
  c.rect(0, top, W, 2, '#7fb2c6');
  c.rect(0, roofBottom - 3, W, 3, '#3f6d80');
  for (let i = 0; i < 4; i++) {
    const px = 40 + i * 18;
    c.rect(px, top + 5, 15, 13, '#2d3f6b');
    c.rect(px + 1, top + 6, 13, 11, '#3b5590');
    c.hline(px + 1, top + 11, 13, '#2d3f6b').vline(px + 7, top + 6, 11, '#2d3f6b');
    c.px(px + 2, top + 7, '#8fb2ff');
  }

  // Main walls.
  const wallTop = roofBottom;
  c.rect(2, wallTop, W - 4, H - wallTop, '#eef2f5');
  c.rect(2, wallTop, W - 4, 3, '#cfd8df');
  c.rect(2, H - 12, W - 4, 2, '#5c8ea3');
  c.rect(2, H - 4, W - 4, 4, PAL.stoneDark);
  c.speckle(2, H - 4, W - 4, 4, PAL.stone, 0.3, rng);

  // Tall window band.
  const winY = wallTop + 6;
  for (const wx of [8, 26, 82, 100]) {
    c.rect(wx - 1, winY - 1, 20, 20, '#9aa7b2');
    c.rect(wx, winY, 18, 18, PAL.glass);
    c.rect(wx, winY, 18, 4, PAL.glassDark);
    c.vline(wx + 9, winY, 18, '#9aa7b2');
    c.px(wx + 2, winY + 8, PAL.glassLight).px(wx + 3, winY + 7, PAL.glassLight).px(wx + 4, winY + 6, PAL.glassLight);
    c.px(wx + 12, winY + 9, PAL.glassLight).px(wx + 13, winY + 8, PAL.glassLight);
  }

  // Double sliding door spanning tiles 3–4 with a sign above.
  const dx = 50;
  const doorTop = H - 26;
  c.rect(dx - 2, doorTop - 2, 32, 28, '#7c8a96');
  c.rect(dx, doorTop, 28, 24, '#8fd0ea');
  c.rect(dx, doorTop, 28, 5, '#5aa6cf');
  c.vline(dx + 13, doorTop, 24, '#7c8a96').vline(dx + 14, doorTop, 24, '#7c8a96');
  c.px(dx + 3, doorTop + 10, PAL.glassLight).px(dx + 4, doorTop + 9, PAL.glassLight);
  c.px(dx + 18, doorTop + 10, PAL.glassLight).px(dx + 19, doorTop + 9, PAL.glassLight);
  // Sign plate with a flask emblem.
  const sy = wallTop + 4;
  c.rect(dx - 2, sy, 32, 12, '#2f4f6b');
  c.rect(dx - 1, sy + 1, 30, 10, '#3e6a8f');
  c.rect(dx + 12, sy + 2, 4, 3, '#e9f6ff');
  c.rect(dx + 10, sy + 5, 8, 5, '#e9f6ff');
  c.rect(dx + 11, sy + 7, 6, 2, '#6be0a0');
  c.hline(dx + 2, sy + 5, 6, '#9cc4e4').hline(dx + 2, sy + 7, 5, '#9cc4e4');
  c.hline(dx + 20, sy + 5, 6, '#9cc4e4').hline(dx + 21, sy + 7, 5, '#9cc4e4');

  c.outline();
  return c.canvas;
}
