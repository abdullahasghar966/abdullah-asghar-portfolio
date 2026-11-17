import gsap from 'gsap';
import { qs, qsa, unit, isPhone, bus } from './utils.js';

/**
 * First-visit loader on a volt sheet: four dots fly in from the viewport
 * corners to a centred square, guide lines draw, a 000 % counter tracks real
 * work (fonts + modules), the monogram drops in. On exit the square expands
 * into the hero's tile frame, the monogram flies into its tile and the sheet
 * wipes up.
 */
export class Preloader {
  constructor(mark) {
    this.root = qs('[data-loader]');
    this.mark = mark;
    this.active = document.documentElement.classList.contains('is-loading') && !!this.root;
    this.work = { v: 0 };
    this.fake = { v: 0 };
    if (!this.active) { this.root?.remove(); return; }
    this.sheet = qs('.loader_sheet', this.root);
    this.box = qs('.loader_box', this.root);
    this.frame = qs('.loader_frame', this.root);
    this.dots = qsa('.loader_dot', this.root);
    this.linesX = qsa('.loader_line-x', this.root);
    this.linesY = qsa('.loader_line-y', this.root);
    this.counter = qs('.loader_counter', this.root);
    this.value = qs('.loader_counter-value', this.root);
    this.entered = this.enter();
  }

  count() {
    const v = Math.min(Math.round(this.fake.v), Math.round(this.work.v));
    this.value.textContent = String(v).padStart(3, '0');
  }

  progress(p) {
    if (!this.active) return Promise.resolve();
    return new Promise((r) => gsap.to(this.work, { v: p * 100, duration: 0.4, ease: 'power1.out', overwrite: true, onUpdate: () => this.count(), onComplete: r }));
  }

  enter() {
    const u = unit();
    const size = (isPhone() ? 150 : 290) * u;
    const W = window.innerWidth, H = window.innerHeight;
    this.square = { x: (W - size) / 2, y: (H - size) / 2, s: size };
    gsap.set(this.box, { left: this.square.x, top: this.square.y, width: size, height: size, xPercent: 0, yPercent: 0, x: 0, y: 0, transform: 'none' });
    const inset = 40 * u;
    const corners = [[inset, inset], [W - inset, inset], [W - inset, H - inset], [inset, H - inset]];
    const own = [[0, 0], [size, 0], [size, size], [0, size]];
    this.dots.forEach((d, i) => gsap.set(d, { x: corners[i][0] - (this.square.x + own[i][0]), y: corners[i][1] - (this.square.y + own[i][1]) }));
    gsap.set(this.linesX, { scaleX: 0 });
    gsap.set(this.linesY, { scaleY: 0 });
    gsap.set(this.counter, { autoAlpha: 0 });
    const markSize = size * 0.36;
    this.mark.loaderAt(this.square, markSize);
    gsap.set(this.mark.el, { autoAlpha: 0 });

    const tl = gsap.timeline();
    tl.to(this.dots, { x: 0, y: 0, duration: 1.1, ease: 'power3.inOut', stagger: 0.04 }, 0.1)
      .to(this.linesY, { scaleY: 1, duration: 1, ease: 'power3.inOut' }, 0.55)
      .to(this.linesX, { scaleX: 1, duration: 1, ease: 'power3.inOut' }, 0.65)
      .to(this.frame, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 1.2)
      .to(this.counter, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0.3)
      .to(this.fake, { v: 100, duration: 1.9, ease: 'power2.inOut', onUpdate: () => this.count() }, 0.3)
      .fromTo(this.mark.el, { autoAlpha: 0, rotate: -90 }, { autoAlpha: 1, rotate: 0, duration: 0.8, ease: 'back.out(1.6)' }, 0.9)
      .fromTo(this.mark.svg, { scale: 0.2, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.8, ease: 'back.out(1.6)' }, 0.9);
    return tl.then();
  }

  /** Hand-off into the hero. Resolves when the sheet is gone. */
  async exit(hero) {
    if (!this.active) return;
    await this.entered;
    await new Promise((r) => (this.work.v >= 100 ? r() : gsap.delayedCall(0.4, r)));
    window.scrollTo(0, 0);
    const target = hero.frame.getBoundingClientRect();
    const tl = gsap.timeline();
    tl.to(this.counter, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to(this.frame, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 0.3)
      .to(this.box, { left: target.left, top: target.top, width: target.width, height: target.height, duration: 0.8, ease: 'power3.inOut' }, 0.3)
      .to(this.sheet, { yPercent: -100, duration: 1, ease: 'power3.inOut' }, 0.6)
      .to([...this.linesX, ...this.linesY, ...this.dots], { autoAlpha: 0, duration: 0.3 }, 1.3);
    gsap.set(this.mark.el, { rotate: 0 });
    this.mark.flyHome(tl, 0.3, 0.8);
    tl.add(() => { document.documentElement.classList.remove('is-loading'); bus.emit('loaded'); }, 1.0);
    hero.intro(0.85);
    await tl.then();
    this.root.remove();
  }
}
