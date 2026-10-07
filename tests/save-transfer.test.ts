import { describe, expect, it } from 'vitest';
import { blankSave } from '../src/core/save';
import {
  exportSave,
  importSave,
  MAX_BACKUP_BYTES,
} from '../src/core/save-transfer';
import { Engine } from '../src/game/engine';

describe('portable campaign backup', () => {
  it('round-trips a real checkpoint, camp progress and settings without changing the original', () => {
    const engine = new Engine({ persistence: false, save: blankSave() });
    engine.start(31415);
    engine.chooseCard(engine.world.rewards[0].id);
    engine.save.settings.language = 'en';
    engine.save.meta.shards = 42;
    engine.save.meta.preparation = { vitality: 3, flask: 2, stipend: 1 };
    const before = structuredClone(engine.save);
    const restored = importSave(exportSave(engine.save));
    expect(restored).toEqual(before);
    expect(restored.checkpoint?.seed).toBe(31415);
    expect(engine.save).toEqual(before);
  });
  it('rejects a corrupt checkpoint instead of silently dropping the active run', () => {
    const engine = new Engine({ persistence: false, save: blankSave() });
    engine.start(31415);
    engine.chooseCard(engine.world.rewards[0].id);
    const payload = JSON.parse(exportSave(engine.save));
    payload.save.checkpoint.room.nodeId = 'nonexistent';
    expect(() => importSave(JSON.stringify(payload))).toThrow(
      'invalid-checkpoint',
    );
  });
  it('accepts a valid backup without an active campaign', () => {
    expect(importSave(exportSave(blankSave()))).toEqual(blankSave());
  });
  it.each([
    '{}',
    'null',
    'invalid json',
    JSON.stringify({ format: 'other-game', version: 1, save: blankSave() }),
  ])('rejects foreign files: %s', (raw) => {
    expect(() => importSave(raw)).toThrow();
  });
  it('rejects unsupported versions and damaged progress', () => {
    const payload = JSON.parse(exportSave(blankSave()));
    payload.version = 2;
    expect(() => importSave(JSON.stringify(payload))).toThrow('invalid-backup');
    payload.version = 1;
    payload.save.meta.shards = '42';
    expect(() => importSave(JSON.stringify(payload))).toThrow(
      'invalid-progress',
    );
  });
  it('bounds file size before parsing', () => {
    expect(() => importSave(' '.repeat(MAX_BACKUP_BYTES + 1))).toThrow(
      'backup-too-large',
    );
  });
  it.each([
    'preparation',
    'unlocked',
    'bosses',
    'lore',
    'enemies',
    'discovered',
  ])('rejects missing progression field %s instead of resetting it', (key) => {
    const payload = JSON.parse(exportSave(blankSave()));
    delete payload.save.meta[key];
    expect(() => importSave(JSON.stringify(payload))).toThrow(
      'invalid-save-data',
    );
  });
  it('rejects malformed upgrades, unknown unlocks and unsupported settings', () => {
    for (const mutate of [
      (save: ReturnType<typeof blankSave>) => {
        save.meta.preparation.vitality = -1;
      },
      (save: ReturnType<typeof blankSave>) => {
        save.meta.unlocked = ['unknown-relic'];
      },
      (save: ReturnType<typeof blankSave>) => {
        save.settings.music = 5;
      },
      (save: ReturnType<typeof blankSave>) => {
        delete save.settings.language;
      },
    ]) {
      const save = blankSave();
      mutate(save);
      expect(() => importSave(exportSave(save))).toThrow('invalid-save-data');
    }
  });
  it('accepts JSON key reordering', () => {
    const save = blankSave();
    const payload = JSON.parse(exportSave(save));
    payload.save.meta = Object.fromEntries(
      Object.entries(payload.save.meta).reverse(),
    );
    expect(importSave(JSON.stringify(payload))).toEqual(save);
  });
});
