// Small ambient touches that make the town feel alive: chimney smoke and
// butterflies drifting over flower beds. Purely decorative, no collision.

import Phaser from 'phaser';
import type { MapDefinition } from '../../types';

const T = 16;

export function addAmbientLife(scene: Phaser.Scene, map: MapDefinition): void {
  if (map.kind !== 'outdoor') return;

  // Chimney smoke for every house (chimney sits 26px from the sprite's right edge).
  for (const o of map.objects) {
    if (!o.texture.startsWith('house_')) continue;
    const width = scene.textures.get(o.texture).getSourceImage().width;
    const x = o.px + width - 22;
    const y = o.py + 2;
    scene.time.addEvent({
      delay: 1100,
      loop: true,
      startAt: Math.random() * 1000,
      callback: () => puff(scene, x, y),
    });
  }

  // Sleepy "z"s drifting up from the dozing dragon.
  for (const o of map.objects) {
    if (o.texture !== 'dragon_0') continue;
    scene.time.addEvent({ delay: 1500, loop: true, callback: () => floatZ(scene, o.px + 12, o.py + 12) });
  }

  // Butterflies hovering near flower tiles.
  const flowerTiles: { x: number; y: number }[] = [];
  map.ground.forEach((row, y) =>
    row.forEach((g, x) => {
      if (g.startsWith('flowers_')) flowerTiles.push({ x, y });
    }),
  );
  const picks = [0.15, 0.45, 0.7, 0.9].map((f) => flowerTiles[Math.floor(f * flowerTiles.length)]).filter(Boolean);
  picks.forEach((tile, i) => butterfly(scene, tile.x * T + 8, tile.y * T + 4, i % 2 ? 'yellow' : 'white', i));
}

function puff(scene: Phaser.Scene, x: number, y: number): void {
  const p = scene.add.image(x, y, 'smoke').setDepth(1e5).setAlpha(0.85).setScale(0.6);
  scene.tweens.add({
    targets: p,
    y: y - 16,
    x: x + 5,
    alpha: 0,
    scale: 1.3,
    duration: 2200,
    ease: 'Sine.easeOut',
    onComplete: () => p.destroy(),
  });
}

function floatZ(scene: Phaser.Scene, x: number, y: number): void {
  const z = scene.add.image(x, y, 'sleep_z').setDepth(1e5).setScale(0.6).setAlpha(0);
  scene.tweens.add({
    targets: z,
    x: x - 8,
    y: y - 18,
    scale: 1,
    alpha: { from: 1, to: 0 },
    duration: 2400,
    ease: 'Sine.easeOut',
    onComplete: () => z.destroy(),
  });
}

function butterfly(scene: Phaser.Scene, cx: number, cy: number, color: string, seed: number): void {
  const key = `butterfly_${color}`;
  if (!scene.anims.exists(key)) {
    scene.anims.create({ key, frames: [{ key: `${key}_0` }, { key: `${key}_1` }], frameRate: 9, repeat: -1 });
  }
  const b = scene.add.sprite(cx, cy, `${key}_0`).play(key).setDepth(1e5);
  let t = seed * 1.7;
  const onUpdate = (_time: number, delta: number) => {
    t += delta / 1000;
    // Lazy figure-of-eight with a little vertical bob.
    b.setPosition(Math.round(cx + Math.sin(t * 0.7) * 22), Math.round(cy + Math.sin(t * 1.4) * 8 + Math.sin(t * 6) * 1.5));
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
}
