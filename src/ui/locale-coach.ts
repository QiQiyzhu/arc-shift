import library from '../coach/strategy-library.json';

const plans: Record<string, [string, string, string]> = {
  'arc-single': [
    'Arc pressure on a single target',
    'Ember Script ignites targets and Star Fuel strengthens the burn. Critical Voltage improves critical hits, Overclock increases firing speed, and Gravity Bias helps shots turn. Direct hits may trigger arcs; arcs connecting to other burning enemies can trigger Plasma Circuit.',
    'Keep hitting to sustain burn. Homing turns gradually, so keep aiming. Arc and critical area damage need nearby enemies and do not benefit an isolated target.',
  ],
  'arc-swarm': [
    'Chained arcs for crowd clearing',
    'Triple Sun and Conductive Needle widen direct-hit coverage. Ember spreads burn, while Arc Engine and Parallel Circuit connect the crowd. Solar Seeds adds fragments; arcs hitting burning targets can trigger plasma.',
    'Spread-out enemies limit arc connections, and fan shots can miss small targets. Fragments inherit elemental effects but cannot split again or trigger secondary reactions such as arcs or thermal fission.',
  ],
  'arc-mobility': [
    'Mobile arc cycle',
    'Quick Compile reduces dash cooldown and Light Frame increases speed. Use Phase Reload to fire faster after a dash. Primary hits trigger arcs; Janus Vector adds rear shots and Gravity Bias helps aim. Volt Afterimage adds needles at the dash origin.',
    'Afterimage lasts briefly and affects at most three attacks. Needles fire with the attack and need no prior hit. Rear shots and needles apply elemental effects but cannot trigger new arcs; primary hits establish the chain.',
  ],
  'sword-single': [
    'Burning lance sword build',
    'Melee slashes apply burn and chill, while Star Fuel strengthens burning. Lance and homing protocols add pierce, speed and turning to secondary rune blades. Overclock shortens the interval between slashes.',
    'Thermal fission requires another direct hit on a target that is both burning and chilled. Its extra burst damages nearby enemies, not the isolated target itself. Homing affects rune blades; the slash still requires proper distance and aim.',
  ],
  'sword-swarm': [
    'Plasma sword crowd clearing',
    'Direct slashes ignite enemies and may trigger arcs. Parallel Circuit extends chains. Multishot widens the slash and adds rune blades, Conductive Needle adds pierce, and Solar Seeds adds fragments. Arcs connecting burning targets trigger plasma.',
    'Arcs require direct hits and a successful chance roll. Rune blades and fragments can apply elements but cannot trigger arcs. The third-slash rune volley requires a fused catalyst form; the sword alone cannot rely on it.',
  ],
  'sword-mobility': [
    'Phase sword movement cycle',
    'Quick Compile and Light Frame improve approach and retreat. Phase Reload speeds up slashes after a dash, while Zero Shift slows nearby enemies. Direct melee hits may trigger arcs; Janus Vector and Volt Afterimage add rear shots and origin needles.',
    'Post-dash attack speed and afterimage windows are brief. Movement and ordinary slashes remain available during cooldowns. Arcs are not guaranteed, and secondary shots cannot chain again. Leave room to retreat before closing in.',
  ],
  'cannon-single': [
    'Meteor-lance burning cannon',
    'Crimson Mass increases impact damage and projectile size. Astral Lance adds pierce and speed, while Overclock reduces the attack interval. Ember and Star Fuel sustain burning; Gravity Bias gradually turns shells toward the target as you reposition.',
    'Meteor and Lance both lengthen the firing interval; Overclock offsets only part of that cost. Both speed modifiers apply, so judge the combined trajectory. Homing cannot guarantee hits, and an isolated target offers no extra pierce value.',
  ],
  'cannon-swarm': [
    'Arc and ember crowd cannon',
    'Shells and splash spread burn. Direct hits may trigger arcs, and Parallel Circuit expands their coverage. Fan shots, pierce and first-hit fragments widen the impact area. Arcs hitting burning targets trigger plasma bursts.',
    'Keep enemies grouped to benefit from chains and splash. Fragments apply elements but cannot split again or trigger secondary reactions. Fan shots reduce per-shell damage and can miss small distant targets.',
  ],
  'cannon-mobility': [
    'Mobile cannon cycle',
    'Quick Compile reduces dash cooldown, and Light Frame helps the cannon reposition. Phase Reload creates brief faster firing windows after a dash; Janus Vector adds rear shots. Gravity Bias helps shells turn, while frost on impacts and splash slows enemies.',
    'Homing needs time to turn. Rear shots still depend on positioning and direction. The post-dash speed window is limited, and the cannon and dash have separate cooldowns. You can move and fire normally outside that window.',
  ],
};

