# 双界 · v2.5 美术策划展示页

独立入口：`/art-direction/index.html`。源码位于 `public/art-direction/`，无新增依赖、网络字体或外部脚本。页面以两个游戏的实际画面说明视觉决策，并提供交互对照与可核对的证据。

## 视觉结构

ARC 使用暗石、铜金、象牙白和浅青，强调铭刻、仪式与符文；阅读顺序为角色与危险、目标、技能与构筑。Aegis 使用深蓝战术终端、方向线与切角模块；目标先于仪表，玩家、队友、威胁和档案同时使用颜色与形状提示。

页面依次组织为深墨序章、纸色 ARC 章节、深蓝 Aegis 章节、交互节奏研究、约束与验证记录。布局采用大幅实机图、边注和连续叙事，避免重复卡片网格。

## 实机对照与来源

| 页面资产 | 原始来源 | 条件与边界 |
| --- | --- | --- |
| `assets/arc-menu-before.png` | `work/v25-ui/before/menu-zh.png` | 基线 2351b164；1366×768、中文、全新浏览器会话、公开菜单输入；只读开发就绪检查。 |
| `assets/arc-menu-after.png` | `work/v25-ui/after-final/menu-zh.png` | 同样的尺寸、语言与入口条件；沿用原画，仅比较 v2.5 界面、字阶与程序铭刻。 |
| `assets/arc-combat-before.png` | `work/v25-vfx/baseline-fixture/normal.png` | 1280×720、种子 73129、玩家 435/450、场景时刻 12 秒、效果年龄 50 毫秒。 |
| `assets/arc-combat-after.png` | `work/v25-vfx/after-fixture/normal.png` | 相同镜头、对象与危险区域；DEV 视觉夹具冻结模拟并手动发出既有效果事件。 |
| `assets/arc-combat-reduced.png` | `work/v25-vfx/after-fixture/reduced.png` | 同一夹具，同时开启 reducedMotion 与 focusedEffects；保留危险边界，减少装饰。 |
| `assets/arc-practice.webm` | `work/v25-vfx/after-weapons-take3/b1be1ad7de1c6f6b0762de1d0112aad1.webm` | 公开 UI 与脚本键鼠输入、内置无敌练习模式、只读开发状态检查；非普通难度通关或真人试玩。 |
| `assets/arc-practice-poster.png` | 同录制目录 `weapon-cannon.png` | 实际练习录制的静帧。 |
| `assets/aegis-briefing-before.png` | Aegis `Reports/art-v25-20261007/before-release-flow/briefing.png` | 基线 6784c59；1600×900、Editor 游戏模式、D3D11 离屏原生渲染、自动菜单操作。 |
| `assets/aegis-briefing-after.png` | Aegis `Reports/art-v25-20261007/approved-art-1600/briefing.png` | 最终字体版本；与基线同尺寸、语言和简报条件，改用实际任务节点的程序地图。 |
| `assets/aegis-charge-input.png` | 同 approved-art-1600 目录 `charge-impact.png` | AI 为美术观察冻结；模拟按键实际触发蓄力与释放，沿用真实扣费逻辑；非自然战斗。 |

三组对照只有在前后图片成功加载、原始尺寸一致时才启用，不通过拉伸图像制造同条件印象。支持鼠标拖动、原生 range 方向键/Home/End，以及更新前、并排对照、更新后三个按钮。图片失败时保留基线与状态说明。

[图像与数据收据](../public/art-direction/assets/provenance.json) 记录 11 个媒体/数据文件的 SHA-256、尺寸、原始来源和适用范围。实际截图直接复制，未重绘或修饰。新增验证 JSON 单独列出，不与媒体哈希混淆。

战斗固定状态截图只证明表现差异，不证明普通玩家手感或性能。录像录制过程为 58.145 秒，WebM 媒体时长为 57.8 秒、1920×1080；音频单独记录，未混入页面视频。底层录制工具的旧 schema 标识为 2.3，真实源码记录与本轮画面属于 v2.5，详情见 [战斗表现文档](v25-combat-visuals.md)。

## 动效研究与运行成本

