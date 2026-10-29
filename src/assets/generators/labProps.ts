// Professor's laboratory furniture and equipment (original art).

import { PAL } from './palette';
import { mulberry32, PixelCanvas } from './pixel';

const STEEL = ['#7c8794', '#a4afba', '#c8d1d9', '#eef3f6'] as const;
const TEAL = '#3f8f9a';

/** Long white workbench with glassware and a microscope. */
function bench(variant: number): HTMLCanvasElement {
  const c = new PixelCanvas(32, 28);
  // Cabinet body.
  c.rect(1, 12, 30, 15, '#dfe6ea');
  c.rect(1, 12, 30, 2, '#f6f9fa');
  c.rect(3, 15, 12, 10, '#cdd6dc').rect(17, 15, 12, 10, '#cdd6dc');
  c.hline(3, 15, 12, '#eef3f6').hline(17, 15, 12, '#eef3f6');
  c.rect(13, 19, 1, 3, '#7c8794').rect(18, 19, 1, 3, '#7c8794');
  c.rect(1, 26, 30, 1, '#9aa6b0');
  // Worktop.
  c.rect(0, 9, 32, 4, '#3a4a58');
  c.hline(0, 9, 32, '#5a6c7a');
  if (variant === 0) {
    // Microscope.
    c.rect(5, 6, 6, 3, '#3a3f4b').rect(7, 1, 2, 6, '#2e3340').rect(6, 0, 4, 2, '#5a6070');
    c.px(9, 4, '#8ad0ff');
    // Flasks with coloured liquid.
    c.rect(16, 4, 3, 5, '#cfeefa').rect(16, 6, 3, 3, '#6be0a0');
    c.rect(21, 2, 2, 7, '#cfeefa').rect(21, 5, 2, 4, '#f07a8a');
    c.rect(25, 5, 4, 4, '#cfeefa').rect(25, 7, 4, 2, '#7ab8ff').rect(26, 3, 2, 2, '#cfeefa');
  } else {
    // Test-tube rack and notebook.
    c.rect(3, 6, 12, 3, '#8a5a3a');
    for (let i = 0; i < 4; i++) c.rect(4 + i * 3, 1, 2, 6, '#e8f6fb').rect(4 + i * 3, 4, 2, 3, ['#f0c040', '#6be0a0', '#f07a8a', '#7ab8ff'][i]);
    c.rect(19, 5, 10, 4, '#fbf6ea').hline(20, 6, 7, '#9aa6b0').hline(20, 7, 6, '#9aa6b0');
    c.vline(24, 5, 4, '#c8bfa8');
  }
  c.outline();
  return c.canvas;
}

/** Two-monitor computer bank against the wall. */
function computerBank(frame: number): HTMLCanvasElement {
  const c = new PixelCanvas(32, 32);
  c.rect(0, 16, 32, 15, '#cfd8de');
  c.rect(0, 16, 32, 2, '#eef3f6');
  c.rect(2, 20, 28, 9, '#b8c4cc');
  for (let i = 0; i < 4; i++) c.px(5 + i * 3, 23, i === frame % 4 ? '#6be0a0' : '#4a6a5a');
  c.rect(18, 22, 9, 4, '#3a4a58');
  for (const x of [1, 17]) {
    c.rect(x, 2, 14, 12, '#3a3f4b');
    c.rect(x + 1, 3, 12, 9, frame % 2 ? '#2f6aa0' : '#2a5e94');
    c.rect(x + 2, 4, 6, 1, '#8ad0ff').rect(x + 2, 6, 9, 1, '#5aa0d8').rect(x + 2, 8, 4, 1, '#6be0a0');
    if (x === 17) {
      // A little creature silhouette scanning on screen.
      c.rect(x + 7, 6, 4, 4, frame % 2 ? '#ffd84d' : '#f0b030');
    }
    c.rect(x + 6, 14, 2, 2, '#6a7080');
  }
  c.outline();
  return c.canvas;
}

/** Tall research machine with blinking lights and a gauge. */
function machine(frame: number): HTMLCanvasElement {
  const c = new PixelCanvas(32, 32);
  const rng = mulberry32(3);
  c.rect(1, 2, 30, 29, STEEL[1]);
  c.rect(1, 2, 30, 2, STEEL[3]);
  c.rect(27, 2, 4, 29, STEEL[0]);
  c.rect(4, 6, 14, 10, '#2a3340');
  // Waveform on the display.
  for (let x = 0; x < 12; x++) {
    const y = 11 + Math.round(Math.sin((x + frame * 3) / 1.8) * 2);
    c.px(5 + x, y, '#6be0a0');
  }
  // Gauge.
  c.circle(23, 10, 3.5, '#f4f6f8');
  c.vline(23, 8, 3, '#e8423f');
  // Blinking lights.
  for (let i = 0; i < 5; i++) {
    const on = (i + frame) % 3 === 0 || rng() > 0.6;
    c.rect(5 + i * 4, 20, 2, 2, on ? ['#e8423f', '#ffd84d', '#6be0a0', '#7ab8ff', '#f08a30'][i] : '#4a5560');
  }
  c.rect(4, 25, 20, 3, STEEL[0]);
  c.hline(4, 25, 20, STEEL[2]);
  // Cables trailing to the floor.
  c.rect(28, 20, 2, 11, '#2e3340');
  c.outline();
  return c.canvas;
}

