import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { SplitText } from 'gsap/SplitText';
import { REDUCED, FINE_POINTER, qs, qsa, bus, unit, isDesktop, isPhone, onVisible } from './utils.js';

gsap.registerPlugin(MorphSVGPlugin, SplitText);

/* 100×100 shapes: every one is a single closed path so MorphSVG can blend them */
export const SHAPES = {
  square: 'M0 0H100V100H0Z',
  circle: 'M50 0C77.6 0 100 22.4 100 50S77.6 100 50 100 0 77.6 0 50 22.4 0 50 0Z',
  arch: 'M0 100V50C0 22.4 22.4 0 50 0S100 22.4 100 50V100Z',
  quarter: 'M0 0C55.2 0 100 44.8 100 100H0Z',
  triangle: 'M0 0L100 100H0Z',
  diamond: 'M50 6L94 50 50 94 6 50Z',
  leaf: 'M0 100C0 44.8 44.8 0 100 0 100 55.2 55.2 100 0 100Z',
  dot: 'M50 22C65.5 22 78 34.5 78 50S65.5 78 50 78 22 65.5 22 50 34.5 22 50 22Z',
};
const NAMES = Object.keys(SHAPES);
const WEIGHT = { square: 3, circle: 2, arch: 2, quarter: 2, triangle: 2, diamond: 1, leaf: 1, dot: 1 };
const COLORS = ['var(--volt)', 'var(--c-sky)', 'var(--c-peach)', 'var(--c-lilac)', 'var(--c-aqua)', 'var(--c-sand)'];
const WORD_COLORS = ['#b8e600', '#ff8f5a', '#8a6cff', '#3cbfab'];

const pickShape = (not) => {
  const pool = NAMES.filter((n) => n !== not);
  let r = Math.random() * pool.reduce((a, n) => a + WEIGHT[n], 0);
  for (const n of pool) if ((r -= WEIGHT[n]) < 0) return n;
  return pool[0];
};

export class Hero {
  constructor() {
    this.el = qs('.hero');
    this.frame = qs('.hero_frame', this.el);
    this.box = qs('[data-tiles]', this.el);
    this.words = qsa('.hero_word', this.el);
    this.steps = 0;
    this.held = true;
    this.inView = true;
    this.fit();
    this.buildTiles();
    this.splitWords();
    if (!REDUCED) {
      this.loop();
      if (FINE_POINTER) this.spotlight();
      onVisible(this.frame, (v) => {
        this.inView = v;
        if (!this.held) v ? this.tl?.play() : this.tl?.pause();
      }, { rootMargin: '120px' });
    }
    bus.on('resize', () => { this.fit(); this.measureSpot(); });
  }

  /** Cell size: fill the width, but never push the frame below the fold on desktop. */
  fit() {
    const cs = getComputedStyle(this.frame);
    this.cols = parseInt(cs.getPropertyValue('--cols')) || 11;
    this.rows = parseInt(cs.getPropertyValue('--rows')) || 3;
    const u = unit();
    const vw = document.documentElement.clientWidth;
    const availW = isDesktop() ? vw - 320 * u : vw - 2 * (isPhone() ? 20 : 40) * u;
    let cell = availW / this.cols;
    if (isDesktop()) {
      const top = qs('.hero_top', this.el).offsetHeight;
      const availH = window.innerHeight - top - 120 * u;
      cell = Math.max(cell * 0.45, Math.min(cell, availH / this.rows));
    }
    this.cell = cell;
    this.frame.style.setProperty('--cell', cell + 'px');
  }

