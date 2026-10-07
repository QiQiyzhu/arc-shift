import type Phaser from 'phaser';
import type { World } from '../game/world';

const KEY = 'hostile-projectile-v3';
const SHAPES = [
  'bolt',
  'meteor',
  'lance',
  'crystal',
  'blade',
  'shell',
] as const;
function friendlyTextures(scene: Phaser.Scene) {
  for (const shape of SHAPES)
    for (const core of [false, true]) {
      const key = `friendly-${shape}-${core ? 'core' : 'aura'}-v21`;
      if (scene.textures.exists(key)) continue;
      const texture = scene.textures.createCanvas(key, 128, 64);
      if (!texture) continue;
      const c = texture.context;
      if (!core) {
        const halo = c.createRadialGradient(96, 32, 1, 96, 32, 25);
        halo.addColorStop(0, '#ffffffad');
        halo.addColorStop(0.35, '#ffffff45');
        halo.addColorStop(1, '#ffffff00');
        c.fillStyle = halo;
        c.fillRect(66, 2, 60, 60);
        const tail = c.createLinearGradient(0, 0, 98, 0);
        tail.addColorStop(0, '#ffffff00');
        tail.addColorStop(0.65, '#ffffff30');
        tail.addColorStop(1, '#ffffffde');
        c.fillStyle = tail;
        c.beginPath();
        c.moveTo(0, 32);
        c.quadraticCurveTo(68, 24, 98, 19);
        c.lineTo(102, 43);
        c.quadraticCurveTo(62, 38, 0, 32);
        c.fill();
        if (shape === 'lance') {
          c.fillStyle = '#ffffff77';
          c.fillRect(3, 29, 98, 6);
        }
        if (shape === 'shell' || shape === 'meteor') {
          c.strokeStyle = '#ffffffe0';
          c.lineWidth = 1.8;
          c.beginPath();
          c.arc(96, 32, shape === 'shell' ? 16 : 13, 0, Math.PI * 2);
          c.stroke();
        }
      } else {
        c.fillStyle = '#fffffff5';
        c.strokeStyle = '#ffffffb0';
        c.lineWidth = 1.2;
        c.beginPath();
        if (shape === 'blade') {
          c.moveTo(117, 32);
          c.lineTo(94, 25);
          c.lineTo(79, 32);
          c.lineTo(94, 39);
        } else if (shape === 'crystal') {
          c.moveTo(108, 32);
          c.lineTo(96, 24);
          c.lineTo(84, 32);
          c.lineTo(96, 40);
        } else if (shape === 'lance') {
          c.moveTo(122, 32);
          c.lineTo(85, 29.8);
          c.lineTo(30, 32);
          c.lineTo(85, 34.2);
        } else
          c.ellipse(
            96,
            32,
            shape === 'bolt' ? 9 : 8,
            shape === 'bolt' ? 4 : 7,
            0,
            0,
            Math.PI * 2,
          );
        c.closePath();
        c.fill();
        c.stroke();
      }
      texture.refresh();
    }
}
/** Hostile hit cues are opaque, pooled, and drawn above friendly decoration. */
export class ProjectileSprites {
  private images: Phaser.GameObjects.Image[] = [];
  private friendly: {
    aura: Phaser.GameObjects.Image;
    core: Phaser.GameObjects.Image;
  }[] = [];
  constructor(private scene: Phaser.Scene) {
    friendlyTextures(scene);
    if (!scene.textures.exists(KEY)) {
      const texture = scene.textures.createCanvas(KEY, 64, 32);
      if (!texture) return;
      const c = texture.context;
      const tail = c.createLinearGradient(0, 0, 48, 0);
      tail.addColorStop(0, '#ff527900');
      tail.addColorStop(1, '#ff527985');
      c.fillStyle = tail;
      c.fillRect(0, 13, 48, 6);
      c.beginPath();
      c.arc(48, 16, 11, 0, Math.PI * 2);
      c.fillStyle = '#270e22';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#ff6f96';
      c.stroke();
      c.beginPath();
      c.arc(48, 16, 5.5, 0, Math.PI * 2);
      c.fillStyle = '#fff4d9';
      c.fill();
      texture.refresh();
    }
  }
  update(w: World, reduced = false) {
    const hidePooled = () => {
      for (const image of this.images) image.setVisible(false);
      for (const pair of this.friendly) {
        pair.aura.setVisible(false);
        pair.core.setVisible(false);
      }
    };
    if (!this.scene.textures.exists(KEY)) {
      hidePooled();
      return false;
    }
    // The geometry renderer is the all-or-nothing fallback for projectile
    // presentation. If even one friendly shape has no generated texture,
    // returning true would make drawActors skip that projectile entirely.
    // Hide any images from the previous frame, then let the vector pass draw
    // every active projectile consistently.
    for (const b of w.projectiles.items) {
      if (!b.active || b.enemy) continue;
      if (
        !this.scene.textures.exists(`friendly-${b.shape}-aura-v21`) ||
        !this.scene.textures.exists(`friendly-${b.shape}-core-v21`)
      ) {
        hidePooled();
        return false;
      }
    }
    let used = 0,
      friendlyUsed = 0;
    for (const b of w.projectiles.items) {
      if (!b.active) continue;
      if (!b.enemy) {
        let pair = this.friendly[friendlyUsed];
        if (!pair) {
          const make = () =>
            this.scene.add
              .image(0, 0, '__DEFAULT')
              .setOrigin(0.75, 0.5)
              .setDepth(2.8);
          pair = this.friendly[friendlyUsed] = { aura: make(), core: make() };
        }
        const angle = Math.atan2(b.vy, b.vx),
          scale = Math.max(0.65, b.radius / 6);
        pair.aura
          .setTexture(`friendly-${b.shape}-aura-v21`)
          .setPosition(b.x, b.y)
          .setRotation(angle)
          .setScale(scale * (b.shape === 'lance' ? 1.15 : 1), scale)
          .setTint(b.color)
          .setAlpha(reduced ? 0.18 : 0.64)
          .setVisible(true);
        pair.core
          .setTexture(`friendly-${b.shape}-core-v21`)
          .setPosition(b.x, b.y)
          .setRotation(angle)
          .setScale(scale * (b.impactPause > 0 ? 1.15 : 1))
          .setTint(b.accent)
          .setAlpha(0.95)
          .setVisible(true);
        friendlyUsed++;
        continue;
      }
      let image = this.images[used];
      if (!image)
        image = this.images[used] = this.scene.add
          .image(0, 0, KEY)
          .setOrigin(0.75, 0.5)
          .setDepth(5);
      image
        .setPosition(b.x, b.y)
        .setRotation(Math.atan2(b.vy, b.vx))
        .setScale((b.radius + 2) / 11)
        .setVisible(true);
      used++;
    }
    for (let i = used; i < this.images.length; i++)
      this.images[i].setVisible(false);
    for (let i = friendlyUsed; i < this.friendly.length; i++) {
      this.friendly[i].aura.setVisible(false);
      this.friendly[i].core.setVisible(false);
    }
    return true;
  }
  get count() {
    return this.images.length + this.friendly.length * 2;
  }
  dispose() {
    for (const image of this.images) image.destroy();
    this.images = [];
    for (const pair of this.friendly) {
      pair.aura.destroy();
      pair.core.destroy();
    }
    this.friendly = [];
  }
}
