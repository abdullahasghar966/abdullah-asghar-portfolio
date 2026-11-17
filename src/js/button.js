import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { REDUCED, FINE_POINTER, qsa } from './utils.js';

gsap.registerPlugin(MorphSVGPlugin);

const ARROW = 'M2.2 11.2 0.8 9.8 7.6 3H2.4V1H11v8.6H9V4.4Z';
const ARROW_TOP = 'M9.9 2.1 10 2 10.1 2.1 10 2.2Z';
const ARROW_BOTTOM = 'M1.9 10.1 2 10 2.1 10.1 2 10.2Z';
const LAYERS = ['var(--c-lilac)', 'var(--c-sky)', 'var(--c-peach)', 'var(--volt)'];

const layerHTML = () =>
  `<span class="btn_layer btn_layer--solid"></span>` +
  LAYERS.map((c) => `<span class="btn_layer" style="background:${c}"></span>`).join('');

/**
 * Signature button: an organic arrow blob next to a text pill. On hover four
 * colour layers wipe across on skewed edges, every letter swells in weight and
 * size with a random tilt, and the arrow morphs out and back in.
 */
export function initButtons(scope = document) {
  qsa('[data-btn]', scope).forEach(build);
}

function build(btn) {
  if (btn.dataset.built) return;
  btn.dataset.built = '1';
  const text = btn.textContent.trim();
  btn.setAttribute('aria-label', btn.getAttribute('aria-label') || text);
  btn.innerHTML =
    `<span class="btn_arrow" aria-hidden="true"><span class="btn_arrow-clip">${layerHTML()}</span>` +
    `<svg viewBox="0 0 12 12"><path class="btn_a1" d="${ARROW}"/><path class="btn_a2" d="${ARROW_BOTTOM}" style="fill:var(--ink)"/></svg></span>` +
    `<span class="btn_text" aria-hidden="true">${layerHTML()}<span class="btn_label"></span></span>`;

  const label = btn.querySelector('.btn_label');
  const chars = [...text].map((ch) => {
    const s = document.createElement('span');
    s.className = ch === ' ' ? 'char is-space' : 'char';
    s.textContent = ch === ' ' ? ' ' : ch;
    label.appendChild(s);
    return s;
  });
  btn.classList.add('is-built');
  if (REDUCED || !FINE_POINTER) return;

  let tl;
  const make = () => {
    tl?.kill();
    // lock widths so the weight swell never reflows the pill
    chars.forEach((c) => (c.style.width = ''));
    const widths = chars.map((c) => c.getBoundingClientRect().width);
    chars.forEach((c, i) => (c.style.width = widths[i] + 'px'));

    const groups = [...btn.querySelectorAll('.btn_arrow-clip, .btn_text')].map((g) => [...g.querySelectorAll('.btn_layer')]);
    const link = () =>
      groups.forEach((g) => g.forEach((l, i) => l.style.setProperty('--next', g[i + 1]?.style.getPropertyValue('--progress') || 0)));

    tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut', duration: 1 }, onUpdate: link });
    groups.forEach((g) => {
      const items = g.slice(1);
      gsap.set(items, { '--progress': 0 });
      items.forEach((l, i) => tl.to(l, { '--progress': 1, duration: 1.5 }, i * 0.04));
    });
    gsap.set(chars, { '--progress': 0, '--enter': 0, '--leave': 0 });
    tl.to(chars, { '--progress': 1, stagger: 0.02 }, 0.2);
    chars.forEach((c, i) => {
      tl.to(c, { '--enter': 1, duration: 0.6, ease: 'circ.in' }, i * 0.02 + 0.2);
      tl.to(c, { '--leave': 1, duration: 0.4, ease: 'circ.in' }, i * 0.02 + 0.6);
    });
    const [a1, a2] = btn.querySelectorAll('svg path');
    tl.fromTo(a1, { morphSVG: ARROW }, { morphSVG: ARROW_TOP, duration: 1 }, 0);
    tl.fromTo(a2, { morphSVG: ARROW_BOTTOM }, { morphSVG: ARROW, duration: 1 }, 0.3);
    link();
  };

  let ready = false;
  const ensure = () => { if (!ready) { make(); ready = true; } };
  btn.addEventListener('mouseenter', () => {
    ensure();
    chars.forEach((c) => c.style.setProperty('--deg', gsap.utils.random(-8, 8, 2) + 'deg'));
    tl.timeScale(1.25).play();
  });
  btn.addEventListener('mouseleave', () => tl?.timeScale(1.25).reverse());
  btn.addEventListener('btn:rebuild', () => { ready = false; });
}
