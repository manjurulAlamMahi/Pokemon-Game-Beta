// Willowbrook — the starting town.
//
//                 N
//          [ Research Lab ]
//                 ||
//   [Player] [Rival B]  ||  [Rival G]  [garden]
//   ============ street ===========
//      ~pool~         ||    [Elders]
//                     ||
//   ------fence------[G]------fence-------
//      tall grass     |     tall grass
//
// The guard (G) physically blocks the only gap in the fence.

import type { MapDefinition } from '../../types';
import { SCRIPTS } from '../dialogue/scripts';
import { MapBuilder } from './MapBuilder';
import { INTERIOR_ENTRY, LAB_ENTRY, playerHomeColor, type MapContext } from './interiors';

export const TOWN_W = 36;
export const TOWN_H = 46;

export function buildTown(ctx: MapContext): MapDefinition {
  const m = new MapBuilder('town', 'Willowbrook', TOWN_W, TOWN_H, 'outdoor');

  // --- Paths ---------------------------------------------------------------
  m.rect(17, 8, 2, 27, 'path'); // lab -> south gate (2 wide)
  m.rect(17, 34, 1, 12, 'path'); // narrow trail beyond the gate
  m.rect(3, 18, 30, 2, 'path'); // main street
  m.rect(6, 17, 1, 1, 'path'); // door stubs
  m.rect(12, 17, 1, 1, 'path');
  m.rect(23, 17, 1, 1, 'path');
  m.rect(19, 27, 6, 1, 'path').rect(24, 26, 1, 1, 'path'); // to elders' house
  m.rect(13, 25, 4, 1, 'path'); // to the pool
  m.rect(15, 8, 6, 2, 'path'); // lab forecourt

  // --- Professor's lab (not enterable in this demo) -------------------------
  const lab = m.lab(14, 3);
  // The lab is open now: both halves of the sliding door lead inside.
  m.warp(lab.doorX, lab.doorY, LAB_ENTRY).warp(lab.doorX + 1, lab.doorY, LAB_ENTRY);
  m.sign('lab_sign', 21, 9, SCRIPTS.labSign);
  m.prop('lamp', 14, 9, { spriteH: 32 }).prop('lamp', 22, 8, { spriteH: 32 });
  m.rect(12, 8, 2, 2, 'flowers_red').rect(23, 9, 2, 1, 'flowers_yellow');

  // --- Houses --------------------------------------------------------------
  // Red and pink are two-storey homes; the player lives in red as a boy and
  // in pink as a girl, the female rival's family in the other (Emerald-style).
  const home = playerHomeColor(ctx.gender);
  m.house('house_red', 4, 12, 5, INTERIOR_ENTRY.red_house_1f, 5);
  m.house('house_blue', 10, 13, 5, INTERIOR_ENTRY.blue_house);
  m.house('house_pink', 21, 12, 5, INTERIOR_ENTRY.pink_house_1f, 5);
  m.house('house_elder', 21, 22, 6, INTERIOR_ENTRY.elder_house);

  const sign = (color: 'red' | 'pink') => (home === color ? SCRIPTS.playerHouseSign : SCRIPTS.rivalGirlHouseSign);
  m.prop('mailbox_red', 7, 17).interact('red_mailbox', 7, 17, sign('red'));
  m.prop('mailbox_blue', 13, 17).interact('blue_mailbox', 13, 17, SCRIPTS.rivalBoyHouseSign);
  m.prop('mailbox_pink', 24, 17).interact('pink_mailbox', 24, 17, sign('pink'));
  m.prop('mailbox_green', 25, 26).interact('elder_mailbox', 25, 26, SCRIPTS.elderHouseSign);

  // The old man's partner dozing in the sun beside the cottage.
  m.object({
    texture: 'dragon_0',
    px: 27 * 16 - 4,
    py: 24 * 16,
    solid: [{ x: 27, y: 24, w: 2, h: 2 }],
    anim: { frames: ['dragon_0', 'dragon_1'], rate: 1.2 },
  });
  m.interact('charizard', 27, 24, SCRIPTS.charizard, { w: 2, h: 2 });

  // Flower beds hugging the houses.
  m.rect(4, 17, 2, 1, 'flowers_red').rect(8, 17, 1, 1, 'flowers_yellow');
  m.rect(10, 17, 2, 1, 'flowers_white').rect(14, 17, 1, 1, 'flowers_white');
  m.rect(21, 17, 2, 1, 'flowers_yellow').rect(25, 17, 1, 1, 'flowers_red');
  m.rect(21, 26, 2, 1, 'flowers_white').rect(26, 26, 1, 1, 'flowers_white');

  // Garden plot east of the houses.
  m.fenceLine(27, 13, 32, 13).fenceLine(27, 13, 27, 16).fenceLine(32, 13, 32, 16).fenceLine(27, 16, 29, 16).fenceLine(31, 16, 32, 16);
  m.rect(28, 14, 4, 2, 'flowers_yellow').rect(29, 14, 2, 1, 'flowers_red');
  m.prop('crate', 30, 16);

  // --- Pool ---------------------------------------------------------------
  m.rect(6, 22, 6, 5, 'water');
  m.interact('pool', 6, 22, SCRIPTS.pool, { w: 6, h: 5 });
  m.prop('rock', 5, 21).prop('rock', 12, 27).prop('bush', 4, 24);
  m.rect(5, 27, 3, 1, 'flowers_white').rect(10, 21, 2, 1, 'flowers_red').rect(12, 22, 1, 2, 'flowers_yellow');

  // --- Street furniture -----------------------------------------------------
  m.sign('town_sign', 19, 20, SCRIPTS.townSign);
  m.prop('lamp', 9, 17, { spriteH: 32 }).prop('lamp', 26, 20, { spriteH: 32 }).prop('lamp', 16, 20, { spriteH: 32 });
  m.prop('planter', 15, 17).prop('planter', 20, 17);

  // --- South: gate, guard and the wild area ----------------------------------
  m.fenceLine(2, 35, 16, 35).fenceLine(18, 35, 33, 35);
  m.sign('route_sign', 18, 34, SCRIPTS.routeSign);
  m.rect(20, 33, 3, 1, 'flowers_white').rect(13, 33, 3, 1, 'flowers_yellow');
  // Ragged-edged tall grass patches either side of the trail.
  m.rect(7, 37, 9, 6, 'tallgrass').rect(5, 38, 2, 4, 'tallgrass').rect(10, 36, 4, 1, 'tallgrass').rect(9, 43, 5, 1, 'tallgrass');
  m.rect(19, 37, 10, 6, 'tallgrass').rect(29, 38, 1, 3, 'tallgrass').rect(22, 36, 5, 1, 'tallgrass').rect(20, 43, 4, 1, 'tallgrass');
  m.trees([
    [2, 37, 'pine'], [3, 40, 'pine'], [31, 37, 'pine'], [30, 40, 'pine'],
  ]);

  // --- Decorative greenery --------------------------------------------------
  m.trees([
    // North woods around the lab.
    [3, 3], [6, 2, 'autumn'], [9, 4], [4, 6, 'pine'], [7, 8], [11, 2, 'pine'],
    [24, 2, 'pine'], [27, 4], [30, 2, 'autumn'], [31, 6], [26, 8, 'pine'], [29, 9],
    // Lower town.
    [2, 29], [5, 31, 'autumn'], [9, 30], [28, 28], [31, 30, 'pine'], [25, 31],
  ]);
  m.rect(3, 10, 3, 1, 'flowers_yellow').rect(30, 11, 2, 1, 'flowers_red').rect(12, 30, 2, 1, 'flowers_red');
  m.prop('bush', 2, 20).prop('bush', 2, 21).prop('bush', 33, 20).prop('bush', 33, 21).prop('bush', 14, 29).prop('bush', 21, 30);
  m.prop('rock', 30, 24).prop('rock', 3, 26);

  // --- NPCs -----------------------------------------------------------------
  m.npc('pool_kid', 12, 25, 'left');
  m.npc('hiker', 21, 32, 'down');
  m.npc('guard', 17, 35, 'up');

  // --- Map border: dense tree wall ------------------------------------------
  for (let x = 0; x < TOWN_W; x += 2) m.tree(x, 0, x % 4 === 0 ? 'round' : 'pine');
  for (let y = 2; y < TOWN_H - 2; y += 2) {
    m.tree(0, y, y % 6 === 0 ? 'pine' : 'round');
    m.tree(TOWN_W - 2, y, y % 6 === 2 ? 'pine' : 'round');
  }
  for (let x = 0; x < TOWN_W; x += 2) {
    if (x === 16) continue; // trail leaves the map here
    m.tree(x, TOWN_H - 2, x % 4 === 0 ? 'pine' : 'round');
  }
  m.prop('bush', 16, 44);

  return m.build();
}
