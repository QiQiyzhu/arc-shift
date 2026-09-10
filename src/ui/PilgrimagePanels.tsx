import { useState } from 'react';
import { ArrowRight, Check, LockKeyhole, Gem, BookOpen } from 'lucide-react';
import type { Engine } from '../game/engine';
import { expedition, availableNodes, BIOMES } from '../rooms/expedition';
import { ROOM_INFO } from './ProtocolPanels';
import { CampActions, WalletBar, WeaponIcon } from './EconomyPanels';
import { WEAPONS } from '../economy/catalog';
import { RELICS, LORE, ENEMY_NOTES } from '../progression/catalog';
import { ENEMIES } from '../data/enemies';
import type { EnemyKind } from '../game/types';

const modifiers = {
  none: '无额外异变',
  haste: '疾行：敌人移动速度 +20%',
  thorns: '荆棘：敌人携带 18 护盾',
  fervor: '狂热：敌人伤害 +15%',
};
export function HybridHUD({ engine }: { engine: Engine }) {
  const w = engine.world;
  return (
    <div className="hybrid-hud" aria-label="当前混搭武装">
      {w.forms.map((id, i) => (
        <span key={id}>
          <WeaponIcon id={id} />
          {WEAPONS.find((x) => x.id === id)!.name}
          <small>{i === 0 ? '主' : '副'}</small>
        </span>
      ))}
      {w.forms.length > 1 && (
        <b title="按住攻击时副武装自动轮替；共享元素与弹道协议">
          共鸣 {w.forms.length}/3
        </b>
      )}
    </div>
  );
}
export function ExpeditionMap({ engine }: { engine: Engine }) {
  const w = engine.world,
    graph = expedition(w.seed),
    available = availableNodes(w.seed, w.room.nodeId!),
    [selected, setSelected] = useState(available[0]?.id || w.room.nodeId!);
  const node = graph.find((n) => n.id === selected) || available[0],
    info = ROOM_INFO[node.room.kind],
    canTravel = available.some((n) => n.id === node.id);
  const point = (id: string) => {
    const n = graph.find((n) => n.id === id)!;
    return { x: 40 + (n.depth - 1) * 88, y: 50 + n.lane * 87 };
  };
  return (
    <div className="modal-shade pilgrimage-shade">
      <section className="pilgrimage-map">
        <div className="map-title">
          <div>
            <div className="eyebrow">THE LAST PILGRIMAGE / 路线规划</div>
            <h2>钟声尽头</h2>
          </div>
          <WalletBar engine={engine} />
        </div>
        <p>查看整条路线，再选择相连的下一站。每次经过，都会关闭其他岔路。</p>
        <div className="route-biomes">
          {Object.values(BIOMES).map((b) => (
            <span key={b.en} style={{ color: b.color }}>
              {b.name}
              <small>{b.en}</small>
            </span>
          ))}
        </div>
        <div className="route-scroll">
          <div className="route-graph" aria-label="十二层分支地图">
            <svg
              viewBox="0 0 1048 285"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {graph.flatMap((n) =>
                n.next.map((id) => {
                  const a = point(n.id),
                    b = point(id),
                    visited = w.route.includes(n.id) && w.route.includes(id),
                    next = n.id === w.room.nodeId;
                  return (
                    <line
                      key={`${n.id}-${id}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className={visited ? 'visited' : next ? 'reachable' : ''}
                    />
                  );
                }),
              )}
            </svg>
            {graph.map((n) => {
              const p = point(n.id),
                i = ROOM_INFO[n.room.kind],
                visited = w.route.includes(n.id),
                reachable = available.some((a) => a.id === n.id);
              return (
                <button
                  key={n.id}
                  className={`route-stop ${visited ? 'visited' : ''} ${reachable ? 'reachable' : ''} ${selected === n.id ? 'selected' : ''} ${n.room.kind === 'boss' ? 'core' : ''}`}
                  style={{ left: `${(p.x / 1048) * 100}%`, top: p.y }}
                  onClick={() => setSelected(n.id)}
                  aria-label={`第 ${n.depth} 层 ${n.room.name} · ${reachable ? '可前往' : visited ? '已走过' : '预览'}`}
                  aria-pressed={selected === n.id}
                >
                  <i>{visited ? <Check size={19} /> : <i.Icon size={21} />}</i>
                  <span>{n.room.kind === 'boss' ? n.room.name : i.name}</span>
                  <small>{String(n.depth).padStart(2, '0')}</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="route-inspector">
          <info.Icon size={30} />
          <div>
            <span>
              第 {node.depth} 层 · {BIOMES[node.room.biome!].name} / {info.name}
            </span>
            <h3>{node.room.name}</h3>
            <p>
              {node.room.kind === 'heal'
                ? '恢复 55 生命或补充一瓶灵药'
                : node.room.kind === 'treasure'
                  ? '免费熔接武装或回收物资；钥匙可开启额外协议箱'
                  : info.reward}
            </p>
            <small>{modifiers[node.room.modifier || 'none']}</small>
          </div>
          <button
            className="journey-button"
            disabled={!canTravel}
            onClick={() => engine.travel(node.id)}
          >
            {canTravel
              ? '前往此处'
              : w.route.includes(node.id)
                ? '已经过'
                : '尚未连接'}
            <ArrowRight size={19} />
          </button>
        </div>
        {['boss', 'heal', 'treasure', 'shop'].includes(w.room.kind) && (
          <CampActions engine={engine} />
        )}
        <div className="map-legend">
          <span>◇ 亮线：下一站</span>
          <span>✓ 已走过</span>
          <span>点击远处节点可预览</span>
          <span>进度已自动保存</span>
        </div>
      </section>
    </div>
  );
}
const encounters = {
  forge: [
    '异物缝合',
    '“留下旧的那一件。”工匠指了指你的影子，“它还没有走够远。”',
  ],
  treasure: [
    '封存武库',
    '三把武器，挂在同一个人的衣钩上。架子下面，只有一双靴子。',
  ],
  archive: [
    '没有收件人的信',
    '“如果树又开花，就不要再唤醒我。”落款被水洗掉了。',
  ],
  event: [
    '逆响遗迹',
    '倒置的钟静静悬着。祭坛下方，一笔尚未偿清的旧债亮起了你的名字。',
  ],
  shop: ['渡鸦行商', '“价格没有涨。只是你带回来的明天，越来越少了。”'],
  heal: [
    '无名篝火',
    '这里还有一个温热的座位。火光里，有人替你留了最后一瓶药。',
  ],
} as const;
export function EncounterPanel({ engine }: { engine: Engine }) {
  const w = engine.world,
    kind = w.room.kind as keyof typeof encounters,
    [title, text] = encounters[kind];
  const action = (
    id: string,
    label: string,
    detail: string,
    disabled = false,
  ) => (
    <button
      className="encounter-choice"
      key={id}
      disabled={disabled}
      onClick={() => engine.resolveEvent(id)}
    >
      <b>{label}</b>
      <span>{detail}</span>
      <ArrowRight size={18} />
    </button>
  );
  const cost =
    kind === 'treasure' || (w.room.index <= 3 && w.forms.length === 1) ? 0 : 18;
  return (
    <div className="modal-shade encounter-shade">
      <section className={`encounter-panel encounter-${kind}`}>
        <div className="eyebrow">
          {BIOMES[w.room.biome!].en} / {ROOM_INFO[kind].name}
        </div>
        <h2>{title}</h2>
        <p className="fragment-quote">{text}</p>
        <WalletBar engine={engine} />
        <div className="encounter-choices">
          {(kind === 'forge' || kind === 'treasure') &&
            WEAPONS.filter((f) => !w.forms.includes(f.id)).map((f) =>
              action(
                `form:${f.id}`,
                `熔接${f.name}`,
                `${cost === 0 ? '免费' : `${cost} 金币`} · 保留现有武装，共享元素与弹道`,
                w.wallet.coins < cost,
              ),
            )}
          {kind === 'forge' &&
            RELICS.filter(
              (r) =>
                engine.save.meta.unlocked.includes(r.id) &&
                !w.relics.includes(r.id),
            ).map((r) =>
              action(
                `relic:${r.id}`,
                r.name,
                `25 金币 · ${r.text}`,
                w.wallet.coins < 25,
              ),
            )}
          {kind === 'forge' && action('repair', '修复行装', '恢复 25 生命')}
          {kind === 'treasure' &&
            action('salvage', '回收旧物', '20 金币 · 3 碎片')}
          {kind === 'archive' &&
            action('read', '收起这封信', '收录记忆 · 4 碎片 · 选择一项协议')}
          {kind === 'heal' && action('rest', '在火边歇息', '恢复 55 生命')}
          {kind === 'heal' &&
            action(
              'bottle',
              '带走那瓶药',
              '灵药 +1，最多携带 3 瓶',
              w.wallet.tonics >= 3,
            )}
          {kind === 'event' &&
            action(
              'bell',
              '敲响倒钟',
              '10 金币 · 选择一项协议 · 记忆残片',
              w.wallet.coins < 10,
            )}
          {kind === 'event' &&
            action(
              'blood',
              '偿还旧债',
              '生命 −30 · 金币 +24 · 碎片 +3',
              w.player.hp <= 30,
            )}
        </div>
        {['shop', 'heal', 'treasure'].includes(kind) && (
          <CampActions engine={engine} />
        )}
        <button
          className="text-button encounter-leave"
          onClick={() => engine.resolveEvent('leave')}
        >
          {kind === 'shop' ? '离开行商' : '不再停留'} <ArrowRight size={17} />
        </button>
        <small className="encounter-note">
          每处仅能选择一项主要行动。额外交易独立结算。
        </small>
      </section>
    </div>
  );
}
export function RelicCollection({
  engine,
  refresh,
}: {
  engine: Engine;
  refresh: () => void;
}) {
  const m = engine.save.meta;
  return (
    <>
      <div className="archive-summary">
        <Gem size={20} />
        {m.shards} 已归档碎片
        <span>出发时携带一件遗器，局内可在工坊继续熔接。</span>
      </div>
      <div className="relic-grid">
        {RELICS.map((r) => {
          const owned = m.unlocked.includes(r.id),
            locked = r.boss && !m.bosses.includes(r.boss),
            equipped = m.equipped === r.id;
          return (
            <article key={r.id} className={equipped ? 'equipped' : ''}>
              <small>{r.boss ? ENEMIES[r.boss].name : '无击破要求'}</small>
              <h3>{r.name}</h3>
              <p>{r.text}</p>
              <blockquote>{r.lore}</blockquote>
              <button
                disabled={
                  engine.world.phase !== 'menu' ||
                  (!owned && (!!locked || m.shards < r.cost))
                }
                onClick={() => {
                  if (owned) engine.equipRelic(equipped ? null : r.id);
                  else engine.unlockRelic(r.id);
                  refresh();
                }}
              >
                {owned
                  ? equipped
                    ? '已装备 · 卸下'
                    : '携带此遗器'
                  : locked
                    ? `击败${ENEMIES[r.boss!].name}后解锁`
                    : `${r.cost} 碎片 · 解锁`}
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}
export function MemoryCollection({ engine }: { engine: Engine }) {
  const m = engine.save.meta;
  return (
    <>
      <p className="archive-summary">
        记忆 {m.lore.length} / {LORE.length} · 有些空白，也许本来就没有答案。
      </p>
      <div className="memory-grid">
        {LORE.map((l) => {
          const known = m.lore.includes(l.id);
          return (
            <article key={l.id} className={known ? '' : 'locked'}>
              {known ? <BookOpen size={23} /> : <LockKeyhole size={23} />}
              <small>{l.source}</small>
              <h3>{known ? l.title : '未拾得的记忆'}</h3>
              <p>{known ? l.text : '还没有人把这一页带回来。'}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
export function EnemyCollection({ engine }: { engine: Engine }) {
  const [filter, setFilter] = useState('all');
  const entries = Object.entries(ENEMIES) as [
    EnemyKind,
    (typeof ENEMIES)[EnemyKind],
  ][];
  return (
    <>
      <div className="element-tabs">
        {[
          ['all', '全部实体'],
          ['normal', '游荡者'],
          ['boss', '核心实体'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? 'active' : ''}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="memory-grid">
        {entries
          .filter(
            ([, e]) =>
              filter === 'all' ||
              (filter === 'boss' ? e.radius > 35 : e.radius <= 35),
          )
          .map(([id, e]) => (
            <article key={id}>
              <small>
                {engine.save.meta.enemies.includes(id) ? '已记录' : '尚未清除'}{' '}
                / {e.radius > 35 ? '核心' : '游荡者'}
              </small>
              <h3
                style={{ color: `#${e.color.toString(16).padStart(6, '0')}` }}
              >
                {e.name}
              </h3>
              <p>{ENEMY_NOTES[id]}</p>
            </article>
          ))}
      </div>
    </>
  );
}
