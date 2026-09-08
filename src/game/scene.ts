import Phaser from 'phaser';
import { Engine } from './engine';
import { Effects } from '../effects/particles';
import { drawArena } from '../render/arena';
import { drawActors, glow } from '../render/actors';
import type { Input } from './types';
export class ArcScene extends Phaser.Scene {
  engine: Engine;
  effects!: Effects;
  floor!: Phaser.GameObjects.Image;
  graphics!: Phaser.GameObjects.Graphics;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private accumulator = 0;
  private stamp = '';
  private edges = { dash: false, q: false, e: false };
  private pauseEdge = false;
  private unsubscribe?: () => void;
  private onBlur = () => {
    if (
      ['playing', 'transition', 'bossIntro'].includes(this.engine.world.phase)
    )
      this.engine.pause();
  };
  inputBlocked = false;
  onTick: () => void = () => {};
  reducedMotion = false;
  release = () => {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    window.removeEventListener('blur', this.onBlur);
  };
  constructor(engine: Engine) {
    super('ARC');
    this.engine = engine;
  }
  private arenaTexture(template = 0) {
    const key = `arena-floor-${template}`;
    if (!this.textures.exists(key)) {
      const source = this.make.graphics({ x: 0, y: 0 }, false);
      drawArena(source, template);
      source.generateTexture(key, 1280, 720);
      source.destroy();
    }
    return key;
  }
  create() {
    this.floor = this.add
      .image(0, 0, this.arenaTexture())
      .setOrigin(0)
      .setDepth(0);
    this.graphics = this.add.graphics().setDepth(2);
    this.effects = new Effects(this);
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,SPACE,Q,E,ESC,UP,DOWN,LEFT,RIGHT',
    ) as typeof this.keys;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.input.mouse!.disableContextMenu();
    // Key-down events latch even when down/up both arrive before the next rendered frame.
    this.keys.SPACE.on('down', () => {
      this.edges.dash = true;
    });
    this.keys.Q.on('down', () => {
      this.edges.q = true;
    });
    this.keys.E.on('down', () => {
      this.edges.e = true;
    });
    this.keys.ESC.on('down', () => {
      if (!this.inputBlocked) this.pauseEdge = true;
    });
    this.unsubscribe = this.engine.world.bus.on((e) => {
      this.effects.emit(e);
      if (
        !this.reducedMotion &&
        (e.kind === 'crit' || e.kind === 'hurt' || e.kind === 'phase')
      )
        this.cameras.main.shake(
          e.kind === 'phase' ? 180 : 70,
          e.kind === 'hurt' ? 0.003 : 0.0012,
        );
    });
    window.addEventListener('blur', this.onBlur);
    this.events.once('shutdown', this.release);
    this.events.once('destroy', this.release);
    const w = this.engine.world;
    w.enemies = [];
    w.player.x = 822;
    w.player.y = 385;
    w.player.angle = -0.6;
    w.spawn('hunter', 995, 310);
    w.spawn('lancer', 980, 480);
    w.spawn('sentry', 660, 250);
    w.spawn('weaver', 1050, 205);
    w.phase = 'menu';
  }
  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    const w = this.engine.world;
    const p = this.input.activePointer;
    const input: Input = {
      x:
        Number(this.keys.D.isDown || this.keys.RIGHT.isDown) -
        Number(this.keys.A.isDown || this.keys.LEFT.isDown),
      y:
        Number(this.keys.S.isDown || this.keys.DOWN.isDown) -
        Number(this.keys.W.isDown || this.keys.UP.isDown),
      aimX: p.worldX,
      aimY: p.worldY,
      fire: p.leftButtonDown(),
      ...this.edges,
    };
    if (this.inputBlocked) {
      this.edges = { dash: false, q: false, e: false };
      this.pauseEdge = false;
      this.accumulator = 0;
    }
    if (this.pauseEdge) {
      this.engine.pause();
      this.pauseEdge = false;
    }
    if (!this.inputBlocked) this.accumulator += dt;
    while (this.accumulator >= 1 / 60) {
      this.engine.update(1 / 60, input);
      input.dash = input.q = input.e = false;
      this.edges = { dash: false, q: false, e: false };
      this.accumulator -= 1 / 60;
    }
    const stamp = `${w.seed}-${w.room.index}-${w.room.template}`;
    if (stamp !== this.stamp) {
      this.floor.setTexture(this.arenaTexture(w.room.template));
      this.effects.clear();
      this.stamp = stamp;
    }
    this.graphics.clear();
    for (const [x, y] of [
      [169, 175],
      [1110, 175],
      [169, 544],
      [1110, 544],
    ]) {
      glow(this.graphics, x, y, 18, 0xb6ed9e, 0.07);
      this.graphics.fillStyle(0xc9ffa5, 0.8);
      this.graphics.fillRect(x - 8, y - 5, 16, 3);
    }
    drawActors(this.graphics, this.engine.world, time / 1000);
    this.effects.draw(this.graphics, dt);
    if (w.phase === 'playing') {
      this.graphics.lineStyle(1, 0xd0f7c0, 0.8);
      this.graphics.strokeCircle(input.aimX, input.aimY, 9);
      this.graphics.lineBetween(
        input.aimX - 14,
        input.aimY,
        input.aimX - 5,
        input.aimY,
      );
      this.graphics.lineBetween(
        input.aimX + 5,
        input.aimY,
        input.aimX + 14,
        input.aimY,
      );
    }
    this.onTick();
  }
}
