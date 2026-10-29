// Owns the active conversation: queue of lines, typewriter progress and the
// close callback. Phaser drives it (input + timing); React renders it.

import { Sfx } from '../systems/Sfx';
import { Store } from '../utils/Store';

export interface DialogueView {
  open: boolean;
  speaker?: string;
  /** Sprite key for the speaker portrait (character or creature sheet). */
  portrait?: string;
  text: string;
  /** Number of characters currently revealed. */
  shown: number;
  /** True when the current line is fully revealed. */
  lineDone: boolean;
  isLast: boolean;
  /** Increments for every new line, used by the UI for transitions. */
  lineKey: number;
}

const CHARS_PER_SECOND = 48;

const CLOSED: DialogueView = { open: false, text: '', shown: 0, lineDone: true, isLast: true, lineKey: 0 };

class DialogueControllerImpl {
  readonly store = new Store<DialogueView>(CLOSED);
  private lines: string[] = [];
  private index = 0;
  private progress = 0;
  private speaker?: string;
  private portrait?: string;
  private onClose?: () => void;
  private lineKey = 0;
  /** Timestamp of the last close; used to debounce re-triggering. */
  lastClosedAt = 0;

  get isOpen(): boolean {
    return this.store.get().open;
  }

  open(lines: string[], speaker?: string, onClose?: () => void, portrait?: string): void {
    if (!lines.length) return;
    this.lines = lines;
    this.index = 0;
    this.progress = 0;
    this.speaker = speaker;
    this.portrait = portrait;
    this.onClose = onClose;
    this.lineKey++;
    this.publish();
  }

  /** Interaction key pressed while dialogue is open. */
  advance(): void {
    if (!this.isOpen) return;
    const line = this.lines[this.index];
    if (this.progress < line.length) {
      this.progress = line.length; // skip the typewriter
      this.publish();
      return;
    }
    Sfx.advance();
    if (this.index < this.lines.length - 1) {
      this.index++;
      this.progress = 0;
      this.lineKey++;
      this.publish();
    } else {
      this.close();
    }
  }

  close(): void {
    this.lines = [];
    this.store.set({ ...CLOSED, lineKey: this.lineKey });
    this.lastClosedAt = performance.now();
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }

  /** Advance the typewriter; called every frame by the active scene. */
  update(deltaMs: number): void {
    if (!this.isOpen) return;
    const line = this.lines[this.index];
    if (this.progress >= line.length) return;
    const before = Math.floor(this.progress);
    this.progress = Math.min(line.length, this.progress + (deltaMs / 1000) * CHARS_PER_SECOND);
    const after = Math.floor(this.progress);
    if (after !== before) {
      if (after % 3 === 0 && line[after - 1] !== ' ') Sfx.blip();
      this.publish();
    }
  }

  private publish(): void {
    const line = this.lines[this.index];
    const shown = Math.floor(this.progress);
    this.store.set({
      open: true,
      speaker: this.speaker,
      portrait: this.portrait,
      text: line,
      shown,
      lineDone: shown >= line.length,
      isLast: this.index === this.lines.length - 1,
      lineKey: this.lineKey,
    });
  }
}

export const DialogueController = new DialogueControllerImpl();
