import gsap from 'gsap';
import { REDUCED, qs, qsa } from './utils.js';
import { getLenis } from './scroll.js';

export function initMenu() {
  const menu = qs('#menu');
  const toggle = qs('#menu-toggle');
  const links = qsa('.menu__word-inner');
  const groups = qsa('.menu__group');
  const footer = qs('.menu__footer');

  let open = false;

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut' } });

  tl.set(menu, { visibility: 'visible' })
    .to(menu, { clipPath: 'inset(0 0 0% 0)', duration: REDUCED ? 0 : 0.85 })
    .from(links, { yPercent: 120, duration: 0.7, stagger: 0.06, ease: 'expo.out' }, '-=0.35')
    .from(groups, { autoAlpha: 0, y: 24, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, '-=0.5')
    .from(footer, { autoAlpha: 0, duration: 0.4 }, '-=0.3');

  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));

    if (open) {
      getLenis()?.stop();
      tl.timeScale(1).play();
    } else {
      tl.timeScale(1.35).reverse();
      getLenis()?.start();
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));

  // close when a menu link is chosen (scroll.js handles the smooth scroll)
  qsa('.menu__link', menu).forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}
