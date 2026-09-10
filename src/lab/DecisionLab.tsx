import { useEffect, useState } from 'react';
import CollisionLab from './CollisionLab';
import AegisLab from './AegisLab';
import RepoLab from './RepoLab';
import OpsLab from './OpsLab';
import DesignLensLab from './DesignLensLab';

const cases = [
  {
    id: 'arc',
    label: '01 / ARC//SHIFT',
    question: '快，但漏了一个目标？',
    Component: CollisionLab,
  },
  {
    id: 'aegis',
    label: '02 / AEGIS ARENA',
    question: '同伴存活，算赢了吗？',
    Component: AegisLab,
  },
  {
    id: 'repopilot',
    label: '03 / REPOPILOT',
    question: '测试全绿，就该收吗？',
    Component: RepoLab,
  },
  {
    id: 'opspilot',
    label: '04 / OPSPILOT AI',
    question: '找到政策，就能退款？',
    Component: OpsLab,
  },
  {
    id: 'designlens',
    label: '05 / DESIGNLENS AI',
    question: '引用正确，就可信了？',
    Component: DesignLensLab,
  },
];
const readCase = () =>
  cases.find((item) => item.id === window.location.hash.slice(1))?.id ?? 'arc';
export default function DecisionLab() {
  const [active, setActive] = useState(readCase);
  useEffect(() => {
    const update = () =>
      setActive(
        (current) =>
          cases.find((item) => item.id === window.location.hash.slice(1))?.id ??
          (window.location.hash ? current : 'arc'),
      );
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const selected = cases.find((item) => item.id === active)!;
  const select = (id: string) => {
    setActive(id);
    window.history.pushState(null, '', `#${id}`);
  };
  return (
    <>
      <a className="skip-link" href="#decision-content">
        跳至实验
      </a>
      <header className="lab-header">
        <a href="/portfolio/" className="wordmark">
          QY<span>ENGINEERING / DECISION LAB</span>
        </a>
        <a href="/portfolio/">返回作品集 ↗</a>
      </header>
      <main>
        <section className="lab-intro">
          <span className="eyebrow">DECISION LAB / 2026</span>
          <h1>
            把一个技术选择，
            <br />
            <em>推到它的边界。</em>
          </h1>
          <p>
            改变约束，找到反例，再检查证据。
            <br />
            五个项目，五次可以亲手审视的决定。
          </p>
        </section>
        <nav className="case-nav" aria-label="选择决策案例">
          {cases.map((item) => (
            <button
              key={item.id}
              aria-pressed={active === item.id}
              onClick={() => select(item.id)}
            >
              <span>{item.label}</span>
              <strong>{item.question}</strong>
            </button>
          ))}
        </nav>
        <div id="decision-content">
          <selected.Component />
        </div>
        <footer className="lab-footer">
          <span>AI 辅助实现 · 方法、来源与未验证范围随案例说明</span>
          <a href="/portfolio/handbooks/">阅读完整 A–T 手册 ↗</a>
        </footer>
      </main>
    </>
  );
}
