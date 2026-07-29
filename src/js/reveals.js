import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { REDUCED, FINE_POINTER, qs, qsa } from './utils.js';

const fades = () => qsa('.reveal-fade').filter((el) => !el.closest('.hero'));
const heroFades = () => qsa('.hero .reveal-fade');

/**
 * Hide everything that will be animated in. Runs before the
 * preloader curtains open so nothing flashes.
 */
export function setInitialStates() {
  if (REDUCED) return;

  gsap.set('.hero__line-inner', { yPercent: 108 });
  gsap.set(heroFades(), { autoAlpha: 0, y: 26 });
  gsap.set(fades(), { autoAlpha: 0, y: 26 });
  gsap.set(['.contact__email', '.contact__socials'], { autoAlpha: 0, y: 26 });
}

/** Hero entrance — chained after the preloader finishes. */
export function heroIntro() {
  if (REDUCED) return;

  gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    .to('.hero__line-inner', { yPercent: 0, duration: 1.3, stagger: 0.14 })
    .to(heroFades(), { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, '-=0.7');
}

export function initReveals() {
  // project cards: colour themes from data-attributes
  qsa('.project').forEach((p) => {
    if (p.dataset.accent) p.style.setProperty('--accent', p.dataset.accent);
    if (p.dataset.ink) p.style.setProperty('--card-ink', p.dataset.ink);
  });

  // wrap footer display lines for masked reveals
  qsa('[data-footer-line]').forEach((line) => {
    line.innerHTML = `<span>${line.innerHTML}</span>`;
  });

  if (REDUCED) return;

  // generic fade-ups
  fades().forEach((el) => {
    gsap.to(el, {
      autoAlpha: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // masked line reveals for big headings / quote — autoSplit re-splits
  // (and re-animates) if fonts swap late or the element resizes
  qsa('.reveal-lines').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.15,
          stagger: 0.09,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 84%', once: true },
        }),
    });
  });

  // statement: word-by-word scrubbed reveal
  qsa('[data-scrub-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to(qsa('.w', el), {
      opacity: 1,
      ease: 'none',
      stagger: 0.4,
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
        end: 'top 28%',
        scrub: 0.5,
      },
    });
  });

  // stat counters
  qsa('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const state = { value: Number(el.textContent) || 0 };
    gsap.to(state, {
      value: target,
      duration: 1.8,
      ease: 'power2.out',
      snap: { value: 1 },
      onUpdate: () => (el.textContent = String(Math.round(state.value))),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // archive rows
  const rows = qsa('[data-archive]');
  gsap.set(rows, { autoAlpha: 0, y: 36 });
  ScrollTrigger.batch(rows, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }),
  });

  // open-to-roles rows
  const roles = qsa('[data-role]');
  gsap.set(roles, { autoAlpha: 0, y: 44 });
  ScrollTrigger.batch(roles, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }),
  });

  // stack columns
  const cols = qsa('[data-stack-col]');
  gsap.set(cols, { autoAlpha: 0, y: 44 });
  ScrollTrigger.batch(cols, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' }),
  });

  // split cards
  const cards = qsa('.split__card');
  gsap.set(cards, { autoAlpha: 0, y: 60 });
  ScrollTrigger.batch(cards, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power3.out' }),
  });

  // contact title masked lines + follow-ups
  gsap.set('[data-contact-line] > span', { yPercent: 112 });
  gsap
    .timeline({
      scrollTrigger: { trigger: '#contact', start: 'top 72%', once: true },
      defaults: { ease: 'expo.out' },
    })
    .to('[data-contact-line] > span', { yPercent: 0, duration: 1.2, stagger: 0.12 })
    .to(['.contact__email', '.contact__socials'], { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, '-=0.6');

  // footer display lines
  gsap.set('[data-footer-line] > span', { yPercent: 112 });
  gsap.to('[data-footer-line] > span', {
    yPercent: 0,
    duration: 1.2,
    stagger: 0.12,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.footer__big', start: 'top 88%', once: true },
  });

  // hero scroll-out parallax
  gsap.to('.hero__line:first-child .hero__line-inner', {
    xPercent: -7,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__line--indent .hero__line-inner', {
    xPercent: 7,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__bottom', {
    autoAlpha: 0.15,
    y: 70,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('#hero-orb', {
    yPercent: -45,
    scale: 1.2,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // rotating "open to work" badge
  gsap.to('#hero-badge', { rotation: 360, duration: 16, repeat: -1, ease: 'none' });

  // orb follows the mouse across the hero
  if (FINE_POINTER) {
    const orb = qs('#hero-orb');
    const orbX = gsap.quickTo(orb, 'x', { duration: 1.2, ease: 'power3.out' });
    const orbY = gsap.quickTo(orb, 'y', { duration: 1.2, ease: 'power3.out' });
    qs('.hero').addEventListener('mousemove', (e) => {
      orbX((e.clientX - window.innerWidth / 2) * 0.14);
      orbY((e.clientY - window.innerHeight / 2) * 0.14);
    });
  }
}
