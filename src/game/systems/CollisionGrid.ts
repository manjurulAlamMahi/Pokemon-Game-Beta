// Static collision for a map: terrain, objects and explicit blockers.
// Dynamic blockers (NPCs, the player) are checked separately by the scene.

import type { GameStateData, GroundType, MapDefinition } from '../../types';

const SOLID_GROUND: ReadonlySet<GroundType> = new Set(['water', 'wall', 'void']);

export class CollisionGrid {
  private solid: boolean[][];

  constructor(
    private map: MapDefinition,
    state?: Readonly<GameStateData>,
  ) {
    this.solid = map.ground.map((row) => row.map((g) => SOLID_GROUND.has(g)));
    const mark = (r: { x: number; y: number; w: number; h: number }) => {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (this.inBounds(x, y)) this.solid[y][x] = true;
        }
      }
    };
    map.objects.filter((o) => !o.when || !state || o.when(state)).forEach((o) => o.solid.forEach(mark));
    map.extraSolids.forEach(mark);
    // Warps are always walkable (house doors sit inside the house footprint).
    map.warps.forEach((w) => {
      if (this.inBounds(w.x, w.y)) this.solid[w.y][w.x] = false;
    });
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.map.width && y < this.map.height;
  }

  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) {
      // Off-map tiles are only enterable when they are a warp (interior exits).
      return this.map.warps.some((w) => w.x === x && w.y === y);
    }
    return !this.solid[y][x];
  }
}
