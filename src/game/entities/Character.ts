// Base class for anything that walks on the tile grid (player and NPCs).
// Movement is tile-to-tile but interpolated every frame for smoothness.

import Phaser from 'phaser';
import type { Direction, TilePos } from '../../types';
import { animKey, idleFrame } from '../scenes/BootScene';

export const TILE = 16;

export const DIR_VECTORS: Record<Direction, TilePos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function oppositeDir(d: Direction): Direction {
  return ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[d];
}

export class Character {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;

  tile: TilePos;
  facing: Direction;
  private target: TilePos | null = null;
  private progress = 0;
  private tilesPerSecond = 4;
  private bumpTimer = 0;

  constructor(
    protected scene: Phaser.Scene,
    readonly textureKey: string,
    x: number,
    y: number,
    facing: Direction,
  ) {
    this.tile = { x, y };
    this.facing = facing;
    this.shadow = scene.add.image(0, 0, 'shadow').setOrigin(0.5, 0.5).setDepth(2);
    this.sprite = scene.add.sprite(0, 0, textureKey, idleFrame(facing)).setOrigin(0.5, 1);
    this.syncSprite();
    this.playIdle();
  }

  get isMoving(): boolean {
    return this.target !== null;
  }

  /** Tiles this character currently blocks (origin and, while moving, destination). */
  occupies(x: number, y: number): boolean {
    if (this.tile.x === x && this.tile.y === y) return true;
    return !!this.target && this.target.x === x && this.target.y === y;
  }

  facingTile(): TilePos {
    const v = DIR_VECTORS[this.facing];
    return { x: this.tile.x + v.x, y: this.tile.y + v.y };
  }

  face(dir: Direction): void {
    if (this.facing === dir) return;
    this.facing = dir;
    if (!this.isMoving) this.playIdle();
  }

  faceTowards(other: TilePos): void {
    const dx = other.x - this.tile.x;
    const dy = other.y - this.tile.y;
    if (Math.abs(dx) > Math.abs(dy)) this.face(dx > 0 ? 'right' : 'left');
    else this.face(dy > 0 ? 'down' : 'up');
  }

  // --- Scripted movement (cutscenes) ------------------------------------------

  private path: Direction[] = [];
  private pathSpeed = 3.5;
  private pathDone?: () => void;

  /** True while following a cutscene path; normal AI/input should pause. */
  get scripted(): boolean {
    return this.pathDone !== undefined;
  }

  /** Walk a sequence of steps (no collision checks). Resolves on arrival. */
  walkPath(dirs: Direction[], tilesPerSecond = 3.5): Promise<void> {
    this.pathDone?.();
    if (!dirs.length) return Promise.resolve();
    this.path = [...dirs];
    this.pathSpeed = tilesPerSecond;
    return new Promise((resolve) => {
      this.pathDone = resolve;
      if (!this.isMoving) this.startMove(this.path.shift()!, this.pathSpeed);
    });
  }

  /** Per-frame update while scripted. */
  updateScripted(deltaMs: number): void {
    const { arrived, overflow } = this.update(deltaMs);
    if (!arrived) return;
    const next = this.path.shift();
    if (next) {
      this.continueMove(next, this.pathSpeed, overflow);
    } else {
      this.stop();
      const done = this.pathDone;
      this.pathDone = undefined;
      done?.();
    }
  }

  /** Begin moving one tile. Caller is responsible for collision checks. */
  startMove(dir: Direction, tilesPerSecond: number): void {
    const v = DIR_VECTORS[dir];
    this.facing = dir;
    this.target = { x: this.tile.x + v.x, y: this.tile.y + v.y };
    this.tilesPerSecond = tilesPerSecond;
    this.bumpTimer = 0;
    this.playWalk(tilesPerSecond);
  }

  /** Walk-in-place feedback when blocked. */
  bump(dir: Direction): void {
    this.facing = dir;
    this.bumpTimer = 220;
    this.playWalk(2.5);
  }

  /**
   * Advance movement. Returns true on the frame the character arrives on a
   * tile; `overflow` holds leftover progress so continuous walking is seamless.
   */
  update(deltaMs: number): { arrived: boolean; overflow: number } {
    if (this.bumpTimer > 0) {
      this.bumpTimer -= deltaMs;
      if (this.bumpTimer <= 0) this.playIdle();
    }
    if (!this.target) return { arrived: false, overflow: 0 };
    this.progress += (deltaMs / 1000) * this.tilesPerSecond;
    if (this.progress >= 1) {
      const overflow = this.progress - 1;
      this.tile = this.target;
      this.target = null;
      this.progress = 0;
      this.syncSprite();
      return { arrived: true, overflow };
    }
    this.syncSprite();
    return { arrived: false, overflow: 0 };
  }

  /** Continue straight into another step, carrying over leftover progress. */
  continueMove(dir: Direction, tilesPerSecond: number, overflow: number): void {
    const animChanged = dir !== this.facing || tilesPerSecond !== this.tilesPerSecond;
    const v = DIR_VECTORS[dir];
    this.facing = dir;
    this.target = { x: this.tile.x + v.x, y: this.tile.y + v.y };
    this.tilesPerSecond = tilesPerSecond;
    this.progress = Math.min(overflow, 0.5);
    if (animChanged || !this.sprite.anims.isPlaying) this.playWalk(tilesPerSecond);
    this.syncSprite();
  }

  stop(): void {
    this.playIdle();
  }

  /** Instantly finish the current step, keeping the walk animation running. */
  snapToTarget(): void {
    if (!this.target) return;
    this.tile = this.target;
    this.target = null;
    this.progress = 0;
    this.syncSprite();
  }

  setTile(x: number, y: number, facing?: Direction): void {
    this.tile = { x, y };
    this.target = null;
    this.progress = 0;
    if (facing) this.facing = facing;
    this.syncSprite();
    this.playIdle();
  }

  setVisible(v: boolean): void {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }

  protected syncSprite(): void {
    let px = this.tile.x * TILE + TILE / 2;
    let py = this.tile.y * TILE + TILE;
    if (this.target) {
      px += (this.target.x - this.tile.x) * TILE * this.progress;
      py += (this.target.y - this.tile.y) * TILE * this.progress;
    }
    this.sprite.setPosition(Math.round(px), Math.round(py));
    this.sprite.setDepth(py);
    this.shadow.setPosition(Math.round(px), Math.round(py) - 1);
  }

  private playWalk(tilesPerSecond: number): void {
    this.sprite.setFlipX(this.facing === 'right');
    const key = animKey(this.textureKey, 'walk', this.facing);
    this.sprite.anims.play({ key, frameRate: 2 * tilesPerSecond + 1 }, true);
    if (this.sprite.anims.currentAnim?.key === key) this.sprite.anims.msPerFrame = 1000 / (2 * tilesPerSecond + 1);
  }

  protected playIdle(): void {
    this.sprite.setFlipX(this.facing === 'right');
    this.sprite.anims.play(animKey(this.textureKey, 'idle', this.facing), true);
  }
}
