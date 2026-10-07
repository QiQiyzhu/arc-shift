import { parseSave, type SaveData } from './save';

const FORMAT = 'arc-shift-backup';
export const MAX_BACKUP_BYTES = 512 * 1024;

/** Export the last safe campaign checkpoint, never an in-flight combat frame. */
export function exportSave(save: SaveData): string {
  return JSON.stringify({ format: FORMAT, version: 1, save }, null, 2);
}

// JSON object order is irrelevant. Depth is bounded before traversing a supplied
// backup; a malformed file must not overflow the stack during validation.
function sameData(input: unknown, normalized: unknown, depth = 0): boolean {
  if (input === normalized) return true;
  if (
    depth > 32 ||
    !input ||
    !normalized ||
    typeof input !== 'object' ||
    typeof normalized !== 'object'
  )
    return false;
  if (Array.isArray(input) || Array.isArray(normalized)) {
    return (
      Array.isArray(input) &&
      Array.isArray(normalized) &&
      input.length === normalized.length &&
      input.every((item, index) => sameData(item, normalized[index], depth + 1))
    );
  }
  const left = input as Record<string, unknown>;
  const right = normalized as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) && sameData(left[key], right[key], depth + 1),
    )
  );
}

/** Unlike loadSave's forgiving startup migration, an import must be recognizable
 * and retain its checkpoint. A damaged file must never silently erase a run. */
export function importSave(raw: string): SaveData {
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES)
    throw new Error('backup-too-large');
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('invalid-backup');
  const envelope = data as Record<string, unknown>;
  if (envelope.format !== FORMAT || envelope.version !== 1)
    throw new Error('invalid-backup');
  const candidate = envelope.save;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    throw new Error('invalid-save');
  const value = candidate as Record<string, unknown>;
  if (
    value.version !== 1 ||
    !value.meta ||
    !value.settings ||
    typeof value.meta !== 'object' ||
    Array.isArray(value.meta) ||
    typeof value.settings !== 'object' ||
    Array.isArray(value.settings) ||
    !Object.hasOwn(value, 'checkpoint')
  )
    throw new Error('invalid-save');
  const meta = value.meta as Record<string, unknown>;
  for (const key of [
    'runs',
    'wins',
    'bestRoom',
    'bestTime',
    'totalKills',
    'shards',
  ]) {
    if (
      typeof meta[key] !== 'number' ||
      !Number.isFinite(meta[key]) ||
      meta[key] < 0
    )
      throw new Error('invalid-progress');
  }
  const result = parseSave(JSON.stringify(candidate));
  if (value.checkpoint !== null && !result.checkpoint)
    throw new Error('invalid-checkpoint');
  // The new backup format always contains the complete exported shape. Unlike
  // legacy local saves, imports may not silently drop unlocks or reset upgrades.
  if (!sameData(candidate, JSON.parse(JSON.stringify(result))))
    throw new Error('invalid-save-data');
  return result;
}
