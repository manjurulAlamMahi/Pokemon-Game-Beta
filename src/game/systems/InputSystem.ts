// Keyboard input: WASD / arrows for movement, E / Space / Enter to interact,
// Shift to run. The most recently pressed direction wins when several are held.
//
// Key-down events are buffered so very quick taps (pressed and released
// between two frames) are never lost.

import Phaser from 'phaser';
import type { Direction } from '../../types';

const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

const DIR_CODES: Record<Direction, number[]> = {
  up: [KeyCodes.W, KeyCodes.UP],
  down: [KeyCodes.S, KeyCodes.DOWN],
  left: [KeyCodes.A, KeyCodes.LEFT],
  right: [KeyCodes.D, KeyCodes.RIGHT],
};
const INTERACT_CODES = [KeyCodes.E, KeyCodes.SPACE, KeyCodes.ENTER];

export class InputSystem {
  private dirKeys: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private runKey: Phaser.Input.Keyboard.Key;
  private pressOrder: Direction[] = [];
  private interactQueued = false;
  private tappedDir: Direction | null = null;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const add = (code: number) => kb.addKey(code, true, false);
    this.dirKeys = {
      up: DIR_CODES.up.map(add),
      down: DIR_CODES.down.map(add),
      left: DIR_CODES.left.map(add),
      right: DIR_CODES.right.map(add),
    };
    INTERACT_CODES.forEach(add); // enables capture (no page scroll on Space)
    this.runKey = add(KeyCodes.SHIFT);

    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (INTERACT_CODES.includes(e.keyCode)) this.interactQueued = true;
      const dir = (Object.keys(DIR_CODES) as Direction[]).find((d) => DIR_CODES[d].includes(e.keyCode));
      if (dir) this.tappedDir = dir;
    });
  }

  /** Call once per frame before reading directions. */
  update(): void {
    (Object.keys(this.dirKeys) as Direction[]).forEach((dir) => {
      const down = this.dirKeys[dir].some((k) => k.isDown);
      const idx = this.pressOrder.indexOf(dir);
      if (down && idx === -1) this.pressOrder.push(dir);
      if (!down && idx !== -1) this.pressOrder.splice(idx, 1);
    });
  }

  /** Held direction, or a direction tapped since the last frame. */
  direction(): Direction | null {
    const tapped = this.tappedDir;
    this.tappedDir = null;
    if (this.pressOrder.length) return this.pressOrder[this.pressOrder.length - 1];
    return tapped;
  }

  interactPressed(): boolean {
    const pressed = this.interactQueued;
    this.interactQueued = false;
    return pressed;
  }

  running(): boolean {
    return this.runKey.isDown;
  }
}
