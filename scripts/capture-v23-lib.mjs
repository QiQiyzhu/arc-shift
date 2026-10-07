// Capture instrumentation observes the game; all gameplay mutations use UI input.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export async function createCapture({ out, url, mode, recording = true }) {
  fs.mkdirSync(out, { recursive: true });
  if (fs.existsSync(path.join(out, 'capture.json')))
    throw Error(`Capture directory already has a take: ${out}`);
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    ...(recording ? { recordVideo: { dir: out, size: { width: 1920, height: 1080 } } } : {}),
  });
  await context.addInitScript(() => {
    const tracks = (window.__v23AudioTracks = []);
    const byContext = new WeakMap();
    // oxlint-disable-next-line typescript/unbound-method -- receiver retained below.
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (...args) {
      if (args[0] === this.context.destination) {
        let track = byContext.get(this.context);
        if (!track) {
          const destination = this.context.createMediaStreamDestination();
          const recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });
          track = { destination, recorder, context: this.context, chunks: [], clock: [], started: Date.now() };
          byContext.set(this.context, track);
          tracks.push(track);
          recorder.ondataavailable = (e) => track.chunks.push(e.data);
          const sample = () => track.clock.push({ wall: Date.now(), clock: track.context.currentTime, state: track.context.state });
          sample();
          track.timer = setInterval(sample, 50);
          recorder.start(1000);
        }
        connect.call(this, track.destination);
      }
      return connect.apply(this, args);
    };
  });
  const videoStart = Date.now();
  const page = await context.newPage();
  const events = [], errors = [], audioTakes = [];
  page.on('pageerror', (e) => errors.push({ at: (Date.now() - videoStart) / 1000, message: e.message }));
  const mark = (name, detail = {}) => {
    const event = { name, seconds: (Date.now() - videoStart) / 1000, ...detail };
    events.push(event);
    console.log(JSON.stringify(event));
    return event;
  };
  const shot = async (name) => {
    mark(`shot:${name}`);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
  };
  const flushAudio = async () => {
    const tracks = await page.evaluate(async () => {
      const result = [];
      for (const track of window.__v23AudioTracks || []) {
        if (track.exported) continue;
        clearInterval(track.timer);
        track.clock.push({ wall: Date.now(), clock: track.context.currentTime, state: track.context.state });
        if (track.recorder.state !== 'inactive') {
          await new Promise((resolve) => { track.recorder.onstop = resolve; track.recorder.stop(); });
        }
        track.exported = true;
        result.push({
          started: track.started, clock: track.clock,
          bytes: Array.from(new Uint8Array(await new Blob(track.chunks).arrayBuffer())),
        });
      }
      return result;
    });
    for (const track of tracks) {
      const file = `game-audio-${String(audioTakes.length + 1).padStart(2, '0')}.webm`;
      fs.writeFileSync(path.join(out, file), Buffer.from(track.bytes));
      audioTakes.push({ file, started: track.started, offsetMs: track.started - videoStart, clock: track.clock });
    }
  };
  const navigate = async (target) => {
    await flushAudio();
    await page.goto(new URL(target, url).href);
  };
  const finish = async (extra = {}) => {
    await page.mouse.up().catch(() => {});
    for (const key of ['w', 'a', 's', 'd']) await page.keyboard.up(key).catch(() => {});
    await flushAudio().catch((e) => errors.push({ message: `Audio flush: ${e.message}` }));
    const video = page.video();
    const videoFile = video ? path.basename(await video.path()) : null;
    const meta = {
      version: '2.3', mode, recording, url, videoStart, videoFile,
      capturedAt: new Date().toISOString(), duration: (Date.now() - videoStart) / 1000,
      events, audioTakes, errors, ...extra,
      disclosure: 'Fresh browser game capture. Scripted ordinary keyboard, pointer and menu controls. QA world/session state is read-only. Not a human playtest.',
    };
    fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(meta, null, 2));
    const manifest = [];
    const walk = (directory) => {
      if (!fs.existsSync(directory)) return;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(full);
        else manifest.push({ file: full.replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') });
      }
    };
    for (const directory of ['src', 'app', 'public/art', 'public/audio']) walk(directory);
    fs.writeFileSync(path.join(out, 'source-manifest.json'), JSON.stringify(manifest, null, 2));
    await context.close();
    await browser.close();
    return meta;
  };
  return { page, mark, shot, flushAudio, navigate, finish, wait: (ms) => page.waitForTimeout(ms) };
}

