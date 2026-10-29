// The player character: grid movement with classic handheld-RPG feel
// (tap to turn in place, hold to walk, Shift to run, bump when blocked).

import Phaser from 'phaser';
import type { Direction, Gender, TilePos } from '../../types';
import { Sfx } from '../systems/Sfx';
import { Character, DIR_VECTORS } from './Character';

const WALK_SPEED = 4.2; // tiles per second
const RUN_SPEED = 7.5;
const TURN_DELAY_MS = 90;
const BUMP_REPEAT_MS = 320;

export interface PlayerWorld {
  canEnter(x: number, y: number): boolean;
  /** Called whenever the player lands on a tile. Return true to halt (e.g. warp). */
  onArrive(tile: TilePos): boolean;
  /** Called when movement is blocked. */
  onBlocked(target: TilePos, dir: Direction): void;
  /** Called as the player starts a step away from `from` (drives the follower). */
  onStep?(from: TilePos, tilesPerSecond: number): void;
}

export class Player extends Character {
  private turnTimer = 0;
  private bumpCooldown = 0;
  private wasHolding = false;
  frozen = false;

  constructor(scene: Phaser.Scene, gender: Gender, x: number, y: number, facing: Direction) {
    super(scene, `player_${gender}`, x, y, facing);
  }

  control(deltaMs: number, dir: Direction | null, running: boolean, world: PlayerWorld): void {
    this.bumpCooldown -= deltaMs;
    const speed = running ? RUN_SPEED : WALK_SPEED;
    const { arrived, overflow } = this.update(deltaMs);

    if (arrived) {
      if (world.onArrive(this.tile)) {
        this.stop();
        return;
      }
      if (dir && !this.frozen) {
        const t = this.next(dir);
        if (world.canEnter(t.x, t.y)) {
          world.onStep?.({ ...this.tile }, speed);
          this.continueMove(dir, speed, overflow);
          return;
        }
      }
      this.stop();
    }

    if (this.isMoving) return;
    if (!dir || this.frozen) {
      this.wasHolding = false;
      this.turnTimer = 0;
      return;
    }

    // Tapping a new direction from rest just turns the player.
    if (!this.wasHolding && dir !== this.facing) {
      this.face(dir);
      this.turnTimer = TURN_DELAY_MS;
      this.wasHolding = true;
      return;
    }
    this.wasHolding = true;
    if (this.turnTimer > 0) {
      this.turnTimer -= deltaMs;
      if (this.turnTimer > 0) return;
    }

    const target = this.next(dir);
    if (world.canEnter(target.x, target.y)) {
      world.onStep?.({ ...this.tile }, speed);
      this.startMove(dir, speed);
    } else {
      this.face(dir);
      if (this.bumpCooldown <= 0) {
        this.bumpCooldown = BUMP_REPEAT_MS;
        this.bump(dir);
        Sfx.bump();
      }
      world.onBlocked(target, dir);
    }
  }

  private next(dir: Direction): TilePos {
    const v = DIR_VECTORS[dir];
    return { x: this.tile.x + v.x, y: this.tile.y + v.y };
  }
}
