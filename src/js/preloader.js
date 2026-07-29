import gsap from 'gsap';
import { REDUCED, qs, qsa } from './utils.js';

/**
 * Runs the loading sequence and resolves when the curtains are open.
 * The hero intro is chained by the caller.
 */
export function runPreloader() {
  const root = qs('#preloader');

  return new Promise((resolve) => {
    if (REDUCED) {
      root.style.display = 'none';
      resolve();
      return;
    }

    const words = qsa('[data-preloader-word]');
    const countEl = qs('#preloader-count');
    const bar = qs('#preloader-bar');
    const counter = { value: 0 };

    document.body.style.overflow = 'hidden';

    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete() {
        root.style.display = 'none';
        document.body.style.overflow = '';
        resolve();
      },
    });

    tl.from(words, {
      yPercent: 120,
      duration: 1,
      stagger: 0.12,
    })
      .from('.preloader__meta', { autoAlpha: 0, y: 16, duration: 0.6 }, '-=0.5')
      .to(
        counter,
        {
          value: 100,
          duration: 1.8,
          ease: 'power2.inOut',
          onUpdate() {
            countEl.textContent = String(Math.round(counter.value)).padStart(3, '0');
          },
        },
        '<'
      )
      .to(bar, { scaleX: 1, duration: 1.8, ease: 'power2.inOut' }, '<')
      // hold a beat, then leave
      .to(words, { yPercent: -120, duration: 0.8, stagger: 0.08, ease: 'expo.in' }, '+=0.15')
      .to('.preloader__meta', { autoAlpha: 0, duration: 0.3 }, '<')
      .to(bar.parentElement, { autoAlpha: 0, duration: 0.3 }, '<')
      .to('.preloader__curtain--top', { yPercent: -101, duration: 1, ease: 'expo.inOut' }, '-=0.2')
      .to('.preloader__curtain--bottom', { yPercent: 101, duration: 1, ease: 'expo.inOut' }, '<');
  });
}
