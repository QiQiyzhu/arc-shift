import { useState } from 'react';
import {
  aegisEvidence as data,
  preferenceScore,
  type MetricId,
} from './aegis-evidence';

export default function AegisLab() {
  const [weights, setWeights] = useState(
    data.presets[0].weights.map((value) => value * 100),
  );
  const [metricId, setMetricId] = useState<MetricId>('alliedDamage');
  const [seed, setSeed] = useState(1024);
  const metric = data.metrics.find((item) => item.id === metricId)!;
  const pair = data.pairs.find((item) => item.seed === seed)!;
  const counterexample = data.counterexamples.find(
    (item) => item.seed === seed,
  );
  const priority = preferenceScore(data.summary.priority.mean, weights);
  const utility = preferenceScore(data.summary.utility.mean, weights);
  const ranking =
    priority === null || utility === null
      ? '请至少保留一项非零偏好'
      : Math.abs(priority - utility) < 1e-6
        ? '当前偏好下两者持平'
        : `${priority > utility ? 'Priority' : 'Utility'} 排在前面`;
  const maxDelta = Math.max(
    1,
    ...data.pairs.map((item) =>
      Math.abs(item.deltaUtilityMinusPriority[metricId]),
    ),
  );
  const sourceUrl = (path: string) => data.provenance.sourceBaseUrl + path;
  return (
    <section className="experiment" aria-labelledby="aegis-title">
      <div className="case-heading">
        <div>
          <span className="eyebrow">02 / AEGIS ARENA · OBSERVED ENDPOINTS</span>
          <h2 id="aegis-title">
            同伴活着，
            <br />
            队伍却更好吗？
          </h2>
        </div>
        <p>
          两种策略、30 对原生实验，两边都是 0 / 30
          胜。改变你重视的结果，看看“更好”的排序怎样变化，再检查单次反例。
        </p>
      </div>
      <div className="evidence-label">
        原始 UE 实验数据 · 本页只重新加权已观测终点，不会重新运行、训练或改变 AI
        策略。
      </div>
      <div className="experiment-grid">
        <div className="instrument aegis-instrument">
          <div className="instrument-head">
            <span>POLICY TRADE-OFF / 30 PAIRED SEEDS</span>
            <span>胜利：Priority 0 · Utility 0</span>
          </div>
          <div className="score-comparison">
            <div>
              <span>PRIORITY</span>
              <strong>{priority?.toFixed(3) ?? '—'}</strong>
            </div>
            <div>
              <span>UTILITY</span>
              <strong>{utility?.toFixed(3) ?? '—'}</strong>
            </div>
            <p aria-live="polite" data-testid="policy-ranking">
              {ranking}
              <small>无量纲偏好指数，允许负数，不是胜率。</small>
            </p>
          </div>
          <div className="plot-toolbar">
            <label>
              逐对差值
              <select
                value={metricId}
                onChange={(event) =>
                  setMetricId(event.target.value as MetricId)
                }
              >
                {data.metrics.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <span>Utility − Priority</span>
          </div>
          <svg
            className="paired-plot"
            viewBox="0 0 720 320"
            aria-label={`30 对实验的${metric.label}差值，Utility 减 Priority`}
          >
            <line x1="38" x2="700" y1="150" y2="150" stroke="#829b85" />
            <line
              x1="38"
              x2="700"
              y1="40"
              y2="40"
              stroke="#304638"
              strokeDasharray="4 4"
            />
            <line
              x1="38"
              x2="700"
              y1="260"
              y2="260"
              stroke="#304638"
              strokeDasharray="4 4"
            />
            <text x="5" y="44" fill="#99ac9e" fontSize="10">
              +{maxDelta.toFixed(0)}
            </text>
            <text x="15" y="154" fill="#99ac9e" fontSize="10">
              0
            </text>
            <text x="5" y="264" fill="#99ac9e" fontSize="10">
              −{maxDelta.toFixed(0)}
            </text>
            {data.pairs.map((item, index) => {
              const value = item.deltaUtilityMinusPriority[metricId],
                height = (Math.abs(value) / maxDelta) * 110;
              return (
                <g key={item.seed}>
                  <rect
                    x={48 + index * 22}
                    y={value >= 0 ? 150 - height : 150}
                    width="11"
                    height={Math.max(2, height)}
                    fill={
                      value * metric.direction > 0
                        ? '#cfe49b'
                        : value === 0
                          ? '#7d9484'
                          : '#de9679'
                    }
                    stroke={item.seed === seed ? '#fff7d6' : 'none'}
                    strokeWidth="3"
                  >
                    <title>{`种子 ${item.seed}：${value.toFixed(3)}`}</title>
                  </rect>
                  {[0, 9, 19, 29].includes(index) && (
                    <text
                      x={53 + index * 22}
                      y="288"
                      textAnchor="middle"
                      fill="#9baa9f"
                      fontSize="11"
                    >
                      {item.seed}
                    </text>
                  )}
                </g>
              );
            })}
            <text x="38" y="312" fill="#8fa494" fontSize="10">
              浅绿 = 按该指标方向较优 · 橙色 = 较差 · 白框 = 当前查看的种子
            </text>
          </svg>
          <p className="measurement-note">
            {metric.definition}{' '}
            这些终点的观测时长不同，不能直接推断策略的因果保护能力。
          </p>
        </div>
        <aside className="controls" aria-label="策略偏好控制">
          <span className="eyebrow">WHAT DOES BETTER MEAN?</span>
          <h3>
            先声明偏好，
            <br />
            再讨论谁更好。
          </h3>
          <div className="preset-buttons">
            {data.presets.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  setWeights(item.weights.map((value) => value * 100))
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          {data.metrics.map((item, index) => (
            <label className="range-label" key={item.id}>
              {item.label}
              <output>{weights[index].toFixed(0)}</output>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[index]}
                onChange={(event) =>
                  setWeights(
                    weights.map((value, i) =>
                      i === index ? Number(event.target.value) : value,
                    ),
                  )
                }
              />
            </label>
          ))}
          <details className="method">
            <summary>分数怎么算？</summary>
            <p>
              每项 = 偏好权重 × 方向 × 已观测均值 ÷
              量纲参考，再除以权重总和。四项量纲参考依次为
              1、100、100、60；玩家承伤方向为负，其余为正。参考尺度固定公开，不做样本
              min-max。
            </p>
          </details>
        </aside>
      </div>
      <div className="finding finding-alert">
        <span>指标陷阱</span>
        <p>
          同伴死亡从 25 / 30 变为 6 / 30，但 Utility 的平均观测窗口也从 25.38
          秒缩短到 21.76
          秒。“终局时还活着”不等于“能活更久”。先检查结束条件和暴露时长，再解释改进。
        </p>
      </div>
      <div className="pair-review">
        <div className="pair-header">
          <div>
            <span className="eyebrow">INSPECT A COUNTEREXAMPLE</span>
            <h3>均值之外，查看一对真实记录。</h3>
          </div>
          <label>
            种子
            <select
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
            >
              {data.pairs.map((item) => (
                <option value={item.seed} key={item.seed}>
                  {item.seed}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="counterexample-buttons">
          {data.counterexamples.map((item) => (
            <button
              key={item.seed}
              aria-pressed={seed === item.seed}
              onClick={() => setSeed(item.seed)}
            >
              {item.seed} / {item.title.replace('反例：', '')}
            </button>
          ))}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>观测终点</th>
                <th>Priority</th>
                <th>Utility</th>
                <th>差值 U − P</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td>
                    {pair.priority[item.id].toFixed(
                      item.id === 'companionAliveAtEnd' ? 0 : 2,
                    )}
                  </td>
                  <td>
                    {pair.utility[item.id].toFixed(
                      item.id === 'companionAliveAtEnd' ? 0 : 2,
                    )}
                  </td>
                  <td>
                    {pair.deltaUtilityMinusPriority[item.id] > 0 ? '+' : ''}
                    {pair.deltaUtilityMinusPriority[item.id].toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pair-note" aria-live="polite">
          {counterexample?.detail ??
            '同一预设种子的两次实际原生运行。UE 异步调度不保证逐位确定性；这里只比较这两次记录。'}
        </p>
        <div className="source-links">
          <a
            href={sourceUrl(pair.priority.source)}
            target="_blank"
            rel="noreferrer"
          >
            种子 {seed} / Priority 原始 JSON ↗
          </a>
          <a
            href={sourceUrl(pair.utility.source)}
            target="_blank"
            rel="noreferrer"
          >
            Utility 原始 JSON ↗
          </a>
        </div>
      </div>
      <div className="reasoning-grid">
        <article>
          <span>DECISION</span>
          <h3>不把一个漂亮指标当成目标</h3>
          <p>
            终局同伴状态、输出、玩家承伤与持续时间一起看。偏好分数只是公开讨论取舍的工具，不能为某种策略制造客观“总冠军”。
          </p>
        </article>
        <article>
          <span>ACCEPTANCE</span>
          <h3>测试说成功，先问是否执行</h3>
          <p>
            曾有错误地图缺少测试 Actor，Automation JSON 却报
            Success。最终门槛增加真实 PIE 世界、已开始运行的标记和 12
            条具名断言，拒绝零执行成功。
          </p>
        </article>
        <article>
          <span>NEXT EXPERIMENT</span>
          <h3>统一观察窗口，单独记录死亡时刻</h3>
          <p>
            固定随访窗口、明确终止原因，并记录事件时间，再比较保护能力。加入未参与调参的种子，避免把这
            30 对样本当作外推结论。
          </p>
        </article>
      </div>
      <div className="source-links">
        <a
          href="https://github.com/QiQiyzhu/aegis-arena/blob/codex/aegis-v1/docs/decision-case-study.md"
          target="_blank"
          rel="noreferrer"
        >
          完整决策案例 ↗
        </a>
        <a
          href="https://github.com/QiQiyzhu/aegis-arena/blob/codex/aegis-v1/docs/interview-deep-dive.md"
          target="_blank"
          rel="noreferrer"
        >
          3 分钟与 8 分钟讲解 ↗
        </a>
        <a
          href="https://github.com/QiQiyzhu/aegis-arena/releases/tag/v1.0.0-native"
          target="_blank"
          rel="noreferrer"
        >
          下载真实原生程序 ↗
        </a>
      </div>
    </section>
  );
}
