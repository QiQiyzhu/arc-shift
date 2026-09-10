import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  Maximize,
  Settings2,
  ChevronRight,
  Zap,
  Orbit,
  Wind,
  Pause,
  Play,
  FlaskConical,
  Shield,
  Hammer,
} from 'lucide-react';
import { WeaponIcon, WalletBar } from './EconomyPanels';
import { WEAPONS } from '../economy/catalog';
import { Engine } from '../game/engine';
import { ArcScene } from '../game/scene';
import { ENEMIES } from '../data/enemies';
import { CardDraft, RouteMap, BuildHUD } from './ProtocolPanels';
import { ExpeditionMap, EncounterPanel, HybridHUD } from './PilgrimagePanels';
import { LORE, isBoss } from '../progression/catalog';
import { UtilityPanel } from './SettingsPanel';
import { Synth } from '../audio/synth';
import { installWebMCP } from './webmcp';
import { keyLabel, padLabel, type ButtonAction } from '../input/bindings';
const engine = new Engine();
const synth = new Synth();
if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa'))
  void import('../game/qa').then((m) => m.installQA(engine, synth));
const formatTime = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`;
export default function GameApp() {
  const container = useRef<HTMLDivElement>(null);
  const [, render] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const scene = useRef<ArcScene | null>(null);
  const [utility, setUtility] = useState<
    'settings' | 'library' | 'help' | 'lab' | 'workshop' | 'camp' | null
  >(null);
  useEffect(() => {
    const s = new ArcScene(engine);
    s.onReady = () => setLoaded(true);
    s.onSuspend = () =>
      synth.update(0, false, {
        phase: 'paused',
        kind: engine.world.room.kind,
        bossPhase: 0,
      });
    scene.current = s;
    synth.settings = { ...engine.save.settings };
    const off = engine.world.bus.on((e) => synth.event(e));
    const webOff = installWebMCP(engine);
    let last = 0,
      lastSound = performance.now();
    s.onTick = () => {
      const now = performance.now();
      synth.settings = { ...engine.save.settings };
      s.reducedMotion = engine.save.settings.reducedMotion;
      synth.update(
        Math.min(0.1, (now - lastSound) / 1000),
        engine.world.phase === 'playing',
        {
          phase: engine.world.phase,
          kind: engine.world.room.kind,
          bossPhase: engine.world.boss?.phase || 0,
          biome: engine.world.room.biome,
          boss:
            engine.world.boss && isBoss(engine.world.boss.kind)
              ? engine.world.boss.kind
              : undefined,
        },
      );
      lastSound = now;
      if (now - last > 80) {
        render((n) => n + 1);
        last = now;
      }
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container.current!,
      width: 1280,
      height: 720,
      backgroundColor: '#080e14',
      antialias: true,
      // ArcScene owns fixed-step accumulation; avoid a second startup/focus delta smoother.
      fps: { smoothStep: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: s,
      audio: { noAudio: true },
      render: { powerPreference: 'high-performance' },
    });
    return () => {
      off();
      webOff();
      s.release();
      synth.dispose();
      game.destroy(true);
      scene.current = null;
    };
  }, []);
  const w = engine.world,
    p = w.player;
  const controls = scene.current?.actions,
    config = controls?.bindings;
  const gamepad = controls?.connected && controls.lastDevice === 'gamepad';
  const movementLabel = gamepad
    ? '左摇杆'
    : config
      ? [
          config.keys.MoveUp[0],
          config.keys.MoveLeft[0],
          config.keys.MoveDown[0],
          config.keys.MoveRight[0],
        ]
          .map(keyLabel)
          .join(' ')
      : 'WASD';
  const controlLabel = (action: ButtonAction, fallback: string) => {
    if (!config) return fallback;
    if (gamepad) return padLabel(config.gamepad[action]);
    return config.keys[action][0]
      ? keyLabel(config.keys[action][0])
      : config.mouseAttack === 0
        ? 'LMB'
        : 'RMB';
  };
  const start = () => {
    synth.unlock();
    synth.ui();
    engine.start();
    render((n) => n + 1);
  };
  const openUtility = (
    mode: 'settings' | 'library' | 'help' | 'lab' | 'workshop' | 'camp',
  ) => {
    synth.unlock();
    if (['playing', 'transition', 'bossIntro'].includes(w.phase))
      engine.pause();
    if (scene.current) scene.current.inputBlocked = true;
    setUtility(mode);
  };
  return (
    <main
      className={`game-shell phase-${w.phase}${engine.practice ? ' is-practice' : ''}`}
    >
      <header className="topbar">
        <a className="wordmark" href="./" aria-label="ARC SHIFT 首页">
          ARC<span>{'//'}</span>SHIFT<i>奥术跃迁</i>
        </a>
        <div className="topbar-center">
          <span className="signal-dot" /> 网络异常 · 连接已建立
        </div>
        <div className="top-actions">
          <span className="version">PILGRIMAGE / 1.0</span>
          <button
            aria-label={engine.save.settings.muted ? '开启声音' : '静音'}
            onClick={() => {
              synth.unlock();
              engine.save.settings.muted = !engine.save.settings.muted;
              engine.persist();
              render((n) => n + 1);
            }}
          >
            <AudioLines size={18} />
          </button>
          <button aria-label="系统设置" onClick={() => openUtility('settings')}>
            <Settings2 size={18} />
          </button>
          <button
            aria-label="全屏"
            onClick={() =>
              document.fullscreenElement
                ? document.exitFullscreen()
                : document.documentElement.requestFullscreen()
            }
          >
            <Maximize size={17} />
          </button>
        </div>
      </header>
      <section className="viewport" aria-label="游戏战场">
        <div className="game-canvas" ref={container} />
        <div className="vignette" />
        {w.phase === 'menu' && (
          <div className="menu-overlay">
            <img className="menu-keyart" src="/art/rift-keyart.webp" alt="" />
            <div className="menu-copy">
              <div className="eyebrow">
                <span /> THE LAST PILGRIMAGE · v1.0
              </div>
              <h1>
                ARC<span>{'//'}</span>
                <br />
                SHIFT<span className="title-period">.</span>
              </h1>
              <div className="cn-title">
                <span>奥 术 跃 迁</span>
                <i>钟声尽头，仍有人在等。</i>
              </div>
              <p className="menu-description">圣所仍在等待，下一位归来的人。</p>
              {engine.save.checkpoint && (
                <button
                  className="start-button continue-primary"
                  disabled={!loaded}
                  onClick={() => {
                    synth.unlock();
                    engine.resume();
                  }}
                >
                  <span>
                    <Play size={18} />
                    继续行动
                  </span>
                  <span>
                    第 {engine.save.checkpoint.room.index} 层{' '}
                    <ArrowRight size={18} />
                  </span>
                </button>
              )}
              <button
                className={
                  engine.save.checkpoint ? 'new-journey-button' : 'start-button'
                }
                onClick={start}
                disabled={!loaded}
              >
                <span>
                  <Play size={18} fill="currentColor" />{' '}
                  {loaded ? '开始行动' : '正在连接'}
                </span>
                <ArrowUpRight size={24} />
              </button>
              <div className="menu-secondary">
                <button onClick={() => openUtility('camp')}>
                  <Hammer size={18} /> 营地与图鉴 <ChevronRight size={17} />
                </button>
                <button onClick={() => openUtility('settings')}>
                  <Settings2 size={17} /> 设置
                </button>
              </div>
              <div className="edition-note">
                当前行装 ·{' '}
                {WEAPONS.find((x) => x.id === engine.save.meta.weapon)!.name}
                {engine.save.meta.equipped ? ' · 携带遗器' : ''}
              </div>
              <div className="menu-coordinates">
                <span>35° 40′ N / UNKNOWN</span>
                <span>SECTOR 01 — THE SILENT ARRAY</span>
              </div>
            </div>
            <div className="scene-label">
              <span className="tiny">THE FRACTURED SANCTUM</span>
              <div>
                <span className="signal-dot" /> 裂隙圣所
              </div>
              <p>
                奥术残留强度 <b>87.4%</b>
              </p>
              <div className="signal-bars">
                {Array.from({ length: 36 }, (_, i) => (
                  <i key={i} style={{ height: 7 + ((i * 17) % 25) }} />
                ))}
              </div>
            </div>
            <div className="menu-bottom-note">
              <span className="diamond">◇</span> 旧世界的魔法，正在新世界重启。
            </div>
          </div>
        )}
        {!['menu', 'victory', 'gameover'].includes(w.phase) && (
          <>
            <div className="hud-top">
              <div className="health-panel">
                <div className="hud-caption">
                  <span>ARСANIST / 行动者</span>
                  <b>LV.{String(w.level).padStart(2, '0')}</b>
                </div>
                <div className="health-line">
                  <Shield size={20} />
                  <div className="hp-track">
                    <i style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
                  </div>
                  <strong>
                    {Math.ceil(p.hp)}
                    <small> / {p.maxHp}</small>
                  </strong>
                </div>
                <div className="xp-track">
                  <i style={{ width: `${(w.xp / (w.level * 55)) * 100}%` }} />
                </div>
                {p.shield > 0 && (
                  <span className="shield-tag">护盾 +{p.shield}</span>
                )}
                <WalletBar
                  engine={engine}
                  interactive
                  labels={{
                    bomb: controlLabel('Bomb', 'B'),
                    potion: controlLabel('Potion', 'R'),
                  }}
                />
              </div>
              <div className="room-hud">
                <div className="hud-caption">
                  SECTOR {String(w.room.index).padStart(2, '0')}{' '}
                  <span>/ {w.campaign === 'pilgrimage' ? '12' : '08'}</span>
                </div>
                <h2>{w.room.name}</h2>
                <p>
                  {engine.practice
                    ? `无尽试炼 · 波次 ${w.wave}`
                    : w.room.kind === 'boss'
                      ? '击败核心实体'
                      : w.room.kind === 'challenge'
                        ? `驻守中央符阵 ${w.challengeTime.toFixed(1)} / 18 秒`
                        : w.phase === 'event'
                          ? '此处暂时安全'
                          : `清除异常 · 波次 ${w.wave} / ${w.campaign === 'pilgrimage' ? (w.room.kind === 'elite' ? 4 : 3) : w.room.index === 1 ? 4 : 8}`}
                </p>
              </div>
              <div className="hud-right">
                <span>{formatTime(w.elapsed)}</span>
                <button aria-label="暂停" onClick={() => engine.pause()}>
                  <Pause size={17} />
                </button>
              </div>
            </div>
            {w.boss && (
              <div className="boss-health">
                <div>
                  <span>{ENEMIES[w.boss.kind].name}</span>
                  <small>PHASE 0{w.boss.phase}</small>
                </div>
                <div className="boss-track">
                  <i
                    style={{ width: `${(w.boss.hp / w.boss.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <BuildHUD cards={w.cards} />
            <HybridHUD engine={engine} />
            {w.fieldBuff && (
              <div className="field-buff">
                祝祷符阵 · {controlLabel('Pulse', 'Q')} /{' '}
                {controlLabel('Gravity', 'E')} 加速恢复
              </div>
            )}
            {engine.practice && (
              <div className="practice-banner">
                <FlaskConical size={14} /> 无敌试炼 · 不影响存档{' '}
                <button onClick={() => openUtility('lab')}>切换组合</button>
                <button
                  onClick={() => {
                    w.phase = 'menu';
                    render((n) => n + 1);
                  }}
                >
                  退出试炼
                </button>
              </div>
            )}
            <div className="hud-bottom">
              <div className="kill-count">
                <span>已净化</span>
                <b>{String(w.kills).padStart(3, '0')}</b>
                <small>ENTITIES</small>
              </div>
              <div className="skills">
                <Skill
                  icon={<WeaponIcon id={w.weapon} />}
                  label={WEAPONS.find((item) => item.id === w.weapon)!.name}
                  keycap={controlLabel('PrimaryAttack', 'LMB')}
                  value={0}
                  max={1}
                />
                <Skill
                  icon={<Wind />}
                  label="相位跃迁"
                  keycap={controlLabel('Dash', 'SPACE')}
                  value={p.dashCd}
                  max={w.stats.dashCooldown}
                />
                <Skill
                  icon={<Zap />}
                  label="湮灭脉冲"
                  keycap={controlLabel('Pulse', 'Q')}
                  value={p.qCd}
                  max={w.stats.qCooldown}
                />
                <Skill
                  icon={<Orbit />}
                  label="引力奇点"
                  keycap={controlLabel('Gravity', 'E')}
                  value={p.eCd}
                  max={w.stats.eCooldown}
                />
              </div>
              <div className="move-tip">
                <span>
                  <kbd>{movementLabel}</kbd>
                </span>
                <small>移动 / {gamepad ? '右摇杆' : '鼠标'}瞄准</small>
              </div>
            </div>
          </>
        )}
        {(w.phase === 'transition' || w.phase === 'bossIntro') && (
          <div
            className={`room-intro ${w.phase === 'bossIntro' ? 'danger' : ''}`}
          >
            <span>
              {w.phase === 'bossIntro'
                ? 'WARNING // 核心实体已激活'
                : `ENTERING SECTOR 0${w.room.index}`}
            </span>
            <h2>{w.room.name}</h2>
            <p>
              {w.room.kind === 'boss'
                ? LORE.find(
                    (l) =>
                      l.id ===
                      (w.room.bossKind ||
                        (w.room.index === 4 ? 'warden' : 'oracle')),
                  )?.text
                : w.room.biome === 'grove'
                  ? '她让所有的名字，都长成了树。'
                  : w.room.biome === 'foundry'
                    ? '没有居民的城，仍然需要温暖。'
                    : w.room.subtitle}
            </p>
          </div>
        )}
        {w.phase === 'paused' && (
          <div className="modal-shade">
            <section className="pause-panel">
              <div className="eyebrow">CONNECTION SUSPENDED</div>
              <h2>行动已暂停</h2>
              <p>
                相位跃迁可以穿过敌人和弹幕。
                <br />
                近身脉冲清除弹幕，引力奇点在准星方向生成引力场。
              </p>
              <div className="control-grid">
                <span>
                  <kbd>{movementLabel}</kbd> 移动
                </span>
                <span>
                  <kbd>{gamepad ? '右摇杆' : '鼠标'}</kbd> 瞄准
                </span>
                <span>
                  <kbd>{controlLabel('PrimaryAttack', 'LMB')}</kbd> 持续射击
                </span>
                <span>
                  <kbd>{controlLabel('Dash', 'SPACE')}</kbd> 闪避
                </span>
                <span>
                  <kbd>
                    {controlLabel('Pulse', 'Q')} /{' '}
                    {controlLabel('Gravity', 'E')}
                  </kbd>{' '}
                  主动技能
                </span>
                <span>
                  <kbd>{controlLabel('Pause', 'ESC')}</kbd> 暂停
                </span>
              </div>
              <button className="start-button" onClick={() => engine.pause()}>
                <span>
                  <Play size={18} /> 继续行动
                </span>
                <ArrowRight size={20} />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  w.phase = 'menu';
                  render((n) => n + 1);
                }}
              >
                返回主界面
              </button>
            </section>
          </div>
        )}
        {w.phase === 'reward' && <CardDraft engine={engine} />}
        {w.phase === 'map' &&
          (w.campaign === 'pilgrimage' ? (
            <ExpeditionMap key={w.room.nodeId} engine={engine} />
          ) : (
            <RouteMap engine={engine} />
          ))}
        {w.phase === 'event' && <EncounterPanel engine={engine} />}
        {(w.phase === 'victory' || w.phase === 'gameover') && (
          <div className={`modal-shade end-shade ${w.phase}`}>
            <section className="pause-panel">
              <div className="end-emblem">
                <i />
                <Orbit size={47} strokeWidth={1} />
              </div>
              <div className="eyebrow">
                {w.phase === 'victory' ? 'NETWORK RESTORED' : 'CONNECTION LOST'}
              </div>
              <h2>
                {w.phase === 'victory' ? '边界，已突破。' : '信号暂时中断。'}
              </h2>
              <p>
                {w.phase === 'victory'
                  ? '所有的灯都熄灭了。只有门后，响起了一次迟来的敲门声。'
                  : '每一次重启，都是新的可能。'}
              </p>
              <div className="result-stats">
                <div>
                  <b>
                    {w.room.index}
                    <small>/ {w.campaign === 'pilgrimage' ? 12 : 8}</small>
                  </b>
                  <span>最深区域</span>
                </div>
                <div>
                  <b>{w.kills}</b>
                  <span>净化实体</span>
                </div>
                <div>
                  <b>{formatTime(w.elapsed)}</b>
                  <span>行动时间</span>
                </div>
              </div>
              <div className="end-build">
                <div className="shard-settlement">
                  本次带回 {w.settlement} 碎片 · 途中已归档 {w.banked}
                  <br />
                  <small>
                    营地余额 {engine.save.meta.shards} · 可用于升级下一次行动
                  </small>
                </div>
                {w.cards.length} 项协议已整合{' '}
                <span>总伤害 {Math.round(w.totalDamage).toLocaleString()}</span>
                <small>SEED {w.seed}</small>
              </div>
              <button className="start-button" onClick={start}>
                <span>再次跃迁</span>
                <ArrowUpRight />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  w.phase = 'menu';
                  render((n) => n + 1);
                }}
              >
                返回主界面
              </button>
            </section>
          </div>
        )}
      </section>
      <footer className="bottombar">
        <span>
          <i /> ALL SYSTEMS UNSTABLE
        </span>
        <span>
          {movementLabel} 移动 <i>·</i> {controlLabel('PrimaryAttack', 'LMB')}{' '}
          攻击 <i>·</i> {controlLabel('Bomb', 'B')} 炸弹 <i>·</i>{' '}
          {controlLabel('Potion', 'R')} 灵药
        </span>
        <span>
          ARCANE RESEARCH COLLECTIVE <b>© 2026</b>
        </span>
      </footer>
      <div className="mobile-notice">
        建议使用桌面浏览器与键鼠游玩。横向屏幕体验更佳。
      </div>
      <UtilityPanel
        controls={scene.current?.actions}
        key={utility || 'closed'}
        mode={utility}
        onClose={() => {
          setUtility(null);
          // Let the dialog consume Escape before gameplay keyboard handling resumes.
          requestAnimationFrame(() => {
            if (scene.current) scene.current.inputBlocked = false;
          });
        }}
        engine={engine}
        synth={synth}
      />
    </main>
  );
}
function Skill({
  icon,
  label,
  keycap,
  value,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  keycap: string;
  value: number;
  max: number;
}) {
  return (
    <div className={`skill ${value > 0 ? 'cooling' : ''}`}>
      <div className="skill-icon">
        {icon}
        {value > 0 && (
          <>
            <i style={{ height: `${(value / max) * 100}%` }} />
            <b>{value.toFixed(1)}</b>
          </>
        )}
      </div>
      <div>
        <span>{label}</span>
        <kbd>{keycap}</kbd>
      </div>
    </div>
  );
}
