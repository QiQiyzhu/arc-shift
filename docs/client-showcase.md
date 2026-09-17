# ARC-SHIFT：客户端展示版本

本轮从 `0567590`（2026-09-11 v1.2）继续，保留现有引擎。2026-09-17 实施，分为性能/体验与配置活动两个阶段。本文会将实测、自动化流程与真人反馈分别标明。

## 已有能力核对

| 能力 | 当前实现与复用方式 |
| --- | --- |
| 空间网格 | `UniformGrid` 覆盖跨格圆 AABB、扫掠弹体、来源数组顺序及击退更新；保留 brute-force oracle，本轮不改碰撞路径。 |
| 回放 | 固定步输入/命令/校验和、版本检查；继续使用已提交的 v1.2 历史夹具，不重录掩盖偏差。 |
| 内容编辑器 | 封闭 ContentPack schema、范围/引用/前置校验、JSON 导入导出、差异及独立引擎沙盒；活动继续使用同一 ContentPack。 |
| 存档 | 主线格式 1、旧字段归一化、房间检查点；主线不承诺恢复任意战斗中间帧。 |
| 浏览器优化 | 静态地形纹理缓存、角色/敌弹图片池、特效池、HUD 显示值签名已完成，直接复用。 |

## 第一阶段：实际体验与性能

先实际启动浏览器，用现有流程检查完成开始、键鼠战斗、奖励三选一、暂停/失焦、死亡及重开，5 项检查通过。需要快速到达死亡/首领状态的步骤使用明确的 QA 夹具；这不是普通玩家自然通关或真人反馈。

### 定位与实现

旧的 `presentationMs` 只记录绘图命令准备，遗漏后续 Graphics 曲线细分与批提交。新增测量包装后，250 敌单次 profile 的 Graphics render CPU P95 为 38.3ms，而 Engine 单步 P95 为 2.1ms。CPU 与采样分配都指向 Phaser 动态 ARC/路径细分和 Earcut；几像素的装饰光晕也经过约 100 点的圆弧路径。

只修改表现层：

- 动态小型实心光晕、友弹中心和敌人阴影使用缓存单位圆的三角扇，直接提交 `fillTriangle`，省去重复 Point/路径/Earcut；按 **0.35 个游戏逻辑像素**的弦高误差选择 8/12/16/24/32 边。大尺寸自定义几何和 Canvas 保留旧曲线，避免透明三角形独立抗锯齿产生接缝。
- 飘字复用原 40 个 Text；只有颜色或字号发生变化才更新样式，减少重复 canvas 纹理上传。没有减少敌人、弹体、粒子容量或模拟推进。
- 攻击预警、敌弹、碰撞半径和规则代码保持原路径。DEV 诊断开关保留旧装饰绘制与文字样式路径，便于同一程序内交错对照；生产忽略该开关。

### 多轮原始对照

同一 Windows 设备、Headless Edge、1440×900、DPR 1、完整特效、静音、种子 73129、相同固定步输入。每次新页面先运行 120 步预热，再运行 **600 个测量步**；每场景 3 对样本，旧/新顺序轮换，共 18 份。下表为三次分位数/比例的中位数，不是合并帧后重新计算的分位数。

| 场景 | 帧间隔 P95 旧 → 新 | >33.3ms 帧占比旧 → 新 |
| --- | --- | --- |
| 28 敌 | 25.4 → 15.2ms | 2.76% → 0% |
| 100 敌，含障碍与动态陷阱 | 37.3 → 20.2ms | 10.38% → 0% |
| 250 敌 | 48.5 → 31.7ms | 33.82% → 3.26% |

250 敌 P95 中位数下降 **34.64%**。所有接受样本最终均 720 世界步（包含预热）及 12 秒模拟时间；权威世界 checksum、伤害、随机状态、事件哈希、钱包和查询计数完全一致。另从优化前提交提取源码，与当前源码分别运行三种武器、40 个可击杀敌人、1,200 固定步，并对照 grid/brute：每 120 步校验和、伤害、击杀、拾取与掉落事件逐项相同。

保留一个被排除的初次 after 样本：先启动世界再异步加载地形模块，导致提前 3 步、总时间 12.05 秒。最终脚本在重置世界之前解析全部模块，并断言实际世界步为 720；最终 18 份数据不使用该样本。

### 测量边界

- 这是同机 DEV 游戏的轻量插桩结果，无 CDP 的主对比仍包含计时包装和事件哈希；不是生产版 FPS、全设备保证或统计显著性结论。CPU/heap/GC profile 单独采集。
- 帧间隔是 Phaser `postrender` 到下一次 `postrender`。`renderSubmitMs` 记录 `WebGLRenderer.render`，包含内部 `graphicsRenderMs`，两者不可相加；外层 pre/postRender 提交不在该子计时中。GPU 执行没有单独测量。
- `Engine.update` 包含同步特效事件；`hudAndAudioMs` 只包含帧末显示签名/音频回调，未包含随后 React reconciliation。CPU profile 另保留 React 的调用栈。
- 固定步与权威战斗事件相同；VFX 按显示帧衰减，更多显示帧会改变装饰粒子的可见数量及随机调用，不能声称逐像素负载相同。
- 单次 profile 的 GC 外层事件总耗时 **532 → 875ms**，没有改善；不能将路径分配热点减少写成“消除了 GC”或把采样字节数当作存活内存。profile 包含自身开销，CPU/分配样本还含准备与预热。

[完整比较与边界](qa/client-showcase/phase1/comparison.json)、[原始配对记录](qa/client-showcase/phase1/paired-final/results.json)、[可击杀行为对照](qa/client-showcase/phase1/behavior-after.json)、[49 项针对性单元结果](qa/client-showcase/phase1/phase1-unit.json)。同目录保存初始基线、排除记录、截图及 gzip 压缩的 Chrome trace、CPU 和分配 profile；解压后可用 Chrome DevTools/Perfetto 查看。

```sh
# 开发服务启动后，使用固定工作量交错对照
node scripts/client-performance.mjs paired-final --paired
node scripts/client-performance.mjs profile-new --trace
node scripts/client-performance.mjs profile-old --trace --legacy
node scripts/profile-summary.mjs outputs/client-showcase/profile-new
```

## 第二阶段：配置挑战活动

第一阶段验收完成后实施；最终活动流程、存档边界、演示路径和简历描述将在本节补齐。
