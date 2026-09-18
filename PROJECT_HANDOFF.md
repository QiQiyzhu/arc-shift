# ARC//SHIFT 项目交接

## 2026-09-18 v2.0（当前状态，优先于以下历史记录）

星铸协议扩展为法器／圣剑／重炮开局锁定、6/9/9基础预算、四协议槽与一次航路合约。补给恢复至多25生命；夺能支付20生命并增加精英，第二场成功才赚得末关+2额度。维修35生命永久支出2额度。封闭schema v2保留真实v1配置的原内容、预算和无合约流程；试炼导出规则为2.0-contract.2。主线仍用1.2-protocol.1，碰撞、伤害、掉落和历史回放对照保留。

主视觉与透明守门人、蓄势／恢复姿态、武器后坐、重击音效、实际几何对应的冲锋／扇射／落点预警已接入。复用既有空间网格、回放、编辑器、存档、对象池、教练Worker和DeepSeek离线作者成果。详见docs/v2-design.md、docs/v2-references.md、docs/resume-v2.md与docs/qa/v2/README.md。

最终238项单元测试通过；本轮7项主流程浏览器测试和3项试炼／v2测试通过，生产构建6项检查通过。固定18局实验保留10成功、8失败，不是玩家研究。单设备三轮性能对照：250敌帧P95由30.3到30.7ms，同步绘制P95由18.6到15.8ms；不宣称整体帧率提升。独立trace的GC总耗时未改善，限制详见证据。PDF、实机MP4和原始证据ZIP在output/；公开发布回执留在D:/CodexData/ArcShiftV2/，避免为了写回发布信息改动已部署源码。

## 2026-09-11 v1.2（历史记录）

已增加 AI 战术教练：DeepSeek 作者阶段 strict 工具生成，9 条规则校验后经源码对照修订的策略；玩家端关键词检索、独立 Worker 引擎推演、三选一卡应用、营地 30 秒演练、快照失效与取消保护、结果导出/版本校验重算。15 次生成请求共 28,354 tokens，原始失败与修订记录在 `docs/qa/coach-v12/`；密钥没有落盘或进入前端。重新生成仅写 `outputs/coach/` 待审阅提案，不覆盖线上库。

按用户追加意见升级手感与融合：普通敌人近距离受剑击退更明显，剑弧/穿透弹局部停顿，敌人硬直有重触发间隔，Boss 抵抗，位移经过墙体检查。随机初始武器独立于营地演练偏好；继续行动保留原武器。取消 `fireSupports` 副武器独立齐射，以其他形态改造主攻击；新增陨星＋光矛、回旋＋冰霜的行为组合及协议试炼入口。对应遗器与说明同步调整。

规则版本 `1.2-protocol.1`，教练场景 `coach-range-2`。存档格式维持 1；旧回放原文件保留并明确拒绝，当前夹具另存 `tests/fixtures/replays/v12/`。完整实现、证据边界与讲稿见 `docs/ai-coach.md`。本机发布回执存于 `D:/CodexData/CompetitionUpgrade/arc-shift-ai-v12/`；以下 v1.1 数字与玩法是历史结果，不代表当前规则的测量。

最终验证：178 单元、6 生产浏览器检查通过。开发浏览器完整回归 42/43，旧远程输入夹具补充指定法器后补测通过，43 个不同场景均已覆盖（不是单轮 43/43）。TypeScript、lint、生产构建通过；教练导出与 CLI 重算逐项一致。原始结果、截图、性能单次样本及源码/构建哈希在 `docs/qa/coach-v12/checks.json` 及同目录；提交与线上发布以项目外工具回执为准。

## 2026-09-10 后续 v1.1 升级（优先于下文历史状态）

本任务已继续实际功能开发：角色图集接入完成；新增行动演练、真实选卡预览、敌弹池化、地形纹理缓存、HUD 按显示值刷新及清晰模式。核心行动规则未改，旧回放夹具保留。详情与原始证据见 `docs/competition-release.md`、`docs/qa/competition-v3/`。本机前后各9次短压力采样、含地形各3次；250敌P95中位数62.5→34.7ms，含地形100敌无中位数改善。一次真实DeepSeek离线审查的脱敏回执已保存，10,423输入/1,500输出token，输出截断与误报判断已记录，密钥未写入项目。

