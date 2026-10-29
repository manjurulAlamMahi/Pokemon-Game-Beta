// Reusable visual effects for story scenes: capsule throws, openings,
// materialising creatures, recalls, hologram previews and emotes.

import Phaser from 'phaser';
import type { StarterId } from '../../types';
import { STARTERS } from '../data/starters';
import { idleFrame } from '../scenes/BootScene';
import { Sfx } from './Sfx';

const FX_DEPTH = 5e5;

export interface Point {
  x: number;
  y: number;
}

const tweenP = (scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig) =>
  new Promise<void>((resolve) => scene.tweens.add({ ...cfg, onComplete: () => resolve() }));

const waitMs = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));

/** Floating emote bubble that tracks a sprite. */
export function emote(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, kind: 'exclaim' | 'dots' | 'note' | 'heart', ms = 1000): void {
  const e = scene.add.image(target.x, target.y - target.height - 2, `emote_${kind}`).setOrigin(0.5, 1).setDepth(FX_DEPTH);
  const follow = () => e.setPosition(target.x, target.y - target.height - 2 + (e.getData('dy') ?? 0));
  scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
  e.setScale(0.2);
  scene.tweens.add({ targets: e, scale: 1, duration: 160, ease: 'Back.easeOut' });
  scene.time.delayedCall(ms, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, follow);
    e.destroy();
  });
}

/** Throw a capsule along an arc; resolves when it lands (returns the ball). */
export async function throwBall(scene: Phaser.Scene, from: Point, to: Point, durationMs = 520): Promise<Phaser.GameObjects.Image> {
  const ball = scene.add.image(from.x, from.y, 'ball_closed').setDepth(FX_DEPTH);
  Sfx.ballThrow();
  const arc = Math.max(18, Math.abs(to.y - from.y) * 0.6 + 14);
  const prog = { t: 0 };
  await tweenP(scene, {
    targets: prog,
    t: 1,
    duration: durationMs,
    ease: 'Sine.easeInOut',
    onUpdate: () => {
      const t = prog.t;
      ball.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * arc);
      ball.setAngle(t * 540);
    },
  });
  ball.setAngle(0);
  // Little landing bounce and wobble.
  await tweenP(scene, { targets: ball, y: to.y - 4, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  await tweenP(scene, { targets: ball, angle: { from: -18, to: 18 }, duration: 110, yoyo: true, repeat: 1 });
  ball.setAngle(0);
  return ball;
}

/** Burst a capsule open with a flash, ring and sparkles. */
export async function openBall(scene: Phaser.Scene, ball: Phaser.GameObjects.Image): Promise<void> {
  ball.setTexture('ball_open');
  Sfx.ballOpen();
  const { x, y } = ball;
  const glow = scene.add.image(x, y - 4, 'glow').setDepth(FX_DEPTH - 1).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
  scene.tweens.add({ targets: glow, scale: 2.2, alpha: { from: 1, to: 0 }, duration: 520, ease: 'Cubic.easeOut', onComplete: () => glow.destroy() });
  const ring = scene.add.graphics().setDepth(FX_DEPTH - 1);
  const r = { v: 2, a: 1 };
  scene.tweens.add({
    targets: r,
    v: 26,
    a: 0,
    duration: 420,
    ease: 'Cubic.easeOut',
    onUpdate: () => {
      ring.clear().lineStyle(1.5, 0xfff4c0, r.a).strokeEllipse(x, y, r.v * 2, r.v * 1.2);
    },
    onComplete: () => ring.destroy(),
  });
  sparkleBurst(scene, x, y - 6, 14);
  await waitMs(scene, 140);
  scene.tweens.add({ targets: ball, alpha: 0, scale: 0.4, y: y - 6, duration: 260, delay: 120, onComplete: () => ball.destroy() });
}

export function sparkleBurst(scene: Phaser.Scene, x: number, y: number, count = 12): void {
  Sfx.sparkle();
  const p = scene.add.particles(x, y, 'sparkle', {
    speed: { min: 30, max: 90 },
    angle: { min: 0, max: 360 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: { min: 380, max: 700 },
    gravityY: 40,
    emitting: false,
  });
  p.setDepth(FX_DEPTH);
  p.explode(count);
  scene.time.delayedCall(900, () => p.destroy());
}

/** Grow a creature sprite out of a white silhouette. */
export async function materialize(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, starter: StarterId): Promise<void> {
  sprite.setScale(0.1).setTintFill(0xffffff);
  await tweenP(scene, { targets: sprite, scale: 1, duration: 360, ease: 'Back.easeOut' });
  await waitMs(scene, 90);
  sprite.clearTint();
  Sfx.cry(STARTERS[starter].cry);
  // Happy hop.
  const baseY = sprite.y;
  await tweenP(scene, { targets: sprite, y: baseY - 4, duration: 110, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  sprite.y = baseY;
}

/** Beam a creature back into its capsule toward `to`. */
export async function recall(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, to: Point): Promise<void> {
  Sfx.recall();
  const beam = scene.add.graphics().setDepth(FX_DEPTH - 1);
  beam.lineStyle(2, 0xff6a6a, 0.9).lineBetween(to.x, to.y, sprite.x, sprite.y - 8);
  sprite.setTintFill(0xff5050);
  await tweenP(scene, { targets: sprite, scale: 0, alpha: 0.4, duration: 300, ease: 'Cubic.easeIn' });
  beam.destroy();
}

/** Translucent floating preview of a starter above its capsule. */
export function hologram(scene: Phaser.Scene, starter: StarterId, x: number, y: number): { destroy(): void } {
  const key = STARTERS[starter].overworldSprite;
  const glow = scene.add.image(x, y + 2, 'glow').setDepth(FX_DEPTH - 2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setScale(0.7, 0.35);
  const sprite = scene.add.sprite(x, y, key, idleFrame('down')).setOrigin(0.5, 1).setDepth(FX_DEPTH - 1);
  sprite.play(`${key}_idle_down`);
  sprite.setAlpha(0).setScale(0.6);
  scene.tweens.add({ targets: sprite, alpha: 0.85, scale: 1, duration: 220, ease: 'Back.easeOut' });
  const bob = scene.tweens.add({ targets: sprite, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const pulse = scene.tweens.add({ targets: glow, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
  return {
    destroy() {
      bob.stop();
      pulse.stop();
      scene.tweens.add({ targets: [sprite, glow], alpha: 0, duration: 140, onComplete: () => (sprite.destroy(), glow.destroy()) });
    },
  };
}
