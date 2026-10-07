/** Build expedition and relay challenge interface copy. */
export const TRIAL_COPY: Record<string, string> = Object.fromEntries(
  `
构筑试炼战场|Build trial battlefield
中继争夺战场|Relay contest battlefield
星铸协议 · 2.3|Starforge Protocol · 2.3
返回配置|Back to configuration
返回主菜单|Back to main menu
试炼进度|Trial progress
已完成|Completed
当前阶段|Current stage
下一阶段|Next stage
每一格能量，都有代价。|Every unit of energy has a price.
下一场，重新作出选择。|A new encounter. A new decision.
可选武装|Choose weapon
· 等级 3 · 最多|· Level 3 · Up to
个协议 · 阶段间可原价撤下重配|protocols · Reconfigure between stages at full refund
剩余额度|Remaining capacity
剩余可用能量|Available energy
选择试炼武装|Choose trial weapon
基础|Base
+ 合约|+ Contract
− 维修|− Repairs
可用额度|available capacity
协议目录|Protocol catalog
配置你的攻击|Configure your attack
槽位|slots
检查剩余额度、槽位与前置协议；先撤下依赖它的协议再调整。|Check capacity, slots and prerequisites. Remove dependent protocols before changing their prerequisites.
自定义参数 · 以右侧实时预览为准|Custom parameters · See the live preview
此协议已修改，请对照规则参数及实战记录验证效果。|This protocol has been modified. Check its parameters and combat results.
已装备 · 点击撤下|Equipped · Click to remove
选择协议|Select protocol
锁定构筑，进入战场|Lock build and enter combat
下一场 / 0|Next encounter / 0
下一场敌人配置|Next encounter enemies
当前协议参数|Current attack parameters
普攻 / 终结回旋|Normal / Returning finisher
普攻 / 终结挥砍|Normal / Finishing slash
单枚直击伤害|Direct damage per shot
当前武装的非暴击直击参数；不含燃烧、共鸣和爆破，不等于实战 DPS。|Non-critical direct-hit values for the current weapon. Excludes burn, resonance and blasts; these are not combat DPS.
装备后变化|After equipping
改变命中后的效果或弹道行为。|Changes impact effects or projectile behavior.
至少保留一项协议再维修，每阶段限一次|Keep at least one protocol before repairing. Once per stage.
永久额度|permanent capacity
本次试炼不写主线存档；退出或刷新会结束当前进度。|This trial has separate progress. Exiting or refreshing ends the current expedition.
前方的星铸守门人|The Starforge gatekeeper ahead
航路分歧 / 仅此一次|Route contract / One choice
带着伤前进，|Carry your wounds,
还是再赌一次？|or take another risk?
下一场是交叉火线，之后直面守门人。武装已锁定为|Crossfire comes next, then the gatekeeper. Your weapon is locked to
，协议仍可重配。|; protocols can still be reconfigured.
签订补给合约|Sign supply contract
接受补给|Accept supplies
立即恢复|Restore now
最多恢复|Restore up to
，不消耗额度。下一场保持原敌阵，末关基础额度|without spending capacity. The next enemy formation is unchanged. Final base capacity:
确认补给 →|Accept supplies →
签订夺能合约|Sign overload contract
承担夺能|Take overload
支付|Pay
额外精英冲锋者从中央加入。清场后末关 +|An extra elite lancer enters from the center. Clear the stage to gain final capacity +
额度；失败不返还生命、不发奖励。生命须高于|. Failure refunds no health and grants no reward. Health must be above
才可签订。|to sign.
· 合约确认后不能改签|· A signed contract cannot be changed
承担风险 →|Accept the risk →
战斗用时|Combat time
试炼计时|Trial timer
能量占用|Energy used
首领生命|Boss health
试炼已暂停|Trial paused
继续试炼|Resume trial
结束本次试炼|End trial
结束本次试炼？|End this trial?
进度不会保存，主线存档不受影响。|Trial progress will end. Your main expedition save is preserved.
留在这里|Stay here
确认退出|Confirm exit
构筑战报|Build report
星铸完成|Starforge complete
已突破|Cleared
试炼时间耗尽|Trial time expired
试炼未能完成|Trial failed
有效伤害|Damage dealt
承受伤害|Damage taken
共鸣触发|Reactions
夺能合约完成 · +|Overload contract complete · +
选择一份航路合约，再为交叉火线调整配装。你的生命与选择都会留到下一场。|Choose a contract, then reconfigure for Crossfire. Your health and decisions carry into the next encounter.
从对群到单体，你已完成三次不同的构筑验证。|From crowds to a single boss, you have completed three distinct build trials.
保留这次结果，调整配装或走位后再试。没有隐藏免死或失败补偿。|Review the result, adjust your build or movement, and try again. There is no hidden death protection or defeat bonus.
下一场可用额度|Next encounter capacity:
生命不自动恢复：维修会占用后续构筑额度。|Health does not recover automatically. Repairs reduce future build capacity.
用时|Time
承伤|Damage taken
协议支出|Protocol cost
各阶段敌人与预算不同；战报用于回顾本次选择，不是单卡排名。|Enemies and budgets differ by stage. This report reviews your choices; it is not a ranking of individual cards.
选择航路合约|Choose route contract
分配下一阶段预算|Allocate next-stage budget
查看远征总结|View expedition summary
重新构筑|Build again
导出本次记录|Export run record
就绪|Ready
脉冲|Pulse
引力|Gravity
连段|Combo
回膛|Reload
清场后获得|Gain after clearing
中继已接管|Relay captured
信号中断|Signal lost
时间耗尽|Time expired
已撤离|Evacuated
上次挑战已中断|Previous challenge interrupted
你守住了中继点。熔炉的信号再次亮起。|You held the relay. The foundry's signal shines again.
生命值归零。尝试用冲刺脱离包围，再返回光圈。|Health reached zero. Dash out of encirclement, then return to the circle.
驻留时间尚未达标。离开光圈不会清空已有进度。|Hold time was below the target. Leaving the circle preserves accumulated progress.
本次未完成，不发放徽章。随时可以重新挑战。|This attempt ended without a badge. You can challenge it again at any time.
页面关闭或刷新后，未完成的战斗不会恢复，也不计入最佳成绩。|Unfinished combat cannot resume after closing or refreshing the page and does not count toward your best result.
此浏览器无法保护多个活动页面的同时存档，可使用不计成绩模式。|This browser cannot protect simultaneous activity saves. You can play without recording a score.
活动记录未就绪|Activity record is not ready
结算未就绪|Result is not ready
请先确认本次结算，再退出。|Confirm this result before leaving.
草稿试玩 · 不计成绩|Draft trial · Unscored
单机挑战|Local challenge
返回编辑器|Back to editor
固定配装 · 驻留挑战|Fixed build · Holdout challenge
踏入光圈，守住最后一段信号。|Enter the circle. Hold the last signal.
战斗时限|Time limit
累计驻留|Accumulated hold
首通徽章|First-clear badge
进入场地中央光圈，累计驻留|Enter the central circle and accumulate
秒即成功。离圈保留进度。|seconds to succeed. Leaving the circle preserves progress.
在|Within
秒内完成；生命值归零或超时则失败。暂停不计时。|seconds; zero health or an expired timer means defeat. Pausing stops the clock.
使用固定武器与协议，击退来敌。首次完成后领取「守望者」徽章。|Repel enemies with a fixed weapon and protocols. Your first clear unlocks the Watchkeeper badge.
守望者 · 已获得|Watchkeeper · Collected
守望者 · 首次完成解锁|Watchkeeper · Unlock on first clear
个人最佳|Personal best
徽章留在本机，重复完成可刷新个人最佳。|The badge stays on this device. Clear again to improve your personal best.
另一个页面正在使用活动记录。关闭它后，再重新连接。|Another page is using this activity record. Close it, then reconnect.
正在准备…|Preparing…
进入挑战|Start challenge
重新连接|Reconnect
不计成绩试玩|Play without scoring
试玩不写入活动记录，不发放正式徽章。|Trials do not save an activity record or award official badges.
本地单机记录，可被修改或清除；设备日期仅作记录，不是可信线上榜单。|Local records can be modified or cleared. Device dates are informational; this is not an online leaderboard.
主线存档独立保留。|Main expedition saves are kept separately.
驻留进度|Hold progress
剩余时间|Time remaining
挑战生命|Challenge health
前往中央光圈|Head to the central circle
准备接管中继|Prepare to capture the relay
挑战已暂停|Challenge paused
计时与驻留进度均已暂停。|The timer and hold progress are paused.
继续挑战|Resume challenge
撤离挑战|Leave challenge
撤离确认|Confirm evacuation
现在撤离？|Evacuate now?
本次将结束，不发放首通徽章。|This attempt will end without a first-clear badge.
留在挑战|Stay in challenge
确认撤离|Confirm evacuation
挑战结算|Challenge result
试玩|Trial
本机记录|Local record
击败敌人|Enemies defeated
未保存战斗进度，不提供本次战斗统计。|Combat progress was not saved; statistics are unavailable for this attempt.
重试保存结算|Retry saving result
领取徽章并记录成绩|Claim badge and save result
确认本次结果|Confirm result
守望者徽章已入藏 · 成绩已记录|Watchkeeper badge collected · Result saved
本次结算已确认|Result confirmed
返回活动大厅|Return to challenge lobby
移动 · 鼠标瞄准 /|Move · Mouse aim /
· 草稿试玩，不发放正式徽章|· Draft trial; no official badge
结算尚未保存|Result not yet saved
请保留此页面并重试。|Keep this page open and retry.
尚未完成领取|Reward not yet claimed
重试不会重复发放。|Retrying will not duplicate rewards.
蚀刻者|Etcher
棱镜哨兵|Prism Sentry
裂隙冲锋者|Rift Lancer
咒域编织者|Hex Weaver
修复中继|Repair Conduit
余烬投弹手|Cinder Bomber
失声唱诗者|Voiceless Cantor
折镜幽影|Mirror Shade
同一斩击铺燃烧，电弧消耗状态引爆敌群|Ignite with a slash; arcs consume burning effects to detonate crowds
折光弹幕|Refracted Barrage
同一弹体反弹后更强追踪，但逐次损失伤害|Shots gain homing after each bounce, but lose damage
行者演练场|Wayfarer Training Ground
守门人的试炼|Gatekeeper Trial
恢复窗口|Recovery window
接近中|Approaching
冲锋中|Charging
冲锋蓄势|Charge windup
旋转光束|Rotating beam
扇形齐射|Fan volley
落点轰击|Targeted bombardment
环形弹幕|Radial volley
`
    .trim()
    .split('\n')
    .map((row) => {
      const split = row.indexOf('|');
      return [row.slice(0, split), row.slice(split + 1)];
    }),
);
