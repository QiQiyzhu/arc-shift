# Asset licenses

| Asset | Author | Source / URL | License | Usage |
| --- | --- | --- | --- | --- |
| ARC//SHIFT 名称、几何角色/敌人/Boss、竞技场、粒子、符文、Logo | ARC//SHIFT project contributors | `src/render`, `src/effects`, `public/favicon.svg` | 本项目原创代码；见根目录 LICENSE | 游戏画面 |
| 圣所地面 / 裂隙主视觉 | ARC//SHIFT，使用 OpenAI image_gen 生成，2026-09-09 | `public/art/sanctum.webp`、`rift-keyart.webp`；[生成记录](../docs/art-direction-v02.md) | 项目贡献者将其可授予的权利按根目录 MIT 提供；不主张第三方作品权利 | 原创提示生成，无输入参考图片；运行时本地托管 |
| 合成音效与四小节乐谱 | ARC//SHIFT project contributors | `src/audio/synth.ts`、`src/audio/score.ts` | 本项目原创代码 | Web Audio 振荡器与生成噪声现场合成，无外部采样或商业音轨 |
| Space Grotesk | The Space Grotesk Project Authors / Florian Karsten | [Source](https://github.com/floriankarsten/space-grotesk) · `@fontsource/space-grotesk` | SIL OFL 1.1，完整文本见 `licenses/space-grotesk.txt` | 本地打包拉丁标题字体 |
| Lucide icons | Lucide Icons and Contributors；部分源自 Cole Bemis / Feather | [Lucide](https://lucide.dev/license) | ISC；派生 Feather 图标 MIT，完整文本见 `licenses/lucide.txt` | 技能功能图标、界面控制 |
| Phaser 3 | Richard Davey / Phaser Studio Inc. | [Phaser](https://github.com/phaserjs/phaser) | MIT，见 `licenses/phaser.txt` | 引擎运行时 |
| React / React DOM | Meta Platforms, Inc. and affiliates | [React](https://github.com/facebook/react) | MIT，见 `licenses/react.txt` | 界面运行时 |
| Base UI | MUI contributors | [Base UI](https://github.com/mui/base-ui) | MIT，见 `licenses/base-ui.txt` | Dialog / Slider / Switch 的无障碍行为 |

中文采用用户设备的系统字体，不分发系统字体文件。未使用 Kenney、Game-icons、Freesound、OpenGameArt 或商业游戏的图像与音频。

许可证副本同时放在 `public/licenses/`，随静态页面分发。依赖包各自保留原始许可证；本项目许可证不覆盖第三方作品。
