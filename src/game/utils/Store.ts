// Minimal observable store compatible with React's useSyncExternalStore.

export class Store<T> {
  private listeners = new Set<() => void>();

  constructor(private state: T) {}

  get = (): T => this.state;

  set(next: T): void {
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  update(fn: (prev: T) => T): void {
    this.set(fn(this.state));
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
