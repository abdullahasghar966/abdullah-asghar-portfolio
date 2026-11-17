import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { REDUCED, FINE_POINTER, TOUCH, qs, qsa, bus, unit, isDesktop, onVisible } from './utils.js';
import { getLenis, Snap } from './scroll.js';
import { splitReveal, CLIP_FROM, CLIP_TO } from './reveal.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
const SCRUB = TOUCH ? 0.1 : true;
const interp = (arr, x) => {
  const i = Math.min(Math.floor(x), arr.length - 2);
  return gsap.utils.interpolate(arr[i], arr[i + 1], Math.min(1, x - i));
};

/* ================= INTRO: title, orbit, frosted overlay ================= */
export function initIntro() {
  const intro = qs('.intro');
  const orbit = qs('[data-orbit]');
  const items = qsa('.orbit_item', orbit);
  let angle = -Math.PI / 2;
  let running = false;
  let visible = false;
  // a true circle with a clear gap between the chips and the AA mark
  const spot = qs('[data-mark-spot]', orbit);
  let R = 0;
  const measure = () => {
    const chip = Math.max(...items.map((it) => it.offsetWidth * (it.classList.contains('orbit_item--dm') ? Math.SQRT2 : 1)));
    R = spot.offsetWidth / 2 + chip / 2 + spot.offsetWidth * 0.16;
  };
  const place = () => {
    items.forEach((it, i) => {
      const a = angle + (i / items.length) * Math.PI * 2;
      gsap.set(it, { x: Math.cos(a) * R, y: Math.sin(a) * R });
    });
  };
  measure();
  place();
  bus.on('resize', () => { measure(); place(); });
  if (REDUCED) return;

  const title = splitReveal(qs('.intro_title', intro));
  const label = qs('.intro_label', intro);
  const labelTl = gsap.fromTo(label, { clipPath: CLIP_FROM }, { clipPath: CLIP_TO, duration: 0.7, ease: 'power2.inOut', paused: true });
  ScrollTrigger.create({
    trigger: intro,
    start: 'top 70%',
    onEnter: () => { title.play(); labelTl.timeScale(1).play(); },
    onLeaveBack: () => {
      const ts = gsap.utils.mapRange(0, 30, 1.75, 3, Math.abs(getLenis()?.velocity || 0));
      title.reverse(ts);
      labelTl.timeScale(ts).reverse();
    },
  });

  gsap.set(items, { scale: 0 });
  const note = qs('.intro_note', intro);
  gsap.set(note, { autoAlpha: 0, y: 20 });
  // chips appear only once the travelling AA mark has landed in the middle
  // (same end point as the mark's own trigger), so they never overlap it
  const desk = isDesktop();
  ScrollTrigger.create({
    trigger: desk ? intro : spot,
    start: desk ? 'top top+=2' : 'center center+=2',
    onEnter: () => {
      running = true;
      gsap.to(items, { scale: 1, duration: 1, ease: 'back.out(1.7)', stagger: 0.05, overwrite: true });
      gsap.to(note, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.15 });
    },
    onLeaveBack: () => {
      gsap.to(items, { scale: 0, duration: 0.4, ease: 'power2.in', stagger: 0.02, overwrite: true, onComplete: () => (running = false) });
      gsap.to(note, { autoAlpha: 0, y: 20, duration: 0.3 });
    },
  });
  onVisible(orbit, (v) => (visible = v));
  gsap.ticker.add((t, dt) => {
    if (!running || !visible) return;
    angle += (dt / 1000) * ((Math.PI * 2) / 18); // one lap every 18s
    place();
  });

  // frosted overlay rises from the bottom as the dark panel approaches
  const overlay = qs('.intro_overlay', intro);
  gsap.fromTo(overlay, { '--p': 0 }, { '--p': 0.6, ease: 'none', scrollTrigger: { trigger: '.dark', start: 'top bottom', end: 'top top', scrub: true } });
}

