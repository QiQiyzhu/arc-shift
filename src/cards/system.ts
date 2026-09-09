import { Random } from '../core/math';
import { baseStats } from '../combat/rules';
import type { Stats, Element } from '../game/types';
import { CARDS, REQUIREMENTS } from './catalog';
import { SYNERGIES } from './synergies';
export function buildCounts(ids: readonly string[]): Record<Element, number> {
  const counts = { fire: 0, storm: 0, frost: 0, void: 0, shift: 0 };
  for (const id of ids) {
    const c = CARDS.find((c) => c.id === id);
    if (c) counts[c.element]++;
  }
  return counts;
}
export function deriveStats(ids: readonly string[], level = 1): Stats {
  const s = baseStats(),
    has = (id: string) => ids.includes(id);
  s.damage += (level - 1) * 1.5;
  if (has('fire-ember')) s.burn = 8;
  if (has('fire-fuel')) s.burn = 18;
  if (has('fire-split')) {
    s.projectiles = 3;
    s.damage *= 0.75;
  }
  if (has('fire-blast')) s.explosion = 1;
  if (has('storm-arc')) s.chain = 2;
  if (has('storm-conduct')) s.chain += 2;
  if (has('storm-critical')) s.crit += 0.22;
  if (has('storm-surge')) s.rate *= 0.78;
  if (has('storm-needle')) s.pierce += 2;
  if (has('ice-touch') || has('shift-ice')) s.slow = 0.35;
  if (has('ice-pierce')) {
    s.pierce++;
    s.damage += 4;
  }
  if (has('ice-prism')) s.bounce = 2;
  if (has('void-seek')) s.homing = 1;
  if (has('void-leech')) s.lifesteal = 1;
  if (has('void-singularity')) s.eCooldown *= 0.65;
  if (has('void-echo')) {
    s.qCooldown *= 0.65;
    s.damage += 4;
  }
  if (has('shift-quick')) s.dashCooldown *= 0.7;
  if (has('shift-stride')) s.speed *= 1.18;
  if (has('fire-meteor')) {
    s.shotSize = 9;
    s.shotSpeed *= 0.66;
    s.damage *= 1.65;
    s.rate *= 1.4;
  }
  if (has('fire-bloom')) s.fragment = 3;
  if (has('storm-lance')) {
    s.lance = true;
    s.shotSpeed *= 2.4;
    s.pierce += 3;
    s.rate *= 1.35;
    s.damage *= 1.15;
  }
  if (has('storm-familiar')) s.familiar = true;
  if (has('frost-wave')) s.wave = 1;
  if (has('frost-fan')) {
    s.projectiles += 2;
    s.damage *= 0.7;
  }
  if (has('void-orbit')) {
    s.orbit = true;
    s.pierce += 2;
    s.rate *= 1.2;
  }
  if (has('void-return')) {
    s.returning = true;
    s.damage *= 0.9;
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
  return s;
}
export function rewardChoices(
  ids: readonly string[],
  seed: number,
  room: number,
  initial = false,
  elite = false,
) {
  if (initial)
    return ['fire-ember', 'storm-arc', 'ice-touch'].map((id) =>
      CARDS.find((c) => c.id === id)!,
    );
  const rng = new Random(seed + room * 7247);
  const pool = CARDS.filter(
    (c) =>
      !ids.includes(c.id) &&
      (!REQUIREMENTS[c.id] || ids.includes(REQUIREMENTS[c.id])),
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
