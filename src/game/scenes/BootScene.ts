// Generates every texture and animation procedurally, then starts the world.

import Phaser from 'phaser';
import { buildHouse, buildLab, type HouseStyle } from '../../assets/generators/buildings';
import { buildCharacterSheet, buildEmote, buildShadow, CHAR_H, CHAR_W, FRAMES_PER_DIR } from '../../assets/generators/characters';
import { buildBall, buildCreatureSheet, buildGlow, buildSparkle, CREATURE_H, CREATURE_W } from '../../assets/generators/creatures';
import { buildLabTextures } from '../../assets/generators/labProps';
import { buildPropTextures } from '../../assets/generators/props';
import { buildTileAtlas } from '../../assets/generators/tiles';
import type { Direction, MapId } from '../../types';
import { CHARACTER_LOOKS } from '../data/characterLooks';
import { STARTERS } from '../data/starters';
import { GameState } from '../state/GameState';
import { setTileIndex } from '../systems/TileIndex';

export const SCENE_BOOT = 'Boot';
export const SCENE_WORLD = 'World';

const HOUSES: Record<string, HouseStyle> = {
  house_red: { widthTiles: 5, floors: 2, roof: '#d24b46', wall: '#fbf1dc', door: '#8a5a3a', flowerBox: '#f05d5e' },
  house_blue: { widthTiles: 5, roof: '#3f74c8', wall: '#f1ead8', door: '#5a6f8a' },
  house_pink: { widthTiles: 5, floors: 2, roof: '#e06f92', wall: '#fff4ec', door: '#a35a6e', flowerBox: '#ffd84d' },
  house_elder: { widthTiles: 6, roof: '#5f9c5a', wall: '#efe2c8', door: '#6b4a32', timber: true, flowerBox: '#ffffff' },
};

/** Sheet row order used by the generator; 'right' reuses 'left' flipped. */
const SHEET_DIR: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 2 };

export function animKey(sprite: string, kind: 'walk' | 'idle', dir: Direction): string {
  return `${sprite}_${kind}_${dir === 'right' ? 'left' : dir}`;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_BOOT);
  }

  create(): void {
    const tex = this.textures;

    const atlas = buildTileAtlas();
    tex.addCanvas('tiles', atlas.canvas);
    setTileIndex(atlas.index);

    for (const [key, canvas] of Object.entries(buildPropTextures())) tex.addCanvas(key, canvas);
    for (const [key, style] of Object.entries(HOUSES)) tex.addCanvas(key, buildHouse(style));
    tex.addCanvas('lab', buildLab());
    tex.addCanvas('shadow', buildShadow());
    for (const kind of ['exclaim', 'dots', 'note', 'heart'] as const) tex.addCanvas(`emote_${kind}`, buildEmote(kind));
    for (const [key, canvas] of Object.entries(buildLabTextures())) tex.addCanvas(key, canvas);
    tex.addCanvas('ball_closed', buildBall('closed'));
    tex.addCanvas('ball_open', buildBall('open'));
    tex.addCanvas('sparkle', buildSparkle());
    tex.addCanvas('glow', buildGlow());

    // Starter creatures share the trainer sheet layout, so Character/anim code works unchanged.
    for (const starter of Object.values(STARTERS)) {
      const key = starter.overworldSprite;
      const t = tex.addCanvas(key, buildCreatureSheet(starter.id))!;
      for (let i = 0; i < 3 * FRAMES_PER_DIR; i++) t.add(i, 0, i * CREATURE_W, 0, CREATURE_W, CREATURE_H);
      this.createCharacterAnims(key);
    }

    for (const [key, look] of Object.entries(CHARACTER_LOOKS)) {
      const t = tex.addCanvas(key, buildCharacterSheet(look))!;
      const total = 3 * FRAMES_PER_DIR;
      for (let i = 0; i < total; i++) t.add(i, 0, i * CHAR_W, 0, CHAR_W, CHAR_H);
      this.createCharacterAnims(key);
    }

    const s = GameState.get();
    this.scene.start(SCENE_WORLD, {
      mapId: s.player.currentMap as MapId,
      x: s.player.position.x,
      y: s.player.position.y,
      facing: s.player.facing,
    });
  }

  private createCharacterAnims(key: string): void {
    for (const dir of ['down', 'up', 'left'] as Direction[]) {
      const base = SHEET_DIR[dir] * FRAMES_PER_DIR;
      this.anims.create({
        key: animKey(key, 'walk', dir),
        frames: [base + 1, base, base + 2, base].map((frame) => ({ key, frame })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: animKey(key, 'idle', dir),
        frames: [base, base + 3].map((frame) => ({ key, frame })),
        frameRate: 1.6,
        repeat: -1,
      });
    }
  }
}

export function idleFrame(dir: Direction): number {
  return SHEET_DIR[dir] * FRAMES_PER_DIR;
}
