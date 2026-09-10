import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  Zap,
  Snowflake,
  Orbit,
  Wind,
  Check,
  ShieldPlus,
  Gem,
  Skull,
  Target,
  Sparkles,
  Split,
  Waves,
  MoveHorizontal,
  Radio,
  Crosshair,
} from 'lucide-react';
import type { Element, Upgrade, RoomKind } from '../game/types';
import type { Engine } from '../game/engine';
import { ELEMENTS } from '../cards/catalog';
import { buildCounts } from '../cards/system';
import { roomChoices } from '../rooms/generator';
import { activeSynergies, newSynergies, SYNERGIES } from '../cards/synergies';
import { CampActions, WalletBar } from './EconomyPanels';
export function ElementIcon({
  element,
  size = 24,
}: {
  element: Element;
  size?: number;
}) {
  const Icon = {
    fire: Flame,
    storm: Zap,
    frost: Snowflake,
    void: Orbit,
    shift: Wind,
  }[element];
  return <Icon size={size} strokeWidth={1.35} />;
}
export function CardView({
  card,
  owned = false,
  onSelect,
  index = 0,
  build = [],
}: {
  card: Upgrade;
  owned?: boolean;
  onSelect?: () => void;
  index?: number;
  build?: readonly string[];
}) {
  const el = ELEMENTS[card.element];
  const Glyph = card.id.includes('meteor')
    ? Sparkles
    : card.id.includes('bloom') ||
        card.id.includes('split') ||
        card.id.includes('fan')
      ? Split
      : card.id.includes('wave')
        ? Waves
        : card.id.includes('return') || card.id.includes('rear')
          ? MoveHorizontal
          : card.id.includes('familiar')
            ? Radio
            : card.id.includes('lance')
              ? Crosshair
              : card.id.includes('orbit')
                ? Orbit
                : null;
  return (
    <button
      className={`protocol-card ${card.rarity} ${owned ? 'owned' : ''}`}
      style={{ '--element': el.color, '--index': index } as React.CSSProperties}
      onClick={onSelect}
      disabled={!onSelect}
      aria-label={`${card.name}：${card.description} ${card.preview}`}
    >
      <div className="card-top">
        <span>
          {el.en} / {el.name}
        </span>
        <b>
          {card.rarity === 'epic'
            ? '史诗'
            : card.rarity === 'rare'
              ? '稀有'
              : '标准'}
        </b>
      </div>
      <div className="card-sigil">
        <i />
        <i />
        {Glyph ? (
          <Glyph size={45} strokeWidth={1.35} />
        ) : (
          <ElementIcon element={card.element} size={45} />
        )}
      </div>
      <span className="card-en">{card.en}</span>
      <h3>{card.name}</h3>
      <p>{card.description}</p>
      <div className="card-preview">{card.preview}</div>
      {newSynergies(build, card.id).map((s) => (
        <div className="synergy-preview" key={s.id}>
          ✦ 激活 {s.name}
        </div>
      ))}
      {!newSynergies(build, card.id).length &&
        SYNERGIES.filter((s) => s.requires.some((id) => id === card.id))
          .slice(0, 1)
          .map((s) => (
            <div className="synergy-hint" key={s.id}>
              共鸣方向 · {s.name}
            </div>
          ))}
      <div className="card-bottom">
        <span>
          {owned ? (
            <>
              <Check size={14} /> 已收录
            </>
          ) : onSelect ? (
            '整合此协议'
          ) : (
            '未收录'
          )}
        </span>
        {onSelect ? (
          <ArrowUpRight size={18} />
        ) : (
          <ElementIcon element={card.element} size={15} />
        )}
      </div>
    </button>
  );
}
export function CardDraft({ engine }: { engine: Engine }) {
  const w = engine.world;
  return (
    <div className="modal-shade draft-shade">
      <section className="draft-panel">
        <div className="eyebrow">
          {w.rewardContext === 'start'
            ? 'INITIALIZE YOUR PROTOCOL'
            : 'ANOMALY PURGED // REWARD AVAILABLE'}
        </div>
        <h2>
          {w.rewardContext === 'start'
            ? '选择你的初始协议'
            : '力量，等待被改写。'}
        </h2>
        <p>
          {w.rewardContext === 'start'
            ? '选择一种元素，开始这次跃迁。'
            : '形态 × 弹道 × 元素。预览这次选择将激活的共鸣。'}
        </p>
        <div className="draft-cards">
          {w.rewards.map((c, i) => (
            <CardView
              key={c.id}
              card={c}
              index={i}
              build={w.cards}
              onSelect={() => engine.chooseCard(c.id)}
            />
          ))}
        </div>
        <div className="draft-foot">
          <span>选择 1 项 · 本次行动持续生效</span>
          <span>
            {w.rewardContext === 'start'
              ? '初始选择 / 01'
              : `区域净化奖励 / 0${w.room.index}`}
          </span>
        </div>
        {w.weapon === 'sword' && (
          <p className="weapon-trial-note">
            圣剑：元素强化剑弧，弹道协议化为次生剑气，多发扩大挥砍范围。
          </p>
        )}
        {w.rewardContext !== 'start' && (
          <div className="reroll-row">
            <WalletBar engine={engine} />
            <button
              onClick={() => engine.reroll()}
              disabled={w.rerolls >= 3 || w.wallet.coins < 12 + w.rerolls * 6}
            >
              {w.rerolls >= 3
                ? '本次重抽已用尽'
                : `${12 + w.rerolls * 6} 金币 · 重抽协议`}{' '}
              <small>{w.rerolls} / 3</small>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
export const ROOM_INFO: Record<
  RoomKind,
  { name: string; reward: string; risk: string; Icon: typeof Target }
> = {
  event: {
    name: '遗迹',
    reward: '生命、金币与未知协议的交换',
    risk: '代价由你选择',
    Icon: Sparkles,
  },
  shop: {
    name: '行商',
    reward: '购买补给 · 安全归档碎片',
    risk: '安全区域',
    Icon: Gem,
  },
  forge: {
    name: '工坊',
    reward: '熔接武装 · 混搭流派',
    risk: '首次早期熔接免费，后续 18 金币',
    Icon: Split,
  },
  archive: {
    name: '档案',
    reward: '记忆残片 · 4 碎片 · 协议 ×1',
    risk: '安全区域',
    Icon: Radio,
  },
  challenge: {
    name: '守点',
    reward: '驻守 18 秒 · 5 碎片 · 协议 ×1',
    risk: '守住中央符阵；最多五波敌人',
    Icon: Target,
  },
  combat: {
    name: '战斗',
    reward: '协议 ×1 · 恢复 12 生命',
    risk: '标准异常',
    Icon: Target,
  },
  elite: {
    name: '精英',
    reward: '稀有协议保障 · 额外经验与碎片',
    risk: '强化实体 · 高风险',
    Icon: Skull,
  },
  heal: {
    name: '修复',
    reward: '恢复 50 生命 · 协议 ×1',
    risk: '安全区域',
    Icon: ShieldPlus,
  },
  treasure: {
    name: '宝藏',
    reward: '协议 ×1 · 金币 +16 · 钥匙 +1',
    risk: '安全区域',
    Icon: Gem,
  },
  boss: {
    name: '核心',
    reward: '解除核心锁定',
    risk: '多阶段实体 · 极高风险',
    Icon: Orbit,
  },
};
export function RouteMap({ engine }: { engine: Engine }) {
  const w = engine.world;
  return (
    <div className="modal-shade">
      <section className="map-panel">
        <div className="eyebrow">NETWORK TOPOLOGY // 选择路径</div>
        <h2>下一次跃迁，去往何处？</h2>
        <p>先整理资源，再决定下一站。营地交易可全部跳过。</p>
        <CampActions engine={engine} />
        <div className="node-map">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={`map-node ${i < w.room.index ? 'complete' : ''} ${i === w.room.index ? 'next' : ''} ${i === 3 || i === 7 ? 'core' : ''}`}
            >
              <i>
                {i < w.room.index ? (
                  <Check size={15} />
                ) : i === 3 || i === 7 ? (
                  <Skull size={19} />
                ) : (
                  String(i + 1).padStart(2, '0')
                )}
              </i>
              <span>
                {i === 3 ? '守门人' : i === 7 ? '零号神谕' : `区域 0${i + 1}`}
              </span>
            </div>
          ))}
        </div>
        <div className="map-choices">
          {roomChoices(w.room.index + 1, w.seed).map((r) => {
            const info = ROOM_INFO[r.kind];
            return (
              <button
                className={`route-card ${r.kind}`}
                key={r.seed}
                onClick={() => engine.enter(r)}
              >
                <div className="route-heading">
                  <info.Icon size={24} />
                  <span>
                    {info.name} / SECTOR 0{r.index}
                  </span>
                </div>
                <h3>{r.name}</h3>
                <p>{info.risk}</p>
                <div className="route-reward">{info.reward}</div>
                <div className="route-bottom">
                  跃迁至此区域 <ArrowRight size={20} />
                </div>
              </button>
            );
          })}
        </div>
        <p className="checkpoint-note">
          进入区域时自动保存 · 可从主界面继续行动
        </p>
      </section>
    </div>
  );
}
export function BuildHUD({ cards }: { cards: string[] }) {
  const counts = buildCounts(cards);
  return (
    <aside className="build-hud">
      <span>ACTIVE PROTOCOLS</span>
      {(Object.keys(ELEMENTS) as Element[])
        .filter((el) => counts[el] > 0)
        .map((el) => (
          <div
            key={el}
            title={ELEMENTS[el].synergy}
            style={{ '--element': ELEMENTS[el].color } as React.CSSProperties}
          >
            <ElementIcon element={el} size={17} />
            <span>{ELEMENTS[el].name}</span>
            <b>{counts[el]}</b>
            <i className={counts[el] >= 3 ? 'resonant' : ''}>
              {counts[el] >= 3 ? '共鸣' : '/ 3'}
            </i>
          </div>
        ))}
      {activeSynergies(cards).map((s) => (
        <div
          className="fusion-hud"
          key={s.id}
          title={s.description}
          style={{ color: s.color }}
        >
          ✦ {s.name}
        </div>
      ))}
    </aside>
  );
}
