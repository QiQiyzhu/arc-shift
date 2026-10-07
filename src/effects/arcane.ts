import type Phaser from 'phaser';
import type { EffectEvent } from '../core/events';
import { Pool } from '../core/pool';
import type { Hazard } from '../game/types';
import { fillDisc, strokeRing } from '../render/discs';

/** Presentation roles, deliberately separate from elemental damage colours. */
export const ARC_PALETTE = {
  ally: 0x83e7dd,
  ivory: 0xf5ebd3,
  empowered: 0xe8bc70,
  danger: 0xff704f,
  dangerEdge: 0xffc08a,
  ink: 0x07171b,
} as const;
export const VFX_BUDGET = {
  signatures: 40,
  reducedSignatures: 10,
  particles: 360,
  reducedParticles: 72,
} as const;
type SignatureKind = 'pulse' | 'impact' | 'wake' | 'seal' | 'fracture';
type Signature = {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  radius: number;
  age: number;
  duration: number;
  color: number;
  kind: SignatureKind;
  hostile: boolean;
};

/** Existing shared event kinds include enemy support and teleport skills. These
 * explicit producer signatures are presentation-only; never infer allegiance
 * from target position (friendly hits also originate on enemy coordinates). */
export function hostileEffect(event: EffectEvent): boolean {
  return (
    event.kind === 'hurt' ||
    event.kind === 'phase' ||
    (event.kind === 'dash' && event.color === 0xaec7ff) ||
    (event.kind === 'skill' &&
      !event.reaction &&
      event.x2 === undefined &&
      [0xff7189, 0xa5eb93, 0x9edfc9].includes(event.color))
  );
}

export function effectColor(event: EffectEvent): number {
  if (hostileEffect(event)) return ARC_PALETTE.danger;
  if (
    event.kind === 'crit' ||
    event.kind === 'bomb' ||
    event.kind === 'slash' ||
    event.kind === 'victory' ||
    event.reaction
  )
    return ARC_PALETTE.empowered;
  return ARC_PALETTE.ally;
}

