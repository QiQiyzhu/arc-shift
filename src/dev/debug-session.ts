import { Engine } from '../game/engine';
import { blankSave } from '../core/save';
import { grantProtocol } from '../cards/system';
import { ENEMIES } from '../data/enemies';
import type { EnemyKind, Input, WeaponId } from '../game/types';

export const neutralInput = (): Input => ({ x: 0, y: 0, aimX: 900, aimY: 360, fire: false, dash: false, q: false, e: false, bomb: false, heal: false });
const edges = ['dash', 'q', 'e', 'bomb', 'heal'] as const;
export class DebugSession {
  readonly engine = new Engine({ save: blankSave(), persistence: false });
  paused = true;
  speed: .25 | .5 | 1 | 2 = 1;
  visible = true;
  hitboxes = false;
  grid = false;
  labels = false;
  selected: number | null = null;
  readonly frames: number[] = [];
  readonly stepTimes: number[] = [];
  private fraction = 0;
  private pending = neutralInput();
  constructor() { this.engine.startPractice(['fire-ember'], 'arc', true); }
  private tick(input: Input) {
    const before = performance.now();
    this.engine.update(1 / 60, input);
    this.stepTimes.push(performance.now() - before);
    if (this.stepTimes.length > 240) this.stepTimes.shift();
  }
  frame(ms: number) { if (ms > 0 && Number.isFinite(ms)) { this.frames.push(ms); if (this.frames.length > 120) this.frames.shift(); } }
  advance(input: Input) {
    if (this.paused) { this.fraction = 0; this.pending = neutralInput(); return; }
    const latched = { ...input };
    for (const key of edges) latched[key] = !!(latched[key] || this.pending[key]);
    this.pending = latched;
    this.fraction += this.speed;
    while (this.fraction >= 1) {
      this.tick({ ...this.pending });
      for (const key of edges) this.pending[key] = false;
      this.fraction--;
    }
  }
  singleStep() { this.paused = true; this.fraction = 0; this.pending = neutralInput(); this.tick(this.pending); }
  spawn(kind: EnemyKind) {
    if (!Object.hasOwn(ENEMIES, kind) || this.engine.world.enemies.length >= 300) return false;
    const e = this.engine.world.spawn(kind, 880, 350);
    this.selected = e.id; return true;
  }
  grant(id: string) { return grantProtocol(this.engine.world, id); }
  setWeapon(id: WeaponId) {
    if (!(['arc', 'sword', 'cannon'] as string[]).includes(id)) return false;
    const w = this.engine.world; w.weapon = id;
    if (!w.forms.includes(id)) w.forms.push(id);
    return true;
  }
  get stats() {
    const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const frameMs = mean(this.frames), sorted = [...this.stepTimes].sort((a, b) => a - b);
    return { fps: frameMs ? 1000 / frameMs : 0, frameMs, stepP95: sorted[Math.floor((sorted.length - 1) * .95)] ?? 0 };
  }
}
