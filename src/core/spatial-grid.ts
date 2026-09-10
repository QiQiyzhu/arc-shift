export interface SpatialBody {
  id: number;
  x: number;
  y: number;
  radius: number;
}
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
interface Entry<T> {
  body: T;
  keys: string[];
  order: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
/** Circle AABBs occupy every touched cell. Query order matches the source array. */
export class UniformGrid<T extends SpatialBody> {
  readonly cells = new Map<string, Set<Entry<T>>>();
  private entries = new Map<T, Entry<T>>();
  constructor(readonly cellSize = 96) {
    if (!Number.isFinite(cellSize) || cellSize <= 0)
      throw Error('Invalid cell size');
  }
  private keys(box: AABB) {
    const keys: string[] = [];
    for (
      let y = Math.floor(box.minY / this.cellSize);
      y <= Math.floor(box.maxY / this.cellSize);
      y++
    )
      for (
        let x = Math.floor(box.minX / this.cellSize);
        x <= Math.floor(box.maxX / this.cellSize);
        x++
      )
        keys.push(x + ',' + y);
    return keys;
  }
  rebuild(bodies: readonly T[]) {
    this.cells.clear();
    this.entries.clear();
    bodies.forEach((body, order) => this.insert(body, order));
  }
  private insert(body: T, order: number) {
    const minX = Math.floor((body.x - body.radius) / this.cellSize),
      minY = Math.floor((body.y - body.radius) / this.cellSize);
    const maxX = Math.floor((body.x + body.radius) / this.cellSize),
      maxY = Math.floor((body.y + body.radius) / this.cellSize);
    const keys: string[] = [];
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) keys.push(x + ',' + y);
    const entry = { body, keys, order, minX, minY, maxX, maxY };
    for (const key of keys) {
      let cell = this.cells.get(key);
      if (!cell) {
        cell = new Set();
        this.cells.set(key, cell);
      }
      cell.add(entry);
    }
    this.entries.set(body, entry);
  }
  order(body: T) {
    return this.entries.get(body)?.order ?? -1;
  }
  update(body: T) {
    const entry = this.entries.get(body);
    if (!entry) return false;
    // Most separation/knockback moves stay inside the same occupied cells. Their
    // cached candidates remain conservative; no membership mutation is needed.
    if (
      entry.minX === Math.floor((body.x - body.radius) / this.cellSize) &&
      entry.minY === Math.floor((body.y - body.radius) / this.cellSize) &&
      entry.maxX === Math.floor((body.x + body.radius) / this.cellSize) &&
      entry.maxY === Math.floor((body.y + body.radius) / this.cellSize)
    )
      return false;
    for (const key of entry.keys) {
      const cell = this.cells.get(key)!;
      cell.delete(entry);
      if (!cell.size) this.cells.delete(key);
    }
    this.insert(body, entry.order);
    return true;
  }
  query(box: AABB): T[] {
    const seen = new Set<Entry<T>>();
    for (const key of this.keys(box))
      for (const entry of this.cells.get(key) ?? []) seen.add(entry);
    return [...seen]
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.body);
  }
}
export function sweptAABB(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
): AABB {
  return {
    minX: Math.min(x1, x2) - radius,
    minY: Math.min(y1, y2) - radius,
    maxX: Math.max(x1, x2) + radius,
    maxY: Math.max(y1, y2) + radius,
  };
}
