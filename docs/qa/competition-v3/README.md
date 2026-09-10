# v1.1 验收证据

实施与测量时间：2026-09-10，Windows / Headless Edge。玩家体验入口是主菜单「第一次跃迁」。工程说明见 [升级报告](../../competition-release.md)。

最终完整执行通过：TypeScript、lint、157 项单元、37 项开发浏览器、5 项生产浏览器检查；生产构建通过。浏览器全量运行分别耗时约 5.8 分钟和 43.4 秒；没有将此前失败混写成全通过。发布前核对记录中全部源码哈希，未发现变化。

## 记录索引

- `checks.json`：最终逐项执行的命令、退出码、耗时、Node 版本及工作区源码 SHA-256。`baseCommit` 是本次修改前的历史提交，`sourceDirty: true` 如实说明执行时尚未提交；不能把它冒充最后发布的提交。
- `unit.json`、`browser-full.json`、`production.json`：各测试工具原始报告。完整开发回归与正式构建浏览器检查分开记录。
- `build.json`：生产构建回执、入口文件哈希和磁盘大小。Sites Windows helper 在 npm 路径解析阶段失败，之后直接运行相同的 `npm run build` 成功。
- `before.json`、`after.json`、`before-terrain.json`、`after-terrain.json`：初始测量；`benchmark-initial.txt` 保留初始脚本。初次 after 中三条 Scene 指标失效，具体范围见升级报告，数据保留原样。
- `after-verified.json`、`comparison-after-verified.json`：生命周期修正后再次进行九轮测量，要求 QA 身份稳定、Scene 帧数持续增长；250 敌三轮 P95 约 34.7ms，模拟均为 303 ticks。`sceneDelta.frames` 与 rAF 帧数逐条一致。瞬时 `simulateMs` / `presentationMs` 的差值不代表累计耗时或性能收益。
- `deepseek-review.json`：一次真实 API 审查的脱敏请求与响应；输出截断和误报判断见升级报告。无运行时模型依赖。
- `screenshots/`：新主菜单、熔接、实战、Boss、图集缺失回退、1280×720 选卡，以及前后压力场景。它们是实际浏览器截图，Boss流程截图使用 QA 夹具，不是自然通关证据。

## 已修复失败的保留记录

- `guide-diagnostic.json`：改用标准 Dialog 后，测试仍查找旧 accessible name 的失败；按实际标题修正选择器。
- `browser-before-lifecycle-fix.json` / `checks-before-lifecycle-fix.json`：36 通过、1 失败；缓存检查读到旧 Scene 的零计数。修复过期异步注册，未删断言或放宽为零也能通过。
- `checks-lint-storage-failure.json`：新增生产用例展开 Storage 实例触发 lint；改为显式枚举键值并排序。
- Windows 截图文件 EBUSY 导致开发服务退出的早期记录在项目外备份目录保留；Vite 现忽略 docs/qa、outputs、work 的生成文件。

## 尚不能由这些证据证明

自动化覆盖不等于真人上手成功率；单机短样本不等于所有设备稳定 60FPS；Gamepad API 注入不等于实体手柄兼容认证。完整英文 UI、真人首次试玩、多设备长时间测试、正式赛事报名均不在已完成证据内。
