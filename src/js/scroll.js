import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { REDUCED, qs, qsa } from './utils.js';

let lenis = null;

export function getLenis() {
  return lenis;
}

export function scrollTo(target, opts = {}) {
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4, force: true, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
  } else {
    const el = typeof target === 'string' ? qs(target) : target;
    if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
    else el?.scrollIntoView({ behavior: 'smooth' });
  }
}

export function initScroll() {
  if (!REDUCED) {
    lenis = new Lenis({
      autoRaf: false,
      lerp: 0.09,
      wheelMultiplier: 1,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // page scroll progress bar
  gsap.to('#progress-bar', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
    },
  });

  // smooth anchor navigation (nav + footer + menu links)
  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1 && qs(id)) {
        e.preventDefault();
        scrollTo(id, { offset: 0 });
      }
    });
  });

  // hide nav when scrolling down, show when scrolling up
  const nav = qs('#nav');
  let navHidden = false;
  ScrollTrigger.create({
    start: 'top top',
    end: 'max',
    onUpdate(self) {
      const goingDown = self.direction === 1;
      const pastHero = self.scroll() > window.innerHeight * 0.9;
      const shouldHide = goingDown && pastHero;
      if (shouldHide !== navHidden) {
        navHidden = shouldHide;
        gsap.to(nav, {
          yPercent: shouldHide ? -110 : 0,
          duration: 0.5,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    },
  });
}
