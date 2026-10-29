// Map registry. Maps are built lazily and cached per player gender, since
// house occupants (and the player's home) depend on it.

import type { MapDefinition, MapId } from '../../types';
import { GameState } from '../state/GameState';
import {
  buildBlueHouse,
  buildLab,
  buildElderHouse,
  buildPinkHouse1F,
  buildPinkHouse2F,
  buildRedHouse1F,
  buildRedHouse2F,
  type MapContext,
} from './interiors';
import { buildTown } from './town';

const builders: Record<MapId, (ctx: MapContext) => MapDefinition> = {
  town: buildTown,
  red_house_1f: buildRedHouse1F,
  red_house_2f: buildRedHouse2F,
  pink_house_1f: buildPinkHouse1F,
  pink_house_2f: buildPinkHouse2F,
  blue_house: buildBlueHouse,
  elder_house: buildElderHouse,
  lab: buildLab,
};

const cache = new Map<string, MapDefinition>();

export function getMap(id: MapId): MapDefinition {
  const ctx: MapContext = { gender: GameState.get().player.gender };
  const key = `${id}:${ctx.gender}`;
  let map = cache.get(key);
  if (!map) {
    map = builders[id](ctx);
    cache.set(key, map);
  }
  return map;
}
