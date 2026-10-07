import { useTranslation } from '../ui/i18n';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useEffect, useState } from 'react';
import {
  Flame,
  Zap,
  Snowflake,
  Orbit,
  ArrowUpRight,
  Shield,
  Crosshair,
  Volume2,
  VolumeX,
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
import { weaponProfile, WEAPON_IDENTITY } from '../combat/weapon-profile';
import { WeaponIcon } from '../ui/EconomyPanels';
import { bossActionLabel } from '../render/telegraphs';
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
  const t = useTranslation();
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
  useEffect(() => {
    const update = () => {
      if (session.state === 'planning' || session.state === 'contract')
        sound.update(0.1, false, {
          phase: 'menu',
          kind: 'combat',
          biome: 'sanctum',
          bossPhase: 0,
        });
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [session, sound]);
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
  const synergies = activeSynergies(session.cards, w.weapon);
  const identity = WEAPON_IDENTITY[w.weapon],
    profile = weaponProfile(w),
    heavy = weaponProfile(w, true);
  const completed =
    session.state === 'result' ||
    session.state === 'finished' ||
    session.state === 'failed';
  const last = session.results.at(-1);
  const progressStage = session.state === 'contract' ? 1 : session.stage;
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
          ARC<span>{t('//')}</span>SHIFT
        </a>
        <span>
          THE ASTRAL FORGE <i>/</i> {t('星铸协议 · 2.3')}
        </span>
        <div className="trial-header-actions">
          <LanguageToggle
            onChange={(language) => {
              session.engine.save.settings.language = language;
              sound.settings.language = language;
            }}
          />
          <button
            aria-label={t(
              sound.settings.muted || !sound.context ? '开启声音' : '静音',
            )}
            title={t(
              sound.settings.muted || !sound.context ? '开启声音' : '静音',
            )}
            onClick={() => {
              const locked = !sound.context;
              unlock();
              sound.settings.muted = locked ? false : !sound.settings.muted;
              refresh();
            }}
          >
            {sound.settings.muted ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
          <button onClick={leave}>
            {t(onBack ? '返回配置' : '返回主菜单')}
          </button>
        </div>
      </header>
      <nav className="trial-stages" aria-label={t('试炼进度')}>
        {session.config.stages.map((s, i) => (
          <div
            key={s.name}
            className={
              i === progressStage ? 'current' : i < progressStage ? 'done' : ''
            }
          >
            <b>0{i + 1}</b>
            <span>
              {t(s.name)}
              <small>
                {t(
                  i < progressStage
                    ? '已完成'
                    : i === progressStage
                      ? '当前阶段'
                      : '下一阶段',
                )}
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
                {t(
                  session.stage === 0
                    ? '每一格能量，都有代价。'
                    : '下一场，重新作出选择。',
                )}
              </h1>
              <span>
                {t(identity.name)}
                {t.copy(
                  session.weaponLocked ? '已锁定' : '可选武装',
                  session.weaponLocked ? ' · Locked' : ' · Weapon selectable',
                )}{' '}
                {t('· 等级 3 · 最多')}
                {t(' ')}
                {config.slots} {t('个协议 · 阶段间可原价撤下重配')}
              </span>
            </div>
            <div className="trial-budget">
              <strong aria-label={t('剩余额度')}>{session.remaining}</strong>
              <span>
                / {session.capacity}
                <small>{t('剩余可用能量')}</small>
              </span>
            </div>
          </div>
          {!session.weaponLocked && (
            <div className="trial-armory" aria-label={t('选择试炼武装')}>
              {session.config.weapons.map((id) => (
                <button
                  key={id}
                  className={w.weapon === id ? 'chosen' : ''}
                  aria-label={t(`选择${WEAPON_IDENTITY[id].name}`)}
                  aria-pressed={w.weapon === id}
                  onClick={() => {
                    unlock();
                    sound.ui();
                    session.chooseWeapon(id);
                    refresh();
                  }}
                >
                  <WeaponIcon id={id} size={30} />
                  <div>
                    <small>{t(WEAPON_IDENTITY[id].en)}</small>
                    <b>{t(WEAPON_IDENTITY[id].name)}</b>
                    <span>{t(WEAPON_IDENTITY[id].verb)}</span>
                  </div>
                  <i>{t(w.weapon === id ? '已选择' : '选择')}</i>
                </button>
              ))}
            </div>
          )}
          <div className="trial-doctrine">
            <p>
              <b>{t(identity.name)} / </b>
              {t(identity.cost)}
            </p>
            <span>{t(identity.protocol)}</span>
            {session.stage > 0 && (
              <span className="trial-ledger">
                {t('基础')}
                {stage.budget} {t('+ 合约')}
                {session.earnedCapacity} {t('− 维修')}
                {t(' ')}
                {session.repairSpent} = {session.capacity} {t('可用额度')}
                {t(
                  session.contract === 'overload' && session.stage === 1
                    ? ` · 清场后获得 +${config.contract!.rewardCapacity}`
                    : '',
                )}
              </span>
            )}
          </div>
          <div className="trial-workbench">
            <section className="trial-catalog" aria-label={t('协议目录')}>
              <div className="trial-section-title">
                <h2>{t('配置你的攻击')}</h2>
                <span>
                  {session.cards.length} / {config.slots} {t('槽位')}
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
                      aria-label={t(
                        `${equipped ? '撤下' : '装备'}${card.name}`,
                      )}
                      aria-pressed={equipped}
                      onMouseEnter={() => setFocus(o.id)}
                      onFocus={() => setFocus(o.id)}
                      onClick={() => {
                        unlock();
                        sound.ui();
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
                          <small>{t('能量')}</small>
                        </span>
                      </div>
                      <h3>{t(card.name)}</h3>
                      <b>{t(o.role)}</b>
                      <p>
                        {t(
                          custom
                            ? '自定义参数 · 以右侧实时预览为准'
                            : card.preview,
                        )}
                      </p>
                      <span className="trial-tradeoff">
                        {t(
                          custom
                            ? '此协议已修改，请对照规则参数及实战记录验证效果。'
                            : o.tradeoff,
                        )}
                      </span>
                      <footer>
                        {t(equipped ? '已装备 · 点击撤下' : '选择协议')}
                        <span>{t(equipped ? '✓' : '+')}</span>
                      </footer>
                    </button>
                  );
                })}
              </div>
              {message && (
                <output className="trial-notice">{t(message)}</output>
              )}
            </section>
            <aside className="trial-inspector">
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
                {t('锁定构筑，进入战场')}
                <ArrowUpRight size={19} />
              </button>
              <div className="trial-next">
                <p>
                  {t('下一场 / 0')}
                  {session.stage + 1}
                </p>
                <h2>{t(stage.name)}</h2>
                <p>{t(stage.purpose)}</p>
                <div className="trial-map" aria-label={t('下一场敌人配置')}>
                  {session.enemies.map((e, i) => (
                    <span
                      key={i}
                      title={t(
                        `${e.elite ? '精英' : ''}${ENEMIES[e.kind].name}`,
                      )}
                      style={{
                        left: `${e.x / 12.8}%`,
                        top: `${e.y / 7.2}%`,
                        color: `#${ENEMIES[e.kind].color.toString(16).padStart(6, '0')}`,
                      }}
                    >
                      {t(e.kind === 'warden' || e.elite ? '◆' : '●')}
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
                  {t(
                    stage.enemies
                      .map((e) => e.kind)
                      .filter((k, i, a) => a.indexOf(k) === i)
                      .map(
                        (k) =>
                          `${ENEMIES[k].name} × ${stage.enemies.filter((e) => e.kind === k).length}`,
                      )
                      .join(' · '),
                  )}
                  {session.stage === 1 &&
                    session.contract === 'overload' &&
                    ' · 精英冲锋者 × 1'}
                </span>
              </div>
              <div className="trial-numbers">
                <h2>
                  <Crosshair size={16} /> {t('当前协议参数')}
                </h2>
                <dl>
                  <div>
                    <dt>
                      {t(
                        w.weapon === 'sword'
                          ? w.has('void-return') && w.has('ice-touch')
                            ? '普攻 / 终结回旋'
                            : '普攻 / 终结挥砍'
                          : '单枚直击伤害',
                      )}
                    </dt>
                    <dd>
                      {t(profile.damage.toFixed(1))}
                      {t(
                        w.weapon === 'sword'
                          ? ` / ${heavy.damage.toFixed(1)}`
                          : '',
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('攻击间隔')}</dt>
                    <dd>
                      {t(profile.interval.toFixed(2))}
                      {t(
                        w.weapon === 'sword'
                          ? ` / ${heavy.interval.toFixed(2)}`
                          : '',
                      )}
                      s
                    </dd>
                  </div>
                  <div>
                    <dt>{t(profile.area)}</dt>
                    <dd>
                      {t(profile.reach.toFixed(0))}
                      {t(' ')}
                      {t(w.weapon === 'arc' ? '发' : 'px')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('生命')}</dt>
                    <dd>
                      {Math.ceil(w.player.hp)} / {w.player.maxHp}
                    </dd>
                  </div>
                </dl>
                <small>
                  {t(
                    '当前武装的非暴击直击参数；不含燃烧、共鸣和爆破，不等于实战 DPS。',
                  )}
                </small>
                {preview && (
                  <div className="trial-preview">
                    <b>{t('装备后变化')}</b>
                    {preview.changes.length ? (
                      preview.changes.slice(0, 4).map((x) => (
                        <p key={x.label}>
                          {t(x.label)}
                          <span>
                            {t(x.before)} → {t(x.after)}
                          </span>
                        </p>
                      ))
                    ) : (
                      <p>{t('改变命中后的效果或弹道行为。')}</p>
                    )}
                  </div>
                )}
                {synergies.length > 0 && (
                  <p className="trial-synergy">
                    {t(synergies.map((s) => s.name).join(' · '))} {t('已形成')}
                  </p>
                )}
              </div>
              {session.stage > 0 && (
                <button
                  className="trial-repair"
                  title={t('至少保留一项协议再维修，每阶段限一次')}
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
                  <Shield size={17} /> {t('修复')}
                  {config.repairHealth} {t('生命')}
                  {t(' ')}
                  <b>
                    −{config.repairCost} {t('永久额度')}
                  </b>
                </button>
              )}
              <small className="trial-local">
                {t('本次试炼不写主线存档；退出或刷新会结束当前进度。')}
              </small>
            </aside>
          </div>
        </section>
      ) : session.state === 'contract' && config.contract ? (
        <section className="trial-contract">
          <div className="trial-contract-art">
            <img src="/art/guardian-v2.webp" alt={t('前方的星铸守门人')} />
            <span>THE PRICE OF POWER</span>
          </div>
          <div className="trial-contract-copy">
            <p className="trial-kicker">{t('航路分歧 / 仅此一次')}</p>
            <h1>
              {t('带着伤前进，')}
              <br />
              {t('还是再赌一次？')}
            </h1>
            <p>
              {t('下一场是交叉火线，之后直面守门人。武装已锁定为')}{' '}
              {t(identity.name)}
              {t('，协议仍可重配。')}
            </p>
            <div className="trial-contract-options">
              <button
                aria-label={t('签订补给合约')}
                onClick={() => {
                  session.chooseContract('supply');
                  refresh();
                }}
              >
                <small>01 / SUPPLY</small>
                <h2>{t('接受补给')}</h2>
                <b>
                  {t('立即恢复')}
                  {t(' ')}
                  {Math.min(
                    config.contract.supplyHealth,
                    w.player.maxHp - w.player.hp,
                  )}
                  {t(' ')}
                  {t('生命')}
                </b>
                <p>
                  {t.copy(
                    `最多恢复 ${config.contract.supplyHealth}，不消耗额度。下一场保持原敌阵，末关基础额度 ${config.stages[2].budget}。`,
                    `Restore up to ${config.contract.supplyHealth} HP without spending capacity. The next enemy formation is unchanged. Final base capacity: ${config.stages[2].budget}.`,
                  )}
                </p>
                <span>{t('确认补给 →')}</span>
              </button>
              <button
                aria-label={t('签订夺能合约')}
                disabled={w.player.hp <= config.contract.healthCost}
                onClick={() => {
                  session.chooseContract('overload');
                  refresh();
                }}
              >
                <small>02 / OVERLOAD</small>
                <h2>{t('承担夺能')}</h2>
                <b>
                  {t('支付')} {config.contract.healthCost}{' '}
                  {t('生命 · 精英 × 1')}
                </b>
                <p>
                  {t('额外精英冲锋者从中央加入。清场后末关 +')}
                  {config.contract.rewardCapacity}
                  {t(' ')}
                  {t('额度；失败不返还生命、不发奖励。生命须高于')}
                  {t(' ')}
                  {config.contract.healthCost} {t('才可签订。')}
                </p>
                <span>{t('承担风险 →')}</span>
              </button>
            </div>
            <p className="trial-contract-hp">
              {t('当前生命')} {Math.ceil(w.player.hp)} / {w.player.maxHp}{' '}
              {t('· 合约确认后不能改签')}
            </p>
          </div>
        </section>
      ) : (
        <section className="trial-battle">
          <div className="trial-battlebar">
            <div>
              <p>{t(stage.name)}</p>
              <b>
                {Math.ceil(Math.max(0, w.player.hp))}
                <small> / {w.player.maxHp} HP</small>
              </b>
              <progress max={w.player.maxHp} value={Math.max(0, w.player.hp)} />
            </div>
            <div>
              <p>{t('战斗用时')}</p>
              <b aria-label={t('试炼计时')}>
                {t((session.ticks / 60).toFixed(1))}
                <small>s</small>
              </b>
            </div>
            <div>
              <p>{t('能量占用')}</p>
              <b>
                {session.spent}
                <small> / {session.capacity}</small>
              </b>
            </div>
            <div className="trial-equipped">
              {selected.map((o) => (
                <span key={o.id}>
                  {t(CARDS.find((c) => c.id === o.id)!.name)}
                </span>
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
                {t('暂停')}
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
                  <span>
                    {t(ENEMIES[w.boss.kind].name)} ·{' '}
                    {t(bossActionLabel(w.boss))}
                  </span>
                  <b>
                    {t('阶段')}
                    {Math.max(1, w.boss.phase)} ·{t(' ')}
                    {Math.ceil(Math.max(0, w.boss.hp))} / {w.boss.maxHp}
                  </b>
                </div>
                <progress
                  aria-label={t('首领生命')}
                  max={w.boss.maxHp}
                  value={Math.max(0, w.boss.hp)}
                />
              </div>
            )}
            {['transition', 'bossIntro'].includes(w.phase) && (
              <div className="trial-intro">
                <small>ENCOUNTER 0{session.stage + 1}</small>
                <h2>{t(stage.name)}</h2>
                <p>{t(stage.purpose)}</p>
              </div>
            )}
            {w.phase === 'paused' && !exit && (
              <div className="trial-overlay">
                <div className="trial-modal">
                  <p>TAKE A BREATH</p>
                  <h2>{t('试炼已暂停')}</h2>
                  <button
                    className="trial-primary"
                    onClick={() => {
                      unlock();
                      session.engine.pause();
                      refresh();
                    }}
                  >
                    {t('继续试炼')}
                  </button>
                  <button onClick={leave}>{t('结束本次试炼')}</button>
                </div>
              </div>
            )}
            {exit && (
              <div className="trial-overlay">
                <dialog open className="trial-modal" aria-label={t('退出试炼')}>
                  <h2>{t('结束本次试炼？')}</h2>
                  <p>{t('进度不会保存，主线存档不受影响。')}</p>
                  <button onClick={() => setExit(false)}>
                    {t('留在这里')}
                  </button>
                  <button
                    onClick={() => {
                      if (onBack) onBack();
                      else location.assign('/');
                    }}
                  >
                    {t('确认退出')}
                  </button>
                </dialog>
              </div>
            )}
            {completed && last && (
              <div className="trial-overlay">
                <dialog
                  open
                  className="trial-modal trial-report"
                  aria-label={t('构筑战报')}
                >
                  <p>
                    {t(
                      session.state === 'finished'
                        ? 'EXPEDITION COMPLETE'
                        : last.outcome === 'clear'
                          ? 'ENCOUNTER CLEARED'
                          : 'TRIAL ENDED',
                    )}
                  </p>
                  <h2>
                    {t(
                      session.state === 'finished'
                        ? '星铸完成'
                        : last.outcome === 'clear'
                          ? `${last.name} · 已突破`
                          : last.outcome === 'timeout'
                            ? '试炼时间耗尽'
                            : '试炼未能完成',
                    )}
                  </h2>
                  <div className="trial-result-values">
                    <div>
                      <b>{t((last.ticks / 60).toFixed(1))}s</b>
                      <span>{t('战斗用时')}</span>
                    </div>
                    <div>
                      <b>{t(last.damage.toFixed(0))}</b>
                      <span>{t('有效伤害')}</span>
                    </div>
                    <div>
                      <b>{t(last.damageTaken.toFixed(0))}</b>
                      <span>{t('承受伤害')}</span>
                    </div>
                    <div>
                      <b>{last.reactions}</b>
                      <span>{t('共鸣触发')}</span>
                    </div>
                  </div>
                  <p className="trial-result-note">
                    {last.contractReward > 0 && (
                      <strong className="trial-earned">
                        {t('夺能合约完成 · +')}
                        {last.contractReward} {t('永久额度')}
                        <br />
                      </strong>
                    )}
                    {t(
                      last.outcome === 'clear'
                        ? session.stage < 2
                          ? session.stage === 0 && config.contract
                            ? '选择一份航路合约，再为交叉火线调整配装。你的生命与选择都会留到下一场。'
                            : `下一场可用额度 ${config.stages[session.stage + 1].budget + session.earnedCapacity - session.repairSpent}。生命不自动恢复：维修会占用后续构筑额度。`
                          : '从对群到单体，你已完成三次不同的构筑验证。'
                        : '保留这次结果，调整配装或走位后再试。没有隐藏免死或失败补偿。',
                    )}
                  </p>
                  {session.state === 'finished' && (
                    <table>
                      <thead>
                        <tr>
                          <th>{t('阶段')}</th>
                          <th>{t('用时')}</th>
                          <th>{t('承伤')}</th>
                          <th>{t('协议支出')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.results.map((r) => (
                          <tr key={r.stage}>
                            <td>{t(r.name)}</td>
                            <td>{t((r.ticks / 60).toFixed(1))}s</td>
                            <td>{t(r.damageTaken.toFixed(0))}</td>
                            <td>{r.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <small>
                    {t(
                      '各阶段敌人与预算不同；战报用于回顾本次选择，不是单卡排名。',
                    )}
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
                        {t(
                          session.stage < 2
                            ? session.stage === 0 && config.contract
                              ? '选择航路合约'
                              : '分配下一阶段预算'
                            : '查看远征总结',
                        )}
                      </button>
                    ) : (
                      <button className="trial-primary" onClick={restart}>
                        {t('重新构筑')}
                      </button>
                    )}
                    <button onClick={download}>{t('导出本次记录')}</button>
                    {session.state !== 'result' && (
                      <button onClick={leave}>{t('返回')}</button>
                    )}
                  </div>
                </dialog>
              </div>
            )}
          </div>
          <footer className="trial-controlbar">
            <span className="trial-weapon-state">
              {t(identity.name)} ·{t(' ')}
              {t(
                w.weapon === 'sword'
                  ? `连段 ${w.comboTime > 0 ? w.combo + 1 : 0}/3`
                  : w.player.shotCd > 0
                    ? `回膛 ${w.player.shotCd.toFixed(1)}s`
                    : '就绪',
              )}
            </span>
            <span>
              {t(
                [
                  key('MoveUp'),
                  key('MoveLeft'),
                  key('MoveDown'),
                  key('MoveRight'),
                ].join(' '),
              )}
              {t(' ')}
              {t('移动 ·')}
              {t(bindings.mouseAttack === 0 ? '左键' : '右键')}
              {t('攻击 ·')}
              {t(' ')}
              {t(key('Dash'))} {t('冲刺')}
            </span>
            <span>
              {t(key('Pulse'))} {t('脉冲')}
              {t(Math.max(0, w.player.qCd).toFixed(1))}s　
              {t(key('Gravity'))} {t('引力')}
              {t(Math.max(0, w.player.eCd).toFixed(1))}s　
              {t(key('Pause'))} {t('暂停')}
            </span>
          </footer>
        </section>
      )}
    </main>
  );
}
