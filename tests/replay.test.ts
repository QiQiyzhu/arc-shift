import { describe, it, expect, vi } from 'vitest';
import { Engine } from '../src/game/engine';
import { blankSave, type SaveData } from '../src/core/save';
import {
  ReplayRecorder,
  ReplayPlayer,
  canonical,
  checksum,
  importReplay,
  exportReplay,
  FIXED_DT,
  type Replay,
} from '../src/replay/replay';
import { stressInput } from '../src/dev/benchmark';
import { expedition, availableNodes } from '../src/rooms/expedition';
import { makeRoom } from '../src/rooms/generator';
import type { RoomKind } from '../src/game/types';
const isolated = () => new Engine({ save: blankSave(), persistence: false });
function verify(data: Replay) {
  const replay = new ReplayPlayer(exportReplay(data));
  while (!replay.finished && !replay.desync) replay.step();
  expect(replay.desync).toBeNull();
  expect(replay.finished).toBe(true);
  return replay;
}
function checkpoint(
  kind: RoomKind,
  phase: 'entry' | 'reward' | 'map' | 'event' = 'entry',
): SaveData {
  const e = isolated();
  e.start(513);
  e.chooseCard(e.world.rewards[0].id);
  if (kind === 'boss') {
    e.world.campaign = 'legacy';
    e.enter(makeRoom(4, 'boss', 513));
  } else {
    const graph = expedition(513),
      node = graph.find((n) => n.room.kind === kind)!;
    if (!node) throw Error('Missing fixture room');
    const path = (id: string): string[] => {
      const n = graph.find((n) => n.id === id)!;
      return n.depth === 1
        ? [id]
        : [...path(graph.find((p) => p.next.includes(id))!.id), id];
    };
    e.world.route = path(node.id);
    e.enter(node.room);
  }
  e.world.wallet = { coins: 100, keys: 3, bombs: 3, tonics: 1, shards: 8 };
  if (phase !== 'entry') e.world.phase = phase;
  if (phase === 'map' || phase === 'reward') e.world.eventDone = true;
  e.checkpoint();
  return structuredClone(e.save);
}
describe('deterministic QA replay', () => {
  it('round trips combat with Dash/Q/E and copies each catch-up input before mutation', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 73, blankSave(), 'new-run', 120);
    e.chooseCard(e.world.rewards[0].id);
    for (let tick = 0; tick < 721; tick++) {
      const input = stressInput(tick);
      e.update(FIXED_DT, input);
      input.dash = input.q = input.e = false;
    }
    const final = checksum(e),
      data = r.stop(),
      p = verify(data);
    expect(checksum(p.engine)).toBe(final);
    const inputs = data.events.filter((event) => event.kind === 'input');
    expect(inputs.some((event) => event.input.dash)).toBe(true);
    expect(inputs.some((event) => event.input.q)).toBe(true);
    expect(inputs.some((event) => event.input.e)).toBe(true);
    expect(
      data.events
        .filter((event) => event.kind === 'checksum')
        .map((x) => x.tick),
    ).toEqual([0, 120, 240, 360, 480, 600, 720, 721]);
  });
  it('replays Boss intro pause/resume and actual Boss behavior from a validated entry checkpoint', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 513, checkpoint('boss'), 'checkpoint');
    e.pause();
    for (let t = 0; t < 8; t++) e.update(FIXED_DT, stressInput(t));
    e.pause();
    expect(e.world.phase).toBe('bossIntro');
    for (let t = 0; t < 600; t++) e.update(FIXED_DT, stressInput(t));
    expect(e.world.room.kind).toBe('boss');
    expect(e.world.boss!.attackIndex).toBeGreaterThan(0);
    expect(checksum(verify(r.stop()).engine)).toBe(checksum(e));
  });
  it.each(['event', 'reward', 'map'] as const)(
    'handles %s checkpoint and ordered decisions before the first tick',
    (phase) => {
      const e = isolated(),
        r = new ReplayRecorder(e, 513, checkpoint('shop', phase), 'checkpoint');
      if (phase === 'reward') {
        e.reroll();
        e.chooseCard(e.world.rewards[0].id);
      }
      e.buy('bomb');
      e.bankShards();
      if (e.world.phase === 'event') e.resolveEvent('leave');
      const next = availableNodes(e.world.seed, e.world.room.nodeId!)[0];
      expect(next).toBeDefined();
      expect(e.travel(next.id)).toBe(true);
      const final = checksum(e),
        data = r.stop();
      expect(data.durationTicks).toBe(0);
      expect(checksum(verify(data).engine)).toBe(final);
    },
  );
  it.each(['key', 'bomb'] as const)(
    'records treasure %s spending and event choice',
    (method) => {
      const e = isolated(),
        r = new ReplayRecorder(
          e,
          513,
          checkpoint('treasure', 'event'),
          'checkpoint',
        );
      expect(e.openChest(method)).toBe(true);
      expect(e.resolveEvent('salvage')).toBe(true);
      expect(checksum(verify(r.stop()).engine)).toBe(checksum(e));
    },
  );
  it('isolates progression and never reads or writes browser storage during playback', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw Error('Must not read storage');
      }),
      setItem: vi.fn(() => {
        throw Error('Must not write storage');
      }),
    };
    vi.stubGlobal('localStorage', storage);
    try {
      const save = blankSave(),
        before = JSON.stringify(save),
        e = isolated(),
        r = new ReplayRecorder(e, 123, save);
      e.chooseCard(e.world.rewards[0].id);
      e.update(FIXED_DT, stressInput(0));
      verify(r.stop());
      expect(JSON.stringify(save)).toBe(before);
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('reports the first failing checkpoint when a legal input is tampered with', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 123);
    e.chooseCard(e.world.rewards[0].id);
    for (let t = 0; t < 240; t++) e.update(FIXED_DT, stressInput(t));
    const data = r.stop(),
      input = data.events.find((x) => x.kind === 'input' && x.tick === 100)!;
    if (input.kind === 'input') input.input.x = input.input.x === 1 ? -1 : 1;
    const p = new ReplayPlayer(data);
    while (!p.finished && !p.desync) p.step();
    expect(p.desync?.tick).toBe(120);
    expect(p.paused).toBe(true);
    expect(p.step()).toBe(false);
  });
  it('rejects incompatible versions, malformed streams, huge input and altered initial profiles', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 123);
    e.update(FIXED_DT, stressInput(0));
    const base = r.stop();
    const cases = [
      { ...base, version: 2 },
      { ...base, gameVersion: 'old' },
      { ...base, contentVersion: 'other' },
      { ...base, dt: 0.016 },
      { ...base, durationTicks: -1 },
      { ...base, seed: NaN },
      { ...base, events: base.events.slice(1) },
      {
        ...base,
        initial: {
          ...base.initial,
          save: { ...base.initial.save, version: 22 },
        },
      },
    ];
    for (const data of cases)
      expect(() => importReplay(JSON.stringify(data))).toThrow();
    const bad = structuredClone(base);
    const ev = bad.events.find((x) => x.kind === 'input')!;
    if (ev.kind === 'input') ev.input.aimX = 1e308;
    expect(() => importReplay(JSON.stringify(bad))).toThrow('Invalid input');
    expect(() => e.update(FIXED_DT, stressInput(0))).not.toThrow();
  });
  it('preserves Set order, pool allocation cursor and private pause state in canonical checksums', () => {
    expect(canonical({ b: 2, a: 1 })).toBe(canonical({ a: 1, b: 2 }));
    expect(canonical(new Set([1, 2]))).not.toBe(canonical(new Set([2, 1])));
    const a = isolated(),
      b = isolated();
    expect(checksum(a)).toBe(checksum(b));
    a.world.projectiles.acquire()!.active = false;
    expect(checksum(a)).not.toBe(checksum(b));
    expect(() => canonical({ x: Infinity })).toThrow();
  });
  it('rejects variable timesteps before advancing the simulation', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 123);
    expect(() => e.update(1 / 30, stressInput(0))).toThrow('actual fixed');
    expect(e.world.tick).toBe(0);
    verify(r.stop());
  });
  it('normalizes negative-zero seeds before recording', () => {
    const r = new ReplayRecorder(isolated(), -0);
    expect(Object.is(r.data.seed, -0)).toBe(false);
    verify(r.stop());
  });
  it('rejects checksum floods and malformed legacy room behavior references before boot', () => {
    const base = new ReplayRecorder(isolated(), 123).stop();
    const flood = {
      ...base,
      events: Array.from({ length: 200 }, () => base.events[0]),
    };
    expect(() => new ReplayPlayer(flood)).toThrow('Too many checksums');
    const data = new ReplayRecorder(
      isolated(),
      513,
      checkpoint('boss'),
      'checkpoint',
    ).stop();
    const bad = JSON.parse(JSON.stringify(data));
    bad.initial.save.checkpoint.room.bossKind = 'unknown';
    expect(() => importReplay(JSON.stringify(bad))).toThrow(
      'Invalid legacy room',
    );
  });
  it('checks command outcomes and retains intentionally rejected attempts', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 123);
    e.chooseCard('does-not-exist');
    const data = r.stop();
    verify(data);
    const command = data.events.find((ev) => ev.kind === 'command')!;
    if (command.kind === 'command') command.result = true;
    const p = new ReplayPlayer(data);
    expect(p.desync?.tick).toBe(0);
    expect(p.desync?.actual).toBe('command result false');
  });
  it('keeps long fractional-pointer recordings within their own export/import contract', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 123, blankSave(), 'new-run', 3600);
    const input = {
      x: 0,
      y: 0,
      aimX: 640.1234567890123,
      aimY: 360.1234567890123,
      fire: false,
      dash: false,
      q: false,
      e: false,
    };
    for (let tick = 0; tick < 108000; tick++) e.update(FIXED_DT, input);
    const raw = exportReplay(r.stop());
    expect(new TextEncoder().encode(raw).length).toBeLessThan(32 * 1024 * 1024);
    expect(importReplay(raw).durationTicks).toBe(108000);
  }, 15000);
  it('stops at the per-tick decision budget with a valid completed prefix', () => {
    const e = isolated(),
      r = new ReplayRecorder(e, 123);
    for (let i = 0; i < 100; i++) e.chooseCard('unavailable');
    expect(r.active).toBe(false);
    expect(r.data.events.filter((e) => e.kind === 'command')).toHaveLength(64);
    verify(r.stop());
  });
});
