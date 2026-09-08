# 竞品研究与原创边界

研究日期：2026-09-08。事实来自开发商官网或其 Steam 商店页；应用方案是本项目自己的设计推导，不代表竞品的实际数值。

| 参考作品 | 可借鉴的通用机制 | ARC//SHIFT 的应用 |
| --- | --- | --- |
| [Hades](https://www.supergiantgames.com/blog/hades-faq/) | 快节奏动作、每局神力组合、难度与成长 | 将移动、攻击、Dash 做成连续操作；局内升级立刻改变行为 |
| [Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/) | 收集、升级、集中发展少数武器的增长反馈 | 初始协议立即确定方向，元素颜色与机制一同改变 |
| [Brotato](https://store.steampowered.com/app/1942280/Brotato/) | 短波次与间歇构筑、物品组合 | 波次战斗与安全选卡交替，维持手动瞄准的注意力负担 |
| [Enter the Gungeon](https://store.steampowered.com/app/311690/Enter_the_Gungeon/) | 射击、翻滚、弹幕、手工房间组合 | Dash 可穿弹；预警后出招；采用少量可控模板 |
| [Slay the Spire](https://store.steampowered.com/app/646570/Slay_the_Spire/) | 动态构筑、路线风险、效果组合 | 奖励偏向已选分支，路线提前显示风险与回报 |
| [Risk of Rain 2](https://store.steampowered.com/app/632360/Risk_of_Rain_2/) | 物品叠加与玩家/敌人成长 | 后期增加敌型组合与技能互动，限制特效和弹体资源 |
| [Dead Cells](https://dead-cells.com/) | 读攻击模式、恢复窗口、失败后学习 | 敌人有预警、攻击、冷却/恢复状态，失误原因可解释 |

## 采用什么，为什么

核心循环为进入异常室 → 读招 → 射击与 Dash → 清场 → 协议三选一 → 选择下一层 → Boss → 结算。短房间降低失败的学习成本；初始协议使第一次战斗已有元素身份。

高伤害攻击先显示范围或方向，再执行。粒子和音效强调命中，预警保持更高视觉优先级。Dash 的初始参数来自本项目调试，而不是复制竞品。

三张候选排除已持有与无法触发的前置卡，再偏向已发展元素。这样兼顾组合方向与新分支，而不是只加伤害百分比。把战斗随机数和奖励随机数分开，方便重现问题。

## 明确不复制

不复用或描摹竞品的角色轮廓、名称、剧情、地图、卡面、技能图标、Boss 造型、标志性攻击编排、音乐、采样音效、Logo 或商业代码。世界、术语和几何美术围绕“魔法文明与失控 AI 网络”独立设计。

## 合法素材研究

[Kenney 支持页](https://kenney.nl/support)确认其资产包通常为 CC0，但具体包仍应保留许可证；[Game-icons](https://game-icons.net/about.html)使用 CC BY 3.0，需要作者署名；[Space Grotesk](https://github.com/google/fonts/blob/main/ofl/spacegrotesk/OFL.txt)为 OFL 1.1。最终没有引入 Kenney 或 Game-icons 图片/音频。本版使用程序化角色/场景、合成声音、Space Grotesk 字体和已有 Lucide 图标，详见 [素材许可证](../assets/LICENSES.md)。
