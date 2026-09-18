import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { DISC_ERROR, discKernel, fillDisc, fillShadow } from '../src/render/discs';

function drawing(type: number) {
  return { scene: { game: { renderer: { type } } }, fillTriangle: vi.fn(), fillCircle: vi.fn(), fillEllipse: vi.fn() };
}
describe('bounded decorative geometry', () => {
  it('keeps chord error below the declared logical-pixel budget and reuses vertices', () => {
    for (let radius = 0.5; radius <= 600; radius += 0.5) {
      const p = discKernel(radius)!;
      expect(p).toBe(discKernel(radius));
      const n = p.length / 2 - 1;
      expect(radius * (1 - Math.cos(Math.PI / n))).toBeLessThanOrEqual(DISC_ERROR);
      expect(p.slice(-2)).toEqual(p.slice(0, 2));
    }
    expect(discKernel(100)).toBeDefined();
    expect(discKernel(10000)).toBeUndefined();
  });
  it('uses one shared centre and exactly matching edges in the WebGL fan', () => {
    const g = drawing(2);
    fillDisc(g as unknown as Phaser.GameObjects.Graphics, 20, 30, 8);
    const calls = g.fillTriangle.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < calls.length; i++) {
      expect(calls[i].slice(0, 2)).toEqual([20, 30]);
      expect(calls[i].slice(4, 6)).toEqual(calls[(i + 1) % calls.length].slice(2, 4));
    }
  });
  it('retains Canvas and oversized custom-content paths without translucent triangle seams', () => {
    const canvas = drawing(1), webgl = drawing(2);
    fillDisc(canvas as unknown as Phaser.GameObjects.Graphics, 1, 2, 5);
    fillShadow(canvas as unknown as Phaser.GameObjects.Graphics, 1, 2, 50, 10);
    fillShadow(webgl as unknown as Phaser.GameObjects.Graphics, 1, 2, 2000, 10);
    expect(canvas.fillTriangle).not.toHaveBeenCalled();
    expect(canvas.fillCircle).toHaveBeenCalledWith(1, 2, 5);
    expect(canvas.fillEllipse).toHaveBeenCalledWith(1, 2, 50, 10);
    expect(webgl.fillEllipse).toHaveBeenCalledWith(1, 2, 2000, 10);
  });
});
