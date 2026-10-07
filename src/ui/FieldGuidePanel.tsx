import { useTranslation } from './i18n';
import { ArrowRight, Swords, X } from 'lucide-react';
import {
  GUIDE_BUILDS,
  GUIDE_STEPS,
  type FieldGuide,
} from '../game/field-guide';
import type { Engine } from '../game/engine';
import { activeSynergies } from '../cards/synergies';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function FieldGuidePanel({
  guide,
  engine,
  keys,
  refresh,
  exit,
  startRun,
}: {
  guide: FieldGuide;
  engine: Engine;
  keys: { move: string; attack: string; dash: string; pulse: string };
  refresh: () => void;
  exit: () => void;
  startRun: () => void;
}) {
  const t = useTranslation();
  if (!guide.active) return null;
  const w = engine.world;
  const content = {
    move: [
      '先找到自己的节奏',
      t.copy(
        `${keys.move} 移动。脚下白环标记你的位置；先走出一小段距离。`,
        `${keys.move} to move. The white ring marks your position; travel a short distance.`,
      ),
      keys.move,
    ],
    fire: [
      '让第一发准确命中',
      t.copy(
        `用准星瞄准右上方的固定靶，按住 ${keys.attack} 攻击。`,
        `Aim at the fixed target in the upper right and hold ${keys.attack} to attack.`,
      ),
      keys.attack,
    ],
    dash: [
      '穿过危险的间隙',
      t.copy(
        `一边移动，一边按 ${keys.dash} 跃迁。红色预警意味着攻击即将到来。`,
        `While moving, press ${keys.dash} to dash. Red telegraphs warn of incoming attacks.`,
      ),
      keys.dash,
    ],
    pulse: [
      '给自己留一条退路',
      t.copy(
        `按 ${keys.pulse} 释放近身脉冲：伤害、减速敌人，并清除附近敌弹。`,
        `Press ${keys.pulse} to pulse: damage and slow nearby enemies, and clear their projectiles.`,
      ),
      keys.pulse,
    ],
    forge: [
      '让协议，改写同一次攻击',
      '选择一种组合，观察元素、轨迹和命中规则如何相互作用。',
      '共鸣',
    ],
    resonance: [
      '现在，让组合真正运转',
      guide.build === '电浆剑舞'
        ? '用圣剑近身点燃敌人，再由电弧连接燃烧目标，观察电浆如何消耗状态爆发。'
        : '用法器选好角度。追踪弹反弹后更快转向，但每次反弹损失部分伤害。',
      keys.attack,
    ],
    boss: [
      '读懂红线，再出手',
      '击败守门人。预警时侧向跃迁，利用攻击后的空隙贴近输出。演练不会扣除生命。',
      keys.dash,
    ],
    complete: [
      '你已经掌握跃迁的语言',
      '正式行动随机起始武器；用协议改写攻击，再在工坊选择适合当前打法的形态修饰。',
      '完成',
    ],
  }[guide.step];
  if (guide.step === 'forge' || guide.step === 'complete')
    return (
      <Dialog
        open
        onOpenChange={() => {
          /* Leave through the explicit return action. */
        }}
      >
        <DialogContent
          className="guide-choice"
          showCloseButton={false}
          aria-label={t(guide.step === 'forge' ? '选择演练共鸣' : '演练完成')}
        >
          <div className="eyebrow">
            FIELD GUIDE / {t(guide.step === 'forge' ? 'RESONANCE' : 'COMPLETE')}
          </div>
          <DialogTitle>{t(content[0])}</DialogTitle>
          <DialogDescription>{t(content[1])}</DialogDescription>
          {guide.step === 'forge' ? (
            <div className="guide-builds">
              {GUIDE_BUILDS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    guide.choose(engine, b.id);
                    refresh();
                  }}
                >
                  <Swords size={30} />
                  <h3>{t(b.name)}</h3>
                  <p>{t(b.detail)}</p>
                  <span>
                    {t('熔接这套共鸣')}
                    <ArrowRight size={18} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="guide-result">
                <span>
                  <b>{w.kills}</b> {t('净化实体')}
                </span>
                <span>
                  <b>{w.reactionCount}</b> {t('爆发反应')}
                </span>
                <span>{t(guide.build)}</span>
              </div>
              <p>{t('爆发反应只统计电浆、热裂变和坍缩；折光等共鸣不计入。')}</p>
              <button className="start-button" onClick={startRun}>
                <span>{t('进入正式行动')}</span>
                <ArrowRight />
              </button>
            </>
          )}
          <button className="text-button" onClick={exit}>
            {t('返回主界面')}
          </button>
        </DialogContent>
      </Dialog>
    );
  return (
    <aside className="field-guide" aria-label={t('行动演练')}>
      <div className="guide-heading">
        <span>
          {t('行动演练 ·')}
          {GUIDE_STEPS.indexOf(guide.step) + 1} {t('/ 7 · 无敌')}
        </span>
        <button onClick={exit} aria-label={t('退出行动演练')}>
          <X size={17} />
        </button>
      </div>
      <h3>
        <kbd>{t(content[2])}</kbd>
        {t(content[0])}
      </h3>
      <p>{t(content[1])}</p>
      {guide.step === 'resonance' && (
        <div className="guide-live">
          {t(
            activeSynergies(w.cards, w.weapon)
              .map((s) => s.name)
              .join(' · '),
          )}
          <b>
            {t('爆发反应')}
            {w.reactionCount}
          </b>
          <small>{t('仅计电浆 / 热裂变 / 坍缩')}</small>
        </div>
      )}
      <div className="guide-progress">
        {GUIDE_STEPS.slice(0, -1).map((s, i) => (
          <i
            key={s}
            className={i <= GUIDE_STEPS.indexOf(guide.step) ? 'done' : ''}
          />
        ))}
      </div>
      {['move', 'fire', 'dash', 'pulse'].includes(guide.step) && (
        <button
          className="guide-skip"
          onClick={() => {
            guide.next(engine);
            refresh();
          }}
        >
          {t('跳过当前提示')}
        </button>
      )}
    </aside>
  );
}
