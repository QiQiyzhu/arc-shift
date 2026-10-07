import type Phaser from 'phaser';
import { FrontierSession, FRONTIER_RULES } from './session';
import type { Language } from '../ui/i18n';
import { copy } from '../ui/i18n';

/** All objective geometry matches the director's actual interaction radii. */
export class FrontierRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[];
  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(2.4);
    this.labels = Array.from({ length: 5 }, () =>
      scene.add
        .text(0, 0, '', {
          fontFamily: '"Space Grotesk", "Microsoft YaHei", sans-serif',
          fontSize: '14px',
          color: '#d7f4ea',
          stroke: '#07181e',
          strokeThickness: 5,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(5),
    );
  }
  draw(session: FrontierSession, language: Language, reduced: boolean) {
    const g = this.graphics,
      o = session.objective,
      w = session.engine.world;
    g.clear();
    this.labels.forEach((label) => label.setVisible(false));
    if (session.state === 'briefing') return;
    const pulse = reduced ? 0.7 : 0.68 + Math.sin(w.elapsed * 3) * 0.15;
    const label = (
      i: number,
      x: number,
      y: number,
      text: string,
      color = '#d7f4ea',
    ) => {
      this.labels[i]
        .setText(text)
        .setColor(color)
        .setPosition(x, y)
        .setVisible(true);
    };
    const ring = (
      x: number,
      y: number,
      r: number,
      color: number,
      alpha = 1,
    ) => {
      g.lineStyle(2, color, alpha).strokeCircle(x, y, r);
    };
    const crystal = (x: number, y: number, color: number, size = 15) => {
      g.fillStyle(color, 0.16);
      g.fillTriangle(x, y - size, x + size * 0.7, y, x, y + size);
      g.fillTriangle(x, y - size, x - size * 0.7, y, x, y + size);
      g.lineStyle(2, color, 0.95);
      g.lineBetween(x, y - size, x + size * 0.7, y);
      g.lineBetween(x + size * 0.7, y, x, y + size);
      g.lineBetween(x, y + size, x - size * 0.7, y);
      g.lineBetween(x - size * 0.7, y, x, y - size);
      g.lineBetween(x, y - size, x, y + size);
    };
    if (o.kind === 'relay' || o.kind === 'boss') {
      if (o.kind === 'relay') {
        g.lineStyle(2, 0x8ce7cf, 0.22);
        for (let i = 1; i < o.nodes.length; i++)
          g.lineBetween(
            o.nodes[i - 1].x,
            o.nodes[i - 1].y,
            o.nodes[i].x,
            o.nodes[i].y,
          );
      }
      o.nodes.forEach((node, i) => {
        const color = node.active
          ? 0xb8edc8
          : node.contested
            ? 0xffa898
            : 0x94d9e4;
        g.fillStyle(0x071f2a, 0.5).fillCircle(
          node.x,
          node.y,
          FRONTIER_RULES.captureRadius,
        );
        g.fillStyle(color, node.active ? 0.12 : 0.055).fillCircle(
          node.x,
          node.y,
          FRONTIER_RULES.captureRadius,
        );
        ring(
          node.x,
          node.y,
          FRONTIER_RULES.captureRadius,
          color,
          node.active ? 0.8 : pulse,
        );
        ring(node.x, node.y, FRONTIER_RULES.captureRadius - 7, color, 0.25);
        crystal(node.x, node.y - 12, color, node.active ? 22 : 17);
        g.fillStyle(0x09212a, 0.85).fillRect(node.x - 32, node.y + 19, 64, 5);
        g.fillStyle(color, 0.95).fillRect(
          node.x - 32,
          node.y + 19,
          (64 * node.charge) / FRONTIER_RULES.captureSeconds,
          5,
        );
        label(
          i,
          node.x,
          node.y + 47,
          node.active
            ? `${String.fromCharCode(65 + i)}  ${copy(language, '已连通', 'ONLINE')}`
            : node.contested
              ? `${String.fromCharCode(65 + i)}  ${copy(language, '受干扰', 'CONTESTED')}`
              : `${String.fromCharCode(65 + i)}  ${Math.round((node.charge / FRONTIER_RULES.captureSeconds) * 100)}%`,
        );
      });
    } else if (o.kind === 'salvage') {
      const c = o.contested ? 0xffab96 : 0xa5e7cf;
      g.fillStyle(c, 0.09).fillCircle(
        o.base.x,
        o.base.y,
        FRONTIER_RULES.depositRadius,
      );
      ring(o.base.x, o.base.y, FRONTIER_RULES.depositRadius, c, 0.9);
      g.lineStyle(2, c, 0.7).strokeRoundedRect(
        o.base.x - 27,
        o.base.y - 23,
        54,
        46,
        8,
      );
      g.lineBetween(o.base.x - 12, o.base.y, o.base.x + 12, o.base.y);
      g.lineBetween(o.base.x, o.base.y - 12, o.base.x, o.base.y + 12);
      label(
        0,
        o.base.x,
        o.base.y + 43,
        copy(
          language,
          `回收舱 ${o.delivered}/3`,
          `EXTRACTION ${o.delivered}/3`,
        ),
      );
      o.relics.forEach((relic, i) => {
        if (relic.delivered || i === o.cargo) return;
        ring(relic.x, relic.y, FRONTIER_RULES.relicRadius, 0xb6dff1, pulse);
        crystal(relic.x, relic.y, 0xb6dff1, 21);
        label(
          i + 1,
          relic.x,
          relic.y + 47,
          copy(language, `遗物 ${i + 1}`, `RELIC ${i + 1}`),
        );
      });
      if (o.cargo !== null) {
        crystal(w.player.x, w.player.y - 35, 0xe5efb4, 12);
        g.lineStyle(1, 0xe5efb4, 0.3).lineBetween(
          w.player.x,
          w.player.y,
          o.base.x,
          o.base.y,
        );
        label(
          4,
          w.player.x,
          w.player.y - 58,
          copy(
            language,
            '携带中 · 返回回收舱',
            'CARRYING · RETURN TO EXTRACTION',
          ),
          '#e5efb4',
        );
      }
    } else {
      g.lineStyle(13, 0x08202a, 0.9);
      for (let i = 1; i < o.path.length; i++)
        g.lineBetween(
          o.path[i - 1].x,
          o.path[i - 1].y,
          o.path[i].x,
          o.path[i].y,
        );
      g.lineStyle(2, 0xd9c196, 0.6);
      for (let i = 1; i < o.path.length; i++)
        g.lineBetween(
          o.path[i - 1].x,
          o.path[i - 1].y,
          o.path[i].x,
          o.path[i].y,
        );
      const c = o.contested ? 0xffad98 : o.moving ? 0xb4e9cd : 0xe3c69c;
      g.fillStyle(c, 0.035).fillCircle(
        o.cart.x,
        o.cart.y,
        FRONTIER_RULES.escortRadius,
      );
      ring(o.cart.x, o.cart.y, FRONTIER_RULES.escortRadius, c, 0.55);
      g.fillStyle(0x102c35, 0.95).fillRoundedRect(
        o.cart.x - 35,
        o.cart.y - 25,
        70,
        50,
        9,
      );
      g.lineStyle(2, c, 0.95).strokeRoundedRect(
        o.cart.x - 35,
        o.cart.y - 25,
        70,
        50,
        9,
      );
      crystal(o.cart.x, o.cart.y, c, 22);
      const end = o.path[o.path.length - 1];
      ring(end.x, end.y, 49, 0xe3c69c, pulse);
      label(
        0,
        o.cart.x,
        o.cart.y + 49,
        o.contested
          ? copy(language, '敌方干扰 · 清除近敌', 'CONTESTED · CLEAR HOSTILES')
          : o.moving
            ? copy(language, '核心运输中', 'CORE IN TRANSIT')
            : copy(language, '靠近核心以护送', 'APPROACH TO ESCORT'),
      );
      label(1, end.x, end.y - 68, copy(language, '接驳终点', 'RENDEZVOUS'));
    }
  }
  dispose() {
    this.graphics.destroy();
    this.labels.forEach((label) => label.destroy());
  }
}
