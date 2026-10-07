# v2.3 玩家界面本地化续作

**2026-09-22 最终验收补记：** 主任务已修复英文菜单拥挤和圣剑选卡裁切；中英文 × 两种窗口高度布局通过。Canvas 共鸣浮字及边境目标完成补漏，最终构建、定向测试、开发与生产浏览器验收已通过；新双语实机片段已交付。以下范围与待办是本地化阶段记录，最终状态见 `docs/v23-delivery.md`、`docs/v23-resume.md`。

在既有未提交的 v2.3 i18n / GameApp / SettingsPanel / EconomyPanels 工作之上补齐；未重置、提交或改动玩法规则。源目录仍为 `C:\Users\yzhu\Documents\ChatGPT\New project`。

## 实际完成

- 中文为新存档、缺语言字段的旧存档和非法语言值的默认值；English 保存在原 `arcshift.save.v1` 设置。即时切换、重载、新打开营地面板都保持偏好。存储不可用时同一会话仍保留语言。HTML `lang` 跟随设置。
- 主菜单、HUD、暂停、选卡预览、12 层路线、六类遭遇、营地交易反馈、结算、帮助、输入、演练、战术教练接入展示翻译。卡牌 ID、规则中文名、演练步骤匹配和核心计算不变。
- `/build-trial` 的武器/卡槽/预算、协议说明、航路合约、战斗 HUD / Boss 动作、暂停/退出/战报；`/challenge` 的大厅/规则/计时/驻留/暂停/撤离/结算完成双语，各自新增持久化语言按钮。
- 40 卡、5 元素、8 共鸣、8 试炼构筑、3 武器、商店/养成、全部遗器/记忆/敌人说明、9 条教练策略有逐条英文。英文关键词映射回相同作者词汇，使用原检索排序；原输入继续供导出。
- 主菜单已接 `/art/keyart-v23.webp`（旧文件保留），已加 `/frontier` 入口与双语文案。边境模式内部界面归玩法 agent。

## 文件

`src/ui/i18n.ts`：`useLanguage` / `copy` / `useTranslation` / `translateCopy` / 广播。`locale-shell.json` 保留前序双语文案；`locale-content.ts`、`locale-interface.ts`、`locale-trial.ts`、`locale-coach.ts` 分管目录、界面、独立模式、教练，`locale-en.ts` 汇总。优先完整句，动态目录使用明确作者片段，不同语序用 `t.copy(中文模板, English template)`。翻译仅发生于 React 展示值，不扫描/替换 DOM，不联网机器翻译。未知自定义文字整体原样保留。

修改组件：`GameApp`、`SettingsPanel`、`EconomyPanels`、`ProtocolPanels`、`PilgrimagePanels`、`InputSettings`、`FieldGuidePanel`、`CoachPanel`；另含 `src/trial/TrialApp.tsx` / `TrialArena.tsx`、`src/activities/ActivityApp.tsx` / `ActivityArena.tsx`。新增 `LanguageToggle.tsx`。无岗位/投递定位文案。

## 实测

- `npm run typecheck`、`npm run lint`：通过。
- `npx vitest run tests/localization.test.ts`：5/5。覆盖默认/旧存档语言、English 往返、全部默认目录英文且源数据不变、动态交易、未知自定义文案/引号、英文关键词同排序。
- 同批 7 项 Playwright（5 本地化 + 原中文 trial/activity 键鼠操作/暂停/退出）全通过，34.5 秒。随后增加航路合约、调整英文空格/引号，5 条本地化再整批通过，22.8 秒。合约补给句最后改为完整英文插值模板以修正数字与后文粘连，需 root 最终验收时重截该图。
- 浏览器覆盖：切换/重载、新挂载营地所有页签、教练 Worker 比较、主线选卡、构筑选择/合约/暂停/失败战报、中继大厅/暂停/撤离/确认/重入、12 层路线、forge/archive/heal/event/shop/treasure 六类遭遇、教程四目标与共鸣选择。English 可见文本扫描无汉字，语言按钮“中文”除外。
- `outputs/qa/v23-localization/` 包含 trial-en / contract-en / trial-result-en / challenge-en / help-en / coach-en / draft-en / route-en / encounter-en / tutorial-en 的 PNG。截图禁用入场动画，避免把半透明过渡当作稳定界面。
- 已目检独立模式、选卡、路线与合约英文画面。**1440×900 时圣剑选卡长说明会使卡底被 viewport 裁切，已交 root 修 CSS，尚非完成的视觉验收。** 路线与独立模式当前无文字裁切；发现的英文空格/引号粘连已修正。

## 边界

- 遭遇/合约/结算 QA 夹具只验证界面，不是自然通关或 Demo 录像。未录 MP4、未声称完成美术或生产构建，root 负责最终实机交付。
- 开发编辑器参数校验错误、JSON 内部原始字段和任意自定义内容不强行翻译。`scripts/audit-localization.mjs` 为静态补漏辅助，输出包含这些有意保留项，不能替代浏览器验收。
- Canvas 浮字/环境标签不在本次 React 所有权范围；root/渲染 agent 继续用 `translateCopy(settings.language, text)` 或显式映射核查。已通知父任务。
- 修改全部未提交；旧交接测试数字不等于当前整库最终结果。