/* ================= DARK PANEL ================= */
export function initDark() {
  const sec = qs('.dark');
  const wrap = qs('.dark_wrapper', sec);
  const titles = qsa('.dark_title', sec);
  const parens = qsa('.paren', sec);
  const tags = qsa('.tag', sec);
  if (REDUCED) return;

  gsap.fromTo(wrap, { '--intro': 0 }, { '--intro': 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: SCRUB } });
  gsap.fromTo(wrap, { '--leave': 0 }, { '--leave': 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'bottom bottom', end: '+=100%', scrub: SCRUB } });

  let tl, st;
  const build = () => {
    st?.kill(); tl?.kill();
    gsap.set([...titles, ...parens, ...tags], { clearProps: 'transform,opacity,visibility' });
    const box = wrap.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const gap = 30 * unit();
    const [a, b] = titles.map((t) => t.getBoundingClientRect());
    const [p0, p1] = parens.map((p) => p.getBoundingClientRect());
    tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out', force3D: true } });
    tl.fromTo(titles[0], { x: cx - gap - p0.width - a.right, y: cy - (a.top + a.height / 2) }, { x: 0, y: 0 }, 0)
      .fromTo(titles[1], { x: cx + gap + p1.width - b.left, y: cy - (b.top + b.height / 2) }, { x: 0, y: 0 }, 0)
      .fromTo(parens[0], { x: cx - 6 - p0.right }, { x: 0 }, 0)
      .fromTo(parens[1], { x: cx + 6 - p1.left }, { x: 0 }, 0)
      .fromTo(tags, { scale: 0.01, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.2)', stagger: { each: 0.03, from: 'center' } }, 0.15);
    st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom+=50%', scrub: SCRUB, animation: tl });
  };
  build();
  bus.on('resize', build);
}

/* ================= WHY: volt pixel field dissolves to paper ================= */
export function initWhy(gl) {
  const why = qs('.why');
  const title = qs('[data-why-title]', why);
  if (REDUCED) return;
  const st = { v: 0.15 };
  gl.setReveal(st.v);
  ScrollTrigger.create({ trigger: why, start: 'top bottom', end: 'bottom top', onToggle: (s) => gl.setRevealVisible(s.isActive) });
  gsap.to(st, { v: 0.85, ease: 'none', onUpdate: () => gl.setReveal(st.v), scrollTrigger: { trigger: why, start: 'center center', end: 'bottom top', scrub: true } });
  const reveal = splitReveal(title);
  ScrollTrigger.create({ trigger: title, start: 'top 75%', once: true, onEnter: () => reveal.play() });
}

