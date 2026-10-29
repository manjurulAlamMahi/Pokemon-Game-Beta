// Master palette for the demo's original visual style.
// Bright, slightly warm handheld-RPG colours with dark coloured outlines
// (never pure black) so everything reads as one consistent world.

export const PAL = {
  outline: '#2a2433',

  grass: '#78c45a',
  grassLight: '#88d066',
  grassHi: '#b4ec8c',
  grassDark: '#4f9f40',
  grassDeep: '#3f8838',

  sand: '#ead7a2',
  sandLight: '#f6e9c0',
  sandDark: '#d4bb80',
  sandEdge: '#bb9d61',

  water: '#5cb8ec',
  waterDeep: '#479fdb',
  waterShadow: '#3a83c2',
  waterLight: '#a6e0fb',
  foam: '#e9f8ff',
  rim: '#cdbb8b',
  rimDark: '#a48f60',

  tallGrass: '#3f9442',
  tallGrassDark: '#2c6e33',
  tallGrassLight: '#64b952',
  tallGrassTip: '#8fd56a',

  leaf: '#4fa64a',
  leafLight: '#76c95b',
  leafHighlight: '#a2e07a',
  leafDark: '#357d3a',
  leafOutline: '#23502c',
  trunk: '#8a5a3a',
  trunkDark: '#64402a',

  wood: '#b07a4b',
  woodLight: '#cf9a66',
  woodDark: '#7f5233',
  stone: '#a9a7b3',
  stoneLight: '#cfcdd6',
  stoneDark: '#7c7a88',

  white: '#ffffff',
  cream: '#fff6e2',
  glass: '#9fd8f2',
  glassLight: '#dff4ff',
  glassDark: '#5aa6cf',

  void: '#14121c',
} as const;

export interface InteriorTheme {
  floor: string;
  floorLight: string;
  floorDark: string;
  wall: string;
  wallStripe: string;
  trim: string;
  /** Floor material: wooden planks (default) or polished lab tiles. */
  pattern?: 'planks' | 'tiles';
}

export const INTERIOR_THEMES: InteriorTheme[] = [
  // 0: player's house – warm honey wood, cream wallpaper
  { floor: '#cf955e', floorLight: '#e1ac74', floorDark: '#a8723f', wall: '#f5e4c3', wallStripe: '#ead2a5', trim: '#8a5a3c' },
  // 1: male rival's house – cool blue
  { floor: '#b98b63', floorLight: '#cfa27a', floorDark: '#94684a', wall: '#d3e6f2', wallStripe: '#b9d3e7', trim: '#4f6a8a' },
  // 2: female rival's house – soft pink
  { floor: '#dcae7a', floorLight: '#ecc596', floorDark: '#b8875a', wall: '#f8dde2', wallStripe: '#efc6cf', trim: '#a35a6e' },
  // 3: elders' house – sage and dark wood
  { floor: '#a47753', floorLight: '#bb8d66', floorDark: '#7f5a3d', wall: '#e4ecd2', wallStripe: '#d0dcb6', trim: '#5c6e3e' },
  // 4: Professor's lab – polished white tiles, clean teal trim
  { floor: '#e6ecef', floorLight: '#f8fbfc', floorDark: '#c4ced6', wall: '#eef3f5', wallStripe: '#dfe8ec', trim: '#3f8f9a', pattern: 'tiles' },
];
