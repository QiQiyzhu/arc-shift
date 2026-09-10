import type { World } from '../game/world';
import { shoot } from './projectiles';
import { hitEnemy } from './damage';
import { clamp, distance } from '../core/math';
import { segmentHits } from './rules';
import type { WeaponId } from '../game/types';
import { crossesBlock } from '../rooms/terrain';

// The same circular sector drives sword hit tests and the visible attack arc.
export function inSwordArc(
  x: number,
  y: number,
  radius: number,
  swing: { x: number; y: number; range: number; angle: number; arc: number },
) {
  const dx = x - swing.x,
    dy = y - swing.y,
    d = Math.hypot(dx, dy);
  if (d > swing.range + radius) return false;
  if (d <= radius) return true;
  const delta = Math.abs(
    Math.atan2(
      Math.sin(Math.atan2(dy, dx) - swing.angle),
      Math.cos(Math.atan2(dy, dx) - swing.angle),
    ),
  );
  if (delta <= swing.arc / 2) return true;
  const side =
    Math.atan2(
      Math.sin(Math.atan2(dy, dx) - swing.angle),
      Math.cos(Math.atan2(dy, dx) - swing.angle),
    ) < 0
      ? -1
      : 1;
  const edge = swing.angle + (side * swing.arc) / 2;
  return segmentHits(
    swing.x,
    swing.y,
    swing.x + Math.cos(edge) * swing.range,
    swing.y + Math.sin(edge) * swing.range,
    x,
    y,
    radius,
  );
}
export function attack(
  w: World,
  form: WeaponId = w.weapon,
  power = 1,
  support = false,
) {
  const tuning = w.content.weapons.find(row => row.id === form)!.params;
  const p = w.player,
    s = {
      ...w.stats,
      damage:
        w.stats.damage *
        power *
        (w.relics.includes('oracle-eye') && w.forms.length === 3 ? 1.15 : 1) * tuning.damage,
      shotSpeed: w.stats.shotSpeed * tuning.projectileSpeed,
    };
  const previousCd = p.shotCd;
  if (form === 'sword') {
    w.combo = w.comboTime > 0 ? (w.combo + 1) % 3 : 0;
    w.comboTime = Math.max(1.2, s.rate * 3 + 0.15);
    const finisher = w.combo === 2;
    w.swing = {
      x: p.x,
      y: p.y,
      angle: p.angle,
      age: 0,
      range:
        ((finisher ? 155 : 120) +
        (s.shotSize > 4 ? 22 : 0) +
        (w.relics.includes('vow-edge') ? 24 : 0)) * tuning.range,
      arc: Math.min(Math.PI * 2, ((finisher ? 2.6 : 1.9) + (s.projectiles - 1) * 0.13) * tuning.arc),
      damage:
        s.damage * (finisher ? 3.3 : 2.1) * (1 + (s.projectiles - 1) * 0.12),
      combo: w.combo,
      hits: new Set(),
      fragmented: false,
    };
    p.shotCd = Math.max(0.24, s.rate * (finisher ? 3.3 : 2.5));
    w.bus.emit({
      kind: 'slash',
      x: p.x,
      y: p.y,
      color: 0xffe1a0,
      weapon: 'sword',
    });
    if (finisher && w.forms.includes('arc')) {
      for (let i = -2; i <= 2; i++) {
        const b = shoot(
          w,
          p.x,
          p.y,
          p.angle + i * 0.25,
          false,
          s.damage * 0.55,
          s.shotSpeed,
          s.accent,
          1,
        );
        if (b) b.shape = 'blade';
      }
    }
    // Trajectory protocols add secondary rune blades; the main sword remains melee.
    if (
      s.homing ||
      s.bounce ||
      s.orbit ||
      s.returning ||
      s.wave ||
      s.lance ||
      s.pierce > 0 ||
      s.projectiles > 1
    ) {
      for (let i = 0; i < s.projectiles; i++) {
        const b = shoot(
          w,
          p.x,
          p.y,
          p.angle + (i - (s.projectiles - 1) / 2) * 0.18,
          false,
          s.damage * 0.38,
          s.shotSpeed * 0.75,
          s.primary,
          1,
        );
        if (b) {
          b.shape = 'blade';
          b.orbit = s.orbit;
        }
      }
    }
  } else {
    const heavy = form === 'cannon';
    p.shotCd = s.rate * (heavy ? 4.2 : 1);
    for (let i = 0; i < s.projectiles; i++) {
      const b = shoot(
        w,
        p.x + Math.cos(p.angle) * 22,
        p.y + Math.sin(p.angle) * 22,
        p.angle + (i - (s.projectiles - 1) / 2) * (heavy ? 0.23 : 0.15),
        false,
        s.damage * (heavy ? 3.8 : 1),
        s.shotSpeed * (heavy ? 0.55 : 1),
        s.primary,
      );
      if (b && heavy) {
        b.shape = 'shell';
        b.radius = s.shotSize * 1.5 + 4;
        b.blastRadius = (72 + (s.shotSize > 4 ? 18 : 0)) * tuning.blast;
        if (w.forms.includes('arc')) b.fragment = Math.max(b.fragment, 4);
      }
    }
    w.bus.emit({
      kind: 'shot',
      x: p.x + Math.cos(p.angle) * 24,
      y: p.y + Math.sin(p.angle) * 24,
      color: s.primary,
      element: s.element,
      weapon: form,
    });
  }
  if (support) {
    p.shotCd = previousCd;
    return;
  }
  p.shotCd *= tuning.cooldown;
  if (w.has('shift-reload') && p.dashCd > s.dashCooldown - 0.7) p.shotCd *= 0.5;
  // These triggers run once per attack, regardless of enemy count or pellet count.
  if (s.rear)
    shoot(
      w,
      p.x,
      p.y,
      p.angle + Math.PI,
      false,
      s.damage * 0.65,
      s.shotSpeed,
      s.primary,
      1,
    );
  if (w.echo.time > 0 && w.echo.shots > 0) {
    w.echo.shots--;
    shoot(
      w,
      w.echo.x,
      w.echo.y,
      p.angle,
      false,
      s.damage * 0.35,
      s.shotSpeed,
      s.primary,
      1,
    );
  }
}
export function fireSupports(w: World, dt: number, fire: boolean) {
  for (const form of ['arc', 'sword', 'cannon'] as const) {
    w.supportCd[form] = Math.max(0, w.supportCd[form] - dt);
    if (
      form === w.weapon ||
      !w.forms.includes(form) ||
      !fire ||
      w.supportCd[form] > 0
    )
      continue;
    attack(w, form, w.relics.includes('glass-engine') ? 0.7 : 0.55, true);
    w.supportCd[form] = Math.max(
      0.18,
      w.stats.rate * { arc: 1.5, sword: 3, cannon: 4.8 }[form] * w.content.weapons.find(row => row.id === form)!.params.cooldown,
    );
  }
}
export function drinkTonic(w: World) {
  if (
    w.phase !== 'playing' ||
    w.wallet.tonics <= 0 ||
    w.player.hp <= 0 ||
    w.player.hp >= w.player.maxHp
  )
    return false;
  w.wallet.tonics--;
  w.player.hp = Math.min(
    w.player.maxHp,
    w.player.hp + 40 + (w.relics.includes('choir-vial') ? 10 : 0),
  );
  w.emit('skill', w.player.x, w.player.y, 0x9aefc2, 65);
  return true;
}
export function throwBomb(w: World, aimX: number, aimY: number) {
  if (
    w.phase !== 'playing' ||
    w.wallet.bombs <= 0 ||
    w.bombCd > 0 ||
    w.player.hp <= 0
  )
    return false;
  w.wallet.bombs--;
  w.bombCd = 0.5;
  const a = Math.atan2(aimY - w.player.y, aimX - w.player.x),
    reach = Math.min(210, Math.hypot(aimX - w.player.x, aimY - w.player.y));
  w.bombs.push({
    x: clamp(w.player.x + Math.cos(a) * reach, 90, 1190),
    y: clamp(w.player.y + Math.sin(a) * reach, 112, 620),
    time: 0.8,
  });
  return true;
}
export function updateWeapon(w: World, dt: number) {
  w.comboTime = Math.max(0, w.comboTime - dt);
  w.bombCd = Math.max(0, w.bombCd - dt);
  const swing = w.swing;
  if (swing) {
    swing.age += dt;
    if (swing.age >= 0.055 && swing.age <= 0.19) {
      for (const e of w.enemies) {
        if (
          e.hp <= 0 ||
          swing.hits.has(e.id) ||
          crossesBlock(swing.x, swing.y, e.x, e.y, 0.5, w.terrain.blocks) ||
          !inSwordArc(e.x, e.y, e.radius, swing)
        )
          continue;
        swing.hits.add(e.id);
        hitEnemy(w, e, swing.damage);
        if (w.forms.includes('cannon') && swing.hits.size === 1) {
          w.emit('bomb', e.x, e.y, 0xffbc78, 90);
          for (const n of w.enemies)
            if (n !== e && n.hp > 0 && distance(n, e) < 90 + n.radius)
              hitEnemy(w, n, swing.damage * 0.4, false);
        }
        if (w.stats.fragment && !swing.fragmented) {
          swing.fragmented = true;
          for (let i = 0; i < 3; i++) {
            const b = shoot(
              w,
              e.x,
              e.y,
              swing.angle + (i - 1) * 0.8,
              false,
              swing.damage * 0.2,
              w.stats.shotSpeed * 0.7,
              w.stats.primary,
              1,
            );
            if (b) {
              b.hits.add(e.id);
              b.life = b.initialLife = 0.85;
              b.shape = 'blade';
            }
          }
        }
      }
      for (const b of w.projectiles.items)
        if (
          b.active &&
          b.enemy &&
          inSwordArc(b.x, b.y, b.radius, swing) &&
          !crossesBlock(swing.x, swing.y, b.x, b.y, 1, w.terrain.blocks)
        ) {
          b.active = false;
          w.emit('pickup', b.x, b.y, 0xffe1a0);
        }
    }
    if (swing.age > 0.28) w.swing = null;
  }
  for (let i = w.bombs.length - 1; i >= 0; i--) {
    const b = w.bombs[i];
    b.time -= dt;
    if (b.time > 0) continue;
    w.emit('bomb', b.x, b.y, 0xffc77c, 170);
    for (const e of w.enemies)
      if (e.hp > 0 && distance(e, b) < 170 + e.radius)
        hitEnemy(
          w,
          e,
          (40 + w.stats.damage * 5) *
            (w.relics.includes('kiln-heart') ? 1.35 : 1),
          false,
        );
    for (const shot of w.projectiles.items)
      if (shot.active && shot.enemy && distance(shot, b) < 185)
        shot.active = false;
    w.bombs.splice(i, 1);
  }
}
