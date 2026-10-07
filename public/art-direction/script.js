/* This page observes its own controls only; it does not access either game's save. */
(() => {
  'use strict';

  // Activate a comparison only after the image owners supply matching captures.
  const pairs = {
    'arc-menu': {
      after: 'assets/arc-menu-after.png',
      status: '同条件菜单对照 · 本轮视觉迭代',
      caption: '真实浏览器截图 · 前后均为 1366 × 768、中文、全新浏览器会话与公开菜单操作。原有主视觉保持不变；对照显示本轮界面布局、字阶与程序绘制铭刻的变化。',
    },
    'aegis-briefing': {
      after: 'assets/aegis-briefing-after.png',
      status: '同条件原生简报对照 · 开发探针采集',
      caption: '前后均为 1600 × 900、中文、Unreal Editor 游戏模式、D3D11 离屏原生渲染与自动菜单操作。新版用实际任务节点的程序绘制图替换插画；这组图不是 Shipping 包或真人试玩证据。',
    },
    'arc-combat': {
      after: 'assets/arc-combat-after.png',
      reduced: 'assets/arc-combat-reduced.png',
      status: '固定状态视觉夹具 · 非普通战斗实录',
    },
  };

  for (const block of document.querySelectorAll('[data-comparison]')) {
    const pair = pairs[block.dataset.comparison];
    if (!pair?.after) continue;
    const view = block.querySelector('.compare-view');
    const afterLayer = block.querySelector('.compare-after');
    const afterImage = afterLayer.querySelector('img');
    const beforeImage = block.querySelector('.compare-before');
    const slider = block.querySelector('.compare-slider');
    const status = block.querySelector('[data-pair-status]');
    const variantButtons = block.querySelectorAll('[data-variant]');
    const update = () => {
      const value = Math.max(0, Math.min(100, Number(slider.value)));
      view.style.setProperty('--split', `${value}%`);
      const description = `更新前 ${value}% / 更新后 ${100 - value}%`;
      slider.setAttribute('aria-valuetext', description);
      block.querySelector('.compare-value').textContent = description;
      block.querySelector('.before-label').style.opacity = value < 8 ? '0' : '1';
      block.querySelector('.after-label').style.opacity = value > 92 ? '0' : '1';
      for (const button of block.querySelectorAll('[data-split]')) {
        button.setAttribute('aria-pressed', String(Number(button.dataset.split) === value));
      }
    };
    const enable = () => {
      if (!beforeImage.naturalWidth || !afterImage.naturalWidth) return;
      if (beforeImage.naturalWidth !== afterImage.naturalWidth || beforeImage.naturalHeight !== afterImage.naturalHeight) {
        status.textContent = '截图尺寸不匹配，未启用叠加对照';
        return;
      }
      for (const part of block.querySelectorAll('.compare-after,.compare-divider,.after-label,.compare-slider,.compare-toolbar')) part.hidden = false;
      status.textContent = pair.status || '同条件实机画面对照';
      if (pair.caption) block.querySelector('[data-caption]').textContent = pair.caption;
      const caption = block.querySelector('.figure-caption');
      let links = caption.querySelector('.image-links');
      if (!links) {
        links = document.createElement('div');
        links.className = 'image-links';
        const baselineLink = caption.querySelector('a');
        links.append(baselineLink);
        const afterLink = document.createElement('a');
        afterLink.className = 'after-original';
        afterLink.target = '_blank';
        afterLink.rel = 'noopener';
        afterLink.textContent = '更新后原图 ↗';
        links.append(afterLink);
        caption.append(links);
      }
      links.querySelector('.after-original').href = afterImage.src;
      update();
    };
    afterImage.addEventListener('load', enable);
    beforeImage.addEventListener('load', enable);
    afterImage.addEventListener('error', () => { status.textContent = '更新后画面暂不可用，仍可查看基线原图'; });
    const loadAfter = () => { afterImage.loading = 'eager'; afterImage.src = pair.after; };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) { loadAfter(); observer.disconnect(); }
      }, { rootMargin: '350px' });
      observer.observe(block);
    } else loadAfter();
    slider.addEventListener('input', update);
    for (const button of block.querySelectorAll('[data-split]')) {
      button.addEventListener('click', () => { slider.value = button.dataset.split; update(); });
    }
    for (const button of variantButtons) {
      button.addEventListener('click', () => {
        const isReduced = button.dataset.variant === 'reduced';
        if (isReduced && !pair.reduced) return;
        afterImage.src = isReduced ? pair.reduced : pair.after;
        block.querySelector('.after-label').textContent = isReduced ? '更新后 · 减少动态 + 专注特效' : '更新后 · 标准特效';
        for (const item of variantButtons) item.setAttribute('aria-pressed', String(item === button));
      });
    }
    enable();
  }

  for (const video of document.querySelectorAll('video[data-poster]')) {
    const loadPoster = () => { video.poster = video.dataset.poster; };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) { loadPoster(); observer.disconnect(); }
      }, { rootMargin: '250px' });
      observer.observe(video);
    } else loadPoster();
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
    window.addEventListener('pagehide', () => video.pause());
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.querySelector('.rhythm-stage');
  const play = document.querySelector('#play-rhythm');
  const calm = document.querySelector('#calm-demo');
  const status = document.querySelector('#rhythm-status');
  const phases = ['蓄势 / 方向先被看见', '重音 / 事件得到确认', '消散 / 视野交还玩家'];
  let frame = 0;
  let playing = false;
  let currentPhase = 0;
  let started = 0;

  function showPhase(phase) {
    currentPhase = phase;
    stage.dataset.phase = String(phase);
    status.textContent = phases[phase];
    for (const button of document.querySelectorAll('[data-phase]')) {
      if (button instanceof HTMLButtonElement) button.setAttribute('aria-pressed', String(Number(button.dataset.phase) === phase));
    }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    playing = false;
    stage.classList.remove('is-playing');
    play.innerHTML = calm.checked ? '下一拍 <span aria-hidden="true">→</span>' : '播放一次 <span aria-hidden="true">▶</span>';
  }
  function tick(time) {
    if (!playing) return;
    const elapsed = time - started;
    const phase = elapsed < 650 ? 0 : elapsed < 950 ? 1 : 2;
    if (phase !== currentPhase) showPhase(phase);
    if (elapsed >= 1800) { stop(); return; }
    frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    if (calm.checked) { stop(); showPhase((currentPhase + 1) % phases.length); return; }
    if (playing) { stop(); return; }
    showPhase(0);
    stage.classList.add('is-playing');
    playing = true;
    started = performance.now();
    play.innerHTML = '暂停示意 <span aria-hidden="true">Ⅱ</span>';
    frame = requestAnimationFrame(tick);
  });
  for (const button of document.querySelectorAll('button[data-phase]')) button.addEventListener('click', () => { stop(); showPhase(Number(button.dataset.phase)); });
  for (const button of document.querySelectorAll('button[data-world]')) {
    button.addEventListener('click', () => {
      stop();
      stage.dataset.world = button.dataset.world;
      for (const item of document.querySelectorAll('button[data-world]')) item.setAttribute('aria-pressed', String(item === button));
    });
  }
  calm.checked = reduced.matches;
  calm.addEventListener('change', stop);
  reduced.addEventListener('change', () => { calm.checked = reduced.matches; stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  stop();
})();
