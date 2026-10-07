import { useTranslation } from '../ui/i18n';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityArena } from './ActivityArena';
import { RELAY_ACTIVITY, type ActivityDefinition } from './definition';
import { ActivitySession, newAttempt, type ActivityResult } from './session';
import { ActivityStore, ACTIVITY_LOCK, type ActivitySave } from './store';
import { loadSave } from '../core/save';
import { Synth } from '../audio/synth';
import { loadBindings, keyLabel } from '../input/bindings';
import './activity.css';

const reasons = {
  captured: '中继已接管',
  defeated: '信号中断',
  timeout: '时间耗尽',
  abandoned: '已撤离',
  interrupted: '上次挑战已中断',
};
const explanations = {
  captured: '你守住了中继点。熔炉的信号再次亮起。',
  defeated: '生命值归零。尝试用冲刺脱离包围，再返回光圈。',
  timeout: '驻留时间尚未达标。离开光圈不会清空已有进度。',
  abandoned: '本次未完成，不发放徽章。随时可以重新挑战。',
  interrupted: '页面关闭或刷新后，未完成的战斗不会恢复，也不计入最佳成绩。',
};
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
export default function ActivityApp({
  draft,
  onBack,
}: {
  draft?: ActivityDefinition;
  onBack?: () => void;
}) {
  const t = useTranslation();
  const def = draft ?? RELAY_ACTIVITY;
  const [unscored, setUnscored] = useState(false),
    [retry, setRetry] = useState(0);
  const practice = !!draft || unscored;
  const store = useRef<ActivityStore | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'busy' | 'error'>(
    'loading',
  );
  const [save, setSave] = useState<ActivitySave | null>(null),
    [error, setError] = useState('');
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [result, setResult] = useState<ActivityResult | null>(null),
    [stored, setStored] = useState(false),
    [ack, setAck] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false),
    [, render] = useState(0);
  const lastTerminal = useRef<ActivityResult | null>(null),
    sound = useRef(new Synth()).current;
  const [bindings] = useState(loadBindings);
  const key = (action: keyof typeof bindings.keys) =>
    bindings.keys[action].map(keyLabel).join('/') || '未绑定';
  const unlockSound = () => {
    try {
      sound.unlock();
    } catch {
      /* Audio permission/device failure must not strand a persisted attempt. */
    }
  };
  useEffect(() => () => sound.dispose(), [sound]);
  useEffect(() => {
    if (practice) {
      setStatus('ready');
      return;
    }
    let disposed = false,
      release: () => void = () => {};
    // A cancellable deferred acquire avoids StrictMode's first mount taking the lock.
    const timer = setTimeout(() => {
      if (!navigator.locks) {
        setStatus('error');
        setError(
          '此浏览器无法保护多个活动页面的同时存档，可使用不计成绩模式。',
        );
        return;
      }
      void navigator.locks
        .request(ACTIVITY_LOCK, { ifAvailable: true }, async (lock) => {
          if (disposed) return;
          if (!lock) {
            setStatus('busy');
            return;
          }
          await new Promise<void>((resolve) => {
            release = resolve;
            try {
              const s = new ActivityStore(localStorage),
                v = s.recover();
              store.current = s;
              setSave(v);
              setStatus('ready');
              setError('');
              if (v.terminal && !v.terminal.acknowledged) {
                setResult(v.terminal.result);
                setStored(true);
                setAck(false);
              }
            } catch (e) {
              setStatus('error');
              setError(message(e));
            }
          });
        })
        .catch((e) => {
          if (!disposed) {
            setStatus('error');
            setError(message(e));
          }
        });
    }, 0);
    return () => {
      disposed = true;
      clearTimeout(timer);
      store.current = null;
      release();
    };
  }, [practice, retry]);
  useEffect(() => {
    if (!session || ack) return;
    const guard = (e: BeforeUnloadEvent) => {
      if (!session.result || !stored) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [session, stored, ack]);
  const persistResult = useCallback(
    (r: ActivityResult) => {
      if (practice) {
        setStored(true);
        return;
      }
      try {
        if (!store.current) throw Error('活动记录未就绪');
        setSave(store.current.saveResult(r));
        setStored(true);
        setError('');
      } catch (e) {
        setError(`结算尚未保存：${message(e)}。请保留此页面并重试。`);
      }
    },
    [practice],
  );
  const tick = useCallback(() => {
    render((n) => n + 1);
    if (session?.result && lastTerminal.current !== session.result) {
      lastTerminal.current = session.result;
      setResult(session.result);
      persistResult(session.result);
    }
  }, [session, persistResult]);
  function start() {
    try {
      const attempt = newAttempt(def, crypto.randomUUID());
      const next = new ActivitySession(
        def,
        attempt,
        practice ? 'draft' : 'official',
      );
      next.engine.save.settings = { ...loadSave().settings };
      if (!practice) {
        if (!store.current) throw Error('活动记录未就绪');
        setSave(store.current.begin(attempt));
      }
      sound.settings = next.engine.save.settings;
      unlockSound();
      lastTerminal.current = null;
      setStored(false);
      setAck(false);
      setResult(null);
      setError('');
      setSession(next);
    } catch (e) {
      setError(message(e));
    }
  }
  function claim() {
    try {
      if (!practice) {
        if (!store.current || !result) throw Error('结算未就绪');
        setSave(store.current.acknowledge(result.attempt.id));
      }
      setAck(true);
      setError('');
    } catch (e) {
      setError(`尚未完成领取：${message(e)}。重试不会重复发放。`);
    }
  }
  function lobby() {
    sound.dispose();
    setSession(null);
    setResult(null);
    setAck(false);
    setStored(false);
    lastTerminal.current = null;
    setError('');
  }
  function leave() {
    if (session && !session.result) {
      if (session.engine.world.phase !== 'paused') session.engine.pause();
      setConfirmExit(true);
      render((n) => n + 1);
    } else if (result && !ack) {
      setError('请先确认本次结算，再退出。');
    } else if (onBack) onBack();
    else location.assign('/');
  }
  const w = session?.engine.world,
    remaining = Math.max(
      0,
      def.timeLimitSeconds - (session?.activeTicks ?? 0) / 60,
    );
  return (
    <main className="activity-shell">
      <header className="activity-header">
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
          RELAY / 01 · {t(practice ? '草稿试玩 · 不计成绩' : '单机挑战')}
        </span>
        <LanguageToggle
          onChange={(language) => {
            if (session) session.engine.save.settings.language = language;
            sound.settings.language = language;
          }}
        />
        <button onClick={leave}>
          {t(onBack ? '返回编辑器' : '返回主菜单')}
        </button>
      </header>
      {!session && !result ? (
        <section className="activity-lobby">
          <div className="activity-art" aria-hidden="true">
            <div className="relay-emblem">⌖</div>
            <span>
              THE FOUNDRY
              <br />
              SIGNAL LOST / RECLAIM IT
            </span>
          </div>
          <div className="activity-intro">
            <p className="activity-kicker">{t('固定配装 · 驻留挑战')}</p>
            <h1>{t(def.name)}</h1>
            <p className="activity-lead">{t('踏入光圈，守住最后一段信号。')}</p>
            <div className="activity-rules">
              <div>
                <strong>
                  {def.timeLimitSeconds}
                  <small>s</small>
                </strong>
                <span>{t('战斗时限')}</span>
              </div>
              <div>
                <strong>
                  {def.holdSeconds}
                  <small>s</small>
                </strong>
                <span>{t('累计驻留')}</span>
              </div>
              <div>
                <strong>01</strong>
                <span>{t('首通徽章')}</span>
              </div>
            </div>
            <ol>
              <li>
                {t.copy(
                  `进入场地中央光圈，累计驻留 ${def.holdSeconds} 秒即成功。离圈保留进度。`,
                  `Enter the central circle and accumulate ${def.holdSeconds} seconds to succeed. Leaving the circle preserves progress.`,
                )}
              </li>
              <li>
                {t.copy(
                  `在 ${def.timeLimitSeconds} 秒内完成；生命值归零或超时则失败。暂停不计时。`,
                  `Finish within ${def.timeLimitSeconds} seconds; zero health or an expired timer means defeat. Pausing stops the clock.`,
                )}
              </li>
              <li>
                {t(
                  '使用固定武器与协议，击退来敌。首次完成后领取「守望者」徽章。',
                )}
              </li>
            </ol>
            <div className="activity-prize">
              <span>◇</span>
              <div>
                <b>
                  {t(
                    save?.awards.length
                      ? '守望者 · 已获得'
                      : '守望者 · 首次完成解锁',
                  )}
                </b>
                <p>
                  {t(
                    save?.bestTicks != null
                      ? `个人最佳 ${(save.bestTicks / 60).toFixed(2)} 秒`
                      : '徽章留在本机，重复完成可刷新个人最佳。',
                  )}
                </p>
              </div>
            </div>
            {status === 'busy' && (
              <output>
                {t('另一个页面正在使用活动记录。关闭它后，再重新连接。')}
              </output>
            )}
            {error && (
              <p className="activity-error" role="alert">
                {t(error)}
              </p>
            )}
            <div className="activity-actions">
              <button
                className="activity-primary"
                disabled={status !== 'ready'}
                onClick={start}
              >
                {t(status === 'loading' ? '正在准备…' : '进入挑战')}
              </button>
              {status === 'busy' && (
                <button
                  onClick={() => {
                    setStatus('loading');
                    setRetry((n) => n + 1);
                  }}
                >
                  {t('重新连接')}
                </button>
              )}
              {status === 'error' && (
                <button
                  onClick={() => {
                    setUnscored(true);
                    setError('');
                  }}
                >
                  {t('不计成绩试玩')}
                </button>
              )}
            </div>
            <p className="activity-footnote">
              {t(
                practice
                  ? '试玩不写入活动记录，不发放正式徽章。'
                  : '本地单机记录，可被修改或清除；设备日期仅作记录，不是可信线上榜单。',
              )}
              {t(' ')}
              {t('主线存档独立保留。')}
            </p>
          </div>
        </section>
      ) : (
        <section className="activity-play">
          {session && (
            <div className="activity-hud">
              <div>
                <span>{t('驻留进度')}</span>
                <strong aria-label={t('驻留进度')}>
                  {t(
                    (
                      result?.metrics?.holdSeconds ??
                      w?.challengeTime ??
                      0
                    ).toFixed(1),
                  )}
                  {t(' ')}/ {def.holdSeconds}s
                </strong>
                <progress
                  max={def.holdSeconds}
                  value={result?.metrics?.holdSeconds ?? w?.challengeTime ?? 0}
                />
              </div>
              <div>
                <span>{t('剩余时间')}</span>
                <strong aria-label={t('剩余时间')}>
                  {t(remaining.toFixed(1))}s
                </strong>
              </div>
              <div>
                <span>{t('生命')}</span>
                <strong aria-label={t('挑战生命')}>
                  {Math.max(0, Math.ceil(w?.player.hp ?? 0))} /{t(' ')}
                  {w?.player.maxHp ?? 120}
                </strong>
              </div>
              {session && !result && (
                <button
                  disabled={confirmExit}
                  onClick={() => {
                    session.engine.pause();
                    render((n) => n + 1);
                  }}
                >
                  {t('暂停 / 继续')}
                </button>
              )}
            </div>
          )}
          <div className="activity-stage">
            {session && (
              <ActivityArena
                session={session}
                sound={sound}
                onTick={tick}
                blocked={confirmExit}
              />
            )}
            {w?.phase === 'transition' && !result && (
              <div className="activity-entry">
                {t('前往中央光圈')}
                <br />
                <small>{t('准备接管中继')}</small>
              </div>
            )}
            {w?.phase === 'paused' && !result && !confirmExit && (
              <div className="activity-overlay">
                <div className="activity-dialog">
                  <p className="activity-kicker">SIGNAL ON HOLD</p>
                  <h2>{t('挑战已暂停')}</h2>
                  <p>{t('计时与驻留进度均已暂停。')}</p>
                  <button
                    className="activity-primary"
                    onClick={() => {
                      unlockSound();
                      session!.engine.pause();
                      render((n) => n + 1);
                    }}
                  >
                    {t('继续挑战')}
                  </button>
                  <button onClick={leave}>{t('撤离挑战')}</button>
                </div>
              </div>
            )}
            {confirmExit && (
              <div className="activity-overlay">
                <dialog
                  open
                  className="activity-dialog"
                  aria-label={t('撤离确认')}
                >
                  <h2>{t('现在撤离？')}</h2>
                  <p>{t('本次将结束，不发放首通徽章。')}</p>
                  <button
                    onClick={() => {
                      setConfirmExit(false);
                    }}
                  >
                    {t('留在挑战')}
                  </button>
                  <button
                    onClick={() => {
                      const r = session!.abandon();
                      setConfirmExit(false);
                      lastTerminal.current = r;
                      setResult(r);
                      persistResult(r);
                    }}
                  >
                    {t('确认撤离')}
                  </button>
                </dialog>
              </div>
            )}
            {result && (
              <div className="activity-overlay">
                <dialog
                  open
                  className="activity-dialog activity-result"
                  aria-label={t('挑战结算')}
                >
                  <p className="activity-kicker">
                    {t(
                      result.reason === 'captured'
                        ? 'RELAY SECURED'
                        : 'CHALLENGE ENDED',
                    )}
                    {t(' ')}/ {t(practice ? '试玩' : '本机记录')}
                  </p>
                  <div className="result-seal">
                    {t(result.reason === 'captured' ? '◇' : '—')}
                  </div>
                  <h2>{t(reasons[result.reason])}</h2>
                  <p>{t(explanations[result.reason])}</p>
                  {result.metrics ? (
                    <dl>
                      <div>
                        <dt>{t('战斗用时')}</dt>
                        <dd>{t((result.metrics.ticks / 60).toFixed(2))}s</dd>
                      </div>
                      <div>
                        <dt>{t('击败敌人')}</dt>
                        <dd>{result.metrics.kills}</dd>
                      </div>
                      <div>
                        <dt>{t('累计驻留')}</dt>
                        <dd>{t(result.metrics.holdSeconds.toFixed(1))}s</dd>
                      </div>
                    </dl>
                  ) : (
                    <p>{t('未保存战斗进度，不提供本次战斗统计。')}</p>
                  )}
                  {error && (
                    <p className="activity-error" role="alert">
                      {t(error)}
                    </p>
                  )}
                  {!stored ? (
                    <button
                      className="activity-primary"
                      onClick={() => persistResult(result)}
                    >
                      {t('重试保存结算')}
                    </button>
                  ) : !ack ? (
                    <button className="activity-primary" onClick={claim}>
                      {t(
                        result.reason === 'captured' && !practice
                          ? '领取徽章并记录成绩'
                          : '确认本次结果',
                      )}
                    </button>
                  ) : (
                    <>
                      <p className="activity-receipt">
                        {t(
                          result.reason === 'captured' && !practice
                            ? '守望者徽章已入藏 · 成绩已记录'
                            : '本次结算已确认',
                        )}
                      </p>
                      <button className="activity-primary" onClick={lobby}>
                        {t('返回活动大厅')}
                      </button>
                      <button onClick={leave}>
                        {t(onBack ? '返回编辑器' : '返回主菜单')}
                      </button>
                    </>
                  )}
                </dialog>
              </div>
            )}
          </div>
          <p className="activity-controls">
            {t(
              ['MoveUp', 'MoveLeft', 'MoveDown', 'MoveRight']
                .map((a) => key(a as keyof typeof bindings.keys))
                .join(' · '),
            )}
            {t(' ')}
            {t('移动 · 鼠标瞄准 /')}
            {t(bindings.mouseAttack === 0 ? '左键' : '右键')}
            {t('攻击 ·')}
            {t(key('Dash'))} {t('冲刺 ·')}
            {t(key('Pulse'))} / {t(key('Gravity'))} {t('技能 ·')}
            {t(' ')}
            {t(key('Pause'))} {t('暂停')}
            {t(practice ? ' · 草稿试玩，不发放正式徽章' : '')}
          </p>
        </section>
      )}
    </main>
  );
}