/* ================= TOOLKIT: drawn grid, popping cards, process loop ================= */
export function initToolkit() {
  const sec = qs('.toolkit');
  const grid = qs('[data-toolkit]', sec);
  const holder = qs('.toolkit_lines', grid);
  const tools = qsa('.tool', grid);
  const stats = qsa('.toolkit_stat', grid);

  let linesST;
  const drawLines = () => {
    linesST?.kill();
    holder.innerHTML = '';
    const cols = parseInt(getComputedStyle(grid).getPropertyValue('--cols')) || 8;
    const rowH = grid.offsetWidth / cols;
    const rows = Math.round(grid.offsetHeight / rowH);
    const els = [];
    for (let i = 1; i < cols; i++) {
      const v = document.createElement('span');
      v.className = 'vline';
      v.style.left = (i / cols) * 100 + '%';
      holder.appendChild(v);
      els.push({ el: v, at: Math.abs(i - cols / 2) / cols, axis: 'y' });
    }
    for (let r = 0; r <= rows; r++) {
      const h = document.createElement('span');
      h.className = 'hline';
      h.style.top = Math.min(r * rowH, grid.offsetHeight - 1) + 'px';
      holder.appendChild(h);
      els.push({ el: h, at: r / rows, axis: 'x' });
    }
    if (REDUCED) return;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    els.forEach(({ el, at, axis }) => tl.fromTo(el, axis === 'x' ? { scaleX: 0 } : { scaleY: 0 }, axis === 'x' ? { scaleX: 1, duration: 1 } : { scaleY: 1, duration: 1 }, at * 1.2));
    linesST = ScrollTrigger.create({ trigger: grid, start: 'top 90%', end: 'bottom 70%', scrub: SCRUB, animation: tl });
  };
  drawLines();
  bus.on('resize', drawLines);

  if (!REDUCED) {
    const tl = gsap.timeline({ paused: true });
    tools.forEach((t, i) => tl.fromTo(t, { autoAlpha: 0, scale: 0.55, rotate: i % 2 ? 6 : -6 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.15 + i * 0.35));
    tl.fromTo(stats, { autoAlpha: 0, yPercent: 25 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, ease: 'power2.out', stagger: 0.15 }, 0.6);
    ScrollTrigger.create(TOUCH
      ? { trigger: grid, start: 'top 75%', once: true, onEnter: () => tl.play() }
      : { trigger: grid, start: 'top 85%', end: 'center 45%', scrub: true, animation: tl });
  }

  // process loop
  const loop = qs('[data-loop]', sec);
  const ring = qs('.loop_ring', loop);
  const hub = qs('.loop_hub', loop);
  const nodes = qsa('.loop_node', loop);
  const base = nodes.map((n) => parseFloat(n.style.getPropertyValue('--a')));
  const spin = { a: 0 };
  const render = () => {
    gsap.set(ring, { rotate: spin.a });
    nodes.forEach((n, i) => n.style.setProperty('--a', base[i] + spin.a));
  };
  if (REDUCED) return;
  gsap.set(nodes, { xPercent: -50, yPercent: -50 });
  // each line gets its own mask, so the two lines never cross while hidden
  const sides = qsa('.loop_side', sec).map((s) => qsa('.loop_in', s).map((line) => {
    line.innerHTML = `<span class="loop_in-inner">${line.innerHTML}</span>`;
    return line.firstChild;
  }));
  gsap.set([ring, hub, ...nodes], { autoAlpha: 0 });
  const intro = gsap.timeline({ paused: true, onComplete: () => orbit.play() });
  intro.fromTo(ring, { autoAlpha: 0, scale: 0.15, rotate: -120 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.6, ease: 'expo.out' }, 0)
    .fromTo(hub, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, 0.4);
  nodes.forEach((n, i) => {
    const a = (base[i] * Math.PI) / 180;
    const r = loop.offsetWidth * 0.425;
    intro.fromTo(n, { autoAlpha: 0, scale: 0.4, x: -Math.cos(a) * r, y: -Math.sin(a) * r }, { autoAlpha: 1, scale: 1, x: 0, y: 0, duration: 0.7, ease: 'back.out(1.4)' }, 0.65 + i * 0.09);
  });
  sides.forEach((lines) => {
    intro.fromTo(lines[0], { yPercent: 115 }, { yPercent: 0, duration: 1.2, ease: 'expo.out' }, 0.1);
    intro.fromTo(lines[1], { yPercent: -115 }, { yPercent: 0, duration: 1.2, ease: 'expo.out' }, 0.1);
  });
  const orbit = gsap.timeline({ paused: true, repeat: -1 });
  for (let k = 1; k <= 6; k++) orbit.to(spin, { a: k * 60, duration: 1.2, ease: 'power3.inOut', onUpdate: render }, `+=${2.4}`);
  ScrollTrigger.create({ trigger: loop, start: 'top 75%', once: true, onEnter: () => intro.play() });
  onVisible(loop, (v) => (intro.progress() === 1 ? (v ? orbit.resume() : orbit.pause()) : null));
}

/* ================= WORK: sticky stacking case studies ================= */
export function initCases() {
  const wrap = qs('.cases');
  const cards = qsa('.case', wrap);
  const n = cards.length;
  const stops = () => {
    const gap = parseFloat(getComputedStyle(wrap).rowGap) || 0;
    let y = wrap.getBoundingClientRect().top + window.scrollY;
    return cards.map((c) => {
      const s = y - (parseFloat(getComputedStyle(c).top) || 0);
      y += c.offsetHeight + gap;
      return s;
    });
  };
  if (REDUCED) return;

  const layers = cards.slice(0, -1).map((c) => ({
    shade: gsap.quickSetter(qs('.case_trame', c), 'opacity'),
    fade: gsap.quickSetter([qs('.case_text', c), qs('.case_visual', c)], 'opacity'),
  }));
  let list = stops();
  const shade = (y) => {
    layers.forEach((l, i) => {
      const gapS = list[i + 1] - list[i] || 1;
      const cover = gsap.utils.clamp(0, n - 1 - i, (y - list[i]) / gapS);
      l.shade(interp([0, 0.075, 0.15, 0.225, 0.3, 0.3], cover));
      l.fade(interp([1, 0.75, 0.55, 0.4, 0.3, 0.3], cover));
    });
  };
  ScrollTrigger.create({
    start: () => stops()[0],
    end: () => stops()[n - 1] + 1,
    onRefresh: () => { list = stops(); shade(window.scrollY); },
    onUpdate: (s) => shade(s.scroll()),
  });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    cards.slice(0, -1).forEach((c, i) => {
      gsap.fromTo(c, { scale: 1, rotateX: 0 }, {
        scale: 0.82 + i * 0.04, rotateX: -8, ease: 'none', immediateRender: false,
        scrollTrigger: { start: () => stops()[i], end: () => stops()[n - 1], scrub: true },
      });
    });
    const snap = new Snap(() => stops());
    const st = ScrollTrigger.create({ start: () => stops()[0], end: () => stops()[n - 1], onToggle: (s) => snap.watch(s.isActive) });
    return () => { snap.watch(false); st.kill(); gsap.set(cards, { clearProps: 'transform' }); };
  });
}

