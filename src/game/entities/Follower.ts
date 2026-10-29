// The player's partner Pokémon walking behind them.
//
// Follow rule (the classic one): whenever the player starts a step, the
// follower steps into the tile the player just left. Because that tile was
// walkable for the player, the follower can never end up inside walls, water,
// buildings or off the map, and it never needs real pathfinding.

import Phaser from 'phaser';
import type { Direction, StarterId, TilePos } from '../../types';
import { STARTERS } from '../data/starters';
import { Character, DIR_VECTORS } from './Character';

export class Follower extends Character {
  /** Hidden followers sit "inside" the player until the first step (e.g. after a door). */
  private hidden: boolean;

  constructor(
    scene: Phaser.Scene,
    readonly starter: StarterId,
    x: number,
    y: number,
    facing: Direction,
    hidden = false,
  ) {
    super(scene, STARTERS[starter].overworldSprite, x, y, facing);
    this.hidden = hidden;
    this.setVisible(!hidden);
  }

  override occupies(x: number, y: number): boolean {
    return !this.hidden && super.occupies(x, y);
  }

  /** The player has just started moving away from `from`. */
  follow(from: TilePos, tilesPerSecond: number): void {
    if (this.hidden) {
      // Pop out of the player's tile and trail behind from here on.
      this.hidden = false;
      this.setTile(from.x, from.y, this.facing);
      this.setVisible(true);
      this.sprite.setAlpha(0);
      this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 160 });
      return;
    }
    if (this.isMoving) this.snapToTarget();
    const dx = from.x - this.tile.x;
    const dy = from.y - this.tile.y;
    if (dx === 0 && dy === 0) return;
    const dir = (Object.keys(DIR_VECTORS) as Direction[]).find((d) => DIR_VECTORS[d].x === dx && DIR_VECTORS[d].y === dy);
    if (dir) this.startMove(dir, tilesPerSecond);
    else this.setTile(from.x, from.y); // fell out of step (rare): catch up instantly
  }

  /** Per-frame update; when the player is standing still it looks at them. */
  tick(deltaMs: number, player: Character): void {
    if (this.scripted) {
      this.updateScripted(deltaMs);
      return;
    }
    const { arrived } = this.update(deltaMs);
    if (arrived && !player.isMoving) {
      this.stop();
      this.faceTowards(player.tile);
    }
  }
}
