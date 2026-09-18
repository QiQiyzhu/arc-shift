// A reproducible capture of the real browser game. World state is read only.
// All combat and card selections use ordinary pointer/keyboard input.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out = path.resolve(process.argv[2] || 'outputs/portfolio-capture');
const recording = process.argv.includes('--record');
const weapon =
  process.argv.find((a) => a.startsWith('--weapon='))?.split('=')[1] || 'arc';
const route = process.argv.includes('--supply') ? 'supply' : 'overload';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: 'msedge',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  ...(recording
    ? { recordVideo: { dir: out, size: { width: 1920, height: 1080 } } }
    : {}),
});
const videoStart = Date.now();
const page = await context.newPage();
const events = [],
  errors = [];
let began = Date.now();
page.on('pageerror', (e) => errors.push(e.message));
await context.addInitScript(() => {
  window.captureAudio = [];
  // oxlint-disable-next-line typescript/unbound-method -- called with the original receiver below.
  const native = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (...args) {
    if (args[0] === this.context.destination && !window.captureRecorder) {
      const destination = this.context.createMediaStreamDestination();
      native.call(this, destination);
      const r = (window.captureRecorder = new MediaRecorder(
        destination.stream,
        { mimeType: 'audio/webm;codecs=opus' },
      ));
      r.ondataavailable = (e) => window.captureAudio.push(e.data);
      r.start();
      window.audioStarted = Date.now();
      window.audioClock = [
        { wall: Date.now(), clock: this.context.currentTime },
      ];
      window.audioClockTimer = setInterval(
        () =>
          window.audioClock.push({
            wall: Date.now(),
            clock: this.context.currentTime,
          }),
        100,
      );
    }
    return native.apply(this, args);
  };
});
try {
  await page.goto('http://127.0.0.1:5173/build-trial?qa');
  await page.getByRole('heading', { name: '每一格能量，都有代价。' }).waitFor();
  began = Date.now();
  const mark = (name) =>
    events.push({ name, seconds: (Date.now() - videoStart) / 1000 });
  const wait = (ms) => page.waitForTimeout(recording ? ms : Math.min(ms, 200));
  const shot = async (name) => {
    await page.screenshot({ path: path.join(out, `${name}.png`) });
  };
  await page
    .getByRole('button', {
      name: `选择${{ arc: '法器', sword: '圣剑', cannon: '重炮' }[weapon]}`,
      exact: true,
    })
    .click();
  await wait(5000);
  mark('budget');
  await shot('01-planning');
  for (const name of ['三重星火', '余烬协议', '冰霜编码']) {
    await page
      .getByRole('button', { name: `装备${name}`, exact: true })
      .click();
    await wait(1100);
  }
  await shot('02-build');
  await wait(3000);
  for (let stage = 0; stage < 3; stage++) {
    mark(`combat-${stage + 1}`);
    await page.getByRole('button', { name: '锁定构筑，进入战场' }).click();
    await page.waitForFunction(() => window.buildTrialQA?.scene);
    const canvas = page.locator('canvas'),
      box = await canvas.boundingBox();
    let held = new Set(),
      step = 0,
      lastSkills = -100,
      paused = false;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    while (Date.now() - began < 300000) {
      const s = await page.evaluate(() => {
        const s = window.buildTrialQA?.session,
          w = s?.engine.world;
        return s && w
          ? {
              state: s.state,
              phase: w.phase,
              ticks: s.ticks,
              p: {
                x: w.player.x,
                y: w.player.y,
                hp: w.player.hp,
                q: w.player.qCd,
                e: w.player.eCd,
                dash: w.player.dashCd,
              },
              enemies: w.enemies
                .filter((e) => e.hp > 0)
                .map((e) => ({
                  x: e.x,
                  y: e.y,
                  hp: e.hp,
                  kind: e.kind,
                  state: e.state,
                  attackIndex: e.attackIndex,
                  aimX: e.aimX,
                  aimY: e.aimY,
                  radius: e.radius,
                  vx: e.vx,
                  vy: e.vy,
                })),
              hazards: w.hazards
                .filter((h) => !h.friendly)
                .map((h) => ({ x: h.x, y: h.y, r: h.r, time: h.time })),
              bullets: w.projectiles.items
                .filter((b) => b.active && b.enemy)
                .map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })),
            }
          : null;
      });
      if (!s || s.state !== 'combat') break;
      if (s.phase === 'playing') {
        const e = s.enemies.sort(
          (a, b) =>
            Math.hypot(a.x - s.p.x, a.y - s.p.y) -
            Math.hypot(b.x - s.p.x, b.y - s.p.y),
        )[0];
        if (!e) {
          await page.waitForTimeout(100);
          continue;
        }
        await page.mouse.move(
          box.x + (e.x / 1280) * box.width,
          box.y + (e.y / 720) * box.height,
        );
        const dx = e.x - s.p.x,
          dy = e.y - s.p.y,
          d = Math.hypot(dx, dy) || 1;
        let vx = (-dy / d) * 0.6,
          vy = (dx / d) * 0.6;
        const close = weapon === 'sword' ? 65 : stage === 2 ? 220 : 170,
          far = weapon === 'sword' ? 112 : stage === 2 ? 330 : 285;
        if (d < close) {
          vx -= (dx / d) * 1.4;
          vy -= (dy / d) * 1.4;
        } else if (d > far) {
          vx += dx / d;
          vy += dy / d;
        }
        // Steer inside the navigable floor; terrain collision remains authoritative.
        if (s.p.x < 240) vx += 2;
        if (s.p.x > 1040) vx -= 2;
        if (s.p.y < 210) vy += 2;
        if (s.p.y > 550) vy -= 2;
        let danger = false;
        for (const b of s.bullets) {
          const bx = b.x + b.vx * 0.18 - s.p.x,
            by = b.y + b.vy * 0.18 - s.p.y,
            bd = Math.hypot(bx, by);
          if (bd < 85) {
            vx -= bx / (bd || 1);
            vy -= by / (bd || 1);
            danger = true;
          }
        }
        // React only to visible threats, using read-only world data as observations.
        for (const h of s.hazards) {
          const hx = h.x - s.p.x,
            hy = h.y - s.p.y,
            hd = Math.hypot(hx, hy) || 1;
          if (hd < h.r + 65) {
            vx -= (hx / hd) * 2.4;
            vy -= (hy / hd) * 2.4;
            if (h.time < 0.55) danger = true;
          }
        }
        if (
          (e.state === 'attack' && e.kind === 'warden' && d < 240) ||
          (e.state === 'telegraph' &&
            e.kind === 'warden' &&
            e.attackIndex % 3 === 2 &&
            d < 400)
        ) {
          const ax = e.aimX - e.x,
            ay = e.aimY - e.y,
            ad = Math.hypot(ax, ay) || 1;
          const side = (s.p.x - e.x) * -ay + (s.p.y - e.y) * ax >= 0 ? 1 : -1;
          vx = (-ay / ad) * side * 2;
          vy = (ax / ad) * side * 2;
          danger = true;
        }
        const next = new Set();
        if (vx < -0.2) next.add('a');
        if (vx > 0.2) next.add('d');
        if (vy < -0.2) next.add('w');
        if (vy > 0.2) next.add('s');
        for (const k of held) if (!next.has(k)) await page.keyboard.up(k);
        for (const k of next) if (!held.has(k)) await page.keyboard.down(k);
        held = next;
        if (danger && s.p.dash <= 0) await page.keyboard.press('Space');
        if (step - lastSkills > 6) {
          if (s.p.q <= 0 && d < 260) await page.keyboard.press('q');
          if (s.p.e <= 0) await page.keyboard.press('e');
          lastSkills = step;
        }
        if (step === 20) await shot(`03-combat-${stage + 1}`);
        if (stage === 1 && !paused && s.ticks > 180) {
          for (const k of held) await page.keyboard.up(k);
          held.clear();
          await page.mouse.up();
          await page.keyboard.press('Escape');
          await page.getByRole('heading', { name: '试炼已暂停' }).waitFor();
          mark('pause');
          await wait(2200);
          await page
            .getByRole('button', { name: '继续试炼', exact: true })
            .click();
          await page.mouse.down();
          paused = true;
        }
      }
      step++;
      await page.waitForTimeout(110);
    }
    for (const k of held) await page.keyboard.up(k);
    await page.mouse.up();
    await page.getByRole('dialog', { name: '构筑战报' }).waitFor();
    mark(`result-${stage + 1}`);
    await shot(`04-result-${stage + 1}`);
    await wait(5000);
    const result = await page.evaluate(() =>
      window.buildTrialQA.session.export(),
    );
    fs.writeFileSync(
      path.join(out, 'actual-run.json'),
      JSON.stringify(result, null, 2),
    );
    if (result.state === 'failed')
      throw Error(`Trial failed: ${JSON.stringify(result.results.at(-1))}`);
    if (stage === 2) {
      await page.getByRole('button', { name: '查看远征总结' }).click();
      await wait(5000);
      await shot('05-summary');
      fs.writeFileSync(
        path.join(out, 'actual-run.json'),
        JSON.stringify(
          await page.evaluate(() => window.buildTrialQA.session.export()),
          null,
          2,
        ),
      );
      break;
    }
    await page
      .getByRole('button', {
        name: stage === 0 ? '选择航路合约' : '分配下一阶段预算',
      })
      .click();
    if (stage === 0) {
      mark('contract');
      await wait(5000);
      await shot('08-contract');
      await page
        .getByRole('button', {
          name: route === 'supply' ? '签订补给合约' : '签订夺能合约',
        })
        .click();
    }
    mark(`rebuild-${stage + 2}`);
    await wait(2600);
    if (stage === 0) {
      await page
        .getByRole('button', { name: '装备电弧引擎', exact: true })
        .click();
      await wait(2000);
    } else {
      for (const name of ['三重星火', '冰霜编码', '电弧引擎'])
        await page
          .getByRole('button', { name: `撤下${name}`, exact: true })
          .click();
      for (const name of route === 'supply'
        ? ['赤核陨星', '超频脉冲', '冰霜编码']
        : ['赤核陨星', '超频脉冲', '恒星燃料']) {
        await page
          .getByRole('button', { name: `装备${name}`, exact: true })
          .click();
        await wait(1600);
      }
      const repair = page.getByRole('button', { name: /修复 35 生命/ });
      if (await repair.isEnabled()) {
        await repair.click();
        mark('repair');
        await wait(2400);
      }
    }
    await shot(`02-build-${stage + 2}`);
    await wait(3500);
  }
  const audio = await page.evaluate(async () => {
    const r = window.captureRecorder;
    if (!r) return null;
    clearInterval(window.audioClockTimer);
    await new Promise((resolve) => {
      r.onstop = resolve;
      r.stop();
    });
    return {
      offset: window.audioStarted,
      clock: window.audioClock,
      bytes: Array.from(
        new Uint8Array(await new Blob(window.captureAudio).arrayBuffer()),
      ),
    };
  });
  if (audio)
    fs.writeFileSync(
      path.join(out, 'game-audio.webm'),
      Buffer.from(audio.bytes),
    );
  if (recording) {
    mark('editor');
    await page.goto('http://127.0.0.1:5173/dev/trial-editor');
    await page.getByRole('heading', { name: '把假设变成可试玩规则' }).waitFor();
    await wait(5000);
    await page.getByLabel('三重星火价格', { exact: true }).fill('2');
    await wait(3500);
    await shot('06-editor');
    await page.getByRole('button', { name: '应用并试玩构筑' }).click();
    await wait(2000);
    for (const name of ['三重星火', '超频脉冲', '电弧引擎']) {
      await page
        .getByRole('button', { name: `装备${name}`, exact: true })
        .click();
      await wait(1200);
    }
    mark('changed-rule');
    await shot('07-rule-preview');
    await wait(5500);
  }
  fs.writeFileSync(
    path.join(out, 'capture.json'),
    JSON.stringify(
      {
        recording,
        weapon,
        route,
        events,
        errors,
        audioOffsetMs: audio ? audio.offset - videoStart : null,
        audioClock: audio?.clock,
        videoStart,
        began,
        duration: (Date.now() - began) / 1000,
        disclosure:
          'Actual browser game controlled through scripted keyboard and pointer. No world-state writes, no human playtest claim.',
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ events, errors }));
} finally {
  await context.close();
  await browser.close();
}