/* ================= ARCHIVE: endless folder stack ================= */
const REPOS = ['Shatter Router', 'CUI Connect', 'Sunfizz', 'Nocturne', 'Life, Wrapped', 'Nexus Market', 'Lawn Defense', 'HealthCast', 'Dahlia', 'The Bodyguard', 'THE W', 'Margin', 'AI Chatbot', 'Aperture', 'Void Analyzer', 'XAUUSD Terminal', 'Internee.pk', 'Fitness Tracker', 'DoodleBooth', 'L-SEC Cipher', 'This portfolio'];
const FOLDER_COLORS = ['var(--c-sky)', 'var(--volt)', 'var(--c-peach)', 'var(--c-lilac)', 'var(--c-aqua)', 'var(--c-sand)'];
const TABS = [560, 300, 60];
const folderPath = (tx) => `M0 52Q0 36 16 36H${tx}L${tx + 22} 4Q${tx + 26} 0 ${tx + 34} 0H${tx + 186}Q${tx + 194} 0 ${tx + 198} 4L${tx + 220} 36H824Q840 36 840 52V300H0Z`;

export function initFolders() {
  const tile = qs('[data-folders]');
  const stack = qs('.folders_stack', tile);
  const TOP0 = -240, GAP = 88, VISIBLE = 12, SPARE = 8;
  let repo = 0;
  const dress = (it, slot) => {
    const tab = TABS[slot % 3];
    it.el.style.setProperty('--x', tab);
    it.el.querySelector('path').setAttribute('d', folderPath(tab));
    it.el.querySelector('path').setAttribute('fill', FOLDER_COLORS[repo % FOLDER_COLORS.length]);
    it.el.querySelector('.folder_label').textContent = REPOS[repo % REPOS.length];
    repo++;
  };
  const items = [];
  for (let s = 0; s < VISIBLE + SPARE; s++) {
    const el = document.createElement('div');
    el.className = 'folder';
    el.innerHTML = '<svg viewBox="0 0 840 300" preserveAspectRatio="none" aria-hidden="true"><path/></svg><span class="folder_label"></span>';
    const it = { el, slot: s };
    dress(it, s);
    el.style.setProperty('--top', TOP0 + GAP * s);
    stack.appendChild(el);
    items.push(it);
  }

  if (FINE_POINTER) {
    const setters = new Map(items.map((it) => [it.el, gsap.quickTo(it.el, '--hover', { duration: 0.6, ease: 'power3.out' })]));
    tile.addEventListener('mousemove', (e) => {
      const r = tile.getBoundingClientRect();
      const y = ((e.clientY - r.top) / r.height) * 812;
      let at = 0;
      items.forEach((it) => { if (TOP0 + GAP * it.slot <= y) at = Math.max(at, it.slot); });
      items.forEach((it) => setters.get(it.el)(it.slot > at ? 70 : 0));
    });
    tile.addEventListener('mouseleave', () => items.forEach((it) => setters.get(it.el)(0)));
  }
  if (REDUCED) return;

  let count = 0;
  let active = null;
  const step = () => {
    count++;
    const big = count % 3 === 0;
    const k = big ? 8 : gsap.utils.random([2, 3]);
    const tl = gsap.timeline({ onComplete: () => { recycle(k); step(); } });
    [...items].sort((a, b) => a.slot - b.slot).forEach((it, i) => {
      tl.to(it.el, { '--top': TOP0 + GAP * (it.slot - k), duration: big ? 1.5 : 1.1, ease: 'power3.inOut' }, i * (big ? 0.02 : 0.025));
    });
    tl.to({}, { duration: 1.4 });
    active = tl;
  };
  const recycle = (k) => {
    items.forEach((it) => (it.slot -= k));
    const gone = items.filter((it) => it.slot < 0).sort((a, b) => a.slot - b.slot);
    let next = Math.max(...items.map((it) => it.slot)) + 1;
    gone.forEach((it) => {
      it.slot = next++;
      dress(it, it.slot + count);
      it.el.style.setProperty('--top', TOP0 + GAP * it.slot);
    });
    items.sort((a, b) => a.slot - b.slot).forEach((it) => stack.appendChild(it.el));
  };
  onVisible(tile, (v) => {
    if (v) active ? active.resume() : step();
    else active?.pause();
  });
}

