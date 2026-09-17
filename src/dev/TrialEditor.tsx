import { useMemo, useState } from 'react';
import TrialApp from '../trial/TrialApp';
import { DEFAULT_TRIAL, importTrial, type TrialConfig } from '../trial/config';
export default function TrialEditor() {
  const [json, setJSON] = useState(JSON.stringify(DEFAULT_TRIAL, null, 2)),
    [preview, setPreview] = useState<TrialConfig | null>(null);
  const valid = useMemo(() => importTrial(json), [json]);
  const draft = useMemo(() => {
    try {
      return JSON.parse(json) as Partial<TrialConfig>;
    } catch {
      return null;
    }
  }, [json]);
  const first =
    draft && Array.isArray(draft.stages) ? draft.stages[0] : undefined;
  const split =
    draft && Array.isArray(draft.offers)
      ? draft.offers.find((o) => o?.id === 'fire-split')
      : undefined;
  const edit = (kind: 'budget' | 'price', value: number) => {
    if (!draft) return;
    const d = structuredClone(draft);
    if (kind === 'budget' && d.stages?.[0]) d.stages[0].budget = value;
    else if (kind === 'price' && Array.isArray(d.offers)) {
      const o = d.offers.find((o) => o?.id === 'fire-split');
      if (o) o.cost = value;
    }
    setJSON(JSON.stringify(d, null, 2));
  };
  if (preview)
    return <TrialApp config={preview} onBack={() => setPreview(null)} />;
  return (
    <main className="trial-shell">
      <header className="trial-header">
        <a href="/">ARC{'//'}SHIFT</a>
        <span>DESIGN LAB / 构筑配置</span>
        <a href="/dev/content-editor">内容工作台</a>
      </header>
      <section className="trial-editor">
        <h1>把假设变成可试玩规则</h1>
        <p>
          调整初始预算或一项协议价格，再看可购买组合如何变化。试玩使用同一战斗引擎；不覆盖主线或正式活动记录。
        </p>
        <div className="trial-editor-fields">
          <label>
            初始预算
            <input
              aria-label="初始预算"
              type="number"
              min={1}
              max={9}
              disabled={!first}
              value={typeof first?.budget === 'number' ? first.budget : ''}
              onChange={(e) => edit('budget', Number(e.target.value))}
            />
          </label>
          <label>
            三重星火价格
            <input
              aria-label="三重星火价格"
              type="number"
              min={1}
              max={8}
              disabled={!split}
              value={typeof split?.cost === 'number' ? split.cost : ''}
              onChange={(e) => edit('price', Number(e.target.value))}
            />
          </label>
        </div>
        <pre aria-label="构筑配置差异">
          {valid.ok
            ? `初始预算 ${DEFAULT_TRIAL.stages[0].budget} → ${valid.value.stages[0].budget}\n三重星火 ${DEFAULT_TRIAL.offers.find((o) => o.id === 'fire-split')!.cost} → ${split?.cost ?? '不在目录中'}`
            : valid.errors.join('\n')}
        </pre>
        <button
          className="trial-primary"
          disabled={!valid.ok}
          onClick={() => valid.ok && setPreview(valid.value)}
        >
          应用并试玩构筑
        </button>
        <button onClick={() => setJSON(JSON.stringify(DEFAULT_TRIAL, null, 2))}>
          恢复内置规则
        </button>
        <details>
          <summary>完整配置 JSON · 可编辑</summary>
          <textarea
            aria-label="构筑配置 JSON"
            value={json}
            onChange={(e) => setJSON(e.target.value)}
          />
        </details>
      </section>
    </main>
  );
}
