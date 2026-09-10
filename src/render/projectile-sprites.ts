import type Phaser from 'phaser';
import type { World } from '../game/world';

const KEY = 'hostile-projectile-v3';
/** Hostile hit cues are opaque, pooled, and drawn above friendly decoration. */
export class ProjectileSprites {
  private images: Phaser.GameObjects.Image[] = [];
  constructor(private scene: Phaser.Scene) {
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
  update(w: World) {
    if (!this.scene.textures.exists(KEY)) return false;
    let used = 0;
    for (const b of w.projectiles.items) {
      if (!b.active || !b.enemy) continue;
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
    return true;
  }
  get count() {
    return this.images.length;
  }
  dispose() {
    for (const image of this.images) image.destroy();
    this.images = [];
  }
}
