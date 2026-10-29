// Renders one frame of a generated sprite sheet (or any canvas), scaled up crisply.
// Used by menus and the dialogue/starter UI so React shows the same art as the game.

import { useEffect, useRef } from 'react';
import { getSheet } from './sheets';

interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  /** Character look key or creature overworld sprite key. */
  look: string;
  frame: number;
  scale?: number;
  /** Optional sub-rectangle of the frame (e.g. head-and-shoulders portraits). */
  crop?: Crop;
  className?: string;
}

export function PixelSprite({ look, frame, scale = 6, crop, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sheet = getSheet(look);
  const c = crop ?? { x: 0, y: 0, w: sheet?.frameW ?? 16, h: sheet?.frameH ?? 16 };

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !sheet) return;
    ctx.clearRect(0, 0, c.w, c.h);
    ctx.drawImage(sheet.canvas, frame * sheet.frameW + c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
  }, [sheet, frame, c.x, c.y, c.w, c.h]);

  return (
    <canvas
      ref={ref}
      width={c.w}
      height={c.h}
      className={`pixel-sprite ${className ?? ''}`}
      style={{ width: c.w * scale, height: c.h * scale }}
    />
  );
}

/** Draws an existing canvas scaled up with nearest-neighbour filtering. */
export function PixelCanvasView({ source, scale, className }: { source: HTMLCanvasElement; scale: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, source.width, source.height);
    ctx.drawImage(source, 0, 0);
  }, [source]);
  return (
    <canvas
      ref={ref}
      width={source.width}
      height={source.height}
      className={`pixel-sprite ${className ?? ''}`}
      style={{ width: source.width * scale, height: source.height * scale }}
    />
  );
}