当前目录仍为 `C:\Users\yzhu\Documents\ChatGPT\New project`，没有移动其他四项目。本任务开始时的五项未提交美术改动已备份在 `D:/CodexData/CompetitionUpgrade/arc-shift-v3/`；本轮在此基础上完成，不覆盖旧成果。完整验收与发布状态以该目录新回执为准，下文9dab002与旧线上版本都是历史记录。下一步最有价值的是用当前行动演练进行真人首次试玩，记录无需提示完成率、困惑点和设备信息；不再以自动Bot替代玩家研究。

最终验收：157 单元、37 开发浏览器、5 生产浏览器检查全部通过，TypeScript/lint/生产构建通过。修复 QA 生命周期后又做九轮有效复测；250 敌三轮 P95 仍约 34.7ms，模拟均为303 ticks。`docs/qa/competition-v3/checks.json` 绑定测试时源码哈希；正式发布工具回执保留在项目外升级备份目录，避免为写入发布结果再改变已发布提交。

**以下为本次升级前的目录整理记录，保留用于追溯；其中“本轮”、待办、提交与发布状态均指此前会话，不是 v1.1 的当前状态。**

核对日期：2026-09-10，Asia/Shanghai。此前会话只整理目录和证据，未做功能开发，未请求 DeepSeek，未重新构建、部署或运行整套评测。以本文件顶部新记录及原始日志为依据；父目录 PORTFOLIO_STATUS.md 的旧计划不是当前完成证明。

## 1. 用途、目录与启动

- 浏览器动作构筑游戏；TypeScript 规则模拟、Phaser 渲染、React 界面；另含五项目作品集和决策实验室。
- 实际目录与 Git 主工作目录：`C:\Users\yzhu\Documents\ChatGPT\New project`。目标分类路径为 `C:\Users\yzhu\Documents\ChatGPT\Games\ARC-SHIFT`，本轮没有移动，因为本次活跃会话的 cwd 和桌面应用项目仍使用现目录。
- Git 元数据：现目录 `.git`，普通主仓库，`git worktree list --porcelain` 仅一个工作目录，没有附加 worktree/submodule。未来关闭所有使用现目录的会话/进程后再按 Git 状态迁移；不要重新克隆替代这个含未提交改动的目录。
- 在实际目录执行 `npm run dev`，访问 `http://127.0.0.1:5173`；`npm run build` 生成 dist，`npm start` 为 Vite preview。Node >=22.13（README 推荐24），依赖见 package.json/package-lock.json。当前已有普通 node_modules 目录；必要时再 `npm ci`，本轮不重装。
- Windows 浏览器测试默认 Edge，其他平台需 Playwright Chromium。无需数据库和模型密钥即可运行游戏。`.openai/hosting.json` 为已有 Sites 站点绑定，本轮不更改或重新发布。
- `D:\CodexData\ARCShift` 保留构建/CI归档/Temp，`D:\CodexData\Portfolio`、`Portfolio-next` 为共享交付脚本和历史记录，`D:\CodexData\CompetitionUpgrade` 为后续实验记录。`C:\Users\yzhu\Documents\ChatGPT\arc-shift-art-v02` 是非 Git 素材来源目录，保留原位。不要移动 npm/cache、模型、Unreal、SDK 或共享环境。
- 项目本身无其他四库的运行时依赖；public/portfolio 和 src/lab/data 保存导出的历史快照，并不会实时读取其源码。共享桌面手册生成器依赖各库 docs 和 RepoPilot 的 Playwright 安装；这类跨项目脚本仍需统一维护。

## 2. Git 和中断前后状态

