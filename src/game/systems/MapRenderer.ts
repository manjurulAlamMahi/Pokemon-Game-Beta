// Turns a MapDefinition into Phaser objects: an auto-tiled ground layer,
// depth-sorted props/buildings, and animated tiles (water, flowers, grass).

import Phaser from 'phaser';
import { EDGE, FLOWER_FRAMES, TALLGRASS_FRAMES, WATER_FRAMES } from '../../assets/generators/tiles';
import type { GameStateData, GroundType, MapDefinition } from '../../types';
import { tileIndex } from './TileIndex';

const T = 16;

interface AnimatedTile {
  x: number;
  y: number;
  frames: number[];
  periodMs: number;
  /** Offset the phase per tile so plants sway out of sync. */
  stagger: boolean;
}

export class MapRenderer {
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private animated: AnimatedTile[] = [];
  private elapsed = 0;
  private byId = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>();

  constructor(
    private scene: Phaser.Scene,
    private map: MapDefinition,
    private state: Readonly<GameStateData>,
  ) {}

  /** A placed object with an id (e.g. a starter capsule), if it is still present. */
  getObject(id: string): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | undefined {
    const o = this.byId.get(id);
    return o?.active ? o : undefined;
  }

  build(): void {
    this.buildGround();
    this.buildObjects();
    if (this.map.kind === 'indoor') this.buildRoomFrame();
  }

  /** Dark frame around interiors so rooms read as boxes floating in the void. */
  private buildRoomFrame(): void {
    const w = this.map.width * T;
    const h = this.map.height * T;
    const g = this.scene.add.graphics().setDepth(0);
    g.fillStyle(0x2a2433).fillRect(-4, -4, w + 8, 4).fillRect(-4, 0, 4, h + 4).fillRect(w, 0, 4, h + 4);
    g.fillRect(-4, h, w + 8, 6);
    g.fillStyle(0x4a3a40).fillRect(0, h, w, 3);
    // Opening for the front door below the mat.
    const door = this.map.warps.find((wp) => wp.y >= this.map.height);
    if (door) g.fillStyle(0x6b4a32).fillRect(door.x * T + 1, h, T - 2, 6);
  }

  update(deltaMs: number): void {
    this.elapsed += deltaMs;
    for (const a of this.animated) {
      const offset = a.stagger ? ((a.x * 7 + a.y * 13) % 5) * 130 : 0;
      const phase = Math.floor((this.elapsed + offset) / a.periodMs) % a.frames.length;
      const idx = a.frames[phase];
      const tile = this.layer.getTileAt(a.x, a.y);
      if (tile && tile.index !== idx) tile.index = idx;
    }
  }

  private ground(x: number, y: number): GroundType | null {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return null;
    return this.map.ground[y][x];
  }

  /** Edge mask: bit set where the neighbour is a different terrain. */
  private edgeMask(x: number, y: number, same: (g: GroundType | null) => boolean): number {
    let m = 0;
    if (!same(this.ground(x, y - 1))) m |= EDGE.N;
    if (!same(this.ground(x + 1, y))) m |= EDGE.E;
    if (!same(this.ground(x, y + 1))) m |= EDGE.S;
    if (!same(this.ground(x - 1, y))) m |= EDGE.W;
    return m;
  }

  private buildGround(): void {
    const { width, height, theme } = this.map;
    const data: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const g = this.map.ground[y][x];
        const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        let names: string[];
        let period = 0;
        switch (g) {
          case 'grass':
            names = [`grass_${hash % 7 < 4 ? 0 : (hash % 7) - 3}`];
            break;
          case 'path':
            // Map edges count as path so trails can run off-screen cleanly.
            names = [`path_${this.edgeMask(x, y, (n) => n === 'path' || n === null)}`];
            break;
          case 'water': {
            const m = this.edgeMask(x, y, (n) => n === 'water');
            names = Array.from({ length: WATER_FRAMES }, (_, f) => `water_${m}_${f}`);
            period = 420;
            break;
          }
          case 'tallgrass':
            names = Array.from({ length: TALLGRASS_FRAMES }, (_, f) => `tallgrass_${f}`);
            period = 850;
            break;
          case 'flowers_red':
          case 'flowers_yellow':
          case 'flowers_white':
            names = Array.from({ length: FLOWER_FRAMES }, (_, f) => `${g}_${f}`);
            period = 700;
            break;
          case 'floor':
            names = [`floor_${theme}`];
            break;
          case 'wall':
            names = [this.ground(x, y + 1) === 'wall' ? `wall_top_${theme}` : `wall_face_${theme}`];
            break;
          default:
            names = ['void'];
        }
        const frames = names.map(tileIndex);
        row.push(frames[0]);
        if (frames.length > 1) this.animated.push({ x, y, frames, periodMs: period, stagger: g !== 'water' });
      }
      data.push(row);
    }

    const tilemap = this.scene.make.tilemap({ data, tileWidth: T, tileHeight: T });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', T, T, 0, 0)!;
    this.layer = tilemap.createLayer(0, tileset, 0, 0)!;
    this.layer.setDepth(0);
  }

  private buildObjects(): void {
    for (const o of this.map.objects) {
      if (o.when && !o.when(this.state)) continue;
      const img = o.anim
        ? this.scene.add.sprite(o.px, o.py, o.anim.frames[0]).play(this.ensureAnim(o.anim.frames, o.anim.rate))
        : this.scene.add.image(o.px, o.py, o.texture);
      img.setOrigin(0, 0);
      img.setDepth(o.flat ? 1 : (o.depthY ?? o.py + img.height));
      if (o.id) this.byId.set(o.id, img);
    }
  }

  private ensureAnim(frames: string[], rate: number): string {
    const key = `obj_${frames.join('_')}`;
    if (!this.scene.anims.exists(key)) {
      this.scene.anims.create({ key, frames: frames.map((k) => ({ key: k })), frameRate: rate, repeat: -1 });
    }
    return key;
  }
}
