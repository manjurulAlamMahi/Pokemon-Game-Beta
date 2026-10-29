// Tiny typed event bus used to talk between Phaser (game logic) and React (UI).

import type { MapId } from '../../types';

export interface GameEvents {
  'map:entered': { mapId: MapId; displayName: string };
  'game:ready': void;
  'objective:set': { objective: string | null };
}

type Handler<T> = (payload: T) => void;

class TypedEventBus<E extends object> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set!.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, ...payload: E[K] extends void ? [] : [E[K]]): void {
    this.handlers.get(event)?.forEach((h) => (h as Handler<E[K]>)(payload[0] as E[K]));
  }
}

export const eventBus = new TypedEventBus<GameEvents>();
