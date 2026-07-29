import { qs } from './utils.js';

export function initClock() {
  const navClock = qs('#nav-clock');
  const footerClock = qs('#footer-clock');

  const short = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const long = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const tick = () => {
    const now = new Date();
    if (navClock) navClock.textContent = short.format(now);
    if (footerClock) footerClock.textContent = long.format(now);
  };

  tick();
  setInterval(tick, 1000);
}
