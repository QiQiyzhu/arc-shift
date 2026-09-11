import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Download,
  FlaskConical,
  Orbit,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Engine } from '../game/engine';
import { CARDS } from '../cards/catalog';
import { SYNERGIES } from '../cards/synergies';
import {
  GOALS,
  facts,
  retrieveStrategies,
  validateStrategy,
  type Goal,
  type Strategy,
} from '../coach/knowledge';
import {
  captureBuild,
  snapshotKey,
  type Analysis,
  type BuildSnapshot,
  type Candidate,
} from '../coach/simulation';
import library from '../coach/strategy-library.json';
import { WEAPONS } from '../economy/catalog';
import { DEFAULT_CONTENT, type ContentPack } from '../content/schema';

function compatiblePlans(content: ContentPack) {
  if (JSON.stringify(content) !== JSON.stringify(DEFAULT_CONTENT)) return [];
  return library.plans.flatMap((p) => {
    try {
      return [validateStrategy(p, content)];
    } catch {
      return [];
    }
  });
}

export function CoachPanel({
  engine,
  onClose,
  onTrial,
  onSelect,
}: {
  engine: Engine;
  onClose: () => void;
  onTrial: (c: Candidate, b: BuildSnapshot) => void;
  onSelect: (id: string) => boolean;
}) {
  const [build, setBuild] = useState(() => captureBuild(engine));
  const [goal, setGoal] = useState<Goal>('single');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const plans = useMemo(() => compatiblePlans(build.content), [build.content]);
  const retrieved = useMemo(
    () => retrieveStrategies(plans, query, goal, build.weapon, build.cards),
    [plans, query, goal, build],
  );
  const knowledge = facts(build.content);
  function cancel() {
    revision.current++;
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function reset() {
    cancel();
    setBusy(false);
    setResult(null);
    setError('');
  }
  function run() {
    reset();
    const fresh = captureBuild(engine);
    setBuild(fresh);
    const matches = retrieveStrategies(
      compatiblePlans(fresh.content),
      query,
      goal,
      fresh.weapon,
      fresh.cards,
    );
    const candidates: Candidate[] = fresh.offered.length
      ? fresh.offered.map((id) => ({
          id,
          label: CARDS.find((c) => c.id === id)!.name,
          cards: [...fresh.cards, id],
          nextCard: id,
        }))
      : matches.map(({ plan: p }) => ({
          id: p.id,
          label: p.title,
          cards: p.cards,
        }));
    if (!candidates.length) {
      setError('当前没有可验证的候选。仍可在协议档案查看规则。');
      return;
    }
    setBusy(true);
    setProgress('准备独立靶场');
    const id = ++revision.current;
    try {
      const w = new Worker(
        new URL('../coach/coach.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current = w;
      const fail = (message: string) => {
        if (id !== revision.current) return;
        cancel();
        setBusy(false);
        setError(message);
      };
      w.onerror = () => fail('推演未完成。请重试；当前行动和存档未改变。');
      timer.current = setTimeout(
        () => fail('推演超时，可重试或直接阅读下方战术依据。'),
        20000,
      );
      w.onmessage = (
        event: MessageEvent<{
          id: number;
          progress?: { completed: number; total: number };
          result?: Analysis;
          error?: string;
        }>,
      ) => {
        if (event.data.id !== id || id !== revision.current) return;
        if (snapshotKey(captureBuild(engine)) !== snapshotKey(fresh)) {
          fail('构筑已变化。请重新分析当前选择。');
          return;
        }
        if (event.data.progress) {
          const p = event.data.progress;
          setProgress(`已推演 ${p.completed} / ${p.total} 套构筑`);
        }
        if (event.data.error) {
          fail('输入未通过规则校验，未执行任何选择。');
          return;
        }
        if (event.data.result) {
          setResult(event.data.result);
          setBusy(false);
          cancel();
        }
      };
      w.postMessage({ id, build: fresh, candidates, goal });
    } catch {
      cancel();
      setBusy(false);
      setError('此浏览器无法启动后台推演；下方规则和战术库仍可使用。');
    }
  }
  function applyCandidate(c: Candidate) {
    if (snapshotKey(captureBuild(engine)) !== snapshotKey(build)) {
      setError('构筑已变化，请重新分析。');
      setResult(null);
      return;
    }
    if (c.nextCard) {
      if (!onSelect(c.nextCard))
        setError('这张协议已经不在当前奖励里，请重新分析。');
      return;
    }
    if (engine.world.phase === 'menu') onTrial(c, build);
  }
  function download() {
    if (!result) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportVersion: 1,
            recordedAt: new Date().toISOString(),
            goal,
            query,
            build,
            result,
            retrieval: retrieved.map((r) => ({
              id: r.plan.id,
              score: r.score,
              reasons: r.reasons,
            })),
            library: {
              generatedAt: library.generatedAt,
              models: library.models,
            },
            limits:
              'Stationary 12-second range, 3 seeds, 80px nearest target distance, continuous fire and Q/E when ready, no Dash. No terrain or kills; target displacement is reset each tick. No execute, kill, Dash-trigger, lifesteal or survival evaluation. Not win probability. Ranked by damage, or dash cooldown then speed.',
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'arc-shift-coach-evidence.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const baseline = result?.baseline;
  const peak = result
    ? Math.max(
        1,
        ...result.rows.map((r) => r[goal === 'swarm' ? 'swarm' : 'single']),
        result.baseline[goal === 'swarm' ? 'swarm' : 'single'],
      )
    : 1;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="coach-panel">
        <div className="coach-kicker">
          <Orbit size={17} /> TACTICAL OBSERVATORY{' '}
          <span>模型策略库 · 本地推演</span>
        </div>
        <DialogTitle>把下一次选择，先试一遍。</DialogTitle>
        <DialogDescription>
          战术教练读取你的构筑，在独立靶场里比较打法。你决定带走哪一种。
        </DialogDescription>
        <div className="coach-context">
          <span>
            {WEAPONS.find((w) => w.id === build.weapon)?.name} · Lv.
            {build.level}
          </span>
          <span>
            {build.cards.length} 项协议 · {build.forms.length || 1} 种武装
          </span>
          <span>
            {build.source === 'checkpoint'
              ? '读取营地存档'
              : build.source === 'camp'
                ? '营地范例 · Lv.4'
                : '读取当前行动'}
          </span>
        </div>
        <div className="coach-controls">
          <fieldset className="coach-goals" aria-label="战术目标">
            {Object.entries(GOALS).map(([id, g]) => (
              <button
                key={id}
                aria-pressed={goal === id}
                onClick={() => {
                  reset();
                  setGoal(id as Goal);
                }}
              >
                {g.name}
              </button>
            ))}
          </fieldset>
          <label>
            打法关键词
            <input
              value={query}
              maxLength={80}
              onChange={(e) => {
                reset();
                setQuery(e.target.value);
              }}
              placeholder="如：连锁、跃迁、首领"
            />
          </label>
          <button className="coach-run" onClick={run} disabled={busy}>
            {busy ? progress : '比较候选'}
            <ArrowRight size={18} />
          </button>
        </div>
        {busy && (
          <output className="coach-progress">
            <i />
            {progress} · 关闭即可取消
          </output>
        )}
        {error && (
          <p className="coach-error" role="alert">
            {error}
          </p>
        )}
        <div className="coach-columns">
          <section className="coach-comparison" aria-label="靶场比较">
            <div className="coach-section-title">
              <h3>
                {build.offered.length ? '这次选卡的取舍' : '范例构筑比较'}
              </h3>
              <span>12 秒 × 3 种子 × 2 场景</span>
            </div>
            <p className="coach-note">
              {build.offered.length
                ? '每个候选只增加这一张协议。'
                : '范例有 4–6 张协议，与当前构筑卡数可能不同，不是等预算升级比较。'}
            </p>
            {!result && !busy && (
              <div className="coach-empty">
                <FlaskConical size={34} />
                <strong>让引擎给出数字</strong>
                <p>
                  相同主武器、形态修饰、等级和遗器，比较单体与敌群输出；走位目标优先看跃迁冷却和移速。
                </p>
              </div>
            )}
            {baseline && (
              <div className="coach-baseline">
                <span>当前构筑</span>
                <b>单体 {baseline.single.toFixed(1)}</b>
                <b>敌群 {baseline.swarm.toFixed(1)} / 秒</b>
              </div>
            )}
            {result?.rows.map((r, i) => (
              <article
                className={`coach-result ${i === 0 ? 'is-first' : ''}`}
                key={r.candidate.id}
              >
                <div className="coach-result-heading">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <h4>{r.candidate.label}</h4>
                  {i === 0 && (
                    <small>
                      {goal === 'mobility'
                        ? '当前走位指标优先'
                        : '当前靶场输出较高'}
                    </small>
                  )}
                </div>
                <div className="coach-bars" aria-hidden="true">
                  <i
                    style={{
                      width: `${(r[goal === 'swarm' ? 'swarm' : 'single'] / peak) * 100}%`,
                    }}
                  />
                </div>
                <dl>
                  <div>
                    <dt>单体 / 秒</dt>
                    <dd>{r.single.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>敌群 / 秒</dt>
                    <dd>{r.swarm.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>跃迁冷却</dt>
                    <dd>{r.dash.toFixed(2)}s</dd>
                  </div>
                  <div>
                    <dt>移速</dt>
                    <dd>{r.speed.toFixed(0)}</dd>
                  </div>
                </dl>
                <p>
                  {r.candidate.cards
                    .map((id) => CARDS.find((c) => c.id === id)!.name)
                    .join(' · ')}
                </p>
                <p className="coach-synergy">
                  {r.synergies
                    .map((id) => SYNERGIES.find((s) => s.id === id)!.name)
                    .join(' · ') || '暂未激活跨系共鸣'}
                  {r.maxHpBonus ? ` · 生命上限协议 +${r.maxHpBonus}` : ''}
                </p>
                {r.samples.some((s) => s.poolMisses > 0) && (
                  <p>此候选存在弹体池耗尽，结果受容量限制。</p>
                )}
                <button
                  onClick={() => applyCandidate(r.candidate)}
                  disabled={
                    !r.candidate.nextCard && engine.world.phase !== 'menu'
                  }
                >
                  {r.candidate.nextCard ? '选择这张协议' : '亲手试用这套构筑'}
                  <ArrowRight size={15} />
                </button>
              </article>
            ))}
            {result && (
              <button className="coach-export" onClick={download}>
                <Download size={15} />
                导出本次依据与推演记录
              </button>
            )}
            <details className="coach-method">
              <summary>这些数字能说明什么？</summary>
              <p>
                固定站位，最近靶距离 80 像素；持续开火，Q/E
                就绪即释放，不使用跃迁。保留真实弹道、伤害和元素规则。靶位每帧复原，会抵消聚拢与击退位移；高生命靶不会触发击杀与斩杀收益。没有地形、跃迁触发收益、承伤、吸血和首领走位测量。数字不是胜率或通关保证。
              </p>
              <p>
                走位排序：跃迁冷却更短 → 移速更高 →
                单体输出。每种输出是三个种子的均值，不是置信区间。实战请自行验证。
              </p>
            </details>
          </section>
          <section className="coach-retrieval" aria-label="检索到的战术">
            <div className="coach-section-title">
              <h3>检索到的战术</h3>
              <span>{retrieved.length} 条</span>
            </div>
            <p className="coach-note">
              DeepSeek
              离线生成，程序校验协议前置与引用，说明经源码复核修订。匹配依据：武器、目标、已有协议和关键词。
            </p>
            {retrieved.map(({ plan: p, reasons }) => (
              <StrategyCard
                key={p.id}
                plan={p}
                reasons={reasons}
                knowledge={knowledge}
              />
            ))}
            {!retrieved.length && (
              <p>
                战术库对应默认规则；自定义内容暂不使用旧版说明。奖励界面仍可推演实际候选协议。
              </p>
            )}
            <details className="coach-method">
              <summary>AI 在这里做了什么？</summary>
              <p>
                模型从检索到的规则中生成结构化战术；程序拒绝未知协议、缺失前置和不成立的引用。当前推荐由浏览器后台线程的真实引擎排序。关键词检索不使用向量模型；试玩时不发送你的输入或存档，也不在线调用模型。
              </p>
              <p>
                模型：{library.models.join(' / ') || '未生成'} · 资料日期{' '}
                {String(library.generatedAt || '').slice(0, 10) || '—'}
              </p>
            </details>
          </section>
        </div>
        <div className="coach-bottom">
          <span>先理解取舍，再进入战场。</span>
          <button
            onClick={() => {
              reset();
              setBuild(captureBuild(engine));
            }}
          >
            <RotateCcw size={15} />
            重新读取构筑
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function StrategyCard({
  plan: p,
  reasons,
  knowledge,
}: {
  plan: Strategy;
  reasons: string[];
  knowledge: ReturnType<typeof facts>;
}) {
  return (
    <article className="coach-strategy">
      <div>
        <span>{GOALS[p.goal].name}</span>
        <h4>{p.title}</h4>
      </div>
      <p>{p.explanation}</p>
      <p className="coach-caution">取舍 · {p.caution}</p>
      <small>{reasons.join(' · ')}</small>
      <details>
        <summary>查看规则依据</summary>
        {p.evidence.map((id) => {
          const f = knowledge.find((x) => x.id === id);
          return (
            f && (
              <p key={id}>
                <b>{f.title}</b> · {f.text}
              </p>
            )
          );
        })}
      </details>
    </article>
  );
}
