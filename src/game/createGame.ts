// Phaser game factory. React mounts the canvas; Phaser owns everything inside.

import Phaser from 'phaser';
import { PAL } from '../assets/generators/palette';
import type { Direction, MapId } from '../types';
import { DialogueController } from './dialogue/DialogueController';
import { BootScene, SCENE_WORLD } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { GameState } from './state/GameState';
import { UI } from './ui/UiController';

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: PAL.void,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || 960,
      height: parent.clientHeight || 640,
    },
    scene: [BootScene, WorldScene],
  });

  if (import.meta.env.DEV) exposeDebugApi(game);
  return game;
}

/** Hooks used by the automated browser test script (dev builds only). */
function exposeDebugApi(game: Phaser.Game): void {
  const world = () => game.scene.getScene(SCENE_WORLD) as WorldScene;
  (window as unknown as { __wildbound: unknown }).__wildbound = {
    state: () => GameState.get(),
    dialogue: () => DialogueController.store.get(),
    player: () => ({ ...world().player.tile, facing: world().player.facing, moving: world().player.isMoving }),
    npcs: () => world().npcs.map((n) => ({ id: n.def.id, ...n.tile, facing: n.facing, visible: n.sprite.visible })),
    warp: (map: MapId, x: number, y: number, facing: Direction = 'down') => world().warpTo({ map, x, y, facing }),
    ready: () => game.scene.isActive(SCENE_WORLD),
    free: (x: number, y: number) => world().isTileFree(x, y),
    follower: () => {
      const f = world().follower;
      return f ? { ...f.tile, starter: f.starter, visible: f.sprite.visible, moving: f.isMoving } : null;
    },
    ui: () => UI.store.get(),
    cutscene: () => world().inCutscene,
    map: () => world().map.id,
    scene: () => world(),
    preview: () => world().data.get('preview') ?? null,
    walkable: (x: number, y: number) => world().isWalkableStatic(x, y),
    /** Zoom the camera out to show the whole map (for screenshots). */
    overview: (zoom = 1) => {
      const cam = world().cameras.main;
      cam.stopFollow();
      cam.removeBounds();
      cam.setZoom(zoom);
      cam.centerOn((cam.width / zoom) / 2, (cam.height / zoom) / 2);
    },
  };
}
