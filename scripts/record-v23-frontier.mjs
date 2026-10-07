import fs from 'node:fs';
import path from 'node:path';
import { createPilot, observe } from './capture-v23-lib.mjs';

// Visibility-graph path planning uses only the visible terrain rectangles. It
// produces WASD input; collision and every objective remain authoritative in-game.
export function navigationTarget(state, goal) {
  const margin = 27;
  const blocks = state.blocks.map((block) => ({ x: block.x - margin, y: block.y - margin, w: block.w + margin * 2, h: block.h + margin * 2 }));
  const inside = (point, block) => point.x > block.x && point.x < block.x + block.w && point.y > block.y && point.y < block.y + block.h;
  const clear = (a, b) => {
    const length = Math.hypot(a.x - b.x, a.y - b.y), steps = Math.ceil(length / 9);
    for (let step = 1; step < steps; step++) {
      const point = { x: a.x + (b.x - a.x) * step / steps, y: a.y + (b.y - a.y) * step / steps };
      if (blocks.some((block) => !inside(a, block) && inside(point, block))) return false;
    }
    return true;
  };
  if (clear(state.p, goal)) return goal;
  const points = [state.p, goal];
  for (const block of blocks) {
    for (const point of [{ x: block.x - 2, y: block.y - 2 }, { x: block.x + block.w + 2, y: block.y - 2 }, { x: block.x - 2, y: block.y + block.h + 2 }, { x: block.x + block.w + 2, y: block.y + block.h + 2 }]) {
      if (point.x > 130 && point.x < 1150 && point.y > 145 && point.y < 585 && !blocks.some((item) => inside(point, item))) points.push(point);
    }
  }
  const distance = points.map(() => Infinity), previous = points.map(() => -1), visited = new Set();
  distance[0] = 0;
  while (visited.size < points.length) {
    let current = -1;
    for (let index = 0; index < points.length; index++) if (!visited.has(index) && (current < 0 || distance[index] < distance[current])) current = index;
    if (current < 0 || !Number.isFinite(distance[current])) break;
    if (current === 1) {
      let next = 1;
      while (previous[next] > 0) next = previous[next];
      return points[next];
    }
    visited.add(current);
    for (let index = 0; index < points.length; index++) {
      if (visited.has(index) || !clear(points[current], points[index])) continue;
      const candidate = distance[current] + Math.hypot(points[current].x - points[index].x, points[current].y - points[index].y);
      if (candidate < distance[index]) { distance[index] = candidate; previous[index] = current; }
    }
  }
  return goal;
}

export async function recordFrontier(cap, { weapon, route, practice, out }) {
  const { page, mark, shot, wait } = cap, pilot = createPilot(page);
  const button = (name) => page.getByRole('button', { name, exact: true });
  await cap.navigate('/frontier?qa');
  // Selectors are the player-facing controls; no QA state writes are used.
  await page.getByRole('button', { name: new RegExp(`^${{ arc: '法器', sword: '圣剑', cannon: '重炮' }[weapon]}`) }).click();
  if (practice) await page.getByRole('checkbox').check();
  mark('frontier-briefing', { weapon, route, practice }); await shot('frontier-briefing'); await wait(3000);
  for (let stage = 0; stage < 3; stage++) {
    await button('开始行动').click();
    await page.waitForFunction(() => window.frontierQA?.session.state === 'combat');
    mark(`frontier-stage-${stage + 1}`);
    const began = Date.now(); let lastMilestone = '', photographed = false, usedPotionAt = -100;
    while (Date.now() - began < 190000) {
      const state = await observe(page, 'frontierQA');
      if (!state || state.session !== 'combat') break;
      if (state.phase !== 'playing') { await wait(100); continue; }
      const objective = state.objective;
      let goal;
      if (objective.kind === 'relay' || objective.kind === 'boss') {
        const incomplete = objective.nodes.filter((node) => !node.active);
        goal = incomplete.sort((a, b) => Math.hypot(a.x - state.p.x, a.y - state.p.y) - Math.hypot(b.x - state.p.x, b.y - state.p.y))[0];
      } else if (objective.kind === 'salvage') {
        goal = objective.cargo !== null ? objective.base : objective.relics.filter((relic) => !relic.delivered).sort((a, b) => Math.hypot(a.x - state.p.x, a.y - state.p.y) - Math.hypot(b.x - state.p.x, b.y - state.p.y))[0];
      } else goal = objective.cart;
      const milestone = objective.kind === 'relay' || objective.kind === 'boss'
        ? `${objective.kind}-${objective.nodes.filter((node) => node.active).length}`
        : objective.kind === 'salvage' ? `salvage-${objective.delivered}-${objective.cargo === null ? 'empty' : 'carrying'}`
          : `escort-waypoint-${objective.waypoint}`;
      if (milestone !== lastMilestone) { mark(milestone, { p: state.p, objective }); lastMilestone = milestone; }
      const destination = goal ? navigationTarget(state, goal) : null;
      const contested = goal ? state.enemies.filter((enemy) => Math.hypot(enemy.x - goal.x, enemy.y - goal.y) < 100).sort((a, b) => Math.hypot(a.x - state.p.x, a.y - state.p.y) - Math.hypot(b.x - state.p.x, b.y - state.p.y))[0] : null;
      await pilot.drive(state, {
        ...(destination ? { destination, radius: destination === goal ? objective.kind === 'escort' ? 50 : 22 : 0, holdObjective: true } : {}),
        ...(contested ? { target: contested } : {}),
      });
      if (state.p.hp < 85 && state.wallet.tonics > 0 && state.ticks - usedPotionAt > 180) {
        await page.keyboard.press('r'); usedPotionAt = state.ticks; mark('use-tonic', { hp: state.p.hp });
      }
      if (!photographed && Date.now() - began > 6500) { await shot(`frontier-stage-${stage + 1}`); photographed = true; }
    }
    await pilot.release();
    const result = await page.evaluate(() => window.frontierQA.session.export());
    fs.writeFileSync(path.join(out, 'actual-run.json'), JSON.stringify(result, null, 2));
    if (result.state === 'failed') throw Error(`Frontier ${route} failed at stage ${stage + 1}: ${JSON.stringify(result.results.at(-1))}`);
    if (!['route', 'interlude', 'finished'].includes(result.state)) throw Error(`Frontier capture timeout at stage ${stage + 1}`);
    mark(`frontier-result-${stage + 1}`, { result: result.results.at(-1) });
    await shot(`frontier-result-${stage + 1}`); await wait(stage === 2 ? 5500 : 3000);
    if (stage === 0) {
      mark('frontier-route-choice');
      await page.getByRole('button', { name: new RegExp(route === 'grove' ? '选择林地航路' : '选择铸庭航路') }).click();
      mark(`frontier-route-${route}`); await shot(`frontier-route-${route}`); await wait(2500);
    } else if (stage === 1) {
      await button('前往终端').click(); mark('frontier-boss-briefing'); await wait(2600);
    }
  }
}
