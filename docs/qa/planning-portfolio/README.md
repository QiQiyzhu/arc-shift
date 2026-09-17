# 2026-09-18 策划作品证据

- `numeric-experiment.raw.json`：最终规则快照、37份加载源码哈希、24个逐种子靶场样本、价格敏感性合法组合列表；历史采集脚本在 `numeric-experiment.original.cjs.txt`，保持原字节哈希。可移植复现入口为 `node scripts/planning-numeric.cjs`，输出至 `outputs/planning-numeric`，不覆盖原始档案。
- `numeric-experiment.summary.json`：均值、最小最大值、总工作量和测量限制。24样本/17,280 ticks/0池申请失败；不是浏览器性能或真人反馈。
- `recorded-run.json`：最终视频的真实三阶段战报，finished；没有修改生命、击杀或时间来制造通关。
- `capture.json`：原始录屏事件时间、音频开始偏移与自动化说明。最终MP4去掉开头1.3秒，加入字幕并将游戏音轨增益8dB；没有加速战斗。
- `iteration-initial.json` / `iteration-revised.json`：调节HP前后的探索性键鼠试跑。配装与真实输入时序有差异，不是固定输入性能A/B；不能从中宣称真人难度改善百分比。
- `browser-flow.json`：新增试炼与已有主流程7项浏览器测试；边界测试用夹具，录屏独立使用真实键鼠。
- `references.md`：官方奖项与设计来源，获奖归属参考作品。

前一轮完整性能原始对照与profiles见 `../client-showcase/phase1/`，有3场景×3对固定工作量样本、排除记录、行为oracle和GC限制。

录像复现：启动开发服务后运行 `node scripts/record-trial.mjs outputs/portfolio-capture --record`。它读取DEV QA世界位置用于自动瞄准，通过键鼠驱动；不依赖外部API，不是真人研究。实际键鼠时序受机器帧率与录屏开销影响，复跑战报可不同。
