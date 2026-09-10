import type { BossKind, EnemyKind } from '../game/types';
export const BOSSES: BossKind[] = ['warden', 'matron', 'forgemaster', 'oracle'];
export const isBoss = (kind: EnemyKind): kind is BossKind =>
  BOSSES.includes(kind as BossKind);
export const RELICS = [
  {
    id: 'hourglass',
    name: '迟到的砂',
    cost: 10,
    boss: null,
    text: '跃迁冷却缩短 15%；跃迁时重置副武装冷却。',
    lore: '每一粒沙都比钟声晚落下一秒。只有守钟人知道，多出来的一秒属于谁。',
  },
  {
    id: 'glass-engine',
    name: '空心机芯',
    cost: 12,
    boss: null,
    text: '副武装伤害系数从 55% 提升至 70%。',
    lore: '中央的孔洞不是损坏。图纸要求那里必须留下一个人的位置。',
  },
  {
    id: 'vow-edge',
    name: '守门人的断誓',
    cost: 14,
    boss: 'warden',
    text: '剑弧范围 +24；获得圣剑印记时额外获得 15 护盾。',
    lore: '誓言只剩下后半句：“……直到他们回来。”',
  },
  {
    id: 'choir-vial',
    name: '无声摇篮',
    cost: 16,
    boss: 'matron',
    text: '清场额外恢复 8 生命；灵药多恢复 10。',
    lore: '瓶中没有液体。倾斜它时，却能听见有人在床沿轻轻坐下。',
  },
  {
    id: 'kiln-heart',
    name: '未冷却的心',
    cost: 16,
    boss: 'forgemaster',
    text: '炸弹伤害 +35%；战斗开始时获得 10 护盾。',
    lore: '炉火已熄灭七百年。它仍在替一座不存在的城供暖。',
  },
  {
    id: 'oracle-eye',
    name: '零号遗瞳',
    cost: 24,
    boss: 'oracle',
    text: '暴击率 +12%；三种武装齐备时武装伤害额外 +15%。',
    lore: '最后一条预测写着：不要相信最后一条预测。',
  },
] as const;
export type RelicId = (typeof RELICS)[number]['id'];
export const LORE = [
  {
    id: 'threshold',
    title: '门后无人',
    source: '踏入沉钟圣所',
    text: '门上的通行灯仍然亮着。登记簿最后一页，所有离开的人都签了“明日归来”。',
  },
  {
    id: 'grove',
    title: '保存期限',
    source: '抵达悼亡林地',
    text: '根须穿过病床，却小心绕开枕头。温室系统每日仍播报：今日，无人离世。',
  },
  {
    id: 'foundry',
    title: '余温',
    source: '抵达余烬铸庭',
    text: '熔炉的耗能记录归零了。工人的餐盒却每到黄昏就会重新变热。',
  },
  {
    id: 'warden',
    title: '第七次值守',
    source: '击败第七守门人',
    text: '前六位守门人的名字，都刻在同一副盔甲内侧。第七个位置只写着一个日期。',
  },
  {
    id: 'matron',
    title: '缺席的合唱',
    source: '击败挽歌圣母',
    text: '唱诗名单里有三百个名字。录音中，只有一个声音在等待别人跟上。',
  },
  {
    id: 'forgemaster',
    title: '停炉令',
    source: '击败灰烬执政官',
    text: '命令已经签署，交接人一栏却空着。他一直没有等到接班的人。',
  },
  {
    id: 'oracle',
    title: '最后的误差',
    source: '击败零号神谕',
    text: '它预测过所有人的死亡。某一行后面，却被反复加上了一个问号。',
  },
  {
    id: 'archive',
    title: '湿掉的信',
    source: '读取一座失落档案',
    text: '“如果树又开花，就不要再唤醒我。”落款被水洗掉了，信纸却一直是干的。',
  },
  {
    id: 'bell',
    title: '倒置的钟',
    source: '触碰遗迹中的钟',
    text: '钟槌悬在下方。每当它敲响，尘埃便短暂地升回梁上。',
  },
  {
    id: 'forge',
    title: '异物缝合',
    source: '熔接第二种武装',
    text: '工匠拒绝称它为武器。“只是让不相容的东西，再一起活一会儿。”',
  },
  {
    id: 'blood',
    title: '旧债',
    source: '接受遗迹的血誓',
    text: '祭坛认得你的血，却把它记在了另一个人的账上。',
  },
  {
    id: 'triad',
    title: '三个人的影子',
    source: '在一局集齐三种武装',
    text: '你抬起手时，影子晚了一拍。其中两个，似乎仍握着别人的东西。',
  },
] as const;
export const ENEMY_NOTES: Partial<Record<EnemyKind, string>> = {
  hunter: '追逐靠近，接触攻击。曾是为行人刻印路标的侍从。',
  sentry: '保持距离后锁定射击。仍在等候一张早已作废的通行证。',
  lancer: '沿红色预警线冲锋，恢复期暴露破绽。',
  weaver: '在目标脚下编织延迟爆破，离开紫色危险区。',
  conduit: '为附近实体修复生命，优先打断中继。',
  bomber: '投放三段延迟爆破，连续移动离开橙色预警。',
  cantor: '为同伴添加临时护盾，再发射扩散音符。',
  shade: '消失后在侧翼显形，先观察落点，再规避扇形冰针。',
  warden: '散射、突进、环形轰击。守护一扇再也无人通过的门。',
  matron: '同心音浪、根网、召唤唱诗者。她保存了所有名字，却保存不了回应。',
  forgemaster: '十字熔断、重型冲锋、延迟炉火。停炉令仍未有人签收。',
  oracle: '旋转双向激光、径向弹幕、召唤增援。它把希望当成了最后一个错误。',
};
