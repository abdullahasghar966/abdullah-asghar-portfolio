import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { REDUCED, TOUCH } from './utils.js';

let lenis = null;
export const getLenis = () => lenis;

/**
 * Lenis, tuned like the reference: 1.4s expo-out glide, a slightly faster
 * wheel, native touch scrolling. Ticked by GSAP so Lenis, ScrollTrigger and
 * every tween share one requestAnimationFrame.
 */
export function initScroll() {
  history.scrollRestoration = 'manual';
  if (REDUCED) return null;

  lenis = new Lenis({
    duration: 1.4,
    easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1.6,
    autoRaf: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  if (import.meta.env.DEV) window.__lenis = lenis;
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToTarget(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { offset: 0, ...opts, immediate: REDUCED || opts.immediate });
  else if (typeof target === 'number') window.scrollTo(0, target);
  else (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView();
}

/**
 * Idle snap: 350ms after the last wheel input, settle onto the nearest stop.
 * Past 30% of the gap in the travel direction it goes forward, otherwise back.
 */
export class Snap {
  constructor(getStops) {
    this.getStops = getStops;
    this.active = false;
    this.touching = false;
    if (TOUCH) {
      const t = (e) => { this.touching = e.type === 'touchstart'; if (!this.touching) this.arm(); };
      ['touchstart', 'touchend', 'touchcancel'].forEach((n) => window.addEventListener(n, t, { passive: true }));
    }
  }

  watch(on) {
    this.off?.();
    this.off = null;
    clearTimeout(this.timer);
    if (!on || REDUCED || !lenis) return;
    let last = lenis.targetScroll;
    this.dir = lenis.direction || 1;
    const fn = () => {
      if (lenis.targetScroll !== last) {
        this.dir = Math.sign(lenis.targetScroll - last) || this.dir;
        last = lenis.targetScroll;
        this.arm();
      }
    };
    lenis.on('scroll', fn);
    this.off = () => lenis.off('scroll', fn);
    this.arm();
  }

  arm() {
    if (!this.off) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.snap(), 350);
  }

  snap() {
    if (this.touching || !lenis || lenis.isStopped) return;
    const stops = this.getStops();
    const y = lenis.targetScroll;
    const i = stops.findIndex((s) => s > y);
    if (i < 1) return;
    const a = stops[i - 1];
    const gap = stops[i] - a;
    const t = (y - a) / gap;
    const to = (this.dir > 0 ? t > 0.3 : 1 - t <= 0.3) ? stops[i] : a;
    const dist = Math.abs(to - y);
    if (dist <= 1) return;
    lenis.scrollTo(to, {
      duration: gsap.utils.clamp(0.5, 1, (dist / gap) * 2),
      easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    });
  }
}
