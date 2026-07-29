import gsap from 'gsap';
import { REDUCED, FINE_POINTER, qsa } from './utils.js';

export function initMagnetic() {
  if (!FINE_POINTER || REDUCED) return;

  qsa('[data-magnetic]').forEach((el) => {
    const strength = 0.35;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: relX * strength,
        y: relY * strength,
        duration: 0.5,
        ease: 'power3.out',
      });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
    });
  });
}
