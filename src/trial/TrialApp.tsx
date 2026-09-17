import { useEffect, useState } from 'react';
import {
  Flame,
  Zap,
  Snowflake,
  Orbit,
  ArrowUpRight,
  Shield,
  Crosshair,
} from 'lucide-react';
import { BuildTrialSession } from './session';
import { DEFAULT_TRIAL, type TrialConfig } from './config';
import { CARDS } from '../cards/catalog';
import { DEFAULT_CONTENT } from '../content/schema';
import { ENEMIES } from '../data/enemies';
import { protocolPreview } from '../cards/preview';
import { activeSynergies } from '../cards/synergies';
import { loadSave } from '../core/save';
import { keyLabel, loadBindings } from '../input/bindings';
import { Synth } from '../audio/synth';
import { TrialArena } from './TrialArena';
import './trial.css';
const icons = {
  fire: Flame,
  storm: Zap,
  frost: Snowflake,
  void: Orbit,
  shift: ArrowUpRight,
};
export default function TrialApp({
  config = DEFAULT_TRIAL,
  onBack,
}: {
  config?: TrialConfig;
  onBack?: () => void;
}) {
  const [session, setSession] = useState(() => new BuildTrialSession(config)),
    [, render] = useState(0),
    [focus, setFocus] = useState(''),
    [message, setMessage] = useState(''),
    [exit, setExit] = useState(false);
  const [sound] = useState(() => new Synth()),
    [bindings] = useState(loadBindings);
  const refresh = () => render((n) => n + 1),
    w = session.engine.world,
    stage = session.config.stages[session.stage];
  useEffect(() => {
    session.activate();
    sound.settings = { ...loadSave().settings };
    session.engine.save.settings = { ...sound.settings };
    return () => {
      session.dispose();
      sound.dispose();
    };
  }, [session, sound]);
  useEffect(() => {
    if (session.state !== 'combat') return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session.state]);
  function leave() {
    if (session.state === 'combat') {
      if (w.phase !== 'paused') session.engine.pause();
      setExit(true);
    } else if (onBack) onBack();
    else location.assign('/');
  }
  function unlock() {
    try {
      sound.unlock();
    } catch {
      /* Gameplay remains available without audio. */
    }
  }
  function restart() {
    setSession(new BuildTrialSession(config));
    setFocus('');
    setMessage('');
    setExit(false);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(session.export(), null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ARC-SHIFT-构筑记录.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const offered = session.config.offers.filter(
      (o) => o.unlock <= session.stage,
    ),
    selected = session.config.offers.filter((o) =>
      session.cards.includes(o.id),
    );
  const preview =
    focus && !session.cards.includes(focus) ? protocolPreview(w, focus) : null;
  const synergies = activeSynergies(session.cards, 'arc');
  const completed =
    session.state === 'result' ||
    session.state === 'finished' ||
    session.state === 'failed';
  const last = session.results.at(-1);
  const key = (action: keyof typeof bindings.keys) =>
    keyLabel(bindings.keys[action][0] ?? '');
  return (
    <main className="trial-shell">
      <header className="trial-header">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            leave();
          }}
        >
          ARC<span>{'//'}</span>SHIFT
        </a>
        <span>
          THE ASTRAL FORGE <i>/</i> 星铸协议
        </span>
        <button onClick={leave}>{onBack ? '返回配置' : '返回主菜单'}</button>
      </header>
      <nav className="trial-stages" aria-label="试炼进度">
        {session.config.stages.map((s, i) => (
          <div
            key={s.name}
            className={
              i === session.stage ? 'current' : i < session.stage ? 'done' : ''
            }
          >
            <b>0{i + 1}</b>
            <span>
              {s.name}
              <small>
                {i < session.stage
                  ? '已完成'
                  : i === session.stage
                    ? '当前阶段'
                    : '下一阶段'}
              </small>
            </span>
          </div>
        ))}
      </nav>
      {session.state === 'planning' ? (
        <section className="trial-planning">
          <div className="trial-heading">
            <div>
              <p>BUILD · FIGHT · RECONSIDER</p>
              <h1>
                {session.stage === 0
                  ? '每一格能量，都有代价。'
                  : '下一场，重新作出选择。'}
              </h1>
              <span>
                固定法器 · 等级 3 · 最多 {config.slots} 个协议 ·
                阶段间可原价撤下重配
              </span>
            </div>
            <div className="trial-budget">
              <strong aria-label="剩余额度">{session.remaining}</strong>
              <span>
                / {session.capacity}
                <small>剩余可用能量</small>
              </span>
            </div>
          </div>
          <div className="trial-workbench">
            <section className="trial-catalog" aria-label="协议目录">
              <div className="trial-section-title">
                <h2>配置你的攻击</h2>
                <span>
                  {session.cards.length} / {config.slots} 槽位
                </span>
              </div>
              <div className="trial-card-grid">
                {offered.map((o) => {
                  const card = CARDS.find((c) => c.id === o.id)!,
                    Icon = icons[card.element],
                    equipped = session.cards.includes(o.id),
                    custom =
                      JSON.stringify(
                        w.content.cards.find((c) => c.id === o.id),
                      ) !==
                      JSON.stringify(
                        DEFAULT_CONTENT.cards.find((c) => c.id === o.id),
                      );
                  return (
                    <button
                      key={o.id}
                      className={`trial-card element-${card.element} ${equipped ? 'equipped' : ''}`}
                      aria-label={`${equipped ? '撤下' : '装备'}${card.name}`}
                      aria-pressed={equipped}
                      onMouseEnter={() => setFocus(o.id)}
                      onFocus={() => setFocus(o.id)}
                      onClick={() => {
                        if (!session.toggle(o.id))
                          setMessage(
                            '检查剩余额度、槽位与前置协议；先撤下依赖它的协议再调整。',
                          );
                        else setMessage('');
                        refresh();
                      }}
                    >
                      <div>
                        <Icon size={25} />
                        <span className="trial-cost">
                          {o.cost}
                          <small>能量</small>
                        </span>
                      </div>
                      <h3>{card.name}</h3>
                      <b>{o.role}</b>
                      <p>
                        {custom
                          ? '自定义参数 · 以右侧实时预览为准'
                          : card.preview}
                      </p>
                      <span className="trial-tradeoff">
                        {custom
                          ? '此协议已修改，请对照规则参数及实战记录验证效果。'
                          : o.tradeoff}
                      </span>
                      <footer>
                        {equipped ? '已装备 · 点击撤下' : '选择协议'}
                        <span>{equipped ? '✓' : '+'}</span>
                      </footer>
                    </button>
                  );
                })}
              </div>
              {message && <output className="trial-notice">{message}</output>}
            </section>
            <aside className="trial-inspector">
              <div className="trial-next">
                <p>下一场 / 0{session.stage + 1}</p>
                <h2>{stage.name}</h2>
                <p>{stage.purpose}</p>
                <div className="trial-map" aria-label="下一场敌人配置">
                  {stage.enemies.map((e, i) => (
                    <span
                      key={i}
                      title={ENEMIES[e.kind].name}
                      style={{
                        left: `${e.x / 12.8}%`,
                        top: `${e.y / 7.2}%`,
                        color: `#${ENEMIES[e.kind].color.toString(16).padStart(6, '0')}`,
                      }}
                    >
                      {e.kind === 'warden' ? '◆' : '●'}
                    </span>
                  ))}
                  {stage.cover && (
                    <>
                      <i
                        style={{
                          left: '28%',
                          top: '41%',
                          width: '8%',
                          height: '10%',
                        }}
                      />
                      <i
                        style={{
                          left: '65%',
                          top: '54%',
                          width: '8%',
                          height: '10%',
                        }}
                      />
                    </>
                  )}
                  <span
                    className="trial-map-player"
                    style={{ left: '50%', top: '64%' }}
                  >
                    △
                  </span>
                </div>
                <span>
                  {stage.enemies
                    .map((e) => e.kind)
                    .filter((k, i, a) => a.indexOf(k) === i)
                    .map(
                      (k) =>
                        `${ENEMIES[k].name} × ${stage.enemies.filter((e) => e.kind === k).length}`,
                    )
                    .join(' · ')}
                </span>
              </div>
              <div className="trial-numbers">
                <h2>
                  <Crosshair size={16} /> 当前协议参数
                </h2>
                <dl>
                  <div>
                    <dt>基础伤害</dt>
                    <dd>{w.stats.damage.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>发射间隔</dt>
                    <dd>{w.stats.rate.toFixed(3)}s</dd>
                  </div>
                  <div>
                    <dt>单次发射</dt>
                    <dd>{w.stats.projectiles} 发</dd>
                  </div>
                  <div>
                    <dt>生命</dt>
                    <dd>
                      {Math.ceil(w.player.hp)} / {w.player.maxHp}
                    </dd>
                  </div>
                </dl>
                <small>这些是实际规则参数，不把弹数乘积当作实战 DPS。</small>
                {preview && (
                  <div className="trial-preview">
                    <b>装备后变化</b>
                    {preview.changes.length ? (
                      preview.changes.slice(0, 4).map((x) => (
                        <p key={x.label}>
                          {x.label}
                          <span>
                            {x.before} → {x.after}
                          </span>
                        </p>
                      ))
                    ) : (
                      <p>改变命中后的效果或弹道行为。</p>
                    )}
                  </div>
                )}
                {synergies.length > 0 && (
                  <p className="trial-synergy">
                    {synergies.map((s) => s.name).join(' · ')} 已形成
                  </p>
                )}
              </div>
              {session.stage > 0 && (
                <button
                  className="trial-repair"
                  title="至少保留一项协议再维修，每阶段限一次"
                  disabled={
                    !session.cards.length ||
                    session.repaired ||
                    session.remaining < config.repairCost ||
                    w.player.hp === w.player.maxHp
                  }
                  onClick={() => {
                    session.repair();
                    refresh();
                  }}
                >
                  <Shield size={17} /> 修复 {config.repairHealth} 生命{' '}
                  <b>−{config.repairCost} 永久额度</b>
                </button>
              )}
              <button
                className="trial-primary"
                disabled={!session.cards.length}
                onClick={() => {
                  unlock();
                  session.start();
                  window.scrollTo(0, 0);
                  setMessage('');
                  refresh();
                }}
              >
                锁定构筑，进入战场 <ArrowUpRight size={19} />
              </button>
              <small className="trial-local">
                本次试炼不写主线存档；退出或刷新会结束当前进度。
              </small>
            </aside>
          </div>
        </section>
      ) : (
        <section className="trial-battle">
          <div className="trial-battlebar">
            <div>
              <p>{stage.name}</p>
              <b>
                {Math.ceil(Math.max(0, w.player.hp))}
                <small> / {w.player.maxHp} HP</small>
              </b>
              <progress max={w.player.maxHp} value={Math.max(0, w.player.hp)} />
            </div>
            <div>
              <p>战斗用时</p>
              <b aria-label="试炼计时">
                {(session.ticks / 60).toFixed(1)}
                <small>s</small>
              </b>
            </div>
            <div>
              <p>能量占用</p>
              <b>
                {session.spent}
                <small> / {session.capacity}</small>
              </b>
            </div>
            <div className="trial-equipped">
              {selected.map((o) => (
                <span key={o.id}>{CARDS.find((c) => c.id === o.id)!.name}</span>
              ))}
            </div>
            {session.state === 'combat' && (
              <button
                disabled={exit}
                onClick={() => {
                  session.engine.pause();
                  refresh();
                }}
              >
                暂停
              </button>
            )}
          </div>
          <div className="trial-stage">
            <TrialArena
              session={session}
              sound={sound}
              onTick={refresh}
              blocked={exit}
            />
            {w.boss && session.state === 'combat' && (
              <div className="trial-boss">
                <div>
                  <span>{ENEMIES[w.boss.kind].name}</span>
                  <b>
                    阶段 {Math.max(1, w.boss.phase)} ·{' '}
                    {Math.ceil(Math.max(0, w.boss.hp))} / {w.boss.maxHp}
                  </b>
                </div>
                <progress
                  aria-label="首领生命"
                  max={w.boss.maxHp}
                  value={Math.max(0, w.boss.hp)}
                />
              </div>
            )}
            {['transition', 'bossIntro'].includes(w.phase) && (
              <div className="trial-intro">
                <small>ENCOUNTER 0{session.stage + 1}</small>
                <h2>{stage.name}</h2>
                <p>{stage.purpose}</p>
              </div>
            )}
            {w.phase === 'paused' && !exit && (
              <div className="trial-overlay">
                <div className="trial-modal">
                  <p>TAKE A BREATH</p>
                  <h2>试炼已暂停</h2>
                  <button
                    className="trial-primary"
                    onClick={() => {
                      unlock();
                      session.engine.pause();
                      refresh();
                    }}
                  >
                    继续试炼
                  </button>
                  <button onClick={leave}>结束本次试炼</button>
                </div>
              </div>
            )}
            {exit && (
              <div className="trial-overlay">
                <dialog open className="trial-modal" aria-label="退出试炼">
                  <h2>结束本次试炼？</h2>
                  <p>进度不会保存，主线存档不受影响。</p>
                  <button onClick={() => setExit(false)}>留在这里</button>
                  <button
                    onClick={() => {
                      if (onBack) onBack();
                      else location.assign('/');
                    }}
                  >
                    确认退出
                  </button>
                </dialog>
              </div>
            )}
            {completed && last && (
              <div className="trial-overlay">
                <dialog
                  open
                  className="trial-modal trial-report"
                  aria-label="构筑战报"
                >
                  <p>
                    {session.state === 'finished'
                      ? 'EXPEDITION COMPLETE'
                      : last.outcome === 'clear'
                        ? 'ENCOUNTER CLEARED'
                        : 'TRIAL ENDED'}
                  </p>
                  <h2>
                    {session.state === 'finished'
                      ? '星铸完成'
                      : last.outcome === 'clear'
                        ? `${last.name} · 已突破`
                        : last.outcome === 'timeout'
                          ? '试炼时间耗尽'
                          : '试炼未能完成'}
                  </h2>
                  <div className="trial-result-values">
                    <div>
                      <b>{(last.ticks / 60).toFixed(1)}s</b>
                      <span>战斗用时</span>
                    </div>
                    <div>
                      <b>{last.damage.toFixed(0)}</b>
                      <span>有效伤害</span>
                    </div>
                    <div>
                      <b>{last.damageTaken.toFixed(0)}</b>
                      <span>承受伤害</span>
                    </div>
                    <div>
                      <b>{last.reactions}</b>
                      <span>共鸣触发</span>
                    </div>
                  </div>
                  <p className="trial-result-note">
                    {last.outcome === 'clear'
                      ? session.stage < 2
                        ? `下一场累计额度提高至 ${config.stages[session.stage + 1].budget}。生命不自动恢复：维修会占用后续构筑额度。`
                        : '从对群到单体，你已完成三次不同的构筑验证。'
                      : '保留这次结果，调整配装或走位后再试。没有隐藏免死或失败补偿。'}
                  </p>
                  {session.state === 'finished' && (
                    <table>
                      <thead>
                        <tr>
                          <th>阶段</th>
                          <th>用时</th>
                          <th>承伤</th>
                          <th>协议支出</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.results.map((r) => (
                          <tr key={r.stage}>
                            <td>{r.name}</td>
                            <td>{(r.ticks / 60).toFixed(1)}s</td>
                            <td>{r.damageTaken.toFixed(0)}</td>
                            <td>{r.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <small>
                    各阶段敌人与预算不同；战报用于回顾本次选择，不是单卡排名。
                  </small>
                  <div className="trial-report-actions">
                    {session.state === 'result' ? (
                      <button
                        className="trial-primary"
                        onClick={() => {
                          session.next();
                          setFocus('');
                          refresh();
                        }}
                      >
                        {session.stage < 2
                          ? '分配下一阶段预算'
                          : '查看远征总结'}
                      </button>
                    ) : (
                      <button className="trial-primary" onClick={restart}>
                        重新构筑
                      </button>
                    )}
                    <button onClick={download}>导出本次记录</button>
                    {session.state !== 'result' && (
                      <button onClick={leave}>返回</button>
                    )}
                  </div>
                </dialog>
              </div>
            )}
          </div>
          <footer className="trial-controlbar">
            <span>
              {[
                key('MoveUp'),
                key('MoveLeft'),
                key('MoveDown'),
                key('MoveRight'),
              ].join(' ')}{' '}
              移动 · {bindings.mouseAttack === 0 ? '左键' : '右键'}攻击 ·{' '}
              {key('Dash')} 冲刺
            </span>
            <span>
              {key('Pulse')} 脉冲 {Math.max(0, w.player.qCd).toFixed(1)}s　
              {key('Gravity')} 引力 {Math.max(0, w.player.eCd).toFixed(1)}s　
              {key('Pause')} 暂停
            </span>
          </footer>
        </section>
      )}
    </main>
  );
}
