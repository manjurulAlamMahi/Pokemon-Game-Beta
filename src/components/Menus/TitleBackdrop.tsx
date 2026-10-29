// Animated pixel-art landscape behind the menus, drawn with the same
// generators as the game world so the style is consistent from frame one.

import { useEffect, useRef } from 'react';
import { buildPropTextures } from '../../assets/generators/props';
import { buildTileAtlas } from '../../assets/generators/tiles';

const W = 256;
const H = 144;

export function TitleBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;

    const atlas = buildTileAtlas();
    const props = buildPropTextures();
    const tile = (name: string, x: number, y: number) => {
      const i = atlas.index.get(name)!;
      ctx.drawImage(atlas.canvas, (i % 16) * 16, Math.floor(i / 16) * 16, 16, 16, x, y, 16, 16);
    };

    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      // Sky.
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#6ec3f5');
      sky.addColorStop(0.6, '#bfe8ff');
      sky.addColorStop(1, '#e8f7ff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Drifting clouds.
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 71 + t * (4 + i)) % (W + 60)) - 30;
        const cy = 12 + ((i * 37) % 40);
        ctx.fillRect(Math.round(cx), cy, 24, 5);
        ctx.fillRect(Math.round(cx) + 5, cy - 3, 12, 4);
        ctx.fillRect(Math.round(cx) + 14, cy - 2, 6, 3);
      }

      // Far hills.
      ctx.fillStyle = '#8fd27a';
      for (let x = 0; x < W; x++) {
        const h = 70 + Math.round(Math.sin(x / 23) * 6 + Math.sin(x / 9) * 2);
        ctx.fillRect(x, h, 1, H - h);
      }
      ctx.fillStyle = '#6fbf5a';
      for (let x = 0; x < W; x++) {
        const h = 84 + Math.round(Math.sin(x / 31 + 2) * 5);
        ctx.fillRect(x, h, 1, H - h);
      }

      // Ground tiles.
      const frame = Math.floor(t / 0.85) % 2;
      for (let y = 96; y < H; y += 16) {
        for (let x = 0; x < W; x += 16) {
          const inGrass = y >= 112 && (x < 80 || x >= 176);
          const onPath = x >= 112 && x < 144;
          tile(onPath ? 'path_0' : inGrass ? `tallgrass_${frame}` : `grass_${(x / 16 + y / 16) % 3}`, x, y);
        }
      }
      // Trees framing the scene.
      for (const [x, y, k] of [
        [-8, 66, 'tree_pine'],
        [18, 62, 'tree_round'],
        [44, 70, 'tree_autumn'],
        [190, 64, 'tree_round'],
        [216, 60, 'tree_pine'],
        [238, 70, 'tree_round'],
      ] as const) {
        ctx.drawImage(props[k], x, y);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} width={W} height={H} className="title-backdrop" />;
}
