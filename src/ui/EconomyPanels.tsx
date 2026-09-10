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

export function WeaponIcon({ id, size = 20 }: { id: WeaponId; size?: number }) {
  const Icon = id === 'sword' ? Swords : id === 'cannon' ? Crosshair : Orbit;
  return <Icon size={size} strokeWidth={1.5} />;
}
export function WeaponPicker({
  value,
  onChange,
}: {
  value: WeaponId;
  onChange: (id: WeaponId) => void;
}) {
  return (
    <div className="weapon-picker" aria-label="选择行动武装">
      {WEAPONS.map((item) => (
        <button
          key={item.id}
          aria-label={`装备${item.name}`}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
          style={{ '--weapon': item.color } as React.CSSProperties}
          title={item.text}
        >
          <WeaponIcon id={item.id} />
          <span>
            {item.name}
            <small>{item.tags}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
export function WalletBar({
  engine,
  interactive = false,
}: {
  engine: Engine;
  interactive?: boolean;
}) {
  const w = engine.world;
  return (
    <div className="wallet-bar" aria-label="行动资源">
      <span title="金币：购买补给、重抽协议与碎片归档">
        <Coins size={15} /> <b>{w.wallet.coins}</b>
        <small>金币</small>
      </span>
      <span title="钥匙：开启封存箱，获得额外协议">
        <KeyRound size={15} /> <b>{w.wallet.keys}</b>
        <small>钥匙</small>
      </span>
      <button
        title="B 投放炸弹：0.8 秒后爆破并清弹，不伤自身；也可用于营地破锁"
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
        aria-label="投放炸弹"
      >
        <Bomb size={15} /> <b>{w.wallet.bombs}</b>
        <small>B</small>
      </button>
      <button
        title="R 使用灵药：恢复 40 生命，满血不消耗"
        disabled={
          !interactive ||
          w.phase !== 'playing' ||
          w.wallet.tonics === 0 ||
          w.player.hp >= w.player.maxHp
        }
        onClick={() => drinkTonic(w)}
        aria-label="使用灵药"
      >
        <FlaskConical size={15} /> <b>{w.wallet.tonics}</b>
        <small>R</small>
      </button>
      <span
        className="shard-count"
        title="随身碎片：失败仅带回一半，提前归档可保全"
      >
        <Gem size={15} /> <b>{w.wallet.shards}</b>
        <small>碎片</small>
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
  const meta = engine.save.meta;
  return (
    <div className="workshop-panel">
      <div className="workshop-balance">
        <Gem size={30} />
        <b>{meta.shards}</b>
        <span>
          已归档碎片
          <small>只影响新行动；正在进行的旧行动保持原装备与准备。</small>
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
              <h3>{item.name}</h3>
              <p>{item.text}</p>
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
                aria-label={`升级${item.name}`}
              >
                {maxed ? (
                  '刻印已完成'
                ) : (
                  <>
                    <Gem size={15} /> {cost} 碎片 · 升级{' '}
                    <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </section>
          );
        })}
      </div>
      <div className="economy-explainer">
        <b>带回什么，由你决定。</b>
        <p>
          第 2、4、7 区清场后可花 8
          金币归档全部随身碎片。未归档碎片在失败时保留一半；通关全部带回并额外获得
          8 枚。新开行动会放弃旧行动中未归档的资源。
        </p>
      </div>
    </div>
  );
}
export function CampActions({ engine }: { engine: Engine }) {
  const w = engine.world,
    used = (id: string) => w.campUsed.includes(id);
  const chest = [1, 3, 6].includes(w.room.index),
    shop = [2, 5, 7].includes(w.room.index),
    bank = [2, 4, 7].includes(w.room.index),
    altar = [3, 6].includes(w.room.index);
  const preview =
    chest && !used('chest')
      ? rewardChoices(w.cards, w.seed + 8171, w.room.index)[0]
      : null;
  return (
    <section className="camp-actions" aria-label="清场营地">
      <div className="camp-heading">
        <span>FIELD CAMP / 清场营地</span>
        <WalletBar engine={engine} />
      </div>
      <div className="camp-grid">
        {chest && (
          <article className="camp-chest">
            <LockKeyhole size={25} />
            <h3>封存协议箱</h3>
            <p>
              {used('chest')
                ? '已经开启，不能再次领取。'
                : `钥匙可保全「${preview?.name || '金币缓存'}」；炸弹将其拆成 18 金币和 2 碎片。`}
            </p>
            <div>
              <button
                disabled={used('chest') || w.wallet.keys < 1}
                onClick={() => engine.openChest('key')}
              >
                <KeyRound size={15} /> 钥匙 ×1 · 解锁协议
              </button>
              <button
                disabled={used('chest') || w.wallet.bombs < 1}
                onClick={() => engine.openChest('bomb')}
              >
                <Bomb size={15} /> 炸弹 ×1 · 破锁回收
              </button>
            </div>
          </article>
        )}
        {shop && (
          <article className="camp-shop">
            <Coins size={25} />
            <h3>流浪行商</h3>
            <p>每件库存一份。买下现在的安全，或留下纠正流派的钱。</p>
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
                  title={item.text}
                >
                  <span>
                    {item.name}
                    <small>{item.text}</small>
                  </span>
                  <b>{used(item.id) ? '售罄' : `${item.cost} G`}</b>
                </button>
              ))}
            </div>
          </article>
        )}
        {altar && (
          <article className="camp-altar">
            <Flame size={25} />
            <h3>血誓祭坛</h3>
            <p>献出 30 生命，换取 20 金币与 2 碎片。不能献出最后的生命。</p>
            <button
              disabled={used('altar') || w.player.hp <= 30}
              onClick={() => engine.bloodPact()}
            >
              {used('altar') ? '本区血誓已完成' : '生命 −30 · 缔结血誓'}
            </button>
          </article>
        )}
        {bank && (
          <article className="camp-bank">
            <Landmark size={25} />
            <h3>碎片中继站</h3>
            <p>
              付 8 金币，把全部 {w.wallet.shards}{' '}
              枚随身碎片送回营地。未归档部分在失败时损失一半。
            </p>
            <button
              disabled={
                used('bank') || w.wallet.coins < 8 || w.wallet.shards === 0
              }
              onClick={() => engine.bankShards()}
            >
              {used('bank') ? '本区已完成归档' : '8 金币 · 安全归档'}
            </button>
          </article>
        )}
      </div>
      <output className="camp-message">
        {engine.storageAvailable
          ? w.campMessage || '所有交易都是可选的；资源和选择立即保存。'
          : '浏览器存储不可用：交易与归档仅在本次会话有效，关闭页面后可能丢失。'}
      </output>
    </section>
  );
}
