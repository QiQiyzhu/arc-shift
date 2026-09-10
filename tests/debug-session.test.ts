import { expect, it } from 'vitest';
import { DebugSession, neutralInput } from '../src/dev/debug-session';
import { checksum } from '../src/replay/replay';
it('pause does not advance and single step is exactly one neutral tick', () => {
  const d = new DebugSession();
  for (let n = 0; n < 10; n++) d.advance({ ...neutralInput(), dash: true });
  expect(d.engine.world.tick).toBe(0);
  d.singleStep(); expect(d.engine.world.tick).toBe(1);
  expect(d.engine.world.player.dashCd).toBe(0);
  expect(d.paused).toBe(true);
});
it('slow motion retains edges until the next fixed tick and pause clears pending edges', () => {
  const d = new DebugSession(); d.speed = .25; d.paused = false;
  d.engine.world.phase = 'playing';
  d.advance({ ...neutralInput(), dash: true });
  d.advance(neutralInput()); d.advance(neutralInput());
  expect(d.engine.world.tick).toBe(0);
  d.advance(neutralInput());
  expect(d.engine.world.tick).toBe(1);
  expect(d.engine.world.player.dashCd).toBeGreaterThan(0);
  const other = new DebugSession(); other.speed = .25; other.paused = false;
  other.engine.world.phase = 'playing';
  other.advance({ ...neutralInput(), dash: true }); other.paused = true; other.advance(neutralInput()); other.paused = false;
  for (let i = 0; i < 4; i++) other.advance(neutralInput());
  expect(other.engine.world.player.dashCd).toBe(0);
});
it('2x advances two fixed ticks while consuming a bomb edge once', () => {
  const d = new DebugSession(); d.speed = 2; d.paused = false;
  d.engine.world.phase = 'playing';
  d.engine.world.wallet.bombs = 3;
  d.advance({ ...neutralInput(), bomb: true });
  expect(d.engine.world.tick).toBe(2);
  expect(d.engine.world.wallet.bombs).toBe(2);
  expect(d.engine.world.bombs).toHaveLength(1);
});
it('diagnostics do not alter simulation checksums; manual commands validate and cap entities', () => {
  const d = new DebugSession(), before = checksum(d.engine);
  for (let i = 0; i < 300; i++) d.frame(16);
  expect(d.frames).toHaveLength(120); expect(d.stats.fps).toBe(62.5);
  expect(checksum(d.engine)).toBe(before);
  expect(d.grant('unknown')).toBe(false);
  expect(d.grant('ice-shell')).toBe(true); expect(d.grant('ice-shell')).toBe(false);
  expect(d.engine.world.player.maxHp).toBe(160);
  expect(d.setWeapon('sword')).toBe(true);
  expect(d.setWeapon('unknown' as 'arc')).toBe(false);
  for (let i = 0; i < 300; i++) expect(d.spawn('hunter')).toBe(true);
  expect(d.spawn('warden')).toBe(false);
  expect(d.spawn('toString' as 'hunter')).toBe(false);
});
