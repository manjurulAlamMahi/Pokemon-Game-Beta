// Lookup from tile name (e.g. "path_5", "water_3_1") to tileset index.
// Populated by the BootScene once the tileset has been generated.

let index = new Map<string, number>();

export function setTileIndex(next: Map<string, number>): void {
  index = next;
}

export function tileIndex(name: string): number {
  const i = index.get(name);
  if (i === undefined) throw new Error(`Unknown tile "${name}"`);
  return i;
}