function diamond(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  angle: number,
) {
  g.beginPath();
  for (let i = 0; i <= 4; i++) {
    const a = angle + (i * Math.PI) / 2;
    const px = x + Math.cos(a) * radius,
      py = y + Math.sin(a) * radius;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.strokePath();
}

/** Bounded, event-driven accents. Most ordinary hits never allocate a signature. */
export class ArcaneSignatures {
  readonly pool = new Pool<Signature>(VFX_BUDGET.signatures, () => ({
    active: false,
    x: 0,
    y: 0,
    angle: 0,
    radius: 0,
    age: 0,
    duration: 1,
    color: ARC_PALETTE.ally,
    kind: 'seal',
    hostile: false,
  }));
  dropped = 0;
  private wakeCooldown = 0;
  private cameraCooldown = 0;
  emit(event: EffectEvent, angle: number, reduced: boolean) {
    if (
      event.x2 !== undefined ||
      ['hit', 'pickup', 'room', 'kill'].includes(event.kind) ||
      (event.kind === 'shot' && event.weapon !== 'cannon')
    )
      return;
    if (event.kind === 'dash' && (reduced || this.wakeCooldown > 0)) return;
    if (reduced && ['slash', 'shot', 'reward'].includes(event.kind)) return;
    const kind: SignatureKind =
      event.kind === 'dash'
        ? 'wake'
        : event.kind === 'crit' || event.kind === 'impact'
          ? 'impact'
          : event.kind === 'hurt' || event.kind === 'phase'
            ? 'fracture'
            : event.kind === 'skill' || event.kind === 'bomb'
              ? 'pulse'
              : 'seal';
    // Reactions cluster at one target; coalesce decoration without losing labels.
    if (
      this.pool.items.some(
        (item) =>
          item.active &&
          item.kind === kind &&
          item.age < 0.09 &&
          Math.hypot(item.x - event.x, item.y - event.y) < 22,
      )
    )
      return;
    if (
      this.pool.count >=
      (reduced ? VFX_BUDGET.reducedSignatures : VFX_BUDGET.signatures)
    ) {
      this.dropped++;
      return;
    }
    const item = this.pool.acquire();
    if (!item) {
      this.dropped++;
      return;
    }
    if (kind === 'wake') this.wakeCooldown = 0.065;
    const radius =
      event.kind === 'phase'
        ? 102
        : kind === 'pulse'
          ? Math.max(28, Math.min(185, event.amount || 62))
          : kind === 'impact'
            ? event.kind === 'crit'
              ? 31
              : 24
            : event.kind === 'shot'
              ? 36
              : kind === 'wake'
                ? 26
                : 42;
    Object.assign(item, {
      x: event.x,
      y: event.y,
      angle,
      radius,
      age: 0,
      duration:
        kind === 'wake'
          ? 0.24
          : kind === 'impact'
            ? 0.28
            : kind === 'pulse'
              ? 0.48
              : 0.55,
      color: effectColor(event),
      kind,
      hostile: hostileEffect(event),
    });
  }
  /** Feedback is intentionally gated; chain crits cannot continuously shake. */
  cameraFeedback(
    event: EffectEvent,
    reduced: boolean,
  ): { duration: number; strength: number } | null {
    if (
      reduced ||
      this.cameraCooldown > 0 ||
      !['hurt', 'phase', 'impact'].includes(event.kind)
    )
      return null;
    this.cameraCooldown = event.kind === 'phase' ? 0.4 : 0.18;
    return event.kind === 'phase'
      ? { duration: 140, strength: 0.0018 }
      : event.kind === 'hurt'
        ? { duration: 90, strength: 0.0022 }
        : { duration: 45, strength: 0.0007 };
  }
  advance(dt: number, reduced: boolean) {
    const step = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
    this.wakeCooldown = Math.max(0, this.wakeCooldown - step);
    this.cameraCooldown = Math.max(0, this.cameraCooldown - step);
    let kept = 0;
    for (const item of this.pool.items)
      if (item.active) {
        item.age += step;
        if (
          item.age >= item.duration ||
          (reduced &&
            (item.kind === 'wake' || kept++ >= VFX_BUDGET.reducedSignatures))
        )
          item.active = false;
      }
  }
  draw(g: Phaser.GameObjects.Graphics, reduced: boolean) {
    for (const item of this.pool.items) {
      if (!item.active) continue;
      const t = item.age / item.duration,
        fade = (1 - t) ** 1.6;
      const expansion = 1 - (1 - t) ** 3;
      const radius = item.radius * (0.35 + 0.65 * expansion);
      if (item.kind === 'wake') {
        const dx = Math.cos(item.angle),
          dy = Math.sin(item.angle);
        g.lineStyle(2, item.color, fade * 0.65);
        for (const side of [-1, 1]) {
          const x = item.x - dy * side * 9,
            y = item.y + dx * side * 9;
          g.lineBetween(x, y, x - dx * (30 + t * 28), y - dy * (30 + t * 28));
        }
        g.lineStyle(1, ARC_PALETTE.ivory, fade * 0.65);
        diamond(g, item.x, item.y, 7, item.angle);
        continue;
      }
      if (item.kind === 'impact') {
        // An ivory contact core followed by directional, decaying line fragments.
        for (let i = 0; i < (reduced ? 4 : 6); i++) {
          const a = item.angle + (i * Math.PI) / 3;
          const from = radius * 0.35,
            to = radius * (i % 2 ? 0.8 : 1.25);
          g.lineStyle(
            i % 2 ? 1 : 2,
            i % 2 ? item.color : ARC_PALETTE.ivory,
            fade,
          );
          g.lineBetween(
            item.x + Math.cos(a) * from,
            item.y + Math.sin(a) * from,
            item.x + Math.cos(a) * to,
            item.y + Math.sin(a) * to,
          );
        }
        if (t < 0.4) {
          g.fillStyle(ARC_PALETTE.ivory, (1 - t / 0.4) * 0.8);
          fillDisc(g, item.x, item.y, 3);
        }
        continue;
      }
      const strength = reduced ? 0.45 : 0.64;
      strokeRing(
        g,
        item.x,
        item.y,
        radius,
        item.color,
        fade * strength,
        item.kind === 'pulse' ? 2.5 : 1.5,
      );
      // Arcane ordnance uses cut diamonds; enemy releases use inward teeth.
      const count = reduced ? 4 : item.hostile ? 6 : 8;
      g.lineStyle(
        1.5,
        item.hostile ? ARC_PALETTE.dangerEdge : ARC_PALETTE.ivory,
        fade * 0.8,
      );
      for (let i = 0; i < count; i++) {
        const a = item.angle + (i * Math.PI * 2) / count;
        const x = item.x + Math.cos(a) * radius,
          y = item.y + Math.sin(a) * radius;
        if (item.hostile) {
          g.lineBetween(
            x - Math.sin(a) * 4,
            y + Math.cos(a) * 4,
            x - Math.cos(a) * 10,
            y - Math.sin(a) * 10,
          );
          g.lineBetween(
            x + Math.sin(a) * 4,
            y - Math.cos(a) * 4,
            x - Math.cos(a) * 10,
            y - Math.sin(a) * 10,
          );
        } else diamond(g, x, y, reduced ? 2 : 3.5, a);
      }
      if (!reduced && item.kind === 'seal') {
        g.lineStyle(1, ARC_PALETTE.empowered, fade * 0.45);
        diamond(g, item.x, item.y, radius * 0.7, item.angle + 0.25);
      }
    }
  }
  clear() {
    this.pool.clear();
    this.wakeCooldown = this.cameraCooldown = 0;
  }
}

/** Exact hazard extent remains fixed; countdown marks move only inside it. */
export function drawDangerSeal(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  urgency: number,
  reduced: boolean,
) {
  const progress = Math.max(0, Math.min(1, urgency));
  strokeRing(g, x, y, radius, ARC_PALETTE.ink, 0.8, 5);
  strokeRing(g, x, y, radius, ARC_PALETTE.danger, 0.94, 2);
  g.lineStyle(1.5, ARC_PALETTE.dangerEdge, 0.9);
  const count = reduced ? 4 : 8;
  for (let i = 0; i < count; i++) {
    const a = (i * Math.PI * 2) / count;
    const px = x + Math.cos(a) * (radius - 3),
      py = y + Math.sin(a) * (radius - 3);
    g.lineBetween(
      px - Math.sin(a) * 4,
      py + Math.cos(a) * 4,
      px - Math.cos(a) * 9,
      py - Math.sin(a) * 9,
    );
    g.lineBetween(
      px + Math.sin(a) * 4,
      py - Math.cos(a) * 4,
      px - Math.cos(a) * 9,
      py - Math.sin(a) * 9,
    );
  }
  // The cross is a persistent shape cue, including reduced-effects mode.
  g.lineStyle(2, ARC_PALETTE.dangerEdge, 0.9);
  g.lineBetween(x - 6, y - 6, x + 6, y + 6);
  g.lineBetween(x - 6, y + 6, x + 6, y - 6);
  if (!reduced) {
    g.lineStyle(2, ARC_PALETTE.dangerEdge, 0.3 + progress * 0.3);
    g.beginPath();
    g.arc(
      x,
      y,
      Math.max(8, radius - 8),
      -Math.PI / 2,
      -Math.PI / 2 + progress * Math.PI * 2,
      false,
    );
    g.strokePath();
  }
}

export function drawHazardBody(
  g: Phaser.GameObjects.Graphics,
  hazard: Hazard,
  time: number,
  reduced: boolean,
) {
  const { x, y, r } = hazard;
  if (!hazard.friendly) {
    g.fillStyle(
      ARC_PALETTE.danger,
      0.055 + Math.max(0, 1 - hazard.time / hazard.duration) * 0.045,
    );
    fillDisc(g, x, y, r);
    return;
  }
  const color =
    hazard.type === 'well' ? ARC_PALETTE.ally : ARC_PALETTE.empowered;
  strokeRing(g, x, y, r, color, 0.46, 1.5);
  g.fillStyle(color, reduced ? 0.025 : 0.045);
  fillDisc(g, x, y, r);
  if (hazard.type !== 'well') return;
  const age = hazard.duration - hazard.time;
  const fade = Math.min(1, age * 5, hazard.time * 3);
  g.lineStyle(1, ARC_PALETTE.ivory, 0.4 * fade);
  diamond(g, x, y, 10, Math.PI / 4);
  if (reduced) return;
  // Six inward tendrils express pull without suggesting damage beyond r.
  for (let ray = 0; ray < 6; ray++) {
    g.lineStyle(1, color, 0.29 * fade);
    g.beginPath();
    for (let point = 0; point <= 12; point++) {
      const fraction = point / 12;
      const a = (ray * Math.PI) / 3 + time * 0.32 + fraction * 1.15;
      const radius = r * (0.12 + fraction * 0.75);
      const px = x + Math.cos(a) * radius,
        py = y + Math.sin(a) * radius;
      if (point === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
    const a = (ray * Math.PI) / 3 + time * 0.32 + 1.15;
    g.lineStyle(1, ARC_PALETTE.ivory, 0.65 * fade);
    diamond(g, x + Math.cos(a) * r * 0.87, y + Math.sin(a) * r * 0.87, 3, a);
  }
}
