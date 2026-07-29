import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED, qsa } from './utils.js';

/**
 * Infinite marquees that react to scroll velocity:
 * faster scrolling accelerates them, scrolling up reverses them.
 */
export function initMarquees() {
  if (REDUCED) return;

  let velocity = 0;

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      velocity = self.getVelocity();
    },
  });

  qsa('[data-marquee]').forEach((marquee) => {
    const track = marquee.querySelector('.marquee__track');
    const baseGroup = marquee.querySelector('.marquee__group');
    const dir = Number(marquee.dataset.speed) >= 0 ? 1 : -1;

    let groupWidth = 0;

    // measure and keep enough clones to cover the viewport seamlessly;
    // safe to call repeatedly (resize, late font swaps, hidden-tab loads)
    const ensureClones = () => {
      const w = baseGroup.offsetWidth;
      if (!w || !window.innerWidth) return;
      groupWidth = w;
      const needed = Math.max(2, Math.ceil((window.innerWidth * 2.5) / w));
      while (track.children.length < Math.min(needed, 24)) {
        track.appendChild(baseGroup.cloneNode(true));
      }
    };

    ensureClones();
    window.addEventListener('resize', ensureClones);

    const setX = gsap.quickSetter(track, 'x', 'px');
    const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.4, ease: 'power2.out' });

    let pos = 0;

    gsap.ticker.add((time, deltaMS) => {
      if (!groupWidth) {
        ensureClones();
        return;
      }
      const frames = deltaMS / (1000 / 60);
      const boost = gsap.utils.clamp(0, 6, Math.abs(velocity) / 220);
      const scrollDir = velocity < -20 ? -1 : 1;
      pos -= dir * scrollDir * (0.55 + boost) * frames;
      setX(gsap.utils.wrap(-groupWidth, 0, pos));
      skewTo(gsap.utils.clamp(-10, 10, velocity / 90));
    });
  });
}
