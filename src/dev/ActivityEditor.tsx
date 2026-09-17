import { useMemo, useState } from 'react';
import {
  ACTIVITY_FIELDS,
  RELAY_ACTIVITY,
  importActivity,
  activityDigest,
  type ActivityDefinition,
} from '../activities/definition';
import ActivityApp from '../activities/ActivityApp';
import { contentDiff } from '../content/schema';
import { downloadJSON } from './files';

export default function ActivityEditor() {
  const [json, setJSON] = useState(JSON.stringify(RELAY_ACTIVITY, null, 2));
  const [preview, setPreview] = useState<ActivityDefinition | null>(null),
    [error, setError] = useState('');
  const valid = useMemo(() => importActivity(json), [json]);
  let raw: Record<string, unknown> | null = null;
  try {
    const p = JSON.parse(json);
    if (p && typeof p === 'object' && !Array.isArray(p)) raw = p;
  } catch {
    /* Keep invalid draft visible. */
  }
  if (preview)
    return <ActivityApp draft={preview} onBack={() => setPreview(null)} />;
  const changes = valid.ok
    ? [
        ...Object.keys(RELAY_ACTIVITY)
          .filter(
            (k) =>
              k !== 'content' &&
              JSON.stringify(RELAY_ACTIVITY[k as keyof ActivityDefinition]) !==
                JSON.stringify(valid.value[k as keyof ActivityDefinition]),
          )
          .map(
            (k) =>
              `${k}: ${JSON.stringify(RELAY_ACTIVITY[k as keyof ActivityDefinition])} → ${JSON.stringify(valid.value[k as keyof ActivityDefinition])}`,
          ),
        ...contentDiff(RELAY_ACTIVITY.content, valid.value.content),
      ]
    : [];
  return (
    <main className="activity-shell">
      <header className="activity-header">
        <a href="/">
          ARC<span>{'//'}</span>SHIFT
        </a>
        <span>CONTENT LAB / ACTIVITY</span>
        <a href="/dev/content-editor">返回内容编辑器</a>
      </header>
      <section className="activity-editor">
        <p className="activity-kicker">CONFIGURE → VALIDATE → PLAY</p>
        <h1>挑战活动编辑器</h1>
        <p>
          先把驻留目标从 18 改为 6
          秒，查看差异，再应用并试玩。这里复用正式活动控制器与现有战斗内容配置；试玩不写主线或活动存档。
        </p>
        <div className="activity-editor-grid">
          <section>
            {Object.entries(ACTIVITY_FIELDS).map(([key, spec]) => (
              <label key={key}>
                {spec.label}
                <input
                  aria-label={spec.label}
                  type="number"
                  min={spec.min}
                  max={spec.max}
                  step="1"
                  value={
                    typeof raw?.[key] === 'number' ? (raw[key] as number) : ''
                  }
                  disabled={!raw}
                  onChange={(e) =>
                    raw &&
                    setJSON(
                      JSON.stringify(
                        {
                          ...raw,
                          [key]:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        },
                        null,
                        2,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <p>
              同一份 JSON 的 content
              字段包含敌人、武器、协议与遭遇参数，沿用内容编辑器的严格校验。改变正式规则时需要显式提升活动
              revision，并为旧记录设计迁移；此处只创建草稿。
            </p>
            <div className="activity-actions">
              <button
                className="activity-primary"
                disabled={!valid.ok}
                onClick={() => valid.ok && setPreview(valid.value)}
              >
                应用并试玩
              </button>
              <button
                disabled={!valid.ok}
                onClick={() =>
                  valid.ok && downloadJSON(valid.value, 'relay-activity.json')
                }
              >
                导出活动 JSON
              </button>
              <button
                onClick={() => {
                  setJSON(JSON.stringify(RELAY_ACTIVITY, null, 2));
                  setError('');
                }}
              >
                恢复内置规则
              </button>
            </div>
            <label>
              导入活动 JSON
              <input
                aria-label="导入活动 JSON"
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 256 * 1024) setError('文件超过 256 KiB');
                    else {
                      setJSON(await file.text());
                      setError('');
                    }
                  }
                  e.target.value = '';
                }}
              />
            </label>
            {(error || !valid.ok) && (
              <div className="activity-error" role="alert">
                {error}
                {!valid.ok && valid.errors.map((x, i) => <p key={i}>{x}</p>)}
              </div>
            )}
            <h2>与内置规则的差异</h2>
            <pre aria-label="活动配置差异">
              {valid.ok
                ? changes.join('\n') || '无变化'
                : '配置无效，禁止应用。'}
            </pre>
            {valid.ok && (
              <p>
                规则指纹 {activityDigest(valid.value)} ·
                仅用于兼容性识别，不是防作弊签名。
              </p>
            )}
          </section>
          <section>
            <label htmlFor="activity-json">完整配置 · 最大 256 KiB</label>
            <textarea
              id="activity-json"
              aria-label="活动 JSON"
              value={json}
              onChange={(e) => setJSON(e.target.value)}
              spellCheck={false}
            />
          </section>
        </div>
      </section>
    </main>
  );
}
