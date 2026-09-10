import { useEffect, useMemo, useState } from 'react';
import { Engine } from '../game/engine';
import { blankSave } from '../core/save';
import {
  DEFAULT_CONTENT,
  CONTENT_SECTIONS,
  specsFor,
  importContent,
  contentDiff,
  type ContentPack,
  type ContentSection,
} from '../content/schema';
import { CARDS } from '../cards/catalog';
import { RELICS } from '../progression/catalog';
import { ENEMIES } from '../data/enemies';
import { deriveStats } from '../cards/system';
import type { EnemyKind, WeaponId } from '../game/types';
import { ArenaCanvas } from './ArenaCanvas';
import { downloadJSON } from './files';
import './dev.css';

function sandbox(
  content: ContentPack,
  weapon: WeaponId,
  cards: string[],
  relics: string[],
  hybrid: boolean,
) {
  const engine = new Engine({ save: blankSave(), persistence: false, content });
  engine.startPractice(cards, weapon, hybrid);
  engine.world.relics = [...relics];
  engine.world.stats = deriveStats(
    cards,
    engine.world.level,
    relics,
    engine.content,
  );
  return engine;
}
const labels: Record<ContentSection, string> = {
  enemies: 'Enemies',
  weapons: 'Weapons',
  cards: 'Protocols',
  encounters: 'Encounters',
  bosses: 'Boss phases',
};
export default function ContentEditor() {
  const [json, setJSON] = useState(JSON.stringify(DEFAULT_CONTENT, null, 2));
  const validation = useMemo(() => importContent(json), [json]);
  const [applied, setApplied] = useState(DEFAULT_CONTENT);
  const [section, setSection] = useState<ContentSection>('enemies');
  const [index, setIndex] = useState(0);
  const [weapon, setWeapon] = useState<WeaponId>('arc');
  const [cards, setCards] = useState<string[]>(['fire-ember']);
  const [relics, setRelics] = useState<string[]>([]);
  const [hybrid, setHybrid] = useState(false);
  const [engine, setEngine] = useState(() =>
    sandbox(DEFAULT_CONTENT, 'arc', ['fire-ember'], [], false),
  );
  const [paused, setPaused] = useState(true);
  const [spawnKind, setSpawnKind] = useState<EnemyKind>('hunter');
  const [message, setMessage] = useState(
    'Built-in pack loaded. Select a parameter, inspect its diff, then apply.',
  );
  const [, render] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => render((n) => n + 1), 150);
    return () => clearInterval(timer);
  }, []);
  let draft: ContentPack | null = null;
  try {
    draft = JSON.parse(json) as ContentPack;
  } catch {
    /* Raw JSON editor keeps invalid drafts visible. */
  }
  const row = draft?.[section]?.[index];
  const supported =
    row &&
    typeof row.id === 'string' &&
    DEFAULT_CONTENT[section].some((r) => r.id === row.id) &&
    row.params &&
    typeof row.params === 'object' &&
    !Array.isArray(row.params);
  const specs = supported ? specsFor(section, row.id) : {};
  const changes = validation.ok ? contentDiff(applied, validation.value) : [];
  function edit(update: (pack: ContentPack) => void) {
    if (!draft) return;
    const next = structuredClone(draft);
    update(next);
    setJSON(JSON.stringify(next, null, 2));
  }
  function apply() {
    if (!validation.ok) return;
    setApplied(validation.value);
    setEngine(sandbox(validation.value, weapon, cards, relics, hybrid));
    setPaused(true);
    setMessage(
      `Applied ${changes.length} parameter/reference changes; sandbox reset at tick 0.`,
    );
  }
  const w = engine.world;
  return (
    <main className="dev-shell content-shell">
      <header>
        <a href="/">ARC//SHIFT</a>
        <b>ENGINEERING / CONTENT LAB</b>
        <a href="/dev/replay">Replay viewer</a>
        <a href="/dev/debugger">Debugger</a>
      </header>
      <div className="dev-title">
        <div>
          <h1>Content workbench</h1>
          <p>
            Validated tuning → visible diff → isolated combat. Existing
            mechanics stay in typed game code.
          </p>
        </div>
        <span className="dev-badge">LOCAL · NO SAVE WRITES</span>
      </div>
      <div className="content-columns">
        <section
          className="dev-panel content-parameters"
          aria-label="Content parameters"
        >
          <nav className="content-tabs">
            {CONTENT_SECTIONS.map((s) => (
              <button
                key={s}
                aria-pressed={section === s}
                onClick={() => {
                  setSection(s);
                  setIndex(0);
                }}
              >
                {labels[s]}
              </button>
            ))}
          </nav>
          <label>
            Record
            <select
              aria-label="Content record"
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
            >
              {DEFAULT_CONTENT[section].map((r, i) => (
                <option key={r.id} value={i}>
                  {r.id}
                </option>
              ))}
            </select>
          </label>
          <p className="content-help">
            IDs are stable code references. Numeric fields show their supported
            bounds. Multipliers retain the original order of operations.
          </p>
          {supported ? (
            <>
              <div className="content-fields">
                {Object.entries(specs).map(([key, [, min, max, integer]]) => (
                  <label key={key}>
                    {key}
                    <input
                      aria-label={`${section} ${row.id} ${key}`}
                      type="number"
                      min={min}
                      max={max}
                      step={integer ? 1 : 0.01}
                      value={
                        typeof row.params[key] === 'number'
                          ? row.params[key]
                          : ''
                      }
                      onChange={(e) =>
                        edit((p) => {
                          p[section][index].params[key] =
                            e.target.value === ''
                              ? NaN
                              : Number(e.target.value);
                        })
                      }
                    />
                    <small>
                      {min}–{max}
                      {integer ? ' · integer' : ''}
                    </small>
                  </label>
                ))}
              </div>
              {section === 'cards' && (
                <label>
                  Prerequisite
                  <select
                    aria-label="Protocol prerequisite"
                    value={draft!.cards[index].requires ?? ''}
                    onChange={(e) =>
                      edit((p) => {
                        p.cards[index].requires = e.target.value || null;
                      })
                    }
                  >
                    <option value="">None</option>
                    {CARDS.filter((c) => c.id !== row.id).map((c) => (
                      <option key={c.id}>{c.id}</option>
                    ))}
                  </select>
                </label>
              )}
              {section === 'encounters' && (
                <label>
                  Base enemy pool
                  <input
                    aria-label="Encounter enemy pool"
                    value={
                      Array.isArray(draft!.encounters[index].pool)
                        ? draft!.encounters[index].pool.join(', ')
                        : ''
                    }
                    onChange={(e) =>
                      edit((p) => {
                        p.encounters[index].pool = e.target.value
                          .split(',')
                          .map((s) => s.trim()) as EnemyKind[];
                      })
                    }
                  />
                  <small>
                    Comma separated IDs. Later rooms add their existing biome
                    enemies.
                  </small>
                </label>
              )}
              {Object.keys(specs).length === 0 && (
                <p>
                  This protocol activates a code-defined reaction or health
                  mechanic. Only its prerequisite can be tuned here.
                </p>
              )}
            </>
          ) : (
            <p>Repair the record in JSON before using the form.</p>
          )}
          <div className="dev-toolbar">
            <button disabled={!validation.ok} onClick={apply}>
              Apply & reset sandbox
            </button>
            <button
              disabled={!validation.ok}
              onClick={() =>
                validation.ok &&
                downloadJSON(validation.value, 'arc-content.json')
              }
            >
              Export JSON
            </button>
          </div>
          <label className="dev-file">
            Import JSON
            <input
              aria-label="Import content"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 256 * 1024)
                    setMessage('Import rejected: file exceeds 256 KiB.');
                  else setJSON(await file.text());
                }
                e.target.value = '';
              }}
            />
          </label>
          {!validation.ok && (
            <div className="dev-error" role="alert">
              {validation.errors.map((s, i) => (
                <div key={i}>{s}</div>
              ))}
            </div>
          )}
          <h2>
            Pending diff <small>{changes.length}</small>
          </h2>
          <pre aria-label="Content diff">
            {validation.ok
              ? changes.join('\n') || 'No pending changes.'
              : 'Invalid draft: cannot apply or export.'}
          </pre>
          <output className="content-message">{message}</output>
          <details>
            <summary>Raw JSON · 256 KiB limit</summary>
            <textarea
              aria-label="Content JSON"
              value={json}
              onChange={(e) => setJSON(e.target.value)}
              spellCheck={false}
            />
            <button
              onClick={() => setJSON(JSON.stringify(DEFAULT_CONTENT, null, 2))}
            >
              Restore built-in draft
            </button>
          </details>
        </section>
        <section aria-label="Build sandbox">
          <div className="dev-panel content-build">
            <div className="content-build-controls">
              <label>
                Weapon
                <select
                  aria-label="Sandbox weapon"
                  value={weapon}
                  onChange={(e) => setWeapon(e.target.value as WeaponId)}
                >
                  <option value="arc">ARC · barrage</option>
                  <option value="sword">VOW · sword</option>
                  <option value="cannon">KILN · cannon</option>
                </select>
              </label>
              <label className="content-check">
                <input
                  type="checkbox"
                  checked={hybrid}
                  onChange={(e) => setHybrid(e.target.checked)}
                />{' '}
                All three forms
              </label>
              <button
                onClick={() => {
                  setEngine(sandbox(applied, weapon, cards, relics, hybrid));
                  setPaused(true);
                  setMessage('Build restarted using the last applied pack.');
                }}
              >
                Restart build
              </button>
            </div>
            <details>
              <summary>
                Protocols ({cards.length}) and relics ({relics.length})
              </summary>
              <p>
                Sandbox selection may bypass unlocks/prerequisites to probe
                interactions. Changes activate on restart.
              </p>
              <div className="content-options">
                {CARDS.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={cards.includes(c.id)}
                      onChange={(e) =>
                        setCards((old) =>
                          e.target.checked
                            ? [...old, c.id]
                            : old.filter((id) => id !== c.id),
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              <div className="content-options">
                {RELICS.map((r) => (
                  <label key={r.id}>
                    <input
                      type="checkbox"
                      checked={relics.includes(r.id)}
                      onChange={(e) =>
                        setRelics((old) =>
                          e.target.checked
                            ? [...old, r.id]
                            : old.filter((id) => id !== r.id),
                        )
                      }
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div className="dev-toolbar">
            <button onClick={() => setPaused(!paused)}>
              {paused ? 'Run sandbox' : 'Pause sandbox'}
            </button>
            <select
              aria-label="Spawn enemy"
              value={spawnKind}
              onChange={(e) => setSpawnKind(e.target.value as EnemyKind)}
            >
              {Object.entries(ENEMIES).map(([id, e]) => (
                <option key={id} value={id}>
                  {e.name} · {id}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                w.spawn(spawnKind, 870, 360);
                render((n) => n + 1);
              }}
            >
              Spawn
            </button>
          </div>
          <ArenaCanvas
            engine={engine}
            step={(dt, input) => {
              if (!paused) engine.update(dt, input);
            }}
          />
          <div className="dev-panel content-readout">
            <div>
              <strong>Tick</strong>
              <output aria-label="Sandbox tick">{w.tick}</output>
            </div>
            <div>
              <strong>Damage</strong>
              <output aria-label="Sandbox damage">
                {w.stats.damage.toFixed(2)}
              </output>
            </div>
            <div>
              <strong>Burn / chain</strong>
              <output aria-label="Sandbox burn">
                {w.stats.burn} / {w.stats.chain}
              </output>
            </div>
            <div>
              <strong>Enemies</strong>
              <output>{w.enemies.length}</output>
            </div>
          </div>
          <p>
            WASD · pointer aim · hold click · Space dash · Q / E skills.
            Training restores health. Applied edits affect this arena only;
            custom packs cannot enter the built-in replay format.
          </p>
          <details>
            <summary>Spawned entity values</summary>
            <pre aria-label="Spawned values">
              {JSON.stringify(
                w.enemies.map((e) => ({
                  id: e.id,
                  kind: e.kind,
                  hp: e.hp,
                  maxHp: e.maxHp,
                  speed: e.speed,
                  damage: e.damage,
                  phase: e.phase,
                })),
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      </div>
    </main>
  );
}
