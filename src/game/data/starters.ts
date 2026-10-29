// Starter creature data. Game logic only ever reads this table; artwork is
// referenced by texture key so final sprites can replace the generated
// placeholders without touching story or scene code.
//
// NOTE: names are kept for this internal prototype; all visuals are original
// placeholder art produced by src/assets/generators/creatures.ts.

import type { StarterId } from '../../types';

export type CreatureType = 'Grass' | 'Fire' | 'Water';

export interface StarterData {
  id: StarterId;
  name: string;
  type: CreatureType;
  /** Short category line shown in the preview panel. */
  species: string;
  description: string;
  /** Overworld (following) sprite sheet, same frame layout as trainers. */
  overworldSprite: string;
  /** Large front-facing portrait frames used for previews and the reveal. */
  battleSprite: string;
  /** Animation keys registered for the overworld sheet. */
  animation: { idle: string; walk: string };
  /** Pitch pattern for the synthesised cry. */
  cry: number[];
  /** The starter this one is weak against (the rival takes it). */
  weakTo: StarterId;
  /** UI accent colours. */
  colors: { primary: string; light: string; dark: string };
}

export const STARTERS: Record<StarterId, StarterData> = {
  bulbasaur: {
    id: 'bulbasaur',
    name: 'BULBASAUR',
    type: 'Grass',
    species: 'Seed Pokémon',
    description: 'A gentle, sturdy partner. The bud on its back soaks up sunlight and grows along with it.',
    overworldSprite: 'creature_bulbasaur',
    battleSprite: 'portrait_bulbasaur',
    animation: { idle: 'creature_bulbasaur_idle', walk: 'creature_bulbasaur_walk' },
    cry: [520, 640, 470],
    weakTo: 'charmander',
    colors: { primary: '#4fb36a', light: '#a8e6a0', dark: '#2a6a40' },
  },
  charmander: {
    id: 'charmander',
    name: 'CHARMANDER',
    type: 'Fire',
    species: 'Lizard Pokémon',
    description: 'A spirited little fighter. The flame on its tail flickers brighter when it is happy.',
    overworldSprite: 'creature_charmander',
    battleSprite: 'portrait_charmander',
    animation: { idle: 'creature_charmander_idle', walk: 'creature_charmander_walk' },
    cry: [700, 880, 620],
    weakTo: 'squirtle',
    colors: { primary: '#ef7a34', light: '#ffc27a', dark: '#9a3a1c' },
  },
  squirtle: {
    id: 'squirtle',
    name: 'SQUIRTLE',
    type: 'Water',
    species: 'Tiny Turtle Pokémon',
    description: 'A cheerful swimmer. It tucks into its shell for protection and sprays water when excited.',
    overworldSprite: 'creature_squirtle',
    battleSprite: 'portrait_squirtle',
    animation: { idle: 'creature_squirtle_idle', walk: 'creature_squirtle_walk' },
    cry: [600, 500, 760],
    weakTo: 'bulbasaur',
    colors: { primary: '#4aa8e0', light: '#a6dcfa', dark: '#25608c' },
  },
};

export const STARTER_ORDER: StarterId[] = ['bulbasaur', 'charmander', 'squirtle'];

/**
 * Rival takes the starter that beats the player's; the opposite character
 * gets the one left over.
 */
export function assignStarters(player: StarterId): { rival: StarterId; opposite: StarterId } {
  const rival = STARTERS[player].weakTo;
  const opposite = STARTER_ORDER.find((s) => s !== player && s !== rival)!;
  return { rival, opposite };
}
