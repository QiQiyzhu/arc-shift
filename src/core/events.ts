export type EffectEvent = {
  kind:
    | 'shot'
    | 'hit'
    | 'crit'
    | 'kill'
    | 'hurt'
    | 'dash'
    | 'skill'
    | 'reward'
    | 'phase'
    | 'victory'
    | 'room'
    | 'pickup'
    | 'slash'
    | 'bomb';
  weapon?: import('../game/types').WeaponId;
  element?: import('../game/types').Element;
  reaction?: string;
  x: number;
  y: number;
  color: number;
  amount?: number;
  x2?: number;
  y2?: number;
};
export class EventBus<T> {
  private listeners = new Set<(event: T) => void>();
  on(fn: (event: T) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(event: T) {
    for (const fn of this.listeners) fn(event);
  }
  clear() {
    this.listeners.clear();
  }
  get listenerCount() {
    return this.listeners.size;
  }
}