- 分支 `codex/engineering-v2`，HEAD `9dab00284daf7087ed1505ba664306dbc486e02d`。本轮不切分支、不提交、不修改已有源文件。
- 整理前未暂存修改：`src/game/scene.ts`、`src/render/actors.ts`（Git diff 38 插入、6 删除）。未跟踪：`public/art/actors-source-v2.png`、`src/render/actor-sprites.ts`、`src/render/sprite-matte.ts`。没有暂存改动。本文件是本轮新增未跟踪文档。
- 实际未完成工作：scene 已接入 ActorSprites、素材加载和独立地形层；actors.ts 改了图像/几何回退和敌方弹体可读性；两个新渲染文件实现池化图像与 chroma matte。文件存在不代表这些改动已通过验证。
- 旧会话“开发 ARC//SHIFT 动作肉鸽游戏”（01a07ff3-caff-7611-9d32-2177b016e1c6）最新恢复尝试以 remote compact/stream disconnected 失败；读取时 idle。它最后一次检查显示的五项未提交状态与本轮开始一致。
- 进程/端口快照未发现仍运行的项目 dev server、测试、模型或 Unreal 任务；这是检查时的可观察状态，不把历史 session ID 当作仍在运行的进程。本会话正在使用本目录，故迁移延期。
- 源码和原始文件哈希基线保存在 `D:\CodexData\ProjectOrganization-20260910\before-ARC-SHIFT.json`，整理后的比对见同目录最终报告。

## 3. 已完成、失败、未知、待做

| 状态 | 文件/日志能够证明的内容 |
|---|---|
| 已完成的历史版本 | 9dab002 的游戏/决策实验室发布回执与 CI 原始 ZIP、job.log、JSON 都已保存；151 单元、4生产浏览器、9 DEV smoke、10,800 模拟 tick通过，0失败/跳过/flaky，依赖审计0。 |
| 本地历史全量 | docs/qa/engineering/decision-lab 保存151单元/34 DEV检查及阶段命令；另有最终生产4项记录。阶段 checks.json 记的是当时已有HEAD 2a3fe260，运行中源码曾脏，不能把它直接当成对最终9dab或当前未提交渲染的精确验证。 |
| 失败且保留 | docs/qa/engineering/decision-lab-first-failure 保存生产选择器/超时失败；更早 ci-m8-first-failure、ci-m8-second-failure 等记录亦保留。后续通过只适用于对应快照。 |
| 新美术工作待验证 | D:/CodexData/CompetitionUpgrade 的 menu-art/combat-art/sword-art.png 与 art-errors.json 为20:22截图记录；不能据此认证其后修改的 sprite 代码。没有找到覆盖当前五项未提交改动的完整通过记录。 |
| 本轮完成后的运行状态 | 目录审计和交接已完成，仅ARC实体迁移待做；未发现外部本地开发/测试/模型进程。 |
| 状态不明 | 现有渲染改动的类型检查、浏览器效果、性能和无素材回退；本轮未运行。线上当前状态未联网重查，只能确认20:02落盘发布回执。 |
| 待做 | 当前渲染改动的小范围验证、实体手柄/跨JS引擎/多设备FPS等未验证边界；不要将旧产品计划记为完成。 |

## 4. 验证入口与结果绑定

- 本轮已执行且通过的轻量只读证据校验：`node scripts/verify-portfolio-evidence.mjs`，只校验已有 JSON 数值/哈希，不发模型请求。该命令可校验19点批次的13个项目请求（另1个连通探针），不能自动涵盖随后 OpsPilot 的新批次。
- 下轮用于现有改动：`npm run typecheck`、`npm run lint`；需要时 `npm test`，然后限定的浏览器视觉/回退检查。完整 `npm run test:e2e`、生产 `npx playwright test --config playwright.production.config.ts`、`npm run test:soak -- --long` 是历史复现入口，本轮没有执行，不应作为整理的默认步骤。
- 精确已提交源码验证：`D:\CodexData\Portfolio-next\arc-ci-34473344997\verification-summary.json` 绑定9dab002、run34473344997、Node v24.20.0、Linux、Chromium、1worker、fullSuite=false。同目录 `verification.zip`、`job.log`、`artifact/outputs/qa/` 是原始结果，ZIP SHA-256 `877d48233160ef1676d686deb21b97c764ddea5b91a9bc52fd7aaec4b75d3aea`。
- 配置对应 `.github/workflows/ci.yml`、playwright.config.ts、playwright.production.config.ts、vitest.config.ts、scripts/check-stage.mjs；本地完整与CI smoke数目不同，不混称同一次全量测试。
- `D:\CodexData\ARCShift\decision-lab-delivery-receipt.json` 记录历史20:02发布完成；`D:\CodexData\Portfolio-next\upgrade-live-verification.json` 为当时59资源匿名校验。归档 `D:\CodexData\ARCShift\arc-shift-decision-lab.tar.gz` SHA-256 `f26a5b722cb0739dccd7a73decf2a9bdbe20427a689f443dd24f222ad827c8c8`；这些不包含当前未提交美术改动。
- 桌面手册和站点快照绑定当时RepoPilot 1b20917、OpsPilot 9e905e7、DesignLens 7c1f085；目前三个工具库已有更晚提交，旧展示不是最新交接。

