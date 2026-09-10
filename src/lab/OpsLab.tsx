import { useState } from 'react';
import { useEvidence } from './use-evidence';
import { CaseSources, EvidenceLoading } from './CaseSources';
import RecordedModelRun from './RecordedModelRun';

interface RetrievalVariant {
  variant: string;
  rank: number | null;
  answerable: boolean;
  retrieved: { document_id: string; section: string; score: number }[];
}
interface OpsEvidence {
  cases: {
    case_id: string;
    title: string;
    input: {
      question: string;
      gold_document: string | null;
      gold_section: string | null;
    };
    variants: RetrievalVariant[];
  }[];
  boundary_execution: {
    executed_at: string;
    steps: {
      id: string;
      title: string;
      observed?: { status_code: number };
      database_after: {
        order_status: string;
        refund_count: number;
        proposal_status: string | null;
        audit_count: number;
      };
    }[];
  };
}
export default function OpsLab() {
  const { data, error } = useEvidence<OpsEvidence>('opspilot');
  const [caseId, setCaseId] = useState('rag_02');
  const [mode, setMode] = useState('hybrid');
  const [stepIndex, setStepIndex] = useState(0);
  if (!data) return <EvidenceLoading error={error} />;
  const row = data.cases.find((item) => item.case_id === caseId)!;
  const variant = row.variants.find((item) => item.variant === mode)!;
  const step = data.boundary_execution.steps[stepIndex];
  const gold = (entry: RetrievalVariant['retrieved'][number]) =>
    entry.document_id === row.input.gold_document &&
    entry.section === row.input.gold_section;
  return (
    <section className="experiment" aria-labelledby="ops-title">
      <div className="case-heading">
        <div>
          <span className="eyebrow">
            04 / OPSPILOT AI · RETRIEVAL ≠ AUTHORITY
          </span>
          <h2 id="ops-title">
            找到了政策，
            <br />
            就可以退款吗？
          </h2>
        </div>
        <p>
          先看一个检索排名退化的真实案例，再逐步查看服务端如何检查资格、权限与重复执行。业务记录使用模拟订单，没有真实支付。
        </p>
      </div>
      <div className="evidence-label">
        BGE ONNX 与 PostgreSQL 实际执行记录 ·
        问题集为合成开发样本；本页读取已有结果，不调用大模型或业务接口。
      </div>
      <div className="recorded-panel">
        <div className="record-controls">
          <label>
            选择问题
            <select
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
            >
              {data.cases.map((item) => (
                <option key={item.case_id} value={item.case_id}>
                  {item.case_id} / {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="scenario-buttons">
            {[
              { id: 'hybrid', label: '仅混合检索' },
              { id: 'hybrid_rerank', label: '加入词项重排' },
              { id: 'dense', label: '仅向量检索' },
              { id: 'keyword', label: '仅关键词' },
            ].map((item) => (
              <button
                key={item.id}
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <blockquote className="query-quote">{row.input.question}</blockquote>
        <div className="rank-heading">
          <div>
            <span>目标政策段落的实际排名</span>
            <strong data-testid="retrieval-rank">
              {variant.answerable
                ? variant.rank === null
                  ? '未召回'
                  : `#${variant.rank}`
                : '本应拒答'}
            </strong>
          </div>
          <p>
            {variant.answerable
              ? `目标：${row.input.gold_document} / ${row.input.gold_section}`
              : '数据集中没有可回答该问题的政策。返回相似段落并不等于具备依据。'}
          </p>
        </div>
        <ol className="rank-list">
          {variant.retrieved.slice(0, 5).map((item, index) => (
            <li
              className={gold(item) ? 'gold-evidence' : ''}
              key={item.document_id + item.section}
            >
              <span className="rank-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <strong>{item.section}</strong>
                <small>{item.document_id}</small>
              </div>
              <span className="rank-badge">
                {gold(item) ? '目标段落' : '其他候选'}
              </span>
            </li>
          ))}
        </ol>
        <p className="measurement-note">
          最多展示前 5 条，完整排序保留在原始
          JSON。不同检索器的分数不共用概率尺度；不能把 RRF 分数当作置信度。
        </p>
      </div>
      <div className="finding finding-alert">
        <span>反例 / rag_02</span>
        <p>
          正确的资格段落在 Hybrid 排第 1，加入词项重排后降至第 4，跌出 Top
          3。整体 MRR 更高，也可能损害具体问题；一次升级要看分桶和退化样本。
        </p>
      </div>
      <div className="execution-review">
        <div className="pair-header">
          <div>
            <span className="eyebrow">READ AN ACTUAL EXECUTION RECORD</span>
            <h3>检索之外，还有写入边界。</h3>
          </div>
          <span className="record-stamp">PostgreSQL · 已执行记录</span>
        </div>
        <div className="step-navigation">
          {data.boundary_execution.steps.map((item, index) => (
            <button
              key={item.id}
              aria-pressed={index === stepIndex}
              onClick={() => setStepIndex(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.title}
            </button>
          ))}
        </div>
        <div className="step-result" aria-live="polite">
          <span className="eyebrow">当前记录 / {step.id}</span>
          <h3>{step.title}</h3>
          <div className="transaction-metrics">
            <div>
              <strong>
                {step.observed?.status_code ??
                  step.database_after.proposal_status}
              </strong>
              <span>拒绝码 / 提案状态</span>
            </div>
            <div>
              <strong data-testid="refund-count">
                {step.database_after.refund_count}
              </strong>
              <span>数据库退款条数</span>
            </div>
            <div>
              <strong>{step.database_after.audit_count}</strong>
              <span>审计条数</span>
            </div>
            <div>
              <strong>{step.database_after.order_status}</strong>
              <span>独立读取订单状态</span>
            </div>
          </div>
        </div>
        <p className="measurement-note">
          这些按钮只切换已经执行的记录，不会批准或发起退款。前后资格检查使用不同测试订单；同一提案的待审、错误角色、批准重放共享订单。
        </p>
      </div>
      <div className="reasoning-grid">
        <article>
          <span>DECISION</span>
          <h3>让概率输出提出建议</h3>
          <p>
            检索负责提供候选证据。订单期限、金额、权限、幂等与交易状态由确定性代码判断，审批不能省掉写入前的资格复核。
          </p>
        </article>
        <article>
          <span>COUNTEREXAMPLE</span>
          <h3>提案没变，资格也可能过期</h3>
          <p>
            这次测试只改变送达时间、保持订单版本不变。旧提案批准仍被 409
            拒绝，说明只比较版本号不能替代当前业务资格。
          </p>
        </article>
        <article>
          <span>NEXT EXPERIMENT</span>
          <h3>先提升拒答，再谈自动化比例</h3>
          <p>
            补充人工标注的超范围问题、看代价敏感阈值及分桶退化，并持续测试并发与重放。当前
            30 个合成问题不能证明真实客服收益。
          </p>
        </article>
      </div>
      <RecordedModelRun project="opspilot" />
      <CaseSources
        repo="opspilot-ai"
        branch="codex/opspilot-v1"
        file="opspilot"
      />
    </section>
  );
}
