'use strict';
(() => {
  const dialog = document.getElementById('media-dialog');
  const title = document.getElementById('media-title');
  const content = document.getElementById('media-content');
  const original = document.getElementById('media-original');
  let opener;
  document.addEventListener('click', event => {
    const trigger = event.target.closest('a[data-view]');
    if (!trigger || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !dialog.showModal) return;
    event.preventDefault();
    opener = trigger;
    title.textContent = trigger.dataset.title || '原始运行媒体';
    original.setAttribute('href', trigger.getAttribute('href'));
    const media = document.createElement(trigger.dataset.view === 'video' ? 'video' : 'img');
    media.src = trigger.href;
    if (media.tagName === 'VIDEO') {
      media.controls = true;
      media.playsInline = true;
      media.preload = 'metadata';
      media.setAttribute('aria-label', title.textContent);
    } else media.alt = trigger.querySelector('img')?.alt || title.textContent;
    content.replaceChildren(media);
    dialog.showModal();
    document.getElementById('close-media').focus();
  });
  document.getElementById('close-media').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    content.querySelector('video')?.pause();
    content.replaceChildren();
    opener?.focus();
  });
})();
