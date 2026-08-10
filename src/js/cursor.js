import gsap from 'gsap';
import { REDUCED, FINE_POINTER, qs } from './utils.js';

export function initCursor() {
  if (!FINE_POINTER || REDUCED) return;

  const cursor = qs('#cursor');
  const dot = qs('#cursor-dot');
  const ring = qs('#cursor-ring');
  const label = qs('#cursor-label');

  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });

  gsap.set([dot, ring], { xPercent: 0, yPercent: 0 });

  window.addEventListener('mousemove', (e) => {
    dotX(e.clientX);
    dotY(e.clientY);
    ringX(e.clientX);
    ringY(e.clientY);
  });

  const setState = (state) => {
    const big = state === 'view' || state === 'play';
    cursor.classList.toggle('is-view', big);
    cursor.classList.toggle('is-link', state === 'link');
    if (big) label.textContent = state === 'play' ? 'PLAY' : 'VIEW';
    gsap.to(ring, {
      scale: big ? 1.9 : state === 'link' ? 1.35 : 1,
      duration: 0.35,
      ease: 'power3.out',
    });
    gsap.to(dot, { opacity: big ? 0 : 1, duration: 0.25 });
  };

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-cursor]');
    setState(target ? target.dataset.cursor : null);
  });

  window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
  window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));

  document.documentElement.addEventListener('mouseleave', () =>
    gsap.to([dot, ring], { opacity: 0, duration: 0.25 })
  );
  document.documentElement.addEventListener('mouseenter', () =>
    gsap.to([dot, ring], { opacity: 1, duration: 0.25 })
  );
}
