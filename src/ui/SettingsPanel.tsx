import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Engine } from '../game/engine';
import type { Synth } from '../audio/synth';
import { useState } from 'react';
import { CARDS, ELEMENTS } from '../cards/catalog';
import { SYNERGIES, TRIAL_BUILDS } from '../cards/synergies';
import { CardView } from './ProtocolPanels';
import type { Element } from '../game/types';
import {
  RelicCollection,
  EnemyCollection,
  MemoryCollection,
} from './PilgrimagePanels';
import { WeaponPicker, Workshop } from './EconomyPanels';
export function UtilityPanel({
  mode: requestedMode,
  onClose,
  engine,
  synth,
}: {
  mode: 'settings' | 'library' | 'help' | 'lab' | 'workshop' | 'camp' | null;
  onClose: () => void;
  engine: Engine;
  synth: Synth;
}) {
  const [, render] = useState(0);
  const [campTab, setCampTab] = useState('workshop');
  const [hybrid, setHybrid] = useState(false);
  const mode = requestedMode === 'camp' ? campTab : requestedMode;
  const [filter, setFilter] = useState<Element>('fire');
  const [trialWeapon, setTrialWeapon] = useState(
    engine.practice ? engine.world.weapon : engine.save.meta.weapon,
  );
  const s = engine.save.settings;
  const change = () => {
    synth.settings = { ...s };
    engine.persist();
    render((n) => n + 1);
  };
  return (
    <Dialog
      open={requestedMode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`utility-dialog ${mode !== 'settings' && mode !== 'help' ? 'library-dialog' : ''}`}
      >
        <DialogTitle>
          {mode === 'relics'
            ? '遗器陈列'
            : mode === 'codex'
              ? '异常图鉴'
              : mode === 'lore'
                ? '记忆残片'
                : mode === 'workshop'
                  ? '行者营地'
                  : mode === 'lab'
                    ? '协议试炼'
                    : mode === 'settings'
                      ? '系统设置'
                      : mode === 'library'
                        ? '协议档案'
                        : '行动指南'}
        </DialogTitle>
        <DialogDescription>
          {mode === 'relics'
            ? '以碎片唤醒旧物，部分遗器需要击破对应核心。'
            : mode === 'lore'
              ? '沿途拾得的只言片语。'
              : mode === 'codex'
                ? '记录实体的招式与留下的痕迹。'
                : mode === 'workshop'
                  ? '将带回的碎片刻入行装。武装免费选择，准备升级只影响新行动。'
                  : mode === 'lab'
                    ? '选择一套组合，立即感受叠加后的弹道。无敌试炼，不覆盖你的行动存档。'
                    : mode === 'settings'
                      ? '调整声音与战斗反馈。设置保存在当前设备。'
                      : mode === 'library'
                        ? '40 项协议，5 种元素。弹体形态、轨迹与命中效果可以自由叠加。'
                        : '观察预警，保留一次闪避，在敌人恢复时输出。'}
        </DialogDescription>
        {requestedMode === 'camp' && (
          <nav className="camp-tabs" aria-label="营地分类">
            {[
              ['workshop', '行装养成'],
              ['relics', '遗器'],
              ['library', '协议档案'],
              ['codex', '异常图鉴'],
              ['lore', '记忆残片'],
              ['lab', '协议试炼'],
              ['help', '操作指南'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={mode === id ? 'active' : ''}
                onClick={() => setCampTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        {mode === 'relics' ? (
          <RelicCollection
            engine={engine}
            refresh={() => render((n) => n + 1)}
          />
        ) : mode === 'codex' ? (
          <EnemyCollection engine={engine} />
        ) : mode === 'lore' ? (
          <MemoryCollection engine={engine} />
        ) : mode === 'workshop' ? (
          <>
            <WeaponPicker
              value={engine.save.meta.weapon}
              onChange={(id) => {
                engine.selectWeapon(id);
                setTrialWeapon(id);
                render((n) => n + 1);
              }}
            />
            <Workshop engine={engine} refresh={() => render((n) => n + 1)} />
          </>
        ) : mode === 'lab' ? (
          <>
            <WeaponPicker value={trialWeapon} onChange={setTrialWeapon} />
            <div className="switch-row">
              <label htmlFor="hybrid-trial">
                三重共鸣 · 同时试用法器、圣剑与重炮
              </label>
              <Switch
                id="hybrid-trial"
                checked={hybrid}
                onCheckedChange={setHybrid}
              />
            </div>
            <p className="weapon-trial-note">
              圣剑的元素作用于剑弧，弹道协议增加次生剑气；重炮的弹道与爆破可叠加。试炼不影响资源和营地。
            </p>
            <div className="trial-grid">
              {TRIAL_BUILDS.map((b, i) => (
                <button
                  key={b.name}
                  className={`trial-card trial-${i}`}
                  onClick={() => {
                    synth.unlock();
                    engine.startPractice(b.cards, trialWeapon, hybrid);
                    onClose();
                  }}
                >
                  <span>EXPERIMENT 0{i + 1}</span>
                  <h3>{b.name}</h3>
                  <b>{b.subtitle}</b>
                  <p>{b.description}</p>
                  <small>进入试炼 →</small>
                </button>
              ))}
            </div>
          </>
        ) : mode === 'settings' ? (
          <>
            <div className="settings-list">
              {(['master', 'music', 'sfx'] as const).map((key, i) => (
                <div className="setting-row" key={key}>
                  <label id={`label-${key}`}>
                    {['主音量', '音乐', '音效'][i]}
                    <b>{Math.round(s[key] * 100)}%</b>
                  </label>
                  <Slider
                    aria-labelledby={`label-${key}`}
                    value={[s[key] * 100]}
                    max={100}
                    min={0}
                    onValueChange={(value) => {
                      s[key] = (Array.isArray(value) ? value[0] : value) / 100;
                      change();
                    }}
                  />
                </div>
              ))}
              <div className="switch-row">
                <label htmlFor="mute-setting">静音</label>
                <Switch
                  id="mute-setting"
                  checked={s.muted}
                  onCheckedChange={(v) => {
                    s.muted = v;
                    change();
                  }}
                />
              </div>
              <div className="switch-row">
                <div>
                  <label htmlFor="motion-setting">减少动态效果</label>
                  <p>关闭镜头震动，保留攻击预警。</p>
                </div>
                <Switch
                  id="motion-setting"
                  checked={s.reducedMotion}
                  onCheckedChange={(v) => {
                    s.reducedMotion = v;
                    change();
                  }}
                />
              </div>
            </div>
            <div className="settings-note">
              {engine.storageAvailable
                ? '设置已自动保存'
                : '浏览器存储不可用，设置在本次会话内有效。'}
            </div>
          </>
        ) : mode === 'library' ? (
          <>
            <div className="element-tabs">
              {(Object.keys(ELEMENTS) as Element[]).map((el) => (
                <button
                  className={filter === el ? 'active' : ''}
                  key={el}
                  onClick={() => setFilter(el)}
                  style={
                    { '--element': ELEMENTS[el].color } as React.CSSProperties
                  }
                >
                  {ELEMENTS[el].name}
                </button>
              ))}
            </div>
            <div className="library-summary">
              <span>{ELEMENTS[filter].description}</span>
              <b>{ELEMENTS[filter].synergy}</b>
            </div>
            <div className="library-grid">
              {CARDS.filter((c) => c.element === filter).map((c) => (
                <CardView
                  card={c}
                  key={c.id}
                  owned={engine.save.meta.discovered.includes(c.id)}
                />
              ))}
            </div>
            <div className="synergy-library">
              <h3>跨系共鸣图谱</h3>
              {SYNERGIES.map((s) => (
                <div key={s.id}>
                  <b style={{ color: s.color }}>{s.name}</b>
                  <span>
                    {s.requires
                      .map((id) => CARDS.find((c) => c.id === id)?.name)
                      .join(' ＋ ')}
                  </span>
                  <p>{s.description}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="control-grid">
              <span>
                <kbd>WASD</kbd> 移动
              </span>
              <span>
                <kbd>鼠标</kbd> 瞄准
              </span>
              <span>
                <kbd>左键</kbd> 按住射击
              </span>
              <span>
                <kbd>SPACE</kbd> 无敌闪避
              </span>
              <span>
                <kbd>Q</kbd> 近身脉冲
              </span>
              <span>
                <kbd>E</kbd> 引力奇点
              </span>
              <span>
                <kbd>B</kbd> 投放炸弹
              </span>
              <span>
                <kbd>R</kbd> 使用灵药
              </span>
              <span>
                <kbd>ESC</kbd> 暂停 / 继续
              </span>
            </div>
            <div className="help-details">
              <p>
                <b>三种武装</b> ·
                营地选择初始法器、圣剑或重炮。局内工坊与武库可熔接其他武装，按住攻击自动轮替副武装。圣剑＋法器的第三斩发出扇形剑气；圣剑＋重炮产生爆破剑弧；重炮＋法器追加弹片。圣剑前摇后挥砍，可斩掉前方敌弹；不能斩除激光。弹道卡增加符文剑气，元素卡强化剑弧。
              </p>
              <p>
                <b>消耗品</b> · B 在准星方向投放炸弹，0.8
                秒后爆破并清弹，不伤自己；R 消耗灵药恢复 40 生命，满血不会消耗。
              </p>
              <p>
                <b>清场经营</b> ·
                金币买补给或重抽卡牌，钥匙保全箱内协议，炸弹破锁回收资源；血誓以生命换购买力。交易全部可跳过。
              </p>
              <p>
                <b>局外成长</b> ·
                碎片可提前归档。失败仅带回随身碎片的一半，胜利全部带回并奖励 8
                枚；营地升级只影响新行动。
              </p>
              <p>
                <b>相位跃迁</b> ·
                沿移动方向快速穿过敌人和弹幕；静止时沿准星方向。冷却 1.2 秒。
              </p>
              <p>
                <b>湮灭脉冲</b> · Q
                对近身敌人造成伤害和减速，清除范围内弹幕。冷却 6 秒。
              </p>
              <p>
                <b>引力奇点</b> · E
                在瞄准方向投放引力场，牵引普通敌人并持续造成伤害。冷却 10 秒。
              </p>
              <p>
                <b>完整行动</b> · 全图预览 → 沿连线选择节点 → 战斗或遭遇。第
                4、8、12 层为核心。中央祝祷符阵加速
                Q/E；红色陷阱周期触发；实体墙体会阻挡移动、闪避和子弹。守点需在中央半径
                100 内累计驻守 18 秒。
              </p>
              <p>
                <b>进度保存</b> ·
                自动记录区域入口、清场奖励和营地交易。战斗中关闭页面会回到该区入口，血量、击杀和消耗品也恢复到入口状态；已完成的营地交易不会重置。
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