/* ================= SERVICES: flip-up cards, hover note → description ================= */
export function initServices() {
  const cards = qsa('.scard');
  if (REDUCED) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    qsa('.srow_grid').forEach((g) => gsap.set(g, { perspective: 900 }));
    const sts = cards.map((c, i) => {
      gsap.set(c, { rotationX: -65, z: -500, opacity: 0 });
      return ScrollTrigger.create({
        trigger: c,
        start: 'top bottom-=40',
        once: true,
        onEnter: () => gsap.to(c, { rotationX: 0, z: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: (i % 3) * 0.05 }),
      });
    });
    return () => { sts.forEach((s) => s.kill()); gsap.set(cards, { clearProps: 'transform,opacity' }); };
  });

  if (!FINE_POINTER) return;
  mm.add('(min-width: 1024px)', () => {
    const offs = cards.map((c) => {
      const note = qs('.scard_note', c);
      const desc = qs('.scard_desc', c);
      const sNote = SplitText.create(note, { type: 'words', aria: 'none' });
      const sDesc = SplitText.create(desc, { type: 'lines, words', mask: 'lines', aria: 'none' });
      gsap.set(sDesc.words, { yPercent: 110 });
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out', duration: 0.8 } })
        .to(sNote.words, { yPercent: -110, autoAlpha: 0, duration: 0.35, ease: 'power2.in', stagger: 0.02 }, 0)
        .to(sDesc.words, { yPercent: 0, stagger: 0.03 }, 0.3);
      const on = () => tl.timeScale(1).play();
      const off = () => tl.timeScale(1.6).reverse();
      c.addEventListener('mouseenter', on);
      c.addEventListener('mouseleave', off);
      return () => { c.removeEventListener('mouseenter', on); c.removeEventListener('mouseleave', off); tl.kill(); sNote.revert(); sDesc.revert(); };
    });
    return () => offs.forEach((f) => f());
  });
}

