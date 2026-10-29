// Central, serialisable game state. Story systems (starter, professor, etc.)
// will hang off `story` later; for this demo only the basics are populated.

import type { Direction, GameStateData, Gender, MapId, StarterId, StoryState, TilePos } from '../../types';
import { assignStarters } from '../data/starters';
import { eventBus } from '../utils/EventBus';
import { playerStart } from '../maps/interiors';
import { Store } from '../utils/Store';

function initialState(gender: Gender): GameStateData {
  const start = playerStart(gender);
  return {
    gameStarted: true,
    player: {
      gender,
      position: { x: start.x, y: start.y },
      facing: start.facing,
      currentMap: start.map,
    },
    story: {
      playerStarter: null,
      rivalStarter: null,
      oppositeStarter: null,
      professorMet: false,
      starterChosen: false,
      journeyStarted: false,
      objective: 'Meet Professor Max at the lab.',
    },
    talkCounts: {},
  };
}

export const gameStore = new Store<GameStateData | null>(null);

export const GameState = {
  start(gender: Gender): void {
    gameStore.set(initialState(gender));
  },

  get(): GameStateData {
    const s = gameStore.get();
    if (!s) throw new Error('Game state accessed before the game started');
    return s;
  },

  setPlayerLocation(map: MapId, position: TilePos, facing: Direction): void {
    const s = GameState.get();
    // Position changes every step; mutate in place to avoid re-rendering UI.
    s.player.currentMap = map;
    s.player.position = { ...position };
    s.player.facing = facing;
  },

  /** Records all three starters: the player's pick decides the others. */
  chooseStarter(player: StarterId): { rival: StarterId; opposite: StarterId } {
    const { rival, opposite } = assignStarters(player);
    Object.assign(GameState.get().story, {
      playerStarter: player,
      rivalStarter: rival,
      oppositeStarter: opposite,
      starterChosen: true,
    } satisfies Partial<StoryState>);
    return { rival, opposite };
  },

  updateStory(patch: Partial<StoryState>): void {
    const story = GameState.get().story;
    Object.assign(story, patch);
    if (patch.objective !== undefined) eventBus.emit('objective:set', { objective: patch.objective });
  },

  timesTalked(id: string): number {
    return GameState.get().talkCounts[id] ?? 0;
  },

  recordTalk(id: string): void {
    const s = GameState.get();
    s.talkCounts[id] = (s.talkCounts[id] ?? 0) + 1;
  },
};
