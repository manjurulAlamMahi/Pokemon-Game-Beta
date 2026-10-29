// Data-driven NPC: appearance, dialogue and movement come from NpcDefinition.

import Phaser from 'phaser';
import type { Direction, NpcDefinition, NpcSpawn, TilePos } from '../../types';
import { Character, DIR_VECTORS } from './Character';

const DIRS: Direction[] = ['up', 'down', 'left', 'right'];
const BASE_TILES_PER_SECOND = 3.2;

export interface NpcWorld {
  /** True when an NPC may step onto the tile. */
  canEnter(x: number, y: number, who: Npc): boolean;
}

export class Npc extends Character {
  private behaviorTimer: number;
  private talking = false;
  private resumeTimer = 0;
  private readonly home: TilePos;
  private emote?: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly def: NpcDefinition,
    private readonly spawn: NpcSpawn,
  ) {
    super(scene, def.sprite, spawn.x, spawn.y, spawn.facing);
    this.home = { x: spawn.x, y: spawn.y };
    this.behaviorTimer = this.interval() * (0.5 + Math.random());
    // De-sync idle breathing between NPCs.
    this.sprite.anims.setProgress(Math.random());
  }

  /** Begin a conversation: stop wandering and look at the player. */
  beginTalk(player: TilePos): void {
    this.talking = true;
    this.faceTowards(player);
  }

  endTalk(): void {
    this.talking = false;
    this.resumeTimer = 1200;
  }

  showEmote(kind: 'exclaim' | 'dots', durationMs = 900): void {
    this.emote?.destroy();
    const e = this.scene.add
      .image(this.sprite.x, this.sprite.y - 27, `emote_${kind}`)
      .setOrigin(0.5, 1)
      .setDepth(1e6);
    this.emote = e;
    this.scene.tweens.add({ targets: e, y: e.y - 3, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.time.delayedCall(durationMs, () => {
      if (this.emote === e) this.emote = undefined;
      e.destroy();
    });
  }

  tick(deltaMs: number, world: NpcWorld): void {
    if (this.scripted) {
      this.updateScripted(deltaMs);
      if (this.emote) this.emote.setPosition(this.sprite.x, this.sprite.y - 25);
      return;
    }
    const { arrived } = this.update(deltaMs);
    if (arrived) this.stop();
    if (this.emote) this.emote.setPosition(this.sprite.x, this.sprite.y - 25);
    if (this.talking || this.isMoving) return;

    if (this.resumeTimer > 0) {
      this.resumeTimer -= deltaMs;
      // Static NPCs drift back to their original pose after a chat.
      if (this.resumeTimer <= 0 && this.def.movement.type === 'static') this.face(this.spawn.facing);
      return;
    }

    this.behaviorTimer -= deltaMs;
    if (this.behaviorTimer > 0) return;
    this.behaviorTimer = this.interval() * (0.6 + Math.random() * 0.8);

    const m = this.def.movement;
    if (m.type === 'look-around') {
      this.face(DIRS[Math.floor(Math.random() * DIRS.length)]);
    } else if (m.type === 'wander') {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
      const v = DIR_VECTORS[dir];
      const nx = this.tile.x + v.x;
      const ny = this.tile.y + v.y;
      const inRange = Math.abs(nx - this.home.x) <= m.radius && Math.abs(ny - this.home.y) <= m.radius;
      if (inRange && world.canEnter(nx, ny, this)) {
        this.startMove(dir, BASE_TILES_PER_SECOND / (this.def.walkSpeed ?? 1));
      } else {
        this.face(dir);
      }
    }
  }

  private interval(): number {
    const m = this.def.movement;
    return m.type === 'static' ? Infinity : (m.interval ?? 3000);
  }

  override destroy(): void {
    this.emote?.destroy();
    super.destroy();
  }
}
