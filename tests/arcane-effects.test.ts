import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import type { EffectEvent } from '../src/core/events';
import {
  ARC_PALETTE,
  ArcaneSignatures,
  drawDangerSeal,
  effectColor,
  hostileEffect,
  VFX_BUDGET,
} from '../src/effects/arcane';

const event = (overrides: Partial<EffectEvent> = {}): EffectEvent => ({
  kind: 'skill',
  x: 0,
  y: 0,
  color: 0x8cf1dc,
  amount: 80,
  ...overrides,
});

describe('arcane presentation safety', () => {
  it('keeps hostile shared skill events distinct without treating hits on enemy positions as hostile', () => {
    for (const color of [0xff7189, 0xa5eb93, 0x9edfc9]) {
      expect(hostileEffect(event({ color }))).toBe(true);
      expect(effectColor(event({ color }))).toBe(ARC_PALETTE.danger);
    }
    expect(hostileEffect(event({ kind: 'dash', color: 0xaec7ff }))).toBe(true);
    expect(hostileEffect(event({ kind: 'hit', color: 0xff7189 }))).toBe(false);
    expect(hostileEffect(event({ color: 0xff7189, reaction: 'test' }))).toBe(
      false,
    );
    expect(hostileEffect(event({ color: 0xff7189, x2: 12, y2: 30 }))).toBe(
      false,
    );
    expect(effectColor(event({ kind: 'crit' }))).toBe(ARC_PALETTE.empowered);
  });

  it('bounds accents during event storms and releases them without advancing world state', () => {
    const signatures = new ArcaneSignatures();
    const random = vi.spyOn(Math, 'random');
    for (let i = 0; i < 2000; i++)
      signatures.emit(event({ x: i * 30 }), 0, false);
    expect(signatures.pool.count).toBe(VFX_BUDGET.signatures);
    expect(signatures.dropped).toBeGreaterThan(0);
    signatures.advance(1 / 60, true);
    expect(signatures.pool.count).toBe(VFX_BUDGET.reducedSignatures);
    for (let i = 0; i < 40; i++) signatures.advance(1 / 60, true);
    expect(signatures.pool.count).toBe(0);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it('coalesces same-target accents and removes dash wakes immediately in reduced mode', () => {
    const signatures = new ArcaneSignatures();
    signatures.emit(event({ kind: 'crit' }), 0, false);
    signatures.emit(event({ kind: 'impact', x: 4 }), 0, false);
    signatures.emit(event({ kind: 'dash', x: 100 }), 0, false);
    signatures.emit(event({ kind: 'dash', x: 130 }), 0, false);
    expect(signatures.pool.count).toBe(2);
    signatures.advance(0, true);
    expect(signatures.pool.count).toBe(1);
    expect(
      signatures.pool.items.some((item) => item.active && item.kind === 'wake'),
    ).toBe(false);
    signatures.clear();
    expect(signatures.pool.count).toBe(0);
  });

  it('prevents sustained camera shake and disables it for focused or reduced effects', () => {
    const signatures = new ArcaneSignatures();
    expect(signatures.cameraFeedback(event({ kind: 'impact' }), false)).toEqual(
      { duration: 45, strength: 0.0007 },
    );
    for (let i = 0; i < 20; i++)
      expect(
        signatures.cameraFeedback(event({ kind: 'hurt' }), false),
      ).toBeNull();
    signatures.advance(0.1, false);
    signatures.advance(0.1, false);
    expect(signatures.cameraFeedback(event({ kind: 'hurt' }), true)).toBeNull();
    expect(
      signatures.cameraFeedback(event({ kind: 'crit' }), false),
    ).toBeNull();
    expect(
      signatures.cameraFeedback(event({ kind: 'hurt' }), false)?.strength,
    ).toBeLessThanOrEqual(0.0022);
  });

  it('retains the exact threat radius and cross-shaped danger cue with reduced motion', () => {
    for (const reduced of [false, true]) {
      const g = {
        scene: { game: { renderer: { type: 1 } } },
        lineStyle: vi.fn(),
        strokeCircle: vi.fn(),
        lineBetween: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        strokePath: vi.fn(),
      };
      drawDangerSeal(
        g as unknown as Phaser.GameObjects.Graphics,
        300,
        400,
        74,
        0.5,
        reduced,
      );
      expect(g.strokeCircle.mock.calls).toEqual([
        [300, 400, 74],
        [300, 400, 74],
      ]);
      expect(g.lineBetween).toHaveBeenCalledWith(294, 394, 306, 406);
      expect(g.lineBetween).toHaveBeenCalledWith(294, 406, 306, 394);
      expect(g.arc.mock.calls.length).toBe(reduced ? 0 : 1);
    }
  });
});