/* ================= TIMELINE WHEEL ================= */
export function initTimeline() {
  const sec = qs('.timeline');
  const stage = qs('.timeline_stage', sec);
  const ring = qs('.timeline_ring', sec);
  const cards = qsa('.tcard', sec);
  const n = cards.length;
  const setH = () => stage.style.setProperty('--card-h', Math.max(...cards.map((c) => c.offsetHeight)) + 'px');
  setH();
  bus.on('resize', setH);
  if (REDUCED) return;

  const step = () => parseFloat(getComputedStyle(stage).getPropertyValue('--step')) || 17;
  let st;
  const lit = { v: 0 };
  const build = () => {
    st?.kill();
    const tween = gsap.fromTo(stage, { '--wheel': '0deg' }, { '--wheel': `${-step() * (n - 1)}deg`, ease: 'none', paused: true });
    st = ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom', scrub: SCRUB, animation: tween,
      onUpdate: (s) => {
        const v = gsap.utils.clamp(0, 1, Math.abs(s.getVelocity()) / 1800);
        if (v > lit.v) gsap.to(lit, { v, duration: 0.15, overwrite: true, onUpdate: glow });
        gsap.to(lit, { v: 0, duration: 1.2, delay: 0.15, ease: 'power2.out', onUpdate: glow });
      },
    });
  };
  const glow = () => ring.style.setProperty('color', `color-mix(in srgb, #5f7d00 ${Math.round(lit.v * 100)}%, rgba(11,11,12,.5))`);
  build();
  bus.on('resize', build);
  if (!TOUCH) {
    const snap = new Snap(() => cards.map((c, k) => st.start + ((st.end - st.start) * k) / (n - 1)));
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onToggle: (s) => snap.watch(s.isActive) });
  }
}

