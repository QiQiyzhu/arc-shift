import { World } from './world';
import { updatePlayer } from '../systems/player';
import { updateEnemies } from '../ai/enemy-ai';
import { updateProjectiles } from '../combat/projectiles';
import { updateHazards } from '../systems/hazards';
import { Random, distance } from '../core/math';
import { makeRoom, roomWaveCount } from '../rooms/generator';
import type { EnemyKind, Input, Room } from './types';
import { deriveStats, rewardChoices } from '../cards/system';
import { loadSave, writeSave, type SaveData } from '../core/save';
export class Engine {
  world = new World();
  private settled = false;
  private resumePhase: 'playing' | 'transition' | 'bossIntro' = 'playing';
  save: SaveData = loadSave();
  storageAvailable = true;
  persist() {
    this.storageAvailable = writeSave(this.save);
  }
  start(seed = Date.now() % 1e8) {
    this.settled = false;
    const bus = this.world.bus;
    this.world = new World();
    this.world.bus = bus;
    this.world.seed = seed;
    this.world.rng = new Random(seed);
    this.world.room = makeRoom(1, 'combat', seed);
    this.world.phase = 'reward';
    this.world.rewardContext = 'start';
    this.world.rewards = rewardChoices([], seed, 0, true);
    this.save.meta.runs++;
    this.save.checkpoint = null;
    this.persist();
  }
  chooseCard(id: string) {
    const w = this.world;
    if (
      w.phase !== 'reward' ||
      !w.rewards.some((c) => c.id === id) ||
      w.cards.includes(id)
    )
      return false;
    w.cards.push(id);
    w.stats = deriveStats(w.cards, w.level);
    if (id === 'ice-shell') {
      w.player.maxHp += 40;
      w.player.hp = Math.min(w.player.maxHp, w.player.hp + 40);
    }
    if (!this.save.meta.discovered.includes(id))
      this.save.meta.discovered.push(id);
    w.emit('reward', w.player.x, w.player.y);
    if (w.rewardContext === 'start') this.enter(w.room);
    else {
      w.phase = 'map';
      this.checkpoint();
    }
    return true;
  }
  checkpoint() {
    const w = this.world;
    this.save.checkpoint = {
      progress:
        w.phase === 'reward' ? 'reward' : w.phase === 'map' ? 'map' : 'entry',
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
    this.settled = false;
    const bus = this.world.bus;
    this.world = new World();
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
    });
    w.rng = new Random(c.seed + c.room.index * 1129);
    w.stats = deriveStats(w.cards, w.level);
    w.player.maxHp = 120 + (w.has('ice-shell') ? 40 : 0);
    w.player.hp = Math.min(w.player.maxHp, c.hp);
    w.player.shield = c.shield || 0;
    if (c.progress === 'map' || c.progress === 'reward') {
      w.room = c.room;
      w.phase = c.progress;
      w.rewardContext = 'clear';
      w.rewards = rewardChoices(
        w.cards,
        w.seed,
        w.room.index,
        false,
        w.room.kind === 'elite',
      );
    } else this.enter(c.room);
    return true;
  }
  enter(room: Room) {
    const w = this.world;
    w.room = room;
    w.roomTime = 0;
    w.wave = 0;
    w.spawnTimer = 1.1;
    w.clearTimer = 0;
    w.enemies = [];
    w.projectiles.clear();
    w.hazards = [];
    w.rng = new Random(w.seed + room.index * 1129);
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
    w.transitionTimer = room.kind === 'boss' ? 2.8 : 1.3;
    if (room.kind === 'boss')
      w.spawn(room.index === 4 ? 'warden' : 'oracle', 640, 270);
    w.emit('room', 640, 350);
    this.checkpoint();
  }
  update(dt: number, input: Input) {
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
    w.elapsed += dt;
    w.roomTime += dt;
    updatePlayer(w, input, dt);
    updateEnemies(w, dt);
    if (w.player.hp > 0) updateProjectiles(w, dt);
    if (w.player.hp > 0) updateHazards(w, dt);
    if (w.player.hp <= 0) {
      this.finish();
      return;
    }
    if (w.room.kind === 'boss') {
      if (!w.boss) this.clear();
      return;
    }
    w.spawnTimer -= dt;
    const maxWaves = roomWaveCount(w.room.index);
    if (w.wave < maxWaves && w.spawnTimer <= 0) {
      this.spawnWave();
      w.wave++;
      w.spawnTimer = 9;
    }
    if (w.wave >= maxWaves && w.enemies.length === 0) {
      w.clearTimer += dt;
      if (w.clearTimer > 0.7) this.clear();
    }
  }
  spawnWave() {
    const w = this.world;
    const kinds: EnemyKind[] = ['hunter', 'sentry', 'lancer'];
    if (w.room.index >= 3) kinds.push('weaver');
    if (w.room.index >= 5) kinds.push('conduit');
    const count = 4 + w.room.index + (w.room.kind === 'elite' ? 3 : 0);
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
    w.player.hp = Math.min(w.player.maxHp, w.player.hp + 12);
    w.phase = w.room.index === 8 ? 'victory' : 'reward';
    w.rewardContext = 'clear';
    w.rewards = rewardChoices(
      w.cards,
      w.seed,
      w.room.index,
      false,
      w.room.kind === 'elite',
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
    const w = this.world;
    if (this.settled || !['victory', 'gameover'].includes(w.phase)) return;
    this.settled = true;
    const m = this.save.meta;
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
}
