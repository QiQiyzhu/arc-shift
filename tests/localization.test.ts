import { expect, it } from 'vitest';
import { blankSave, parseSave } from '../src/core/save';
import { copy, normalizeLanguage, translateCopy } from '../src/ui/i18n';
import { CARDS, ELEMENTS } from '../src/cards/catalog';
import { SYNERGIES, TRIAL_BUILDS } from '../src/cards/synergies';
import { WEAPONS, WORKSHOP, SHOP } from '../src/economy/catalog';
import { RELICS, LORE, ENEMY_NOTES } from '../src/progression/catalog';
import { DEFAULT_TRIAL } from '../src/trial/config';
import library from '../src/coach/strategy-library.json';
import { coachSearchQuery } from '../src/ui/locale-coach';
import { retrieveStrategies, validateStrategy } from '../src/coach/knowledge';

it('keeps Chinese as the default locale for new and legacy saves', () => {
  expect(blankSave().settings.language).toBe('zh');
  const legacy = parseSave(
    JSON.stringify({
      version: 1,
      settings: { master: 0.4, music: 0.3, sfx: 0.6 },
      meta: {},
      checkpoint: null,
    }),
  );
  expect(legacy.settings.language).toBe('zh');
});

it('translates every default player catalog without changing rule names or numeric costs', () => {
  const originals = JSON.stringify({
    CARDS,
    ELEMENTS,
    SYNERGIES,
    RELICS,
    LORE,
  });
  const messages = [
    ...CARDS.flatMap((c) => [c.name, c.description, c.preview]),
    ...Object.values(ELEMENTS).flatMap((e) => [
      e.name,
      e.description,
      e.synergy,
    ]),
    ...SYNERGIES.flatMap((s) => [s.name, s.description]),
    ...TRIAL_BUILDS.flatMap((b) => [b.name, b.subtitle, b.description]),
    ...WEAPONS.flatMap((w) => [w.name, w.text, w.tags]),
    ...WORKSHOP.flatMap((w) => [w.name, w.text]),
    ...SHOP.flatMap((w) => [w.name, w.text]),
    ...RELICS.flatMap((r) => [r.name, r.text, r.lore]),
    ...LORE.flatMap((l) => [l.title, l.text, l.source]),
    ...Object.values(ENEMY_NOTES),
    ...DEFAULT_TRIAL.offers.flatMap((o) => [o.role, o.tradeoff]),
    ...DEFAULT_TRIAL.stages.flatMap((s) => [s.name, s.purpose]),
    ...library.plans.flatMap((p) => [p.title, p.explanation, p.caution]),
  ];
  for (const message of messages) {
    expect(translateCopy('zh', message)).toBe(message);
    expect(translateCopy('en', message), message).not.toMatch(
      /[\u3400-\u9fff]/,
    );
  }
  expect(translateCopy('en', '伤害 ×1.65 · 射击间隔 ×1.4')).toBe(
    'Damage ×1.65 · Firing interval ×1.4',
  );
  expect(JSON.stringify({ CARDS, ELEMENTS, SYNERGIES, RELICS, LORE })).toBe(
    originals,
  );
});

it('localizes generated card and transaction messages while keeping unknown custom text intact', () => {
  expect(translateCopy('en', '装备三重星火')).toBe('Equip Triple Sun');
  expect(translateCopy('en', '已购入封装灵药。每站库存一份。')).toBe(
    'Purchased: Sealed Tonic. One of each item per stop.',
  );
  expect(translateCopy('en', '17 枚碎片已送回营地，本次死亡也不会遗失。')).toBe(
    '17 shards sent to camp. They are protected even if this run ends in defeat.',
  );
  expect(translateCopy('en', '自定义鸢尾花园')).toBe('自定义鸢尾花园');
  expect(translateCopy('en', '自定义协议')).toBe('自定义协议');
  expect(translateCopy('en', '」')).toBe('”');
});

it('maps English coach keywords onto the same authored vocabulary and ranking', () => {
  const plans = library.plans.map((p) => validateStrategy(p));
  const english = retrieveStrategies(
    plans,
    coachSearchQuery('chain dash'),
    'mobility',
    'arc',
    [],
  );
  const chinese = retrieveStrategies(plans, '连锁 跃迁', 'mobility', 'arc', []);
  expect(english.map((r) => [r.plan.id, r.score])).toEqual(
    chinese.map((r) => [r.plan.id, r.score]),
  );
});

it('normalizes and round-trips the English locale without changing audio settings', () => {
  const save = blankSave();
  save.settings.language = 'en';
  save.settings.master = 0.31;
  const parsed = parseSave(JSON.stringify(save));
  expect(parsed.settings.language).toBe('en');
  expect(parsed.settings.master).toBe(0.31);
  expect(normalizeLanguage('fr')).toBe('zh');
  expect(copy('en', '系统设置', 'System settings')).toBe('System settings');
  expect(copy('zh', '系统设置', 'System settings')).toBe('系统设置');
});
