import gsap from 'gsap';
import { REDUCED, qsa } from './utils.js';

/**
 * Launch transition — clicking a project cover lifts it off the page and flies
 * it at the camera before the project opens.
 *
 * The link is opened partway through the flight rather than after it: browsers
 * only allow window.open while a click's "transient activation" is still live,
 * so the gap has to stay short or the new tab gets blocked. The cover then
 * settles back, because the portfolio is still here when you return to it.
 */
const OPEN_AT = 0.42; // seconds into the flight

export function initLaunch() {
  if (REDUCED) return;

  qsa('a.project__cover[target="_blank"]').forEach((cover) => {
    cover.addEventListener('click', (e) => {
      const href = cover.getAttribute('href');
      if (!href || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      fly(cover, href);
    });
  });
}

function fly(cover, href) {
  const rect = cover.getBoundingClientRect();

  const stage = document.createElement('div');
  stage.className = 'launch';

  const clone = cover.cloneNode(true);
  clone.removeAttribute('href');
  clone.classList.add('launch__card');
  Object.assign(clone.style, {
    position: 'fixed',
    left: rect.left + 'px',
    top: rect.top + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
    margin: '0',
  });

  stage.appendChild(clone);
  document.body.appendChild(stage);

  // aim at the middle of the screen as it comes toward you
  const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
  const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);

  let opened = false;
  const openOnce = () => {
    if (opened) return;
    opened = true;
    window.open(href, '_blank', 'noopener');
  };

  // The new tab takes focus, which backgrounds this one and stops rAF — so a
  // GSAP-driven teardown would freeze mid-flight and leave the dim overlay
  // stuck on screen. Tear down on a timer (timers still fire when hidden) and
  // again the moment the page is looked at, whichever comes first.
  let done = false;
  const teardown = () => {
    if (done) return;
    done = true;
    clearTimeout(guard);
    document.removeEventListener('visibilitychange', onVisible);
    tl.kill();
    stage.remove();
  };
  const guard = setTimeout(teardown, 1600);
  const onVisible = () => {
    // Only once the link has actually opened — otherwise an incidental
    // visibility flip mid-flight would cut the animation off at the knees.
    if (document.visibilityState === 'visible' && opened) teardown();
  };
  document.addEventListener('visibilitychange', onVisible);

  const tl = gsap.timeline({
    onComplete() {
      openOnce(); // safety net if the flight is cut short
      teardown();
    },
  });

  // hinge on the bottom edge so the card peels off the page rather than
  // simply growing in place
  gsap.set(clone, { transformOrigin: '50% 100%' });

  tl.to(stage, { '--launch-dim': 0.75, duration: 0.3, ease: 'power2.out' }, 0)
    // 1. peel — the cover unsticks and tips up toward you
    .to(clone, { rotateX: 15, scale: 1.05, z: 70, duration: 0.19, ease: 'power2.out' }, 0)
    // 2. launch — it swings level and drives at the camera
    .to(
      clone,
      {
        x: dx,
        y: dy,
        rotateX: -7,
        rotateY: 5,
        scale: 1.62,
        z: 430,
        duration: 0.46,
        ease: 'power3.in',
      },
      0.17
    )
    .add(openOnce, OPEN_AT)
    // it dissolves past the lens — you are still on the portfolio behind it
    .to(clone, { autoAlpha: 0, scale: 1.9, duration: 0.3, ease: 'power2.out' }, OPEN_AT + 0.05)
    .to(stage, { '--launch-dim': 0, duration: 0.42, ease: 'power2.out' }, OPEN_AT + 0.12);
}
