import { useTranslation } from './i18n';
import {
  Coins,
  KeyRound,
  Bomb,
  FlaskConical,
  Gem,
  Swords,
  Crosshair,
  Orbit,
  Heart,
  ArrowUpRight,
  LockKeyhole,
  Flame,
  Landmark,
} from 'lucide-react';
import { SHOP, WEAPONS, WORKSHOP } from '../economy/catalog';
import type { Engine } from '../game/engine';
import type { WeaponId } from '../game/types';
import { rewardChoices } from '../cards/system';
import { throwBomb, drinkTonic } from '../combat/weapons';
import { copy, type Language, useLanguage } from './i18n';

export function WeaponIcon({ id, size = 20 }: { id: WeaponId; size?: number }) {
  const Icon = id === 'sword' ? Swords : id === 'cannon' ? Crosshair : Orbit;
  return <Icon size={size} strokeWidth={1.5} />;
}
export function WeaponPicker({
  value,
  onChange,
  language: initialLanguage,
}: {
  value: WeaponId;
  onChange: (id: WeaponId) => void;
  language?: Language;
}) {
  const t = useTranslation();
  // Content names stay authored; surrounding controls follow the interface locale.
  const language = useLanguage(initialLanguage);
  return (
    <div
      className="weapon-picker"
      aria-label={t(copy(language, '选择演练武装', 'Choose trial weapon'))}
    >
      {WEAPONS.map((item) => (
        <button
          key={item.id}
          aria-label={t(`${copy(language, '装备', 'Equip')} ${item.name}`)}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
          style={{ '--weapon': item.color } as React.CSSProperties}
          title={t(item.text)}
        >
          <WeaponIcon id={item.id} />
          <span>
            {t(item.name)}
            <small>{t(item.tags)}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
export function WalletBar({
  engine,
  interactive = false,
  labels,
}: {
  engine: Engine;
  interactive?: boolean;
  labels?: { bomb: string; potion: string };
}) {
  const t = useTranslation();
  const w = engine.world;
  const language = useLanguage(engine.save.settings.language);
  const ui = (zh: string, en: string) => copy(language, zh, en);
  const resolvedLabels = labels || {
    bomb: ui('炸弹', 'Bomb'),
    potion: ui('灵药', 'Tonic'),
  };
  return (
    <div className="wallet-bar" aria-label={t(ui('行动资源', 'Run resources'))}>
      <span
        title={t(
          ui(
            '金币：购买补给、重抽协议与碎片归档',
            'Coins: buy supplies, reroll protocols, and bank shards',
          ),
        )}
      >
        <Coins size={15} /> <b>{w.wallet.coins}</b>
        <small>{t(ui('金币', 'Coins'))}</small>
      </span>
      <span
        title={t(
          ui(
            '钥匙：开启封存箱，获得额外协议',
            'Keys: open sealed chests for extra protocols',
          ),
        )}
      >
        <KeyRound size={15} /> <b>{w.wallet.keys}</b>
        <small>{t(ui('钥匙', 'Keys'))}</small>
      </span>
      <button
        title={t(
          ui(
            '投放炸弹：0.8 秒后爆破并清弹，不伤自身；也可用于营地破锁',
            'Deploy bomb: detonates in 0.8s, clears projectiles, and can crack camp locks',
          ),
        )}
        disabled={
          !interactive ||
          w.phase !== 'playing' ||
          w.wallet.bombs === 0 ||
          w.bombCd > 0
        }
        onClick={() =>
          throwBomb(
            w,
            w.player.x + Math.cos(w.player.angle) * 200,
            w.player.y + Math.sin(w.player.angle) * 200,
          )
        }
        aria-label={t(ui('投放炸弹', 'Deploy bomb'))}
      >
        <Bomb size={15} /> <b>{w.wallet.bombs}</b>
        <small>{t(resolvedLabels.bomb)}</small>
      </button>
      <button
        title={t(
          ui(
            '使用灵药：恢复 40 生命，满血不消耗',
            'Use tonic: restore 40 HP; not consumed at full health',
          ),
        )}
        disabled={
          !interactive ||
          w.phase !== 'playing' ||
          w.wallet.tonics === 0 ||
          w.player.hp >= w.player.maxHp
        }
        onClick={() => drinkTonic(w)}
        aria-label={t(ui('使用灵药', 'Use tonic'))}
      >
        <FlaskConical size={15} /> <b>{w.wallet.tonics}</b>
        <small>{t(resolvedLabels.potion)}</small>
      </button>
      <span
        className="shard-count"
        title={t(
          ui(
            '随身碎片：失败仅带回一半，提前归档可保全',
            'Carry shards: only half return on defeat; bank them to keep all',
          ),
        )}
      >
        <Gem size={15} /> <b>{w.wallet.shards}</b>
        <small>{t(ui('碎片', 'Shards'))}</small>
      </span>
    </div>
  );
}
export function Workshop({
  engine,
  refresh,
}: {
  engine: Engine;
  refresh: () => void;
}) {
  const t = useTranslation();
  const meta = engine.save.meta;
  const language = useLanguage(engine.save.settings.language);
  const ui = (zh: string, en: string) => copy(language, zh, en);
  return (
    <div className="workshop-panel">
      <div className="workshop-balance">
        <Gem size={30} />
        <b>{meta.shards}</b>
        <span>
          {t(ui('已归档碎片', 'Banked shards'))}
          <small>
            {t(
              ui(
                '只影响新行动；正在进行的旧行动保持原装备与准备。',
                'Affects new runs only; the current run keeps its loadout and preparation.',
              ),
            )}
          </small>
        </span>
      </div>
      <div className="workshop-grid">
        {WORKSHOP.map((item, i) => {
          const rank = meta.preparation[item.id],
            maxed = rank >= item.max,
            cost = item.costs[rank],
            Icon = [Heart, FlaskConical, Coins][i];
          return (
            <section key={item.id}>
              <Icon size={30} />
              <small>PREPARATION / 0{i + 1}</small>
              <h3>{t(item.name)}</h3>
              <p>{t(item.text)}</p>
              <div className="rank-slots">
                {Array.from({ length: item.max }, (_, j) => (
                  <i key={j} className={j < rank ? 'filled' : ''} />
                ))}
              </div>
              <button
                disabled={
                  maxed || meta.shards < cost || engine.world.phase !== 'menu'
                }
                onClick={() => {
                  engine.upgradePreparation(item.id);
                  refresh();
                }}
                aria-label={t(`${ui('升级', 'Upgrade')} ${item.name}`)}
              >
                {maxed ? (
                  ui('刻印已完成', 'Inscription complete')
                ) : (
                  <>
                    <Gem size={15} /> {cost}{' '}
                    {t(ui('碎片 · 升级', 'shards · upgrade'))}
                    {t(' ')}
                    <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </section>
          );
        })}
      </div>
      <div className="economy-explainer">
        <b>
          {t(ui('带回什么，由你决定。', 'What you bring back is your choice.'))}
        </b>
        <p>
          {t(
            ui(
              '在行商、篝火或核心清场后的中继站可花 8 金币归档全部随身碎片。未归档碎片在失败时保留一半；通关全部带回并额外获得 8 枚。新开行动会放弃旧行动中未归档的资源。',
              'At a shop, campfire, or post-core relay, spend 8 coins to bank all carried shards. Half of unbanked shards survive defeat; victory returns all plus 8. Starting a new run abandons unbanked resources from the old run.',
            ),
          )}
        </p>
      </div>
    </div>
  );
}
export function CampActions({ engine }: { engine: Engine }) {
  const t = useTranslation();
  const w = engine.world,
    used = (id: string) => w.campUsed.includes(id);
  const language = useLanguage(engine.save.settings.language);
  const ui = (zh: string, en: string) => copy(language, zh, en);
  const legacy = w.campaign === 'legacy',
    chest = legacy
      ? [1, 3, 6].includes(w.room.index)
      : w.room.kind === 'treasure',
    shop = legacy ? [2, 5, 7].includes(w.room.index) : w.room.kind === 'shop',
    bank = legacy
      ? [2, 4, 7].includes(w.room.index)
      : ['shop', 'heal', 'boss'].includes(w.room.kind),
    altar = legacy && [3, 6].includes(w.room.index);
  const preview =
    chest && !used('chest')
      ? rewardChoices(w.cards, w.seed + 8171, w.room.index)[0]
      : null;
  return (
    <section
      className="camp-actions"
      aria-label={t(ui('清场营地', 'Field camp'))}
    >
      <div className="camp-heading">
        <span>FIELD CAMP / {t(ui('清场营地', 'FIELD CAMP'))}</span>
        <WalletBar engine={engine} />
      </div>
      <div className="camp-grid">
        {chest && (
          <article className="camp-chest">
            <LockKeyhole size={25} />
            <h3>{t(ui('封存协议箱', 'Sealed protocol chest'))}</h3>
            <p>
              {t(
                used('chest')
                  ? ui(
                      '已经开启，不能再次领取。',
                      'Opened; rewards cannot be claimed again.',
                    )
                  : ui(
                      `钥匙可保全「${preview?.name || '金币缓存'}」；炸弹将其拆成 18 金币和 2 碎片。`,
                      `A key preserves “${preview?.name || 'coin cache'}”; a bomb breaks it into 18 coins and 2 shards.`,
                    ),
              )}
            </p>
            <div>
              <button
                disabled={used('chest') || w.wallet.keys < 1}
                onClick={() => engine.openChest('key')}
              >
                <KeyRound size={15} />{' '}
                {t(ui('钥匙 ×1 · 解锁协议', 'Key ×1 · unlock protocol'))}
              </button>
              <button
                disabled={used('chest') || w.wallet.bombs < 1}
                onClick={() => engine.openChest('bomb')}
              >
                <Bomb size={15} />{' '}
                {t(ui('炸弹 ×1 · 破锁回收', 'Bomb ×1 · salvage chest'))}
              </button>
            </div>
          </article>
        )}
        {shop && (
          <article className="camp-shop">
            <Coins size={25} />
            <h3>{t(ui('流浪行商', 'Wandering trader'))}</h3>
            <p>
              {t(
                ui(
                  '每件库存一份。买下现在的安全，或留下纠正流派的钱。',
                  'One of each item. Buy safety now or keep coins to correct your build.',
                ),
              )}
            </p>
            <div className="shop-grid">
              {SHOP.map((item) => (
                <button
                  key={item.id}
                  disabled={
                    used(item.id) ||
                    w.wallet.coins < item.cost ||
                    (item.id === 'heal' && w.player.hp >= w.player.maxHp) ||
                    (item.id === 'tonic' && w.wallet.tonics >= 3) ||
                    (item.id === 'bomb' && w.wallet.bombs >= 9) ||
                    (item.id === 'key' && w.wallet.keys >= 9)
                  }
                  onClick={() => engine.buy(item.id)}
                  title={t(item.text)}
                >
                  <span>
                    {t(item.name)}
                    <small>{t(item.text)}</small>
                  </span>
                  <b>{t(used(item.id) ? '售罄' : `${item.cost} G`)}</b>
                </button>
              ))}
            </div>
          </article>
        )}
        {altar && (
          <article className="camp-altar">
            <Flame size={25} />
            <h3>{t('血誓祭坛')}</h3>
            <p>
              {t('献出 30 生命，换取 20 金币与 2 碎片。不能献出最后的生命。')}
            </p>
            <button
              disabled={used('altar') || w.player.hp <= 30}
              onClick={() => engine.bloodPact()}
            >
              {t(used('altar') ? '本区血誓已完成' : '生命 −30 · 缔结血誓')}
            </button>
          </article>
        )}
        {bank && (
          <article className="camp-bank">
            <Landmark size={25} />
            <h3>{t('碎片中继站')}</h3>
            <p>
              {t('付 8 金币，把全部')}
              {w.wallet.shards}
              {t(' ')}
              {t('枚随身碎片送回营地。未归档部分在失败时损失一半。')}
            </p>
            <button
              disabled={
                used('bank') || w.wallet.coins < 8 || w.wallet.shards === 0
              }
              onClick={() => engine.bankShards()}
            >
              {t(used('bank') ? '本区已完成归档' : '8 金币 · 安全归档')}
            </button>
          </article>
        )}
      </div>
      <output className="camp-message">
        {t(
          engine.storageAvailable
            ? w.campMessage || '所有交易都是可选的；资源和选择立即保存。'
            : '浏览器存储不可用：交易与归档仅在本次会话有效，关闭页面后可能丢失。',
        )}
      </output>
    </section>
  );
}
