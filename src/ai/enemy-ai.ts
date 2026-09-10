import { laserGeometry } from '../combat/geometry';
import { segmentHits } from '../combat/rules';
import { clamp, direction, distance } from '../core/math';
import { cooldown } from '../combat/rules';
import { shoot } from '../combat/projectiles';
import { hitEnemy, hurtPlayer } from '../combat/damage';
import type { Enemy } from '../game/types';
import type { World } from '../game/world';
import { isBoss } from '../progression/catalog';
import { moveOnTerrain, safePosition, blocked } from '../rooms/terrain';
import { separateBruteForce, separateWithGrid } from '../combat/separation';
export function changeState(e: Enemy, state: Enemy['state'], time: number) {
  e.state = state;
  e.timer = time;
}
function move(e: Enemy, x: number, y: number, speed: number, dt: number) {
  const d = direction(x - e.x, y - e.y);
  e.x = clamp(e.x + d.x * speed * dt, 86, 1194);
  e.y = clamp(e.y + d.y * speed * dt, 110, 624);
}
function telegraph(e: Enemy, w: World, time: number) {
  e.aimX = w.player.x;
  e.aimY = w.player.y;
  changeState(e, 'telegraph', time);
}
function radial(w: World, e: Enemy, count: number, offset = 0) {
  for (let i = 0; i < count; i++)
    shoot(
      w,
      e.x,
      e.y,
      offset + (i * Math.PI * 2) / count,
      true,
      e.damage,
      220,
      0xff839f,
    );
}
function updateBoss(w: World, e: Enemy, dt: number) {
  const hp = e.hp / e.maxHp;
  const tuning = w.content.bosses.find(row => row.id === e.kind)!.params;
  const phase = hp < tuning.phase3At ? 3 : hp < tuning.phase2At ? 2 : 1;
  if (phase > e.phase) {
    e.phase = phase;
    changeState(e, 'recover', tuning.phaseRecovery);
    w.projectiles.items.forEach((b) => {
      if (b.enemy) b.active = false;
    });
    w.hazards = w.hazards.filter((h) => h.friendly);
    w.emit('phase', e.x, e.y, 0xc7a5ff, phase);
    return;
  }
  if (e.kind === 'matron' || e.kind === 'forgemaster') {
    updateNewBoss(w, e, dt);
    return;
  }
  if (e.state === 'idle' || e.state === 'recover' || e.state === 'cooldown') {
    if (e.timer <= 0) {
      e.attackIndex++;
      telegraph(e, w, 1.05);
    }
    return;
  }
  if (e.state === 'telegraph' && e.timer <= 0) {
    const a = Math.atan2(e.aimY - e.y, e.aimX - e.x);
    if (e.kind === 'warden') {
      if (e.attackIndex % 3 === 1) {
        for (let i = -3; i <= 3; i++)
          shoot(w, e.x, e.y, a + i * 0.18, true, e.damage, 300, 0xffb275);
        changeState(e, 'recover', 1.4);
      } else if (e.attackIndex % 3 === 2) {
        const d = direction(e.aimX - e.x, e.aimY - e.y);
        e.vx = d.x * 650;
        e.vy = d.y * 650;
        changeState(e, 'attack', 0.55);
      } else {
        for (let i = 0; i < 3 + e.phase; i++) {
          const a = (i * Math.PI * 2) / (3 + e.phase);
          w.hazards.push({
            x: clamp(e.aimX + Math.cos(a) * 110, 110, 1170),
            y: clamp(e.aimY + Math.sin(a) * 110, 125, 605),
            r: 80,
            time: 1.15,
            duration: 1.15,
            damage: e.damage,
            type: 'blast',
            friendly: false,
            tick: 0,
          });
        }
        changeState(e, 'recover', 2);
      }
    } else {
      if (e.attackIndex % 3 === 1) {
        radial(w, e, 12 + e.phase * 3, e.age * 0.25);
        changeState(e, 'recover', 1.8);
      } else if (e.attackIndex % 3 === 2) {
        changeState(e, 'attack', 2.6);
      } else {
        for (let i = 0; i < 4; i++)
          w.hazards.push({
            x: clamp(e.aimX + (i - 1.5) * 110, 100, 1180),
            y: e.aimY,
            r: 65,
            time: 0.9 + i * 0.25,
            duration: 0.9 + i * 0.25,
            damage: e.damage,
            type: 'blast',
            friendly: false,
            tick: 0,
          });
        if (w.enemies.length < 6) {
          w.spawn('hunter', 260, 240, false, true);
          w.spawn('sentry', 1010, 500, false, true);
        }
        changeState(e, 'recover', 2);
      }
    }
  }
  if (e.state === 'attack') {
    if (e.kind === 'warden') {
      e.x = clamp(e.x + e.vx * dt, 100, 1180);
      e.y = clamp(e.y + e.vy * dt, 130, 600);
    } else {
      const beam = laserGeometry(e);
      if (
        segmentHits(
          beam.x1,
          beam.y1,
          beam.x2,
          beam.y2,
          w.player.x,
          w.player.y,
          beam.halfWidth,
        ) &&
        distance(w.player, e) > e.radius
      )
        hurtPlayer(w, e.damage);
    }
    if (e.timer <= 0) changeState(e, 'recover', 1.6);
  }
}
function blast(
  w: World,
  x: number,
  y: number,
  r: number,
  delay: number,
  damage: number,
) {
  w.hazards.push({
    x: clamp(x, 110, 1170),
    y: clamp(y, 130, 600),
    r,
    time: delay,
    duration: delay,
    damage,
    type: 'blast',
    friendly: false,
    tick: 0,
  });
}
function updateNewBoss(w: World, e: Enemy, dt: number) {
  if (['idle', 'recover', 'cooldown'].includes(e.state)) {
    if (e.timer <= 0) {
      e.attackIndex++;
      telegraph(e, w, 1.15);
    }
    return;
  }
  if (e.state === 'telegraph' && e.timer <= 0) {
    const a = Math.atan2(e.aimY - e.y, e.aimX - e.x),
      pattern = e.attackIndex % 3;
    if (e.kind === 'matron') {
      if (pattern === 1) {
        radial(w, e, 14 + e.phase * 2, e.age * 0.12);
      } else if (pattern === 2) {
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          blast(
            w,
            e.aimX + Math.cos(angle) * 115,
            e.aimY + Math.sin(angle) * 115,
            60,
            1 + i * 0.11,
            e.damage,
          );
        }
      } else {
        blast(w, e.aimX, e.aimY, 90, 1.1, e.damage);
        if (w.enemies.length < 6) {
          w.spawn('cantor', 260, 240, false, true);
          w.spawn('shade', 1010, 500, false, true);
        }
      }
      changeState(e, 'recover', pattern === 1 ? 1.8 : 2.5);
    } else {
      if (pattern === 1) {
        for (let i = -2; i <= 2; i++) {
          blast(
            w,
            e.aimX + i * 100,
            e.aimY,
            52,
            0.9 + Math.abs(i) * 0.14,
            e.damage,
          );
          blast(
            w,
            e.aimX,
            e.aimY + i * 100,
            52,
            0.9 + Math.abs(i) * 0.14,
            e.damage,
          );
        }
        changeState(e, 'recover', 2.3);
      } else if (pattern === 2) {
        e.vx = Math.cos(a) * 560;
        e.vy = Math.sin(a) * 560;
        changeState(e, 'attack', 0.6);
      } else {
        radial(w, e, 10 + e.phase * 2, a);
        for (let i = 0; i < 3; i++)
          blast(w, e.aimX + (i - 1) * 115, e.aimY, 68, 1 + i * 0.3, e.damage);
        changeState(e, 'recover', 2.2);
      }
    }
  }
  if (e.state === 'attack') {
    moveOnTerrain(w, e, e.x + e.vx * dt, e.y + e.vy * dt, e.radius);
    if (e.timer <= 0) changeState(e, 'recover', 2);
  }
}
export function updateEnemies(w: World, dt: number) {
  for (const e of w.enemies) {
    if (w.player.hp <= 0) return;
    if (e.hp <= 0) continue;
    if (
      w.campaign === 'pilgrimage' &&
      blocked(e.x, e.y, e.radius, w.terrain.blocks)
    )
      Object.assign(e, safePosition(w, e.x, e.y, e.radius));
    const oldX = e.x,
      oldY = e.y;
    let teleported = false;
    e.age += dt;
    e.timer -= dt;
    e.flash = cooldown(e.flash, dt);
    e.slow = cooldown(e.slow, dt);
    e.burn = cooldown(e.burn, dt);
    if (e.burn > 0) {
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.5;
        hitEnemy(w, e, w.stats.burn * 0.5, false);
      }
    }
    if (e.hp <= 0) continue;
    const boss = isBoss(e.kind);
    if (boss) {
      updateBoss(w, e, dt);
    } else {
      const dist = distance(e, w.player),
        speed = e.speed * (e.slow > 0 ? 1 - Math.max(0.25, w.stats.slow) : 1);
      if (e.state === 'idle') {
        if (e.timer <= 0) changeState(e, 'chase', 0.5);
        continue;
      }
      if (e.state === 'chase') {
        if (e.kind === 'hunter') {
          move(e, w.player.x, w.player.y, speed, dt);
          if (dist < 40) changeState(e, 'attack', 0.25);
        } else if (e.kind === 'sentry') {
          if (dist > 320) move(e, w.player.x, w.player.y, speed, dt);
          else if (dist < 210)
            move(e, 2 * e.x - w.player.x, 2 * e.y - w.player.y, speed, dt);
          if (e.timer <= 0) telegraph(e, w, 0.7);
        } else if (e.kind === 'lancer') {
          if (dist > 390) move(e, w.player.x, w.player.y, speed, dt);
          else if (e.timer <= 0) telegraph(e, w, 0.85);
        } else if (e.kind === 'weaver') {
          if (dist > 380) move(e, w.player.x, w.player.y, speed, dt);
          if (e.timer <= 0) telegraph(e, w, 0.7);
        } else if (['bomber', 'cantor', 'shade'].includes(e.kind)) {
          if (dist > 300) move(e, w.player.x, w.player.y, speed, dt);
          if (dist < 160)
            move(e, 2 * e.x - w.player.x, 2 * e.y - w.player.y, speed, dt);
          if (e.timer <= 0) telegraph(e, w, e.kind === 'shade' ? 0.85 : 1);
        } else {
          if (dist < 260)
            move(e, 2 * e.x - w.player.x, 2 * e.y - w.player.y, speed, dt);
          if (e.timer <= 0) {
            for (const n of w.enemies)
              if (
                n !== e &&
                n.hp > 0 &&
                n.kind !== 'conduit' &&
                distance(n, e) < 210
              )
                n.hp = Math.min(n.maxHp, n.hp + 10);
            w.emit('skill', e.x, e.y, 0xa5eb93, 120);
            changeState(e, 'cooldown', 3);
          }
        }
      } else if (e.state === 'telegraph' && e.timer <= 0) {
        const a = Math.atan2(e.aimY - e.y, e.aimX - e.x);
        if (e.kind === 'sentry') {
          for (let i = 0; i < (e.elite ? 3 : 1); i++)
            shoot(
              w,
              e.x,
              e.y,
              a + (i - (e.elite ? 1 : 0)) * 0.17,
              true,
              e.damage,
              300,
              0xffb477,
            );
          changeState(e, 'cooldown', 1.7);
        } else if (e.kind === 'lancer') {
          e.vx = Math.cos(a) * 640;
          e.vy = Math.sin(a) * 640;
          changeState(e, 'attack', 0.48);
        } else if (e.kind === 'bomber') {
          for (let i = -1; i <= 1; i++)
            blast(
              w,
              e.aimX + Math.cos(a + Math.PI / 2) * i * 90,
              e.aimY + Math.sin(a + Math.PI / 2) * i * 90,
              52,
              0.85 + (i + 1) * 0.22,
              e.damage,
            );
          changeState(e, 'cooldown', 2.5);
        } else if (e.kind === 'cantor') {
          for (const n of w.enemies)
            if (n !== e && n.hp > 0 && !isBoss(n.kind) && distance(n, e) < 220)
              n.shield = Math.min(30, n.shield + 18);
          w.emit('skill', e.x, e.y, 0x9edfc9, 220);
          for (let i = -2; i <= 2; i++)
            shoot(w, e.x, e.y, a + i * 0.35, true, e.damage, 220, 0xa6e8c9);
          changeState(e, 'cooldown', 3);
        } else if (e.kind === 'shade') {
          teleported = true;
          const side = e.id % 2 === 0 ? 1 : -1;
          Object.assign(
            e,
            safePosition(
              w,
              e.aimX + Math.cos(a + (side * Math.PI) / 2) * 170,
              e.aimY + Math.sin(a + (side * Math.PI) / 2) * 170,
              e.radius,
            ),
          );
          w.emit('dash', e.x, e.y, 0xaec7ff);
          const aim = Math.atan2(w.player.y - e.y, w.player.x - e.x);
          for (let i = -2; i <= 2; i++)
            shoot(w, e.x, e.y, aim + i * 0.17, true, e.damage, 250, 0xaec7ff);
          changeState(e, 'cooldown', 2.8);
        } else if (e.kind === 'weaver') {
          w.hazards.push({
            x: e.aimX,
            y: e.aimY,
            r: e.elite ? 95 : 72,
            time: 1.15,
            duration: 1.15,
            damage: e.damage,
            type: 'blast',
            friendly: false,
            tick: 0,
          });
          changeState(e, 'cooldown', 2.4);
        }
      } else if (e.state === 'attack') {
        if (e.kind === 'lancer') {
          e.x = clamp(e.x + e.vx * dt, 90, 1190);
          e.y = clamp(e.y + e.vy * dt, 112, 620);
        }
        if (e.timer <= 0)
          changeState(e, 'recover', e.kind === 'lancer' ? 0.8 : 0.35);
      } else if (
        (e.state === 'cooldown' || e.state === 'recover') &&
        e.timer <= 0
      )
        changeState(e, 'chase', 0.5);
    }
    if (w.campaign === 'pilgrimage' && !teleported) {
      const nx = e.x,
        ny = e.y;
      e.x = oldX;
      e.y = oldY;
      moveOnTerrain(w, e, nx, ny, e.radius);
      if (
        !boss &&
        e.state === 'chase' &&
        Math.hypot(e.x - oldX, e.y - oldY) < 0.15
      ) {
        const a =
          Math.atan2(w.player.y - e.y, w.player.x - e.x) +
          ((e.id % 2 ? 1 : -1) * Math.PI) / 2;
        moveOnTerrain(
          w,
          e,
          e.x + Math.cos(a) * e.speed * dt,
          e.y + Math.sin(a) * e.speed * dt,
          e.radius,
        );
      }
    }
    if (e.state !== 'idle' && distance(e, w.player) < e.radius + 13)
      hurtPlayer(w, e.damage);
  }
  if(w.collisionMode === 'brute') separateBruteForce(w);
  else separateWithGrid(w);
  w.enemies = w.enemies.filter((e) => e.hp > 0);
  if (w.campaign === 'pilgrimage')
    for (const e of w.enemies)
      if (blocked(e.x, e.y, e.radius, w.terrain.blocks))
        Object.assign(e, safePosition(w, e.x, e.y, e.radius));
}
