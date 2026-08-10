import gsap from 'gsap';
import { REDUCED, qs, qsa } from './utils.js';
import { getLenis } from './scroll.js';

/**
 * Lawn Defense 3D, playable inside the portfolio.
 *
 * The game is vendored at /game and runs in an iframe, which keeps its styles,
 * its Three.js runtime and its own rAF loop fully isolated from this page.
 * The iframe is created on first open and destroyed on close — a background 3D
 * game would otherwise keep a WebGL context alive and burn CPU behind the page.
 */
export function initGameEmbed() {
  const modal = qs('#game-modal');
  const frame = qs('#game-frame');
  if (!modal || !frame) return;

  let isOpen = false;
  let lastFocus = null;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;

    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    getLenis()?.stop();
    document.body.style.overflow = 'hidden';

    if (!frame.querySelector('iframe')) {
      const f = document.createElement('iframe');
      f.title = 'Lawn Defense 3D';
      f.allow = 'autoplay; fullscreen; gamepad; keyboard-map';
      f.addEventListener('load', () => {
        frame.classList.add('is-ready');
        // hand keyboard straight to the game
        try { f.contentWindow.focus(); } catch {}
      });
      f.src = './game/index.html';
      frame.appendChild(f);
    } else {
      try { frame.querySelector('iframe').contentWindow.focus(); } catch {}
    }

    if (!REDUCED) {
      gsap.fromTo(
        '.gamemodal__shell',
        { autoAlpha: 0, y: 40, scale: 0.94 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.65, ease: 'expo.out' }
      );
    }
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;

    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    frame.classList.remove('is-ready');
    // tear the game down so it stops rendering behind the page
    frame.querySelector('iframe')?.remove();

    getLenis()?.start();
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };

  qsa('[data-play]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  });

  qsa('[data-close-game]').forEach((el) => el.addEventListener('click', close));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });
}
