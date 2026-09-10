import { World } from './world';
import { updatePlayer } from '../systems/player';
import { updateEnemies } from '../ai/enemy-ai';
import { updateProjectiles } from '../combat/projectiles';
import { updateHazards } from '../systems/hazards';
import { Random, distance } from '../core/math';
import { makeRoom, roomWaveCount, roomChoices } from '../rooms/generator';
import type { EnemyKind, Input, Room, RoomKind } from './types';
import type { GameCommand, SimulationObserver } from '../core/replay-contract';
import { deriveStats, rewardChoices } from '../cards/system';
import { loadSave, writeSave, type SaveData } from '../core/save';
import {
  SHOP,
  WORKSHOP,
  startingWallet,
  weaponId,
  type ShopId,
  type Preparation,
} from '../economy/catalog';
import { grant, updatePickups } from '../economy/loot';
import { updateWeapon } from '../combat/weapons';
import { expedition, availableNodes } from '../rooms/expedition';
import { terrainFor, updateTerrain } from '../rooms/terrain';
import { RELICS, LORE } from '../progression/catalog';
import { DEFAULT_CONTENT, validateContent, type ContentPack } from '../content/schema';
export class Engine {
  world = new World();
  private settled = false;
  private resumePhase: 'playing' | 'transition' | 'bossIntro' = 'playing';
  save: SaveData;
  storageAvailable = true;
  practice = false;
  persistenceEnabled = true;
  observer?: SimulationObserver;
  readonly content: ContentPack;
  private decision<T extends boolean | void>(
    command: GameCommand,
    perform: () => T,
  ): T {
    this.observer?.beforeCommand(command);
    const result = perform();
    this.observer?.command(command, result);
    return result;
  }
  constructor(options?: { save?: SaveData; persistence?: boolean; content?: ContentPack }) {
    const content = options?.content ? validateContent(options.content) : { ok: true as const, value: DEFAULT_CONTENT };
    if (!content.ok) throw Error(content.errors.join('\n'));
    this.content = content.value;
    this.world = new World(this.content);
    this.save = options?.save ? structuredClone(options.save) : loadSave();
    this.persistenceEnabled = options?.persistence ?? true;
  }
  /** Includes private control state that can affect future simulation. */
  deterministicState() {
    return {
      world: this.world,
      settled: this.settled,
      resumePhase: this.resumePhase,
      practice: this.practice,
      meta: this.save.meta,
      checkpoint: this.save.checkpoint,
    };
  }
  persist() {
    if (!this.persistenceEnabled) return;
    this.storageAvailable = writeSave(this.save);
  }
  start(seed = Date.now() % 1e8) {
    this.observer?.reset();
    this.resumePhase = 'playing';
    this.practice = false;
    this.settled = false;
    const bus = this.world.bus;
    this.world = new World(this.content);
    this.world.bus = bus;
    this.world.seed = seed;
    this.world.rng = new Random(seed);
    this.world.weapon = this.save.meta.weapon;
    this.world.campaign = 'pilgrimage';
    this.world.forms = [this.world.weapon];
    this.world.relics =
      this.save.meta.equipped &&
      this.save.meta.unlocked.includes(this.save.meta.equipped)
        ? [this.save.meta.equipped]
        : [];
    this.world.preparation = { ...this.save.meta.preparation };
    this.world.wallet = startingWallet(this.world.preparation);
    this.world.player.maxHp = this.world.player.hp =
      120 + this.world.preparation.vitality * 10;
    if (this.world.weapon === 'sword' && this.world.relics.includes('vow-edge'))
      this.world.player.shield = 15;
    this.world.room = expedition(seed)[0].room;
    this.world.route = [this.world.room.nodeId!];
    this.world.phase = 'reward';
    this.world.rewardContext = 'start';
    this.world.rewards = rewardChoices([], seed, 0, true, false, this.content);
    this.save.meta.runs++;
    this.save.checkpoint = null;
    this.persist();
  }
  chooseCard(id: string) {
    return this.decision({ type: 'reward', id }, () => this.chooseCardImpl(id));
  }
  private chooseCardImpl(id: string) {
    const w = this.world;
    if (
      w.phase !== 'reward' ||
      !w.rewards.some((c) => c.id === id) ||
      w.cards.includes(id)
    )
      return false;
    this.integrateCard(id);
    w.emit('reward', w.player.x, w.player.y);
    if (w.rewardContext === 'start') this.enter(w.room);
    else {
      w.phase = 'map';
      this.checkpoint();
    }
    return true;
  }
  private integrateCard(id: string) {
    const w = this.world;
    if (w.cards.includes(id)) return;
    w.cards.push(id);
    w.stats = deriveStats(w.cards, w.level, w.relics, w.content);
    if (id === 'ice-shell') {
      w.player.maxHp += 40;
      w.player.hp = Math.min(w.player.maxHp, w.player.hp + 40);
    }
    if (!this.practice && !this.save.meta.discovered.includes(id))
      this.save.meta.discovered.push(id);
  }
  checkpoint() {
    if (this.practice) return;
    const w = this.world;
    this.save.checkpoint = {
      campaign: w.campaign,
      route: [...w.route],
      forms: [...w.forms],
      relics: [...w.relics],
      eventDone: w.eventDone,
      weapon: w.weapon,
      preparation: { ...w.preparation },
      wallet: { ...w.wallet },
      campUsed: [...w.campUsed],
      rerolls: w.rerolls,
      banked: w.banked,
      progress:
        w.phase === 'reward'
          ? 'reward'
          : w.phase === 'map'
            ? 'map'
            : w.phase === 'event'
              ? 'event'
              : 'entry',
      seed: w.seed,
      room: w.room,
      cards: [...w.cards],
      hp: w.player.hp,
      shield: w.player.shield,
      level: w.level,
      xp: w.xp,
      elapsed: w.elapsed,
      kills: w.kills,
      totalDamage: w.totalDamage,
      damageTaken: w.damageTaken,
    };
    this.persist();
  }
  resume() {
    const c = this.save.checkpoint;
    if (!c) return false;
    this.observer?.reset();
    this.resumePhase = 'playing';
    this.practice = false;
    this.settled = false;
    const bus = this.world.bus;
    this.world = new World(this.content);
    const w = this.world;
    w.bus = bus;
    Object.assign(w, {
      seed: c.seed,
      cards: [...c.cards],
      level: c.level,
      xp: c.xp,
      elapsed: c.elapsed,
      kills: c.kills,
      totalDamage: c.totalDamage,
      damageTaken: c.damageTaken,
      weapon: weaponId(c.weapon),
      campaign: c.campaign || 'legacy',
      route: [...(c.route || [])],
      forms: [...(c.forms || [weaponId(c.weapon)])],
      relics: [...(c.relics || [])],
      eventDone: c.eventDone || false,
      preparation: {
        ...(c.preparation || { vitality: 0, flask: 0, stipend: 0 }),
      },
      wallet: { ...(c.wallet || startingWallet()) },
      campUsed: [...(c.campUsed || [])],
      rerolls: c.rerolls || 0,
      banked: c.banked || 0,
    });
    w.rng = new Random(c.seed + c.room.index * 1129);
    w.stats = deriveStats(w.cards, w.level, w.relics, w.content);
    w.player.maxHp =
      120 + w.preparation.vitality * 10 + (w.has('ice-shell') ? 40 : 0);
    w.player.hp = Math.min(w.player.maxHp, c.hp);
    w.player.shield = c.shield || 0;
    if (
      c.progress === 'map' ||
      c.progress === 'reward' ||
      c.progress === 'event'
    ) {
      w.room = c.room;
      w.terrain = terrainFor(w.room);
      w.phase = c.progress;
      w.rewardContext = 'clear';
      w.rewards = rewardChoices(
        w.cards,
        w.seed + w.rerolls * 31991,
        w.room.index,
        false,
        w.room.kind === 'elite',
        w.content,
      );
    } else this.enter(c.room, true);
    return true;
  }
  enter(room: Room, resuming = false) {
    const w = this.world;
    w.room = room;
    w.terrain = terrainFor(room);
    w.terrainTick = 0;
    w.fieldBuff = false;
    w.eventDone = false;
    w.challengeTime = 0;
    w.supportCd = { arc: 0, sword: 0, cannon: 0 };
    if (w.campaign === 'pilgrimage' && !this.practice)
      this.remember(
        room.biome === 'grove'
          ? 'grove'
          : room.biome === 'foundry'
            ? 'foundry'
            : 'threshold',
      );
    w.roomTime = 0;
    w.wave = 0;
    w.spawnTimer = 1.1;
    w.clearTimer = 0;
    w.enemies = [];
    w.projectiles.clear();
    w.hazards = [];
    w.pickups = [];
    w.bombs = [];
    w.swing = null;
    w.combo = w.comboTime = w.bombCd = 0;
    w.campUsed = [];
    w.campMessage = '';
    w.rerolls = 0;
    w.roomCoinDrops = 0;
    w.echo = { x: 0, y: 0, time: 0, shots: 0 };
    w.companionCd = 0;
    w.rng = new Random(
      (w.campaign === 'pilgrimage' ? room.seed : w.seed) + room.index * 1129,
    );
    Object.assign(w.player, {
      x: 640,
      y: 440,
      vx: 0,
      vy: 0,
      invulnerable: 1,
      dashTime: 0,
      dashCd: 0,
      qCd: 0,
      eCd: 0,
      shotCd: 0,
    });
    w.phase = room.kind === 'boss' ? 'bossIntro' : 'transition';
    if (
      w.campaign === 'pilgrimage' &&
      ['heal', 'treasure', 'event', 'shop', 'forge', 'archive'].includes(
        room.kind,
      )
    )
      w.phase = 'event';
    w.transitionTimer = room.kind === 'boss' ? 2.8 : 1.3;
    if (room.kind === 'boss')
      w.spawn(
        room.bossKind || (room.index === 4 ? 'warden' : 'oracle'),
        640,
        270,
      );
    if (
      !resuming &&
      w.relics.includes('kiln-heart') &&
      ['combat', 'elite', 'challenge', 'boss'].includes(room.kind)
    )
      w.player.shield = Math.min(30, w.player.shield + 10);
    w.emit('room', 640, 350);
    this.checkpoint();
  }
  update(dt: number, input: Input) {
    this.observer?.beforeStep(dt, input);
    this.world.tick++;
    this.advance(dt, input);
    this.observer?.afterStep();
  }
  private advance(dt: number, input: Input) {
    const w = this.world;
    if (w.phase === 'transition' || w.phase === 'bossIntro') {
      w.transitionTimer -= dt;
      if (w.transitionTimer <= 0) {
        w.phase = 'playing';
        if (w.room.kind === 'heal') {
          w.player.hp = Math.min(w.player.maxHp, w.player.hp + 50);
          this.clear();
        }
        if (w.room.kind === 'treasure') this.clear();
      }
      return;
    }
    if (w.phase !== 'playing') return;
    w.reactionBudget = 12;
    for (const e of w.enemies) e.reactionCd = Math.max(0, e.reactionCd - dt);
    if (this.practice) {
      w.player.hp = w.player.maxHp;
      w.player.invulnerable = 1;
    }
    w.elapsed += dt;
    w.roomTime += dt;
    updatePlayer(w, input, dt);
    updateWeapon(w, dt);
    updateTerrain(w, dt);
    if (w.player.hp <= 0) {
      this.finish();
      return;
    }
    updateEnemies(w, dt);
    if (w.player.hp > 0) updateProjectiles(w, dt);
    if (w.player.hp > 0) updateHazards(w, dt);
    if (w.player.hp > 0) updatePickups(w, dt);
    if (w.player.hp <= 0) {
      this.finish();
      return;
    }
    if (w.room.kind === 'boss') {
      if (!w.boss) this.clear();
      return;
    }
    w.spawnTimer -= dt;
    const maxWaves = this.practice
      ? Infinity
      : w.room.kind === 'challenge'
        ? w.content.encounters[0].params.challengeWaves
        : w.campaign === 'pilgrimage'
          ? w.room.kind === 'elite'
            ? w.content.encounters[0].params.eliteWaves
            : w.content.encounters[0].params.combatWaves
          : roomWaveCount(w.room.index);
    if (w.room.kind === 'challenge') {
      if (Math.hypot(w.player.x - 640, w.player.y - 365) < 100)
        w.challengeTime += dt;
      if (w.challengeTime >= 18) {
        this.clear();
        return;
      }
    }
    if (
      w.wave < maxWaves &&
      w.spawnTimer <= 0 &&
      (!(this.practice || w.room.kind === 'challenge') || w.enemies.length < 22)
    ) {
      this.spawnWave();
      w.wave++;
      w.spawnTimer = w.content.encounters[0].params.interval;
    }
    if (
      w.room.kind !== 'challenge' &&
      w.wave >= maxWaves &&
      w.enemies.length === 0
    ) {
      w.clearTimer += dt;
      if (w.clearTimer > 0.7) this.clear();
    }
  }
  spawnWave() {
    const w = this.world;
    const kinds: EnemyKind[] = [...w.content.encounters[0].pool];
    if (w.room.index >= 3) kinds.push('weaver');
    if (w.room.index >= 5) kinds.push('conduit');
    if (w.campaign === 'pilgrimage') {
      if (w.room.biome === 'grove') kinds.push('cantor', 'shade');
      if (w.room.biome === 'foundry') kinds.push('bomber', 'shade');
      if (w.room.kind === 'challenge') kinds.push('bomber');
    }
    const count =
      w.content.encounters[0].params.baseCount +
      (w.campaign === 'pilgrimage'
        ? Math.ceil(w.room.index / 2)
        : w.room.index) +
      (w.room.kind === 'elite' ? w.content.encounters[0].params.eliteBonus : 0);
    for (let i = 0; i < count; i++) {
      const angle = w.rng.next() * Math.PI * 2;
      let x = 640 + Math.cos(angle) * 480,
        y = 360 + Math.sin(angle) * 220;
      if (distance({ x, y }, w.player) < 190) {
        x = 1280 - x;
        y = 720 - y;
      }
      w.spawn(w.rng.pick(kinds), x, y, w.room.kind === 'elite' && i === 0);
    }
  }
  clear() {
    const w = this.world;
    if (w.phase !== 'playing' || this.settled) return;
    w.projectiles.clear();
    w.hazards = [];
    w.bombs = [];
    w.swing = null;
    updatePickups(w, 0, true);
    if (!this.practice) {
      for (const kind of w.encountered)
        if (!this.save.meta.enemies.includes(kind))
          this.save.meta.enemies.push(kind);
      if (w.room.kind === 'boss') {
        const boss =
          w.room.bossKind || (w.room.index === 4 ? 'warden' : 'oracle');
        if (!this.save.meta.bosses.includes(boss))
          this.save.meta.bosses.push(boss);
        this.remember(boss);
      }
    }
    w.enemies = [];
    grant(w, 'coins', w.room.kind === 'treasure' ? 16 : 4);
    grant(
      w,
      'shards',
      w.room.kind === 'challenge'
        ? 5
        : w.room.kind === 'elite'
          ? 3
          : w.room.kind === 'boss'
            ? 4
            : 1,
    );
    if (w.room.kind === 'treasure') grant(w, 'keys', 1);
    w.player.hp = Math.min(
      w.player.maxHp,
      w.player.hp + 12 + (w.relics.includes('choir-vial') ? 8 : 0),
    );
    w.phase =
      w.room.index === (w.campaign === 'pilgrimage' ? 12 : 8)
        ? 'victory'
        : 'reward';
    w.rewardContext = 'clear';
    w.rewards = rewardChoices(
      w.cards,
      w.seed,
      w.room.index,
      false,
      w.room.kind === 'elite',
      w.content,
    );
    w.emit(
      w.phase === 'victory' ? 'victory' : 'reward',
      w.player.x,
      w.player.y,
      0xd4f7a3,
    );
    if (w.phase === 'victory') this.finish();
    else this.checkpoint();
  }
  finish() {
    if (this.practice) return;
    const w = this.world;
    if (this.settled || !['victory', 'gameover'].includes(w.phase)) return;
    this.settled = true;
    const m = this.save.meta;
    w.settlement =
      w.phase === 'victory'
        ? w.wallet.shards + 8
        : Math.floor(w.wallet.shards * 0.5);
    m.shards = Math.min(99999, m.shards + w.settlement);
    w.wallet.shards = 0;
    m.bestRoom = Math.max(m.bestRoom, w.room.index);
    m.totalKills += w.kills;
    if (w.phase === 'victory') {
      m.wins++;
      if (!m.bestTime || w.elapsed < m.bestTime) m.bestTime = w.elapsed;
    }
    this.save.checkpoint = null;
    this.persist();
  }
  pause() {
    return this.decision({ type: 'pause' }, () => this.pauseImpl());
  }
  private pauseImpl() {
    const phase = this.world.phase;
    if (
      phase === 'playing' ||
      phase === 'transition' ||
      phase === 'bossIntro'
    ) {
      this.resumePhase = phase;
      this.world.phase = 'paused';
    } else if (phase === 'paused') this.world.phase = this.resumePhase;
  }
  selectWeapon(id: string) {
    if (this.world.phase !== 'menu' || !['arc', 'sword', 'cannon'].includes(id))
      return false;
    this.save.meta.weapon = weaponId(id);
    this.persist();
    return true;
  }
  remember(id: string) {
    if (
      !this.practice &&
      LORE.some((l) => l.id === id) &&
      !this.save.meta.lore.includes(id)
    )
      this.save.meta.lore.push(id);
  }
  travel(id: string) {
    return this.decision({ type: 'route', id }, () => this.travelImpl(id));
  }
  private travelImpl(id: string) {
    const w = this.world;
    if (w.phase !== 'map' || w.campaign !== 'pilgrimage' || this.practice)
      return false;
    const node = availableNodes(w.seed, w.room.nodeId || '').find(
      (n) => n.id === id,
    );
    if (!node) return false;
    w.route.push(node.id);
    this.enter(node.room);
    return true;
  }
  travelLegacy(kind: RoomKind) {
    return this.decision({ type: 'legacyRoute', kind }, () =>
      this.travelLegacyImpl(kind),
    );
  }
  private travelLegacyImpl(kind: RoomKind) {
    const w = this.world;
    if (w.phase !== 'map' || w.campaign !== 'legacy' || this.practice)
      return false;
    const room = roomChoices(w.room.index + 1, w.seed).find(
      (r) => r.kind === kind,
    );
    if (!room) return false;
    this.enter(room);
    return true;
  }
  unlockRelic(id: string) {
    const item = RELICS.find((r) => r.id === id),
      m = this.save.meta;
    if (
      this.world.phase !== 'menu' ||
      !item ||
      m.unlocked.includes(id) ||
      m.shards < item.cost ||
      (item.boss && !m.bosses.includes(item.boss))
    )
      return false;
    m.shards -= item.cost;
    m.unlocked.push(id);
    this.persist();
    return true;
  }
  equipRelic(id: string | null) {
    if (
      this.world.phase !== 'menu' ||
      (id !== null && !this.save.meta.unlocked.includes(id))
    )
      return false;
    this.save.meta.equipped = id;
    this.persist();
    return true;
  }
  addForm(form: string) {
    const w = this.world;
    if (
      !['arc', 'sword', 'cannon'].includes(form) ||
      w.forms.includes(weaponId(form))
    )
      return false;
    w.forms.push(weaponId(form));
    this.remember(w.forms.length === 3 ? 'triad' : 'forge');
    if (form === 'sword' && w.relics.includes('vow-edge'))
      w.player.shield = Math.min(30, w.player.shield + 15);
    return true;
  }
  resolveEvent(choice: string) {
    return this.decision({ type: 'event', id: choice }, () =>
      this.resolveEventImpl(choice),
    );
  }
  private resolveEventImpl(choice: string) {
    const w = this.world;
    if (w.phase !== 'event' || w.eventDone || this.practice) return false;
    const kind = w.room.kind;
    let reward = false;
    if (
      choice.startsWith('form:') &&
      (kind === 'forge' || kind === 'treasure')
    ) {
      const cost =
        kind === 'treasure' || (w.room.index <= 3 && w.forms.length === 1)
          ? 0
          : 18;
      if (w.wallet.coins < cost || !this.addForm(choice.slice(5))) return false;
      w.wallet.coins -= cost;
    } else if (choice === 'rest' && kind === 'heal')
      w.player.hp = Math.min(w.player.maxHp, w.player.hp + 55);
    else if (choice === 'bottle' && kind === 'heal' && w.wallet.tonics < 3)
      grant(w, 'tonics', 1);
    else if (choice === 'salvage' && kind === 'treasure') {
      grant(w, 'coins', 20);
      grant(w, 'shards', 3);
    } else if (choice === 'read' && kind === 'archive') {
      this.remember('archive');
      grant(w, 'shards', 4);
      reward = true;
    } else if (choice === 'blood' && kind === 'event' && w.player.hp > 30) {
      w.player.hp -= 30;
      grant(w, 'coins', 24);
      grant(w, 'shards', 3);
      this.remember('blood');
    } else if (choice === 'bell' && kind === 'event' && w.wallet.coins >= 10) {
      w.wallet.coins -= 10;
      reward = true;
      this.remember('bell');
    } else if (choice === 'repair' && kind === 'forge')
      w.player.hp = Math.min(w.player.maxHp, w.player.hp + 25);
    else if (choice.startsWith('relic:') && kind === 'forge') {
      const id = choice.slice(6);
      if (
        !this.save.meta.unlocked.includes(id) ||
        w.relics.includes(id) ||
        w.wallet.coins < 25
      )
        return false;
      w.wallet.coins -= 25;
      w.relics.push(id);
      w.stats = deriveStats(w.cards, w.level, w.relics, w.content);
    } else if (choice !== 'leave') return false;
    w.eventDone = true;
    w.phase = reward ? 'reward' : 'map';
    w.rewardContext = 'clear';
    if (reward) w.rewards = rewardChoices(w.cards, w.seed, w.room.index, false, false, w.content);
    this.checkpoint();
    return true;
  }
  upgradePreparation(id: keyof Preparation) {
    if (this.world.phase !== 'menu') return false;
    const item = WORKSHOP.find((x) => x.id === id);
    if (!item) return false;
    const rank = this.save.meta.preparation[id];
    if (rank >= item.max || this.save.meta.shards < item.costs[rank])
      return false;
    this.save.meta.shards -= item.costs[rank];
    this.save.meta.preparation[id]++;
    this.persist();
    return true;
  }
  buy(id: ShopId) {
    return this.decision({ type: 'shop', id }, () => this.buyImpl(id));
  }
  private buyImpl(id: ShopId) {
    const w = this.world,
      item = SHOP.find((x) => x.id === id);
    if (
      this.practice ||
      !['map', 'event'].includes(w.phase) ||
      !(w.campaign === 'pilgrimage'
        ? w.room.kind === 'shop'
        : [2, 5, 7].includes(w.room.index)) ||
      !item ||
      w.campUsed.includes(id) ||
      w.wallet.coins < item.cost
    )
      return false;
    if (
      (id === 'heal' && w.player.hp >= w.player.maxHp) ||
      (id === 'tonic' && w.wallet.tonics >= 3) ||
      (id === 'bomb' && w.wallet.bombs >= 9) ||
      (id === 'key' && w.wallet.keys >= 9)
    )
      return false;
    w.wallet.coins -= item.cost;
    w.campUsed.push(id);
    if (id === 'heal') w.player.hp = Math.min(w.player.maxHp, w.player.hp + 35);
    else
      grant(w, id === 'tonic' ? 'tonics' : id === 'bomb' ? 'bombs' : 'keys', 1);
    w.campMessage = `已购入${item.name}。每站库存一份。`;
    this.checkpoint();
    return true;
  }
  openChest(method: 'key' | 'bomb') {
    return this.decision({ type: 'chest', method }, () =>
      this.openChestImpl(method),
    );
  }
  private openChestImpl(method: 'key' | 'bomb') {
    const w = this.world,
      resource = method === 'key' ? 'keys' : 'bombs';
    if (
      this.practice ||
      !['map', 'event'].includes(w.phase) ||
      !(w.campaign === 'pilgrimage'
        ? w.room.kind === 'treasure'
        : [1, 3, 6].includes(w.room.index)) ||
      w.campUsed.includes('chest') ||
      w.wallet[resource] < 1
    )
      return false;
    w.wallet[resource]--;
    w.campUsed.push('chest');
    if (method === 'key') {
      const card = rewardChoices(w.cards, w.seed + 8171, w.room.index, false, false, w.content)[0];
      if (card) {
        this.integrateCard(card.id);
        w.campMessage = `封存箱已开启：获得「${card.name}」。`;
      } else {
        grant(w, 'coins', 18);
        w.campMessage = '所有协议已拥有，转换为 18 金币。';
      }
    } else {
      grant(w, 'coins', 18);
      grant(w, 'shards', 2);
      w.campMessage = '破锁回收：金币 +18，碎片 +2；箱内协议已损毁。';
    }
    this.checkpoint();
    return true;
  }
  bloodPact() {
    return this.decision({ type: 'pact' }, () => this.bloodPactImpl());
  }
  private bloodPactImpl() {
    const w = this.world;
    if (
      this.practice ||
      w.phase !== 'map' ||
      !(w.campaign === 'legacy' && [3, 6].includes(w.room.index)) ||
      w.campUsed.includes('altar') ||
      w.player.hp <= 30
    )
      return false;
    w.player.hp -= 30;
    grant(w, 'coins', 20);
    grant(w, 'shards', 2);
    w.campUsed.push('altar');
    w.campMessage = '血誓已缔结：生命 −30，金币 +20，碎片 +2。';
    this.checkpoint();
    return true;
  }
  bankShards() {
    return this.decision({ type: 'bank' }, () => this.bankShardsImpl());
  }
  private bankShardsImpl() {
    const w = this.world;
    if (
      this.practice ||
      !['map', 'event'].includes(w.phase) ||
      !(w.campaign === 'pilgrimage'
        ? ['shop', 'heal', 'boss'].includes(w.room.kind)
        : [2, 4, 7].includes(w.room.index)) ||
      w.campUsed.includes('bank') ||
      w.wallet.shards === 0 ||
      w.wallet.coins < 8
    )
      return false;
    const amount = w.wallet.shards;
    w.wallet.coins -= 8;
    w.wallet.shards = 0;
    w.banked += amount;
    this.save.meta.shards = Math.min(99999, this.save.meta.shards + amount);
    w.campUsed.push('bank');
    w.campMessage = `${amount} 枚碎片已送回营地，本次死亡也不会遗失。`;
    this.checkpoint();
    return true;
  }
  reroll() {
    return this.decision({ type: 'reroll' }, () => this.rerollImpl());
  }
  private rerollImpl() {
    const w = this.world,
      cost = 12 + w.rerolls * 6;
    if (
      this.practice ||
      w.phase !== 'reward' ||
      w.rewardContext === 'start' ||
      w.rerolls >= 3 ||
      w.wallet.coins < cost
    )
      return false;
    w.wallet.coins -= cost;
    w.rerolls++;
    w.rewards = rewardChoices(
      w.cards,
      w.seed + w.rerolls * 31991,
      w.room.index,
      false,
      w.room.kind === 'elite',
      w.content,
    );
    this.checkpoint();
    return true;
  }
  startPractice(
    cards: readonly string[],
    weapon = this.save.meta.weapon,
    hybrid = false,
  ) {
    this.observer?.reset();
    this.resumePhase = 'playing';
    this.practice = true;
    this.settled = false;
    const bus = this.world.bus;
    this.world = new World(this.content);
    const w = this.world;
    w.bus = bus;
    w.seed = 20260909;
    w.weapon = weapon;
    w.forms = hybrid
      ? [
          weapon,
          ...(['arc', 'sword', 'cannon'] as const).filter((f) => f !== weapon),
        ]
      : [weapon];
    w.cards = [...cards];
    w.level = 4;
    w.stats = deriveStats(w.cards, w.level, [], w.content);
    w.player.maxHp = w.player.hp = cards.includes('ice-shell') ? 160 : 120;
    this.enter(makeRoom(3, 'combat', w.seed));
  }
}
