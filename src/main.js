import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { REDUCED, bus } from './js/utils.js';
import { initScroll, getLenis } from './js/scroll.js';
import { initButtons } from './js/button.js';
import { initWeightHover } from './js/weight.js';
import { initReveals, initCounters } from './js/reveal.js';
import { initNav } from './js/nav.js';
import { initGL } from './js/gl.js';
import { Hero } from './js/hero.js';
import { Mark } from './js/mark.js';
import { Preloader } from './js/preloader.js';
import { initGameEmbed } from './js/gameEmbed.js';
import { initIcons } from './js/icons.js';
import {
  initIntro, initDark, initWhy, initToolkit, initCases, initFolders,
  initServices, initTimeline, initClocks, initFaq, initOutro,
} from './js/sections.js';

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ duration: 0.8, ease: 'expo.out' });
window.scrollTo(0, 0);

const yieldFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function boot() {
  initScroll();
  const lenis = getLenis();
  const loading = document.documentElement.classList.contains('is-loading');
  if (loading) lenis?.stop();

  const fonts = document.fonts.ready;
  // the loader needs the mark, and the mark needs the hero tiles in place
  await fonts;
  const hero = new Hero();
  const mark = new Mark();
  const loader = new Preloader(mark);
  loader.progress(0.25);

  const nav = initNav();
  initButtons();
  initWeightHover();
  const gl = initGL();

  const steps = [initReveals, initCounters, initIntro, initDark, () => initWhy(gl), initToolkit, initCases,
    initFolders, initIcons, initServices, initTimeline, initClocks, initFaq, initOutro, initGameEmbed];
  for (let i = 0; i < steps.length; i++) {
    try { steps[i](); } catch (e) { console.error(e); }
    loader.progress(0.25 + (0.75 * (i + 1)) / steps.length);
    await yieldFrame();
  }
  ScrollTrigger.refresh();

  if (loader.active) {
    bus.on('loaded', () => { lenis?.start(); nav.reveal(); });
    await loader.exit(hero);
  } else {
    document.documentElement.classList.remove('is-loading');
    if (REDUCED) hero.release();
    else { hero.intro(0.1); nav.reveal(1.2); }
  }
  ScrollTrigger.refresh();
}

boot();
