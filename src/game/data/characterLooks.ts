// Appearance of every character. Keys are texture keys for the generated sheets.

import type { CharacterLook } from '../../types';

const SKIN_LIGHT = '#fcd5b0';
const SKIN_TAN = '#e8b086';
const SKIN_DEEP = '#a8704a';

export const CHARACTER_LOOKS: Record<string, CharacterLook> = {
  // Trainer outfits: cap/hat, jacket with contrasting trim, backpack.
  player_boy: {
    hair: 'short', hairColor: '#3a2a2a', skin: SKIN_LIGHT,
    hat: 'cap', hatColor: '#e0383c', hatBrim: '#2e2a36',
    shirt: '#2f6fd0', trim: '#f2f2f2', belt: '#2e2a36', pants: '#3b3f58', shoes: '#e0383c', bag: '#f2b632',
  },
  player_girl: {
    hair: 'long', hairColor: '#8a4a2c', skin: SKIN_LIGHT,
    hat: 'bucket', hatColor: '#f6f6f2', hatBrim: '#2fa8a0',
    shirt: '#36b0a8', trim: '#ffffff', belt: '#e0383c', pants: '#e0383c', shoes: '#f6f6f2', bag: '#f2b632',
  },
  mom: {
    hair: 'bun', hairColor: '#8a4a2c', skin: SKIN_LIGHT,
    shirt: '#e88a7a', trim: '#fff2e0', pants: '#6a5a8a', shoes: '#7a4a2e',
  },
  rival_boy_mom: {
    hair: 'long', hairColor: '#d8783a', skin: SKIN_TAN,
    shirt: '#8a6ab0', trim: '#e8dcf4', pants: '#4a4060', shoes: '#4a3a3a',
  },
  rival_boy_brother: {
    hair: 'spiky', hairColor: '#d8783a', skin: SKIN_TAN, child: true,
    shirt: '#f2c03a', trim: '#ffffff', pants: '#2f6fd0', shoes: '#e0383c',
  },
  rival_girl_mom: {
    hair: 'bun', hairColor: '#e8c870', skin: SKIN_LIGHT,
    shirt: '#5aa9d6', trim: '#ffffff', pants: '#e8e2d6', shoes: '#8a5a3a',
  },
  old_man: {
    hair: 'bald', hairColor: '#e4e2dc', skin: SKIN_TAN, beard: true,
    shirt: '#9a6a44', trim: '#e8d8b8', pants: '#5a5a6a', shoes: '#4a3a3a',
  },
  old_woman: {
    hair: 'bun', hairColor: '#d4d2dc', skin: SKIN_LIGHT,
    shirt: '#9a80c8', trim: '#f2ecfa', pants: '#5c4e80', shoes: '#4a3a3a',
  },
  pool_kid: {
    hair: 'short', hairColor: '#2e2a3a', skin: SKIN_DEEP, child: true,
    hat: 'cap', hatColor: '#4caf6a', hatBrim: '#2e5a3a',
    shirt: '#f4f4f0', trim: '#4caf6a', pants: '#d87a3a', shoes: '#2f6fd0',
  },
  hiker: {
    hair: 'short', hairColor: '#5a3a2a', skin: SKIN_TAN, beard: true,
    hat: 'bucket', hatColor: '#9a8a5a', hatBrim: '#6a5a3a',
    shirt: '#7a8a3c', trim: '#c8c070', pants: '#6a5038', shoes: '#4a3a3a', bag: '#a85a3a',
  },
  // --- Lab cast (original designs) ---
  professor_max: {
    hair: 'short', hairColor: '#4a4e68', skin: SKIN_LIGHT, glasses: true,
    coat: '#f4f4f2', shirt: '#2f8f88', pants: '#5a4636', shoes: '#3a2a2a',
  },
  rival_y: {
    hair: 'spiky', hairColor: '#c4c8d8', skin: SKIN_LIGHT,
    shirt: '#2a2834', trim: '#f08a30', belt: '#f08a30', pants: '#5a5f72', shoes: '#f08a30',
  },
  z_girl: {
    hair: 'long', hairColor: '#2e3a6a', skin: SKIN_LIGHT,
    shirt: '#e86a8a', trim: '#ffffff', pants: '#3a4a8a', shoes: '#ffffff', bag: '#5ac0c8',
  },
  z_boy: {
    hair: 'short', hairColor: '#e0b060', skin: SKIN_LIGHT, glasses: true,
    shirt: '#5aa860', trim: '#f4f0e0', pants: '#6a5a4a', shoes: '#4a3a3a', bag: '#e8a040',
  },
  guard: {
    hair: 'short', hairColor: '#2e2a3a', skin: SKIN_DEEP,
    hat: 'cap', hatColor: '#2f5f8f', hatBrim: '#1e2a40',
    shirt: '#3f73a8', trim: '#f2d04a', pants: '#2e3a52', shoes: '#2a2433',
  },
};