export async function observe(page, harness = 'arcQA') {
  return page.evaluate((key) => {
    const qa = window[key], session = qa?.session, w = (session?.engine || qa?.engine)?.world;
    if (!w) return null;
    return {
      session: session?.state, stage: session?.stage, route: session?.route,
      objective: session?.objective ? JSON.parse(JSON.stringify(session.objective)) : null,
      phase: w.phase, ticks: session?.ticks, weapon: w.weapon,
      blocks: w.terrain.blocks.map((block) => ({ ...block })),
      wallet: { ...w.wallet },
      p: { x: w.player.x, y: w.player.y, hp: w.player.hp, q: w.player.qCd, e: w.player.eCd, dash: w.player.dashCd },
      enemies: w.enemies.filter((e) => e.hp > 0).map((e) => ({ x: e.x, y: e.y, hp: e.hp, kind: e.kind, state: e.state, attackIndex: e.attackIndex, aimX: e.aimX, aimY: e.aimY })),
      hazards: w.hazards.filter((h) => !h.friendly).map((h) => ({ x: h.x, y: h.y, r: h.r, time: h.time })),
      bullets: w.projectiles.items.filter((b) => b.active && b.enemy).map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })),
    };
  }, harness);
}

export function createPilot(page) {
  let held = new Set(), step = 0;
  const release = async () => {
    for (const key of held) await page.keyboard.up(key);
    held = new Set();
    await page.mouse.up();
  };
  const drive = async (state, options = {}) => {
    const box = await page.locator('canvas').boundingBox();
    if (!box) throw Error('No visible game canvas');
    const nearest = options.target || [...state.enemies].sort((a, b) => Math.hypot(a.x - state.p.x, a.y - state.p.y) - Math.hypot(b.x - state.p.x, b.y - state.p.y))[0];
    const target = nearest || { x: 640, y: 260 };
    await page.mouse.move(box.x + target.x / 1280 * box.width, box.y + target.y / 720 * box.height);
    await page.mouse.down();
    const dx = target.x - state.p.x, dy = target.y - state.p.y, distance = Math.hypot(dx, dy) || 1;
    let vx = -dy / distance * 0.6, vy = dx / distance * 0.6;
    const close = state.weapon === 'sword' ? 65 : 190, far = state.weapon === 'sword' ? 110 : 280;
    if (distance < close) { vx -= dx / distance * 1.4; vy -= dy / distance * 1.4; }
    else if (distance > far) { vx += dx / distance; vy += dy / distance; }
    if (options.destination) {
      const mx = options.destination.x - state.p.x, my = options.destination.y - state.p.y, md = Math.hypot(mx, my) || 1;
      vx = md > (options.radius ?? 24) ? mx / md * 1.7 : 0;
      vy = md > (options.radius ?? 24) ? my / md * 1.7 : 0;
    }
    if (state.p.x < 170) vx += 2;
    if (state.p.x > 1110) vx -= 2;
    if (state.p.y < 160) vy += 2;
    if (state.p.y > 590) vy -= 2;
    let danger = false;
    if (!options.holdObjective) {
      for (const bullet of state.bullets) {
        const bx = bullet.x + bullet.vx * 0.18 - state.p.x, by = bullet.y + bullet.vy * 0.18 - state.p.y, bd = Math.hypot(bx, by) || 1;
        if (bd < 85) { vx -= bx / bd; vy -= by / bd; danger = true; }
      }
      for (const hazard of state.hazards) {
        const hx = hazard.x - state.p.x, hy = hazard.y - state.p.y, hd = Math.hypot(hx, hy) || 1;
        if (hd < hazard.r + 65) { vx -= hx / hd * 2.4; vy -= hy / hd * 2.4; if (hazard.time < 0.55) danger = true; }
      }
    }
    if (!options.destination && nearest?.kind === 'warden' && ((nearest.state === 'attack' && distance < 240) || (nearest.state === 'telegraph' && nearest.attackIndex % 3 === 2 && distance < 400))) {
      const ax = nearest.aimX - nearest.x, ay = nearest.aimY - nearest.y, ad = Math.hypot(ax, ay) || 1;
      const side = (state.p.x - nearest.x) * -ay + (state.p.y - nearest.y) * ax >= 0 ? 1 : -1;
      vx = -ay / ad * side * 2; vy = ax / ad * side * 2; danger = true;
    }
    const next = new Set();
    if (vx < -0.2) next.add('a'); if (vx > 0.2) next.add('d');
    if (vy < -0.2) next.add('w'); if (vy > 0.2) next.add('s');
    for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
    for (const key of next) if (!held.has(key)) await page.keyboard.down(key);
    held = next;
    if (danger && state.p.dash <= 0) await page.keyboard.press('Space');
    if (step++ % 7 === 0) {
      if (state.p.q <= 0 && distance < 280) await page.keyboard.press('q');
      if (state.p.e <= 0) await page.keyboard.press('e');
    }
    await page.waitForTimeout(100);
  };
  return { drive, release };
}
