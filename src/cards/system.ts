import { Random } from '../core/math';
import { baseStats } from '../combat/rules';
import type { Stats, Element } from '../game/types';
import { CARDS } from './catalog';
import { DEFAULT_CONTENT, type ContentPack } from '../content/schema';
import { SYNERGIES } from './synergies';
export function buildCounts(ids: readonly string[]): Record<Element, number> {
  const counts = { fire: 0, storm: 0, frost: 0, void: 0, shift: 0 };
  for (const id of ids) {
    const c = CARDS.find((c) => c.id === id);
    if (c) counts[c.element]++;
  }
  return counts;
}
export function deriveStats(
  ids: readonly string[],
  level = 1,
  relics: readonly string[] = [],
  content: ContentPack = DEFAULT_CONTENT,
): Stats {
  const n = (id: string, key: string) => content.cards.find(row => row.id === id)!.params[key];
  const s = baseStats(),
    has = (id: string) => ids.includes(id);
  s.damage += (level - 1) * 1.5;
  if (has('fire-ember')) s.burn = n('fire-ember', 'burn');
  if (has('fire-fuel')) s.burn = n('fire-fuel', 'burn');
  if (has('fire-split')) {
    s.projectiles = n('fire-split', 'projectiles');
    s.damage *= n('fire-split', 'damage');
  }
  if (has('fire-blast')) s.explosion = n('fire-blast', 'explosion');
  if (has('storm-arc')) s.chain = n('storm-arc', 'chain');
  if (has('storm-conduct')) s.chain += n('storm-conduct', 'chain');
  if (has('storm-critical')) s.crit += n('storm-critical', 'crit');
  if (has('storm-surge')) s.rate *= n('storm-surge', 'rate');
  if (has('storm-needle')) s.pierce += n('storm-needle', 'pierce');
  if (has('ice-touch') || has('shift-ice')) s.slow = n(has('ice-touch') ? 'ice-touch' : 'shift-ice', 'slow');
  if (has('ice-pierce')) {
    s.pierce += n('ice-pierce', 'pierce');
    s.damage += n('ice-pierce', 'damage');
  }
  if (has('ice-prism')) s.bounce = n('ice-prism', 'bounce');
  if (has('void-seek')) s.homing = n('void-seek', 'homing');
  if (has('void-leech')) s.lifesteal = n('void-leech', 'lifesteal');
  if (has('void-singularity')) s.eCooldown *= n('void-singularity', 'eCooldown');
  if (has('void-echo')) {
    s.qCooldown *= n('void-echo', 'qCooldown');
    s.damage += n('void-echo', 'damage');
  }
  if (has('shift-quick')) s.dashCooldown *= n('shift-quick', 'dashCooldown');
  if (has('shift-stride')) s.speed *= n('shift-stride', 'speed');
  if (has('fire-meteor')) {
    s.shotSize = n('fire-meteor', 'shotSize');
    s.shotSpeed *= n('fire-meteor', 'shotSpeed');
    s.damage *= n('fire-meteor', 'damage');
    s.rate *= n('fire-meteor', 'rate');
  }
  if (has('fire-bloom')) s.fragment = n('fire-bloom', 'fragment');
  if (has('storm-lance')) {
    s.lance = true;
    s.shotSpeed *= n('storm-lance', 'shotSpeed');
    s.pierce += n('storm-lance', 'pierce');
    s.rate *= n('storm-lance', 'rate');
    s.damage *= n('storm-lance', 'damage');
  }
  if (has('storm-familiar')) s.familiar = true;
  if (has('frost-wave')) s.wave = n('frost-wave', 'wave');
  if (has('frost-fan')) {
    s.projectiles += n('frost-fan', 'projectiles');
    s.damage *= n('frost-fan', 'damage');
  }
  if (has('void-orbit')) {
    s.orbit = true;
    s.pierce += n('void-orbit', 'pierce');
    s.rate *= n('void-orbit', 'rate');
  }
  if (has('void-return')) {
    s.returning = true;
    s.damage *= n('void-return', 'damage');
  }
  if (has('shift-rear')) s.rear = true;
  const colors = {
    fire: 0xffa85c,
    storm: 0xc2a2ff,
    frost: 0x8ce6ff,
    void: 0xd997fa,
    shift: 0xd0ed9e,
  };
  const counts = buildCounts(ids);
  const elements = (Object.keys(counts) as Element[])
    .filter((el) => counts[el] > 0)
    .sort((a, b) => counts[b] - counts[a]);
  s.element = elements[0] || 'shift';
  s.primary = colors[s.element];
  s.accent = elements[1] ? colors[elements[1]] : 0xf0ffed;
  const c = buildCounts(ids);
  if (c.fire >= 3 && s.burn) s.burn += 4;
  if (c.storm >= 3 && s.chain) s.chain++;
  if (c.frost >= 3 && s.slow) s.slow += 0.1;
  if (c.void >= 3) s.eCooldown *= 0.8;
  if (c.shift >= 3) s.damage += 4;
  if (relics.includes('hourglass')) s.dashCooldown *= 0.85;
  if (relics.includes('oracle-eye')) s.crit += 0.12;
  return s;
}
export function rewardChoices(
  ids: readonly string[],
  seed: number,
  room: number,
  initial = false,
  elite = false,
  content: ContentPack = DEFAULT_CONTENT,
) {
  if (initial)
    return ['fire-ember', 'storm-arc', 'ice-touch'].map((id) =>
      CARDS.find((c) => c.id === id)!,
    );
  const rng = new Random(seed + room * 7247);
  const pool = CARDS.filter(
    (c) =>
      !ids.includes(c.id) &&
      (!content.cards.find(row => row.id === c.id)!.requires || ids.includes(content.cards.find(row => row.id === c.id)!.requires!)),
  );
  const counts = buildCounts(ids);
  const preferred = rng.shuffle(pool.filter((c) => counts[c.element] > 0));
  const rest = rng.shuffle(pool);
  const bridges = rng.shuffle(
    pool.filter((c) =>
      SYNERGIES.some(
        (s) =>
          s.requires.some((id) => id === c.id) &&
          s.requires.some((id) => ids.includes(id)),
      ),
    ),
  );
  const results = bridges.slice(0, 1);
  for (const c of preferred)
    if (results.length < 2 && !results.includes(c)) results.push(c);
  for (const c of rest)
    if (results.length < 3 && !results.includes(c)) results.push(c);
  if (elite && !results.some((c) => c.rarity !== 'common')) {
    const rare = rest.find((c) => c.rarity !== 'common');
    if (rare) results[0] = rare;
  }
  return rng.shuffle(results);
}
