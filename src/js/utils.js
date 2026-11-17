export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
export const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
export const isPhone = () => window.matchMedia('(max-width: 479px)').matches;

export const qs = (sel, scope = document) => scope.querySelector(sel);
export const qsa = (sel, scope = document) => [...scope.querySelectorAll(sel)];

/** 1 design px in CSS px (the --u unit). */
let probe;
export const unit = () => {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:calc(1000 * var(--u));height:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
  }
  return probe.getBoundingClientRect().width / 1000 || window.innerWidth / 1920;
};

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Tiny event bus so sections can react to resize / load without knowing each other. */
const handlers = {};
export const bus = {
  on(evt, fn) { (handlers[evt] ||= []).push(fn); },
  emit(evt, ...args) { (handlers[evt] || []).forEach((fn) => fn(...args)); },
};

/** Debounced width-change resize (ignores mobile URL-bar height jitter). */
let lastW = window.innerWidth;
let rt;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (window.innerWidth === lastW && !FINE_POINTER) return;
    lastW = window.innerWidth;
    bus.emit('resize');
  }, 250);
});

/** Run fn when el first gets near the viewport; returns the observer. */
export function onVisible(el, fn, { rootMargin = '10%', once = false } = {}) {
  const io = new IntersectionObserver(([e]) => {
    fn(e.isIntersecting);
    if (once && e.isIntersecting) io.disconnect();
  }, { rootMargin });
  io.observe(el);
  return io;
}
