import Phaser from 'phaser';
import { Engine } from './engine';
import { Effects } from '../effects/particles';
import { drawArena } from '../render/arena';
import { drawActors } from '../render/actors';
import { drawTelegraph } from '../render/telegraphs';
import { strokeRing } from '../render/discs';
import { drawTerrainStatic, drawTerrainZones } from '../render/terrain';
import { ActorSprites } from '../render/actor-sprites';
import { ProjectileSprites } from '../render/projectile-sprites';
import type { Input } from './types';
import { ActionInput, type PadSnapshot } from '../input/actions';
import { loadBindings } from '../input/bindings';
import { ARC_PALETTE, drawDangerSeal } from '../effects/arcane';
export class ArcScene extends Phaser.Scene {
  engine: Engine;
  effects!: Effects;
  floor!: Phaser.GameObjects.Image;
  graphics!: Phaser.GameObjects.Graphics;
  cueGraphics!: Phaser.GameObjects.Graphics;
  terrainGraphics!: Phaser.GameObjects.Graphics;
  private actors?: ActorSprites;
  private bullets?: ProjectileSprites;
  private terrainImage?: Phaser.GameObjects.Image;
  private terrainOwner?: object;
  private worldOwner?: object;
  readonly renderMetrics = {
    frames: 0,
    terrainBuilds: 0,
    simulateMs: 0,
    presentationMs: 0,
    droppedMs: 0,
  };
  get displayMetrics() {
    return {
      ...this.renderMetrics,
      actorImages: this.actors?.count || 0,
      bulletImages: this.bullets?.count || 0,
      burstImages: this.effects?.bursts.count || 0,
      signatureEffects: this.effects?.signatures.pool.count || 0,
      decorativeParticles: this.effects?.particles.count || 0,
      children: this.children?.length || 0,
    };
  }
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
  pauseBlocked = false;
  /** Used only by the development QA page; production always owns its loop. */
  externalSimulation?: (dt: number, input: Input) => void;
  /** Trusted product controller; unlike the DEV debugger, focus still pauses it. */
  simulationDriver?: (dt: number, input: Input) => void;
  onTick: () => void = () => {};
  onReady: () => void = () => {};
  onSuspend: () => void = () => {};
  reducedMotion = false;
  arenaSkin?: 'observatory';
  release = () => {
    this.effects?.dispose();
    this.actors?.dispose();
    this.actors = undefined;
    this.bullets?.dispose();
    this.bullets = undefined;
    this.terrainImage?.destroy();
    this.terrainImage = undefined;
    if (this.textures?.exists('terrain-cache-v3'))
      this.textures.remove('terrain-cache-v3');
    this.terrainOwner = this.worldOwner = undefined;
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
    if (this.arenaSkin && this.textures.exists(this.arenaSkin))
      return this.arenaSkin;
    if (this.textures.exists(`${biome}-v23`)) return `${biome}-v23`;
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
    if (this.arenaSkin)
      this.load.image('observatory', '/art/observatory-v3.webp');
    this.load.image('actors-chroma-v2', '/art/actors-source-v2.png');
    this.load.image('guardian-v2', '/art/guardian-v2.webp');
    this.load.image('sanctum', '/art/sanctum.webp');
    this.load.image('grove', '/art/grove.webp');
    this.load.image('foundry', '/art/foundry.webp');
    this.load.image('sanctum-v23', '/art/sanctum-v23.webp');
    this.load.image('grove-v23', '/art/grove-v23.webp');
    this.load.image('foundry-v23', '/art/foundry-v23.webp');
  }
  create() {
    this.floor = this.add
      .image(0, 0, this.arenaTexture())
      .setOrigin(0)
      .setDisplaySize(1280, 720)
      .setDepth(0);
    this.terrainGraphics = this.add.graphics().setDepth(1);
    this.terrainImage = this.add
      .image(0, 0, '__DEFAULT')
      .setOrigin(0)
      .setDepth(0.9)
      .setVisible(false);
    this.graphics = this.add.graphics().setDepth(3);
    // Functional warnings outrank bloom and projectiles; floating text is depth8.
    this.cueGraphics = this.add.graphics().setDepth(6);
    this.actors = new ActorSprites(this);
    this.bullets = new ProjectileSprites(this);
    this.effects = new Effects(
      this,
      () => this.engine.save.settings.language ?? 'zh',
    );
    this.input.mouse!.disableContextMenu();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.unsubscribe = this.engine.world.bus.on((e) => {
      this.effects.reduced =
        this.reducedMotion || this.engine.save.settings.focusedEffects === true;
      const player = this.engine.world.player;
      const angle =
        e.kind === 'dash' &&
        e.color !== 0xaec7ff &&
        Math.hypot(player.vx, player.vy) > 1
          ? Math.atan2(player.vy, player.vx)
          : player.angle;
      this.effects.emit(e, angle);
      const feedback = this.effects.signatures.cameraFeedback(
        e,
        this.effects.reduced,
      );
      if (feedback)
        this.cameras.main.shake(feedback.duration, feedback.strength);
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
    const begin = performance.now();
    const dt = Math.min(delta / 1000, 0.05);
    this.renderMetrics.droppedMs += Math.max(0, delta - 50);
    const w = this.engine.world;
    const p = this.input.activePointer;
    let pad: PadSnapshot | null = null;
    try {
      const pads = navigator.getGamepads?.() || [];
      for (let i = 0; i < pads.length; i++)
        if (pads[i]?.connected && pads[i]?.mapping === 'standard') {
          pad = pads[i];
          break;
        }
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
      !this.pauseBlocked &&
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
      else if (this.simulationDriver) this.simulationDriver(1 / 60, input);
      else this.engine.update(1 / 60, input);
      input.dash = input.q = input.e = input.bomb = input.heal = false;
      this.actions.consumeStep();
      this.accumulator -= 1 / 60;
    }
    this.renderMetrics.simulateMs = performance.now() - begin;
    const drawBegin = performance.now();
    this.effects.reduced =
      this.reducedMotion || this.engine.save.settings.focusedEffects === true;
    const stamp = `${w.seed}-${w.room.index}-${w.room.template}-${w.room.biome}`;
    if (
      stamp !== this.stamp ||
      this.worldOwner !== w ||
      this.terrainOwner !== w.terrain
    ) {
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
      this.worldOwner = w;
      this.terrainOwner = w.terrain;
      this.terrainImage?.setTexture('__DEFAULT');
      if (this.textures.exists('terrain-cache-v3'))
        this.textures.remove('terrain-cache-v3');
      const source = this.make.graphics({ x: 0, y: 0 }, false);
      drawTerrainStatic(source, w);
      source.lineStyle(1, 0xd6b47c, 0.25);
      source.strokeRoundedRect(76, 100, 1128, 532, 14);
      source.generateTexture('terrain-cache-v3', 1280, 720);
      source.destroy();
      this.terrainImage?.setTexture('terrain-cache-v3').setVisible(true);
      this.renderMetrics.terrainBuilds++;
    }
    this.graphics.clear();
    this.cueGraphics.clear();
    this.terrainGraphics.clear();
    drawTerrainZones(this.terrainGraphics, w);
    for (let i = 0; i < (this.effects.reduced ? 0 : 20); i++) {
      const x = 90 + ((i * 193 + time * 0.006) % 1100),
        y = 120 + ((i * 117 - time * 0.01 + 10000) % 490);
      this.graphics.fillStyle(
        i % 3 === 0 ? 0xeeb976 : 0x92dace,
        0.14 + Math.sin(time * 0.001 + i) * 0.08,
      );
      this.graphics.fillCircle(x, y, i % 3 === 0 ? 1.5 : 1);
    }
    const illustrated =
      this.actors?.update(w, time / 1000, dt, this.effects.reduced) || false;
    const hostileSprites =
      this.bullets?.update(w, this.effects.reduced) || false;
    drawActors(
      this.graphics,
      this.engine.world,
      time / 1000,
      illustrated,
      hostileSprites,
      this.effects.reduced,
    );
    this.effects.draw(this.graphics, dt);
    // Enemy intent is the final overlay pass, above friendly trails and bursts.
    const cues = this.cueGraphics;
    for (const enemy of w.enemies)
      drawTelegraph(cues, enemy, time / 1000, this.effects.reduced);
    for (const hazard of w.hazards)
      if (!hazard.friendly) {
        drawDangerSeal(
          cues,
          hazard.x,
          hazard.y,
          hazard.r,
          1 - hazard.time / hazard.duration,
          this.effects.reduced,
        );
      }
    if (w.phase === 'playing') {
      // A stable contact ring locates the player even inside a full resonance burst.
      strokeRing(cues, w.player.x, w.player.y, 18, ARC_PALETTE.ink, 0.95, 5);
      strokeRing(
        cues,
        w.player.x,
        w.player.y,
        18,
        ARC_PALETTE.ivory,
        0.95,
        1.5,
      );
      cues.lineStyle(2, ARC_PALETTE.ally, 0.95);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        cues.lineBetween(
          w.player.x + Math.cos(a) * 21,
          w.player.y + Math.sin(a) * 21,
          w.player.x + Math.cos(a) * 25,
          w.player.y + Math.sin(a) * 25,
        );
      }
      cues.fillStyle(ARC_PALETTE.ivory, 1);
      cues.fillCircle(w.player.x, w.player.y, 2.5);
      cues.lineStyle(1, ARC_PALETTE.ally, 0.8);
      cues.strokeCircle(input.aimX, input.aimY, 9);
      cues.lineBetween(input.aimX - 14, input.aimY, input.aimX - 5, input.aimY);
      cues.lineBetween(input.aimX + 5, input.aimY, input.aimX + 14, input.aimY);
    }
    this.renderMetrics.presentationMs = performance.now() - drawBegin;
    this.renderMetrics.frames++;
    this.onTick();
  }
}
