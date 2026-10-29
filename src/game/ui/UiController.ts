// Bridge between Phaser story code and React overlays. Story code awaits a
// promise; React renders the overlay and resolves it from player input.

import type { StarterId } from '../../types';
import { Store } from '../utils/Store';

export interface UiState {
  /** Starter preview panel, focused on one starter. */
  starterPanel: { focus: StarterId } | null;
  /** Full-screen "you received a Pokémon" presentation. */
  reveal: { starter: StarterId; trainer: string } | null;
}

class UiControllerImpl {
  readonly store = new Store<UiState>({ starterPanel: null, reveal: null });
  /** When the last overlay closed; game input ignores presses right after. */
  lastClosedAt = 0;
  private panelResolve?: (choice: StarterId | null) => void;
  private revealResolve?: () => void;

  isBlocking(): boolean {
    const s = this.store.get();
    return s.starterPanel !== null || s.reveal !== null;
  }

  /** True briefly after an overlay closes, so the closing key press is not reused. */
  recentlyClosed(ms = 220): boolean {
    return performance.now() - this.lastClosedAt < ms;
  }

  openStarterPanel(focus: StarterId): Promise<StarterId | null> {
    this.store.update((s) => ({ ...s, starterPanel: { focus } }));
    return new Promise((resolve) => (this.panelResolve = resolve));
  }

  setPanelFocus(focus: StarterId): void {
    this.store.update((s) => (s.starterPanel ? { ...s, starterPanel: { focus } } : s));
  }

  closeStarterPanel(choice: StarterId | null): void {
    this.store.update((s) => ({ ...s, starterPanel: null }));
    this.lastClosedAt = performance.now();
    const r = this.panelResolve;
    this.panelResolve = undefined;
    r?.(choice);
  }

  showReveal(starter: StarterId, trainer: string): Promise<void> {
    this.store.update((s) => ({ ...s, reveal: { starter, trainer } }));
    return new Promise((resolve) => (this.revealResolve = resolve));
  }

  closeReveal(): void {
    this.store.update((s) => ({ ...s, reveal: null }));
    this.lastClosedAt = performance.now();
    const r = this.revealResolve;
    this.revealResolve = undefined;
    r?.();
  }
}

export const UI = new UiControllerImpl();
