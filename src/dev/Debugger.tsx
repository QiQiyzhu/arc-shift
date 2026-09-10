import { useEffect, useRef, useState } from 'react';
import { DebugSession } from './debug-session';
import { attachDebugDrawing } from './debug-draw';
import { ArenaCanvas } from './ArenaCanvas';
import { ENEMIES } from '../data/enemies';
import { CARDS } from '../cards/catalog';
import type { ArcScene } from '../game/scene';
import type { EnemyKind, WeaponId } from '../game/types';
import './dev.css';
export default function Debugger() {
  const [session] = useState(() => new DebugSession());
  const [, render] = useState(0);
  const [kind, setKind] = useState<EnemyKind>('hunter'), [card, setCard] = useState('fire-split');
  const [notice, setNotice] = useState('Paused at tick 0. Manual debugging never writes the player save.');
  const scene = useRef<ArcScene | null>(null), dispose = useRef<(() => void) | null>(null);
  useEffect(() => {
    const timer = setInterval(() => render(n => n + 1), 100);
    const toggle = (e: KeyboardEvent) => { if (e.code === 'F3') { e.preventDefault(); session.visible = !session.visible; render(n => n + 1); } };
    window.addEventListener('keydown', toggle);
    return () => { clearInterval(timer); window.removeEventListener('keydown', toggle); };
  }, [session]);
  const w = session.engine.world, stats = session.stats;
  const enemy = w.enemies.find(e => e.id === session.selected);
  const run = (fn: () => void) => { fn(); render(n => n + 1); };
  return <main className="dev-shell">
    <header><a href="/">ARC//SHIFT</a><b>ENGINEERING / RUNTIME INSPECTOR</b><a href="/dev/content-editor">Content lab</a><a href="/dev/replay">Replay</a></header>
    <div className="dev-title"><div><h1>Simulation debugger</h1><p>Fixed-step execution, live state and collision overlays. F3 shows or hides the overlay.</p></div><span className="dev-badge">DEVELOPMENT ONLY</span></div>
    <div className="dev-toolbar"><button onClick={() => run(() => { session.paused = !session.paused; })}>{session.paused ? 'Resume simulation' : 'Pause simulation'}</button><button onClick={() => run(() => session.singleStep())}>Single tick</button><label>Time scale <select aria-label="Debug time scale" value={session.speed} onChange={e => run(() => { session.speed = Number(e.target.value) as typeof session.speed; })}>{[.25, .5, 1, 2].map(n => <option key={n} value={n}>{n}×</option>)}</select></label>{(['visible', 'hitboxes', 'grid', 'labels'] as const).map(flag => <label key={flag}><input type="checkbox" checked={session[flag]} onChange={e => run(() => { session[flag] = e.target.checked; })} /> {flag}</label>)}</div>
    <div className="dev-layout">
      <section><div className="debug-canvas"><ArenaCanvas engine={session.engine} step={(_dt, input) => session.advance(input)} onScene={next => { dispose.current?.(); dispose.current = null; scene.current = next; if (next) dispose.current = attachDebugDrawing(next, session); }} />
        {session.visible && <div className="debug-overlay" aria-label="Runtime diagnostics"><strong>LIVE / FIXED 60 Hz</strong><pre>{`FPS ${stats.fps.toFixed(1)} · frame mean ${stats.frameMs.toFixed(2)} ms\nEngine step P95 ${stats.stepP95.toFixed(3)} ms\nTick ${w.tick} · RNG ${w.rng.seed}\nEnemies ${w.enemies.length} · hazards ${w.hazards.length}\nProjectiles ${w.projectiles.count}/${w.projectiles.capacity} · misses ${w.projectiles.misses}\nFX ${scene.current?.effects.particles.count ?? 0}/650 · misses ${scene.current?.effects.particles.misses ?? 0}\nGrid ${w.spatial.cells.size} occupied cells\nQueries separation ${w.queries.separation} · sweep ${w.queries.projectile}`}</pre></div>}
      </div><p>Rolling 120 rendered frames / 240 engine steps; not a controlled benchmark. AI labels show at most 60 enemies. Grid overlays reflect the last collision rebuild. Single tick uses neutral controls; slow motion latches skill edges until a simulation tick consumes them.</p><output className="content-message">{notice}</output></section>
      <aside className="dev-panel"><h2>Interventions</h2><div className="debug-controls"><label>Spawn enemy<select aria-label="Debug enemy type" value={kind} onChange={e => setKind(e.target.value as EnemyKind)}>{Object.entries(ENEMIES).map(([id, e]) => <option key={id} value={id}>{e.name} · {id}</option>)}</select></label><button onClick={() => run(() => { setNotice(session.spawn(kind) ? `Spawned ${kind}; selected ID ${session.selected}.` : 'Spawn rejected: 300-entity limit.'); })}>Spawn enemy / Boss</button><label>Weapon<select aria-label="Debug weapon" value={w.weapon} onChange={e => run(() => { session.setWeapon(e.target.value as WeaponId); })}>{['arc', 'sword', 'cannon'].map(id => <option key={id}>{id}</option>)}</select></label><label>Protocol<select aria-label="Debug protocol" value={card} onChange={e => setCard(e.target.value)}>{CARDS.map(c => <option key={c.id} value={c.id}>{c.name} · {c.id}</option>)}</select></label><button onClick={() => run(() => setNotice(session.grant(card) ? `Granted ${card}.` : 'Already owned or unknown protocol.'))}>Grant protocol</button></div>
      <h2>Player</h2><dl><dt>Tick</dt><dd data-testid="debug-tick">{w.tick}</dd><dt>Health</dt><dd data-testid="debug-hp">{w.player.hp.toFixed(0)} / {w.player.maxHp}</dd><dt>Phase</dt><dd>{w.phase}</dd><dt>Dash / Q / E</dt><dd>{[w.player.dashCd, w.player.qCd, w.player.eCd].map(n => n.toFixed(2)).join(' / ')}</dd><dt>Invulnerable</dt><dd>{w.player.invulnerable.toFixed(2)}</dd><dt>Protocols</dt><dd data-testid="debug-cards">{w.cards.join(', ')}</dd></dl>
      <h2>Enemy inspector</h2><select aria-label="Inspected enemy" value={session.selected ?? ''} onChange={e => run(() => { session.selected = Number(e.target.value); })}><option value="">Select an entity</option>{w.enemies.map(e => <option key={e.id} value={e.id}>#{e.id} {e.kind}</option>)}</select><pre data-testid="debug-enemy">{enemy ? JSON.stringify({ id: enemy.id, kind: enemy.kind, state: enemy.state, timer: enemy.timer, hp: enemy.hp, maxHp: enemy.maxHp, phase: enemy.phase, attackIndex: enemy.attackIndex, burn: enemy.burn, slow: enemy.slow, shield: enemy.shield, x: enemy.x, y: enemy.y }, null, 2) : 'No living selected enemy.'}</pre></aside>
    </div>
  </main>;
}
