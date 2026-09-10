# ARC//SHIFT · 工程作品提交与演示

**[公开五项目入口](https://arc-shift.black-kid-3047.chatgpt.site/portfolio/) · [在线游戏](https://arc-shift.black-kid-3047.chatgpt.site/) · [完整 A–T 手册](interview-dossier.md) · [验收与失败记录](qa-report.md)**

本轮交付在已有 v1.0 游戏上增加了 Uniform Grid、同版本 QA replay、参数工作台、调试器、存档与长模拟回归、标准手柄动作层。核心讲解应围绕一个实际问题、对应源码和原始验证展开。公开游戏不暴露 DEV 干预工具；内容编辑/回放/调试从本机开发服务器演示。公开入口另提供真实工具截图与其他项目的实际媒体。

## 给技术面试官的三分钟工程路径

1. **看运行（30 秒）**：在线打开三重共鸣试炼，展示圣剑、法器与炮弹共享元素载荷；这是真实游戏路径，试炼不覆盖正式存档。
2. **看因果（60 秒）**：打开 [Grid 对照](performance-v2.md)，解释为何首版更慢、如何保持原命中顺序，以及为何 Node 改善没有转化成一致 FPS 增益。
3. **看工具（45 秒）**：本机 `/dev/content-editor` 修改一个已有数值，验证失败时禁止应用，应用后在真实 Engine 沙盒查看结果；或演示回放导入与单步。
4. **看验证（45 秒）**：打开 [146 unit / 34 browser / 1 production 的 M7 记录](qa-report.md)，展示一项失败及修复后回归，说明 API 手柄夹具与实体设备的区别。

## 本轮修改与阅读清单

| 变化 | 核心入口 |
|---|---|
| 稳定顺序的空间候选查询 | [spatial-grid](../src/core/spatial-grid.ts)、[separation](../src/combat/separation.ts)、[projectiles](../src/combat/projectiles.ts) |
| 固定步与有序决策回放 | [Replay](../src/replay/replay.ts)、[Engine](../src/game/engine.ts)、[Viewer](../src/dev/DevApp.tsx) |
| 内容校验与沙盒 | [schema](../src/content/schema.ts)、[ContentEditor](../src/dev/ContentEditor.tsx)、[消费者说明](content-pipeline.md) |
| 单步调试与状态观察 | [DebugSession](../src/dev/debug-session.ts)、[Debugger](../src/dev/Debugger.tsx) |
| 输入、焦点与设备生命周期 | [ActionInput](../src/input/actions.ts)、[bindings](../src/input/bindings.ts)、[Scene](../src/game/scene.ts) |
| 回归与安全边界 | [Save](../src/core/save.ts)、[测试树](../tests)、[CI](../.github/workflows/ci.yml)、[依赖审计](dependency-security.md) |

完整变更文件可按历史基点查看 [工程分支对照](https://github.com/QiQiyzhu/arc-shift/compare/b17f4c24cf95a02d3197ec493026b6f23c8f2c3e...codex/engineering-v2)。[A–T 手册](interview-dossier.md) 的 P/Q/R/S/T 节分别提供必须读懂的十个核心文件、五个 UI 文件、十段实际源码、二十个追问与五条严格基于结果的简历候选；[17 个指定追问](interview-v2.md) 可用于专项练习。

新增验证覆盖 5 项空间对照、17 项回放、9 项内容、4 项调试、8 项稳定性/存档、10 项输入，以及实际浏览器场景；另有音频基线回归。不同层级不相加成一个测试数，完整通过数以验收报告为准。未完成的硬件、真人研究和长期浏览器性能问题在 A–T 的 O 节明确保留。

下面保留游戏本身的提交简介与玩法演示路径。

**在线试玩：** https://arc-shift.black-kid-3047.chatgpt.site/

**源代码：** https://github.com/QiQiyzhu/arc-shift

**版本：** v1.0「钟声尽头」

**类型：** 桌面键鼠、俯视角动作 Roguelite、原创世界观。

## 可放在作品集中的简述

ARC//SHIFT 是一个将近战圣剑、弹幕法器与范围重炮混搭的网页动作 Roguelite。玩家在十二层路线图中规划战斗、工坊、商店与特殊遭遇，通过元素协议和遗器改变攻击行为；四种 Boss、三种场景、陷阱、局内经济及碎片解锁构成完整循环。工程上采用 TypeScript 规则层、Phaser 渲染、React 界面和 Web Audio 配乐，包含自动规则检查、浏览器交互验收与可复现的整局模拟。

项目大量使用 AI 辅助开发，提交时应说明自己实际完成的设计决策、修改、测试和理解范围，不应将自动生成的代码或模拟记录描述成独立手写或真人测试经历。详细过程见 [开发记录](ai-development-log.md)。

## 面试现场的三分钟演示

1. 打开试玩，进入 **营地与图鉴 → 协议试炼**，开启 **三重共鸣**，选择“三相炼星”或“折光星群”。按住左键攻击，使用 Space、Q、E，说明武装、轨迹与元素同时生效。试炼不改变正式存档。
2. 退出试炼，开始正式行动。展示初始协议与移动、Dash；清除第一层后展示完整路线。第二层选择工坊，免费熔接第二件武装，说明为什么下一站的资源与构筑机会会影响路线选择。
3. 打开代码，讲清楚一个实际机制，例如副武装冷却、剑弧与障碍遮挡、次生弹不递归、事件选择与检查点同时保存。再展示测试和性能记录，并明确它们衡量什么。

演示机器建议使用桌面 Chrome 或 Edge、键鼠和声音输出。音乐需首次点击后启动。移动端可查看菜单和图鉴，尚无触屏战斗控制。首次访问不需要注册。

## 可展开讲的工程点

| 主题 | 实现入口 | 可展示的证据 |
| --- | --- | --- |
| 固定步长与表现解耦 | `src/game/engine.ts`、`scene.ts` | 规则可独立运行；输入和帧率采样 |
| 武装与协议组合 | `src/combat/weapons.ts`、`projectiles.ts` | 主副冷却、连段、弹片代数上限与对象池 |
| 分支路线 | `src/rooms/expedition.ts` | 种子复现、合法边、三处核心汇合与路径校验 |
| 场景交互 | `src/rooms/terrain.ts`、`src/render/terrain.ts` | 共用障碍数据，移动子步和弹体扫掠 |
| 经营与成长 | `src/game/engine.ts`、`src/core/save.ts` | 一次性选择、库存、解锁门槛、续玩一致性 |
| Boss AI 与音乐 | `src/ai/enemy-ai.ts`、`src/audio/profiles.ts` | 状态机预警、阶段清弹、主题和节奏变化 |
| 性能与生命周期 | `src/core/pool.ts`、`src/effects`、`src/audio/synth.ts` | 对象池、反应预算、声部上限、订阅清理 |

## 直接发送的文字

> 这是我的游戏作品 ARC//SHIFT v1.0：一个可以在浏览器直接试玩的原创动作 Roguelite，包含圣剑／弹幕／重炮混搭、路线规划、Boss、局内经济和局外解锁。作品由 AI 辅助开发，我会在交流时具体说明自己的参与、理解与修改内容。建议使用桌面键鼠体验，也可以先进入“营地与图鉴 → 协议试炼”快速查看组合效果。
>
> 在线试玩：https://arc-shift.black-kid-3047.chatgpt.site/
>
> 代码与文档：https://github.com/QiQiyzhu/arc-shift
