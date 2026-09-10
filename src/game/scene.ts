import Phaser from 'phaser';
import { Engine } from './engine';
import { Effects } from '../effects/particles';
import { drawArena } from '../render/arena';
import { drawActors } from '../render/actors';
import { drawTerrain } from '../render/terrain';
import type { Input } from './types';
import { ActionInput, type PadSnapshot } from '../input/actions';
import { loadBindings } from '../input/bindings';
export class ArcScene extends Phaser.Scene {
  engine: Engine;
  effects!: Effects;
  floor!: Phaser.GameObjects.Image;
  graphics!: Phaser.GameObjects.Graphics;
  readonly actions = new ActionInput(loadBindings());
  private accumulator = 0;
  private focused = !document.hidden;
  private baselinePadOnFocus = false;
  private stamp = '';
  private unsubscribe?: () => void;
  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      !this.focused ||
      this.inputBlocked ||
      target?.closest?.('input,textarea,select,[contenteditable="true"]')
    )
      return;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    // Space/arrows remain reserved against page scrolling or activating a stale
    // focused HUD button, even after the player rebinds their gameplay action.
    if (
      (this.actions.isBound(event.code) ||
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          event.code,
        )) &&
      this.engine.world.phase !== 'menu'
    )
      event.preventDefault();
    this.actions.keyDown(event.code);
  };
  private onKeyUp = (event: KeyboardEvent) => this.actions.keyUp(event.code);
  private onBlur = () => {
    this.focused = false;
    this.actions.suppress();
    this.accumulator = 0;
    if (import.meta.env.DEV && this.externalSimulation) return;
    if (
      ['playing', 'transition', 'bossIntro'].includes(this.engine.world.phase)
    )
      this.engine.pause();
    this.onSuspend();
  };
  private onFocus = () => {
    const focused = !document.hidden;
    if (focused && !this.focused) this.baselinePadOnFocus = true;
    this.focused = focused;
  };
  private onVisibility = () => {
    if (document.hidden) this.onBlur();
    else if (document.hasFocus()) this.onFocus();
  };
  inputBlocked = false;
  /** Used only by the development QA page; production always owns its loop. */
  externalSimulation?: (dt: number, input: Input) => void;
  onTick: () => void = () => {};
  onReady: () => void = () => {};
  onSuspend: () => void = () => {};
  reducedMotion = false;
  release = () => {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.actions.suppress();
  };
  constructor(
    engine: Engine,
    private menuPreview = true,
  ) {
    super('ARC');
    this.engine = engine;
  }
  private arenaTexture(template = 0, biome = 'sanctum') {
    if (this.textures.exists(biome)) return biome;
    if (this.textures.exists('sanctum')) return 'sanctum';
    const key = `arena-floor-${template}`;
    if (!this.textures.exists(key)) {
      const source = this.make.graphics({ x: 0, y: 0 }, false);
      drawArena(source, template);
      source.generateTexture(key, 1280, 720);
      source.destroy();
    }
    return key;
  }
  preload() {
    this.load.image('sanctum', '/art/sanctum.webp');
    this.load.image('grove', '/art/grove.webp');
    this.load.image('foundry', '/art/foundry.webp');
  }
  create() {
    this.floor = this.add
      .image(0, 0, this.arenaTexture())
      .setOrigin(0)
      .setDisplaySize(1280, 720)
      .setDepth(0);
    this.graphics = this.add.graphics().setDepth(2);
    this.effects = new Effects(this);
    this.input.mouse!.disableContextMenu();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
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
    window.addEventListener('focus', this.onFocus);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once('shutdown', this.release);
    this.events.once('destroy', this.release);
    if (this.menuPreview) {
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
    this.onReady();
  }
  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    const w = this.engine.world;
    const p = this.input.activePointer;
    let pad: PadSnapshot | null = null;
    try {
      pad =
        Array.from(navigator.getGamepads?.() || []).find(
          (g) => g?.connected && g.mapping === 'standard',
        ) || null;
    } catch {
      /* A restricted Gamepad API must not break keyboard/mouse play. */
    }
    this.actions.pollGamepad(pad, this.baselinePadOnFocus);
    if (pad) this.baselinePadOnFocus = false;
    if (this.inputBlocked || !this.focused) {
      this.actions.suppress();
      this.accumulator = 0;
    }
    const input = this.actions.sample(
      {
        x: p.worldX,
        y: p.worldY,
        fire:
          this.actions.mouseAttack === 0
            ? p.leftButtonDown()
            : p.rightButtonDown(),
      },
      w.player,
    );
    if (!this.focused) {
      input.x = input.y = 0;
      input.fire =
        input.dash =
        input.q =
        input.e =
        input.bomb =
        input.heal =
          false;
    }
    if (
      this.actions.consumePause() &&
      this.focused &&
      !this.inputBlocked &&
      !(import.meta.env.DEV && this.externalSimulation)
    ) {
      this.engine.pause();
    }
    if (
      !this.inputBlocked &&
      (this.focused || (import.meta.env.DEV && this.externalSimulation))
    )
      this.accumulator += dt;
    while (this.accumulator >= 1 / 60) {
      if (import.meta.env.DEV && this.externalSimulation)
        this.externalSimulation(1 / 60, input);
      else this.engine.update(1 / 60, input);
      input.dash = input.q = input.e = input.bomb = input.heal = false;
      this.actions.consumeStep();
      this.accumulator -= 1 / 60;
    }
    const stamp = `${w.seed}-${w.room.index}-${w.room.template}-${w.room.biome}`;
    if (stamp !== this.stamp) {
      this.floor.setTexture(this.arenaTexture(w.room.template, w.room.biome));
      this.floor
        .setDisplaySize(1280, 720)
        .setTint(
          w.room.biome && w.room.biome !== 'sanctum'
            ? 0xe4e4dc
            : [0xd9e4de, 0xf1d2ae, 0xc5d9f1, 0xdfc4f2][w.room.template % 4],
        );
      this.effects.clear();
      this.stamp = stamp;
    }
    this.graphics.clear();
    drawTerrain(this.graphics, w);
    this.graphics.lineStyle(1, 0xd6b47c, 0.25);
    this.graphics.strokeRoundedRect(76, 100, 1128, 532, 14);
    for (let i = 0; i < 20; i++) {
      const x = 90 + ((i * 193 + time * 0.006) % 1100),
        y = 120 + ((i * 117 - time * 0.01 + 10000) % 490);
      this.graphics.fillStyle(
        i % 3 === 0 ? 0xeeb976 : 0x92dace,
        0.14 + Math.sin(time * 0.001 + i) * 0.08,
      );
      this.graphics.fillCircle(x, y, i % 3 === 0 ? 1.5 : 1);
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
