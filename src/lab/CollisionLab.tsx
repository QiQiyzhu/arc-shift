import { useMemo, useState } from 'react';
import {
  initialOptions,
  runCollisionExperiment,
  type Layout,
} from './collision-experiment';

const layouts: { id: Layout; name: string; question: string }[] = [
  {
    id: 'spread',
    name: '分散目标',
    question: '筛掉大多数候选，还会漏掉高速弹体吗？',
  },
  {
    id: 'dense',
    name: '密集目标',
    question: '所有目标挤在路径旁，网格还值得维护吗？',
  },
  {
    id: 'knockback',
    name: '跨格击退',
    question: '坐标变了，旧索引里的引用还可靠吗？',
  },
];
export default function CollisionLab() {
  const [options, setOptions] = useState(initialOptions);
  const result = useMemo(() => runCollisionExperiment(options), [options]);
  const selected = layouts.find((item) => item.id === options.layout)!;
  const setLayout = (layout: Layout) =>
    setOptions((current) => ({
      ...current,
      layout,
      endY: 210,
      endpointOnly: false,
      updateIndex: true,
    }));
  return (
    <section className="experiment" aria-labelledby="collision-title">
      <div className="case-heading">
        <div>
          <span className="eyebrow">01 / ARC//SHIFT · LIVE GEOMETRY</span>
          <h2 id="collision-title">
            快一点之前，
            <br />
            先证明没有漏掉。
          </h2>
        </div>
        <p>
          使用游戏中的
          UniformGrid、扫掠包围盒和线段命中函数。改变场景，比较索引查询与全量遍历的命中集合。
        </p>
      </div>
      <div className="experiment-grid">
        <div className="instrument">
          <div className="instrument-head">
            <span>COLLISION OBSERVATORY</span>
            <span className={result.equivalent ? 'good' : 'bad'}>
              {result.equivalent
                ? '● 命中与顺序一致'
                : `● 发现 ${result.missed.length} 个漏检`}
            </span>
          </div>
          <svg
            className="collision-map"
            viewBox="0 0 720 420"
            aria-label={`碰撞查询：全量命中 ${result.expected.length}，索引命中 ${result.actual.length}，漏检 ${result.missed.length}`}
          >
            <defs>
              <pattern
                id="lab-grid"
                width={result.cellSize}
                height={result.cellSize}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${result.cellSize} 0 L 0 0 0 ${result.cellSize}`}
                  fill="none"
                  stroke="#304338"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="720" height="420" fill="#101a16" />
            <rect width="720" height="420" fill="url(#lab-grid)" />
            <rect
              x={result.query.minX}
              y={result.query.minY}
              width={Math.max(2, result.query.maxX - result.query.minX)}
              height={Math.max(2, result.query.maxY - result.query.minY)}
              fill="#bded9026"
              stroke="#bded9090"
              strokeDasharray="5 5"
            />
            {result.previous && (
              <g>
                <line
                  x1={result.previous.x}
                  y1={result.previous.y}
                  x2={result.bodies[0].x}
                  y2={result.bodies[0].y}
                  stroke="#9eabc0"
                  strokeDasharray="4 5"
                />
                <circle
                  cx={result.previous.x}
                  cy={result.previous.y}
                  r="14"
                  stroke="#9eabc0"
                  fill="none"
                  strokeDasharray="3 4"
                />
                <text
                  x={result.previous.x + 22}
                  y={result.previous.y + 5}
                  fill="#a5b5ad"
                  fontSize="12"
                >
                  目标 0 原位置
                </text>
              </g>
            )}
            <line
              x1={result.start.x}
              y1={result.start.y}
              x2={result.end.x}
              y2={result.end.y}
              stroke="#d7edac"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            {result.bodies.map((body) => {
              const missed = result.missed.includes(body.id),
                hit = result.expected.includes(body.id),
                candidate = result.candidates.includes(body.id);
              return (
                <circle
                  key={body.id}
                  cx={body.x}
                  cy={body.y}
                  r={body.radius}
                  fill={
                    missed
                      ? '#ed8864'
                      : hit
                        ? '#d3eba0'
                        : candidate
                          ? '#72b59755'
                          : '#40524955'
                  }
                  stroke={
                    missed
                      ? '#ffd4be'
                      : hit
                        ? '#f0ffdb'
                        : candidate
                          ? '#72b597'
                          : '#52655a'
                  }
                  strokeWidth={hit ? 2 : 1}
                >
                  <title>{`目标 ${body.id} · ${missed ? '漏检' : hit ? '命中' : candidate ? '候选' : '已筛除'}`}</title>
                </circle>
              );
            })}
            <circle
              cx={result.start.x}
              cy={result.start.y}
              r="5"
              fill="#fff5cf"
            />
            <circle cx={result.end.x} cy={result.end.y} r="7" fill="#fff5cf" />
            <text x="20" y="405" fill="#83958b" fontSize="11">
              虚线 = 单次高速移动路径 · 橙色 = 漏检 · 亮绿 = 真实命中
            </text>
          </svg>
          <div className="live-metrics" aria-live="polite">
            <div>
              <strong>{result.bodies.length}</strong>
              <span>全量几何检查</span>
            </div>
            <div>
              <strong>{result.candidates.length}</strong>
              <span>索引后几何检查</span>
            </div>
            <div>
              <strong>
                {result.reduction.toFixed(1)}
                <small>%</small>
              </strong>
              <span>候选检查减少</span>
            </div>
            <div className={result.equivalent ? 'good' : 'bad'}>
              <strong data-testid="miss-count">{result.missed.length}</strong>
              <span>漏检目标</span>
            </div>
          </div>
          <p className="measurement-note">
            这里实时计算的是一次查询的候选与命中数，不是帧率
            benchmark，也没有测量索引维护耗时。
          </p>
        </div>
        <aside className="controls" aria-label="碰撞实验控制">
          <span className="eyebrow">CHANGE ONE CONSTRAINT</span>
          <h3>{selected.question}</h3>
          <div className="scenario-buttons">
            {layouts.map((item) => (
              <button
                key={item.id}
                aria-pressed={item.id === options.layout}
                onClick={() => setLayout(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <label className="range-label">
            目标数量 <output>{options.count}</output>
            <input
              type="range"
              min="16"
              max="256"
              step="16"
              value={options.count}
              onChange={(e) =>
                setOptions({ ...options, count: Number(e.target.value) })
              }
            />
          </label>
          <label className="range-label">
            轨迹终点高度 <output>{options.endY}</output>
            <input
              type="range"
              min="50"
              max="370"
              step="10"
              value={options.endY}
              onChange={(e) =>
                setOptions({ ...options, endY: Number(e.target.value) })
              }
            />
          </label>
          <label className="select-label">
            网格边长
            <select
              value={options.cellSize}
              onChange={(e) =>
                setOptions({ ...options, cellSize: Number(e.target.value) })
              }
            >
              <option value="48">48</option>
              <option value="96">96 · 游戏默认</option>
              <option value="192">192</option>
            </select>
          </label>
          <div className="fault-switch">
            <label>
              <input
                type="checkbox"
                checked={options.endpointOnly}
                onChange={(e) =>
                  setOptions({ ...options, endpointOnly: e.target.checked })
                }
              />
              <span>
                故意只查询终点<small>检验一个看似更快的错误实现</small>
              </span>
            </label>
            {options.layout === 'knockback' && (
              <label>
                <input
                  type="checkbox"
                  checked={!options.updateIndex}
                  onChange={(e) =>
                    setOptions({ ...options, updateIndex: !e.target.checked })
                  }
                />
                <span>
                  故意不更新击退后的索引
                  <small>坐标对象更新了，格子成员仍过期</small>
                </span>
              </label>
            )}
          </div>
          <button
            className="text-button"
            onClick={() => setOptions(initialOptions)}
          >
            重置为固定种子 73129 ↺
          </button>
        </aside>
      </div>
      <div
        className={`finding ${result.equivalent ? '' : 'finding-alert'}`}
        aria-live="polite"
      >
        <span>{result.equivalent ? '当前观察' : '反例成立'}</span>
        <p>
          {!result.equivalent
            ? `索引漏掉了目标 ${result.missed.slice(0, 8).join('、')}${result.missed.length > 8 ? ' 等' : ''}。减少检查数必须以结果等价为前提；漂亮的百分比不能抵消一次错误。`
            : result.reduction < 20
              ? '在这组密集分布中，绝大部分目标仍是候选。索引还要付出维护和去重成本；不能据“用了网格”就推断更快。'
              : '这次查询减少了候选，且命中 ID 与顺序保持一致。下一步还要对照完整战斗状态，并分别测量规则层与真实浏览器。'}
        </p>
      </div>
      <div className="reasoning-grid">
        <article>
          <span>DECISION</span>
          <h3>保留慢实现，作为独立对照</h3>
          <p>
            先守住命中、穿透顺序与伤害语义，再讨论速度。索引只缩小候选集，最终判断仍由原来的几何函数完成。
          </p>
        </article>
        <article>
          <span>COUNTEREXAMPLE</span>
          <h3>规则层变快，画面仍可能变慢</h3>
          <p>
            历史 250 敌人夹具中 Engine P95 从 1.8786 降至 1.0712 ms；同轮浏览器
            P95 帧时间却从 76.4 升至 83.3 ms。两种观测回答不同问题。
          </p>
        </article>
        <article>
          <span>NEXT EXPERIMENT</span>
          <h3>把维护、绘制与调度分别测量</h3>
          <p>
            这个小实验说明候选筛选的行为。完整性能判断仍需固定负载、多次采样和成本拆分，不能把候选减少率当作
            FPS 增幅。
          </p>
        </article>
      </div>
      <div className="source-links">
        <a
          href="https://github.com/QiQiyzhu/arc-shift/blob/codex/engineering-v2/src/core/spatial-grid.ts"
          target="_blank"
          rel="noreferrer"
        >
          实际网格实现 ↗
        </a>
        <a
          href="https://github.com/QiQiyzhu/arc-shift/blob/codex/engineering-v2/tests/spatial-grid.test.ts"
          target="_blank"
          rel="noreferrer"
        >
          属性与整局对照测试 ↗
        </a>
        <a
          href="https://github.com/QiQiyzhu/arc-shift/blob/codex/engineering-v2/docs/performance-v2.md"
          target="_blank"
          rel="noreferrer"
        >
          原始性能与反例 ↗
        </a>
        <a href="/">试玩完整游戏 ↗</a>
      </div>
    </section>
  );
}
