// House interiors. Every room shares a 10x8 shell (2 wall rows) so new rooms
// are quick to author.
//
// The red and pink houses are two-storey family homes. Which family lives in
// which one depends on the player's gender (as in Emerald): the player's home
// is red for a boy and pink for a girl; Z's family (the Wrens) lives in
// the other one.

import type { DialogueScript, Gender, MapDefinition, MapId, StarterId, Warp } from '../../types';
import { STARTER_ORDER } from '../data/starters';
import { oppositeSprite } from '../data/trainers';
import { SCRIPTS } from '../dialogue/scripts';
import { MapBuilder, T } from './MapBuilder';

export interface MapContext {
  gender: Gender;
}

const ROOM_W = 10;
const ROOM_H = 8;
const MAT_X = 4;
const STAIRS_X = 9;
const STAIRS_Y = 2;

type GroundFloor = 'red_house_1f' | 'pink_house_1f' | 'blue_house' | 'elder_house';
type HouseColor = 'red' | 'pink';

/** Where the player appears when walking in through each front door. */
export const INTERIOR_ENTRY: Record<GroundFloor, Warp['to']> = {
  red_house_1f: { map: 'red_house_1f', x: MAT_X, y: ROOM_H - 1, facing: 'up' },
  pink_house_1f: { map: 'pink_house_1f', x: MAT_X, y: ROOM_H - 1, facing: 'up' },
  blue_house: { map: 'blue_house', x: MAT_X, y: ROOM_H - 1, facing: 'up' },
  elder_house: { map: 'elder_house', x: MAT_X, y: ROOM_H - 1, facing: 'up' },
};

/** Tile just outside each front door in town. */
const TOWN_EXIT: Record<GroundFloor, Warp['to']> = {
  red_house_1f: { map: 'town', x: 6, y: 17, facing: 'down' },
  blue_house: { map: 'town', x: 12, y: 17, facing: 'down' },
  pink_house_1f: { map: 'town', x: 23, y: 17, facing: 'down' },
  elder_house: { map: 'town', x: 24, y: 26, facing: 'down' },
};

/** Where a new game begins: upstairs in the player's own bedroom. */
export function playerStart(gender: Gender): { map: MapId; x: number; y: number; facing: 'down' } {
  return { map: gender === 'boy' ? 'red_house_2f' : 'pink_house_2f', x: 2, y: 4, facing: 'down' };
}

export function playerHomeColor(gender: Gender): HouseColor {
  return gender === 'boy' ? 'red' : 'pink';
}

const THEME: Record<HouseColor, number> = { red: 0, pink: 2 };

// --- Shells ------------------------------------------------------------------

function groundFloor(id: GroundFloor, name: string, theme: number): MapBuilder {
  const m = new MapBuilder(id, name, ROOM_W, ROOM_H, 'indoor', theme);
  m.fill('floor').rect(0, 0, ROOM_W, 2, 'wall');
  m.furniture('doormat', MAT_X * T, (ROOM_H - 1) * T, [], true);
  m.warp(MAT_X, ROOM_H, TOWN_EXIT[id]);
  return m;
}

function upperFloor(id: MapId, name: string, theme: number): MapBuilder {
  const m = new MapBuilder(id, name, ROOM_W, ROOM_H, 'indoor', theme);
  m.fill('floor').rect(0, 0, ROOM_W, 2, 'wall');
  return m;
}

/** Stairs in the top-right corner linking two floors. */
function stairs(m: MapBuilder, kind: 'up' | 'down', to: MapId): void {
  m.furniture(`stairs_${kind}`, STAIRS_X * T, T, [], true);
  m.warp(STAIRS_X, STAIRS_Y, { map: to, x: STAIRS_X - 1, y: STAIRS_Y, facing: 'left' });
}

// --- Furniture helpers (tile coordinates) -----------------------------------

