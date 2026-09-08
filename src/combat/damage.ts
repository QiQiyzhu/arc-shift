import { deriveStats } from '../cards/system';
import { clamp, distance } from '../core/math';
import { calculateDamage } from './rules';
import { ENEMIES } from '../data/enemies';
import type { Enemy } from '../game/types';
import type { World } from '../game/world';
export function hurtPlayer(w: World, amount: number) {
  const p = w.player;
  if (p.invulnerable > 0 || w.phase !== 'playing') return;
  const absorbed = Math.min(p.shield, amount);
  p.shield -= absorbed;
  p.hp = clamp(p.hp - amount + absorbed, 0, p.maxHp);
  p.invulnerable = 0.7;
  w.damageTaken += amount - absorbed;
  w.emit('hurt', p.x, p.y, 0xff667f, amount - absorbed);
  if (p.hp <= 0) w.phase = 'gameover';
}
export function hitEnemy(w: World, e: Enemy, base: number, proc = true) {
  if (e.hp <= 0 || w.player.hp <= 0) return;
  const c = calculateDamage(
    base,
    proc ? w.stats.crit : 0,
    w.stats.critPower,
    w.rng.next(),
  );
  let damage = c.damage;
  if (w.has('ice-brittle') && e.slow > 0) damage *= 1.25;
  if (w.has('void-execute') && e.hp / e.maxHp < 0.25) damage *= 1.5;
  const dealt = Math.min(e.hp, damage);
  e.hp -= damage;
  e.flash = 0.09;
  w.totalDamage += dealt;
  w.emit(
    c.critical ? 'crit' : 'hit',
    e.x,
    e.y,
    c.critical ? 0xe4ffa5 : 0xc8e8ed,
    Math.round(damage),
  );
  if (proc) {
    const a = Math.atan2(e.y - w.player.y, e.x - w.player.x);
    if (!['warden', 'oracle'].includes(e.kind)) {
      e.x += Math.cos(a) * 6;
      e.y += Math.sin(a) * 6;
    }
    if (w.stats.burn > 0) e.burn = 3;
    if (w.has('ice-touch')) e.slow = 2.5;
    if (
      w.stats.chain > 0 &&
      w.rng.next() < 0.33 + (w.has('storm-static') ? 0.2 : 0)
    ) {
      let from = e;
      const seen = new Set([e.id]);
      for (let i = 0; i < w.stats.chain; i++) {
        const target = w.enemies
          .filter((n) => n.hp > 0 && !seen.has(n.id) && distance(n, from) < 230)
          .sort((a, b) => distance(a, from) - distance(b, from))[0];
        if (!target) break;
        w.bus.emit({
          kind: 'skill',
          x: from.x,
          y: from.y,
          x2: target.x,
          y2: target.y,
          color: 0xbba4ff,
        });
        hitEnemy(w, target, base * 0.48, false);
        seen.add(target.id);
        from = target;
      }
    }
    if (c.critical && w.has('storm-critical')) {
      for (const n of w.enemies)
        if (n !== e && distance(n, e) < 130) hitEnemy(w, n, base * 0.4, false);
    }
    if (w.stats.explosion > 0) {
      w.emit('skill', e.x, e.y, 0xffad6f, 44);
      for (const n of w.enemies)
        if (n !== e && distance(n, e) < 65) hitEnemy(w, n, base * 0.25, false);
    }
  }
  if (e.hp <= 0) {
    e.state = 'dead';
    w.kills++;
    w.xp += e.elite ? 28 : 10;
    if (w.xp >= w.level * 55) {
      w.xp -= w.level * 55;
      w.level++;
      w.player.hp = clamp(w.player.hp + 8, 0, w.player.maxHp);
      w.stats = deriveStats(w.cards, w.level);
      w.emit('reward', w.player.x, w.player.y, 0xc7f794);
    }
    w.emit('kill', e.x, e.y, ENEMIES[e.kind].color);
    if (w.stats.lifesteal > 0)
      w.player.hp = clamp(w.player.hp + w.stats.lifesteal, 0, w.player.maxHp);
    if (proc && w.has('fire-funeral'))
      for (const n of w.enemies)
        if (n !== e && n.hp > 0 && distance(n, e) < 100)
          hitEnemy(w, n, 24, false);
    if (proc && w.has('ice-shatter') && e.slow > 0)
      for (const n of w.enemies)
        if (n !== e && n.hp > 0 && distance(n, e) < 120) {
          n.slow = 2;
          hitEnemy(w, n, 20, false);
        }
  }
}
