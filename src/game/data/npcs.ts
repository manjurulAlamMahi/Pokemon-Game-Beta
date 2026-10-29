// NPC definitions. Placement lives in the map files; behaviour and dialogue
// are referenced here so the same NPC can later appear on multiple maps.

import type { NpcDefinition } from '../../types';
import { SCRIPTS, zCreatureLines } from '../dialogue/scripts';
import { STARTERS } from './starters';
import { PROFESSOR_NAME, TRAINER_NAMES } from './trainers';

const list: NpcDefinition[] = [
  { id: 'mom', name: 'Mom', sprite: 'mom', dialogue: SCRIPTS.mom, movement: { type: 'look-around', interval: 3200 } },
  {
    id: 'rival_boy_mom', name: 'Mrs. Hollis', sprite: 'rival_boy_mom', dialogue: SCRIPTS.rivalBoyMom,
    movement: { type: 'look-around', interval: 4000 },
  },
  {
    id: 'rival_boy_brother', name: 'Tobi', sprite: 'rival_boy_brother', dialogue: SCRIPTS.rivalBoyBrother,
    movement: { type: 'wander', radius: 2, interval: 1400 }, walkSpeed: 0.85,
  },
  {
    id: 'rival_girl_mom', name: 'Mrs. Wren', sprite: 'rival_girl_mom', dialogue: SCRIPTS.zMom,
    movement: { type: 'look-around', interval: 3600 },
  },
  { id: 'old_man', name: 'Old Bram', sprite: 'old_man', dialogue: SCRIPTS.oldMan, movement: { type: 'static' } },
  {
    id: 'old_woman', name: 'Nana Bram', sprite: 'old_woman', dialogue: SCRIPTS.oldWoman,
    movement: { type: 'look-around', interval: 5000 },
  },
  { id: 'pool_kid', name: 'Pip', sprite: 'pool_kid', dialogue: SCRIPTS.poolKid, movement: { type: 'look-around', interval: 2600 } },
  {
    id: 'hiker', name: 'Rowan', sprite: 'hiker', dialogue: SCRIPTS.hiker,
    movement: { type: 'wander', radius: 1, interval: 3000 }, walkSpeed: 1.3,
  },
  {
    id: 'guard', name: 'Ranger Dale', sprite: 'guard', dialogue: SCRIPTS.guard,
    movement: { type: 'static' }, talkOnBump: true,
  },
  // --- Lab cast -------------------------------------------------------------
  { id: 'professor_max', name: PROFESSOR_NAME, sprite: 'professor_max', dialogue: SCRIPTS.professor, movement: { type: 'static' } },
  { id: 'rival_y', name: TRAINER_NAMES.rival, sprite: 'rival_y', dialogue: ["Hmph. Go on, pick already."], movement: { type: 'static' } },
  // Z: same character, sprite depends on the player's gender.
  { id: 'z_girl', name: TRAINER_NAMES.opposite, sprite: 'z_girl', dialogue: SCRIPTS.z, movement: { type: 'static' } },
  { id: 'z_boy', name: TRAINER_NAMES.opposite, sprite: 'z_boy', dialogue: SCRIPTS.z, movement: { type: 'static' } },
  // Z's starter, shown in Z's room once chosen.
  ...Object.values(STARTERS).map((st) => ({
    id: `zcreature_${st.id}`,
    name: st.name,
    sprite: st.overworldSprite,
    dialogue: zCreatureLines(st.id),
    movement: { type: 'look-around', interval: 2200 } as const,
  })),
];

export const NPCS: Record<string, NpcDefinition> = Object.fromEntries(list.map((n) => [n.id, n]));
