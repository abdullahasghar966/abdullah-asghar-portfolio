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
  const guard = setTimeout(teardown, 1500);
  const onVisible = () => {
    if (document.visibilityState === 'visible') teardown();
  };
  document.addEventListener('visibilitychange', onVisible);

  const tl = gsap.timeline({
    onComplete() {
      openOnce(); // safety net if the flight is cut short
      teardown();
    },
  });

  tl.to(stage, { '--launch-dim': 0.72, duration: 0.34, ease: 'power2.out' }, 0)
    .to(
      clone,
      {
        x: dx,
        y: dy,
        scale: 1.55,
        rotateX: -9,
        rotateY: 4,
        z: 340,
        duration: 0.52,
        ease: 'power3.in',
      },
      0
    )
    .add(openOnce, OPEN_AT)
    // it settles back — you are still on the portfolio when the tab opens
    .to(clone, { autoAlpha: 0, scale: 1.75, duration: 0.3, ease: 'power2.out' }, OPEN_AT + 0.06)
    .to(stage, { '--launch-dim': 0, duration: 0.4, ease: 'power2.out' }, OPEN_AT + 0.1);
}
