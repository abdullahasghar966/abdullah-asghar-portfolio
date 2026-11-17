import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { REDUCED, FINE_POINTER, qsa, onVisible } from './utils.js';

gsap.registerPlugin(MorphSVGPlugin);

/**
 * Animated black pictograms for the service cards. Each one loops while the
 * card is on screen and runs twice as fast while hovered.
 * viewBox is 200×100, anchored bottom-left.
 */
const CIRCLE = (cx, cy, r) => `M${cx} ${cy - r}C${cx + r * 0.552} ${cy - r} ${cx + r} ${cy - r * 0.552} ${cx + r} ${cy}S${cx + r * 0.552} ${cy + r} ${cx} ${cy + r} ${cx - r} ${cy + r * 0.552} ${cx - r} ${cy} ${cx - r * 0.552} ${cy - r} ${cx} ${cy - r}Z`;
const ARCH = 'M0 100V50C0 22.4 22.4 0 50 0S100 22.4 100 50V100H72V52C72 40 62 30 50 30S28 40 28 52V100Z';
const QUARTER = 'M0 0C55.2 0 100 44.8 100 100H0Z';
const STAR = (cx, cy, R, r, n = 5) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
  }
  return d + 'Z';
};
const HEX = (cx, cy, r) => {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
  }
  return d + 'Z';
};

