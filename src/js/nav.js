import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED, qs, qsa, bus } from './utils.js';
import { getLenis, scrollToTarget } from './scroll.js';

/**
 * Nav pill: mini after 100px (back below 60), compact width after 150px,
 * ink inverts while the dark panel passes under it, and at the end of the page
 * the pill grows into the footer card with a legal bar underneath.
 */
export function initNav() {
  const nav = qs('[data-nav]');
  const slide = qs('.nav_slide', nav);
  const body = qs('.nav_body', nav);
  const bar = qs('.nav_bar', nav);
  const panel = qs('.nav_panel', nav);
  const legal = qs('.nav_legal', nav);

  // links
  qsa('[data-nav-link]', nav).forEach((a) =>
    a.addEventListener('click', (e) => {
      const t = document.getElementById(a.dataset.navLink);
      if (!t) return;
      e.preventDefault();
      scrollToTarget(t);
    })
  );
  qs('.nav_logo', nav).addEventListener('click', (e) => {
    e.preventDefault();
    scrollToTarget(0);
  });

  let open = false;
  let tl;
  const dims = {};

  // mini / compact
  let mini = false;
  let compact = false;
  const onScroll = () => {
    const y = window.scrollY;
    const m = mini ? y > 60 : y > 100;
    if (m !== mini) { mini = m; nav.classList.toggle('is-mini', m); }
    const c = y > 150;
    if (c !== compact && !open) { compact = c; nav.classList.toggle('is-compact', c); }
    invert();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ink inversion: how much of the bar overlaps the dark panel
  const dark = qs('.dark_wrapper');
  let inv = -1;
  const invert = () => {
    if (!dark) return;
    const b = bar.getBoundingClientRect();
    const d = dark.getBoundingClientRect();
    const overlap = Math.min(b.bottom, d.bottom) - Math.max(b.top, d.top);
    const v = Math.round(gsap.utils.clamp(0, 1, overlap / b.height) * 100) / 100;
    if (v !== inv) { inv = v; nav.style.setProperty('--nav-inverse', open ? 0 : v); }
  };
  onScroll();

  // reveal after the loader
  const reveal = (rate = 1) => {
    if (REDUCED) return gsap.set(slide, { clearProps: 'transform' });
    gsap.fromTo(slide, { y: -(bar.offsetHeight + 60) }, { y: 0, duration: 0.6 / rate, ease: 'power3.inOut', clearProps: 'transform' });
  };

  // ---------- footer morph ----------
  const lines = qsa('.nav_line', panel);
  const linesX = qsa('.nav_line-x', panel);
  const linesY = qsa('.nav_line-y', panel);
  const dots = qsa('.nav_dot', panel);
  const reveals = qsa('[data-overlay-reveal]', panel);

  const measure = () => {
    const wasActive = body.classList.contains('is-active');
    const prev = { h: body.style.height, w: body.style.width, bar: bar.style.height };
    body.classList.remove('is-active');
    Object.assign(body.style, { height: '', width: '' });
    bar.style.height = '';
    dims.closed = body.offsetHeight;
    dims.barH = bar.offsetHeight;
    dims.openW = legal.offsetWidth;
    body.classList.add('is-active');
    Object.assign(body.style, { height: 'auto', width: dims.openW + 'px' });
    bar.style.height = '0px';
    dims.open = body.offsetHeight;
    Object.assign(body.style, { height: prev.h, width: prev.w });
    bar.style.height = prev.bar;
    body.classList.toggle('is-active', wasActive);
    const gap = 10;
    const total = dims.open + gap + legal.offsetHeight;
    const navTop = nav.getBoundingClientRect().top;
    const top = Math.max(10, (window.innerHeight - total) / 2);
    dims.shift = top - navTop;
    dims.legal = top + dims.open + gap - navTop;
  };

  const openPanel = () => {
    if (open) return;
    open = true;
    measure();
    nav.style.setProperty('--nav-inverse', 0);
    gsap.set(body, { height: body.offsetHeight, width: body.offsetWidth });
    body.classList.add('is-open', 'is-active');
    panel.setAttribute('aria-hidden', 'false');
    gsap.set(reveals, { autoAlpha: 0, yPercent: 24 });
    gsap.set(legal, { autoAlpha: 0, y: dims.legal + 24 });
    gsap.set(linesY, { scaleY: 0 });
    gsap.set(linesX, { scaleX: 0 });
    gsap.set(dots, { scale: 0 });
    tl?.kill();
    const d = REDUCED ? 0 : 1;
    tl = gsap.timeline()
      .to(bar, { autoAlpha: 0, duration: 0.2 * d, ease: 'power2.out' }, 0)
      .to(body, { height: dims.open, width: dims.openW, y: dims.shift, duration: 0.9 * d, ease: 'power3.inOut' }, 0.05 * d)
      .to(bar, { height: 0, duration: 0.9 * d, ease: 'power3.inOut' }, 0.05 * d)
      .to(reveals, { autoAlpha: 1, yPercent: 0, duration: 0.7 * d, ease: 'expo.out', stagger: 0.04 * d }, 0.45 * d)
      .to(linesY, { scaleY: 1, duration: 0.8 * d, ease: 'power3.inOut' }, 0)
      .to(linesX, { scaleX: 1, duration: 0.6 * d, ease: 'power3.inOut', stagger: 0.15 * d }, 0.15 * d)
      .to(dots, { scale: 1, duration: 0.4 * d, ease: 'back.out(3)', stagger: (i) => Math.floor(i / 2) * 0.15 * d }, 0.62 * d)
      .to(legal, { autoAlpha: 1, y: dims.legal, duration: 0.6 * d, ease: 'expo.out' }, 0.8 * d);
    qsa('[data-btn]', panel).forEach((b) => b.dispatchEvent(new Event('btn:rebuild')));
  };

  const closePanel = () => {
    if (!open) return;
    open = false;
    body.classList.remove('is-open');
    tl?.kill();
    const d = REDUCED ? 0 : 1;
    const restW = compact ? Math.min(legal.offsetWidth, nav.clientWidth) : nav.clientWidth;
    tl = gsap.timeline({
      onComplete: () => {
        body.classList.remove('is-active');
        panel.setAttribute('aria-hidden', 'true');
        gsap.set(body, { clearProps: 'height,width,y' });
        gsap.set(bar, { clearProps: 'height,opacity,visibility' });
        gsap.set(legal, { clearProps: 'transform,opacity,visibility' });
        gsap.set([...lines, ...dots], { clearProps: 'all' });
        inv = -1;
        invert();
      },
    })
      .to([legal, ...lines, ...dots], { autoAlpha: 0, duration: 0.2 * d, ease: 'power2.in' }, 0)
      .to(reveals, { autoAlpha: 0, yPercent: 10, duration: 0.25 * d, ease: 'power2.in', stagger: { each: 0.01 * d, from: 'end' } }, 0)
      .to(body, { height: dims.closed, width: restW, y: 0, duration: 0.6 * d, ease: 'power3.inOut' }, 0.1 * d)
      .to(bar, { height: dims.barH, duration: 0.6 * d, ease: 'power3.inOut' }, 0.1 * d)
      .to(bar, { autoAlpha: 1, duration: 0.25 * d, ease: 'power2.out' }, 0.5 * d);
  };

  const trigger = qs('[data-footer-open]');
  if (trigger) {
    ScrollTrigger.create({
      trigger,
      start: 'top 55%',
      onEnter: () => document.documentElement.classList.contains('is-loading') || openPanel(),
      onLeaveBack: closePanel,
    });
  }
  document.addEventListener('keydown', (e) => e.key === 'Escape' && open && closePanel());
  bus.on('resize', () => {
    if (!open) return;
    measure();
    gsap.set(body, { height: dims.open, width: dims.openW, y: dims.shift });
    gsap.set(legal, { y: dims.legal });
  });

  // keep the lenis instance from scrolling under the open panel's links
  getLenis();
  return { reveal };
}
