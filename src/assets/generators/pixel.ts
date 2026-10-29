// Low-level helpers for drawing original pixel art onto canvases at runtime.
// Every texture in the demo is produced through these helpers — no image files.

export type Rng = () => number;

/** Deterministic PRNG so generated art is identical on every load. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PixelCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, color: string): this {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, color: string): this {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    return this;
  }

  clear(x: number, y: number, w: number, h: number): this {
    this.ctx.clearRect(x, y, w, h);
    return this;
  }

  hline(x: number, y: number, w: number, color: string): this {
    return this.rect(x, y, w, 1, color);
  }

  vline(x: number, y: number, h: number, color: string): this {
    return this.rect(x, y, 1, h, color);
  }

  /** Pixel-perfect filled ellipse. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): this {
    this.ctx.fillStyle = color;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.ctx.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }

  /**
   * Ellipse with four-tone spherical shading lit from the upper left.
   * ramp = [dark, mid, light, highlight].
   */
  shadedEllipse(cx: number, cy: number, rx: number, ry: number, ramp: readonly string[]): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const lit = (-dx - dy * 1.3) / 2;
        this.ctx.fillStyle = lit > 0.45 ? ramp[3] : lit > 0.08 ? ramp[2] : lit > -0.4 ? ramp[1] : ramp[0];
        this.ctx.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }

  circle(cx: number, cy: number, r: number, color: string): this {
    return this.ellipse(cx, cy, r, r, color);
  }

  /**
   * Draw a character-coded pattern. Each string is one row; '.' is transparent.
   * Characters missing from the palette are skipped.
   */
  pattern(
    rows: string[],
    palette: Record<string, string | undefined>,
    ox = 0,
    oy = 0,
    flipX = false,
  ): this {
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (!color) continue;
        const x = flipX ? row.length - 1 - i : i;
        this.px(ox + x, oy + y, color);
      }
    });
    return this;
  }

  /** Copy another canvas into this one. */
  blit(src: PixelCanvas | HTMLCanvasElement, dx: number, dy: number, flipX = false): this {
    const el = src instanceof PixelCanvas ? src.canvas : src;
    if (flipX) {
      this.ctx.save();
      this.ctx.translate(dx + el.width, dy);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(el, 0, 0);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(el, dx, dy);
    }
    return this;
  }

  /**
   * Add a 1px outline around every opaque region (4-neighbourhood).
   * Gives sprites the crisp, readable silhouette typical of handheld RPGs.
   */
  outline(color?: string, region?: { x: number; y: number; w: number; h: number }): this {
    const r = region ?? { x: 0, y: 0, w: this.width, h: this.height };
    const img = this.ctx.getImageData(r.x, r.y, r.w, r.h);
    const d = img.data;
    const opaque = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < r.w && y < r.h && d[(y * r.w + x) * 4 + 3] > 200;
    const marks: [number, number, string][] = [];
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        if (opaque(x, y)) continue;
        // Prefer the pixel below/left so outlines take the colour of the
        // material they border ("selective outlining", as on handheld sprites).
        const n = ([[0, 1], [-1, 0], [1, 0], [0, -1]] as const).find(([dx, dy]) => opaque(x + dx, y + dy));
        if (!n) continue;
        if (color) {
          marks.push([x, y, color]);
        } else {
          const i = ((y + n[1]) * r.w + (x + n[0])) * 4;
          marks.push([x, y, selectiveInk(d[i], d[i + 1], d[i + 2])]);
        }
      }
    }
    for (const [x, y, c] of marks) {
      this.ctx.fillStyle = c;
      this.ctx.fillRect(r.x + x, r.y + y, 1, 1);
    }
    return this;
  }

  /** Scatter pixels with a probability, using a seeded RNG. */
  speckle(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    chance: number,
    rng: Rng,
  ): this {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (rng() < chance) this.px(i, j, color);
      }
    }
    return this;
  }
}

/** Dark, hue-tinted outline colour for a material (mixed toward a deep ink). */
function selectiveInk(r: number, g: number, b: number): string {
  const ink = [34, 28, 44];
  const k = 0.42; // how much of the material colour survives
  const mix = (c: number, i: number) => Math.round(c * k * 0.75 + i * (1 - k * 0.75));
  const h = (v: number) => v.toString(16).padStart(2, '0');
  return `#${h(mix(r, ink[0]))}${h(mix(g, ink[1]))}${h(mix(b, ink[2]))}`;
}

/** Lighten/darken a hex colour by a factor (-1..1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  }
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
