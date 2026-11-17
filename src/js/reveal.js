import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { REDUCED, qsa } from './utils.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const CLIP_FROM = 'inset(-20% 100% -20% 0%)';
export const CLIP_TO = 'inset(-20% 0% -20% 0%)';

/**
 * House text reveal: masked lines, words rise 110% → 0, power4, .04 stagger,
 * +.05 per line. autoSplit re-measures the lines whenever the element's width
 * changes or fonts finish loading, so lines never break in the wrong place.
 * Returns a small controller: play() / reverse(timeScale).
 */
export function splitReveal(el) {
  const ctl = { tl: null, state: 'idle', ts: 1 };
  SplitText.create(el, {
    type: 'lines, words',
    mask: 'lines',
    linesClass: 'sline',
    autoSplit: true,
    onSplit(self) {
      const progress = ctl.tl ? ctl.tl.progress() : 0;
      ctl.tl?.kill();
      const tl = gsap.timeline({ paused: true });
      self.lines.forEach((line, i) => {
        tl.fromTo(line.querySelectorAll('div'), { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.04 }, i * 0.05);
      });
      tl.progress(progress);
      if (ctl.state === 'play') tl.timeScale(1).play();
      else if (ctl.state === 'reverse') tl.timeScale(ctl.ts).reverse();
      ctl.tl = tl;
    },
  });
  return {
    play() { ctl.state = 'play'; ctl.tl?.timeScale(1).play(); },
    reverse(ts = 1) { ctl.state = 'reverse'; ctl.ts = ts; ctl.tl?.timeScale(ts).reverse(); },
  };
}

export function initReveals() {
  if (REDUCED) return;

  qsa('[data-reveal]').forEach((el) => {
    const reveal = splitReveal(el);
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => reveal.play() });
  });

  qsa('[data-clip]').forEach((el) => {
    gsap.set(el, { clipPath: CLIP_FROM });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(el, { clipPath: CLIP_TO, duration: 0.7, ease: 'power2.inOut' }),
    });
  });
}

/** Count-up (1.4s, cubic out) when the number scrolls in. */
export function initCounters() {
  qsa('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    if (REDUCED) { el.textContent = target; return; }
    const st = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(st, { v: target, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(st.v)) }),
    });
  });
}
