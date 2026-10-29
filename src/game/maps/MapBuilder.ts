// Fluent helper for authoring maps in code. Map files describe *what* is
// where; this class turns that into a plain MapDefinition data object.

import { HOUSE_TOP_PAD, LAB_TOP_PAD } from '../../assets/generators/buildings';
import type {
  Direction,
  DialogueScript,
  GroundType,
  Interactable,
  MapDefinition,
  MapId,
  NpcSpawn,
  PlacedObject,
  SolidRect,
  Warp,
} from '../../types';

export const T = 16;

type TreeKind = 'round' | 'autumn' | 'pine';

export class MapBuilder {
  private ground: GroundType[][];
  private objects: PlacedObject[] = [];
  private extraSolids: SolidRect[] = [];
  private interactables: Interactable[] = [];
  private warps: Warp[] = [];
  private npcs: NpcSpawn[] = [];
  private fences = new Set<string>();

  constructor(
    private id: MapId,
    private displayName: string,
    private width: number,
    private height: number,
    private kind: 'outdoor' | 'indoor',
    private theme = 0,
  ) {
    this.ground = Array.from({ length: height }, () => Array<GroundType>(width).fill('grass'));
  }

  // --- Ground -------------------------------------------------------------

  fill(type: GroundType): this {
    return this.rect(0, 0, this.width, this.height, type);
  }

  rect(x: number, y: number, w: number, h: number, type: GroundType): this {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (this.inBounds(i, j)) this.ground[j][i] = type;
      }
    }
    return this;
  }

  tile(x: number, y: number, type: GroundType): this {
    return this.rect(x, y, 1, 1, type);
  }

  // --- Objects ------------------------------------------------------------

  object(obj: PlacedObject): this {
    this.objects.push(obj);
    return this;
  }

  /** A 1x1-footprint prop whose sprite bottom sits on the tile bottom. */
  prop(texture: string, x: number, y: number, opts: { solid?: boolean; spriteH?: number; spriteW?: number } = {}): this {
    const h = opts.spriteH ?? T;
    const w = opts.spriteW ?? T;
    return this.object({
      texture,
      px: x * T,
      py: (y + 1) * T - h,
      solid: opts.solid === false ? [] : [{ x, y, w: Math.ceil(w / T), h: 1 }],
    });
  }

  /** Decorative sprite with explicit footprint (furniture etc). */
  furniture(texture: string, px: number, py: number, solid: SolidRect[], flat = false): this {
    return this.object({ texture, px, py, solid, flat });
  }

  /** 2x2 tree; (x, y) is the top-left tile of its footprint. */
  tree(x: number, y: number, kind: TreeKind = 'round'): this {
    return this.object({
      texture: `tree_${kind}`,
      px: x * T,
      py: y * T - 8,
      solid: [{ x, y, w: 2, h: 2 }],
    });
  }

  trees(positions: [number, number, TreeKind?][]): this {
    positions.forEach(([x, y, k]) => this.tree(x, y, k));
    return this;
  }

  /**
   * A 4-tile-tall house. The door is on the bottom row, centre tile, and
   * becomes a warp into `interior`.
   */
  house(
    texture: string,
    x: number,
    y: number,
    widthTiles: number,
    interior?: Warp['to'],
    heightTiles = 4,
  ): { doorX: number; doorY: number } {
    const doorX = x + Math.floor(widthTiles / 2);
    const doorY = y + heightTiles - 1;
    this.object({
      texture,
      px: x * T,
      py: y * T - HOUSE_TOP_PAD,
      solid: [
        { x, y, w: widthTiles, h: heightTiles - 1 },
        { x, y: doorY, w: doorX - x, h: 1 },
        { x: doorX + 1, y: doorY, w: x + widthTiles - doorX - 1, h: 1 },
      ],
    });
    if (interior) this.warp(doorX, doorY, interior);
    return { doorX, doorY };
  }

  lab(x: number, y: number): { doorX: number; doorY: number } {
    this.object({
      texture: 'lab',
      px: x * T,
      py: y * T - LAB_TOP_PAD,
      solid: [{ x, y, w: 8, h: 5 }],
    });
    return { doorX: x + 3, doorY: y + 4 };
  }

  fenceLine(x1: number, y1: number, x2: number, y2: number): this {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) this.fences.add(`${x},${y}`);
    }
    return this;
  }

  // --- Logic --------------------------------------------------------------

  solid(x: number, y: number, w = 1, h = 1): this {
    this.extraSolids.push({ x, y, w, h });
    return this;
  }

  interact(
    id: string,
    x: number,
    y: number,
    script: DialogueScript,
    opts: { w?: number; h?: number; speaker?: string; action?: Interactable['action'] } = {},
  ): this {
    for (let j = 0; j < (opts.h ?? 1); j++) {
      for (let i = 0; i < (opts.w ?? 1); i++) {
        this.interactables.push({ id, x: x + i, y: y + j, script, speaker: opts.speaker, action: opts.action });
      }
    }
    return this;
  }

  /** A sign post that shows `script` when read. */
  sign(id: string, x: number, y: number, script: DialogueScript): this {
    this.prop('sign', x, y);
    return this.interact(id, x, y, script);
  }

  warp(x: number, y: number, to: Warp['to']): this {
    this.warps.push({ x, y, to });
    return this;
  }

  npc(npcId: string, x: number, y: number, facing: Direction = 'down', when?: NpcSpawn['when']): this {
    this.npcs.push({ npcId, x, y, facing, when });
    return this;
  }

  build(): MapDefinition {
    // Resolve fence auto-tiling.
    for (const key of this.fences) {
      const [x, y] = key.split(',').map(Number);
      const has = (dx: number, dy: number) => this.fences.has(`${x + dx},${y + dy}`);
      const mask = (has(0, -1) ? 1 : 0) | (has(1, 0) ? 2 : 0) | (has(0, 1) ? 4 : 0) | (has(-1, 0) ? 8 : 0);
      this.objects.push({ texture: `fence_${mask}`, px: x * T, py: y * T, solid: [{ x, y, w: 1, h: 1 }] });
    }
    return {
      id: this.id,
      displayName: this.displayName,
      width: this.width,
      height: this.height,
      kind: this.kind,
      theme: this.theme,
      ground: this.ground,
      objects: this.objects,
      extraSolids: this.extraSolids,
      interactables: this.interactables,
      warps: this.warps,
      npcs: this.npcs,
    };
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}
