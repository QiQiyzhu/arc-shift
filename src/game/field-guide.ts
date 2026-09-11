import type { Engine } from './engine';
import type { World } from './world';
import { grantProtocol } from '../cards/system';
import { expedition } from '../rooms/expedition';
import { terrainFor } from '../rooms/terrain';
import { makeRoom } from '../rooms/generator';

export type GuideStep =
  | 'move'
  | 'fire'
  | 'dash'
  | 'pulse'
  | 'forge'
  | 'resonance'
  | 'boss'
  | 'complete';
export const GUIDE_STEPS: GuideStep[] = [
  'move',
  'fire',
  'dash',
  'pulse',
  'forge',
  'resonance',
  'boss',
  'complete',
];
export const GUIDE_BUILDS = [
  {
    id: 'plasma',
    name: '电浆剑舞',
    detail: '同一斩击铺燃烧，电弧消耗状态引爆敌群',
    weapon: 'sword',
    cards: ['fire-ember', 'storm-arc', 'storm-conduct', 'fire-blast'],
  },
  {
    id: 'prism',
    name: '折光弹幕',
    detail: '同一弹体反弹后更强追踪，但逐次损失伤害',
    weapon: 'arc',
    cards: ['fire-split', 'ice-prism', 'void-seek', 'storm-needle'],
  },
] as const;

/** Optional, disposable practice director. Never alters campaign/save/replay rules.
 * Advancement uses completed actions/state, rather than assumed reading time. */
export class FieldGuide {
  step: GuideStep = 'move';
  active = false;
  build = '';
  private owner?: World;
  private startX = 0;
  private startY = 0;
  private damage = 0;
  private kills = 0;
  private started = 0;
  start(engine: Engine) {
    engine.startPractice(['fire-ember'], 'arc');
    const w = engine.world;
    w.room = { ...expedition(w.seed)[0].room, name: '行者演练场' };
    w.terrain = terrainFor(w.room);
    w.phase = 'playing';
    w.enemies = [];
    w.wave = 99;
    w.spawnTimer = 1e9;
    w.player.x = 640;
    w.player.y = 440;
    this.owner = w;
    this.startX = w.player.x;
    this.startY = w.player.y;
    this.step = 'move';
    this.active = true;
    this.build = '';
  }
  stop() {
    this.active = false;
    this.owner = undefined;
  }
  tick(engine: Engine) {
    const w = engine.world;
    if (!this.active) return;
    if (this.owner !== w || w.phase === 'menu' || !engine.practice) {
      this.stop();
      return;
    }
    if (this.step === 'boss' && w.phase === 'victory') {
      this.step = 'complete';
      return;
    }
    if (w.phase !== 'playing') return;
    const completed =
      this.step === 'move'
        ? Math.hypot(w.player.x - this.startX, w.player.y - this.startY) >= 80
        : this.step === 'fire'
          ? w.totalDamage - this.damage >= 25
          : this.step === 'dash'
            ? w.player.dashCd > 0.1
            : this.step === 'pulse'
              ? w.player.qCd > 0.1
              : this.step === 'resonance'
                ? w.kills - this.kills >= 4 || w.elapsed - this.started >= 45
                : false;
    if (completed) this.next(engine);
  }
  next(engine: Engine) {
    if (
      !this.active ||
      this.owner !== engine.world ||
      this.step === 'forge' ||
      this.step === 'complete'
    )
      return;
    const w = engine.world;
    this.step = GUIDE_STEPS[GUIDE_STEPS.indexOf(this.step) + 1];
    if (this.step === 'fire') {
      this.damage = w.totalDamage;
      const target = w.spawn('sentry', 760, 330);
      target.hp = target.maxHp = 400;
      target.speed = 0;
      target.state = 'cooldown';
      target.timer = 1e6;
    }
    if (this.step === 'dash') w.player.dashCd = 0;
    if (this.step === 'pulse') {
      w.player.qCd = 0;
      w.projectiles.clear();
      w.spawn('hunter', w.player.x + 85, w.player.y);
    }
    if (this.step === 'forge') {
      w.enemies = [];
      w.projectiles.clear();
      w.hazards = [];
      w.pickups = [];
      engine.pause();
    }
    if (this.step === 'boss') {
      engine.enter({
        ...makeRoom(8, 'boss', w.seed),
        name: '守门人的试炼',
        bossKind: 'warden',
        biome: 'foundry',
        nodeId: 'guide-boss',
      });
      const boss = w.boss;
      if (boss) boss.hp = boss.maxHp = 950;
    }
  }
  choose(engine: Engine, id: string) {
    const build = GUIDE_BUILDS.find((b) => b.id === id);
    if (
      !this.active ||
      this.owner !== engine.world ||
      this.step !== 'forge' ||
      !build
    )
      return false;
    const w = engine.world;
    for (const card of build.cards) grantProtocol(w, card);
    w.weapon = build.weapon;
    w.forms = [build.weapon];
    w.player.shotCd = 0;
    this.build = build.name;
    this.kills = w.kills;
    this.started = w.elapsed;
    this.step = 'resonance';
    if (w.phase === 'paused') engine.pause();
    for (let i = 0; i < 4; i++) {
      const enemy = w.spawn(
        i % 2 ? 'lancer' : 'hunter',
        420 + (i % 2) * 430,
        260 + Math.floor(i / 2) * 250,
      );
      enemy.hp = enemy.maxHp = 110;
    }
    return true;
  }
}
