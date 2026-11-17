import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { qs, isDesktop, bus } from './utils.js';

/**
 * The AA monogram lives in three places: a static copy in the hero's centre
 * tile, a static copy at the heart of the intro orbit, and one fixed
 * "traveller" that is only visible while it moves between them (loader → hero,
 * hero → intro). Static copies keep normal stacking, so the dark panel can
 * slide over the intro mark like any other content.
 */
export class Mark {
  constructor() {
    this.el = qs('[data-mark]');
    this.svg = this.el.querySelector('svg');
    this.heroSpot = qs('[data-hero-spot] .mark-static');
    this.introSpot = qs('[data-mark-spot]');
    [this.heroSpot, this.introSpot].forEach((s) => {
      if (!s) return;
      const c = this.svg.cloneNode(true);
      c.classList.add('mark-copy');
      c.style.color = 'var(--volt)';
      s.appendChild(c);
    });
    this.mode = 'scroll';
    this.p = 0;
    this.place = gsap.quickSetter(this.el, 'css');
    this.trigger();
    gsap.ticker.add(() => this.mode === 'scroll' && this.p > 0 && this.p < 1 && this.sync());
    bus.on('mark:measure', () => this.sync());
    bus.on('resize', () => { this.trigger(); ScrollTrigger.refresh(); });
  }

  trigger() {
    this.st?.kill();
    const desk = isDesktop();
    this.st = ScrollTrigger.create({
      trigger: '.intro',
      start: 'top bottom',
      endTrigger: desk ? '.intro' : this.introSpot,
      end: desk ? 'top top' : 'center center',
      onUpdate: (self) => { this.p = self.progress; this.sync(); },
      onRefresh: (self) => { this.p = self.progress; this.sync(); },
    });
  }

  rect(el) {
    const r = (el.querySelector('svg') || el).getBoundingClientRect();
    return { x: r.left, y: r.top, s: r.width };
  }

  set({ x, y, s }) {
    this.place({ x, y, scale: s / 100 });
  }

  show(which) {
    this.el.classList.toggle('is-on', which === 'travel');
    this.heroSpot.style.visibility = which === 'hero' ? 'visible' : 'hidden';
    this.introSpot.style.visibility = which === 'intro' ? 'visible' : 'hidden';
  }

  sync() {
    if (this.mode !== 'scroll') return;
    const p = this.p;
    if (p <= 0.001) return this.show('hero');
    if (p >= 0.999) return this.show('intro');
    const a = this.rect(this.heroSpot);
    const b = this.rect(this.introSpot);
    const t = gsap.parseEase('power1.inOut')(p);
    this.set({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s + (b.s - a.s) * t });
    this.show('travel');
  }

  /** Loader control: park the traveller over a box, then fly it home. */
  loaderAt(box, size) {
    this.mode = 'loader';
    this.set({ x: box.x + (box.s - size) / 2, y: box.y + (box.s - size) / 2, s: size });
    this.show('travel');
  }

  flyHome(tl, at, duration = 0.8) {
    const to = this.rect(this.heroSpot);
    const state = { ...this.current() };
    tl.to(state, {
      x: to.x, y: to.y, s: to.s, duration, ease: 'power3.inOut',
      onUpdate: () => this.set(state),
      onComplete: () => { gsap.set(this.el, { clearProps: 'opacity,visibility,rotate' }); this.mode = 'scroll'; this.sync(); },
    }, at);
  }

  current() {
    return {
      x: gsap.getProperty(this.el, 'x'),
      y: gsap.getProperty(this.el, 'y'),
      s: gsap.getProperty(this.el, 'scale') * 100,
    };
  }
}
