/** Authored translations for rule/catalog strings rendered by player interfaces. */
export const CONTENT_COPY: Record<string, string> = Object.fromEntries(
  `
火焰|Fire
雷电|Storm
冰霜|Frost
虚空|Void
跃迁|Shift
点燃目标，以余烬吞没敌群。|Ignite targets and engulf crowds in embers.
3 协议：燃烧伤害 +4 / 秒|3 protocols: burn damage +4 / s
在敌群间建立连锁电弧。|Chain arcs between enemies.
3 协议：电弧额外连接 1 个目标|3 protocols: arcs connect to 1 extra target
减速、穿透，让战场慢下来。|Slow and pierce to control the battlefield.
3 协议：减速强度额外 +10%|3 protocols: slow strength +10%
折弯弹道，牵引所有可能。|Bend trajectories and draw enemies together.
3 协议：引力奇点冷却 −20%|3 protocols: gravity cooldown −20%
在闪避间隙，创造爆发窗口。|Create burst windows between dashes.
3 协议：基础伤害 +4|3 protocols: base damage +4
赤核陨星|Crimson Mass
弹体变为缓慢的大型陨星；可叠加追踪、反弹与多发。|Heavy, slow meteors combine with homing, ricochet and multishot.
伤害 ×1.65 · 射击间隔 ×1.4|Damage ×1.65 · Firing interval ×1.4
星火胚芽|Solar Seeds
主弹首次命中时裂出三枚继承元素的微型弹。微型弹不会再次分裂或触发反应。|The first primary hit splits into three elemental fragments. Fragments cannot split again or trigger reactions.
分裂 3 发 · 每发 28% 伤害|3 fragments · 28% damage each
余烬协议|Ember Script
奥术弹点燃敌人，持续 3 秒。|Primary shots ignite enemies for 3 seconds.
燃烧 8 伤害 / 秒|Burn: 8 damage / s
恒星燃料|Star Fuel
强化已激活的燃烧，让余烬更具杀伤。|Strengthen an existing burn effect.
燃烧提升至 18 伤害 / 秒|Burn increased to 18 damage / s
焚毁回执|Funeral Bloom
直接攻击击杀敌人时，引爆附近敌人。|Direct kills cause an explosion around the defeated enemy.
爆炸 24 伤害 · 半径 100|Explosion: 24 damage · Radius 100
三重星火|Triple Sun
奥术弹变为三发扇射，每发伤害降低。|Fire three shots in a fan, with reduced damage per shot.
3 发弹体 · 单发伤害 ×75%|3 projectiles · Damage per shot ×75%
熔火弹头|Molten Shell
每次直接命中额外溅射周围目标。|Direct hits splash additional damage onto nearby targets.
溅射 25% 伤害 · 半径 65|Splash: 25% damage · Radius 65
燃烧轨迹|Cinder Wake
相位跃迁会留下持续燃烧的轨迹。|Dashing leaves a burning trail.
路径灼烧 · 持续 1.5 秒|Burning trail · Lasts 1.5 s
贯星光矛|Astral Lance
高速光矛穿过敌群，仍可叠加多发与反弹；射击间隔增加。|Fast lances pierce crowds and combine with multishot and ricochet, at a slower firing rate.
穿透 +3 · 弹速 ×2.4 · 间隔 ×1.35|Pierce +3 · Shot speed ×2.4 · Interval ×1.35
浮游使魔|Choir Wisp
一枚使魔围绕你，每 0.7 秒向准星射击，继承弹道与元素状态。|An orbiting wisp fires toward the reticle every 0.7 s, inheriting trajectories and elemental effects.
辅助射击 45% 伤害 · 不触发派生反应|Support fire: 45% damage · No secondary reactions
电弧引擎|Arc Engine
直接命中有 33% 概率将电弧传至附近敌人。|Direct hits have a 33% chance to arc to nearby enemies.
连锁 2 个目标 · 48% 伤害|Chain to 2 targets · 48% damage
并联回路|Parallel Circuit
增加电弧跳跃次数，覆盖更大敌群。|Add arc jumps to cover larger crowds.
连锁目标 +2|Chain targets +2
静电积蓄|Static Memory
更频繁地激活电弧引擎。|Trigger Arc Engine more often.
电弧触发概率 33% → 53%|Arc chance: 33% → 53%
临界电压|Critical Voltage
暴击率提升，暴击会电击目标周围敌人。|Increase critical chance. Critical hits shock nearby enemies.
暴击 +22% · 40% 范围伤害|Critical chance +22% · 40% area damage
超频脉冲|Overclock
缩短基础射击间隔。|Reduce the base firing interval.
射击间隔 −22%|Firing interval −22%
导电针阵|Conductive Needle
奥术弹穿透更多目标，让电弧沿弹道传播。|Pierce more targets and carry arcs through the crowd.
弹体穿透 +2|Projectile pierce +2
蜿蜒频谱|Serpent Wave
弹体沿波形前进，可叠加追踪、反弹和环绕。|Shots follow a wave and combine with homing, ricochet and orbit.
波动弹道 · 横向覆盖|Wave trajectory · Lateral coverage
碎星扇面|Shard Fan
每次射击增加两枚弹体，降低单发伤害。|Add two projectiles per attack, reducing damage per shot.
弹体 +2 · 单发伤害 ×70%|Projectiles +2 · Damage per shot ×70%
冰霜编码|Frost Code
直接命中施加寒冷，持续 2.5 秒。|Direct hits apply chill for 2.5 s.
敌人移速 −35%|Enemy movement speed −35%
脆化解析|Brittle Logic
对寒冷目标造成更多伤害。|Deal more damage to chilled enemies.
对减速目标伤害 +25%|Damage to slowed targets +25%
碎晶连锁|Shatter Signal
直接击杀寒冷目标时，伤害并减速附近敌人。|Direct kills on chilled targets damage and slow nearby enemies.
碎裂 20 伤害 · 半径 120|Shatter: 20 damage · Radius 120
永冻长针|Glacial Needle
提高基础伤害，奥术弹穿透一名敌人。|Increase base damage and pierce one additional enemy.
穿透 +1 · 伤害 +4|Pierce +1 · Damage +4
晶体装甲|Crystal Shell
强化生命容器，并恢复新增生命。|Increase maximum health and heal by the same amount.
最大生命 +40 · 恢复 40|Maximum HP +40 · Heal 40
棱镜反射|Prismatic Echo
子弹遇到竞技场边界会反射。|Shots ricochet off the arena boundary.
弹体反弹 2 次|Projectiles ricochet twice
微型星系|Little Cosmos
主弹先围绕你旋转，再飞向敌群；环绕半径逐渐扩大。|Primary shots orbit you before flying out; their orbit gradually expands.
星轨弹道 · 穿透 +2 · 间隔 ×1.2|Orbital trajectory · Pierce +2 · Interval ×1.2
逆因果回旋|Return Vector
弹体飞行后折返至你身边；无法反弹的边界提前返航，保留命中记录。|Shots return after flying out. Non-reflective boundaries trigger an early return; prior hit records remain.
回旋弹道 · 单发伤害 ×90%|Returning trajectory · Damage per shot ×90%
引力偏移|Gravity Bias
奥术弹逐渐弯向最近的敌人。|Shots curve toward the nearest enemy.
追踪弹道|Homing trajectory
事件视界|Event Horizon
扩大引力奇点的牵引和伤害范围。|Expand the gravity field's pull and damage radius.
奇点半径 115 → 155|Singularity radius: 115 → 155
终止指令|Terminal Command
对低生命目标造成更高伤害。|Deal more damage to enemies with low health.
目标低于 25% 生命时伤害 +50%|Damage +50% against targets below 25% HP
暗质回收|Dark Harvest
每击杀一个敌人，回收生命。|Recover health on every kill.
每次击杀恢复 1 生命|Restore 1 HP per kill
坍缩时钟|Collapse Clock
缩短引力奇点的冷却。|Reduce the gravity field cooldown.
E 冷却 −35%|E cooldown −35%
因果回响|Causal Echo
更频繁地释放湮灭脉冲，提高基础伤害。|Reduce pulse cooldown and increase base damage.
Q 冷却 −35% · 伤害 +4|Q cooldown −35% · Damage +4
镜像裂雨|Mirror Rain
每次 Dash 从起点向八个方向放出元素弹幕。|Each dash fires eight elemental shots from its starting point.
8 枚次生弹 · 每枚 45% 伤害|8 secondary shots · 45% damage each
双向因果|Janus Vector
射击同时向背后发出一枚次生弹，继承弹道和元素状态。|Firing also sends a secondary shot backward, inheriting trajectory and elemental effects.
背向弹体 · 65% 伤害|Rear shot · 65% damage
快速重编译|Quick Compile
缩短相位跃迁的冷却。|Reduce dash cooldown.
Dash 冷却 −30%|Dash cooldown −30%
相位护盾|Phase Guard
每次闪避时生成护盾，吸收之后的伤害。|Each dash creates a shield to absorb subsequent damage.
Dash 获得 12 护盾 · 上限 30|Dash grants 12 shield · Cap 30
跃迁新星|Shift Nova
闪避起点爆发冲击波，伤害周围敌人。|A shockwave damages nearby enemies at the start of a dash.
范围伤害 28 · 半径 120|Area damage 28 · Radius 120
零度闪移|Zero Shift
每次闪避时，减速附近敌人。|Dashing slows nearby enemies.
附近敌人减速 35% · 持续 3 秒|Nearby enemies slowed 35% · Lasts 3 s
越界射击|Phase Reload
闪避后短时间内，射击速度翻倍。|Double firing speed briefly after dashing.
Dash 后 0.7 秒射速 ×2|Firing speed ×2 for 0.7 s after a dash
轻量化躯壳|Light Frame
提高移动速度，更轻松地调整射击位置。|Move faster to reposition between attacks.
移动速度 +18%|Movement speed +18%
钉穿重弹|Pinning Round
主弹命中后停留 0.05 秒再贯穿；保留射击间隔代价，停留不会重复伤害同一敌人。|Primary shots pause for 0.05 s on impact before piercing. The firing interval cost remains; the pause cannot damage the same target twice.
回锋冰刃|Returning Frostblade
圣剑限定：第三斩改为穿透回收冰刃，失去本次宽扇面斩击与扫弹；回程不重复命中同一目标。|Sword only: the third slash becomes a piercing, returning frostblade, replacing its wide arc and projectile clearing. It cannot hit the same target twice.
电浆回路|Plasma Circuit
电弧命中燃烧目标时，将 1 秒燃烧转化为小范围电浆爆发。|Arcs convert 1 second of burning on a target into a small plasma burst.
超导棱晶|Superconductor
电弧优先连接寒冷目标，并可额外跳跃一次。|Arcs prioritize chilled targets and gain one extra jump.
热裂变|Thermal Fission
再次命中燃烧且寒冷的敌人，消耗旧状态引发热冲击；每目标 1.2 秒一次。|Hit a burning and chilled enemy again to consume both effects in a thermal burst. Once per target every 1.2 s.
星轨棱镜|Orbital Prism
反弹后追踪更强；首次反弹延长寿命，每次反弹伤害衰减 15%。|Stronger homing after ricochet. The first bounce extends lifetime; each bounce loses 15% damage.
坍缩火种|Collapse Seed
奇点内的命中将溅射转移到奇点中心，形成更大的坍缩爆发。|Hits inside a singularity move their splash to its center, creating a larger collapse burst.
瞬电残响|Volt Afterimage
Dash 后的前 3 次射击，在起点额外发射一枚继承弹道的电针。|The first 3 attacks after a dash fire an extra electric needle from the dash origin, inheriting the trajectory.
停留 · 贯穿 · 重击|Pin · Pierce · Impact
陨星和光矛改变同一枚弹体：命中后短暂停留，再贯穿后方目标。发射间隔更长，站位决定贯穿效果。|Meteor and lance reshape the same projectile: it pauses on impact, then pierces targets behind it. Longer firing intervals make positioning essential.
圣剑体验 · 第三斩变形|Sword trial · Rewritten finisher
前两斩近身推开敌人；第三斩化为回收冰刃，失去宽扇面攻击与扫弹。回程不会重复命中同一目标。|The first two slashes push enemies back. The third becomes a returning frostblade, replacing its wide arc and projectile clearing. Each target is hit only once.
三相炼星|Triune Star
重弹 · 扇射 · 热裂变|Heavy rounds · Fan · Thermal fission
橙色陨星携带冰霜，连续命中引爆冷热冲击。|Frost-bearing orange meteors trigger thermal bursts on repeated hits.
折光星群|Refracted Stars
追踪 · 反弹 · 分裂|Homing · Ricochet · Split
分裂弹追逐目标，在墙边折回并延长星轨。|Split shots seek targets and ricochet off boundaries with longer lifetimes.
电浆圣歌|Plasma Hymn
连锁 · 燃烧 · 浮游炮|Chain · Burn · Wisp
浮游使魔同步开火，将燃烧敌群变成电浆回路。|A wisp joins your fire as burning crowds become plasma circuits.
冰环天体|Frost Orbit
环绕 · 寒冷 · 波动|Orbit · Chill · Wave
弹体沿身周星轨旋转，再追向附近目标。|Shots orbit your position before seeking nearby enemies.
裂隙光矛|Rift Lance
高速光矛 · 穿透 · 坍缩|Fast lances · Pierce · Collapse
用 E 聚拢敌群，让穿透光矛在奇点中央引爆。|Group enemies with E and detonate piercing lances at the singularity center.
相位织雨|Phase Rain
回旋 · 残响 · 全向闪避|Return · Afterimage · Dash volley
Dash 留下射击残像，双向弹幕在回程再次压制敌人。|Dashes leave firing echoes; returning two-way volleys cover enemies on their return path.
奥术法器|Arc Catalyst
黎明圣剑|Dawnbringer
裂核重炮|Rift Howitzer
高频远射，把多发、追踪与元素编织成弹幕。|Rapid ranged fire weaves multishot, homing and elements into a barrage.
三段扇形斩击，终段重劈。挥砍可斩除前方敌弹；弹道协议化为符文剑气。|Three sweeping slashes end with a heavy finisher. Slashes clear projectiles ahead; trajectory protocols become rune blades.
缓慢发射高冲击炮弹，直接命中与范围爆破。穿透、反弹和追踪可同时生效。|Slow, heavy shells deal impact and blast damage. Pierce, ricochet and homing combine.
远程 · 高频 · 弹幕|Ranged · Rapid · Barrage
近战 · 三连斩 · 斩弹|Melee · Three-hit combo · Clear shots
重炮 · 低频 · 爆破|Artillery · Slow · Blast
生命刻印|Vitality Inscription
行者药匣|Wayfarer's Case
拾荒契约|Scavenger Contract
新行动生命上限 +10；最多 3 级。|New runs: maximum HP +10 per rank. Maximum 3 ranks.
新行动多携带 1 瓶灵药；最多 2 级。|New runs: 1 extra tonic per rank. Maximum 2 ranks.
新行动初始金币 +6；最多 3 级。|New runs: starting coins +6 per rank. Maximum 3 ranks.
战地修复|Field Repair
立即恢复 35 生命|Immediately restore 35 HP
封装灵药|Sealed Tonic
灵药 +1，R 恢复 40 生命|Tonic +1; use R to restore 40 HP
符文炸弹|Rune Bomb
炸弹 +1，B 投放 / 营地破锁|Bomb +1; B to deploy / crack a camp lock
遗迹钥匙|Relic Key
钥匙 +1，解锁额外协议|Key +1; unlock an extra protocol
协议决定弹道、命中与攻击节奏|Protocols shape trajectory, impact and attack rhythm
弹体化为穿透刃，射击间隔略增|Shots become piercing blades with a slightly longer firing interval
弹体获得小范围爆破，弹速降低|Shots gain a small blast and lose speed
第三斩携带符文剑气|The third slash releases a rune blade
第一处斩击命中引出冲击波|The first slash impact releases a shockwave
炮弹命中后碎成微型弹|Shell impacts release miniature fragments
炮弹化为穿甲刃，爆破范围缩小|Shells become armor-piercing blades with a smaller blast
静默矩阵|Silent Array
遗忘回廊|Forgotten Gallery
破碎档案|Fractured Archive
星屑祭坛|Stardust Altar
回声熔炉|Echo Furnace
边界花园|Boundary Garden
守门人协议|Gatekeeper Protocol
零号神谕|Oracle Zero
修复圣所|Restoration Sanctum
遗失的缓存|Lost Cache
高危异常 · 双重协议|High-risk anomaly · Dual protocol
核心实体 · 访问受限|Core entity · Access restricted
异常区域 · 清除入侵实体|Anomaly zone · Clear intruding entities
沉钟圣所|Hollow Belfry
悼亡林地|Mourning Grove
余烬铸庭|Cinder Court
钟还在响，守门人仍未换班。|The bell still rings. The gatekeeper's relief never came.
她让所有的名字，都长成了树。|She grew every name into a tree.
一座没有居民的城，仍然需要温暖。|A city without residents still needs warmth.
失温工坊|Cold Workshop
失落档案|Lost Archive
逆响遗迹|Inverse Ruins
渡鸦行商|Raven Trader
封缄试场|Sealed Trialground
无名篝火|Nameless Campfire
封存武库|Sealed Armory
第七守门人|Seventh Gatekeeper
挽歌圣母|Matron of Elegies
灰烬执政官|Ash Regent
迟到的砂|Belated Sand
跃迁冷却缩短 15%；跃迁时削减主武器 0.18 秒攻击冷却。|Dash cooldown −15%; dashing removes 0.18 s from the primary attack cooldown.
每一粒沙都比钟声晚落下一秒。只有守钟人知道，多出来的一秒属于谁。|Each grain falls one second after the bell. Only its keeper knows who owns that extra second.
空心机芯|Hollow Mechanism
有武装熔接时，主武器伤害提高 12%。|Primary weapon damage +12% while a weapon form is fused.
中央的孔洞不是损坏。图纸要求那里必须留下一个人的位置。|The central hollow is deliberate. The plans reserve that space for a person.
守门人的断誓|Gatekeeper's Broken Vow
剑弧范围 +24；获得圣剑印记时额外获得 15 护盾。|Sword reach +24; gaining the sword form grants 15 shield.
誓言只剩下后半句：“……直到他们回来。”|Only the end of the vow remains: "...until they return."
无声摇篮|Silent Cradle
清场额外恢复 8 生命；灵药多恢复 10。|Clearing a room restores 8 extra HP; tonics restore 10 extra HP.
瓶中没有液体。倾斜它时，却能听见有人在床沿轻轻坐下。|The vial is empty. Tilt it and you hear someone sit gently at the edge of a bed.
未冷却的心|Uncooled Heart
炸弹伤害 +35%；战斗开始时获得 10 护盾。|Bomb damage +35%; gain 10 shield at the start of combat.
炉火已熄灭七百年。它仍在替一座不存在的城供暖。|The furnace went cold seven centuries ago. It still warms a city that no longer exists.
零号遗瞳|Eye of Zero
暴击率 +12%；三种武装齐备时武装伤害额外 +15%。|Critical chance +12%; weapon damage +15% with all three forms.
最后一条预测写着：不要相信最后一条预测。|The final prediction reads: do not trust the final prediction.
门后无人|No One Beyond the Door
踏入沉钟圣所|Enter the Hollow Belfry
门上的通行灯仍然亮着。登记簿最后一页，所有离开的人都签了“明日归来”。|The entry light still glows. Everyone on the register's final page wrote, "Back tomorrow."
保存期限|Shelf Life
抵达悼亡林地|Reach the Mourning Grove
根须穿过病床，却小心绕开枕头。温室系统每日仍播报：今日，无人离世。|Roots cross the hospital beds, carefully avoiding the pillows. Every day the greenhouse announces: no deaths today.
余温|Residual Warmth
抵达余烬铸庭|Reach the Cinder Court
熔炉的耗能记录归零了。工人的餐盒却每到黄昏就会重新变热。|The furnace's energy log reads zero. At dusk, the workers' lunchboxes become warm again.
第七次值守|The Seventh Watch
击败第七守门人|Defeat the Seventh Gatekeeper
前六位守门人的名字，都刻在同一副盔甲内侧。第七个位置只写着一个日期。|Six gatekeepers' names are carved inside the same armor. The seventh space contains only a date.
缺席的合唱|The Absent Choir
击败挽歌圣母|Defeat the Matron of Elegies
唱诗名单里有三百个名字。录音中，只有一个声音在等待别人跟上。|Three hundred names fill the choir roster. In the recording, one voice waits for the others to join.
停炉令|Shutdown Order
击败灰烬执政官|Defeat the Ash Regent
命令已经签署，交接人一栏却空着。他一直没有等到接班的人。|The order was signed, but the handover field is blank. His replacement never arrived.
最后的误差|The Last Error
击败零号神谕|Defeat Oracle Zero
它预测过所有人的死亡。某一行后面，却被反复加上了一个问号。|It predicted everyone's death. One entry, however, keeps gaining another question mark.
湿掉的信|The Soaked Letter
读取一座失落档案|Read a Lost Archive
“如果树又开花，就不要再唤醒我。”落款被水洗掉了，信纸却一直是干的。|"If the tree blooms again, do not wake me." Water erased the signature, yet the paper has always been dry.
倒置的钟|The Inverted Bell
触碰遗迹中的钟|Touch the bell in the ruins
钟槌悬在下方。每当它敲响，尘埃便短暂地升回梁上。|The clapper hangs below. Whenever it rings, dust briefly rises back to the rafters.
异物缝合|Grafting the Unfamiliar
熔接第二种武装|Fuse a second weapon form
工匠拒绝称它为武器。“只是让不相容的东西，再一起活一会儿。”|The artisan refuses to call it a weapon. "Just letting incompatible things live together a little longer."
旧债|Old Debt
接受遗迹的血誓|Accept the ruins' blood pact
祭坛认得你的血，却把它记在了另一个人的账上。|The altar recognizes your blood, but credits it to someone else's account.
三个人的影子|Three People's Shadows
在一局集齐三种武装|Collect all three weapon forms in one run
你抬起手时，影子晚了一拍。其中两个，似乎仍握着别人的东西。|You raise your hand; the shadows follow a beat late. Two still seem to hold someone else's belongings.
追逐靠近，接触攻击。曾是为行人刻印路标的侍从。|Chases and attacks on contact. Once an attendant who engraved waymarks for travelers.
保持距离后锁定射击。仍在等候一张早已作废的通行证。|Keeps its distance and fires aimed shots. Still awaiting a long-expired pass.
沿红色预警线冲锋，恢复期暴露破绽。|Charges along the red warning line. Vulnerable while recovering.
在目标脚下编织延迟爆破，离开紫色危险区。|Weaves delayed blasts beneath you. Leave the purple danger zones.
为附近实体修复生命，优先打断中继。|Heals nearby entities. Prioritize this relay.
投放三段延迟爆破，连续移动离开橙色预警。|Lays three delayed blasts. Keep moving out of orange warnings.
为同伴添加临时护盾，再发射扩散音符。|Shields allies, then fires spreading notes.
消失后在侧翼显形，先观察落点，再规避扇形冰针。|Vanishes and reappears on your flank. Watch its landing before dodging the frost fan.
散射、突进、环形轰击。守护一扇再也无人通过的门。|Fan shots, charges and radial strikes. Guards a door no one passes through anymore.
同心音浪、根网、召唤唱诗者。她保存了所有名字，却保存不了回应。|Concentric sound waves, root webs and summoned cantors. She preserved every name, but no reply.
十字熔断、重型冲锋、延迟炉火。停炉令仍未有人签收。|Cross-shaped blasts, heavy charges and delayed furnace fire. No one has accepted the shutdown order.
旋转双向激光、径向弹幕、召唤增援。它把希望当成了最后一个错误。|Rotating twin lasers, radial volleys and reinforcements. It considers hope the final error.
猎手|Hunter
哨戒者|Sentry
冲锋者|Lancer
编织者|Weaver
中继者|Conduit
爆破者|Bomber
唱诗者|Cantor
暗影|Shade
基础伤害|Base damage
协议基础间隔|Base firing interval
发射数|Shot count
燃烧强度|Burn strength
连锁跳数|Arc jumps
穿透次数|Pierce count
反弹次数|Ricochets
减速|Slow
暴击率|Critical chance
移速|Move speed
跃迁冷却|Dash cooldown
脉冲冷却|Pulse cooldown
引力冷却|Gravity cooldown
弹速|Shot speed
最大生命|Maximum HP
已集齐同系协议；还需获得对应基础状态效果才能触发加成。|Element threshold reached; acquire its base status effect to activate the bonus.
弹体先绕身运行；需要靠近目标，让轨道覆盖敌人。|Shots orbit first; move close enough for the orbit to cover targets.
弹体飞出后折回，可命中去程漏过的敌人；同一弹体不会重复命中同一目标。|Returning shots can hit enemies missed on the outward path. Each shot can hit a target only once.
弹体更重、更慢；提前瞄准移动敌人的去向。|Heavier, slower shots require leading moving targets.
数值先作用于协议；圣剑将多发、弹道转为剑气，挥砍有独立倍率。|Values modify protocols first; the sword converts multishot and trajectories into blades, with separate slash multipliers.
数值先作用于协议；重炮再应用独立伤害、弹速和攻击间隔倍率。|Values modify protocols first; the cannon then applies separate damage, speed and interval multipliers.
法器|Catalyst
圣剑|Sword
重炮|Cannon
保持距离，持续压制|Keep your distance and sustain fire
弹道需要追踪目标；用减速与引力创造命中窗口。|Lead moving targets; use slow and gravity to create openings.
多发改变覆盖角，穿透与追踪直接改写弹道。|Multishot widens coverage; pierce and homing reshape trajectories.
贴近破阵，第三击收割|Close in; finish with the third strike
挥砍能扫除敌弹；重击后恢复更久，需要预留退路。|Slashes clear projectiles. A longer recovery after heavy strikes requires an escape route.
多发扩展扇面并产生剑气；燃烧与连锁由近身命中触发。|Multishot widens slashes and creates rune blades; melee hits trigger burn and chain.
聚拢敌人，一发破局|Group enemies and break through in one shot
弹体慢、回膛久；爆破奖励预判与目标聚集。|Slow shells and long reloads reward prediction and tightly grouped targets.
重弹放大爆破半径；追踪与控制弥补慢弹的命中代价。|Heavy rounds enlarge the blast; homing and control help slow shots connect.
挥砍距离|Slash reach
爆破半径|Blast radius
每次弹数|Shots per attack
聚群试炼|Crowd Trial
交叉火线|Crossfire
守门人|Gatekeeper
猎手靠近形成群体，检验覆盖、连锁与控制。|Hunters close in together, testing coverage, chains and control.
冲锋逼迫移动；用掩体断开射线，再寻找输出位置。|Charges force movement. Break firing lines with cover, then find an attack position.
提前知道下一场是单体：继续对群，还是转向稳定单体？|A single boss awaits. Keep your crowd build or trade it for consistent single-target damage?
持续压制|Sustained pressure
持续伤害需要时间结算，不能立即清除威胁。|Damage over time takes time to resolve and cannot remove threats immediately.
群体连锁|Crowd chains
附近没有额外目标时，连锁收益下降。|Chains lose value when no extra targets are nearby.
争取空间|Create space
提供减速，不直接提高单发基础伤害。|Provides slow without increasing base damage per shot.
扇形覆盖|Fan coverage
每发伤害降至 75%，远处小目标可能只中一发。|Each shot deals 75% damage. Distant small targets may be hit by only one.
稳定射速|Steady fire
更多射击需要更稳定的瞄准，不扩大覆盖范围。|More shots require steadier aim and do not widen coverage.
修正弹道|Correct trajectories
追踪不保证命中，仍受地形与目标移动影响。|Homing does not guarantee hits; terrain and moving targets still matter.
重型弹体|Heavy projectiles
基础伤害提高，射击间隔与弹道速度同时付出代价。|Higher base damage costs firing rate and projectile speed.
直线穿透|Linear pierce
对单体没有额外穿透目标，不能把穿透次数当伤害倍率。|Pierce needs additional targets. Its count is not a single-target damage multiplier.
强化燃烧|Stronger burn
需先装备余烬，占用两个协议槽。|Requires Ember Script; together they occupy two slots.
战术验证场|Tactical Field
行动演练|Run tutorial
电浆剑舞|Plasma Sword Dance
弹道折光|Refracted Trajectory
电浆|Plasma
坍缩|Collapse
共鸣|Resonance
护盾|Shield
生命|HP
金币|coins
碎片|shards
灵药|tonic
炸弹|bomb
协议|protocol
秒|s
免费|Free
熔接|Fuse 
战斗|Combat
精英|Elite
未绑定|Unbound
左摇杆|Left stick
右摇杆|Right stick
左键|LMB
右键|RMB
鼠标|Mouse
完成|Complete
恢复|Restore 
修复|Repair 
名称|Name
当前|Current 
攻击|Attack
选择|Select 
撤下|Remove 
装备|Equip 
层|sector
区域|Sector
累计|Total 
地图|Map
路线|Route
技能|Skills
移动|Move
暂停|Pause
冲刺|Dash
倒计时|Countdown
未激活|Inactive
已激活|Active
阶段|Stage
冷却|Cooldown
准备|Prepare
普通|Normal
收集|Collect
清场|Clear
生命上限|Max HP
形态|Form
武装|Weapon
天赋|Talent
确认|Confirm
训练|Training
记录|Record
返回|Back
开启|Enable
静音|Mute
攻击间隔|Attack interval
伤害|Damage
能量|Energy
剩余|Remaining
时间|Time
目标|Target
半径|Radius
波次|Wave
敌人|Enemies
速度|Speed
按键| key
取舍|Tradeoff
模型|Model
资料日期|Library date
无敌|Invulnerable
已选择|Selected
已锁定|Locked
未生成|Not generated
未收录|Not collected
已收录|Collected
售罄|Sold out
主|Primary
改造|Modifier
伤害提升|Damage increase
本次|This run 
项| entries
种| types
条| entries
发| shots
个| 
第|Sector 
还缺|Requires 
已形成|Active
精英冲锋者|Elite Lancer
；|; 
：|: 
、|, 
。|. 
「|“
」|”
`
    .trim()
    .split('\n')
    .map((row) => {
      const split = row.indexOf('|');
      return [row.slice(0, split), row.slice(split + 1)];
    }),
);
