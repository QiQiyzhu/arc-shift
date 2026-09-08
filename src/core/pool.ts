export class Pool<T extends { active: boolean }> {
  readonly items: T[];
  misses = 0;
  private cursor = 0;
  constructor(
    readonly capacity: number,
    factory: () => T,
  ) {
    this.items = Array.from({ length: capacity }, factory);
  }
  acquire(): T | undefined {
    for (let i = 0; i < this.capacity; i++) {
      const n = (this.cursor + i) % this.capacity;
      if (!this.items[n].active) {
        this.cursor = (n + 1) % this.capacity;
        this.items[n].active = true;
        return this.items[n];
      }
    }
    this.misses++;
    return undefined;
  }
  clear() {
    for (const item of this.items) item.active = false;
  }
  get count() {
    let n = 0;
    for (const i of this.items) if (i.active) n++;
    return n;
  }
}