const interfaceCopy = Object.fromEntries(
  `
当前没有可验证的候选。仍可在协议档案查看规则。|No valid candidates are available. You can still inspect rules in the Protocol Archive.
准备独立靶场|Preparing a separate test range
推演未完成。请重试；当前行动和存档未改变。|Analysis did not finish. Retry; your current run and save are unchanged.
推演超时，可重试或直接阅读下方战术依据。|Analysis timed out. Retry or read the tactical evidence below.
构筑已变化。请重新分析当前选择。|Your build changed. Analyze the current choices again.
输入未通过规则校验，未执行任何选择。|Input failed validation. No choice was applied.
此浏览器无法启动后台推演；下方规则和战术库仍可使用。|This browser cannot run background analysis. Rules and strategies below remain available.
构筑已变化，请重新分析。|Your build changed. Please analyze again.
这张协议已经不在当前奖励里，请重新分析。|This protocol is no longer offered. Analyze the current reward again.
模型策略库 · 本地推演|Strategy library · Local analysis
把下一次选择，先试一遍。|Test your next choice first.
战术教练读取你的构筑，在独立靶场里比较打法。你决定带走哪一种。|The coach compares your build in a separate test range. You decide which approach to take.
读取营地存档|Camp save loaded
营地范例 · Lv.4|Camp example · Lv.4
读取当前行动|Current run loaded
战术目标|Tactical goal
打法关键词|Playstyle keywords
如：连锁、跃迁、首领|e.g. chain, dash, boss
比较候选|Compare candidates
· 关闭即可取消|· Close to cancel
靶场比较|Test range comparison
这次选卡的取舍|Tradeoffs in this draft
范例构筑比较|Example build comparison
12 秒 × 3 种子 × 2 场景|12 s × 3 seeds × 2 scenarios
每个候选只增加这一张协议。|Each candidate adds only this one protocol.
范例有 4–6 张协议，与当前构筑卡数可能不同，不是等预算升级比较。|Examples use 4–6 protocols and may differ from your current card count. This is not a comparison at equal budget.
让引擎给出数字|Let the engine measure it
相同主武器、形态修饰、等级和遗器，比较单体与敌群输出；走位目标优先看跃迁冷却和移速。|Compare single-target and crowd damage using the same weapon, form modifiers, level and relics. Mobility goals prioritize dash cooldown and movement speed.
当前构筑|Current build
单体|Single target
敌群|Crowd
当前走位指标优先|Best current mobility metrics
当前靶场输出较高|Higher current range damage
单体 / 秒|Single-target / s
敌群 / 秒|Crowd / s
暂未激活跨系共鸣|No cross-element resonance active
此候选存在弹体池耗尽，结果受容量限制。|This candidate exhausted the projectile pool; capacity limits affect the result.
选择这张协议|Choose this protocol
亲手试用这套构筑|Try this build yourself
导出本次依据与推演记录|Export evidence and analysis
这些数字能说明什么？|What do these numbers show?
固定站位，最近靶距离 80 像素；持续开火，Q/E 就绪即释放，不使用跃迁。保留真实弹道、伤害和元素规则。靶位每帧复原，会抵消聚拢与击退位移；高生命靶不会触发击杀与斩杀收益。没有地形、跃迁触发收益、承伤、吸血和首领走位测量。数字不是胜率或通关保证。|The player stands still, 80 pixels from the nearest target, continuously firing and using Q/E when ready, without dashing. Real trajectories, damage and elements are simulated. Target positions reset every frame, cancelling pull and knockback. High-health targets do not trigger kill or execution benefits. Terrain, dash triggers, incoming damage, lifesteal and boss movement are not evaluated. These numbers are not win probabilities or guarantees.
走位排序：跃迁冷却更短 → 移速更高 → 单体输出。每种输出是三个种子的均值，不是置信区间。实战请自行验证。|Mobility ranking: shorter dash cooldown → faster movement → single-target damage. Damage is the mean of three seeds, not a confidence interval. Test your build in combat.
检索到的战术|Retrieved strategies
DeepSeek 离线生成，程序校验协议前置与引用，说明经源码复核修订。匹配依据：武器、目标、已有协议和关键词。|Generated offline with DeepSeek, validated for prerequisites and references, then checked against the source. Matches use weapon, goal, owned protocols and keywords.
战术库对应默认规则；自定义内容暂不使用旧版说明。奖励界面仍可推演实际候选协议。|The strategy library describes default rules. Custom content omits these descriptions; actual draft candidates can still be simulated.
AI 在这里做了什么？|What did AI do here?
模型从检索到的规则中生成结构化战术；程序拒绝未知协议、缺失前置和不成立的引用。当前推荐由浏览器后台线程的真实引擎排序。关键词检索不使用向量模型；试玩时不发送你的输入或存档，也不在线调用模型。|A model generated structured strategies from retrieved rules. Validation rejects unknown protocols, missing prerequisites and unsupported references. A real engine in a browser worker ranks candidates. Keyword search uses no embedding model. Playing sends neither your input nor save to a model and makes no online model calls.
先理解取舍，再进入战场。|Understand the tradeoffs before entering combat.
重新读取构筑|Reload current build
查看规则依据|View rule evidence
单体输出|Single-target damage
清理敌群|Clear crowds
灵活走位|Mobility
目标一致|Goal match
备选打法|Alternative strategy
已有|Owned: 
匹配|Match: 
已推演|Simulated
套构筑|builds
生命上限协议|Max-HP protocol
首领|Boss
输出|Damage output
清怪|Crowd clearing
包围|Encirclement
群体|Crowd
连锁|Chain
弹幕|Barrage
走位|Positioning
灵活|Agile
逃离|Escape
按|Press
`
    .trim()
    .split('\n')
    .map((row) => {
      const split = row.indexOf('|');
      return [row.slice(0, split), row.slice(split + 1)];
    }),
);

export const COACH_COPY: Record<string, string> = {
  ...interfaceCopy,
  ...Object.fromEntries(
    library.plans.flatMap((plan) => {
      const translated = plans[plan.id];
      return translated
        ? [
            [plan.title, translated[0]],
            [plan.explanation, translated[1]],
            [plan.caution, translated[2]],
          ]
        : [];
    }),
  ),
};

/** Mirror the authored keyword vocabulary for English queries; ranking stays in
 * the existing retrieval implementation and original query remains exportable. */
export function coachSearchQuery(query: string) {
  const words: Record<string, string> = {
    chain: '连锁',
    arc: '连锁',
    dash: '跃迁',
    mobility: '走位',
    dodge: '闪避',
    speed: '移动',
    boss: '首领',
    single: '单体',
    damage: '输出',
    swarm: '敌群',
    crowd: '群体',
    burn: '燃烧',
    fire: '燃烧',
    frost: '寒冷',
    ice: '寒冷',
    homing: '追踪',
    pierce: '穿透',
  };
  return query.replace(
    /\b[a-z]+\b/gi,
    (word) => words[word.toLowerCase()] || word,
  );
}
