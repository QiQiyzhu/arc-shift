import { Component, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from './i18n';

export function LaunchMessage({
  failed = false,
  slow = false,
}: {
  failed?: boolean;
  slow?: boolean;
}) {
  const t = useTranslation();
  return (
    <section
      className="launch-message"
      role={failed ? 'alert' : undefined}
      aria-live="polite"
    >
      <span className="eyebrow">ARC // SHIFT · 2.4</span>
      <h1>
        {failed
          ? t.copy('暂时无法进入游戏', 'Unable to launch the game')
          : t.copy('正在准备奥术跃迁', 'Preparing your shift')}
      </h1>
      <p>
        {failed
          ? t.copy(
              '加载未完成。请检查网络后重试；也可在更新后的桌面浏览器中打开。重试不会清除存档。',
              'Loading did not finish. Check your connection and retry, or open an up-to-date desktop browser. Retrying will not clear your save.',
            )
          : slow
            ? t.copy(
                '首次加载可能需要一些时间。若一直停留在此处，请检查网络并重新加载。',
                'The first launch may take a moment. If loading does not finish, check your connection and reload.',
              )
            : t.copy('正在加载场景与界面…', 'Loading scenes and interface…')}
      </p>
      {(failed || slow) && (
        <div className="save-actions">
          <button onClick={() => location.reload()}>
            {t.copy('重新加载', 'Reload game')}
          </button>
          <a href="/">{t.copy('返回首页', 'Back to home')}</a>
        </div>
      )}
    </section>
  );
}

export function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return <LaunchMessage slow={slow} />;
}

export class LaunchBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <LaunchMessage failed /> : this.props.children;
  }
}

/** Inform touch-only visitors before they discover the missing controls mid-run. */
export function DeviceNotice() {
  const t = useTranslation();
  const [visible, setVisible] = useState(
    () => matchMedia('(pointer: coarse) and (hover: none)').matches,
  );
  if (!visible) return null;
  return (
    <aside className="device-notice" role="note">
      <p>
        {t.copy(
          '本作需要键盘和鼠标，主行动也支持手柄；尚未提供触屏战斗按键。请连接外设或使用电脑游玩。',
          'Keyboard and mouse are required; the main campaign also supports a controller. Touch combat controls are not available. Connect your controls or play on a computer.',
        )}
      </p>
      <button onClick={() => setVisible(false)}>
        {t.copy('知道了', 'Got it')}
      </button>
    </aside>
  );
}
