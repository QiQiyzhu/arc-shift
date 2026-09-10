# ARC//SHIFT · Engineering v2 交付报告

> 交付日期：2026-09-10。M8 本地完整验收为 **146 单元 / 34 开发浏览器 / 2 生产浏览器**，均无失败或跳过；typecheck、lint、build 通过。源码、远端 CI 与公开部署状态以 [验收记录](qa-report.md) 为准。

## A. 修改文件清单

本轮在已有游戏上迭代，没有重写项目。已用 `git diff --name-status b17f4c24cf95a02d3197ec493026b6f23c8f2c3e HEAD` 核对改动；初次审读时 HEAD 为 M7 提交 `cd4ca2cc8cf59a0ff9f045b97635e1d5dd34fc46`。完整逐文件变化见 [基线 → codex/engineering-v2 对比](https://github.com/QiQiyzhu/arc-shift/compare/b17f4c24cf95a02d3197ec493026b6f23c8f2c3e...codex%2Fengineering-v2)。分支链接会随后续提交更新，最终发布应同时记录确定的源码 SHA。

| 工程模块 | 新增/修改的关键文件 | 实际变化 |
|---|---|---|
| 核心与碰撞 | [engine.ts](../src/game/engine.ts)、[world.ts](../src/game/world.ts)、[spatial-grid.ts](../src/core/spatial-grid.ts)、[metrics.ts](../src/core/metrics.ts)、[separation.ts](../src/combat/separation.ts)、[projectiles.ts](../src/combat/projectiles.ts)、[damage.ts](../src/combat/damage.ts)、[weapons.ts](../src/combat/weapons.ts)、[enemy-ai.ts](../src/ai/enemy-ai.ts) | 查询计数、Uniform Grid、稳定配对/命中顺序、击退后的索引维护与参数消费 |
| QA 回放 | [replay-contract.ts](../src/core/replay-contract.ts)、[replay.ts](../src/replay/replay.ts)、[DevApp.tsx](../src/dev/DevApp.tsx)、[files.ts](../src/dev/files.ts) | 固定步输入与有序决策记录、版本/资源校验、checksum、导入导出与停播诊断 |
| 内容与开发调试 | [schema.ts](../src/content/schema.ts)、[cards/system.ts](../src/cards/system.ts)、[ContentEditor.tsx](../src/dev/ContentEditor.tsx)、[Debugger.tsx](../src/dev/Debugger.tsx)、[debug-session.ts](../src/dev/debug-session.ts)、[debug-draw.ts](../src/dev/debug-draw.ts)、[ArenaCanvas.tsx](../src/dev/ArenaCanvas.tsx)、[benchmark.ts](../src/dev/benchmark.ts)、[dev.css](../src/dev/dev.css) | 封闭数值配置、diff、隔离沙盒；单步、调速、FSM/池/网格与命中框观察 |
| 输入与表现集成 | [actions.ts](../src/input/actions.ts)、[bindings.ts](../src/input/bindings.ts)、[scene.ts](../src/game/scene.ts)、[InputSettings.tsx](../src/ui/InputSettings.tsx)、[GameApp.tsx](../src/ui/GameApp.tsx)、[EconomyPanels.tsx](../src/ui/EconomyPanels.tsx)、[ProtocolPanels.tsx](../src/ui/ProtocolPanels.tsx)、[SettingsPanel.tsx](../src/ui/SettingsPanel.tsx)、[globals.css](../app/globals.css)、[main.tsx](../src/main.tsx) | 动作边沿锁存、标准手柄适配、失焦/重连生命周期、动态提示、奖励区域滚动与 DEV 入口隔离 |
| 持久化与音频 | [save.ts](../src/core/save.ts)、[synth.ts](../src/audio/synth.ts) | 损坏 checkpoint/未知 legacy Boss 过滤；挂起音频上下文的即时静音与释放边界 |
| 测试和可复现脚本 | [tests](../tests)、[回放 fixtures](../tests/fixtures/replays)、[e2e](../e2e)、[生产隔离用例](../e2e-production/isolation.spec.ts)、[scripts](../scripts) | 核心对照、历史 fixture、实际页面回归、benchmark/soak/bundle 与阶段日志 |
| CI、依赖和证据 | [ci.yml](../.github/workflows/ci.yml)、[生产测试配置](../playwright.production.config.ts)、[package.json](../package.json)、[锁文件](../package-lock.json)、[原始报告](qa/engineering) | Linux smoke/full 分层、原始产物上传、审计修复、环境与源码追踪 |

M8 交付另含 [工程案例](engineering-case-study.md)、[内容管线](content-pipeline.md)、[A–T 手册](interview-dossier.md)、[面试提纲](interview-v2.md)、[作品说明](portfolio.md)、[验收记录](qa-report.md)、[公开作品入口源码](../public/portfolio)、[portfolio 生产用例](../e2e-production/portfolio.spec.ts) 及 README/架构说明更新。它们的生产浏览器检查已实际通过；远端验收另行记录。

## B. 架构变化说明

延续原有纯 TypeScript Engine/World、Phaser 表现和 React UI 分工，增加四个可检验边界：

1. **候选查询与最终判定分离**：Grid 只减少候选，原线段圆碰撞仍决定命中；候选保持原数组顺序，击退与跨格分离即时更新，保留 brute 作为对照。
2. **模拟执行与记录分离**：Engine 在实际固定步和合法命令边界提供观察点；Replay 记录输入、命令结果与周期状态指纹。它是同代码/内容/运行时行为范围内的 QA 回放，不是联网 lockstep。
3. **配置所有权明确**：ContentPack 经完整校验、规范排序、复制冻结后注入 Engine。工作台能改已有目录的数值与受支持前置条件；行为、新 ID、反应逻辑仍由代码定义。DEV 工具使用独立 Engine 和禁持久化存档。
4. **设备输入统一为动作**：键鼠与标准 Gamepad API 汇入同一 Input；短按等待实际 tick 消费，追帧不重复技能。失焦/恢复与重连先重建手柄 levels，避免把旧按住状态当新动作，同时保留真实键盘边沿。

仍然没有后端数据库、服务器权威、RAG、线上 LLM Agent 或完整 ECS；可选 WebMCP 仅提供状态读取、暂停/恢复和选择当前奖励三项工具，其中后两项修改状态。详见 [架构](architecture.md)、[回放](replay.md)、[内容编辑器](content-editor.md)、[输入](input.md)。

## C. 新增测试说明与实际结果

新增单元文件及其在 M7 真实报告中的用例数：

| 测试文件 | 数量 | 保护的行为 |
|---|---:|---|
| [audio-lifecycle](../tests/audio-lifecycle.test.ts) | 1 | AudioContext 挂起、静音与重建 |
| [spatial-grid](../tests/spatial-grid.test.ts) | 5 | 负坐标/大圆、跨格、稳定顺序、高速穿透/分裂/击退和 brute 等价 |
| [replay](../tests/replay.test.ts) | 17 | 输入/命令顺序、状态范围、导入边界、版本与失同步 |
| [content](../tests/content.test.ts) | 9 | 500 组旧默认等价、真实数值消费者、引用环、隔离与回放兼容边界 |
| [debug-session](../tests/debug-session.test.ts) | 4 | 单步/调速、边沿消费、只读指标与干预范围 |
| [save-compatibility](../tests/save-compatibility.test.ts) | 4 | 旧存档、损坏 checkpoint、合法进度保留 |
| [stability](../tests/stability.test.ts) | 4 | 随机种子、提交回放和模拟不变量 |
| [input](../tests/input.test.ts) | 10 | 重绑、锁存、标准轴/按钮、失焦首帧与断连重连 |

浏览器侧新增压力场景、回放、编辑器、调试器、奖励布局、输入流程及生产隔离用例；已有战斗/经济/音频流程补充边界验证。手柄通过受控 `navigator.getGamepads` 快照驱动真实页面，**未用实体手柄实测**。固定 seed Bot、训练模拟和 API fixture 不等同于真人游玩。

| 验收范围 | 已确认实际结果 | 证据 |
|---|---|---|
| M7 完整本地 | **146 单元 / 34 开发浏览器 / 另行 1 生产浏览器通过**；typecheck/lint/build 通过；audit 0 | [阶段检查](qa/engineering/m7-input-verified/checks.json)、[unit](qa/engineering/m7-input-verified/unit.json)、[开发浏览器](qa/engineering/m7-input-verified/browser.json)、[生产浏览器](qa/engineering/m7-input-verified/production-browser.json)、[audit](qa/engineering/audit-m7.json) |
| M7 精确提交 Linux **smoke** | 146 单元、9 开发 smoke、1 生产浏览器通过；0 skipped/flaky；audit 0 | [run 34452226005](https://github.com/QiQiyzhu/arc-shift/actions/runs/34452226005)、[环境](qa/engineering/ci-m7-success/environment.json)、[原始证据](qa/engineering/ci-m7-success) |
| M8 最终本地完整验收 | **146 单元 / 34 开发浏览器 / 2 生产浏览器通过**，无失败/跳过/flaky；五项 gate 通过 | [阶段](qa/engineering/m8-delivery/checks.json)、[unit](qa/engineering/m8-delivery/unit.json)、[开发](qa/engineering/m8-delivery/browser.json)、[生产](qa/engineering/m8-delivery/production-browser.json) |
| M8 Linux full suite 与生产交付 | 精确源码全量 146 单元 / 34 开发 / 2 生产通过，audit 0，六种子长模拟通过 | [最终 CI 与发布记录](qa-report.md)；不以 M7 的 9 项 smoke 代替全量 |

M7 本地报告记录提交前父提交 `5cf8270` 加工作区，随后完整实现提交为 `cd4ca2cc…`；Linux smoke 在该精确提交、干净工作区运行，Node v24.20.0、Linux AMD EPYC 7763、Playwright Chromium、1 worker。首个 Linux 失败 [run 34447501573](https://github.com/QiQiyzhu/arc-shift/actions/runs/34447501573) 与 [原始报告](qa/engineering/ci-first-failure) 保留，没有用成功运行覆盖失败历史。

## D. 实际 benchmark 结果

M2 Node 对照使用 seed 73129、300 tick 预热、1,500 tick 测量，真实敌人逻辑与混合武器，高 HP 维持负载；测量来自当时 Windows 主机，并非所有设备性能保证。[完整方法](performance-v2.md)、[原始汇总](qa/engineering/spatial-comparison.json)。

| 敌人数 | 分离测试下降 | 弹体测试下降 | Engine P50 ms 前→后 | Engine P95 ms 前→后 | Engine P99 ms 前→后 |
|---:|---:|---:|---:|---:|---:|
| 28 | 90.45% | 96.71% | 0.0771 → 0.0567 | 0.1753 → 0.1188 | 0.4443 → 0.2371 |
| 100 | 90.52% | 97.12% | 0.3170 → 0.2161 | 0.6229 → 0.3609 | 0.8468 → 0.5404 |
| 250 | 92.53% | 97.68% | 0.9820 → 0.7757 | **1.8786 → 1.0712** | 2.3040 → 1.2339 |

三个场景的最终敌人位置/HP、伤害和 RNG 对照一致；弹体峰值 145/207/376，pool misses 为 0。首版 Grid 在 250 敌人时 P95 反而增至 **4.135ms**，后通过缓存占据格子边界、减少重复维护与排序改善；[失败数据](qa/engineering/engine-spatial-first.json) 保留。

**实际浏览器没有一致 FPS 收益**。同轮 Edge 152、1440×900、每场景十秒样本中，28/100/250 敌人的 FPS 分别为 **61.04→50.64、33.79→32.66、21.55→23.12**；250 敌人的 P95 帧时间还从 76.4ms 增至 83.3ms。不能据 Node 指标声称稳定 60 FPS；浏览器慢帧受 50ms delta 截断，也不适合作为等量 tick 的 query 对照。[浏览器前后表与原始入口](performance-v2.md#actual-browser-sample-no-consistent-fps-gain)。

稳定性负载另行记录：[本地六种子长模拟](qa/engineering/soak-long.json) 完成 **6×108,000＝648,000 tick**，合计模拟三小时，但每组墙钟约 6.04–15.48 秒；无渲染、无音频、训练玩家不死，零池 miss 不等于浏览器三小时无泄漏。M7 Linux 运行的是 [smoke soak](qa/engineering/ci-m7-success/soak.json)：**3×3,600 tick，合计模拟 180 秒，零池 miss**。两者不能混称同一项测试。

M7 Linux [bundle](qa/engineering/ci-m7-success/bundle.json) 为磁盘文件 3,082,730 bytes，其中 JS 1,672,347 bytes；不是网络传输体积。M8 增加按需访问的手册与录屏，完整产物体积见 [bundle 报告](qa/engineering/bundle.json)，不与纯游戏包直接混比。

## E. 仍未解决的问题

| 问题 | 当前边界 |
|---|---|
| 跨设备渲染性能 | 尚无一致 FPS 提升；需要隔离负载、多次采样与绘制/GPU/调度拆解 |
| 实体手柄与菜单导航 | 实体 USB/Bluetooth 未测；菜单/路线/奖励仍主要使用鼠标键盘 |
| 跨平台确定性与自定义配置回放 | 回放限制在相同代码/内置内容及运行时行为范围；custom ContentPack 显式拒绝，不承诺 lockstep |
| 墙钟级浏览器稳定性 | 没有三小时浏览器/音频/GPU 泄漏验证；当前是 headless 模拟与局部生命周期回归 |
| 真人可读性与平衡 | 尚无可以支持用户效果结论的实测研究；不能补造留存、胜率或商业收益 |

测试失败依据实际输出、trace、环境和源码定位；只读提出的风险不算作已经发生的失败。当前交付状态统一由 [验收记录](qa-report.md) 更新。

## F. 可写进简历的 5 条真实项目描述

**仅在本人读懂关键代码、亲自复现对应证据，并能说明实际承担范围后采用；AI-assisted 分工必须保留。**

1. **AI-assisted 迭代 TypeScript/Phaser 动作构筑客户端**，维护独立于表现框架的固定步核心与有序命令边界，M8 完整本地通过 146 项单元、34 项开发浏览器及另行 2 项生产浏览器验证。[阶段证据](qa/engineering/m8-delivery/checks.json)。
2. **AI-assisted 实现 Uniform Grid 并保留 brute oracle**，250 敌人固定夹具中分离/弹体测试下降 92.53%/97.68%，Engine P95 从 1.8786ms 降至 1.0712ms；浏览器帧率未呈现一致提升。[原始对照](qa/engineering/spatial-comparison.json)。
3. **AI-assisted 构建同版本 QA 回放工具**，记录实际固定步输入、有序命令和返回结果，实现版本/资源校验、核心状态指纹与失同步停播，提交战斗/Boss/商店路线三份 fixture。[回放设计](replay.md)。
4. **AI-assisted 建立封闭参数内容工作台及隔离沙盒**，支持数值校验、引用检查、diff 和 JSON 往返，以 500 组历史构筑哈希验证默认提取等价；行为仍由代码定义。[内容管线](content-editor.md)。
5. **AI-assisted 建立调试与稳定性证据链**，支持单步、FSM/网格/对象池观察，完成六种子合计 648,000 tick 的 headless 模拟且零池 miss，并保留失败报告；不将模拟时长描述为真人或浏览器墙钟时长。[调试器](debugger.md)、[长模拟](qa/engineering/soak-long.json)。

## G. 面试前必须读懂的 10 个关键源码文件

| # | 文件 | 必须能解释的核心问题 |
|---:|---|---|
| 1 | [game/engine.ts](../src/game/engine.ts) | 固定步观察点、系统执行顺序、阶段/暂停、合法命令和一次结算 |
| 2 | [game/world.ts](../src/game/world.ts) | 运行态所有权、RNG、实体 ID、池槽、内容依赖与 spawn |
| 3 | [game/scene.ts](../src/game/scene.ts) | 渲染 delta 与模拟 tick、失焦与恢复、输入边沿、Phaser 生命周期 |
| 4 | [input/actions.ts](../src/input/actions.ts) | held/edge 分离、手柄基线重建、断连与键盘队列独立性 |
| 5 | [core/spatial-grid.ts](../src/core/spatial-grid.ts) | 多格覆盖、稳定候选顺序、跨格更新及维护开销 |
| 6 | [combat/projectiles.ts](../src/combat/projectiles.ts) | 扫掠窄相、击退维护、派生弹体、穿透顺序与池复用 |
| 7 | [combat/damage.ts](../src/combat/damage.ts) | HP/护盾、暴击 RNG、反应预算、proc 限制与死亡 guard |
| 8 | [replay/replay.ts](../src/replay/replay.ts) | 初始条件、事件全序、状态范围、导入约束和 checksum 局限 |
| 9 | [content/schema.ts](../src/content/schema.ts) | 封闭校验、前置引用环、规范排序、深冻结与实际参数消费者 |
| 10 | [core/save.ts](../src/core/save.ts) | version 1 兼容、规范路线验证、损坏 checkpoint 丢弃与存储失败 |

按“一次开火 → 命中 → 结算 → 回放 → 对照测试”的顺序连读；详细源码节选、二十个追问与分工说明见 [A–T 面试手册](interview-dossier.md)。
