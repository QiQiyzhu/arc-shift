# 验收与打磨记录

## Engineering M8 · 本地与 Linux 完整交付验收（2026-09-10）

完整五项检查实际通过：typecheck、lint、**146 单元 / 34 开发浏览器**、build；另行 **2 项生产浏览器通过（45.8 秒）**，无失败、跳过或 flaky。新生产流程真实打开五份 A–T 手册、架构 SVG、录屏预览，检查关闭后焦点恢复及手机尺寸。原始 [五项 gate](qa/engineering/m8-delivery/checks.json)、[unit](qa/engineering/m8-delivery/unit.json)、[开发浏览器](qa/engineering/m8-delivery/browser.json)、[生产浏览器](qa/engineering/m8-delivery/production-browser.json)。阶段日志中的 SHA 是父提交 `cd4ca2c` 加受测工作区，不冒充无修改的远端提交。

桌面预渲染的 6 页（总览加 5 个项目）、100 个 A–T 章节、5 张 SVG 共 69 条连线在 Edge 的 1440×1000 与 390×844 尺寸检查通过；图关系与源定义一致、页面不依赖网络、无横向溢出或失效锚点。最终公开文件与桌面手册及源文本哈希的匹配结果见交付产物记录。

M8 Linux **完整套件已通过**：[运行 34459299795](https://github.com/QiQiyzhu/arc-shift/actions/runs/34459299795) 在干净源码 `8b4728bbde1c33b0205f40bdc8b6b8bfdd4e1a03` 上完成 **146 单元 / 34 开发浏览器 / 2 生产浏览器**，无失败、跳过或 flaky；typecheck、lint、build、audit 0、生产 DEV 隔离检查通过。六种子合计 648,000 tick、模拟 10,800 秒、零 pool miss；墙钟总耗时 55.795 秒，不能称为三小时浏览器运行。[永久原始报告、环境与校验值](qa/engineering/ci-m8-full-success/parsed-summary.json)。

本地另以 CI 等待配置通过 [完整五项检查](qa/engineering/m8-ci-budget/checks.json)。最终手册和原始媒体的来源哈希、桌面与公开 HTML 一致性、离线布局检查及生产浏览器结果归档于 [交付产物记录](qa/engineering/m8-final-artifacts/)。此次 Linux 全量绑定上述游戏/测试源码；随后交付提交只整合文档、证据和公开展示资产，其日常 CI 与全量运行分别保留。公开入口为 [五项目作品集](https://arc-shift.black-kid-3047.chatgpt.site/portfolio/) 和 [游戏](https://arc-shift.black-kid-3047.chatgpt.site/)，展示中的其它后台应用提供真实媒体与本机复现。


### 首次 Linux full 的真实失败与修复

[34455609035](https://github.com/QiQiyzhu/arc-shift/actions/runs/34455609035) 在干净源码 `bbed8d1d7ace02ace2273b3609846f846ce83173` 上完成：146 单元通过、29 开发浏览器通过 / 5 失败、2 生产通过；6 × 108,000 tick 长模拟、audit 0、typecheck/lint/build/DEV marker 检查通过。失败不能被其它步骤通过抵消。[原始记录与摘要](qa/engineering/ci-m8-first-failure/parsed-summary.json)。

四个十秒渲染样本的帧数为 63/82/94/63，低于原先写死的 100；baseline/resonance/cannon/hybrid 实际平均 FPS 约 6.21/8.15/9.34/6.22，sword 104 帧通过。五个场景均保持 playing、有实际弹体且 0 pool miss。该次没有记录具体 GL 后端，不能仅凭 Linux 名称判断渲染设备。另一个失败来自六试炼第五轮撞到 45 秒全测试预算，保留了 [实际截图](qa/engineering/ci-m8-first-failure/resonance-timeout.png)；不是某项技能断言失败。

修复仍采样实际十秒，保留所有低 FPS，不延长采样来凑帧数。通用功能门槛检查样本有限且大于零、真实 tick/elapsed 推进、playing 与 pool 状态；额外记录实际 WebGL renderer。六试炼只获得独立 150 秒预算及 15 秒 playing 状态等待，六轮弹体/存档/池断言都保留。修复后 [完整本地五项 gate](qa/engineering/m8-ci-portability/checks.json) 再次通过 146 单元 / 34 开发浏览器；[本次本地样本](qa/engineering/m8-ci-portability/render-v1-baseline.json) 实际显示 Intel UHD / ANGLE D3D11，不与 Aegis 的 RTX 4060 / D3D12 混用。新的远端 full 运行绑定源码 `f25385f8ca552ee5b257fca1fe63c74eee21dc78`，结果另列。

### 第二次 Linux full：软件渲染与累计等待预算

[34457142276](https://github.com/QiQiyzhu/arc-shift/actions/runs/34457142276) 在干净源码 `f25385f8ca552ee5b257fca1fe63c74eee21dc78` 上为 146 单元 / 31 开发通过、3 开发失败 / 2 生产通过。前次五项失败均已通过；本次失败为多次刷新经营流程耗尽 45 秒总预算，以及两种 Boss 入场仍处于 bossIntro 时达到默认 5 秒等待。[原始报告与环境](qa/engineering/ci-m8-second-failure/parsed-summary.json)、[经营流程 trace](qa/engineering/ci-m8-second-failure/camp-test-trace.ndjson) 保留。trace 显示末次刷新已成功，累计 deadline 在随后“继续行动”点击期间触发，后续存档及 18 金币按钮断言没有单项错误。

本次真实 renderer 为 ANGLE / SwiftShader，五场景平均 FPS 为 3.18–5.50，均有正向模拟推进、playing 和零 pool miss；这是低帧率观测，不是性能改善。CI 专用总预算调整为 180 秒、默认状态断言为 30 秒，本地默认仍为 45 / 5 秒；所有经营、Boss、战斗和存档断言保留，没有添加 retry 或 skip。实际以 `CI=true` 再跑 [本地完整五项检查](qa/engineering/m8-ci-budget/checks.json)，146 单元 / 34 开发浏览器通过。最终远端完整结果另列。

最新工程验收：2026-09-10，M7 实现 `cd4ca2cc8cf59a0ff9f045b97635e1d5dd34fc46`。此记录区分规则测试、真实浏览器输入、开发夹具与自动控制器，避免把不同证据混为“真人完整通关”。

## Engineering M1–M7 验收

| 检查 | 最新本地结果 | 证据 |
|---|---|---|
| TypeScript / lint / production build | 全部 exit 0 | [M7 五项阶段检查](qa/engineering/m7-input-verified/checks.json) |
| 单元与规则合同 | 146 passed，0 failed/pending | [原始 JSON](qa/engineering/m7-input-verified/unit.json) |
| 开发浏览器完整回归 | 34 passed，0 failed/skipped/flaky | [原始 JSON](qa/engineering/m7-input-verified/browser.json) |
| 独立生产浏览器 | 1 passed，0 failed/skipped/flaky | [原始 JSON](qa/engineering/m7-input-verified/production-browser.json) |
| 全依赖 audit | 0 个已知漏洞 | [真实输出](qa/engineering/audit-m7.json)；[修复前与暴露范围](dependency-security.md) |
| 长模拟 | 6 × 108,000 tick，0 pool misses | [原始 JSON](qa/engineering/soak-long.json)，合计三小时模拟时间，不是墙钟浏览器三小时 |

每个 M1–M7 里程碑都运行 typecheck、lint、全部 unit、全部开发浏览器与 build。历史完整成功数量依次为 M1 93/25，M2 98/25，M3 115/27，M4 124/29，M5 128/32，M6 136/32，M7 146/34；各自日志与失败重跑保留在 `qa/engineering/`。数量按 unit/browser 分开计，不把参数化样本数和长模拟 tick 加入测试用例总数。

本地阶段记录的是检查开始时的父提交，包含当时工作区改动；随后 M7 实现及原始日志提交为上面的完整 SHA。远端 CI 则在 checkout 后记录确切源 SHA 与干净状态。[M7 Linux 运行](https://github.com/QiQiyzhu/arc-shift/actions/runs/34452226005) 已在相同完整 SHA、干净 checkout 上通过：146 unit、9 开发 smoke、1 production，3 × 3,600 tick soak 与 audit 0；Node 24.20 / Linux / Playwright Chromium。该 run 是 smoke，不是全量开发 E2E。[永久原始证据](qa/engineering/ci-m7-success/parsed-summary.json)。最终 M8 交付结果另列。

**保留的失败：** 首次 Linux [34447501573](https://github.com/QiQiyzhu/arc-shift/actions/runs/34447501573) 为 2/7 开发 smoke 通过，其余等待超时暴露 Phaser 重复平滑、合成焦点和固定时长假设。M7 第二轮本地 [32/34](qa/engineering/m7-input-final/browser.json) 失败于朝实体墙移动的测试前提、早于 Scene 创建的奖励夹具，实际截图保留并修正后完整重跑通过。输入另加入重连/无轮询间隙重建按钮基线，防止重复 Pause/Bomb，同时保留新键盘边沿。

公开包用实际页面启动与三条 DEV 路由检查、QA 对象缺失断言验证隔离；字串扫描只是补充。API 手柄 fixture 未替代实体硬件。250 敌人固定步模拟有可复现的查询下降与 Engine P95 改善，浏览器 **没有一致 FPS 增益**；详见 [完整测量](performance-v2.md)。以下保留 v1.0 及更早版本的历史记录。

## v1.0 最终验收

- TypeScript、lint、生产构建通过；92 项 Vitest 规则检查通过。
- [22 项浏览器检查](qa/browser-v1.json) 全部通过，无重试通过项。覆盖实际键鼠、旧经济回归、暂停、续玩、二级营地、完整地图、混搭、事件单次结算、两种新 Boss、音频总线、移动端浏览及五种压力样本。
- [18 次完整模拟](qa/simulation-v1.json) 全部通过，检查十二个合法节点、三次核心击破和零弹体池耗尽。模拟时间 76.72–230.98 秒，不包含玩家阅读与决策时间。
- 新增规则覆盖六十个路线种子的连通性，非法跨层拒绝，事件/库存/奖励恢复，遗器解锁门槛，混搭冷却与慢速连段，地形遮挡、陷阱预警与祝祷，五波守点上限，以及新旧行动的实际 Boss 击杀解锁。
- 新场景截图由浏览器运行时生成。Boss 后期使用明确的开发夹具，混搭试炼使用游戏自身入口；未声称截图是自然通关过程。

验收修复了开发热更新干扰正在运行的浏览器检查后，冻结产品源码重新运行全部 22 项。生产检查通过独立 `scripts/smoke.mjs` 验证；最终部署记录保留在本地发布记录中。

## v0.3 迭代验收（历史）

74 项 Vitest 测试通过：包括旧版 50 项、15 项经济与存档测试、9 项武装测试。覆盖开箱互斥、商店限量、归档与结算幂等、血誓不致死、准备快照、旧档补默认、付费重抽恢复、试炼隔离、召唤怪无收益、剑弧角点、穿透符刃和炮弹池状态重置。三种武器分别运行六套试炼配置和全 40 卡堆叠，共 21 个 20 秒规则样本，无弹体池耗尽。

14 组 Playwright 场景通过（先 12 组，再补 2 组武器压力采样）。保留原有设置/失焦暂停、键鼠操作、两 Boss、胜负与移动端菜单检查；新增真实 B / R 输入、暂停引信、圣剑存档、营地按钮交易及刷新、局外升级不改旧行动、重抽手牌恢复和三武器试炼切换。战斗快捷场景使用开发夹具，按键和交易经真实界面操作。

已检查菜单、营地、剑弧、重炮和行者营地截图，无横向溢出或主要操作遮挡。路线面板在内容较长时内部滚动。压力采样与完整规则模拟见 [性能记录](performance.md)。生产独立冒烟脚本另覆盖 v0.3 武器选择、B / R、营地、重炮试炼与检查点，并检查生产构建没有开发夹具。

存档仍使用入口 / 奖励 / 地图检查点；房内战斗整体回滚是明确设计。旧存档资源补默认，既有行动不获得追溯升级。没有自动保存每一帧或云端账户。

三种武器 × 三个种子 × 两种路线，使用雷电初始协议的 18 局完整规则模拟全部通关，零弹体池耗尽。控制器执行合法输入、选卡、开箱、购买补给和归档，精确读取世界状态，不代表真人难度。初版近战控制器有 4 局在 Oracle 接触伤害下失败；审查确认走位评分预留距离不足，修正控制器的身体避让缓冲后通过，未修改 Boss 或玩家伤害。原始最终数据见 [18 局记录](qa/simulation-v03.json)。

## v0.2 已通过的验证（历史）

| 验证 | 结果与覆盖 |
| --- | --- |
| Vitest | 50 / 50；原 37 项回归，加 780 对组合顺序、六试炼和全卡叠加、反应冷却/代际/死亡结算、轨道/回旋边界、存档隔离、乐谱节拍 |
| Playwright | 9 / 9；真实键鼠、菜单与档案、奖励/路线、精英/治疗、续玩、两 Boss、胜负重开、移动布局、两种压力场景、六试炼保留存档、音频边界 |
| 规则完整流程 | 本版重新执行 18 / 18 胜利；3 种子 × 3 初始协议 × 2 路线，合法选卡与输入，没有直接清场；[原始结果](qa/simulation-v02.json) |
| TypeScript / Build | 类型检查与 Vite 静态生产构建通过 |
| Oxlint | 应用、测试与配置通过；不检查未修改的 scaffold 组件目录和 hooks |
| 生产预览 | HTTP 200、真实启动与技能输入、设置暂停/恢复、刷新检查点；无页面异常与失败资源；`/?qa` 不暴露测试接口 |
| WebMCP | 状态读取、候选协议选择、非法选择拒绝、菜单暂停拒绝、暂停幂等、介绍暂停后恢复原阶段 |
| 依赖 | v0.1 交付前 `npm audit --omit=dev` 报告 0 个已知漏洞；本轮未改变依赖版本，旧扫描不代表当前漏洞数据库 |

规则控制器使用精确坐标与弹体状态，不代表普通玩家胜率。浏览器测试中的后期房间、无敌、Boss 血量与结算使用 DEV 夹具，主要验证生命周期、表现、流程与交互。真实移动、射击、Dash、Q、E、暂停和界面点击通过浏览器输入完成。

## v0.2 迭代验收

六套试炼通过实际界面进入，真实瞄准、持续射击、Dash 和 E，并分别截取画面。测试先创建普通行动检查点，再逐套切换、退出、刷新续玩，验证完整存档对象保持不变。音频检查包含用户手势前无上下文、活动声音实时静音/恢复、失焦音乐总线为零、总声部与音乐声部上限，以及销毁重建后的首发声音。

规则测试将六试炼及全 40 卡人工压力配置各运行 30 秒，检查有效坐标、击杀、池容量与反应预算；另外验证原目标被嵌套爆发击杀时只结算一次、反弹轨道脱离、分裂寿命同步、回旋弹从中央及近墙位置四向正常返航。真实浏览器压力场景持续 10 秒，结果见性能记录。截图使用本轮实际渲染，未进行后期美化。

## v0.1 三轮打磨（流程保留，本轮重新截图）

| 轮次 | 检查与改进 | 截图 |
| --- | --- | --- |
| 1：战斗反馈 | 验证瞄准与持续射击；修复极短按键丢失、场景重建后特效订阅泄漏；检查命中闪白、飘字、残影与合成音效 | [战斗](screenshots/combat.png) |
| 2：界面与构筑 | 1440×900 检查主界面、三选一卡面、协议档案、路线与设置；检查刷新续玩、奖励冻结与护盾保留 | [菜单](screenshots/menu.png)、[卡牌](screenshots/draft.png)、[路线](screenshots/map.png) |
| 3：Boss 与结算 | 1920×1080 检查两 Boss、阶段变化、双向激光、胜利徽记与失败重开；最后加入介绍/设置/失焦暂停回归，并缓存地面 | [核心激光](screenshots/boss.png)、[胜利](screenshots/victory.png) |

## 初版至 v0.2 功能验收表（历史）

- [x] 启动、主菜单、操作指南、设置、协议档案。
- [x] 移动、瞄准、攻击、Dash、Q / E，冷却与反馈。
- [x] 五种敌人、精英变体、两种 Boss、预警与阶段变化。
- [x] 命中反馈、飘字、粒子、激光、弹幕、魔法阵、残影。
- [x] 40 项协议、五系构筑、同系共鸣、六种跨系反应、三选一奖励。
- [x] 六套无限无敌试炼；不覆盖原行动，退出后继续旧检查点。
- [x] 随机路径、四个装饰模板、治疗与宝藏房。
- [x] 胜利、死亡、再次开始、检查点续玩、设置保存。
- [x] 合成音频、对象池、规则与浏览器测试、生产构建。
- [x] README、设计、架构、性能、面试、AI 日志、许可证。

公网发布使用 README 中的固定试玩地址；部署完成后的独立 HTTP 与浏览器启动检查单独执行，不计入上述本地 9 组测试。

可运行 `node scripts/smoke.mjs URL` 对本地生产预览或已部署地址复现启动、输入、暂停、试炼、存档与资源加载检查。

## 关键修复

介绍时打开设置和窗口失焦原先不会冻结倒计时，Boss 会在弹窗后进入战斗。现在暂停记住原阶段；关闭弹窗后维持暂停，由玩家明确继续。浏览器等待超过介绍时长后，确认计时、阶段和战斗都不推进；Escape 只关闭弹窗。

前几轮还修复了场景订阅泄漏、短按技能丢失、激光预警与命中不同步、死亡后吸血、穿透重复命中、Dash 缩短已有无敌、火迹原地叠加、升级/续玩数值不一致、护盾丢失和重复结算。

## 未完成的商业质量验证

v1.0 已有不同障碍布局与碰撞滑动，没有全局障碍寻路或迷宫生成。移动端没有战斗触控；未验证手柄和全部浏览器。未进行长时内存浸泡测试或玩家群体难度测试。v0.2 两种短时压力样本平均约 67.9 / 79.5 FPS，但 P95 帧间隔超过 16.7 ms，不能宣称稳定 60 FPS；详见 [性能记录](performance.md)。

现阶段可以展示完整循环、工程边界与视觉方向；“手感非常好”“商业发行质量”“五系完美平衡”等主观结论不能由自动化结果证明。
