// Cached generated art for the React UI (same generators as the game).

import { buildCharacterSheet, CHAR_H, CHAR_W } from '../../assets/generators/characters';
import { buildBall, buildCreaturePortraits, buildCreatureSheet, CREATURE_H, CREATURE_W } from '../../assets/generators/creatures';
import { CHARACTER_LOOKS } from '../../game/data/characterLooks';
import { STARTERS } from '../../game/data/starters';
import type { StarterId } from '../../types';

export interface Sheet {
  canvas: HTMLCanvasElement;
  frameW: number;
  frameH: number;
}

const sheets = new Map<string, Sheet>();
const portraits = new Map<StarterId, HTMLCanvasElement[]>();
const balls = new Map<string, HTMLCanvasElement>();

/** Character sheets by look key, or creature sheets by overworld sprite key. */
export function getSheet(key: string): Sheet | null {
  let s = sheets.get(key);
  if (s) return s;
  if (CHARACTER_LOOKS[key]) {
    s = { canvas: buildCharacterSheet(CHARACTER_LOOKS[key]), frameW: CHAR_W, frameH: CHAR_H };
  } else {
    const starter = Object.values(STARTERS).find((st) => st.overworldSprite === key);
    if (!starter) return null;
    s = { canvas: buildCreatureSheet(starter.id), frameW: CREATURE_W, frameH: CREATURE_H };
  }
  sheets.set(key, s);
  return s;
}

export function getPortraitFrames(id: StarterId): HTMLCanvasElement[] {
  let p = portraits.get(id);
  if (!p) {
    p = buildCreaturePortraits(id);
    portraits.set(id, p);
  }
  return p;
}

export function getBall(state: 'closed' | 'open'): HTMLCanvasElement {
  let b = balls.get(state);
  if (!b) {
    b = buildBall(state);
    balls.set(state, b);
  }
  return b;
}
