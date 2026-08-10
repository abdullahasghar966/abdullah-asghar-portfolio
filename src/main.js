import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { runPreloader } from './js/preloader.js';
import { initScroll } from './js/scroll.js';
import { initCursor } from './js/cursor.js';
import { initMagnetic } from './js/magnetic.js';
import { initMenu } from './js/menu.js';
import { initMarquees } from './js/marquee.js';
import { initHorizontal } from './js/horizontal.js';
import { initClock } from './js/clock.js';
import { initTelemetry } from './js/telemetry.js';
import { initWalk } from './js/walk.js';
import { setInitialStates, heroIntro, initReveals } from './js/reveals.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

async function init() {
  setInitialStates();

  // counter starts immediately; everything else boots while it runs
  const preloaderDone = runPreloader();

  await document.fonts.ready;

  initScroll();
  initCursor();
  initMagnetic();
  initMenu();
  initClock();
  initMarquees();
  initReveals();
  initWalk();
  initHorizontal();
  initTelemetry();

  await preloaderDone;

  ScrollTrigger.refresh();
  heroIntro();
}

init();