交互 SVG 演示说明“蓄势 → 重音 → 消散”，明确标注非游戏录像。单次示意播放 1.8 秒，不代表实际技能时长、伤害范围或性能指标。默认不自动播放；静态模式每次点击切换一拍。系统 prefers-reduced-motion 默认启用静态模式。

此页不读取存档。图片按章节接近视口时加载；视频采用 preload=none、静音原生控件，仅在用户播放时请求媒体。示意动画结束、页面隐藏或离开时停止；视频在页面隐藏/离开时暂停。无脚本时保留文字、基线原图和原生视频，并明确说明交互需要脚本。

ARC 局部压力测量来自 [原始数据](../public/art-direction/assets/arc-performance.json)：本机无头 Edge、Intel UHD、1440×900、种子 73129、100 个高生命值敌人，三个独立模式依次各采样约 10 秒。

| 模式 | rAF 帧间隔 p95 | 表现 CPU 提交耗时 p95 | 粒子峰值 | 纹章峰值 |
| --- | ---: | ---: | ---: | ---: |
| 标准 | 13.9 ms | 1.7 ms | 360 | 34 |
| 仅专注特效 | 7.1 ms | 1.5 ms | 72 | 10 |
| 仅减少动态 | 14.1 ms | 1.7 ms | 72 | 10 |

三组弹道池未命中均为零。环境没有严格隔离，其他任务可能同时运行；这不是升级前后性能实验，也不用于承诺跨设备帧率或所有精简模式都会更快。固定截图 capture.json 的单帧诊断值没有当作性能测量。

## 已完成验证

展示页在 Microsoft Edge 无头浏览器下完成以下检查，完整结果见 [页面验证 JSON](../public/art-direction/assets/page-verification.json)，截图保留于 `work/v25-art-page/final/`。

- 1366×768、1600×900、390×844：三个尺寸均无横向溢出、浏览器异常或失败资源。主视觉、Aegis 章节、交互示意与证据表已视觉复查。
- 每个尺寸分别检查 ARC 菜单、ARC 战斗、Aegis 简报：原始图像尺寸相等；Home/End 到 0/100；按钮回到 50；鼠标拖动到约 25%。
- 新版 ARC 战斗图可切换标准/减少动态与专注特效，选择态和原图链接随之更新。
- 示意风格与阶段切换、单次播放、播放中暂停均通过；系统减少动态默认静态分步。
- 无 JavaScript 时静态内容可读；模拟更新后图片请求失败时，保留基线，滑块不启用。
- 首屏 WebM 请求数为零；实际播放成功，浏览器读取媒体时长 57.8 秒，静音属性生效。
- JavaScript 语法检查、页面脚本 lint、diff 空白检查通过。

游戏验证与页面验证分开展示：ARC 本轮 284 单元测试、17 个 UI 场景通过；Aegis 在 1600×900 和 1280×720 分别通过 21 项原生美术/发布流程断言，并另行完成 [9 项真实 Windows Shipping 窗口流程复核](https://github.com/QiQiyzhu/aegis-arena/blob/c0f79e8c592c18be0ec6315a63de4afd6c7311e3/evidence/art-v2.5/shipping-ui-smoke.json)。Editor 夹具、脚本输入实录与 Shipping 窗口检查各有不同范围，不称作真人试玩。

历史云端成绩也保留独立标签：ARC 基线 2351b164 的 [run 37639313317](https://github.com/QiQiyzhu/arc-shift/actions/runs/37639313317) 为 279 单元、11 正式版浏览器、15 冒烟测试；Aegis 基线 6784c59 的 [run 37635989519](https://github.com/QiQiyzhu/aegis-arena/actions/runs/37635989519) 为便携检查。它们没有被改写成本轮 v2.5 云端结果。

## 制作方法与署名

用户提出方向、审美选择与反馈；AI 工具协助方案、实现、测试和文档。页面说明实际产出与设计决策，不代填个人独立开发经历或工时。

ARC 沿用的 AI 辅助场景/主视觉来源见 [v2.3 原画记录](v23-art.md)。本轮 UI、特效、标记和本页图形由代码绘制。Aegis 本轮简报改为程序任务图，场景/角色采用项目几何、材质与代码；旧简报的 AI 辅助插画来源在其 `Art/v23/README.md` 明示。实机截图、概念插画、示意图、受控夹具与自然输入录像始终分别标注。
