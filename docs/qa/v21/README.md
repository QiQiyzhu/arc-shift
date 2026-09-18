# v2.1 验收与复现索引

本轮仅修改视听表现和音频生命周期，主线模拟 `1.2-protocol.1`、试炼规则 `2.0-contract.2` 不变。产品说明见 [设计](../../v21-design.md)，完整规则见 [v2设计](../../v2-design.md)。

- `unit-results.json`：245项单元测试、25文件，全通过。新增三层音乐同步、平滑起播、缓存、暂停、销毁／下载失败与声部预算验证。
- `browser-first.json`：8场景；`browser-final.json`：9场景，3个音频场景重复。14个不同场景覆盖主线开始、奖励、暂停、死亡重开、试炼合约边界、音画反馈与存档隔离；不包装成单批14/14。后批验证最终音频修正。
- `audio-browser.json`：实际OGG解码、三地域共同起点和实际输出信号。测试夹具中主动设置区域用于覆盖，此文件不是普通游玩记录。
- `production.json`：7项生产检查通过，含三条OGG资源200、真实暂停、退出、DEV隔离。页面错误为空。
- `evidence-audit.json / .md`：对两版原始帧记录重新统计、逐轮完整final对照、行为与18局实验深比较，共379离线断言通过。Renderer包含Graphics，不能相加；不是GPU时间。
- `recorded-run.json / capture.json`：新视频正常挑战，真实键鼠输入，法器、夺能；三场233／571／1288战斗步，战斗承伤0／17／22，合约另付20，终局61HP。没有写生命或世界状态。DEV编辑器演示价格3→2。配套前段另外录制内置无敌演练，明确标识。

性能原始文件位于本地 `outputs/client-showcase/v2-final/results.json` 和 `v21-final/results.json`，完整原始帧及复算脚本随新版ZIP附上。同机Edge153、1440×900、DPR1、种子73129、完整特效，120热身+600测量世界步，每场景3轮。三轮帧P95中位：28敌13.4→11.2ms、100敌+地形19.4→17.2ms、250敌30.7→26.9ms。250敌>33.333ms占比2.011%→0.316%。两批非交错、强制静音，不能作为真实BGM性能或生产FPS承诺。

模拟弹体池miss为0；装饰粒子池存在按容量丢弃。9轮完整末态、6组网格/暴力行为与18局实验的两个JSON全部相同。实验仍为10成功、8失败，非真人通过率。

复现：`npm ci`，`npm test -- --reporter=json --outputFile=outputs/v21/unit-results.json`；启动DEV后运行 `node scripts/client-performance.mjs <新标签>`、`node scripts/client-behavior.cjs . <新标签>`、`node scripts/v2-experiment.cjs <输出目录>`。浏览器分别执行报告列明的spec。生产构建后启动4173，执行 `node scripts/v21-production-check.mjs`。录像使用 `scripts/record-v21.mjs <目录> --record --weapon=arc` 与 `scripts/record-v21-weapons.mjs <目录>`。测试／录制／编码应顺序运行，避免污染性能采样。

音乐文件和生成器在 `public/audio/v21/`、`assets/audio-v21/`。元数据的建议增益是素材制作参考，运行时实际表以 `src/audio/stems.ts` 为准。视频使用游戏实时输出，记录AudioContext与墙钟映射后对齐，导出统一加6dB，没有替换为外部歌曲。静态合约页因浏览器录屏保留旧帧，以同次截图插入并标识。素材客观波形验证不等于人工试听；真实玩家反馈尚未收集。
