import { describe, expect, it } from 'vitest';
import { Engine } from '../src/game/engine';
import { blankSave, parseSave } from '../src/core/save';
import { FieldGuide } from '../src/game/field-guide';
import { protocolPreview } from '../src/cards/preview';
import { deriveStats } from '../src/cards/system';
import { compositeSpriteMatte } from '../src/render/sprite-matte';
import { hudSignature } from '../src/ui/hud-signature';
import { ActionInput } from '../src/input/actions';
const input = {
  x: 0,
  y: 0,
  aimX: 760,
  aimY: 330,
  fire: false,
  dash: false,
  q: false,
  e: false,
};
describe('guided practice is isolated from the ongoing campaign', () => {
  it('walks through a real combat victory without changing a checkpoint or meta progression', () => {
    const engine = new Engine({ save: blankSave(), persistence: false });
    engine.start(97531);
    engine.chooseCard('fire-ember');
    const saved = JSON.stringify(engine.save);
    const guide = new FieldGuide();
    guide.start(engine);
    const w = engine.world;
    w.player.x += 100;
    guide.tick(engine);
    expect(guide.step).toBe('fire');
    w.totalDamage += 30;
    guide.tick(engine);
    expect(guide.step).toBe('dash');
    w.player.dashCd = 1;
    guide.tick(engine);
    expect(guide.step).toBe('pulse');
    w.player.qCd = 5;
    guide.tick(engine);
    expect(guide.step).toBe('forge');
    expect(w.phase).toBe('paused');
    expect(guide.choose(engine, 'bad')).toBe(false);
    engine.pause(); // A stray pause command must never invert the desired resume.
    expect(guide.choose(engine, 'plasma')).toBe(true);
    expect(guide.choose(engine, 'prism')).toBe(false);
    expect(w.phase).toBe('playing');
    expect(w.forms).toEqual(['sword', 'arc', 'cannon']);
    w.kills += 4;
    guide.tick(engine);
    expect(guide.step).toBe('boss');
    expect(w.boss?.kind).toBe('warden');
    w.phase = 'playing';
    w.enemies = [];
    engine.update(1 / 60, input);
    guide.tick(engine);
    expect(guide.step).toBe('complete');
    expect(w.phase).toBe('victory');
    expect(JSON.stringify(engine.save)).toBe(saved);
    guide.stop();
    expect(engine.resume()).toBe(true);
    expect(engine.world.seed).toBe(97531);
  });
  it('disposes the guide when the world changes and pauses advancement with settings', () => {
    const engine = new Engine({ persistence: false }),
      guide = new FieldGuide();
    guide.start(engine);
    engine.pause();
    engine.world.player.x += 100;
    guide.tick(engine);
    expect(guide.step).toBe('move');
    engine.startPractice([]);
    guide.tick(engine);
    expect(guide.active).toBe(false);
  });
});
it('protocol previews include tradeoffs and conditional same-element thresholds', () => {
  const engine = new Engine({ persistence: false }),
    w = engine.world;
  const split = protocolPreview(w, 'fire-split');
  expect(split.changes.find((c) => c.label === '基础伤害')?.benefit).toBe(
    false,
  );
  expect(split.changes.find((c) => c.label === '发射数')?.benefit).toBe(true);
  w.cards = ['fire-split', 'fire-meteor'];
  expect(protocolPreview(w, 'fire-bloom').threshold).toContain('还需');
  const enabled = protocolPreview(w, 'fire-ember');
  expect(enabled.threshold).toContain('+4');
  w.cards = ['fire-ember'];
  w.stats = deriveStats(w.cards);
  expect(protocolPreview(w, 'storm-arc').active.map((s) => s.id)).toContain(
    'plasma',
  );
  expect(protocolPreview(w, 'void-return').tradeoff).toContain('不会重复命中');
  w.weapon = 'cannon';
  const meteor = protocolPreview(w, 'fire-meteor');
  expect(meteor.tradeoff).toContain('更重、更慢');
  expect(meteor.tradeoff).toContain('重炮再应用');
  expect(meteor.changes.some((c) => c.label === '协议基础间隔')).toBe(true);
});
it('preserves old save/replay settings shape and normalizes new optional display settings', () => {
  const old = blankSave();
  expect(parseSave(JSON.stringify(old))).toEqual(old);
  old.settings.focusedEffects = true;
  expect(parseSave(JSON.stringify(old)).settings.focusedEffects).toBe(true);
  expect(
    parseSave(
      JSON.stringify({
        ...old,
        settings: { ...old.settings, focusedEffects: 'true' },
      }),
    ).settings.focusedEffects,
  ).toBeUndefined();
});
it('chroma matte removes green while keeping cloth and masks', () => {
  const data = new Uint8ClampedArray([
    0, 255, 0, 255, 10, 120, 150, 255, 245, 245, 235, 255,
  ]);
  compositeSpriteMatte(data);
  expect(data[3]).toBe(0);
  expect(data[7]).toBe(255);
  expect(data[11]).toBe(255);
});
it('HUD invalidates when an ability becomes usable even if its rounded time is unchanged', () => {
  const e = new Engine({ persistence: false }),
    controls = new ActionInput();
  e.world.player.dashCd = 0.04;
  e.world.bombCd = 0.04;
  const before = hudSignature(e, controls, '');
  e.world.player.dashCd = 0;
  expect(hudSignature(e, controls, '')).not.toBe(before);
  const dashReady = hudSignature(e, controls, '');
  e.world.bombCd = 0;
  expect(hudSignature(e, controls, '')).not.toBe(dashReady);
});
