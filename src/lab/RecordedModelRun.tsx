import { useEvidence } from './use-evidence';
interface ModelRecord {
  project: string;
  model: string;
  label: string;
  result: string;
  detail: string;
  limitation: string;
  attempts: number;
  inputTokens: number;
  outputTokens: number;
  recordedAt: string;
  receipt: string;
  sha256: string;
  redactions: string[];
}
export default function RecordedModelRun({
  project,
}: {
  project: 'repopilot' | 'opspilot' | 'designlens';
}) {
  const { data, error } = useEvidence<{ rows: ModelRecord[] }>('real-models');
  if (!data)
    return error ? (
      <p className="evidence-label">真实模型回执暂未加载，可从仓库查阅。</p>
    ) : null;
  const row = data.rows.find((item) => item.project === project)!;
  return (
    <aside className="model-record" aria-label="DeepSeek 真实执行结果">
      <div>
        <span className="eyebrow">
          REAL MODEL / RECORDED {row.recordedAt.slice(0, 10)}
        </span>
        <h3>
          {row.model}
          <span>已实际调用</span>
        </h3>
        <p>{row.detail}</p>
      </div>
      <div className="model-record-metrics">
        <div>
          <strong data-testid="real-model-result">{row.result}</strong>
          <span>{row.label}通过</span>
        </div>
        <div>
          <strong>{row.attempts}</strong>
          <span>实际 API 调用</span>
        </div>
        <div>
          <strong>
            {(row.inputTokens + row.outputTokens).toLocaleString('en-US')}
          </strong>
          <span>服务端返回的总 tokens</span>
        </div>
      </div>
      <p className="model-record-limit">
        {row.limitation} 本页展示已留档结果，不会触发付费调用。
      </p>
      <details className="method">
        <summary>查看用量与来源</summary>
        <p>
          输入 {row.inputTokens.toLocaleString('en-US')} / 输出{' '}
          {row.outputTokens.toLocaleString('en-US')}{' '}
          tokens。未读取账单，费用未知。
          {row.redactions.length > 0
            ? '本机夹具路径已替换，原件哈希保留在导出说明中。'
            : ''}
        </p>
        <a
          href={`/portfolio/cases/${row.receipt}`}
          target="_blank"
          rel="noreferrer"
        >
          打开本次调用记录 ↗
        </a>
        <p className="receipt-hash">SHA256 / {row.sha256}</p>
      </details>
    </aside>
  );
}