## 5. DeepSeek 已有记录与复用

ARC游戏和Aegis本地核心未找到直接模型调用记录。ARC只是展示其他项目历史回执：`public/portfolio/cases/real-models.json` 及 repopilot-deepseek-task.json / opspilot-deepseek-smoke.json / designlens-deepseek-smoke.json。原始本机对应文件在 `D:\CodexData\Portfolio-next`；连通探针在 repopilot-deepseek-smoke.json。19点批次连同探针共14请求，12,287输入/696输出token，账单费用未知。这是历史批次，不能当作截至中断的全部调用总数；OpsPilot后续48请求见其独立交接。

复用条件：保留模型名、prompt/数据集、源码/配置版本、token、响应和回执哈希；只重新读取/核验已有结果。公开脱敏回执不等于完整HTTP请求抓包，也不是独立模型能力基准。没有找到的字段必须标为未知，不能反推或补写原响应。本轮没有新调用，没有使用或抄录任何密钥。

## 6. 下一轮最值得做的一项任务

完成并验证已经落盘的角色图像渲染改动，不增加新玩法。验收：现有五项改动保持可追踪；typecheck/lint通过；固定场景下截图证明玩家、敌人、弹体、预警/碰撞中心清楚；验证图集不可用时几何回退、暂停/重开后的精灵池清理、reducedMotion；记录该未提交源码文件哈希和实际命令结果。失败则保留日志并修正，不拿9dab旧CI代替新验证，不需要DeepSeek。

## 本轮目录整理结果

- 整理完成记录时间：2026-09-10T22:30:09.441410+08:00。适用祖先和主项目范围未发现 AGENTS.md；已读项目说明。仅第三方缓存内局部 AGENTS 不适用于本次主库文档。
- 当前继续选择 `C:\Users\yzhu\Documents\ChatGPT\New project`。本会话仍在使用它，故目标 Games/ARC-SHIFT 的实体迁移未执行；不要同时把旧项目和未来目录当作两份可并行修改的源码。
- 迁移前后5个主库共2,816个源码/配置/原始结果文件逐字节哈希一致；包含历史夹具的41个Git元数据目录内容一致；无附加registered worktree，分支/提交/原有status均未变。package/cache目录未逐文件哈希，完整原目录重命名保留，未重装或删除。详细基线、排除范围、junction和比对见 `D:\CodexData\ProjectOrganization-20260910\migration-verification.json`。
- 本轮最终新增未跟踪文件为 PROJECT_HANDOFF.md；没有暂存、提交、push、reset、clean或功能源码更改。ARC原五项未提交改动另行完整保留。最终状态见 `D:\CodexData\ProjectOrganization-20260910\final-git-status.json`。
- 旧长会话“开发 ARC//SHIFT 动作肉鸽游戏”已核对为idle、最近恢复turn失败；移动前的进程/端口核验未发现项目构建、测试、数据库、模型评测任务。参与本轮审计的子任务在移动前已停止读取主库。进程可见性有时点限制，恢复开发前仍应检查占用；本轮没有终止用户进程。
- 父目录三个共享手册脚本已备份并只更新项目/Playwright路径；语法检查通过。未重新生成桌面手册、旧公开JSON或网站，历史状态/哈希/命令路径原样保留。D盘历史脚本、venv editable、UE/CMake缓存通过旧路径兼容入口继续可定位，不要批量改写历史结果或删除这些入口。
- 解释器核验只做模块位置查找，没有导入应用、启动服务或调用模型；结果见 `D:\CodexData\ProjectOrganization-20260910\path-check-results.json`。本轮未执行完整构建/测试/昂贵评测，未发起新的DeepSeek请求。
