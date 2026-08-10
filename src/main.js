import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { runPreloader } from './js/preloader.js';
import { initScroll, scrollTo } from './js/scroll.js';
import { initCursor } from './js/cursor.js';
import { initMenu } from './js/menu.js';
import { initClock } from './js/clock.js';
import { initWorld } from './js/world.js';
import { drawShipChart } from './js/telemetry.js';
import { qsa } from './js/utils.js';

gsap.registerPlugin(ScrollTrigger);

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

async function init() {
  const preloaderDone = runPreloader();

  await document.fonts.ready;

  initScroll();
  initCursor();
  initMenu();
  initClock();
  drawShipChart();

  const world = initWorld();

  // Nav and menu links point at stations along the corridor, not at anchors —
  // translate each into the scroll position that walks you there.
  if (world) {
    qsa('[data-goto]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        scrollTo(world.scrollForStation(Number(link.dataset.goto)));
      });
    });
  }

  await preloaderDone;
  ScrollTrigger.refresh();
}

init();