/* ================= CONTACT: analog + digital Islamabad clocks ================= */
export function initClocks() {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const shorts = qsa('[data-clock="short"]');
  const clock = qs('[data-analog]');
  const [h, m, s] = ['h', 'm', 's'].map((k) => qs(`.clock_hand--${k}`, clock));
  let lastSec = -1;
  let turns = 0;

  // confetti: small coloured shapes fill the face from 12 o'clock up to the minute hand
  const NS = 'http://www.w3.org/2000/svg';
  const conf = document.createElementNS(NS, 'svg');
  conf.setAttribute('viewBox', '-100 -100 200 200');
  conf.setAttribute('class', 'clock_confetti');
  conf.setAttribute('aria-hidden', 'true');
  const colors = ['#d4ff3f', '#a9cdf5', '#ffb38a', '#c9b8ff', '#9fe3d8', '#f1d79b'];
  const bits = Array.from({ length: 90 }, (_, i) => {
    const deg = (i / 90) * 360 + gsap.utils.random(-1.5, 1.5);
    const r = gsap.utils.random(14, 78);
    const a = ((deg - 90) * Math.PI) / 180;
    const size = gsap.utils.random(7, 12);
    const kind = i % 3;
    const el = document.createElementNS(NS, kind === 0 ? 'circle' : 'rect');
    if (kind === 0) el.setAttribute('r', size / 2);
    else { el.setAttribute('width', size); el.setAttribute('height', kind === 1 ? size : size * 0.55); el.setAttribute('x', -size / 2); el.setAttribute('y', -size / 4); el.setAttribute('rx', 1); }
    el.setAttribute('fill', colors[i % colors.length]);
    el.setAttribute('transform', `translate(${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}) rotate(${gsap.utils.random(0, 360) | 0})`);
    conf.appendChild(el);
    return { el, deg, on: false };
  });
  clock.insertBefore(conf, clock.firstChild);
  const fill = (minuteDeg, animate) => bits.forEach((b) => {
    const on = b.deg <= minuteDeg;
    if (on === b.on) return;
    b.on = on;
    gsap.to(b.el, { scale: on ? 1 : 0, opacity: on ? 1 : 0, transformOrigin: '50% 50%', duration: animate && !REDUCED ? 0.5 : 0, ease: on ? 'back.out(2.5)' : 'power2.in', delay: animate ? gsap.utils.random(0, 0.4) : 0 });
  });
  bits.forEach((b) => gsap.set(b.el, { scale: 0, opacity: 0, transformOrigin: '50% 50%' }));
  let shown = false;
  onVisible(clock, (v) => { if (v && !shown) { shown = true; lastSec = -1; } });

  const tick = () => {
    const [hh, mm, ss] = fmt.format(new Date()).split(':').map(Number);
    if (shown) fill((mm + ss / 60) * 6, true); // pops in the first time the clock is seen
    shorts.forEach((el) => (el.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`));
    if (ss === lastSec) return;
    if (ss < lastSec) turns++;
    lastSec = ss;
    gsap.set(h, { rotate: ((hh % 12) + mm / 60) * 30 });
    gsap.set(m, { rotate: (mm + ss / 60) * 6 });
    gsap.to(s, { rotate: (ss + turns * 60) * 6, duration: REDUCED ? 0 : 0.35, ease: 'back.out(3)' });
  };
  tick();
  setInterval(tick, 250);
}

/* ================= FAQ ================= */
export function initFaq() {
  const items = qsa('.faq_item');
  const list = qs('.faq_list');
  const reserve = () => {
    list.style.minHeight = '';
    const openH = items.filter((i) => i.classList.contains('is-open')).reduce((a, i) => a + qs('.faq_body', i).offsetHeight, 0);
    const maxA = Math.max(...items.map((i) => qs('.faq_answer', i).offsetHeight));
    list.style.minHeight = list.offsetHeight - openH + maxA + 'px';
  };
  document.fonts.ready.then(reserve);
  bus.on('resize', reserve);
  items.forEach((item) => {
    qs('.faq_aside', item).addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      items.forEach((it) => {
        const on = it === item && open;
        it.classList.toggle('is-open', on);
        qs('.faq_aside', it).setAttribute('aria-expanded', String(on));
        qs('.faq_body', it).inert = !on;
      });
      const top = item.getBoundingClientRect().top;
      const room = 110 * unit();
      if (open && top < room) getLenis()?.scrollTo(window.scrollY + top - room, { duration: 0.6 });
    });
  });
}

/* ================= OUTRO: words settle onto one line ================= */
export function initOutro() {
  const title = qs('[data-outro]');
  const line = qs('.outro_line', title);
  const fit = () => {
    title.style.removeProperty('font-size');
    const words = qsa('.outro_w', line);
    const fs = parseFloat(getComputedStyle(title).fontSize);
    const total = words.reduce((a, w) => a + w.getBoundingClientRect().width, 0);
    const room = line.clientWidth - 0.25 * fs * (words.length - 1);
    if (total > room) title.style.fontSize = (fs * room) / total + 'px';
  };
  document.fonts.ready.then(fit);
  bus.on('resize', fit);
  if (REDUCED) return gsap.set(title, { '--px': 0 });
  gsap.fromTo(title, { '--px': 1 }, { '--px': 0, ease: 'none', scrollTrigger: { trigger: title, start: 'top bottom', endTrigger: line, end: 'center 55%', scrub: true } });
}

export { isDesktop };
