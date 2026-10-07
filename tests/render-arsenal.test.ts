import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import type { World } from '../src/game/world';
import { drawSwordArc } from '../src/render/arsenal';

function graphics() {
  const arc = vi.fn();
  const g = {
    lineStyle: vi.fn(),
    beginPath: vi.fn(),
    arc,
    strokePath: vi.fn(),
    fillStyle: vi.fn(),
    fillPoints: vi.fn(),
    lineBetween: vi.fn(),
  } as unknown as Phaser.GameObjects.Graphics;
  return { g, arc };
}

function world() {
  return {
    swing: {
      x: 640,
      y: 410,
      angle: 0,
      age: 0.12,
      range: 90,
      arc: 1.2,
      combo: 1,
    },
    stats: { primary: 0xa7e7dc, accent: 0xffdf9e },
  } as unknown as World;
}

it('keeps sword after-images out of reduced-motion rendering', () => {
  const full = graphics();
  drawSwordArc(full.g, world());
  const reduced = graphics();
  drawSwordArc(reduced.g, world(), true);
  expect(full.arc).toHaveBeenCalledTimes(6);
  expect(reduced.arc).toHaveBeenCalledTimes(4);
});
