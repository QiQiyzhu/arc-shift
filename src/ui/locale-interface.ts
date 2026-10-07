/** Menus, encounters, tutorials and activity controls. */
export const INTERFACE_COPY: Record<string, string> = Object.fromEntries(
  `
已购入|Purchased: 
每站库存一份。|One of each item per stop.
封存箱已开启：获得|Sealed chest opened. Acquired: 
所有协议已拥有，转换为 18 金币。|All protocols owned; converted to 18 coins.
破锁回收：金币 +18，碎片 +2；箱内协议已损毁。|Lock salvaged: coins +18, shards +2. The protocol inside was destroyed.
血誓已缔结：生命 −30，金币 +20，碎片 +2。|Blood pact taken: HP −30, coins +20, shards +2.
枚碎片已送回营地，本次死亡也不会遗失。|shards sent to camp. They are protected even if this run ends in defeat.
整合后变化|After integration
史诗|Epic
稀有|Rare
标准|Standard
激活|Activate 
共鸣方向|Resonance path
整合此协议|Integrate protocol
选择你的初始协议|Choose your first protocol
力量，等待被改写。|Power, waiting to be rewritten.
本次随机武器|This run's random weapon
选择一种元素，开始跃迁。|Choose an element and begin your shift.
形态 × 弹道 × 元素。预览这次选择将激活的共鸣。|Form × trajectory × element. Preview the resonance this choice will activate.
让战术教练比较这三张|Ask the coach to compare these cards
选择 1 项 · 本次行动持续生效|Choose 1 · Active for this entire run
初始选择 / 01|Initial choice / 01
区域净化奖励 / 0|Sector reward / 0
圣剑：元素强化剑弧，弹道协议化为次生剑气，多发扩大挥砍范围。|Sword: elements empower the arc, trajectory protocols become rune blades, and multishot expands the slash.
本次重抽已用尽|No rerolls remaining
金币 · 重抽协议|coins · Reroll protocols
遗迹|Ruins
生命、金币与未知协议的交换|Exchange health, coins and unknown protocols
代价由你选择|You choose the price
行商|Trader
购买补给 · 安全归档碎片|Buy supplies · Bank shards safely
安全区域|Safe area
工坊|Workshop
熔接武装 · 混搭流派|Fuse weapons · Combine builds
首次早期熔接免费，后续 18 金币|First early fusion free; later fusions cost 18 coins
档案|Archive
记忆残片 · 4 碎片 · 协议 ×1|Memory fragment · 4 shards · 1 protocol
守点|Holdout
驻守 18 秒 · 5 碎片 · 协议 ×1|Hold for 18 s · 5 shards · 1 protocol
守住中央符阵；最多五波敌人|Hold the central sigil; up to five waves
协议 ×1 · 恢复 12 生命|1 protocol · Restore 12 HP
标准异常|Standard anomaly
稀有协议保障 · 额外经验与碎片|Guaranteed rare protocol · Extra XP and shards
强化实体 · 高风险|Enhanced entities · High risk
恢复 50 生命 · 协议 ×1|Restore 50 HP · 1 protocol
宝藏|Treasure
协议 ×1 · 金币 +16 · 钥匙 +1|1 protocol · Coins +16 · Key +1
核心|Core
解除核心锁定|Remove the core lock
多阶段实体 · 极高风险|Multi-phase entity · Extreme risk
NETWORK TOPOLOGY // 选择路径|NETWORK TOPOLOGY // CHOOSE A ROUTE
下一次跃迁，去往何处？|Where will your next shift take you?
先整理资源，再决定下一站。营地交易可全部跳过。|Prepare your resources, then choose a destination. All camp trades are optional.
跃迁至此区域|Travel to this sector
进入区域时自动保存 · 可从主界面继续行动|Saved on entering a sector · Continue from the main menu
当前混搭武装|Current fused weapons
形态改写|Form Rewrite
无额外异变|No additional mutation
疾行：敌人移动速度 +20%|Haste: enemy movement speed +20%
荆棘：敌人携带 18 护盾|Thorns: enemies carry 18 shield
狂热：敌人伤害 +15%|Fervor: enemy damage +15%
THE LAST PILGRIMAGE / 路线规划|THE LAST PILGRIMAGE / ROUTE PLAN
钟声尽头|Beyond the Last Bell
查看整条路线，再选择相连的下一站。每次经过，都会关闭其他岔路。|Inspect the full route, then choose a connected stop. Traveling closes the other branches.
十二层分支地图|Twelve-sector branching map
可前往|Reachable
已走过|Visited
预览|Preview
恢复 55 生命或补充一瓶灵药|Restore 55 HP or take a tonic
免费熔接武装或回收物资；钥匙可开启额外协议箱|Fuse a weapon for free or salvage supplies; a key opens an extra protocol chest
前往此处|Travel here
已经过|Visited
尚未连接|Not connected
◇ 亮线：下一站|◇ Bright lines: next stops
✓ 已走过|✓ Visited
点击远处节点可预览|Click distant stops to preview
进度已自动保存|Progress saved automatically
“留下旧的那一件。”工匠指了指你的影子，“它还没有走够远。”|"Leave the old one." The artisan points at your shadow. "It has not traveled far enough."
三把武器，挂在同一个人的衣钩上。架子下面，只有一双靴子。|Three weapons hang on one person's hook. Beneath the rack stands a single pair of boots.
没有收件人的信|A Letter to No One
“如果树又开花，就不要再唤醒我。”落款被水洗掉了。|"If the tree blooms again, do not wake me." Water erased the signature.
倒置的钟静静悬着。祭坛下方，一笔尚未偿清的旧债亮起了你的名字。|The inverted bell hangs in silence. Beneath the altar, an unpaid debt lights up with your name.
“价格没有涨。只是你带回来的明天，越来越少了。”|"Prices have not risen. You simply bring back fewer tomorrows."
这里还有一个温热的座位。火光里，有人替你留了最后一瓶药。|One seat is still warm. In the firelight, someone has saved the last tonic for you.
修复行装|Repair loadout
恢复 25 生命|Restore 25 HP
回收旧物|Salvage supplies
20 金币 · 3 碎片|20 coins · 3 shards
收起这封信|Keep the letter
收录记忆 · 4 碎片 · 选择一项协议|Record memory · 4 shards · Choose a protocol
在火边歇息|Rest by the fire
恢复 55 生命|Restore 55 HP
带走那瓶药|Take the tonic
灵药 +1，最多携带 3 瓶|Tonic +1 · Carry up to 3
敲响倒钟|Ring the inverted bell
10 金币 · 选择一项协议 · 记忆残片|10 coins · Choose a protocol · Memory fragment
偿还旧债|Repay the old debt
生命 −30 · 金币 +24 · 碎片 +3|HP −30 · Coins +24 · Shards +3
离开行商|Leave trader
不再停留|Move on
每处仅能选择一项主要行动。额外交易独立结算。|Choose one main action per encounter. Additional trades are handled separately.
已归档碎片|Banked shards
出发时携带一件遗器，局内可在工坊继续熔接。|Carry one relic when setting out; fuse more at workshops during the run.
无击破要求|No boss requirement
已装备 · 卸下|Equipped · Remove
携带此遗器|Carry this relic
击败|Defeat 
后解锁| to unlock
碎片 · 解锁|shards · Unlock
记忆|Memories
有些空白，也许本来就没有答案。|Some blank pages may never have had an answer.
未拾得的记忆|Unrecovered memory
还没有人把这一页带回来。|No one has brought this page back yet.
全部实体|All entities
游荡者|Wanderers
核心实体|Core entities
已记录|Recorded
尚未清除|Not yet defeated
跨系共鸣图谱|Cross-element resonance atlas
血誓祭坛|Blood Pact Altar
献出 30 生命，换取 20 金币与 2 碎片。不能献出最后的生命。|Sacrifice 30 HP for 20 coins and 2 shards. The pact cannot take your last health.
本区血誓已完成|Pact already taken in this sector
生命 −30 · 缔结血誓|HP −30 · Take blood pact
碎片中继站|Shard Relay
付 8 金币，把全部|Spend 8 coins to bank all
枚随身碎片送回营地。未归档部分在失败时损失一半。|carried shards. Half of unbanked shards are lost on defeat.
本区已完成归档|Already banked in this sector
8 金币 · 安全归档|8 coins · Bank safely
所有交易都是可选的；资源和选择立即保存。|All trades are optional; resources and choices are saved immediately.
浏览器存储不可用：交易与归档仅在本次会话有效，关闭页面后可能丢失。|Browser storage is unavailable. Trades and banking last only for this session and may be lost on closing the page.
钥匙可保全|A key preserves
金币缓存|Coin cache
；炸弹将其拆成 18 金币和 2 碎片。|; a bomb salvages 18 coins and 2 shards.
操作与手柄|Input & controller
标准手柄已连接|Standard controller connected
键盘 / 鼠标|Keyboard / mouse
左摇杆移动 · 右摇杆瞄准 · RT 攻击 · A 跃迁 · LB 脉冲 · RB 引力 · X 炸弹 · Y 灵药 · Start 暂停。菜单和选卡使用鼠标。|Left stick: move · Right stick: aim · RT: attack · A: dash · LB: pulse · RB: gravity · X: bomb · Y: tonic · Start: pause. Use the mouse for menus and cards.
向上移动|Move up
向下移动|Move down
向左移动|Move left
向右移动|Move right
清弹脉冲|Projectile-clearing pulse
饮用灵药|Drink tonic
操作配置已保存。|Input settings saved.
存储不可用，操作配置在本次会话有效。|Storage is unavailable; input settings last for this session.
摇杆死区|Stick deadzone
重复按键会被拒绝；方向键仍是备用移动键。浏览器首次识别手柄时，请按一下手柄按钮。|Duplicate bindings are rejected; arrow keys remain alternate movement controls. Press a controller button so the browser can detect it.
恢复默认操作|Restore default controls
先找到自己的节奏|Find your rhythm
移动。脚下白环标记你的位置；先走出一小段距离。|to move. The white ring marks your position; travel a short distance.
让第一发准确命中|Make the first shot count
用准星瞄准右上方的固定靶，按住|Aim at the fixed target in the upper right and hold
穿过危险的间隙|Slip through danger
一边移动，一边按|While moving, press
跃迁。红色预警意味着攻击即将到来。|to dash. Red telegraphs warn of incoming attacks.
给自己留一条退路|Leave yourself an escape
释放近身脉冲：伤害、减速敌人，并清除附近敌弹。|to pulse: damage and slow nearby enemies, and clear their projectiles.
让协议，改写同一次攻击|Rewrite a single attack with protocols
选择一种组合，观察元素、轨迹和命中规则如何相互作用。|Choose a combination and observe how elements, trajectories and hit rules interact.
现在，让组合真正运转|Put the combination to work
用圣剑近身点燃敌人，再由电弧连接燃烧目标，观察电浆如何消耗状态爆发。|Ignite enemies with close sword strikes, then watch arcs consume burning effects in plasma bursts.
用法器选好角度。追踪弹反弹后更快转向，但每次反弹损失部分伤害。|Find an angle with the catalyst. Homing strengthens after ricochet, but each bounce costs damage.
读懂红线，再出手|Read the red line, then strike
击败守门人。预警时侧向跃迁，利用攻击后的空隙贴近输出。演练不会扣除生命。|Defeat the gatekeeper. Dash sideways during warnings, then close in during recovery. Tutorial attacks cannot reduce your health.
你已经掌握跃迁的语言|You have learned the language of shifting
正式行动随机起始武器；用协议改写攻击，再在工坊选择适合当前打法的形态修饰。|Live runs begin with a random weapon. Rewrite its attacks with protocols, then choose fitting form modifiers at workshops.
选择演练共鸣|Choose a tutorial resonance
演练完成|Tutorial complete
熔接这套共鸣|Fuse this resonance
净化实体|Entities purified
爆发反应|Burst reactions
爆发反应只统计电浆、热裂变和坍缩；折光等共鸣不计入。|Burst reactions count plasma, thermal fission and collapse only; prism and other resonances are excluded.
进入正式行动|Begin a live run
退出行动演练|Exit tutorial
仅计电浆 / 热裂变 / 坍缩|Plasma / Thermal fission / Collapse only
跳过当前提示|Skip this prompt
三种武装|Three weapons
正式行动随机获得法器、圣剑或重炮；相同种子保持相同武器，读档保留原武器。工坊熔接会改造主攻击的弹体或命中效果。近距离剑击推开普通敌人，短促顿挫不会冻结玩家移动；首领抵抗击退。陨星＋光矛形成停留后贯穿的重弹。回旋＋冰霜把圣剑第三斩改为回收冰刃，失去这次宽扇面攻击和扫弹。激光不能斩除。|Live runs randomly begin with a catalyst, sword or cannon; seeds and saves preserve that choice. Workshop fusions modify the primary attack. Close sword hits push ordinary enemies back; brief hit pauses do not freeze player movement. Bosses resist knockback. Meteor + Lance creates a pinning, piercing round. Return + Frost replaces the sword finisher with a returning frostblade, sacrificing its wide slash and projectile clearing. Lasers cannot be cut.
消耗品|Consumables
B 在准星方向投放炸弹，0.8 秒后爆破并清弹，不伤自己；R 消耗灵药恢复 40 生命，满血不会消耗。|B places a bomb toward the reticle. It explodes after 0.8 s, clearing projectiles without harming you. R consumes a tonic to restore 40 HP; none is consumed at full health.
清场经营|Between encounters
金币买补给或重抽卡牌，钥匙保全箱内协议，炸弹破锁回收资源；血誓以生命换购买力。交易全部可跳过。|Buy supplies or reroll cards with coins. Keys preserve chest protocols; bombs salvage locked resources. Blood pacts trade health for purchasing power. All trades are optional.
局外成长|Camp progression
碎片可提前归档。失败仅带回随身碎片的一半，胜利全部带回并奖励 8 枚；营地升级只影响新行动。|Bank shards early to protect them. Defeat returns half of carried shards; victory returns all plus 8. Camp upgrades affect new runs only.
沿移动方向快速穿过敌人和弹幕；静止时沿准星方向。冷却 1.2 秒。|Dash through enemies and projectiles in your movement direction, or toward the reticle while standing still. Cooldown: 1.2 s.
Q 对近身敌人造成伤害和减速，清除范围内弹幕。冷却 6 秒。|Q damages and slows nearby enemies while clearing projectiles in range. Cooldown: 6 s.
E 在瞄准方向投放引力场，牵引普通敌人并持续造成伤害。冷却 10 秒。|E places a gravity field toward the reticle, pulling ordinary enemies and dealing continuous damage. Cooldown: 10 s.
完整行动|Full expedition
全图预览 → 沿连线选择节点 → 战斗或遭遇。第 4、8、12 层为核心。中央祝祷符阵加速 Q/E；红色陷阱周期触发；实体墙体会阻挡移动、闪避和子弹。守点需在中央半径 100 内累计驻守 18 秒。|Preview the map → choose a connected stop → fight or resolve an encounter. Cores await in sectors 4, 8 and 12. Central blessing sigils accelerate Q/E recovery. Red traps activate periodically. Solid walls block movement, dashes and shots. Holdouts require 18 accumulated seconds within radius 100 of the center.
进度保存|Saving progress
自动记录区域入口、清场奖励和营地交易。战斗中关闭页面会回到该区入口，血量、击杀和消耗品也恢复到入口状态；已完成的营地交易不会重置。|Sector entries, clear rewards and camp trades are saved automatically. Closing the page in combat returns you to that sector's entry, including its health, kills and consumables. Completed camp trades are preserved.
`
    .trim()
    .split('\n')
    .map((row) => {
      const split = row.indexOf('|');
      return [row.slice(0, split), row.slice(split + 1)];
    }),
);