/** Glass specimen tank with rising bubbles. */
function tank(frame: number): HTMLCanvasElement {
  const c = new PixelCanvas(16, 32);
  c.rect(2, 26, 12, 5, STEEL[0]);
  c.hline(2, 26, 12, STEEL[2]);
  c.rect(3, 4, 10, 22, '#9fe4e0');
  c.rect(3, 4, 10, 4, '#cdf4f0');
  c.vline(4, 6, 18, '#e6fbfa');
  // A small plant specimen.
  c.rect(7, 18, 2, 8, '#4a9a3c');
  c.ellipse(8, 17, 3, 2, '#62b452');
  for (const [x, y] of [[6, 22], [10, 16], [8, 11]]) c.px(x, y - frame * 2, '#ffffff');
  c.rect(2, 1, 12, 3, STEEL[1]);
  c.hline(2, 1, 12, STEEL[3]);
  c.outline();
  return c.canvas;
}

/** Display table holding the three starter capsules on lit pedestals. */
function starterTable(): HTMLCanvasElement {
  const c = new PixelCanvas(48, 28);
  c.rect(1, 12, 46, 14, '#3a4a58');
  c.rect(1, 12, 46, 2, '#5a6c7a');
  c.rect(3, 15, 42, 9, '#2e3c48');
  // Teal accent strip with soft glow.
  c.rect(3, 19, 42, 2, TEAL);
  c.hline(3, 19, 42, '#7fd8e0');
  c.rect(1, 25, 46, 2, '#25303a');
  // Tabletop.
  c.rect(0, 8, 48, 5, '#e9eef1');
  c.hline(0, 8, 48, '#ffffff');
  c.hline(0, 12, 48, '#b8c4cc');
  // Three pedestal rings where the capsules rest.
  for (const x of [8, 24, 40]) {
    c.ellipse(x, 10, 6, 2, '#b8c4cc');
    c.ellipse(x, 10, 4.5, 1.4, '#9fe4ec');
  }
  c.outline();
  return c.canvas;
}

/** The Professor's cluttered desk. */
function profDesk(): HTMLCanvasElement {
  const c = new PixelCanvas(32, 26);
  c.rect(1, 10, 30, 15, PAL.woodDark);
  c.rect(1, 10, 30, 3, PAL.wood);
  c.rect(3, 14, 11, 9, PAL.wood).rect(18, 14, 11, 9, PAL.wood);
  c.px(8, 18, '#e8bb86').px(23, 18, '#e8bb86');
  c.rect(0, 7, 32, 4, PAL.woodLight);
  c.hline(0, 7, 32, '#e8bb86');
  // Papers, a lamp and a mug.
  c.rect(3, 4, 9, 4, '#fbf6ea').rect(5, 3, 9, 4, '#ffffff');
  c.hline(6, 4, 6, '#9aa6b0').hline(6, 5, 5, '#9aa6b0');
  c.rect(17, 5, 4, 3, '#e8423f').px(21, 6, '#e8423f');
  c.vline(26, 1, 6, '#3a3f4b');
  c.rect(23, 0, 6, 3, '#2f8f88');
  c.px(25, 3, '#fff6c0').px(26, 3, '#fff6c0');
  c.outline();
  return c.canvas;
}

/** Wall poster: a chart of the three starter silhouettes. */
function poster(): HTMLCanvasElement {
  const c = new PixelCanvas(16, 16);
  c.rect(1, 1, 14, 12, '#fbf6ea');
  c.rect(1, 1, 14, 3, TEAL);
  c.circle(4, 8, 2, '#58aa48');
  c.circle(8, 8, 2, '#ef7a34');
  c.circle(12, 8, 2, '#4aa8e0');
  c.hline(3, 11, 10, '#c8bfa8');
  c.outline();
  return c.canvas;
}

/** Floor emblem: a teal ring with leaf, flame and droplet marks. */
function emblem(): HTMLCanvasElement {
  const c = new PixelCanvas(64, 36);
  c.ellipse(32, 18, 31, 17, '#3f8f9a');
  c.ellipse(32, 18, 28, 15, '#d6eef0');
  c.ellipse(32, 18, 25, 13, '#3f8f9a');
  c.ellipse(32, 18, 23, 12, '#e8f4f5');
  // Leaf.
  c.ellipse(18, 18, 4, 3, '#58aa48');
  c.hline(15, 18, 7, '#357a32');
  // Flame.
  c.ellipse(32, 19, 3.5, 4.5, '#ef7a34');
  c.ellipse(32, 20, 2, 2.5, '#ffd84d');
  c.px(32, 13, '#ef7a34');
  // Droplet.
  c.ellipse(46, 19, 3.5, 3.5, '#4aa8e0');
  c.px(46, 14, '#4aa8e0').rect(45, 15, 3, 2, '#4aa8e0');
  c.px(45, 18, '#d8f2ff');
  // Faded so it reads as a floor decal.
  const out = document.createElement('canvas');
  out.width = c.width;
  out.height = c.height;
  const ctx = out.getContext('2d')!;
  ctx.globalAlpha = 0.55;
  ctx.drawImage(c.canvas, 0, 0);
  return out;
}

/** Soft ceiling-light pool laid on the floor (drawn translucent). */
function lightPool(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 40;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 20, 2, 32, 20, 30);
  g.addColorStop(0, 'rgba(255, 255, 240, 0.32)');
  g.addColorStop(1, 'rgba(255, 255, 240, 0)');
  ctx.fillStyle = g;
  ctx.scale(1, 0.62);
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function buildLabTextures(): Record<string, HTMLCanvasElement> {
  return {
    lab_bench_0: bench(0),
    lab_bench_1: bench(1),
    lab_computer_0: computerBank(0),
    lab_computer_1: computerBank(1),
    lab_machine_0: machine(0),
    lab_machine_1: machine(1),
    lab_tank_0: tank(0),
    lab_tank_1: tank(1),
    starter_table: starterTable(),
    prof_desk: profDesk(),
    lab_poster: poster(),
    light_pool: lightPool(),
    lab_emblem: emblem(),
  };
}

