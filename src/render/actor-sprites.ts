import type Phaser from 'phaser';
import type { EnemyKind } from '../game/types';
import type { World } from '../game/world';
import { compositeSpriteMatte } from './sprite-matte';

const SOURCE = 'actors-chroma-v2';
const TEXTURE = 'actors-composited-v2';
const FRAME: Record<EnemyKind, number> = {
  hunter: 1,
  lancer: 2,
  sentry: 3,
  conduit: 3,
  weaver: 5,
  bomber: 3,
  shade: 1,
  cantor: 5,
  warden: 4,
  oracle: 5,
  forgemaster: 4,
  matron: 5,
};

/** Six source silhouettes, reused by family. Images are pooled by entity ID.
 * Art is presentation only: radius, hit tests, RNG and fixed-step time are untouched. */
export class ActorSprites {
  private enemies = new Map<number, Phaser.GameObjects.Image>();
  private spare: Phaser.GameObjects.Image[] = [];
  private player: Phaser.GameObjects.Image | null = null;
  private ghosts: Phaser.GameObjects.Image[] = [];
  private ghostIndex = 0;
  private ghostClock = 0;
  private ready = false;
  private owner: World | null = null;
  private alive = new Set<number>();

  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists(TEXTURE) && scene.textures.exists(SOURCE)) {
      const source = scene.textures
        .get(SOURCE)
        .getSourceImage() as HTMLImageElement;
      if (source.width !== 1536 || source.height !== 1024) return;
      const texture = scene.textures.createCanvas(TEXTURE, 1536, 1024);
      if (!texture) return;
      try {
        const context = texture.context;
        context.drawImage(source, 0, 0);
        const data = context.getImageData(0, 0, 1536, 1024);
        compositeSpriteMatte(data.data);
        context.putImageData(data, 0, 0);
        texture.refresh();
      } catch {
        scene.textures.remove(TEXTURE);
        return;
      }
      for (let frame = 0; frame < 6; frame++)
        texture.add(
          frame,
          0,
          (frame % 3) * 512,
          Math.floor(frame / 3) * 512,
          512,
          512,
        );
    }
    this.ready = scene.textures.exists(TEXTURE);
    if (!this.ready) return;
    this.player = this.create(0).setName('arcanist-sprite');
    for (let i = 0; i < 5; i++)
      this.ghosts.push(
        this.create(0).setName('dash-afterimage').setVisible(false),
      );
  }

  private create(frame: number) {
    return this.scene.add
      .image(0, 0, TEXTURE, frame)
      .setOrigin(0.5, 0.68)
      .setDepth(2);
  }

  update(w: World, time: number, delta: number, reducedMotion: boolean) {
    if (!this.ready || !this.player) return false;
    if (this.owner !== w) {
      for (const image of this.enemies.values())
        this.spare.push(image.setVisible(false));
      this.enemies.clear();
      this.ghosts.forEach((image) => image.setVisible(false));
      this.ghostClock = 0;
      this.ghostIndex = 0;
      this.owner = w;
    }
    this.alive.clear();
    for (const enemy of w.enemies) this.alive.add(enemy.id);
    for (const [id, image] of this.enemies)
      if (!this.alive.has(id)) {
        this.enemies.delete(id);
        this.spare.push(image.setVisible(false));
      }
    for (const enemy of w.enemies) {
      let image = this.enemies.get(enemy.id);
      if (!image) {
        image = this.spare.pop() || this.create(FRAME[enemy.kind]);
        this.enemies.set(enemy.id, image);
        image.setFrame(FRAME[enemy.kind]).setName(`entity-${enemy.kind}`);
      }
      if (String(image.frame.name) !== String(FRAME[enemy.kind]))
        image.setFrame(FRAME[enemy.kind]);
      const boss = enemy.radius > 35;
      const bob = reducedMotion
        ? 0
        : Math.sin(time * 3 + enemy.id) * (boss ? 1.4 : 0.6);
      const size = enemy.radius * (boss ? 3.1 : 3.4);
      if (image.displayWidth !== size) image.setDisplaySize(size, size);
      const depth = 2 + Math.floor(enemy.y / 8) / 1250;
      if (image.depth !== depth) image.setDepth(depth);
      image
        .setVisible(true)
        .setPosition(enemy.x, enemy.y + 8 + bob)
        .setFlipX(enemy.aimX < enemy.x)
        .setAlpha(enemy.kind === 'shade' ? 0.78 : 1)
        .setAngle(reducedMotion ? 0 : Math.sin(time * 4 + enemy.id) * 1.3);
      if (enemy.flash > 0) image.setTint(0xffd5aa);
      else if (enemy.slow > 0) image.setTint(0xa4d9ff);
      else if (enemy.kind === 'forgemaster') image.setTint(0xffc08e);
      else if (enemy.kind === 'matron') image.setTint(0xdcebc6);
      else image.clearTint();
    }
    const p = w.player;
    const movement = Math.hypot(p.vx, p.vy);
    const gait = reducedMotion || movement < 8 ? 0 : Math.sin(time * 15) * 1.2;
    const playerDepth = 2 + Math.floor(p.y / 8) / 1250;
    if (this.player.depth !== playerDepth) this.player.setDepth(playerDepth);
    this.player
      .setPosition(p.x, p.y + 8 + gait)
      .setDisplaySize(70, 70)
      .setFlipX(Math.cos(p.angle) < 0)
      .setAngle(reducedMotion ? 0 : Math.max(-5, Math.min(5, p.vx / 85)))
      .setAlpha(
        p.invulnerable > 0 && p.invulnerable < 0.9 && p.dashTime <= 0 ? 0.8 : 1,
      );
    if (p.dashTime > 0) this.player.setTint(0xd3ffec);
    else this.player.clearTint();
    this.ghostClock = Math.max(0, this.ghostClock - delta);
    for (const ghost of this.ghosts) {
      if (reducedMotion) ghost.setVisible(false);
      if (!ghost.visible) continue;
      ghost.setAlpha(Math.max(0, ghost.alpha - delta * 2.7));
      if (ghost.alpha === 0) ghost.setVisible(false);
    }
    if (!reducedMotion && p.dashTime > 0 && this.ghostClock === 0) {
      const ghost = this.ghosts[this.ghostIndex++ % this.ghosts.length];
      ghost
        .setPosition(p.x, p.y + 8)
        .setDisplaySize(70, 70)
        .setAlpha(0.38)
        .setFlipX(this.player.flipX)
        .setAngle(this.player.angle)
        .setTintFill(w.stats.accent)
        .setDepth(1.9)
        .setVisible(true);
      this.ghostClock = 0.035;
    }
    return true;
  }

  dispose() {
    for (const image of [
      ...this.enemies.values(),
      ...this.spare,
      ...this.ghosts,
    ])
      image.destroy();
    this.player?.destroy();
    this.player = null;
    this.enemies.clear();
    this.spare = [];
    this.ghosts = [];
    this.alive.clear();
    this.owner = null;
  }
  get count() {
    return (
      this.enemies.size +
      this.spare.length +
      this.ghosts.length +
      (this.player ? 1 : 0)
    );
  }
}
