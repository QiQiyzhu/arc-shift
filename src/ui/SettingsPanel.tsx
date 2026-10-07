import { useTranslation } from './i18n';
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
import { InputSettings } from './InputSettings';
import { SaveManager } from './SaveManager';
import type { ActionInput } from '../input/actions';
import { announceLanguageChange, copy, useLanguage } from './i18n';
export function UtilityPanel({
  mode: requestedMode,
  onClose,
  engine,
  synth,
  controls,
}: {
  mode: 'settings' | 'library' | 'help' | 'lab' | 'workshop' | 'camp' | null;
  onClose: () => void;
  engine: Engine;
  synth: Synth;
  controls?: ActionInput;
}) {
  const t = useTranslation();
  const [, render] = useState(0);
  const [campTab, setCampTab] = useState('workshop');
  const [hybrid, setHybrid] = useState(false);
  const mode = requestedMode === 'camp' ? campTab : requestedMode;
  const [filter, setFilter] = useState<Element>('fire');
  const [trialWeapon, setTrialWeapon] = useState(
    engine.practice ? engine.world.weapon : engine.save.meta.weapon,
  );
  const s = engine.save.settings;
  const language = useLanguage(s.language);
  const ui = (zh: string, en: string) => copy(language, zh, en);
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
          {t(
            mode === 'relics'
              ? ui('遗器陈列', 'Relic Gallery')
              : mode === 'codex'
                ? ui('异常图鉴', 'Anomaly Codex')
                : mode === 'lore'
                  ? ui('记忆残片', 'Memory Shards')
                  : mode === 'workshop'
                    ? ui('行者营地', 'Wayfarer Camp')
                    : mode === 'lab'
                      ? ui('协议试炼', 'Protocol Trial')
                      : mode === 'settings'
                        ? ui('系统设置', 'System Settings')
                        : mode === 'library'
                          ? ui('协议档案', 'Protocol Archive')
                          : ui('行动指南', 'Field Guide'),
          )}
        </DialogTitle>
        <DialogDescription>
          {t(
            mode === 'relics'
              ? ui(
                  '以碎片唤醒旧物，部分遗器需要击破对应核心。',
                  'Awaken relics with shards. Some relics require a core entity to be defeated.',
                )
              : mode === 'lore'
                ? ui(
                    '沿途拾得的只言片语。',
                    'Fragments of thought recovered along the route.',
                  )
                : mode === 'codex'
                  ? ui(
                      '记录实体的招式与留下的痕迹。',
                      'Record entity attacks and the traces they leave behind.',
                    )
                  : mode === 'workshop'
                    ? ui(
                        '将带回的碎片刻入行装。这里的武装用于营地推演；正式行动随机起始。准备升级只影响新行动。',
                        'Spend recovered shards on your loadout. Camp trials use your chosen weapon; live runs start at random. Preparation upgrades apply to new runs.',
                      )
                    : mode === 'lab'
                      ? ui(
                          '选择一套组合，立即感受叠加后的弹道。无敌试炼，不覆盖你的行动存档。',
                          'Choose a build and feel its combined projectiles. Trials are invulnerable and never overwrite your run save.',
                        )
                      : mode === 'settings'
                        ? ui(
                            '调整声音与战斗反馈。设置保存在当前设备。',
                            'Tune audio, combat feedback, and interface language. Settings are saved on this device.',
                          )
                        : mode === 'library'
                          ? ui(
                              '40 项协议，5 种元素。弹体形态、轨迹与命中效果可以自由叠加。',
                              '40 protocols across 5 elements. Combine projectile forms, trajectories, and hit effects.',
                            )
                          : ui(
                              '观察预警，保留一次闪避，在敌人恢复时输出。',
                              'Read telegraphs, save a dash, and strike while enemies recover.',
                            ),
          )}
        </DialogDescription>
        {requestedMode === 'camp' && (
          <nav
            className="camp-tabs"
            aria-label={t(ui('营地分类', 'Camp categories'))}
          >
            {[
              ['workshop', ui('行装养成', 'Loadout')],
              ['relics', ui('遗器', 'Relics')],
              ['library', ui('协议档案', 'Protocols')],
              ['codex', ui('异常图鉴', 'Codex')],
              ['lore', ui('记忆残片', 'Lore')],
              ['lab', ui('协议试炼', 'Trials')],
              ['help', ui('操作指南', 'Guide')],
            ].map(([id, label]) => (
              <button
                key={id}
                className={mode === id ? 'active' : ''}
                onClick={() => setCampTab(id)}
              >
                {t(label)}
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
              language={language}
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
            <WeaponPicker
              value={trialWeapon}
              onChange={setTrialWeapon}
              language={language}
            />
            <div className="switch-row">
              <label htmlFor="hybrid-trial">
                {t(
                  ui(
                    '形态改写 · 将另外两种武装的特性融入主攻击',
                    'Form Rewrite · Blend the other weapons into your primary attack',
                  ),
                )}
              </label>
              <Switch
                id="hybrid-trial"
                checked={hybrid}
                onCheckedChange={setHybrid}
              />
            </div>
            <p className="weapon-trial-note">
              {t(
                ui(
                  '圣剑的元素作用于剑弧，弹道协议增加次生剑气；重炮的弹道与爆破可叠加。试炼不影响资源和营地。',
                  'Sword elements affect the arc; projectile protocols add secondary blades. Cannon trajectories can combine with blasts. Trials do not affect resources or camp progress.',
                ),
              )}
            </p>
            <div className="trial-grid">
              {TRIAL_BUILDS.map((b, i) => (
                <button
                  key={b.name}
                  className={`trial-card trial-${i}`}
                  onClick={() => {
                    synth.unlock();
                    engine.startPractice(
                      b.cards,
                      'weapon' in b ? b.weapon : trialWeapon,
                      hybrid,
                    );
                    onClose();
                  }}
                >
                  <span>EXPERIMENT 0{i + 1}</span>
                  <h3>{t(b.name)}</h3>
                  <b>{t(b.subtitle)}</b>
                  <p>{t(b.description)}</p>
                  <small>{t(ui('进入试炼 →', 'Enter trial →'))}</small>
                </button>
              ))}
            </div>
          </>
        ) : mode === 'settings' ? (
          <>
            <div
              className="language-setting"
              aria-label={t(ui('界面语言', 'Interface language'))}
            >
              <div>
                <label>{t(ui('界面语言', 'Interface language'))}</label>
                <p>
                  {t(
                    ui(
                      '默认中文，可随时切换 English。',
                      'Chinese is the default; switch to English at any time.',
                    ),
                  )}
                </p>
              </div>
              <div className="language-options">
                {(
                  [
                    ['zh', '中文'],
                    ['en', 'English'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={language === id ? 'active' : ''}
                    aria-pressed={language === id}
                    onClick={() => {
                      s.language = id;
                      announceLanguageChange(id);
                      change();
                    }}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-list">
              {(['master', 'music', 'sfx'] as const).map((key, i) => (
                <div className="setting-row" key={key}>
                  <label id={`label-${key}`}>
                    {t(
                      [
                        ui('主音量', 'Master'),
                        ui('音乐', 'Music'),
                        ui('音效', 'SFX'),
                      ][i],
                    )}
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
                <label htmlFor="mute-setting">{t(ui('静音', 'Mute'))}</label>
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
                  <label htmlFor="motion-setting">
                    {t(ui('减少动态效果', 'Reduce motion'))}
                  </label>
                  <p>
                    {t(
                      ui(
                        '关闭震动、角色摆动与残影，减少装饰粒子；保留攻击预警。',
                        'Disable camera shake, actor sway, and afterimages; keep attack telegraphs visible.',
                      ),
                    )}
                  </p>
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
            <div className="switch-row">
              <div>
                <label htmlFor="focused-effects">
                  {t(ui('战斗清晰模式', 'Combat focus mode'))}
                </label>
                <p>
                  {t(
                    ui(
                      '减少装饰粒子与普通伤害飘字，突出敌弹和玩家位置。',
                      'Reduce decorative particles and ordinary damage numbers to emphasize enemy shots and player position.',
                    ),
                  )}
                </p>
              </div>
              <Switch
                id="focused-effects"
                checked={s.focusedEffects === true}
                onCheckedChange={(v) => {
                  s.focusedEffects = v;
                  change();
                }}
              />
            </div>
            {controls && <InputSettings controls={controls} />}
            <div className="settings-note">
              {t(
                ui(
                  '音乐随区域与战斗变化；重炮和受击声会短暂突出。',
                  'Music changes with each area and combat state; cannon fire and damage sounds briefly cut through.',
                ),
              )}
              <br />
              {t(
                engine.storageAvailable
                  ? ui('设置已自动保存', 'Settings are saved automatically')
                  : ui(
                      '浏览器存储不可用，设置在本次会话内有效。',
                      'Browser storage is unavailable; settings last for this session.',
                    ),
              )}
            </div>
            <SaveManager
              engine={engine}
              onRestore={() => {
                synth.settings = { ...engine.save.settings };
                onClose();
              }}
            />
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
                  {t(ELEMENTS[el].name)}
                </button>
              ))}
            </div>
            <div className="library-summary">
              <span>{t(ELEMENTS[filter].description)}</span>
              <b>{t(ELEMENTS[filter].synergy)}</b>
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
              <h3>{t('跨系共鸣图谱')}</h3>
              {SYNERGIES.map((s) => (
                <div key={s.id}>
                  <b style={{ color: s.color }}>{t(s.name)}</b>
                  <span>
                    {t(
                      s.requires
                        .map((id) => CARDS.find((c) => c.id === id)?.name)
                        .join(' ＋ '),
                    )}
                  </span>
                  <p>{t(s.description)}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p>
              {t(
                ui(
                  '以下为默认操作；可在「系统设置 → 操作设置」修改，战斗界面显示当前按键。',
                  'Default controls are listed below. Change them in System Settings → Input; the HUD shows your active bindings.',
                ),
              )}
            </p>
            <div className="control-grid">
              <span>
                <kbd>WASD</kbd> {t(ui('移动', 'Move'))}
              </span>
              <span>
                <kbd>{t(ui('鼠标', 'Mouse'))}</kbd> {t(ui('瞄准', 'Aim'))}
              </span>
              <span>
                <kbd>{t(ui('左键', 'LMB'))}</kbd>{' '}
                {t(ui('按住射击', 'Hold to fire'))}
              </span>
              <span>
                <kbd>SPACE</kbd> {t(ui('无敌闪避', 'Invulnerable dash'))}
              </span>
              <span>
                <kbd>Q</kbd> {t(ui('近身脉冲', 'Close-range pulse'))}
              </span>
              <span>
                <kbd>E</kbd> {t(ui('引力奇点', 'Gravity singularity'))}
              </span>
              <span>
                <kbd>B</kbd> {t(ui('投放炸弹', 'Deploy bomb'))}
              </span>
              <span>
                <kbd>R</kbd> {t(ui('使用灵药', 'Use tonic'))}
              </span>
              <span>
                <kbd>ESC</kbd> {t(ui('暂停 / 继续', 'Pause / resume'))}
              </span>
            </div>
            <div className="help-details">
              <p>
                <b>{t('三种武装')}</b>{' '}
                {t(
                  '· 正式行动随机获得法器、圣剑或重炮；相同种子保持相同武器，读档保留原武器。工坊熔接会改造主攻击的弹体或命中效果。近距离剑击推开普通敌人，短促顿挫不会冻结玩家移动；首领抵抗击退。陨星＋光矛形成停留后贯穿的重弹。回旋＋冰霜把圣剑第三斩改为回收冰刃，失去这次宽扇面攻击和扫弹。激光不能斩除。',
                )}
              </p>
              <p>
                <b>{t('消耗品')}</b>{' '}
                {t(
                  '· B 在准星方向投放炸弹，0.8 秒后爆破并清弹，不伤自己；R 消耗灵药恢复 40 生命，满血不会消耗。',
                )}
              </p>
              <p>
                <b>{t('清场经营')}</b>{' '}
                {t(
                  '· 金币买补给或重抽卡牌，钥匙保全箱内协议，炸弹破锁回收资源；血誓以生命换购买力。交易全部可跳过。',
                )}
              </p>
              <p>
                <b>{t('局外成长')}</b>{' '}
                {t(
                  '· 碎片可提前归档。失败仅带回随身碎片的一半，胜利全部带回并奖励 8 枚；营地升级只影响新行动。',
                )}
              </p>
              <p>
                <b>{t('相位跃迁')}</b>{' '}
                {t(
                  '· 沿移动方向快速穿过敌人和弹幕；静止时沿准星方向。冷却 1.2 秒。',
                )}
              </p>
              <p>
                <b>{t('湮灭脉冲')}</b>{' '}
                {t('· Q 对近身敌人造成伤害和减速，清除范围内弹幕。冷却 6 秒。')}
              </p>
              <p>
                <b>{t('引力奇点')}</b>{' '}
                {t(
                  '· E 在瞄准方向投放引力场，牵引普通敌人并持续造成伤害。冷却 10 秒。',
                )}
              </p>
              <p>
                <b>{t('完整行动')}</b>{' '}
                {t(
                  '· 全图预览 → 沿连线选择节点 → 战斗或遭遇。第 4、8、12 层为核心。中央祝祷符阵加速 Q/E；红色陷阱周期触发；实体墙体会阻挡移动、闪避和子弹。守点需在中央半径 100 内累计驻守 18 秒。',
                )}
              </p>
              <p>
                <b>{t('进度保存')}</b>{' '}
                {t(
                  '· 自动记录区域入口、清场奖励和营地交易。战斗中关闭页面会回到该区入口，血量、击杀和消耗品也恢复到入口状态；已完成的营地交易不会重置。',
                )}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
