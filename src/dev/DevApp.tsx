import { useEffect, useRef, useState } from 'react';
import { Engine } from '../game/engine';
import { blankSave } from '../core/save';
import {
  ReplayRecorder,
  ReplayPlayer,
  checksum,
  exportReplay,
  type Replay,
} from '../replay/replay';
import { ArenaCanvas } from './ArenaCanvas';
import { availableNodes } from '../rooms/expedition';
import { SHOP } from '../economy/catalog';
import './dev.css';

export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function DevApp() {
  const [engine, setEngine] = useState(
    () => new Engine({ save: blankSave(), persistence: false }),
  );
  const recorder = useRef<ReplayRecorder | null>(null),
    player = useRef<ReplayPlayer | null>(null),
    recording = useRef<Replay | null>(null);
  const [seed, setSeed] = useState(73129),
    [error, setError] = useState(''),
    [, render] = useState(0),
    [speed, setSpeed] = useState<1 | 2 | 4>(1),
    [paused, setPaused] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => render((n) => n + 1), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => () => {
      recorder.current?.stop();
    },
    [],
  );
  const w = engine.world;
  function start() {
    try {
      recorder.current?.stop();
      player.current = null;
      recording.current = null;
      const next = new Engine({ save: blankSave(), persistence: false });
      recorder.current = new ReplayRecorder(next, seed);
      setEngine(next);
      setPaused(false);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  function stop() {
    if (recorder.current) {
      recording.current = recorder.current.stop();
      recorder.current = null;
    }
    setPaused(true);
  }
  function load(data: Replay | string) {
    const next = new ReplayPlayer(data);
    if (next.desync) throw Error('Initial replay checksum does not match');
    recorder.current?.stop();
    recorder.current = null;
    recording.current = next.data;
    player.current = next;
    next.speed = speed;
    setEngine(next.engine);
    setPaused(true);
    setError('');
  }
  function toggle() {
    setPaused((v) => {
      if (player.current) player.current.paused = !v;
      return !v;
    });
  }
  const viewing = !!player.current;
  const stopped = viewing ? player.current!.paused : paused;
  return (
    <main className="dev-shell">
      <header>
        <a href="/">ARC//SHIFT</a>
        <b>ENGINEERING / QA REPLAY</b>
        <a href="/dev/content-editor">Content editor</a>
      </header>
      <div className="dev-title">
        <div>
          <h1>Deterministic replay</h1>
          <p>
            Seed + fixed-tick inputs + ordered decisions. Simulation evidence,
            with isolated in-memory progression.
          </p>
        </div>
        <span className="dev-badge">DEVELOPMENT ONLY</span>
      </div>
      <div className="dev-toolbar">
        <label>
          Seed{' '}
          <input
            aria-label="Replay seed"
            type="number"
            min="0"
            max="100000000"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
          />
        </label>
        <button onClick={start}>Record new run</button>
        <button onClick={stop} disabled={!recorder.current}>
          Stop recording
        </button>
        <button
          disabled={!recording.current}
          onClick={() => {
            try {
              load(recording.current!);
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Load recording
        </button>
        <button
          disabled={!recording.current}
          onClick={() => downloadJSON(recording.current, 'arc-replay.json')}
        >
          Export JSON
        </button>
        <label className="dev-file">
          Import JSON
          <input
            aria-label="Import replay"
            type="file"
            accept=".json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f)
                try {
                  if (f.size > 32 * 1024 * 1024)
                    throw Error('File exceeds 32 MiB');
                  load(await f.text());
                } catch (err) {
                  setError(String(err));
                }
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="dev-error">
          {error}
        </p>
      )}
      {player.current?.desync && (
        <p role="alert" className="dev-error">
          Desync at checkpoint tick {player.current.desync.tick}, event{' '}
          {player.current.desync.event}. Expected{' '}
          {player.current.desync.expected}, actual{' '}
          {player.current.desync.actual}. Playback stopped.
        </p>
      )}
      <div className="dev-layout">
        <section>
          <ArenaCanvas
            engine={engine}
            step={(dt, input) => {
              if (viewing) player.current?.frame();
              else if (!paused && recorder.current?.active)
                engine.update(dt, input);
            }}
          />
          <div className="dev-toolbar">
            <button
              onClick={toggle}
              disabled={
                viewing
                  ? player.current!.finished || !!player.current!.desync
                  : !recorder.current
              }
            >
              {stopped ? 'Play' : 'Pause'}
            </button>
            <button
              disabled={
                !stopped ||
                !viewing ||
                player.current!.finished ||
                !!player.current!.desync
              }
              onClick={() => {
                player.current?.step();
                render((n) => n + 1);
              }}
            >
              Step
            </button>
            <label>
              Speed{' '}
              <select
                aria-label="Replay speed"
                value={speed}
                onChange={(e) => {
                  const value = Number(e.target.value) as 1 | 2 | 4;
                  setSpeed(value);
                  if (player.current) player.current.speed = value;
                }}
              >
                <option value={1}>×1</option>
                <option value={2}>×2</option>
                <option value={4}>×4</option>
              </select>
            </label>
            <span>
              {viewing
                ? player.current!.finished
                  ? 'Playback complete'
                  : 'Playback'
                : recorder.current
                  ? 'Recording'
                  : 'Idle'}{' '}
              · {w.phase}
            </span>
          </div>
        </section>
        <aside className="dev-panel">
          <h2>Simulation inspector</h2>
          <dl>
            <dt>Tick</dt>
            <dd data-testid="replay-tick">{w.tick}</dd>
            <dt>Checksum</dt>
            <dd data-testid="replay-checksum">{checksum(engine)}</dd>
            <dt>Entities</dt>
            <dd>
              {w.enemies.length} enemies / {w.projectiles.count} projectiles
            </dd>
            <dt>HP / wallet</dt>
            <dd>
              {Math.ceil(w.player.hp)} / {w.wallet.coins} coins /{' '}
              {w.wallet.keys} keys
            </dd>
            <dt>RNG state</dt>
            <dd>{w.rng.seed}</dd>
          </dl>
          <h3>Recorded decisions</h3>
          <p>
            WASD + mouse, Space / Q / E / B / R. The controls below join the
            same ordered replay stream.
          </p>
          <fieldset disabled={viewing || !recorder.current}>
            <button onClick={() => engine.pause()}>Game pause / resume</button>
            {w.phase === 'reward' &&
              w.rewards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => engine.chooseCard(card.id)}
                >
                  {card.name}
                </button>
              ))}
            {w.phase === 'reward' && w.rewardContext !== 'start' && (
              <button onClick={() => engine.reroll()}>
                Reroll · {12 + w.rerolls * 6} coins
              </button>
            )}
            {w.phase === 'map' &&
              availableNodes(w.seed, w.room.nodeId || '').map((node) => (
                <button key={node.id} onClick={() => engine.travel(node.id)}>
                  {node.room.name} · {node.room.kind}
                </button>
              ))}
            {w.phase === 'event' && (
              <>
                <h3>{w.room.name}</h3>
                {(w.room.kind === 'shop' ? SHOP : []).map((item) => (
                  <button key={item.id} onClick={() => engine.buy(item.id)}>
                    {item.name} · {item.cost} coins
                  </button>
                ))}
                {w.room.kind === 'treasure' && (
                  <>
                    <button onClick={() => engine.openChest('key')}>
                      Open with key
                    </button>
                    <button onClick={() => engine.openChest('bomb')}>
                      Open with bomb
                    </button>
                  </>
                )}
                {(w.room.kind === 'heal'
                  ? ['rest', 'bottle']
                  : w.room.kind === 'forge'
                    ? ['form:sword', 'form:cannon', 'repair']
                    : w.room.kind === 'archive'
                      ? ['read']
                      : w.room.kind === 'event'
                        ? ['blood', 'bell']
                        : w.room.kind === 'treasure'
                          ? ['salvage', 'form:sword', 'form:cannon']
                          : []
                ).map((id) => (
                  <button key={id} onClick={() => engine.resolveEvent(id)}>
                    {id}
                  </button>
                ))}
                <button onClick={() => engine.bankShards()}>
                  Bank shards · 8 coins
                </button>
                <button onClick={() => engine.resolveEvent('leave')}>
                  Leave
                </button>
              </>
            )}
          </fieldset>
          <details>
            <summary>Replay data</summary>
            <pre>
              {recording.current
                ? exportReplay({
                    ...recording.current,
                    events: recording.current.events.slice(0, 6),
                  })
                : 'Stop a recording to export its ordered events.'}
            </pre>
          </details>
        </aside>
      </div>
    </main>
  );
}
