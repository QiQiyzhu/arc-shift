import { useState } from 'react';
import { useEvidence } from './use-evidence';
import { CaseSources, EvidenceLoading } from './CaseSources';
import RecordedModelRun from './RecordedModelRun';

interface Candidate {
  id: string;
  candidate_source: string;
  regression_tests_passed: number;
  in_loop_verifier: { passed: boolean };
  independent_mutant: { passed: boolean; exit_code: number };
  final_decision: {
    accepted: boolean;
    mutation_killed: boolean;
    reason: string;
  };
  implementation_restored: boolean;
}
interface RepoEvidence {
  repository_commit: string;
  recorded_at: string;
  environment: { platform: string };
  mutation: { old: string; new: string };
  rows: Candidate[];
}
export default function RepoLab() {
  const { data, error } = useEvidence<RepoEvidence>('repopilot');
  const [candidateId, setCandidateId] = useState('axis-only');
  const [revealed, setRevealed] = useState(false);
  if (!data) return <EvidenceLoading error={error} />;
  const candidate = data.rows.find((item) => item.id === candidateId)!;
  return (
    <section className="experiment" aria-labelledby="repo-title">
      <div className="case-heading">
        <div>
          <span className="eyebrow">03 / REPOPILOT · TEST THE TEST</span>
          <h2 id="repo-title">
            测试全绿，
            <br />
            这个补丁就该收吗？
          </h2>
        </div>
        <p>
          任务是给距离函数增加回归测试。两份候选都通过现有套件；如果一个已知错误也能通过，新增测试究竟保护了什么？
        </p>
      </div>
      <div className="evidence-label">
        Linux 中真实运行的人工编写候选对照 · 未调用模型。93 项是固定历史 ARC
        基线的结果，不是当前游戏测试数量。
      </div>
      <div className="candidate-grid">
        <div className="recorded-panel candidate-panel">
          <div className="scenario-buttons variant-buttons">
            {[
              { id: 'axis-only', label: '候选 A / 仅坐标轴' },
              { id: 'diagonal-reference', label: '候选 B / 包含对角线' },
            ].map((item) => (
              <button
                key={item.id}
                aria-pressed={item.id === candidateId}
                onClick={() => {
                  setCandidateId(item.id);
                  setRevealed(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="code-heading">
            <span>ACTUAL CANDIDATE SOURCE</span>
            <span>Vitest / TypeScript</span>
          </div>
          <pre className="candidate-code">
            <code>{candidate.candidate_source}</code>
          </pre>
          <div className="candidate-checks">
            <div>
              <strong>{candidate.regression_tests_passed}</strong>
              <span>回归测试通过</span>
            </div>
            <div>
              <strong>
                {candidate.in_loop_verifier.passed ? 'PASS' : 'FAIL'}
              </strong>
              <span>循环内验证器</span>
            </div>
            <div>
              <strong>?</strong>
              <span>能发现指定缺陷吗</span>
            </div>
          </div>
        </div>
        <aside className="review-prompt">
          <span className="eyebrow">MAKE A REVIEW DECISION</span>
          <h3>
            你会接受这份
            <br />
            新增测试吗？
          </h3>
          <p>
            正确实现使用欧氏距离。错误实现改为曼哈顿距离后，水平线上的距离依然是
            3。
          </p>
          <svg
            viewBox="0 0 270 195"
            aria-label="3、4、5 直角三角形：欧氏距离为5，曼哈顿距离为7"
          >
            <path
              d="M 45 150 L 210 150 L 210 30"
              stroke="#84a691"
              strokeDasharray="6 5"
              strokeWidth="2"
              fill="none"
            />
            <path d="M 45 150 L 210 30" stroke="#d3eba0" strokeWidth="2" />
            <circle cx="45" cy="150" r="4" fill="#f4ecd0" />
            <circle cx="210" cy="30" r="4" fill="#f4ecd0" />
            <text x="125" y="177" fill="#9db29e" fontSize="14">
              3
            </text>
            <text x="225" y="95" fill="#9db29e" fontSize="14">
              4
            </text>
            <text x="105" y="77" fill="#d3eba0" fontSize="20">
              5 ≠ 7
            </text>
          </svg>
          <button
            className="reveal-button"
            onClick={() => setRevealed(true)}
            disabled={revealed}
          >
            {revealed ? '已展开真实验收记录' : '查看独立验收结果 →'}
          </button>
          <p className="measurement-note">
            展开已存档的进程结果。本页不会执行代码或临时生成“通过”状态。
          </p>
        </aside>
      </div>
      {revealed && (
        <div
          className={`mutation-review ${candidate.final_decision.accepted ? '' : 'mutation-rejected'}`}
          aria-live="polite"
        >
          <div>
            <span className="eyebrow">INDEPENDENT MUTATION CHECK</span>
            <h3 data-testid="candidate-decision">
              {candidate.final_decision.accepted
                ? '接受：测试捕获了指定错误'
                : '拒收：错误实现仍然通过'}
            </h3>
            <p>
              {candidate.final_decision.accepted
                ? '对角线用例期待 5，却得到 7，进程以 1 退出。它能拒绝这个具体的已知缺陷，仍不能证明不存在其他错误。'
                : '现有回归套件和新增测试都绿了，但坐标轴用例无法区分欧氏与曼哈顿距离，遗漏任务要求的回归保护。'}
            </p>
          </div>
          <div className="mutation-diff">
            <span>
              注入的错误 /{' '}
              {candidate.independent_mutant.exit_code === 0
                ? '进程退出 0，缺陷存活'
                : '进程退出 1，缺陷被捕获'}
            </span>
            <code>
              <del>{data.mutation.old}</del>
              <ins>{data.mutation.new}</ins>
            </code>
            <small>
              原实现恢复检查：
              {candidate.implementation_restored ? '通过' : '未通过'}
            </small>
          </div>
        </div>
      )}
      <div className="reasoning-grid">
        <article>
          <span>DECISION</span>
          <h3>把 Agent 的自检与最终验收分开</h3>
          <p>
            循环内的工具告诉 Agent
            如何继续。独立评估器保留另一份验收标准，防止“执行成功”被当作“完成需求”。
          </p>
        </article>
        <article>
          <span>COUNTEREXAMPLE</span>
          <h3>超时不能算“杀死变异”</h3>
          <p>
            评估器曾把超时当作非零退出。这一轮修正为拒绝超时结果，并用真实子进程超时测试保护它。基础设施故障不应变成质量成绩。
          </p>
        </article>
        <article>
          <span>NEXT EXPERIMENT</span>
          <h3>让已知缺陷暴露测试盲区</h3>
          <p>
            先用可信候选验证评估器，再接入真实模型并固定任务、预算和环境。保留失败、成本与轨迹；不要用一次成功推出整个模型的修复率。
          </p>
        </article>
      </div>
      <RecordedModelRun project="repopilot" />
      <CaseSources
        repo="repopilot"
        branch="codex/repopilot-v1"
        file="repopilot"
      />
    </section>
  );
}
