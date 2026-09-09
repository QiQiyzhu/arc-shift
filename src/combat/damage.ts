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
    if (
      w.has('fire-ember') &&
      w.has('ice-touch') &&
      e.burn > 0 &&
      e.slow > 0 &&
      e.reactionCd <= 0 &&
      w.reactionBudget > 0
    ) {
      w.reactionBudget--;
      w.reactionCount++;
      e.reactionCd = 1.2;
      e.burn = e.slow = 0;
      w.bus.emit({
        kind: 'skill',
        x: e.x,
        y: e.y,
        color: 0xffc49c,
        amount: 85,
        reaction: '热裂变',
      });
      for (const n of w.enemies)
        if (n !== e && distance(n, e) < 85) hitEnemy(w, n, base * 0.65, false);
    }
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
      let extra = 0;
      for (let i = 0; i < w.stats.chain + extra; i++) {
        const target = w.enemies
          .filter((n) => n.hp > 0 && !seen.has(n.id) && distance(n, from) < 230)
          .sort(
            (a, b) =>
              (w.has('ice-touch')
                ? Number(b.slow > 0) - Number(a.slow > 0)
                : 0) || distance(a, from) - distance(b, from),
          )[0];
        if (!target) break;
        w.bus.emit({
          kind: 'skill',
          x: from.x,
          y: from.y,
          x2: target.x,
          y2: target.y,
          color: w.has('fire-ember')
            ? 0xffb477
            : w.has('ice-touch')
              ? 0x8cdeff
              : 0xbba4ff,
        });
        if (w.has('ice-touch') && target.slow > 0) extra = 1;
        hitEnemy(w, target, base * (i >= w.stats.chain ? 0.3 : 0.48), false);
        if (
          w.has('fire-ember') &&
          target.burn > 0 &&
          target.reactionCd <= 0 &&
          w.reactionBudget > 0
        ) {
          target.reactionCd = 0.6;
          target.burn = Math.max(0, target.burn - 1);
          w.reactionBudget--;
          w.reactionCount++;
          w.bus.emit({
            kind: 'skill',
            x: target.x,
            y: target.y,
            color: 0xe8a5e4,
            amount: 70,
            reaction: '电浆回路',
          });
          for (const n of w.enemies)
            if (n !== target && distance(n, target) < 70)
              hitEnemy(w, n, base * 0.35, false);
        }
        seen.add(target.id);
        from = target;
      }
    }
    if (c.critical && w.has('storm-critical')) {
      for (const n of w.enemies)
        if (n !== e && distance(n, e) < 130) hitEnemy(w, n, base * 0.4, false);
    }
    if (w.stats.explosion > 0) {
      const well = w.has('void-horizon')
        ? w.hazards.find(
            (h) => h.friendly && h.type === 'well' && distance(h, e) < h.r,
          )
        : undefined;
      const collapse = well && w.reactionBudget > 0 && e.reactionCd <= 0;
      const center = collapse ? well : e;
      if (collapse) {
        w.reactionBudget--;
        w.reactionCount++;
        e.reactionCd = 0.2;
      }
      w.bus.emit({
        kind: 'skill',
        x: center.x,
        y: center.y,
        color: collapse ? 0xe5a0ef : 0xffad6f,
        amount: collapse ? 90 : 44,
        reaction: collapse ? '坍缩火种' : undefined,
      });
      for (const n of w.enemies)
        if (n !== e && distance(n, center) < (collapse ? 90 : 65))
          hitEnemy(w, n, base * (collapse ? 0.35 : 0.25), false);
    }
  }
  if (e.hp <= 0 && e.state !== 'dead') {
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
