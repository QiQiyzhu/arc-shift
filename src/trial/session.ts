import { Engine } from '../game/engine';
import { blankSave } from '../core/save';
import { deriveStats } from '../cards/system';
import { makeRoom } from '../rooms/generator';
import type { Input, WeaponId } from '../game/types';
import { DEFAULT_TRIAL, validateTrial, type TrialConfig } from './config';
export interface TrialResult {
  stage: number;
  name: string;
  outcome: 'clear' | 'defeated' | 'timeout';
  ticks: number;
  damage: number;
  damageTaken: number;
  kills: number;
  shots: number;
  reactions: number;
  hp: number;
  cards: string[];
  cost: number;
  repairSpent: number;
  weapon: WeaponId;
  contract: 'supply' | 'overload' | null;
  contractReward: number;
  capacityBefore: number;
  earnedCapacity: number;
}
export class BuildTrialSession {
  readonly engine: Engine;
  readonly config: TrialConfig;
  state: 'planning' | 'contract' | 'combat' | 'result' | 'finished' | 'failed' =
    'planning';
  stage = 0;
  cards: string[] = [];
  repairSpent = 0;
  repaired = false;
  contract: 'supply' | 'overload' | null = null;
  earnedCapacity = 0;
  supplyRecovered = 0;
  healthPaid = 0;
  weaponLocked = false;
  results: TrialResult[] = [];
  ticks = 0;
  shots = 0;
  kills = 0;
  private counters = { damage: 0, hurt: 0, reactions: 0 };
  private off?: () => void;
  constructor(config: TrialConfig = DEFAULT_TRIAL) {
    const valid = validateTrial(config);
    if (!valid.ok) throw Error(valid.errors.join('；'));
    this.config = valid.value;
    const e = (this.engine = new Engine({
      save: blankSave(),
      persistence: false,
      content: this.config.content,
    }));
    e.start(this.config.seed);
    e.world.scenario = 'build-trial';
    e.world.weapon = this.config.weapons[0];
    e.world.forms = [e.world.weapon];
    e.world.level = 3;
    e.world.wallet = { coins: 0, keys: 0, bombs: 0, tonics: 0, shards: 0 };
    e.world.phase = 'reward';
    this.applyCards();
    this.activate();
  }
  activate() {
    if (!this.off)
      this.off = this.engine.world.bus.on((event) => {
        if (this.state === 'combat') {
          if (event.kind === 'shot' || event.kind === 'slash') this.shots++;
          if (event.kind === 'kill') this.kills++;
        }
      });
  }
  get capacity() {
    return (
      this.config.stages[this.stage].budget +
      (this.stage === 2 ? this.earnedCapacity : 0) -
      this.repairSpent
    );
  }
  chooseWeapon(weapon: WeaponId) {
    if (
      this.state !== 'planning' ||
      this.weaponLocked ||
      !this.config.weapons.includes(weapon)
    )
      return false;
    this.engine.world.weapon = weapon;
    this.engine.world.forms = [weapon];
    return true;
  }
  chooseContract(choice: 'supply' | 'overload') {
    const c = this.config.contract;
    if (
      this.state !== 'contract' ||
      this.contract ||
      !c ||
      !['supply', 'overload'].includes(choice)
    )
      return false;
    if (choice === 'overload' && this.engine.world.player.hp <= c.healthCost)
      return false;
    this.contract = choice;
    if (choice === 'supply') {
      const p = this.engine.world.player;
      this.supplyRecovered = Math.min(c.supplyHealth, p.maxHp - p.hp);
      p.hp += this.supplyRecovered;
    } else {
      this.healthPaid = c.healthCost;
      this.engine.world.player.hp -= c.healthCost;
    }
    this.stage = 1;
    this.repaired = false;
    this.state = 'planning';
    return true;
  }
  get enemies() {
    const base = this.config.stages[this.stage].enemies.map((e) => ({
      ...e,
      elite: false,
    }));
    if (
      this.stage === 1 &&
      this.contract === 'overload' &&
      this.config.contract
    )
      base.push({ ...this.config.contract.elite, elite: true });
    return base;
  }
  get spent() {
    return this.cards.reduce(
      (n, id) => n + this.config.offers.find((o) => o.id === id)!.cost,
      0,
    );
  }
  get remaining() {
    return this.capacity - this.spent;
  }
  private applyCards() {
    const w = this.engine.world;
    w.cards = [...this.cards];
    w.stats = deriveStats(w.cards, w.level, [], w.content);
  }
  toggle(id: string) {
    if (this.state !== 'planning') return false;
    const offer = this.config.offers.find((o) => o.id === id);
    if (!offer || offer.unlock > this.stage) return false;
    const next = this.cards.includes(id)
      ? this.cards.filter((c) => c !== id)
      : [...this.cards, id];
    if (
      next.length > this.config.slots ||
      next.reduce(
        (n, k) => n + this.config.offers.find((o) => o.id === k)!.cost,
        0,
      ) > this.capacity
    )
      return false;
    if (
      next.some((k) => {
        const r = this.config.content.cards.find((c) => c.id === k)?.requires;
        return r && !next.includes(r);
      })
    )
      return false;
    this.cards = next;
    this.applyCards();
    return true;
  }
  repair() {
    const p = this.engine.world.player;
    if (
      this.state !== 'planning' ||
      this.stage === 0 ||
      !this.cards.length ||
      this.repaired ||
      p.hp >= p.maxHp ||
      this.remaining < this.config.repairCost
    )
      return false;
    this.repairSpent += this.config.repairCost;
    this.repaired = true;
    p.hp = Math.min(p.maxHp, p.hp + this.config.repairHealth);
    return true;
  }
  start() {
    if (this.state !== 'planning' || !this.cards.length) return false;
    this.weaponLocked = true;
    const e = this.engine,
      w = e.world,
      stage = this.config.stages[this.stage];
    e.enter({
      ...makeRoom(this.stage + 1, 'combat', this.config.seed),
      nodeId: `trial-${this.stage}`,
      name: stage.name,
      subtitle: stage.purpose,
      biome: 'sanctum',
      template: this.stage,
    });
    // Director owns spawns and settlement. Engine still owns every combat system.
    w.wave = 0;
    w.spawnTimer = 1e9;
    w.enemies = [];
    w.level = 3;
    w.xp = 0;
    const corners = [
      { x: 76, y: 100, w: 130, h: 70 },
      { x: 1074, y: 100, w: 130, h: 70 },
      { x: 76, y: 562, w: 130, h: 70 },
      { x: 1074, y: 562, w: 130, h: 70 },
    ];
    w.terrain = {
      blocks: stage.cover
        ? [
            ...corners,
            { x: 360, y: 300, w: 90, h: 65 },
            { x: 830, y: 390, w: 90, h: 65 },
          ]
        : corners,
      zones: [],
    };
    this.applyCards();
    for (const spec of this.enemies) {
      const enemy = w.spawn(spec.kind, spec.x, spec.y, spec.elite, true);
      enemy.hp = enemy.maxHp =
        w.content.enemies.find((r) => r.id === spec.kind)!.params.hp *
        (spec.elite ? 1.65 : 1);
    }
    if (
      stage.enemies.some((e) =>
        ['warden', 'oracle', 'matron', 'forgemaster'].includes(e.kind),
      )
    ) {
      w.phase = 'bossIntro';
      w.transitionTimer = 2.4;
    }
    this.ticks = 0;
    this.shots = 0;
    this.kills = 0;
    this.counters = {
      damage: w.totalDamage,
      hurt: w.damageTaken,
      reactions: w.reactionCount,
    };
    this.state = 'combat';
    return true;
  }
  step(dt: number, input: Input) {
    if (this.state !== 'combat') return;
    if (!Number.isFinite(dt) || Math.abs(dt - 1 / 60) > 1e-10)
      throw Error('Fixed 60 Hz required');
    const w = this.engine.world,
      playing = w.phase === 'playing';
    this.engine.update(dt, input);
    if (playing) this.ticks++;
    if (w.player.hp <= 0 || w.phase === 'gameover') this.settle('defeated');
    else if (!w.enemies.some((enemy) => enemy.hp > 0) && playing)
      this.settle('clear');
    else if (this.ticks >= this.config.stages[this.stage].limit * 60)
      this.settle('timeout');
  }
  private settle(outcome: TrialResult['outcome']) {
    if (this.state !== 'combat') return;
    const w = this.engine.world;
    const capacityBefore = this.capacity;
    const contractReward =
      outcome === 'clear' && this.stage === 1 && this.contract === 'overload'
        ? this.config.contract!.rewardCapacity
        : 0;
    this.earnedCapacity += contractReward;
    this.results.push({
      stage: this.stage,
      name: this.config.stages[this.stage].name,
      outcome,
      ticks: this.ticks,
      damage: w.totalDamage - this.counters.damage,
      damageTaken: w.damageTaken - this.counters.hurt,
      kills: this.kills,
      shots: this.shots,
      reactions: w.reactionCount - this.counters.reactions,
      hp: w.player.hp,
      cards: [...this.cards],
      cost: this.spent,
      repairSpent: this.repairSpent,
      weapon: w.weapon,
      contract: this.contract,
      contractReward,
      capacityBefore,
      earnedCapacity: this.earnedCapacity,
    });
    this.state = outcome === 'clear' ? 'result' : 'failed';
    w.phase = outcome === 'clear' ? 'reward' : 'gameover';
    w.projectiles.clear();
    w.hazards = [];
    w.emit(
      outcome === 'clear' ? 'reward' : 'hurt',
      w.player.x,
      w.player.y,
      0xc9e8a0,
    );
  }
  next() {
    if (this.state !== 'result') return false;
    if (this.stage === 0 && this.config.contract) {
      this.state = 'contract';
      return true;
    }
    if (this.stage === 2) {
      this.state = 'finished';
      this.engine.world.phase = 'victory';
      return true;
    }
    this.stage++;
    this.repaired = false;
    this.state = 'planning';
    return true;
  }
  export() {
    return {
      schemaVersion: 2,
      kind: 'build-trial-results',
      rulesVersion: '2.0-contract.2',
      weapon: this.engine.world.weapon,
      contract: this.contract,
      supplyRecovered: this.supplyRecovered,
      healthPaid: this.healthPaid,
      earnedCapacity: this.earnedCapacity,
      config: structuredClone(this.config),
      results: structuredClone(this.results),
      state: this.state,
      notice:
        '本次实战记录，不同阶段的敌人与支出不同，不能直接作为单卡强弱或真人研究结论。',
    };
  }
  dispose() {
    this.off?.();
    this.off = undefined;
  }
}