const wallDecor = (m: MapBuilder, tex: string, x: number) => m.furniture(tex, x * T, T, []);
const bookshelf = (m: MapBuilder, x: number) =>
  m.furniture('bookshelf', x * T, T, [{ x, y: 2, w: 2, h: 1 }]).interact('bookshelf', x, 2, SCRIPTS.bookshelf, { w: 2 });
const bed = (m: MapBuilder, tex: string, x: number, y: number, script: DialogueScript = SCRIPTS.otherBed) =>
  m.furniture(tex, x * T, y * T, [{ x, y, w: 1, h: 2 }]).interact(`bed_${x}_${y}`, x, y, script, { h: 2 });
const table = (m: MapBuilder, tex: string, x: number, y: number) => m.furniture(tex, x * T, y * T, [{ x, y, w: 2, h: 2 }]);
const chair = (m: MapBuilder, x: number, y: number) => m.prop('chair', x, y);
const plant = (m: MapBuilder, x: number, y: number) => m.prop('plant', x, y, { spriteH: 24 });
const rug = (m: MapBuilder, tex: string, x: number, y: number) => m.furniture(tex, x * T, y * T, [], true);
const tv = (m: MapBuilder, x: number, script: DialogueScript = SCRIPTS.tv) => m.prop('tv', x, 2, { spriteH: 24 }).interact(`tv_${x}`, x, 2, script);
const kitchen = (m: MapBuilder, x: number, y: number) =>
  m.furniture('counter', x * T, y * T - 8, [{ x, y, w: 2, h: 1 }]).interact('kitchen', x, y, SCRIPTS.kitchen, { w: 2 });

// --- Two-storey homes ----------------------------------------------------------

function buildHomeGround(color: HouseColor, ctx: MapContext): MapDefinition {
  const id: GroundFloor = color === 'red' ? 'red_house_1f' : 'pink_house_1f';
  const isPlayers = playerHomeColor(ctx.gender) === color;
  const m = groundFloor(id, isPlayers ? 'Your House 1F' : 'Wren Family Home 1F', THEME[color]);
  stairs(m, 'up', color === 'red' ? 'red_house_2f' : 'pink_house_2f');
  wallDecor(m, 'window', 5);
  wallDecor(m, 'clock', 7);
  bookshelf(m, 0);
  tv(m, 3);
  kitchen(m, 0, 4);
  table(m, isPlayers ? 'table' : 'table_cloth', 3, 4);
  chair(m, 2, 5);
  chair(m, 5, 4);
  rug(m, color === 'red' ? 'rug_red' : 'rug_pink', 5, 5);
  plant(m, 0, 7);
  plant(m, 9, 7);
  m.npc(isPlayers ? 'mom' : 'rival_girl_mom', 6, 3, 'down');
  return m.build();
}

function buildHomeUpper(color: HouseColor, ctx: MapContext): MapDefinition {
  const id: MapId = color === 'red' ? 'red_house_2f' : 'pink_house_2f';
  const isPlayers = playerHomeColor(ctx.gender) === color;
  const m = upperFloor(id, isPlayers ? 'Your Room' : 'Wren Family Home 2F', THEME[color]);
  stairs(m, 'down', color === 'red' ? 'red_house_1f' : 'pink_house_1f');
  wallDecor(m, 'window', 2);
  wallDecor(m, 'window', 7);
  plant(m, 9, 7);
  plant(m, 6, 2);
  rug(m, color === 'red' ? 'rug_red' : 'rug_pink', 3, 4);
  if (isPlayers) {
    m.prop('pc', 0, 2, { spriteH: 24 }).interact('pc', 0, 2, SCRIPTS.pc);
    bookshelf(m, 3);
    tv(m, 5, SCRIPTS.tvConsole);
    wallDecor(m, 'picture', 4);
    bed(m, ctx.gender === 'boy' ? 'bed_blue' : 'bed_pink', 0, 4, SCRIPTS.bed);
  } else {
    bookshelf(m, 0);
    wallDecor(m, 'clock', 4);
    table(m, 'table_cloth', 3, 2);
    bed(m, ctx.gender === 'boy' ? 'bed_pink' : 'bed_green', 0, 5, SCRIPTS.zBed);
    m.prop('toybox', 8, 7).interact('rival_desk', 8, 7, SCRIPTS.rivalNotes);
    // Once the starters are chosen, Z is home studying their new partner.
    m.npc(oppositeSprite(ctx.gender), 4, 5, 'right', (s) => s.story.starterChosen);
    for (const id of STARTER_ORDER) {
      m.npc(`zcreature_${id}`, 5, 5, 'left', (s) => s.story.oppositeStarter === id);
    }
  }
  return m.build();
}

