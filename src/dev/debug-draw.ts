import type { ArcScene } from '../game/scene';
import type { DebugSession } from './debug-session';
/** Presentation-only graphics: no RNG calls and no changes to World or grid. */
export function attachDebugDrawing(scene: ArcScene, session: DebugSession) {
  const g = scene.add.graphics().setDepth(20);
  const labels = Array.from({ length: 60 }, () => scene.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ecfff0', backgroundColor: '#10202de6' }).setDepth(21).setVisible(false));
  const draw = (_time: number, delta: number) => {
    session.frame(delta);
    g.clear(); for (const label of labels) label.setVisible(false);
    if (!session.visible) return;
    const w = session.engine.world;
    if (session.grid) {
      const size = w.spatial.cellSize;
      g.lineStyle(1, 0x91dba9, .3);
      for (const [key, entries] of w.spatial.cells) {
        const [x, y] = key.split(',').map(Number);
        g.fillStyle(0x83d5b4, Math.min(.3, entries.size * .03));
        g.fillRect(x * size, y * size, size, size); g.strokeRect(x * size, y * size, size, size);
      }
    }
    if (session.hitboxes) {
      g.lineStyle(1, 0x77f6ea, 1); g.strokeCircle(w.player.x, w.player.y, 14);
      g.lineStyle(1, 0x77f6ea, .4); g.strokeCircle(w.player.x, w.player.y, 12);
      for (const h of w.hazards) { g.lineStyle(1, h.friendly ? 0xaff4c0 : 0xff98a1, .6); g.strokeCircle(h.x, h.y, h.r); }
      for (const e of w.enemies) { g.lineStyle(e.id === session.selected ? 3 : 1, e.id === session.selected ? 0xfbe98a : 0xff98a1, 1); g.strokeCircle(e.x, e.y, e.radius); }
      for (const p of w.projectiles.items) if (p.active) { g.lineStyle(1, p.enemy ? 0xff98a1 : 0xaef8c4, .8); g.strokeCircle(p.x, p.y, p.radius); g.lineBetween(p.oldX, p.oldY, p.x, p.y); }
      if (w.swing) {
        const s = w.swing; g.lineStyle(2, 0xffe2a0, .8); g.beginPath(); g.arc(s.x, s.y, s.range, s.angle - s.arc / 2, s.angle + s.arc / 2); g.strokePath();
        for (const angle of [s.angle - s.arc / 2, s.angle + s.arc / 2]) g.lineBetween(s.x, s.y, s.x + Math.cos(angle) * s.range, s.y + Math.sin(angle) * s.range);
      }
    }
    if (session.labels) w.enemies.slice(0, 60).forEach((e, i) => labels[i].setPosition(e.x - 30, e.y - e.radius - 20).setText(`#${e.id} ${e.state} ${e.timer.toFixed(2)}`).setVisible(true));
  };
  scene.events.on('postupdate', draw);
  return () => { scene.events.off('postupdate', draw); g.destroy(); for (const label of labels) label.destroy(); };
}
