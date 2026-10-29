// Shared type definitions used across game logic, data and UI.

export type Gender = 'boy' | 'girl';
export type Direction = 'down' | 'up' | 'left' | 'right';

/**
 * Maps are named after buildings, not owners: who lives in the red and pink
 * houses depends on the player's gender (Emerald-style home swap).
 */
export type MapId =
  | 'town'
  | 'red_house_1f'
  | 'red_house_2f'
  | 'pink_house_1f'
  | 'pink_house_2f'
  | 'blue_house'
  | 'elder_house'
  | 'lab';

export interface TilePos {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface PlayerState {
  gender: Gender;
  position: TilePos;
  facing: Direction;
  currentMap: MapId;
}

export type StarterId = 'bulbasaur' | 'charmander' | 'squirtle';

export interface StoryState {
  /** The player's (X) starter. Null until chosen in the lab. */
  playerStarter: StarterId | null;
  /** The main rival's (Y) starter: always the one strong against the player's. */
  rivalStarter: StarterId | null;
  /** The opposite-gender character's (Z) starter: the remaining one. */
  oppositeStarter: StarterId | null;
  professorMet: boolean;
  starterChosen: boolean;
  journeyStarted: boolean;
  /** Current story objective shown to the player (null when none). */
  objective: string | null;
}

export interface GameStateData {
  gameStarted: boolean;
  player: PlayerState;
  story: StoryState;
  /** How many times each NPC / interactable has been talked to. */
  talkCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Dialogue
// ---------------------------------------------------------------------------

export interface DialogueContext {
  state: Readonly<GameStateData>;
  /** Number of previous conversations with this speaker (0 on first talk). */
  timesTalked: number;
}

/** A script resolves to the lines shown in one conversation. */
export type DialogueScript = string[] | ((ctx: DialogueContext) => string[]);

// ---------------------------------------------------------------------------
// Characters / NPCs
// ---------------------------------------------------------------------------

export type HairStyle = 'short' | 'spiky' | 'long' | 'bun' | 'bald';

export interface CharacterLook {
  hair: HairStyle;
  hairColor: string;
  skin: string;
  shirt: string;
  pants: string;
  shoes: string;
  /** Collar / zip trim colour (defaults to a light tint of the shirt). */
  trim?: string;
  belt?: string;
  hat?: 'cap' | 'bucket';
  hatColor?: string;
  hatBrim?: string;
  /** Backpack colour; omitted = no backpack. */
  bag?: string;
  beard?: boolean;
  /** Renders a shorter body for children. */
  child?: boolean;
  /** Long coat over the shirt (e.g. a lab coat). */
  coat?: string;
  glasses?: boolean;
}

export type MovementBehavior =
  | { type: 'static' }
  | { type: 'look-around'; interval?: number }
  | { type: 'wander'; radius: number; interval?: number };

export interface NpcDefinition {
  id: string;
  name: string;
  /** Texture key of the generated character sprite sheet. */
  sprite: string;
  dialogue: DialogueScript;
  movement: MovementBehavior;
  /** Talk automatically when the player walks into this NPC. */
  talkOnBump?: boolean;
  /** NPCs always block movement; kept explicit for future ghosts/followers. */
  collision?: boolean;
  /** Seconds-per-tile multiplier (>1 = slower). */
  walkSpeed?: number;
  /** Portrait shown in the dialogue box (defaults to the sprite). */
  portrait?: string;
}

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

export type GroundType =
  | 'grass'
  | 'path'
  | 'water'
  | 'tallgrass'
  | 'flowers_red'
  | 'flowers_yellow'
  | 'flowers_white'
  | 'floor'
  | 'wall'
  | 'void';

export interface SolidRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedObject {
  texture: string;
  /** Pixel position of the sprite's top-left corner. */
  px: number;
  py: number;
  /** Tiles blocked by this object (absolute tile coords). */
  solid: SolidRect[];
  /** Y (pixels) used for depth sorting; defaults to sprite bottom. */
  depthY?: number;
  /** Render under characters regardless of position (rugs, mats). */
  flat?: boolean;
  /** Optional looping frame animation (texture keys). */
  anim?: { frames: string[]; rate: number };
  /** Lets story code find (and remove) this object at runtime. */
  id?: string;
  /** Only placed when this returns true for the current game state. */
  when?: (state: Readonly<GameStateData>) => boolean;
}

export interface Interactable {
  id: string;
  x: number;
  y: number;
  speaker?: string;
  script: DialogueScript;
  /** Story hook fired instead of the script when registered (e.g. starter balls). */
  action?: { type: string; payload?: string };
}

export interface Warp {
  x: number;
  y: number;
  to: { map: MapId; x: number; y: number; facing: Direction };
}

export interface NpcSpawn {
  npcId: string;
  x: number;
  y: number;
  facing: Direction;
  /** Only spawned when this returns true for the current game state. */
  when?: (state: Readonly<GameStateData>) => boolean;
}

export interface MapDefinition {
  id: MapId;
  displayName: string;
  width: number;
  height: number;
  kind: 'outdoor' | 'indoor';
  /** Interior colour theme index (floor/wall palette). */
  theme: number;
  ground: GroundType[][];
  objects: PlacedObject[];
  /** Extra solid tiles not tied to an object (e.g. invisible boundaries). */
  extraSolids: SolidRect[];
  interactables: Interactable[];
  warps: Warp[];
  npcs: NpcSpawn[];
}
