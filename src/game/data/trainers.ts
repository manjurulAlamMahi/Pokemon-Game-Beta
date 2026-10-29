// The three young trainers of the story. Names are temporary identifiers
// (X / Y / Z) until real names are decided; change them here only.

import type { Gender, GameStateData } from '../../types';

export const TRAINER_NAMES = {
  player: 'X',
  rival: 'Y',
  opposite: 'Z',
} as const;

export const PROFESSOR_NAME = 'Professor Max';

/** Z is always the opposite gender of the player; Y is always male. */
export function oppositeGender(state: Readonly<GameStateData>): Gender {
  return state.player.gender === 'boy' ? 'girl' : 'boy';
}

/** Sprite key for Z, based on the player's gender. */
export function oppositeSprite(gender: Gender): string {
  return gender === 'boy' ? 'z_girl' : 'z_boy';
}

/** Pronoun helpers for dialogue about Z. */
export function zWords(state: Readonly<GameStateData>) {
  const girl = oppositeGender(state) === 'girl';
  return {
    child: girl ? 'daughter' : 'son',
    they: girl ? 'she' : 'he',
    They: girl ? 'She' : 'He',
    their: girl ? 'her' : 'his',
  };
}
