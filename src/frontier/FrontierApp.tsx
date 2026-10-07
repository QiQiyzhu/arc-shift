import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Crosshair,
  Flag,
  Gem,
  Languages,
  Map,
  Pause,
  Play,
  Radio,
  Shield,
  Swords,
  Truck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { FrontierSession, type FrontierMission } from './session';
import { FrontierArena } from './FrontierArena';
import { Synth } from '../audio/synth';
import { announceLanguageChange, copy, useLanguage } from '../ui/i18n';
import { loadSave, writeSave } from '../core/save';
import { loadBindings, keyLabel } from '../input/bindings';
import { CARDS } from '../cards/catalog';
import { WeaponIcon } from '../ui/EconomyPanels';
import type { WeaponId } from '../game/types';
import './frontier.css';

const missions: Record<
  FrontierMission,
  { zh: string; en: string; zhHint: string; enHint: string; tag: string }
> = {
  relay: {
    zh: '重连失落信标',
    en: 'Reconnect the lost relays',
    zhHint:
      '进入 A、B、C 光圈，清除附近敌人并各驻留 3.2 秒。可自由选择占领顺序；每处信标恢复 12 护盾。',
    enHint:
      'Enter rings A, B and C. Clear nearby enemies and hold each for 3.2 seconds, in any order. Each relay grants 12 shield.',
    tag: '01 / RELAY NETWORK',
  },
  salvage: {
    zh: '寻回林地遗物',
    en: 'Recover the grove relics',
    zhHint:
      '靠近遗物自动拾取，每次携带一件；移动速度降至 72%。返回左下回收舱交付，先清除舱边敌人。每件恢复 12 生命。',
    enHint:
      'Approach a relic to carry it. Carry one at a time at 72% speed. Return to the extraction bay at lower left and clear nearby hostiles to deposit. Each delivery restores 12 health.',
    tag: '02 / RELIC RECOVERY',
  },
  escort: {
    zh: '护送余烬核心',
    en: 'Escort the cinder core',
    zhHint:
      '留在移动核心的护送圈内，沿轨道抵达右上接驳点。离开范围或敌人进入核心周围时运输暂停；清除敌人后继续。',
    enHint:
      'Stay inside the core’s escort ring as it follows the rail to the upper-right rendezvous. The core stops when you leave or hostiles approach. Clear them to continue.',
    tag: '02 / CORE CONVOY',
  },
  boss: {
    zh: '切断终端守卫',
    en: 'Silence the terminal guardian',
    zhHint:
      '击败路线对应的守卫。两侧压制节点可各驻留 3.2 秒激活：获得 12 护盾，并削去守卫 18% 最大生命。节点可选；留意地面预警。',
    enHint:
      'Defeat your route’s guardian. Optional suppression nodes take 3.2 seconds to activate, grant 12 shield and remove 18% of the guardian’s maximum health each. Watch the attack telegraphs.',
    tag: '03 / TERMINAL GUARDIAN',
  },
};
const weaponNames: Record<WeaponId, [string, string]> = {
  arc: ['法器', 'ARC CASTER'],
  sword: ['圣剑', 'OATH BLADE'],
  cannon: ['重炮', 'SIEGE CANNON'],
};
const weaponHints: Record<WeaponId, [string, string]> = {
  arc: ['电弧连锁 · 冰霜控场', 'Chain lightning · Frost control'],
  sword: ['近身横扫 · 快速跃迁', 'Close sweeps · Swift dash'],
  cannon: ['陨星炮击 · 范围爆破', 'Meteor rounds · Area blast'],
};
const fallbackArt = (event: React.SyntheticEvent<HTMLImageElement>) => {
  if (event.currentTarget.src.includes('-v23.webp'))
    event.currentTarget.src = event.currentTarget.src.replace(
      '-v23.webp',
      '.webp',
    );
};
export default function FrontierApp({ onBack }: { onBack?: () => void }) {
  const [session, setSession] = useState(() => new FrontierSession()),
    [sound] = useState(() => new Synth()),
    [settings] = useState(() => loadSave().settings),
    [bindings] = useState(loadBindings),
    [, render] = useState(0),
    [help, setHelp] = useState(false),
    [exit, setExit] = useState(false),
    removeUnload = useRef<(() => void) | null>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const language = useLanguage(settings.language),
    c = (zh: string, en: string) => copy(language, zh, en),
    refresh = () => render((n) => n + 1),
    w = session.engine.world,
    mission = missions[session.mission],
    combat = session.state === 'combat';
  useEffect(() => {
    sound.settings = { ...settings };
    return () => sound.dispose();
  }, [sound, settings]);
  useEffect(() => {
    session.activate();
    session.engine.save.settings = { ...sound.settings };
    return () => session.dispose();
  }, [session, sound]);
  useEffect(() => {
    if (!combat) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', unload);
    const remove = () => window.removeEventListener('beforeunload', unload);
    removeUnload.current = remove;
    return remove;
  }, [combat]);
  useEffect(() => {
    if (!help && !exit) return;
    const prior = document.activeElement as HTMLElement | null;
    const first = dialog.current?.querySelector<HTMLButtonElement>('button');
    first?.focus();
    const modalKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setHelp(false);
        setExit(false);
      } else if (event.key === 'Tab') {
        const buttons = [
          ...(dialog.current?.querySelectorAll<HTMLButtonElement>('button') ??
            []),
        ];
        const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          buttons[0]?.focus();
        }
      }
    };
    window.addEventListener('keydown', modalKeys, true);
    return () => {
      window.removeEventListener('keydown', modalKeys, true);
      prior?.focus();
    };
  }, [help, exit]);
  function unlock() {
    try {
      sound.unlock();
    } catch {
      /* Input remains available if audio is unavailable. */
    }
  }
  function run(action: () => unknown) {
    unlock();
    action();
    refresh();
  }
  function home() {
    removeUnload.current?.();
    if (onBack) onBack();
    else location.assign('/');
  }
  function leave() {
    if (combat) {
      if (w.phase !== 'paused') session.engine.pause();
      setExit(true);
    } else home();
  }
  function languageToggle() {
    const save = loadSave(),
      next = language === 'zh' ? 'en' : 'zh';
    save.settings.language = next;
    writeSave(save);
    sound.settings.language = next;
    session.engine.save.settings.language = next;
    announceLanguageChange(next);
  }
  function mute() {
    unlock();
    sound.settings.muted = !sound.settings.muted;
    const save = loadSave();
    save.settings.muted = sound.settings.muted;
    writeSave(save);
    refresh();
  }
  function showHelp() {
    if (combat && w.phase !== 'paused') session.engine.pause();
    setHelp(true);
  }
  function restart() {
    setSession(new FrontierSession());
    setHelp(false);
    setExit(false);
  }
  const key = (action: 'dash' | 'q' | 'e' | 'bomb' | 'heal') =>
    keyLabel(
      bindings.keys[
        (
          {
            dash: 'Dash',
            q: 'Pulse',
            e: 'Gravity',
            bomb: 'Bomb',
            heal: 'Potion',
          } as const
        )[action]
      ][0] ?? '',
    );
  const objectiveStatus = () => {
    const o = session.objective;
    if (o.kind === 'relay')
      return c(
        `信标 ${o.nodes.filter((n) => n.active).length} / 3`,
        `RELAYS ${o.nodes.filter((n) => n.active).length} / 3`,
      );
    if (o.kind === 'salvage')
      return o.cargo !== null
        ? c(
            `携带遗物 · 已交付 ${o.delivered} / 3`,
            `CARRYING · DELIVERED ${o.delivered} / 3`,
          )
        : c(`回收 ${o.delivered} / 3`, `RECOVERED ${o.delivered} / 3`);
    if (o.kind === 'escort')
      return c(
        `运输 ${Math.floor(session.progress * 100)}%`,
        `CONVOY ${Math.floor(session.progress * 100)}%`,
      );
    return c(
      `压制节点 ${o.nodes.filter((n) => n.active).length} / 2`,
      `SUPPRESSION ${o.nodes.filter((n) => n.active).length} / 2`,
    );
  };
  const total = session.results.reduce(
    (r, row) => ({
      seconds: r.seconds + row.seconds,
      kills: r.kills + row.kills,
      damageTaken: r.damageTaken + row.damageTaken,
    }),
    { seconds: 0, kills: 0, damageTaken: 0 },
  );
  return (
    <main className={`frontier-shell frontier-${session.biome}`}>
      <header className="frontier-header">
        <button
          className="frontier-brand"
          onClick={leave}
          aria-label={c('返回主菜单', 'Return to main menu')}
        >
          ARC<span>{'//'}</span>SHIFT <small>FRONTIER</small>
        </button>
        <div className="frontier-header-meta">
          <span>EXPEDITION 23</span>
          <b>{c('边境行动', 'Frontier Operations')}</b>
        </div>
        <nav aria-label={c('行动选项', 'Operation options')}>
          <button
            onClick={languageToggle}
            aria-label={c('切换为 English', 'Switch to 中文')}
          >
            <Languages size={16} />
            {language === 'zh' ? 'EN' : '中文'}
          </button>
          <button onClick={mute} aria-label={c('切换静音', 'Toggle mute')}>
            {sound.settings.muted ? (
              <VolumeX size={17} />
            ) : (
              <Volume2 size={17} />
            )}
          </button>
          <button onClick={showHelp}>{c('操作帮助', 'Controls')}</button>
          <button onClick={leave}>
            <X size={17} />
            <span>{c('离开', 'Leave')}</span>
          </button>
        </nav>
      </header>
      <div
        className="frontier-chapters"
        aria-label={c('行动进度', 'Operation progress')}
      >
        {[
          c('信标重连', 'RELAY NETWORK'),
          c('路线行动', 'ROUTE OBJECTIVE'),
          c('终端守卫', 'GUARDIAN'),
        ].map((title, i) => (
          <span
            key={i}
            className={
              i === session.stage
                ? 'current'
                : i < session.stage
                  ? 'complete'
                  : ''
            }
          >
            <i>{i < session.stage ? '✓' : String(i + 1).padStart(2, '0')}</i>
            {title}
          </span>
        ))}
      </div>
      {session.state === 'briefing' && (
        <section className="frontier-briefing">
          <div
            className="frontier-hero"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(5, 16, 24, .95), rgba(5, 16, 24, .34)), url('/art/${session.biome}-v23.webp'), url('/art/${session.biome}.webp')`,
            }}
          >
            <span className="frontier-eyebrow">{mission.tag}</span>
            <h1>
              {session.stage === 0
                ? c(
                    '穿过边境，\n让信号再次抵达。',
                    'Cross the frontier.\nBring the signal home.',
                  )
                : c(mission.zh, mission.en)}
            </h1>
            <p>
              {session.stage === 0
                ? c(
                    '以三个连通的任务重新探索废弃世界。自由占领信标、决定航路，再把遗物或能源带回终端。',
                    'Reconnect an abandoned world through three linked operations. Capture the relays in any order, choose a route, and bring relics or energy to the terminal.',
                  )
                : c(mission.zhHint, mission.enHint)}
            </p>
            <div className="frontier-mission-tags">
              <span>
                <Radio size={14} />
                {c('场景交互', 'World objectives')}
              </span>
              <span>
                <Map size={14} />
                {c('双路线', 'Two routes')}
              </span>
              <span>
                <Swords size={14} />
                {c('三种武器', 'Three weapons')}
              </span>
            </div>
          </div>
          <aside className="frontier-deployment">
            <span className="frontier-eyebrow">
              {c('行动部署', 'DEPLOYMENT')}
            </span>
            <h2>{c(mission.zh, mission.en)}</h2>
            <p className="frontier-rule">{c(mission.zhHint, mission.enHint)}</p>
            {session.stage === 0 ? (
              <>
                <div
                  className="frontier-loadouts"
                  aria-label={c('选择主武器', 'Choose your primary weapon')}
                >
                  {(Object.keys(weaponNames) as WeaponId[]).map((id) => (
                    <button
                      key={id}
                      aria-pressed={w.weapon === id}
                      onClick={() => run(() => session.chooseWeapon(id))}
                    >
                      <WeaponIcon id={id} size={24} />
                      <span>
                        <b>{c(...weaponNames[id])}</b>
                        <small>{c(...weaponHints[id])}</small>
                      </span>
                      <i>{w.weapon === id ? '●' : '○'}</i>
                    </button>
                  ))}
                </div>
                <label className="frontier-assist">
                  <input
                    type="checkbox"
                    checked={session.assisted}
                    onChange={(event) =>
                      run(() => session.setAssisted(event.target.checked))
                    }
                  />
                  <span>
                    {c('辅助演练 · 免伤', 'Assisted practice · Invulnerable')}
                    <small>
                      {c(
                        '完成记录会保留辅助标记。',
                        'Recorded as an assisted run.',
                      )}
                    </small>
                  </span>
                </label>
              </>
            ) : (
              <div className="frontier-continuity">
                <Shield size={22} />
                <span>
                  {c(
                    '已补给 35 生命，保留当前构筑。',
                    'Restored 35 health. Your build carries forward.',
                  )}
                  <b>
                    {Math.ceil(w.player.hp)} / {w.player.maxHp} HP
                  </b>
                </span>
              </div>
            )}
            <button
              className="frontier-primary"
              onClick={() => run(() => session.start())}
            >
              <span>{c('开始行动', 'Deploy')}</span>
              <ArrowRight size={19} />
            </button>
            <small className="frontier-deploy-note">
              {c(
                '独立行动约 3–5 分钟 · 不消耗主线资源',
                'Standalone operation · About 3–5 minutes · No campaign cost',
              )}
            </small>
          </aside>
        </section>
      )}
      {session.state !== 'briefing' && (
        <section className="frontier-field">
          <div className="frontier-field-heading">
            <div>
              <span className="frontier-eyebrow">{mission.tag}</span>
              <h1>{c(mission.zh, mission.en)}</h1>
            </div>
            <span className="frontier-operation-clock">
              {Math.floor(session.seconds / 60)}:
              {String(Math.floor(session.seconds % 60)).padStart(2, '0')}{' '}
              <small>
                / {Math.floor(session.limit / 60)}:
                {String(session.limit % 60).padStart(2, '0')}
              </small>
            </span>
          </div>
          <div className="frontier-stage">
            <FrontierArena
              session={session}
              sound={sound}
              language={language}
              onTick={refresh}
              blocked={help || exit || session.state !== 'combat'}
            />
            <div className="frontier-top-hud">
              <div className="frontier-health">
                <div>
                  <b>{c(...weaponNames[w.weapon])}</b>
                  <span>
                    {Math.ceil(Math.max(0, w.player.hp))}
                    <small> / {w.player.maxHp}</small>
                  </span>
                </div>
                <div className="frontier-health-track">
                  <i
                    style={{
                      width: `${Math.max(0, (w.player.hp / w.player.maxHp) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {c('护盾', 'SHIELD')} {Math.ceil(w.player.shield)}
                  {session.assisted && (
                    <em>{c('辅助演练 · 免伤', 'ASSISTED · INVULNERABLE')}</em>
                  )}
                </small>
              </div>
              <div className="frontier-objective-chip">
                <Flag size={17} />
                <span>{objectiveStatus()}</span>
                <b>{Math.floor(session.progress * 100)}%</b>
              </div>
              {combat && (
                <button
                  className="frontier-pause"
                  onClick={() => run(() => session.engine.pause())}
                  aria-label={c('暂停行动', 'Pause operation')}
                >
                  <Pause size={19} />
                </button>
              )}
            </div>
            {combat && w.boss && (
              <div className="frontier-boss">
                <b>
                  {session.route === 'grove'
                    ? c('挽歌圣母', 'THE ELEGY MATRON')
                    : c('灰烬执政官', 'THE ASH REGENT')}
                </b>
                <div>
                  <i
                    style={{
                      width: `${Math.max(0, (w.boss.hp / w.boss.maxHp) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {c('阶段', 'PHASE')} {w.boss.phase}
                </small>
              </div>
            )}
            {combat && ['transition', 'bossIntro'].includes(w.phase) && (
              <div className="frontier-intro">
                <span>{mission.tag}</span>
                <h2>{c(mission.zh, mission.en)}</h2>
                <p>{c(mission.zhHint, mission.enHint)}</p>
              </div>
            )}
            {combat && w.phase === 'paused' && !help && !exit && (
              <div className="frontier-overlay">
                <div className="frontier-dialog">
                  <Pause size={28} />
                  <h2>{c('行动暂停', 'Operation paused')}</h2>
                  <p>
                    {c('准备好后继续当前任务。', 'Resume when you are ready.')}
                  </p>
                  <button
                    className="frontier-primary"
                    onClick={() => run(() => session.engine.pause())}
                  >
                    <Play size={17} />
                    {c('继续行动', 'Resume operation')}
                  </button>
                </div>
              </div>
            )}
            {session.state === 'route' && (
              <div className="frontier-overlay">
                <div className="frontier-route-panel">
                  <span className="frontier-eyebrow">SIGNAL RESTORED</span>
                  <h2>
                    {c(
                      '信号已连通。选择下一条航路。',
                      'Signal restored. Choose your next route.',
                    )}
                  </h2>
                  <p>
                    {c(
                      '路线改变任务目标、战场、协议奖励与终端守卫。',
                      'Your route changes the objective, battlefield, protocol rewards and final guardian.',
                    )}
                  </p>
                  <div className="frontier-route-cards">
                    <button
                      onClick={() => run(() => session.chooseRoute('grove'))}
                    >
                      <img
                        src="/art/grove-v23.webp"
                        alt=""
                        onError={fallbackArt}
                      />
                      <span>
                        <Gem size={25} />
                        <small>
                          {c(
                            '悼亡林地 / 遗物回收',
                            'MOURNING GROVE / RECOVERY',
                          )}
                        </small>
                        <b>
                          {c('收集、运送、撤离', 'Collect, carry, extract')}
                        </b>
                        <p>
                          {c(
                            '一次一件带回三份遗物。获得冰霜穿透、移动强化与圣剑融合形态。',
                            'Carry three relics back one by one. Gain frost piercing, movement speed and a fused blade form.',
                          )}
                        </p>
                        <strong>
                          {c('选择林地航路', 'Take the grove route')}{' '}
                          <ArrowRight size={17} />
                        </strong>
                      </span>
                    </button>
                    <button
                      onClick={() => run(() => session.chooseRoute('foundry'))}
                    >
                      <img
                        src="/art/foundry-v23.webp"
                        alt=""
                        onError={fallbackArt}
                      />
                      <span>
                        <Truck size={25} />
                        <small>
                          {c('余烬铸庭 / 核心护送', 'CINDER COURT / ESCORT')}
                        </small>
                        <b>
                          {c('贴近、清敌、推进', 'Stay close, clear, advance')}
                        </b>
                        <p>
                          {c(
                            '护送核心穿越折返轨道。获得强化燃烧与重炮融合形态。',
                            'Escort the core through a winding rail. Gain stronger burning and a fused cannon form.',
                          )}
                        </p>
                        <strong>
                          {c('选择铸庭航路', 'Take the foundry route')}{' '}
                          <ArrowRight size={17} />
                        </strong>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {session.state === 'interlude' && (
              <div className="frontier-overlay">
                <div className="frontier-dialog">
                  <Flag size={30} />
                  <span className="frontier-eyebrow">OBJECTIVE SECURED</span>
                  <h2>
                    {c(
                      '目标已完成，终端已定位。',
                      'Objective secured. Terminal located.',
                    )}
                  </h2>
                  <p>
                    {c(
                      '下一站面对终端守卫。补给恢复 35 生命，并补充 1 枚炸弹。',
                      'The terminal guardian awaits. Resupply restores 35 health and adds one bomb.',
                    )}
                  </p>
                  <button
                    className="frontier-primary"
                    onClick={() => run(() => session.next())}
                  >
                    {c('前往终端', 'Proceed to terminal')}
                    <ArrowRight size={19} />
                  </button>
                </div>
              </div>
            )}
            {(session.state === 'finished' || session.state === 'failed') && (
              <div className="frontier-overlay">
                <div className="frontier-result">
                  <span className="frontier-eyebrow">
                    {session.state === 'finished'
                      ? 'FRONTIER RECONNECTED'
                      : 'SIGNAL INTERRUPTED'}
                  </span>
                  <h2>
                    {session.state === 'finished'
                      ? c('边境重新连通', 'The frontier is connected')
                      : session.results.at(-1)?.outcome === 'timeout'
                        ? c('行动时间耗尽', 'Operation timed out')
                        : c('信号暂时中断', 'The signal has been lost')}
                  </h2>
                  <p>
                    {session.assisted
                      ? c(
                          '辅助演练 · 本次启用了免伤。',
                          'Assisted practice · Invulnerability was enabled.',
                        )
                      : c(
                          '常规行动 · 本次未启用免伤。',
                          'Standard operation · Invulnerability was disabled.',
                        )}
                  </p>
                  <div className="frontier-result-stats">
                    <span>
                      <b>{Math.round(total.seconds)}s</b>
                      {c('行动时间', 'Operation time')}
                    </span>
                    <span>
                      <b>{total.kills}</b>
                      {c('击败敌人', 'Hostiles defeated')}
                    </span>
                    <span>
                      <b>{Math.round(total.damageTaken)}</b>
                      {c('承受伤害', 'Damage taken')}
                    </span>
                  </div>
                  <div className="frontier-result-rows">
                    {session.results.map((row, i) => (
                      <div key={i}>
                        <span>
                          0{i + 1} /{' '}
                          {c(
                            missions[row.mission].zh,
                            missions[row.mission].en,
                          )}
                        </span>
                        <b>
                          {row.outcome === 'clear'
                            ? c('完成', 'CLEAR')
                            : c('未完成', 'INCOMPLETE')}
                        </b>
                        <small>{Math.round(row.seconds)}s</small>
                      </div>
                    ))}
                  </div>
                  <div className="frontier-result-actions">
                    <button className="frontier-primary" onClick={restart}>
                      {c(
                        '重新部署 · 尝试另一航路',
                        'Redeploy · Try the other route',
                      )}
                      <ArrowRight size={17} />
                    </button>
                    <button onClick={home}>
                      {c('返回主菜单', 'Main menu')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="frontier-bottom-hud">
            <span>
              <Crosshair size={16} />
              {c('鼠标攻击', 'Mouse attack')}
            </span>
            <span>
              <kbd>{key('dash')}</kbd>
              {c('跃迁', 'Dash')}
            </span>
            <span className={w.player.qCd > 0 ? 'cooling' : ''}>
              <kbd>{key('q')}</kbd>
              {c('震荡', 'Pulse')}{' '}
              {w.player.qCd > 0
                ? `${w.player.qCd.toFixed(1)}s`
                : c('就绪', 'Ready')}
            </span>
            <span className={w.player.eCd > 0 ? 'cooling' : ''}>
              <kbd>{key('e')}</kbd>
              {c('引力井', 'Gravity well')}{' '}
              {w.player.eCd > 0
                ? `${w.player.eCd.toFixed(1)}s`
                : c('就绪', 'Ready')}
            </span>
            <span>
              <kbd>{key('bomb')}</kbd>
              {c('炸弹', 'Bomb')} ×{w.wallet.bombs}
            </span>
            <span>
              <kbd>{key('heal')}</kbd>
              {c('药剂', 'Tonic')} ×{w.wallet.tonics}
            </span>
          </div>
          <div className="frontier-field-note">
            <Radio size={15} />
            <span>{c(mission.zhHint, mission.enHint)}</span>
          </div>
        </section>
      )}
      <footer className="frontier-footer">
        <span>{c('当前协议', 'ACTIVE PROTOCOLS')}</span>
        <div>
          {w.cards.map((id) => {
            const card = CARDS.find((row) => row.id === id);
            return card ? <span key={id}>{c(card.name, card.en)}</span> : null;
          })}
        </div>
        <small>
          {c(
            '生命与构筑在三段行动间延续',
            'Health and build persist across all three stages',
          )}
        </small>
      </footer>
      {help && (
        <div className="frontier-modal">
          <dialog
            ref={dialog}
            open
            className="frontier-dialog"
            aria-modal="true"
            aria-label={c('操作帮助', 'Controls')}
          >
            <h2>{c('行动操作', 'Operation controls')}</h2>
            <p>
              {c(
                'WASD / 方向键移动，鼠标瞄准，按住鼠标主键攻击。进入目标光圈即可互动，无需额外按键。',
                'Move with WASD / arrow keys. Aim with the mouse and hold the attack button to fire. Enter objective rings to interact automatically.',
              )}
            </p>
            <div className="frontier-help-keys">
              <span>
                <kbd>{key('dash')}</kbd>
                {c('跃迁闪避', 'Dash / evade')}
              </span>
              <span>
                <kbd>{key('q')}</kbd>
                {c('震荡脉冲', 'Shock pulse')}
              </span>
              <span>
                <kbd>{key('e')}</kbd>
                {c('引力奇点', 'Gravity well')}
              </span>
              <span>
                <kbd>{key('bomb')}</kbd>
                {c('投掷炸弹', 'Throw bomb')}
              </span>
              <span>
                <kbd>{key('heal')}</kbd>
                {c('使用药剂', 'Use tonic')}
              </span>
              <span>
                <kbd>Esc</kbd>
                {c('暂停', 'Pause')}
              </span>
            </div>
            <p>
              {c(
                '红色预警表示敌方攻击范围；薄荷色圈为可互动目标。目标显示「受干扰」时先清理圈边敌人。退出或刷新会结束本次独立行动。',
                'Red telegraphs mark hostile attacks; mint rings mark objectives. Clear nearby hostiles when a target reads “contested”. Leaving or reloading ends this standalone operation.',
              )}
            </p>
            <button className="frontier-primary" onClick={() => setHelp(false)}>
              {c('明白了', 'Understood')}
            </button>
          </dialog>
        </div>
      )}
      {exit && (
        <div className="frontier-modal">
          <dialog
            ref={dialog}
            open
            className="frontier-dialog"
            aria-modal="true"
            aria-label={c('离开行动', 'Leave operation')}
          >
            <h2>{c('离开本次行动？', 'Leave this operation?')}</h2>
            <p>
              {c(
                '当前独立行动进度不会保存；主线存档保留。',
                'Progress in this standalone operation will not be saved. Your campaign save is retained.',
              )}
            </p>
            <button className="frontier-primary" onClick={home}>
              {c('离开行动', 'Leave operation')}
            </button>
            <button onClick={() => setExit(false)}>
              {c('留在这里', 'Stay here')}
            </button>
          </dialog>
        </div>
      )}
    </main>
  );
}
