import { useTranslation } from './i18n';
import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  Maximize,
  Settings2,
  ChevronRight,
  Orbit,
  Pause,
  Play,
  FlaskConical,
  Hammer,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { FieldGuide } from '../game/field-guide';
import { FieldGuidePanel } from './FieldGuidePanel';
import { hudSignature } from './hud-signature';
import { roomWaveCount } from '../rooms/generator';
import { CoachPanel } from './CoachPanel';
import { validateCards } from '../coach/knowledge';
import { deriveStats } from '../cards/system';
import type { World } from '../game/world';
import { announceLanguageChange, copy, useLanguage } from './i18n';
import { ArtGlyph } from './ArtGlyph';
const engine = new Engine();
const synth = new Synth();
const formatTime = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`;
export default function GameApp() {
  const t = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const [, render] = useState(0);
  const language = useLanguage(engine.save.settings.language);
  const ui = (zh: string, en: string) => copy(language, zh, en);
  const [loaded, setLoaded] = useState(false);
  const [bootSlow, setBootSlow] = useState(false);
  const [replaceRun, setReplaceRun] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');
  const scene = useRef<ArcScene | null>(null);
  const guide = useRef(new FieldGuide());
  const [coachOpen, setCoachOpen] = useState(false);
  const coachPause = useRef<{ world: World; resume: boolean } | null>(null);
  const coachTrial = useRef<{
    world: World;
    title: string;
    done: boolean;
  } | null>(null);
  const [utility, setUtility] = useState<
    'settings' | 'library' | 'help' | 'lab' | 'workshop' | 'camp' | null
  >(null);
  const reducedMotion = engine.save.settings.reducedMotion;
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
    return () => {
      delete document.documentElement.dataset.reducedMotion;
    };
  }, [reducedMotion]);
  useEffect(() => {
    if (loaded) return;
    const timer = window.setTimeout(() => setBootSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loaded]);
  useEffect(() => {
    let disposed = false;
    const s = new ArcScene(engine);
    s.onReady = () => {
      if (!disposed && scene.current === s) setLoaded(true);
    };
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
    let signature = '',
      phase = engine.world.phase,
      hudCommits = 0;
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa'))
      void import('../game/qa').then((m) => {
        if (disposed || scene.current !== s) return;
        const qa = m.installQA(engine, synth);
        qa.scene = s;
        qa.renderMetrics = () => ({ ...s.displayMetrics, hudCommits });
        qa.guide = guide.current;
      });
    s.onTick = () => {
      const now = performance.now();
      guide.current.tick(engine);
      const trial = coachTrial.current;
      if (
        trial &&
        (trial.world !== engine.world || engine.world.phase === 'menu')
      )
        coachTrial.current = null;
      else if (trial && (trial.done || engine.world.elapsed >= 30)) {
        trial.done = true;
        if (['playing', 'transition', 'bossIntro'].includes(engine.world.phase))
          engine.pause();
      }
      s.pauseBlocked =
        (guide.current.active && guide.current.step === 'forge') ||
        coachTrial.current?.done === true;
      synth.settings = engine.save.settings;
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
      if (now - last > 80 || phase !== engine.world.phase) {
        const next = hudSignature(
          engine,
          s.actions,
          guide.current.active ? guide.current.step : '',
        );
        if (next !== signature) {
          signature = next;
          hudCommits++;
          render((n) => n + 1);
        }
        phase = engine.world.phase;
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
      disposed = true;
      off();
      webOff();
      s.release();
      synth.dispose();
      game.destroy(true);
      if (scene.current === s) scene.current = null;
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
  const beginRun = () => {
    synth.unlock();
    synth.ui();
    guide.current.stop();
    engine.start();
    render((n) => n + 1);
  };
  const start = () => {
    if (engine.save.checkpoint) {
      guide.current.stop();
      engine.world.phase = 'menu';
      setReplaceRun(true);
    } else beginRun();
  };
  const startTutorial = () => {
    synth.unlock();
    synth.ui();
    guide.current.start(engine);
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
  const openCoach = () => {
    synth.unlock();
    const resume = ['playing', 'transition', 'bossIntro'].includes(
      engine.world.phase,
    );
    coachPause.current = { world: engine.world, resume };
    if (resume) engine.pause();
    if (scene.current) scene.current.inputBlocked = true;
    setCoachOpen(true);
  };
  const closeCoach = () => {
    setCoachOpen(false);
    if (
      coachPause.current?.resume &&
      coachPause.current.world === engine.world &&
      engine.world.phase === 'paused'
    )
      engine.pause();
    coachPause.current = null;
    requestAnimationFrame(() => {
      if (scene.current) scene.current.inputBlocked = false;
    });
  };
  return (
    <main
      className={`game-shell phase-${w.phase}${engine.practice ? ' is-practice' : ''}`}
    >
      <header className="topbar">
        <a
          className="wordmark"
          href="./"
          aria-label={t(ui('ARC SHIFT 首页', 'ARC SHIFT home'))}
        >
          ARC<span>{t('//')}</span>SHIFT
          <i>{t(ui('奥术跃迁', 'ARCANE SHIFT'))}</i>
        </a>
        <div className="topbar-center">
          <span className="signal-dot" />{' '}
          {t(ui('本地行动 · 已就绪', 'LOCAL OPERATION · READY'))}
        </div>
        <div className="top-actions">
          {w.phase === 'menu' && (
            <a className="artfolio-link" href="/art-direction/index.html">
              {ui('美术档案', 'ART DIRECTION')} <ArrowUpRight size={13} />
            </a>
          )}
          <span className="version">GRAVEN / 2.5</span>
          <button
            className="header-language"
            aria-label={ui('切换为 English', 'Switch to 中文')}
            onClick={() => {
              engine.save.settings.language = language === 'zh' ? 'en' : 'zh';
              engine.persist();
              announceLanguageChange(engine.save.settings.language);
            }}
          >
            {language === 'zh' ? 'EN' : '中文'}
          </button>
          <button
            aria-label={ui('操作指南', 'How to play')}
            onClick={() => openUtility('help')}
          >
            <BookOpen size={18} />
          </button>
          <button
            aria-label={t(ui('打开战术教练', 'Open tactical coach'))}
            disabled={
              !loaded ||
              guide.current.active ||
              !!coachTrial.current ||
              !!utility
            }
            onClick={openCoach}
          >
            <Orbit size={18} />
          </button>
          <button
            aria-label={t(
              engine.save.settings.muted
                ? ui('开启声音', 'Enable sound')
                : ui('静音', 'Mute'),
            )}
            onClick={() => {
              synth.unlock();
              engine.save.settings.muted = !engine.save.settings.muted;
              engine.persist();
              render((n) => n + 1);
            }}
          >
            <AudioLines size={18} />
          </button>
          <button
            aria-label={t(ui('系统设置', 'System settings'))}
            onClick={() => openUtility('settings')}
          >
            <Settings2 size={18} />
          </button>
          <button
            aria-label={t(ui('全屏', 'Fullscreen'))}
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await document.documentElement.requestFullscreen();
                setDisplayMessage('');
              } catch {
                setDisplayMessage(
                  ui(
                    '浏览器未允许全屏，可继续在窗口中游玩。',
                    'Fullscreen is unavailable. You can keep playing in this window.',
                  ),
                );
              }
            }}
          >
            <Maximize size={17} />
          </button>
        </div>
      </header>
      <section
        className="viewport"
        aria-label={t(ui('游戏战场', 'Game battlefield'))}
      >
        <div className="game-canvas" ref={container} />
        <div className="vignette" />
        {w.phase === 'menu' && (
          <div className="menu-overlay">
            <img className="menu-keyart" src="/art/keyart-v23.webp" alt="" />
            <div className="sanctum-orbit" aria-hidden="true">
              <ArtGlyph />
              <span>THE GRAVEN ATLAS</span>
            </div>
            <div className="menu-copy">
              <div className="eyebrow">
                <span /> THE GRAVEN ATLAS · v2.5
              </div>
              <h1>
                ARC<span>{t('//')}</span>
                <br />
                SHIFT<span className="title-period">.</span>
              </h1>
              <div className="cn-title">
                <span>{t(ui('奥 术 跃 迁', 'ARCANE SHIFT'))}</span>
                <i>
                  {t(
                    ui(
                      '力量有价，选择有回声。',
                      'Power has a price. Every choice echoes.',
                    ),
                  )}
                </i>
              </div>
              <p className="menu-description">
                {t(
                  ui(
                    '随机武装出发，组合协议强化攻击。沿路线前进，击败第 4、8、12 层的核心。',
                    'Start with a random weapon, combine protocols, and follow your route to defeat the cores in sectors 4, 8 and 12.',
                  ),
                )}
              </p>
              <div className="launch-basics">
                <span>
                  <kbd>{t(movementLabel)}</kbd> {ui('移动', 'Move')} ·{' '}
                  <kbd>{t(controlLabel('PrimaryAttack', 'LMB'))}</kbd>{' '}
                  {ui('按住攻击', 'Hold to fire')} ·{' '}
                  <kbd>{t(controlLabel('Dash', 'SPACE'))}</kbd>{' '}
                  {ui('闪避', 'Dash')}
                </span>
                <button disabled={!loaded} onClick={startTutorial}>
                  {ui(
                    '新手引导 · 先学基础操作 →',
                    'New here? Learn the basics →',
                  )}
                </button>
              </div>
              {!loaded && bootSlow && (
                <output className="launch-retry">
                  {ui(
                    '场景加载时间较长，请检查网络。',
                    'Scene loading is taking longer. Check your connection.',
                  )}{' '}
                  <button onClick={() => location.reload()}>
                    {ui('重新加载', 'Reload game')}
                  </button>
                </output>
              )}
              {!engine.storageAvailable && (
                <output className="launch-retry">
                  {ui(
                    '浏览器未能保存进度。请在设置中下载备份，再离开页面。',
                    'Progress could not be saved. Download a backup in Settings before leaving.',
                  )}
                </output>
              )}
              {engine.save.checkpoint && (
                <>
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
                      {t(ui('继续行动', 'Continue run'))}
                    </span>
                    <span>
                      {t(ui('第', 'SECTOR '))}{' '}
                      {engine.save.checkpoint.room.index} {t(ui('层', ''))}
                      {t(' ')}
                      <ArrowRight size={18} />
                    </span>
                  </button>
                  <p
                    className="checkpoint-summary"
                    aria-label={ui('存档摘要', 'Saved run summary')}
                  >
                    {t(
                      WEAPONS.find(
                        (weapon) =>
                          weapon.id ===
                          (engine.save.checkpoint?.weapon || 'arc'),
                      )!.name,
                    )}{' '}
                    · {Math.ceil(engine.save.checkpoint.hp)} HP ·{' '}
                    {formatTime(engine.save.checkpoint.elapsed)}
                    <br />
                    {engine.save.checkpoint.progress === 'reward'
                      ? ui(
                          '从清场奖励继续',
                          'Resume at the cleared-room reward',
                        )
                      : engine.save.checkpoint.progress === 'map'
                        ? ui('从路线选择继续', 'Resume at route selection')
                        : engine.save.checkpoint.progress === 'event'
                          ? ui(
                              '从当前遭遇继续',
                              'Resume at the current encounter',
                            )
                          : ui(
                              '从本区域入口继续；战斗内的临时进度不保存',
                              'Resume at the room entrance; mid-combat progress is not saved',
                            )}
                  </p>
                </>
              )}
              <button
                className={
                  engine.save.checkpoint ? 'new-journey-button' : 'start-button'
                }
                onClick={start}
                disabled={!loaded}
              >
                <span>
                  <Play size={18} fill="currentColor" />
                  {t(' ')}
                  {t(
                    loaded
                      ? ui('开始行动', 'Start run')
                      : ui('正在连接', 'Connecting'),
                  )}
                </span>
                <ArrowUpRight size={24} />
              </button>
              <div className="menu-secondary">
                <button
                  className="mode-entry frontier-entry"
                  onClick={() => location.assign('/frontier')}
                >
                  <span>
                    {ui('边境行动', 'FRONTIER OPERATIONS')}{' '}
                    <b>{ui('全新行动', 'NEW OPERATION')}</b>
                  </span>
                  <span>
                    {ui(
                      '重连信标 · 回收遗物 · 护送核心',
                      'Relay capture · Relic recovery · Core escort',
                    )}{' '}
                    <ArrowRight size={17} />
                  </span>
                </button>
                <button
                  className="mode-entry"
                  onClick={() => location.assign('/build-trial')}
                >
                  <span>
                    {t(ui('星铸协议', 'STARFORGE PROTOCOL'))}{' '}
                    <b>{t(ui('构筑远征', 'Build Expedition'))}</b>
                  </span>
                  <span>
                    {t(ui('武装 → 合约 → 构筑', 'Weapon → Contract → Build'))}{' '}
                    <ArrowRight size={17} />
                  </span>
                </button>
                <button
                  className="mode-entry"
                  onClick={() => location.assign('/challenge')}
                >
                  <span>
                    {t(ui('中继争夺', 'RELAY CONTEST'))}{' '}
                    <b>{t(ui('挑战活动', 'Challenge'))}</b>
                  </span>
                  <span>
                    {t(ui('75 秒守点', '75-second hold'))}{' '}
                    <ArrowRight size={17} />
                  </span>
                </button>
                <button
                  className="guide-entry"
                  disabled={!loaded}
                  onClick={startTutorial}
                >
                  <span>
                    {t(ui('第一次跃迁', 'First Shift'))}{' '}
                    <b>{t(ui('行动演练', 'Run tutorial'))}</b>
                  </span>
                  <span>
                    {t(ui('移动 → 共鸣 → Boss', 'Move → Resonate → Boss'))}{' '}
                    <ArrowRight size={17} />
                  </span>
                </button>
                <button onClick={() => openUtility('camp')}>
                  <Hammer size={18} /> {t(ui('营地与图鉴', 'Camp & Codex'))}{' '}
                  <ChevronRight size={17} />
                </button>
                <button onClick={openCoach} disabled={!loaded}>
                  <Orbit size={17} /> {t(ui('战术教练', 'Tactical coach'))}
                </button>
              </div>
              <div className="edition-note">
                {t(
                  ui(
                    '新行动随机初始武器 · 每次构筑，从意外开始',
                    'New runs start with a random weapon · Every build begins with the unexpected',
                  ),
                )}
                {t(
                  engine.save.meta.equipped
                    ? ui(' · 携带遗器', ' · Relic equipped')
                    : '',
                )}
              </div>
              <div className="menu-coordinates">
                <span>35° 40′ N / UNKNOWN</span>
                <span>SECTOR 01 — THE SILENT ARRAY</span>
              </div>
            </div>
            <div className="scene-label">
              <div className="scene-index" aria-hidden="true">
                I <span>— XII</span>
              </div>
              <span className="tiny">THE FRACTURED SANCTUM</span>
              <div>
                <span className="signal-dot" />{' '}
                {t(ui('裂隙圣所', 'FRACTURED SANCTUM'))}
              </div>
              <p>
                {t(ui('奥术残留强度', 'ARCANE RESIDUE'))} <b>87.4%</b>
              </p>
              <div className="signal-bars">
                {Array.from({ length: 36 }, (_, i) => (
                  <i key={i} style={{ height: 7 + ((i * 17) % 25) }} />
                ))}
              </div>
            </div>
            <div className="menu-bottom-note">
              <span className="diamond">◇</span>{' '}
              {t(
                ui(
                  '旧世界的魔法，正在新世界重启。',
                  'The old world’s magic is rebooting in the new.',
                ),
              )}
            </div>
          </div>
        )}
        {!['menu', 'victory', 'gameover'].includes(w.phase) && (
          <>
            <div className="hud-top">
              <div
                className={`health-panel ${p.hp / p.maxHp <= 0.3 ? 'health-critical' : ''}`}
              >
                <div className="hud-caption">
                  <span>{t(ui('生命共鸣', 'VITAL RESONANCE'))}</span>
                  <b>LV.{t(String(w.level).padStart(2, '0'))}</b>
                </div>
                <div className="health-line">
                  <ArtGlyph variant="vital" />
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
                  <span className="shield-tag">
                    {t(ui('护盾', 'SHIELD'))} +{p.shield}
                  </span>
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
                  SECTOR {t(String(w.room.index).padStart(2, '0'))}
                  {t(' ')}
                  <span>/ {t(w.campaign === 'pilgrimage' ? '12' : '08')}</span>
                </div>
                <h2>{t(w.room.name)}</h2>
                <p>
                  {t(
                    guide.current.active
                      ? ui(
                          '行动演练 · 完成左侧目标',
                          'TUTORIAL · COMPLETE THE OBJECTIVE',
                        )
                      : engine.practice
                        ? coachTrial.current
                          ? ui(
                              '战术验证场 · 30 秒演练',
                              'TACTICAL FIELD · 30s TRIAL',
                            )
                          : `${ui('无尽试炼 · 波次', 'ENDLESS TRIAL · WAVE')} ${w.wave}`
                        : w.room.kind === 'boss'
                          ? ui('击败核心实体', 'DEFEAT THE CORE ENTITY')
                          : w.room.kind === 'challenge'
                            ? `${ui('驻守中央符阵', 'HOLD THE CENTRAL SIGIL')} ${w.challengeTime.toFixed(1)} / ${ui('18 秒', '18s')}`
                            : w.phase === 'event'
                              ? ui('此处暂时安全', 'SAFE FOR NOW')
                              : `${ui('清除异常 · 波次', 'CLEAR ANOMALIES · WAVE')} ${w.wave} / ${w.campaign === 'pilgrimage' ? (w.room.kind === 'elite' ? w.content.encounters[0].params.eliteWaves : w.content.encounters[0].params.combatWaves) : roomWaveCount(w.room.index)}`,
                  )}
                </p>
              </div>
              <div className="hud-right">
                <small>{ui('行动时间', 'RUN TIME')}</small>
                <span>{t(formatTime(w.elapsed))}</span>
                <button
                  aria-label={t(ui('暂停', 'Pause'))}
                  disabled={coachTrial.current?.done === true}
                  onClick={() => engine.pause()}
                >
                  <Pause size={17} />
                </button>
              </div>
            </div>
            {w.boss && (
              <div className="boss-health">
                <div>
                  <span>{t(ENEMIES[w.boss.kind].name)}</span>
                  <small>PHASE 0{w.boss.phase}</small>
                </div>
                <div className="boss-track">
                  <i
                    style={{ width: `${(w.boss.hp / w.boss.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <BuildHUD cards={w.cards} weapon={w.weapon} />
            <HybridHUD engine={engine} />
            {w.fieldBuff && (
              <div className="field-buff">
                {t(ui('祝祷符阵', 'BLESSING SIGIL'))} ·{' '}
                {t(controlLabel('Pulse', 'Q'))} /{t(' ')}
                {t(controlLabel('Gravity', 'E'))}{' '}
                {t(ui('加速恢复', 'accelerated recovery'))}
              </div>
            )}
            {engine.practice &&
              !guide.current.active &&
              !coachTrial.current && (
                <div className="practice-banner">
                  <FlaskConical size={14} />{' '}
                  {t(
                    ui(
                      '无敌试炼 · 不影响存档',
                      'INVULNERABLE TRIAL · SAVE UNCHANGED',
                    ),
                  )}
                  {t(' ')}
                  <button onClick={() => openUtility('lab')}>
                    {t(ui('切换组合', 'Change build'))}
                  </button>
                  <button
                    onClick={() => {
                      w.phase = 'menu';
                      render((n) => n + 1);
                    }}
                  >
                    {t(ui('退出试炼', 'Exit trial'))}
                  </button>
                </div>
              )}
            <div className="hud-bottom">
              <div className="kill-count">
                <span>{t(ui('已净化', 'PURIFIED'))}</span>
                <b>{t(String(w.kills).padStart(3, '0'))}</b>
                <small>ENTITIES</small>
              </div>
              <div className="skills">
                <Skill
                  icon={<WeaponIcon id={w.weapon} />}
                  label={t(WEAPONS.find((item) => item.id === w.weapon)!.name)}
                  keycap={controlLabel('PrimaryAttack', 'LMB')}
                  value={0}
                  max={1}
                  kind="weapon"
                />
                <Skill
                  icon={<ArtGlyph variant="shift" />}
                  label={t(ui('相位跃迁', 'Phase shift'))}
                  keycap={controlLabel('Dash', 'SPACE')}
                  value={p.dashCd}
                  max={w.stats.dashCooldown}
                  kind="shift"
                />
                <Skill
                  icon={<ArtGlyph variant="pulse" />}
                  label={t(ui('湮灭脉冲', 'Annihilation pulse'))}
                  keycap={controlLabel('Pulse', 'Q')}
                  value={p.qCd}
                  max={w.stats.qCooldown}
                  kind="pulse"
                />
                <Skill
                  icon={<ArtGlyph variant="well" />}
                  label={t(ui('引力奇点', 'Gravity singularity'))}
                  keycap={controlLabel('Gravity', 'E')}
                  value={p.eCd}
                  max={w.stats.eCooldown}
                  kind="well"
                />
              </div>
              <div className="move-tip">
                <span>
                  <kbd>{t(movementLabel)}</kbd>
                </span>
                <small>
                  {t(ui('移动 / ', 'Move / '))}
                  {t(
                    gamepad ? ui('右摇杆', 'right stick') : ui('鼠标', 'mouse'),
                  )}{' '}
                  {t(ui('瞄准', 'aim'))}
                </small>
              </div>
            </div>
          </>
        )}
        {(w.phase === 'transition' || w.phase === 'bossIntro') && (
          <div
            className={`room-intro ${w.phase === 'bossIntro' ? 'danger' : ''}`}
          >
            <span>
              {t(
                w.phase === 'bossIntro'
                  ? ui(
                      'WARNING // 核心实体已激活',
                      'WARNING // CORE ENTITY ACTIVE',
                    )
                  : `${ui('进入区域', 'ENTERING SECTOR')} 0${w.room.index}`,
              )}
            </span>
            <h2>{t(w.room.name)}</h2>
            <p>
              {t(
                w.room.kind === 'boss'
                  ? LORE.find(
                      (l) =>
                        l.id ===
                        (w.room.bossKind ||
                          (w.room.index === 4 ? 'warden' : 'oracle')),
                    )?.text
                  : w.room.biome === 'grove'
                    ? ui(
                        '她让所有的名字，都长成了树。',
                        'She grew every name into a tree.',
                      )
                    : w.room.biome === 'foundry'
                      ? ui(
                          '没有居民的城，仍然需要温暖。',
                          'A city without residents still needs warmth.',
                        )
                      : w.room.subtitle,
              )}
            </p>
          </div>
        )}
        {w.phase === 'paused' &&
          !coachTrial.current?.done &&
          !(guide.current.active && guide.current.step === 'forge') && (
            <div className="modal-shade">
              <section className="pause-panel">
                <ArtGlyph className="panel-seal" />
                <div className="eyebrow">CONNECTION SUSPENDED</div>
                <h2>{t(ui('行动已暂停', 'Run paused'))}</h2>
                <p>
                  {t(
                    ui(
                      '相位跃迁可以穿过敌人和弹幕。',
                      'Phase shift passes through enemies and projectiles.',
                    ),
                  )}
                  <br />
                  {t(
                    ui(
                      '近身脉冲清除弹幕，引力奇点在准星方向生成引力场。',
                      'The close pulse clears projectiles; gravity creates a field toward your reticle.',
                    ),
                  )}
                </p>
                <div className="control-grid">
                  <span>
                    <kbd>{t(movementLabel)}</kbd> {t(ui('移动', 'Move'))}
                  </span>
                  <span>
                    <kbd>
                      {t(
                        gamepad
                          ? ui('右摇杆', 'right stick')
                          : ui('鼠标', 'mouse'),
                      )}
                    </kbd>{' '}
                    {t(ui('瞄准', 'Aim'))}
                  </span>
                  <span>
                    <kbd>{t(controlLabel('PrimaryAttack', 'LMB'))}</kbd>{' '}
                    {t(ui('持续射击', 'Hold to fire'))}
                  </span>
                  <span>
                    <kbd>{t(controlLabel('Dash', 'SPACE'))}</kbd>{' '}
                    {t(ui('闪避', 'Dash'))}
                  </span>
                  <span>
                    <kbd>
                      {t(controlLabel('Pulse', 'Q'))} /{t(' ')}
                      {t(controlLabel('Gravity', 'E'))}
                    </kbd>
                    {t(' ')}
                    {t(ui('主动技能', 'Active skills'))}
                  </span>
                  <span>
                    <kbd>{t(controlLabel('Pause', 'ESC'))}</kbd>{' '}
                    {t(ui('暂停', 'Pause'))}
                  </span>
                </div>
                <button className="start-button" onClick={() => engine.pause()}>
                  <span>
                    <Play size={18} /> {t(ui('继续行动', 'Continue run'))}
                  </span>
                  <ArrowRight size={20} />
                </button>
                <p className="pause-save-note">
                  {engine.practice
                    ? ui(
                        '演练不覆盖主行动存档。',
                        'Practice does not overwrite your campaign save.',
                      )
                    : ui(
                        '已保存区域入口与清场奖励。返回主界面后继续会回到最近检查点；当前战斗内的血量、击杀和消耗品变化会重置。',
                        'Room entrances and cleared-room rewards are saved. Continuing from the menu returns to the last checkpoint; health, kills and consumables used during the current fight reset.',
                      )}
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    w.phase = 'menu';
                    render((n) => n + 1);
                  }}
                >
                  {t(ui('返回主界面', 'Back to menu'))}
                </button>
              </section>
            </div>
          )}
        {w.phase === 'reward' && (
          <CardDraft engine={engine} onCoach={openCoach} />
        )}
        {w.phase === 'map' &&
          (w.campaign === 'pilgrimage' ? (
            <ExpeditionMap key={w.room.nodeId} engine={engine} />
          ) : (
            <RouteMap engine={engine} />
          ))}
        {w.phase === 'event' && <EncounterPanel engine={engine} />}
        {(w.phase === 'victory' || w.phase === 'gameover') &&
          !guide.current.active && (
            <div className={`modal-shade end-shade ${w.phase}`}>
              <section className="pause-panel">
                <div className="end-emblem">
                  <i />
                  <Orbit size={47} strokeWidth={1} />
                </div>
                <div className="eyebrow">
                  {t(
                    w.phase === 'victory'
                      ? ui('NETWORK RESTORED · 网络已恢复', 'NETWORK RESTORED')
                      : ui('CONNECTION LOST · 信号中断', 'CONNECTION LOST'),
                  )}
                </div>
                <h2>
                  {t(
                    w.phase === 'victory'
                      ? ui('边界，已突破。', 'The boundary is broken.')
                      : ui('信号暂时中断。', 'The signal is temporarily lost.'),
                  )}
                </h2>
                <p>
                  {t(
                    w.phase === 'victory'
                      ? ui(
                          '所有的灯都熄灭了。只有门后，响起了一次迟来的敲门声。',
                          'Every light went out. Behind the door, a late knock answered.',
                        )
                      : ui(
                          '每一次重启，都是新的可能。',
                          'Every restart opens a new possibility.',
                        ),
                  )}
                </p>
                <div className="result-stats">
                  <div>
                    <b>
                      {w.room.index}
                      <small>/ {w.campaign === 'pilgrimage' ? 12 : 8}</small>
                    </b>
                    <span>{t(ui('最深区域', 'Deepest sector'))}</span>
                  </div>
                  <div>
                    <b>{w.kills}</b>
                    <span>{t(ui('净化实体', 'Entities purified'))}</span>
                  </div>
                  <div>
                    <b>{t(formatTime(w.elapsed))}</b>
                    <span>{t(ui('行动时间', 'Run time'))}</span>
                  </div>
                </div>
                <div className="end-build">
                  <div className="run-feedback">
                    {t(ui('爆发反应', 'Burst reactions'))} {w.reactionCount} ·{' '}
                    {t(ui('累计承伤', 'damage taken'))}
                    {t(' ')}
                    {Math.round(w.damageTaken)}
                    <br />
                    <small>
                      {t(
                        w.damageTaken > p.maxHp
                          ? ui(
                              '下次尝试：保留跃迁躲开红色预警，近身被包围时使用脉冲清弹。',
                              'Next run: save your shift for red telegraphs and pulse projectiles when surrounded.',
                            )
                          : w.reactionCount === 0
                            ? ui(
                                '想尝试爆发反应，可组合余烬协议与电弧引擎。此处只统计电浆、热裂变和坍缩，其他共鸣不计入。',
                                'Try a burst reaction by combining Ember Protocol with Arc Engine. This tracks plasma, thermal fission, and collapse only.',
                              )
                            : ui(
                                '已触发爆发反应（电浆、热裂变或坍缩）；可在协议档案查找更多组合。',
                                'Burst reaction triggered (plasma, thermal fission, or collapse). Find more combinations in the Protocol Archive.',
                              ),
                      )}
                    </small>
                  </div>
                  <div className="shard-settlement">
                    {t(ui('本次带回', 'Recovered'))} {w.settlement}{' '}
                    {t(ui('碎片 · 途中已归档', 'shards · banked'))} {w.banked}
                    <br />
                    <small>
                      {t(ui('营地余额', 'Camp balance'))}{' '}
                      {engine.save.meta.shards} ·{' '}
                      {t(
                        ui(
                          '可用于升级下一次行动',
                          'available for the next run',
                        ),
                      )}
                    </small>
                  </div>
                  {w.cards.length}{' '}
                  {t(ui('项协议已整合', 'protocols integrated'))}
                  {t(' ')}
                  <span>
                    {t(ui('总伤害', 'total damage'))}{' '}
                    {t(Math.round(w.totalDamage).toLocaleString())}
                  </span>
                  <small>SEED {w.seed}</small>
                </div>
                <button className="start-button" onClick={start}>
                  <span>{t(ui('再次跃迁', 'Shift again'))}</span>
                  <ArrowUpRight />
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    w.phase = 'menu';
                    render((n) => n + 1);
                  }}
                >
                  {t(ui('返回主界面', 'Back to menu'))}
                </button>
              </section>
            </div>
          )}
        {coachTrial.current && w.phase !== 'menu' && (
          <aside
            className="coach-trial"
            aria-label={t(ui('战术演练', 'Tactical field test'))}
          >
            <span>TACTICAL FIELD TEST · {t(ui('无敌', 'INVULNERABLE'))}</span>
            <h3>{t(coachTrial.current.title)}</h3>
            <p>
              {t(
                coachTrial.current.done
                  ? ui('本次演练完成', 'Trial complete')
                  : `${Math.min(30, Math.floor(w.elapsed))} / 30 ${ui('秒 · 自由走位并攻击', 's · move and attack freely')}`,
              )}
            </p>
            <p>
              {t(ui('净化', 'Purified'))} {w.kills} ·{' '}
              {t(ui('实际伤害', 'Damage'))} {Math.round(w.totalDamage)}
              <br />
              {t(
                ui(
                  '按当前键位操作；暂停会冻结计时。存档保持不变。',
                  'Use your current bindings; pausing freezes the timer. Your save is unchanged.',
                ),
              )}
            </p>
            <button
              onClick={() => {
                coachTrial.current = null;
                w.phase = 'menu';
                openCoach();
                render((n) => n + 1);
              }}
            >
              {t(
                coachTrial.current.done
                  ? ui('带着体验返回教练', 'Return to coach')
                  : ui('结束演练并返回教练', 'End trial and return'),
              )}
            </button>
          </aside>
        )}
        <FieldGuidePanel
          guide={guide.current}
          engine={engine}
          keys={{
            move: movementLabel,
            attack: controlLabel('PrimaryAttack', 'LMB'),
            dash: controlLabel('Dash', 'SPACE'),
            pulse: controlLabel('Pulse', 'Q'),
          }}
          refresh={() => render((n) => n + 1)}
          startRun={start}
          exit={() => {
            guide.current.stop();
            w.phase = 'menu';
            render((n) => n + 1);
          }}
        />
      </section>
      <footer className="bottombar">
        <span>
          <i /> {ui('LOCAL ARCHIVE · CONNECTED', 'LOCAL ARCHIVE · CONNECTED')}
        </span>
        <span>
          {t(movementLabel)} {t(ui('移动', 'Move'))} <i>·</i>{' '}
          {t(controlLabel('PrimaryAttack', 'LMB'))}
          {t(' ')}
          {t(ui('攻击', 'Attack'))} <i>·</i> {t(controlLabel('Bomb', 'B'))}{' '}
          {t(ui('炸弹', 'Bomb'))} <i>·</i>
          {t(' ')}
          {t(controlLabel('Potion', 'R'))} {t(ui('灵药', 'Tonic'))}
        </span>
        <span>
          ARCANE RESEARCH COLLECTIVE <b>© 2026</b>
        </span>
      </footer>
      {displayMessage && (
        <output className="display-message">{displayMessage}</output>
      )}
      <Dialog open={replaceRun} onOpenChange={setReplaceRun}>
        <DialogContent className="replace-run-dialog">
          <DialogTitle>
            {ui(
              '开始新行动并替换存档？',
              'Start a new run and replace your save?',
            )}
          </DialogTitle>
          <DialogDescription>
            {ui(
              '当前行动的检查点将被替换。营地升级、已归档碎片和图鉴会保留。想保留这次行动，请选择继续；也可先在设置中下载存档备份。',
              'The current campaign checkpoint will be replaced. Camp upgrades, banked shards and the codex are kept. Choose Continue to keep this run, or download a save backup in Settings first.',
            )}
          </DialogDescription>
          <div className="save-actions">
            <button onClick={() => setReplaceRun(false)}>
              {ui('保留当前行动', 'Keep current run')}
            </button>
            <button
              onClick={() => {
                setReplaceRun(false);
                beginRun();
              }}
            >
              {ui('确认开始新行动', 'Confirm new run')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {coachOpen && (
        <CoachPanel
          engine={engine}
          onClose={closeCoach}
          onSelect={(id) => {
            const chosen = engine.chooseCard(id);
            if (chosen) closeCoach();
            return chosen;
          }}
          onTrial={(candidate, b) => {
            if (
              engine.world.phase !== 'menu' ||
              !validateCards(candidate.cards, engine.content)
            )
              return;
            closeCoach();
            guide.current.stop();
            engine.startPractice(candidate.cards, b.weapon);
            const trialWorld = engine.world;
            trialWorld.forms = [...b.forms];
            trialWorld.level = b.level;
            trialWorld.relics = [...b.relics];
            trialWorld.stats = deriveStats(
              trialWorld.cards,
              b.level,
              trialWorld.relics,
              trialWorld.content,
            );
            trialWorld.room.name = '战术验证场';
            coachTrial.current = {
              world: trialWorld,
              title: candidate.label,
              done: false,
            };
            render((n) => n + 1);
          }}
        />
      )}
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
  kind,
}: {
  icon: React.ReactNode;
  label: string;
  keycap: string;
  value: number;
  max: number;
  kind: 'weapon' | 'shift' | 'pulse' | 'well';
}) {
  const t = useTranslation();
  const language = useLanguage();
  return (
    <div
      className={`skill skill-${kind} ${value > 0 ? 'cooling' : 'ready'}`}
      style={
        {
          '--cooldown': `${Math.max(0, Math.min(1, value / max)) * 100}%`,
        } as React.CSSProperties
      }
    >
      <div className="skill-icon">
        <span className="skill-orbit" aria-hidden="true" />
        {icon}
        {value > 0 && (
          <>
            <i style={{ height: `${(value / max) * 100}%` }} />
            <b>{t(value.toFixed(1))}</b>
          </>
        )}
      </div>
      <div>
        <span>{t(label)}</span>
        <div className="skill-state">
          <kbd>{t(keycap)}</kbd>
          <small>
            {value > 0
              ? copy(language, '回充', 'RECHARGING')
              : copy(language, '就绪', 'READY')}
          </small>
        </div>
      </div>
    </div>
  );
}
