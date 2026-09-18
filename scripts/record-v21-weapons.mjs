// Ordinary menu + keyboard/pointer input. Uses the built-in invincible practice
// mode explicitly; never presented as a normal challenge clear or human feedback.
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = process.argv[2] || 'outputs/v21/weapons';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: 'msedge',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
});
const started = Date.now(),
  events = [],
  errors = [];
await context.addInitScript(() => {
  window.captureAudio = [];
  // oxlint-disable-next-line typescript/unbound-method -- original receiver preserved.
  const native = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (...args) {
    if (args[0] === this.context.destination && !window.captureRecorder) {
      const destination = this.context.createMediaStreamDestination();
      native.call(this, destination);
      const recorder = (window.captureRecorder = new MediaRecorder(
        destination.stream,
        { mimeType: 'audio/webm;codecs=opus' },
      ));
      recorder.ondataavailable = (e) => window.captureAudio.push(e.data);
      recorder.start();
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
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5173/?qa');
  await page.getByRole('button', { name: '营地与图鉴', exact: true }).click();
  await page.getByRole('button', { name: '协议试炼', exact: true }).click();
  for (const [weapon, name, build] of [
    ['arc', '奥术法器', '钉穿重弹'],
    ['sword', '黎明圣剑', '回锋冰刃'],
    ['cannon', '裂核重炮', '三相炼星'],
  ]) {
    if (events.length)
      await page.getByRole('button', { name: '切换组合', exact: true }).click();
    await page
      .getByRole('button', { name: `装备${name}`, exact: true })
      .click();
    await page.getByRole('button', { name: new RegExp(build) }).click();
    await page.waitForFunction(
      () => window.arcQA.engine.world.phase === 'playing',
    );
    const box = await page.locator('canvas').boundingBox(),
      began = Date.now();
    events.push({ weapon, begin: (began - started) / 1000 });
    let held = new Set(),
      step = 0;
    await page.mouse.down();
    while (Date.now() - began < 10000) {
      const state = await page.evaluate(() => {
        const w = window.arcQA.engine.world,
          p = w.player;
        const e = w.enemies
          .filter((e) => e.hp > 0)
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          )[0];
        return {
          x: p.x,
          y: p.y,
          target: e ? { x: e.x, y: e.y } : { x: 640, y: 220 },
        };
      });
      await page.mouse.move(
        box.x + (state.target.x / 1280) * box.width,
        box.y + (state.target.y / 720) * box.height,
      );
      const desired = new Set();
      if (
        weapon === 'sword' &&
        Math.hypot(state.target.x - state.x, state.target.y - state.y) > 65
      ) {
        if (state.target.x - state.x > 25) desired.add('d');
        if (state.target.x - state.x < -25) desired.add('a');
        if (state.target.y - state.y > 25) desired.add('s');
        if (state.target.y - state.y < -25) desired.add('w');
      }
      for (const k of held) if (!desired.has(k)) await page.keyboard.up(k);
      for (const k of desired) if (!held.has(k)) await page.keyboard.down(k);
      held = desired;
      if (step++ === 35)
        await page.screenshot({ path: `${out}/${weapon}.png` });
      await page.waitForTimeout(100);
    }
    for (const k of held) await page.keyboard.up(k);
    await page.mouse.up();
    events.at(-1).end = (Date.now() - started) / 1000;
    events.at(-1).state = await page.evaluate(() => ({
      ...window.arcQA.snapshot(),
      music: window.arcQA.synth.musicState,
      render: window.arcQA.renderMetrics?.(),
    }));
  }
  const audio = await page.evaluate(async () => {
    clearInterval(window.audioClockTimer);
    const recorder = window.captureRecorder;
    const stop = new Promise((r) => (recorder.onstop = r));
    recorder.stop();
    await stop;
    return {
      began: window.audioStarted,
      clock: window.audioClock,
      data: Array.from(
        new Uint8Array(await new Blob(window.captureAudio).arrayBuffer()),
      ),
    };
  });
  fs.writeFileSync(`${out}/game-audio.webm`, Buffer.from(audio.data));
  fs.writeFileSync(
    `${out}/capture.json`,
    JSON.stringify(
      {
        events,
        started,
        audioOffsetMs: audio.began - started,
        audioClock: audio.clock,
        errors,
        disclosure:
          'Built-in invincible practice, real scripted controls, no world-state writes; not human playtesting.',
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
