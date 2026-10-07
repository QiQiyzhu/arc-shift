# ARC-SHIFT v2.3 实机视频

## 当前状态（2026-09-22）

**已完成并交付。** 新视频 180.818 秒（约 3 分 01 秒），1920×1080，51.98 MB；桌面和工作区副本均已校验可解码、可播放且哈希相同。交付文件为：

- `C:/Users/yzhu/Desktop/ARC-SHIFT_v2.3_Demo.mp4`
- `output/video/ARC-SHIFT_v2.3_Demo.mp4`
- `output/video/ARC-SHIFT_v2.3_verification.json`

SHA-256：`4284033b11d0815cf82ea7198321297c2bc699f4f296600c6984f66149de4317`。字节数 51,977,903，H.264 / AAC 48kHz 立体声，峰值 -8.5 dBFS。片段编码 30fps，播放器实际时长包含拼接包对齐时间；剪辑时长之和为 180.55 秒。

## 本轮新素材

全部位于 `D:/CodexData/ArcShiftV23`，没有借用旧成片。

| 成功 take | 源片记录长度 | 内容 |
|---|---:|---|
| `menu-final` | 21.972 秒 | 默认中文 → English → 重载保留偏好 → 中文；2 段游戏音轨 |
| `weapons-take2` | 56.649 秒 | 法器、圣剑、重炮；内置免伤演练，成片持续标注 |
| `trial-take2` | 92.911 秒 | 预算、三阶段构筑、合约、重配、Boss、总结；正常通关 |
| `frontier-grove-final` | 72.060 秒 | 正常信标/林地搬运/压制节点/Boss 完整通关 |
| `frontier-foundry-final` | 73.822 秒 | 正常信标/核心护送/压制节点/Boss 完整通关 |
| `contract-take2` | 19.832 秒 | 正常完成首场后补录两个合约选项和选择，替换旧源片中未更新的合约镜头 |

成功 take 页面错误均为 0，148 个源码/资产与录制基准一致；当前 153 个基准源码/资产/配置文件也无变化。原始视频、分段音频、AudioContext/墙钟记录、事件、状态证据与文件清单均保留。基准聚合哈希为 `bdf61c3fc0184a4cb357a13bf50f64914dc7bce4e912282cff599969c0760f7d`。

`weapons-final`、`trial-final` 和 `contract-final` 是录制工具失败记录，保留用于追溯，未进入成片。首次合约补录是在离开战斗页后尝试读取已卸载的 QA 接口失败；成功 take 改为保存战斗结束时导出和重配页可见文本，不改变游戏状态。

## 最终剪辑与验收

18 段依次展示：双语菜单、三种武器、预算构筑、实战、航路合约、阶段重配、守门人、总结、边境信标、路线选择、林地回收、压制节点、铸庭分支、核心护送、铸庭 Boss、最终结算。剪辑计划为 `edit-plan.json`。

- [x] 当前源码类型检查、lint、单元测试及开发/生产浏览器准入。
- [x] 新实录、正常双路线完整通关和素材/源码一致性审查。
- [x] 完整音视频解码；音量峰值及静音区间检查。
- [x] 全部 18 段共 36 帧目视审查；修复合约画面问题，去除重配前旧结果停留。
- [x] Edge 五位置播放、拖动、音视频解码检查；采样播放丢帧 0。
- [x] 桌面、工作区和母版的字节数及 SHA-256 一致。
- [x] 交接、续作和交付记录更新完成。

验收报告为 `video-edit-report-v23.json`；独立检查位于 `final-review/checks.json`、`browser-playback.json`、`supplemental-audit.json`。四张 `final-contact-*.jpg` 为最终 36 帧审看片，`pre-correction-*` 和无 final 前缀的 contact 为修正前证据，不应作为交付版本。

## 录制与证据边界

工具为 `scripts/capture-v23-lib.mjs`、`record-v23.mjs`、`record-v23-frontier.mjs`、`record-v23-contract.mjs`、`encode-v23.py`。游戏操作使用普通按钮/键鼠；QA 只读取状态。正常双路线 `assisted=false`，三武器使用产品公开的免伤演练并持续标注。

音轨全部来自新游戏实录，以本次 AudioContext 与墙钟映射对齐，短淡入淡出仅用于剪辑边界。重载和结算中的静音被保留；没有外部配乐。完成了技术音频验证与静音播放解码检查，没有宣称完整主观听审、连续一局录像或真人游玩研究。
