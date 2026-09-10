import { useState } from 'react';
import type { ActionInput } from '../input/actions';
import {
  DEFAULT_BINDINGS,
  keyLabel,
  persistBindings,
  type KeyAction,
} from '../input/bindings';
const labels: Partial<Record<KeyAction, string>> = {
  MoveUp: '向上移动',
  MoveDown: '向下移动',
  MoveLeft: '向左移动',
  MoveRight: '向右移动',
  Dash: '相位跃迁',
  Pulse: '清弹脉冲',
  Gravity: '引力奇点',
  Bomb: '投放炸弹',
  Potion: '饮用灵药',
  Pause: '暂停 / 继续',
};
const choices = [
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'Escape',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => `Key${c}`),
  ...'1234567890'.split('').map((c) => `Digit${c}`),
];
export function InputSettings({ controls }: { controls: ActionInput }) {
  const [, render] = useState(0);
  const [message, setMessage] = useState('');
  const config = controls.bindings;
  const apply = (next: typeof config) => {
    try {
      controls.setBindings(next);
      setMessage(
        persistBindings(next)
          ? '操作配置已保存。'
          : '存储不可用，操作配置在本次会话有效。',
      );
      render((n) => n + 1);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  return (
    <details className="input-settings">
      <summary>
        操作与手柄{' '}
        <span>{controls.connected ? '标准手柄已连接' : '键盘 / 鼠标'}</span>
      </summary>
      <p>
        左摇杆移动 · 右摇杆瞄准 · RT 攻击 · A 跃迁 · LB 脉冲 · RB 引力 · X 炸弹
        · Y 灵药 · Start 暂停。菜单和选卡使用鼠标。
      </p>
      <div className="binding-grid">
        {Object.entries(labels).map(([action, label]) => (
          <label key={action}>
            <span>{label}</span>
            <select
              aria-label={`${label}按键`}
              value={config.keys[action as KeyAction][0]}
              onChange={(event) => {
                const next = structuredClone(config),
                  keys = next.keys[action as KeyAction];
                next.keys[action as KeyAction] = [
                  event.target.value,
                  ...keys.slice(1),
                ];
                apply(next);
              }}
            >
              {[
                ...new Set([...choices, ...config.keys[action as KeyAction]]),
              ].map((code) => (
                <option key={code} value={code}>
                  {keyLabel(code)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="input-deadzone">
        摇杆死区{' '}
        <select
          aria-label="摇杆死区"
          value={String(config.deadzone)}
          onChange={(e) =>
            apply({ ...config, deadzone: Number(e.target.value) })
          }
        >
          {[0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5].map((n) => (
            <option key={n} value={n}>
              {Math.round(n * 100)}%
            </option>
          ))}
        </select>
      </label>
      <p>
        重复按键会被拒绝；方向键仍是备用移动键。浏览器首次识别手柄时，请按一下手柄按钮。
      </p>
      <button
        className="binding-reset"
        onClick={() => apply(structuredClone(DEFAULT_BINDINGS))}
      >
        恢复默认操作
      </button>
      {message && <output>{message}</output>}
    </details>
  );
}
