export function CaseSources({
  repo,
  branch,
  file,
}: {
  repo: string;
  branch: string;
  file: string;
}) {
  const base = `https://github.com/QiQiyzhu/${repo}/blob/${branch}/docs/`;
  return (
    <div className="source-links">
      <a
        href={base + 'decision-case-study.md'}
        target="_blank"
        rel="noreferrer"
      >
        完整决策案例 ↗
      </a>
      <a
        href={base + 'interview-deep-dive.md'}
        target="_blank"
        rel="noreferrer"
      >
        30 秒 / 3 分钟 / 8 分钟讲解 ↗
      </a>
      <a
        href={`/portfolio/cases/${file}.json`}
        target="_blank"
        rel="noreferrer"
      >
        本页原始记录与来源哈希 ↗
      </a>
    </div>
  );
}
export function EvidenceLoading({ error }: { error: boolean }) {
  return (
    <output className="evidence-label">
      {error
        ? '证据文件未能加载。请刷新重试，或回到作品集查阅仓库原始记录。'
        : '正在读取随项目发布的原始实验记录…'}
    </output>
  );
}
