# ARC//SHIFT · 奥术跃迁

一款免费、单人的浏览器动作构筑游戏。移动、瞄准、闪避，用协议改变攻击，在不同路线中完成挑战。

## ▶ 直接玩

**[点击打开游戏](https://arc-shift.black-kid-3047.chatgpt.site/)** · **[详细游玩说明](docs/PLAY.md)** · [版本与验证](docs/release-v2.4.md)

无需下载、注册或 API Key。请使用电脑上的 Chrome 或 Edge，准备键盘和鼠标；手机目前没有触屏战斗操作。

1. 打开游戏，第一次玩点击 **「第一次跃迁 / 行动演练」**。
2. 跟随移动、攻击、跃迁提示，熟悉操作后点击 **「开始行动」**。
3. 战斗结束后选升级和路线；下次打开游戏，可点 **「继续行动」** 返回最近检查点。

| 最常用操作 | 按键 |
|---|---|
| 移动 / 瞄准 | WASD 或方向键 / 鼠标 |
| 攻击 / 闪避 | 鼠标左键 / Space |
| 脉冲 / 引力 | Q / E |
| 炸弹 / 灵药 | B / R |
| 暂停 / 继续 | Esc |

**声音、画面、语言和改键：打开「系统设置」。** 音乐需要第一次点击页面后才能播放。存档保存在当前浏览器中，清理站点数据会删除本地进度。

## 选一个模式

| 模式 | 适合谁 | 入口 |
|---|---|---|
| 主线行动 | 想探索随机武器、协议和十二层路线 | [游戏首页](https://arc-shift.black-kid-3047.chatgpt.site/) |
| 构筑远征 | 想直接体验三武装、预算和合约取舍 | [开始构筑](https://arc-shift.black-kid-3047.chatgpt.site/build-trial) |
| 边境行动 | 想探索、回收或护送，完成区域目标 | [进入边境](https://arc-shift.black-kid-3047.chatgpt.site/frontier) |
| 中继争夺 | 想体验短局驻留占点挑战 | [开始挑战](https://arc-shift.black-kid-3047.chatgpt.site/challenge) |

这是持续打磨中的独立游戏试玩候选版。自动化验收范围、已知限制和本次更新见 [v2.4 记录](docs/release-v2.4.md)；没有多人联机或云存档。

<details>
<summary>开发者：本地运行、工程资料与历史版本</summary>

Node.js 22.13+（推荐 24），在仓库目录运行：

```sh
npm ci
npm run dev
```

打开终端显示的本机地址。生产构建：`npm run build`；预览：`npm start`。静态产物在 `dist/`。

检查：`npm run typecheck`、`npm run lint`、`npm test`、`npm run test:e2e`。Linux 首次浏览器测试需 `npx playwright install --with-deps chromium`。GitHub 每周自动运行完整检查；失败通知是开发检查结果，不是玩家访问通知。

[架构](docs/architecture.md) · [工程案例](docs/engineering-case-study.md) · [原始验收](docs/qa-report.md) · [历史首页](docs/readme-history-before-v24.md) · [源码许可](LICENSE) · [素材许可](assets/LICENSES.md)

开发工具 `/dev/*` 只在开发构建中开放。项目由用户提出方向，Codex 协助实现、测试和文档；自动化不等于真人游玩或设备兼容性研究。

</details>
