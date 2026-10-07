import type Phaser from 'phaser';
import type { EffectEvent } from '../core/events';

type Burst = {
  image: Phaser.GameObjects.Image;
  life: number;
  max: number;
  scale: number;
  expanding: boolean;
};
/** Small cached textures enrich contact without a screen flash or unbounded emitters. */
export class BurstSprites {
  private items: Burst[] = [];
  dropped = 0;
  constructor(private scene: Phaser.Scene) {
    for (const kind of ['muzzle', 'contact', 'crit', 'shock']) {
      const key = `burst-${kind}-v22`;
      if (scene.textures.exists(key)) continue;
      const texture = scene.textures.createCanvas(key, 128, 128);
      if (!texture) continue;
      const c = texture.context;
      const glow = c.createRadialGradient(64, 64, 0, 64, 64, 62);
      glow.addColorStop(0, kind === 'shock' ? '#ffffff00' : '#ffffff65');
      glow.addColorStop(0.25, '#ffffff12');
      glow.addColorStop(1, '#ffffff00');
      c.fillStyle = glow;
      c.fillRect(0, 0, 128, 128);
      if (kind === 'shock') {
        c.strokeStyle = '#ffffffc0';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(64, 64, 46, 0, Math.PI * 2);
        c.stroke();
      } else {
        c.fillStyle = '#fffffff2';
        c.beginPath();
        if (kind === 'muzzle') {
          c.moveTo(34, 64);
          c.lineTo(72, 54);
          c.lineTo(116, 64);
          c.lineTo(72, 74);
        } else {
          const points = 8;
          for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points,
              r =
                kind === 'crit'
                  ? i % 2
                    ? 10
                    : i % 4
                      ? 31
                      : 52
                  : i % 2
                    ? 6
                    : i % 4
                      ? 24
                      : 48;
            const x = 64 + Math.cos(angle) * r,
              y = 64 + Math.sin(angle) * r;
            if (i === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
        }
        c.closePath();
        c.fill();
      }
      texture.refresh();
    }
  }
  emit(e: EffectEvent, angle: number, reduced: boolean) {
    const muzzle = e.kind === 'shot',
      contact = e.kind === 'hit' || e.kind === 'crit' || e.kind === 'impact';
    const shock = e.kind === 'kill'; // Major blast extent belongs to the sigil pass.
    if (!muzzle && !contact && !shock) return;
    if (reduced && e.kind !== 'crit' && e.kind !== 'impact') return;
    let burst = this.items.find((b) => b.life <= 0);
    if (!burst) {
      if (this.items.length >= 64) {
        this.dropped++;
        return;
      }
      burst = {
        image: this.scene.add.image(0, 0, '__DEFAULT').setDepth(2.95),
        life: 0,
        max: 1,
        scale: 1,
        expanding: false,
      };
      this.items.push(burst);
    }
    const cannon = muzzle && e.weapon === 'cannon';
    burst.max = cannon ? 0.12 : muzzle ? 0.06 : shock ? 0.2 : 0.085;
    burst.life = burst.max;
    burst.scale = cannon
      ? 0.58
      : muzzle
        ? 0.36
        : e.kind === 'bomb'
          ? Math.min(2.6, (e.amount || 80) / 50)
          : e.kind === 'crit'
            ? 0.5
            : shock
              ? 0.42
              : 0.38;
    burst.expanding = shock;
    const offset = cannon ? 18 : 0;
    burst.image
      .setTexture(
        `burst-${muzzle ? 'muzzle' : shock ? 'shock' : e.kind === 'crit' ? 'crit' : 'contact'}-v22`,
      )
      .setPosition(
        e.x + Math.cos(angle) * offset,
        e.y + Math.sin(angle) * offset,
      )
      .setRotation(angle)
      .setTint(muzzle || contact ? e.color : 0xffe4b9)
      .setBlendMode('ADD')
      .setScale(burst.scale)
      .setAlpha(reduced ? 0.4 : 0.85)
      .setVisible(true);
  }
  update(dt: number, reduced: boolean) {
    for (const burst of this.items) {
      if (burst.life <= 0) continue;
      burst.life = Math.max(0, burst.life - dt);
      const alpha = burst.life / burst.max;
      burst.image
        .setVisible(alpha > 0)
        .setAlpha(alpha * (reduced ? 0.35 : 0.85));
      burst.image.setScale(
        burst.scale *
          (burst.expanding ? 1.35 - alpha * 0.7 : 0.75 + alpha * 0.25),
      );
    }
  }
  get count() {
    return this.items.length;
  }
  clear() {
    for (const b of this.items) {
      b.life = 0;
      b.image.setVisible(false);
    }
  }
  dispose() {
    for (const b of this.items) b.image.destroy();
    this.items = [];
  }
}