const ICONS = {
  dots: {
    svg: [0, 1, 2, 3].map((i) => `<circle cx="${25 + i * 50}" cy="50" r="25"/>`).join(''),
    anim: (s) => gsap.timeline({ repeat: -1, repeatDelay: 0.7 })
      .to(s.querySelectorAll('circle'), { scaleX: 0.22, transformOrigin: '50% 50%', duration: 0.45, ease: 'power2.inOut', stagger: 0.1, yoyo: true, repeat: 1 }),
  },
  grid: {
    svg: Array.from({ length: 12 }, (_, i) => `<rect x="${(i % 4) * 25}" y="${Math.floor(i / 4) * 33.3}" width="25" height="33.3"/>`).join(''),
    anim: (s) => {
      const cells = [...s.querySelectorAll('rect')];
      cells.forEach((c, i) => gsap.set(c, { scale: (i % 4 + Math.floor(i / 4)) % 2 ? 0 : 1, transformOrigin: '50% 50%' }));
      return gsap.timeline({ repeat: -1, repeatDelay: 0.6, yoyo: true })
        .to(cells, { scale: (i) => ((i % 4 + Math.floor(i / 4)) % 2 ? 1 : 0), duration: 0.5, ease: 'back.inOut(2)', stagger: { each: 0.05, from: 'random' } });
    },
  },
  arch: {
    svg: `<path d="${ARCH}"/>`,
    anim: (s) => {
      const p = s.querySelector('path');
      return gsap.timeline({ repeat: -1, defaults: { duration: 0.7, ease: 'power3.inOut' } })
        .to(p, { morphSVG: CIRCLE(50, 50, 50) }, '+=0.6')
        .to(p, { morphSVG: QUARTER }, '+=0.6')
        .to(p, { morphSVG: ARCH }, '+=0.6');
    },
  },
  pill: {
    svg: '<rect class="ico_stroke" x="8" y="18" width="164" height="76" rx="38" stroke-width="15"/><circle cx="56" cy="56" r="24"/>',
    anim: (s) => gsap.timeline({ repeat: -1, repeatDelay: 0.5, yoyo: true })
      .to(s.querySelector('circle'), { x: 68, duration: 0.6, ease: 'back.inOut(1.6)' }),
  },
  stack: {
    svg: '<rect x="0" y="6" width="190" height="20"/><rect x="0" y="40" width="150" height="20"/><rect x="0" y="74" width="110" height="20"/>',
    anim: (s) => gsap.timeline({ repeat: -1, repeatRefresh: true, repeatDelay: 0.4 })
      .to(s.querySelectorAll('rect'), { scaleX: () => gsap.utils.random(0.35, 1), transformOrigin: '0% 50%', duration: 0.7, ease: 'power3.inOut', stagger: 0.08 }),
  },
  star: {
    svg: `<path d="${STAR(50, 52, 50, 21)}"/>`,
    anim: (s) => gsap.timeline({ repeat: -1 })
      .to(s.querySelector('path'), { rotate: '+=72', transformOrigin: '50% 52%', duration: 0.7, ease: 'back.out(2.2)' }, '+=0.7'),
  },
  wave: {
    svg: Array.from({ length: 10 }, (_, i) => `<rect x="${i * 19}" y="0" width="11" height="100" rx="5.5"/>`).join(''),
    anim: (s) => gsap.timeline().fromTo(s.querySelectorAll('rect'), { scaleY: 1 }, {
      scaleY: 0.18, transformOrigin: '50% 50%', duration: 0.55, ease: 'sine.inOut', stagger: { each: 0.08, repeat: -1, yoyo: true },
    }),
  },
  cube: {
    svg: `<path d="${HEX(52, 50, 50)}"/>`,
    anim: (s) => {
      const p = s.querySelector('path');
      return gsap.timeline({ repeat: -1, defaults: { ease: 'power3.inOut' } })
        .to(p, { rotate: '+=60', transformOrigin: '50% 50%', duration: 0.8 }, '+=0.5')
        .to(p, { morphSVG: CIRCLE(52, 50, 46), duration: 0.6 }, '+=0.3')
        .to(p, { morphSVG: HEX(52, 50, 50), duration: 0.6 }, '+=0.4');
    },
  },
  spark: {
    svg: `<path d="${STAR(50, 50, 52, 12, 4)}"/>`,
    anim: (s) => gsap.timeline({ repeat: -1, defaults: { transformOrigin: '50% 50%' } })
      .to(s.querySelector('path'), { rotate: '+=90', scale: 0.55, duration: 0.45, ease: 'power2.in' }, '+=0.4')
      .to(s.querySelector('path'), { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' }),
  },
  bars: {
    svg: Array.from({ length: 7 }, (_, i) => `<rect x="${i * 27}" y="0" width="17" height="100" rx="8.5"/>`).join(''),
    anim: (s) => gsap.timeline({ repeat: -1, repeatRefresh: true })
      .to(s.querySelectorAll('rect'), { scaleY: () => gsap.utils.random(0.15, 1), transformOrigin: '50% 100%', duration: 0.32, ease: 'power2.inOut', stagger: 0.03 }),
  },
  ring: {
    svg: '<circle class="ico_stroke" cx="50" cy="50" r="38" stroke-width="18"/><g class="ico_orbit"><circle cx="50" cy="-4" r="12"/></g>',
    anim: (s) => gsap.timeline({ repeat: -1 })
      .to(s.querySelector('.ico_orbit'), { rotate: 360, svgOrigin: '50 50', duration: 2.4, ease: 'none' }),
  },
  half: {
    svg: '<path d="M30 0C57.6 0 80 22.4 80 50S57.6 100 30 100Z"/><path d="M110 0C82.4 0 60 22.4 60 50S82.4 100 110 100Z" transform="translate(60 0)"/>',
    anim: (s) => {
      const [a, b] = s.querySelectorAll('path');
      return gsap.timeline({ repeat: -1, repeatDelay: 0.5, yoyo: true, defaults: { duration: 0.7, ease: 'power3.inOut' } })
        .to(a, { x: 40 }, 0)
        .to(b, { x: -40 }, 0);
    },
  },
};

export function initIcons() {
  qsa('.scard .ico').forEach((holder) => {
    const type = [...holder.classList].find((c) => c.startsWith('ico--'))?.slice(5);
    const def = ICONS[type];
    if (!def) return;
    holder.innerHTML = `<svg viewBox="0 0 200 100" preserveAspectRatio="xMinYMax meet" aria-hidden="true">${def.svg}</svg>`;
    if (REDUCED) return;
    const tl = def.anim(holder.firstChild);
    tl.pause();
    let inView = false;
    onVisible(holder, (v) => { inView = v; v ? tl.play() : tl.pause(); });
    if (FINE_POINTER) {
      const card = holder.closest('.scard');
      card.addEventListener('mouseenter', () => gsap.to(tl, { timeScale: 2.2, duration: 0.3 }));
      card.addEventListener('mouseleave', () => gsap.to(tl, { timeScale: 1, duration: 0.5 }));
    }
    void inView;
  });
}
