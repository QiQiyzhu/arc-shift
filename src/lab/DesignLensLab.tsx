import { useState } from 'react';
import { useEvidence } from './use-evidence';
import { CaseSources, EvidenceLoading } from './CaseSources';
import RecordedModelRun from './RecordedModelRun';
interface Variant {
  variant: string;
  task_success: boolean;
  status: string;
  checks: {
    format_validity: boolean;
    evidence_grounding: boolean;
    abstention_behavior: boolean;
  };
  output:
    | string
    | {
        claims: { text: string; quote: string; evidence_id: string }[];
        abstained: boolean;
      };
  trace: {
    node_id: string;
    type: string;
    status: string;
    observed?: number;
    passed?: boolean;
  }[];
}
interface DesignEvidence {
  cases: {
    case_id: string;
    title: string;
    input: { input: string; sources: { content: string }[] };
    variants: Variant[];
  }[];
}
export default function DesignLensLab() {
  const { data, error } = useEvidence<DesignEvidence>('designlens');
  const [name, setName] = useState('Prompt V2');
  if (!data) return <EvidenceLoading error={error} />;
  const row = data.cases.find((item) => item.case_id === 'irrelevant')!;
  const variant = row.variants.find((item) => item.variant === name)!;
  const output =
    typeof variant.output === 'string'
      ? variant.output
      : variant.output.abstained
        ? '没有相关上下文，停止生成结论。'
        : variant.output.claims.map((item) => item.text).join('\n');
  return (
    <section className="experiment" aria-labelledby="design-title">
      <div className="case-heading">
        <div>
          <span className="eyebrow">
            05 / DESIGNLENS AI · THE RIGHT TO STOP
          </span>
          <h2 id="design-title">
            引用一字不差，
            <br />
            结论就可信吗？
          </h2>
        </div>
        <p>
          让一段完全真实的引用回答一个与它无关的问题。观察格式校验、原文核对、上下文门槛分别保护了什么。
        </p>
      </div>
      <div className="evidence-label">
        确定性摘录器的实际执行 ·
        输入是明确标注的合成样本；没有真实访谈、大模型效果或产品实验结论。
      </div>
      <div className="source-comparison">
        <article>
          <span className="eyebrow">QUESTION</span>
          <h3>{row.input.input}</h3>
          <p>要研究的是“武器共鸣”的理解问题。</p>
        </article>
        <article>
          <span className="eyebrow">AVAILABLE SOURCE / e2</span>
          <blockquote>{row.input.sources[0].content}</blockquote>
          <p>手里只有一条“发票周二导出”的无关资料。</p>
        </article>
      </div>
      <div className="recorded-panel">
        <div className="scenario-buttons variant-buttons">
          {['Prompt V2', 'RAG', 'Workflow'].map((value) => (
            <button
              aria-pressed={name === value}
              key={value}
              onClick={() => setName(value)}
            >
              {value === 'Prompt V2'
                ? '结构化摘录'
                : value === 'RAG'
                  ? '先检索再摘录'
                  : '增加上下文门槛'}
            </button>
          ))}
        </div>
        <div className="checks-row">
          <div className={variant.checks.format_validity ? 'good' : 'bad'}>
            <strong>{variant.checks.format_validity ? '通过' : '失败'}</strong>
            <span>格式校验</span>
          </div>
          <div className={variant.checks.evidence_grounding ? 'good' : 'bad'}>
            <strong>
              {variant.checks.evidence_grounding ? '通过' : '失败'}
            </strong>
            <span>引用与原文核对</span>
          </div>
          <div className={variant.task_success ? 'good' : 'bad'}>
            <strong data-testid="design-task-result">
              {variant.task_success ? '通过' : '失败'}
            </strong>
            <span>该样本的规则验收</span>
          </div>
        </div>
        <div className="output-reading">
          <span className="eyebrow">RECORDED OUTPUT / {variant.status}</span>
          <blockquote>{output}</blockquote>
          <p>
            {variant.task_success
              ? '通过的行为是正确停止；不代表完成了研究或得出了产品结论。'
              : '前两项都绿了，输出仍然答非所问。引用真实性不等于与问题相关。'}
          </p>
        </div>
        {variant.trace.length > 0 && (
          <ol className="workflow-trace">
            {variant.trace.map((item) => (
              <li key={item.node_id}>
                <span>{item.type}</span>
                <strong>{item.node_id}</strong>
                <small>
                  {item.passed === false
                    ? `观察到 ${item.observed} 条上下文 · 停止`
                    : item.status}
                </small>
              </li>
            ))}
          </ol>
        )}
        <p className="measurement-note">
          Workflow 的上下文门槛在模型节点之前停止；此样本未调用
          Provider。这里的“规则验收通过”不代表人工审批通过。
        </p>
      </div>
      <div className="finding">
        <span>产品判断</span>
        <p>
          能否生成内容，与是否应该继续决策，是两个门槛。没有足够证据时，正确的输出可以是“先补研究”，而不是生成一份更完整的报告。
        </p>
      </div>
      <div className="reasoning-grid">
        <article>
          <span>DECISION</span>
          <h3>把证据链做成可撤回的依赖</h3>
          <p>
            观察未获确认不能进入机会；来源被否决后，旧机会不能继续生成实验。新边界测试对两种情况真实返回
            422。
          </p>
        </article>
        <article>
          <span>HUMAN REVIEW</span>
          <h3>规则绿灯不替代人的判断</h3>
          <p>
            一次脚本化审核把 pending_approval 改为
            rejected。它验证状态迁移，不冒充访谈或真实研究员评审。当前真实参与者和有效产品决策均为
            0。
          </p>
        </article>
        <article>
          <span>NEXT EXPERIMENT</span>
          <h3>预先定义什么证据会改变决定</h3>
          <p>
            先限定目标玩家与访谈问题，记录支持和反证，声明停止规则，再开展小样本定性研究。试点访谈不能被换算成总体用户比例。
          </p>
        </article>
      </div>
      <RecordedModelRun project="designlens" />
      <CaseSources
        repo="designlens-ai"
        branch="codex/designlens-v1"
        file="designlens"
      />
    </section>
  );
}