// --- Single-storey homes -------------------------------------------------------

export function buildBlueHouse(): MapDefinition {
  const m = groundFloor('blue_house', 'Hollis Family Home', 1);
  wallDecor(m, 'window', 2);
  wallDecor(m, 'picture', 5);
  wallDecor(m, 'window', 7);
  bookshelf(m, 0);
  tv(m, 4);
  bed(m, 'bed_blue', 8, 2);
  bed(m, 'bed_blue', 9, 2);
  table(m, 'table', 3, 4);
  chair(m, 5, 4);
  rug(m, 'rug_blue', 5, 5);
  m.prop('toybox', 1, 6).interact('toybox', 1, 6, SCRIPTS.toybox);
  plant(m, 9, 7);
  m.npc('rival_boy_mom', 6, 3, 'down');
  m.npc('rival_boy_brother', 2, 5, 'down');
  return m.build();
}

export function buildElderHouse(): MapDefinition {
  const m = groundFloor('elder_house', "The Brams' Cottage", 3);
  m.furniture('fireplace', 0, T, [{ x: 0, y: 2, w: 2, h: 1 }]).interact('fireplace', 0, 2, SCRIPTS.fireplace, { w: 2 });
  m.object({ texture: 'flame_0', px: 8, py: 2 * T + 3, solid: [], depthY: 3 * T + 1, anim: { frames: ['flame_0', 'flame_1'], rate: 5 } });
  wallDecor(m, 'window', 4);
  wallDecor(m, 'picture', 5);
  wallDecor(m, 'window', 6);
  bookshelf(m, 8);
  m.furniture('big_cushion', 6 * T, 3 * T + 8, [{ x: 6, y: 3, w: 2, h: 2 }]).interact('cushion', 6, 3, SCRIPTS.cushion, { w: 2, h: 2 });
  m.prop('armchair_purple', 2, 3, { spriteH: 20 });
  rug(m, 'rug_green', 2, 5);
  table(m, 'table_cloth', 0, 5);
  plant(m, 9, 7);
  plant(m, 9, 5);
  m.npc('old_man', 3, 3, 'down');
  m.npc('old_woman', 5, 5, 'left');
  return m.build();
}

// --- Professor Max's laboratory --------------------------------------------------

export const LAB_W = 14;
export const LAB_H = 11;
export const LAB_DOOR_X = 7;
/** Tiles in front of the starter table (one per capsule), left to right. */
export const LAB_BALL_TILES: Record<StarterId, { x: number; y: number }> = {
  bulbasaur: { x: 6, y: 4 },
  charmander: { x: 7, y: 4 },
  squirtle: { x: 8, y: 4 },
};
export const LAB_ENTRY: Warp['to'] = { map: 'lab', x: LAB_DOOR_X, y: LAB_H - 1, facing: 'up' };