  buildTiles() {
    const { cols, rows } = this;
    this.spot = { col: Math.floor(cols / 2), row: 1 };
    const slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!(c === this.spot.col && r === this.spot.row)) slots.push([c, r]);
    gsap.utils.shuffle(slots);
    const empties = Math.max(3, Math.round(slots.length * 0.16));
    const filled = slots.slice(empties);
    this.occ = new Map();
    this.tiles = filled.map(([col, row], i) => {
      const el = document.createElement('div');
      el.className = 'tile';
      const shape = NAMES[Math.floor(Math.random() * NAMES.length)];
      const rot = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
      el.innerHTML = `<svg viewBox="0 0 100 100" style="rotate:${rot}deg"><path d="${SHAPES[shape]}" fill="${COLORS[i % COLORS.length]}"/></svg>`;
      el.style.setProperty('--col', col);
      el.style.setProperty('--row', row);
      this.box.appendChild(el);
      const t = { el, col, row, shape, svg: el.firstChild, path: el.querySelector('path') };
      this.occ.set(col + ':' + row, t);
      return t;
    });
    const spot = document.createElement('div');
    spot.className = 'tile tile--spot';
    spot.dataset.heroSpot = '';
    spot.style.setProperty('--col', this.spot.col);
    spot.style.setProperty('--row', this.spot.row);
    spot.innerHTML = '<div class="mark-static" style="padding:6%"></div>';
    this.box.appendChild(spot);
    this.spotEl = spot;
  }

  measureSpot() { bus.emit('mark:measure'); }

  /* ---------- infinite sliding puzzle ---------- */
  step() {
    const key = (c, r) => c + ':' + r;
    const empty = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (!this.occ.has(key(c, r)) && !(c === this.spot.col && r === this.spot.row)) empty.push([c, r]);
    gsap.utils.shuffle(empty);
    const moved = new Set();
    const tl = gsap.timeline();
    empty.forEach(([c, r]) => {
      const opts = [[1, 0, 1], [-1, 0, 1], [0, 1, 5], [0, -1, 5]]
        .map(([dx, dy, w]) => ({ t: this.occ.get(key(c + dx, r + dy)), w }))
        .filter((o) => o.t && !moved.has(o.t) && o.t.last !== key(c, r));
      if (!opts.length) return;
      let pick = Math.random() * opts.reduce((a, o) => a + o.w, 0);
      const o = opts.find((x) => (pick -= x.w) < 0) || opts[0];
      const t = o.t;
      moved.add(t);
      this.occ.delete(key(t.col, t.row));
      t.last = key(t.col, t.row);
      t.col = c; t.row = r;
      this.occ.set(key(c, r), t);
      tl.to(t.el, { '--col': c, '--row': r, duration: 0.5, ease: 'power2.inOut' }, 0);
    });
    // two shapes morph every step
    gsap.utils.shuffle([...this.tiles]).slice(0, 2).forEach((t) => {
      t.shape = pickShape(t.shape);
      gsap.to(t.path, { morphSVG: SHAPES[t.shape], duration: 0.5, ease: 'power2.inOut', overwrite: 'auto' });
    });
    if (++this.steps % 3 === 0) this.nextWord();
    return tl;
  }

  loop() {
    this.tl = gsap.timeline({ repeat: -1, paused: true });
    this.tl.call(() => this.step(), null, 0).to({}, { duration: 0.7 });
  }

  release() {
    this.held = false;
    if (!REDUCED && this.inView) this.tl?.play();
  }

  spotlight() {
    const R = 100;
    const setters = this.tiles.map((t) => {
      const qx = gsap.quickTo(t.svg, 'scaleX', { duration: 0.4, ease: 'power3.out' });
      const qy = gsap.quickTo(t.svg, 'scaleY', { duration: 0.4, ease: 'power3.out' });
      return { t, sx: (v) => { qx(v); qy(v); } };
    });
    let active = false;
    let mx = -9999, my = -9999;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      if (!this.inView) return;
      const b = this.frame.getBoundingClientRect();
      const inside = mx > b.left - R && mx < b.right + R && my > b.top - R && my < b.bottom + R;
      if (!inside) {
        if (active) { setters.forEach((s) => s.sx(1)); active = false; }
        return;
      }
      active = true;
      for (const s of setters) {
        const r = s.t.el.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my);
        s.sx(gsap.utils.clamp(0.72, 1, gsap.utils.mapRange(0, R * 1.2, 0.72, 1, d)));
      }
    });
  }

  /* ---------- rotating headline word ---------- */
  splitWords() {
    this.splits = this.words.map((w) => SplitText.create(w, { type: 'chars', charsClass: 'char', aria: 'none' }));
    const all = this.splits.flatMap((s) => s.chars);
    const widths = all.map((c) => c.getBoundingClientRect().width);
    all.forEach((c, i) => (c.style.width = widths[i] + 'px'));
    this.words.forEach((w, i) => { w.style.visibility = 'visible'; if (i) gsap.set(this.splits[i].chars, { autoAlpha: 0 }); });
    this.current = 0;
    qs('.hero_words', this.el).setAttribute('aria-label', this.words.map((w) => w.textContent).join(', '));
  }

  nextWord() {
    const prev = this.splits[this.current];
    this.current = (this.current + 1) % this.splits.length;
    const next = this.splits[this.current];
    gsap.set(next.chars, { '--leave': 0, color: gsap.utils.random(WORD_COLORS) });
    next.chars.forEach((c) => c.style.setProperty('--deg', gsap.utils.random(-8, 8, 2) + 'deg'));
    gsap.fromTo(prev.chars, { '--leave': 0 }, { '--leave': 1, autoAlpha: 0, duration: 0.3, stagger: 0.02, overwrite: 'auto' });
    gsap.timeline()
      .fromTo(next.chars, { autoAlpha: 0, '--enter': 1 }, { autoAlpha: 1, '--enter': 0, duration: 0.6, stagger: 0.02, delay: 0.2, overwrite: 'auto' })
      .to(next.chars, { color: '#0b0b0c', duration: 0.48, stagger: 0.02 }, '<0.05');
  }

  /** Entrance after the loader (or straight away on repeat visits). */
  intro(at = 0) {
    const lines = qsa('.hero_line', this.el);
    const firstWords = SplitText.create(lines[0], { type: 'words', aria: 'none' }).words;
    const curChars = this.splits[0].chars;
    const copy = SplitText.create(qs('.hero_copy', this.el), { type: 'lines, words', mask: 'lines' });
    const labels = qsa('.hero_label', this.el);
    const hlines = qsa('.hero_hline', this.el);
    const vlines = qsa('.hero_vline', this.el);
    const dots = qsa('.hero_frame > .dot', this.el);
    gsap.set(lines, { clipPath: 'inset(-50% -100vw -0.2em -100vw)' });
    gsap.set([...firstWords, ...curChars], { yPercent: 130 });
    gsap.set(labels, { autoAlpha: 0, y: 10 });
    gsap.set(this.tiles.map((t) => t.el), { scale: 0, autoAlpha: 0 });

    const fb = this.frame.getBoundingClientRect();
    const cx = fb.left + fb.width / 2, cy = fb.top + fb.height / 2;
    const dist = this.tiles.map((t) => { const r = t.el.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); });
    const max = Math.max(...dist, 1);

    const tl = gsap.timeline({ delay: at });
    tl.to(firstWords, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.04 }, 0)
      .to(curChars, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.02 }, 0.08)
      .fromTo(copy.lines.map((l) => l.querySelectorAll('div')), { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.04 }, 0.2)
      .fromTo(hlines, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power3.inOut' }, 0)
      .fromTo(vlines, { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'power3.inOut' }, 0.1)
      .fromTo(dots, { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(3)', stagger: 0.05 }, 0.6)
      .to(this.tiles.map((t) => t.el), { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.2)', stagger: (i) => (dist[i] / max) * 0.45 }, 0.25)
      .to(labels, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 0.9)
      .add(() => {
        gsap.set(lines, { clearProps: 'clipPath' });
        this.release();
      }, 1.3);
    return tl;
  }
}