export function buildLab(ctx: MapContext): MapDefinition {
  const m = new MapBuilder('lab', "Professor Max's Lab", LAB_W, LAB_H, 'indoor', 4);
  m.fill('floor').rect(0, 0, LAB_W, 2, 'wall');
  m.furniture('doormat', LAB_DOOR_X * T, (LAB_H - 1) * T, [], true);
  m.warp(LAB_DOOR_X, LAB_H, { map: 'town', x: 17, y: 8, facing: 'down' });

  // Lab emblem decal on the floor and soft pools of light from the ceiling lamps.
  m.furniture('lab_emblem', 7 * T - 24, 8 * T - 10, [], true);
  for (const [x, y] of [[4, 5.5], [9, 5.5], [1.5, 8.5], [11.5, 8.5]]) {
    m.furniture('light_pool', x * T - 16, y * T - 20, [], true);
  }

  // Back wall: shelves, equipment and the computer bank.
  bookshelf(m, 0);
  bookshelf(m, 2);
  wallDecor(m, 'lab_poster', 4);
  wallDecor(m, 'window', 7);
  wallDecor(m, 'clock', 8);
  m.object({
    texture: 'lab_machine_0', px: 5 * T, py: T, solid: [{ x: 5, y: 2, w: 2, h: 1 }],
    anim: { frames: ['lab_machine_0', 'lab_machine_1'], rate: 3 },
  });
  m.interact('lab_machine', 5, 2, SCRIPTS.labMachine, { w: 2 });
  m.object({
    texture: 'lab_tank_0', px: 9 * T, py: T, solid: [{ x: 9, y: 2, w: 1, h: 1 }],
    anim: { frames: ['lab_tank_0', 'lab_tank_1'], rate: 2 },
  });
  m.interact('lab_tank', 9, 2, SCRIPTS.labTank);
  m.object({
    texture: 'lab_computer_0', px: 10 * T, py: T, solid: [{ x: 10, y: 2, w: 2, h: 1 }],
    anim: { frames: ['lab_computer_0', 'lab_computer_1'], rate: 2 },
  });
  m.interact('lab_computer', 10, 2, SCRIPTS.labComputer, { w: 2 });
  bookshelf(m, 12);

  // Starter display table with the three capsules (removed once chosen).
  m.furniture('starter_table', 6 * T, 4 * T - 10, [{ x: 6, y: 4, w: 3, h: 1 }]);
  for (const id of STARTER_ORDER) {
    const t = LAB_BALL_TILES[id];
    m.object({
      id: `ball_${id}`,
      texture: 'ball_closed',
      px: t.x * T,
      py: 4 * T - 13,
      solid: [],
      depthY: 5 * T + 4,
      when: (s) => !s.story.starterChosen,
    });
    m.interact(`ball_${id}`, t.x, t.y, SCRIPTS.professor, { action: { type: 'starter', payload: id } });
  }

  // Desk, benches and plants.
  m.furniture('prof_desk', 12 * T, 5 * T - 26, [{ x: 12, y: 4, w: 2, h: 1 }]).interact('lab_desk', 12, 4, SCRIPTS.labDesk, { w: 2 });
  m.furniture('lab_bench_0', 1 * T, 7 * T - 28, [{ x: 1, y: 6, w: 2, h: 1 }]).interact('lab_bench', 1, 6, SCRIPTS.labBench, { w: 2 });
  m.furniture('lab_bench_1', 11 * T, 7 * T - 28, [{ x: 11, y: 6, w: 2, h: 1 }]).interact('lab_bench', 11, 6, SCRIPTS.labBench, { w: 2 });
  plant(m, 0, 10);
  plant(m, 13, 10);
  plant(m, 13, 7);

  // Cast. Y and Z only wait here until the starters are handed out.
  m.npc('professor_max', 7, 3, 'down');
  m.npc('rival_y', 4, 5, 'right', (s) => !s.story.starterChosen);
  m.npc(oppositeSprite(ctx.gender), 10, 5, 'left', (s) => !s.story.starterChosen);
  return m.build();
}

export const buildRedHouse1F = (ctx: MapContext) => buildHomeGround('red', ctx);
export const buildRedHouse2F = (ctx: MapContext) => buildHomeUpper('red', ctx);
export const buildPinkHouse1F = (ctx: MapContext) => buildHomeGround('pink', ctx);
export const buildPinkHouse2F = (ctx: MapContext) => buildHomeUpper('pink', ctx);
