import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED, FINE_POINTER, qs, qsa } from './utils.js';

/**
 * THE WORLD — the entire site as one infinite hand-drawn corridor.
 *
 * The markup stays a real document: every panel lives in #station-pool in
 * reading order. This engine *lifts* those live nodes into 3D layers, so the
 * corridor is a presentation of the page rather than a replacement for it.
 * With JS off, or under prefers-reduced-motion, the pool simply reads as a
 * normal page and every link still works.
 *
 * Infinite via recycling: a fixed pool of layers is reused, so depth values
 * stay bounded and float precision never degrades however far you walk.
 */

const GAP = 700; // z-distance between consecutive stations
const ALIVE = 9; // layers rendered at once
const PASSED = -560; // z at which a station is behind you and wraps forward
const FAR = 6400; // z at which a station is too distant and wraps back
const FADE_IN = 4200; // depth where a station starts emerging from the haze
const SOLID = 1800; // nearer than this a panel is fully opaque and occludes

/* Off-axis slots so panels sweep past your shoulder instead of growing at you.
   Index 5 is coprime with 9, so the pattern never visibly repeats. */
const SLOTS = [
  [0.05, -0.02],
  [-0.7, -0.2],
  [0.68, 0.16],
  [-0.3, 0.34],
  [0.38, -0.32],
  [-0.6, 0.24],
  [0.58, -0.1],
  [0.08, 0.32],
  [-0.42, -0.28],
];

const NS = 'http://www.w3.org/2000/svg';

/** A hand-drawn rectangle: edges wander, corners overshoot like a real pen. */
function roughBorder(host, seed) {
  const W = 100;
  const H = 100;
  const r = (n) => (Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1;
  const j = (n, amt = 1.6) => (r(n) - 0.5) * amt;
  const o = 2.4;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const p = document.createElementNS(NS, 'path');
  p.setAttribute(
    'd',
    `M${j(1) - o},${j(2)} L${W + j(3) + o},${j(4)} ` +
      `M${W + j(5)},${j(6) - o} L${W + j(7)},${H + j(8) + o} ` +
      `M${W + j(9) + o},${H + j(10)} L${j(11) - o},${H + j(12)} ` +
      `M${j(13)},${H + j(14) + o} L${j(15)},${j(16) - o}`
  );
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(p);
  host.replaceChildren(svg);
}

export function initWorld() {
  const world = qs('#world');
  if (!world) return null;

  const stage = qs('#world-stage');
  const pin = qs('#world-pin');
  const pool = qs('#station-pool');
  const distEl = qs('#world-dist');
  const stations = qsa('.station', pool);
  if (!stations.length) return null;

  // hand-drawn borders on every panel, each with its own seed
  stations.forEach((s, i) => {
    const frame = qs('.station__frame', s);
    if (frame) roughBorder(frame, i + 1);
  });

  // No corridor under reduced motion — the pool is already a readable page.
  if (REDUCED) {
    world.classList.add('world--flat');
    qsa('[data-roll]').forEach((v) => (v.textContent = v.dataset.roll));
    qsa('.langbars__row').forEach((row) => {
      qs('.langbars__fill', row).style.width =
        (Number(row.dataset.value) / Number(row.dataset.max)) * 100 + '%';
    });
    return null;
  }

  world.classList.add('world--live');

  const layers = [];
  for (let i = 0; i < ALIVE; i++) {
    const el = document.createElement('div');
    el.className = 'world__layer';
    el.appendChild(stations[i]); // move the live node into the corridor
    stage.appendChild(el);
    layers.push({ el, base: (i + 1) * GAP, slot: i % SLOTS.length, idx: i });
  }

  /**
   * Which station belongs at a given depth. Deriving this from `base` rather
   * than tracking a counter is what lets the corridor work in both
   * directions — walk back up and every panel returns to where it was.
   */
  const stationFor = (base) => {
    const n = stations.length;
    return (((Math.round(base / GAP) - 1) % n) + n) % n;
  };

  const swap = (layer) => {
    const want = stationFor(layer.base);
    if (want === layer.idx) return;
    pool.appendChild(layer.el.firstElementChild); // park the one we're leaving
    layer.idx = want;
    layer.el.appendChild(stations[want]);
  };

  let camZ = 0;
  const look = { x: 0, y: 0 };
  const counted = new Set();

  const place = (layer) => {
    const d = layer.base - camZ;
    const station = layer.el.firstElementChild;
    const size = station?.dataset.size || 'std';

    // content-heavy panels stay nearer the centre line so they stay readable
    const pull = size === 'wide' || size === 'hero' ? 0.34 : 1;
    const [sx, sy] = SLOTS[layer.slot];
    const x = sx * pull * window.innerWidth * 0.5;
    const y = sy * pull * window.innerHeight * 0.5;

    // Atmospheric perspective, but everything inside the reading zone hits a
    // full 1.0 — a panel below full opacity can't occlude the one behind it,
    // and overlapping text is unreadable.
    const inFade = Math.pow(gsap.utils.clamp(0, 1, (FADE_IN - d) / (FADE_IN - SOLID)), 1.3);
    const outFade = d < 260 ? gsap.utils.clamp(0, 1, (d - PASSED) / 700) : 1;
    const opacity = Math.min(inFade, outFade);

    layer.el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), ${-d}px)`;
    layer.el.style.opacity = opacity;

    // only what's genuinely in front of you is clickable or focusable
    const reachable = opacity > 0.55 && d > -200 && d < 1500;
    layer.el.classList.toggle('is-live', reachable);
    if (reachable) layer.el.removeAttribute('inert');
    else layer.el.setAttribute('inert', '');

    // count-ups and bars roll the first time their panel is genuinely close
    if (reachable && station && !counted.has(layer.idx)) {
      counted.add(layer.idx);

      qsa('[data-count]', station).forEach((n) => {
        const state = { v: 0 };
        gsap.to(state, {
          v: Number(n.dataset.count),
          duration: 1.5,
          ease: 'power2.out',
          snap: { v: 1 },
          onUpdate: () => (n.textContent = Math.round(state.v)),
        });
      });

      qsa('.langbars__row', station).forEach((row, i) => {
        const pct = (Number(row.dataset.value) / Number(row.dataset.max)) * 100;
        gsap.fromTo(
          qs('.langbars__fill', row),
          { width: '0%' },
          { width: pct + '%', duration: 1.3, delay: i * 0.1, ease: 'expo.out' }
        );
        const v = qs('[data-roll]', row);
        const state = { v: 0 };
        gsap.to(state, {
          v: Number(v.dataset.roll),
          duration: 1.3,
          delay: i * 0.1,
          ease: 'expo.out',
          snap: { v: 1 },
          onUpdate: () => (v.textContent = Math.round(state.v)),
        });
      });
    }
  };

  const render = () => {
    for (const layer of layers) {
      const d = layer.base - camZ;
      if (d < PASSED) {
        // walked past it — send it to the far end of the corridor
        layer.base += ALIVE * GAP;
        layer.slot = (layer.slot + 5) % SLOTS.length;
        swap(layer);
      } else if (d > FAR) {
        // walking backwards — bring it round behind us again
        layer.base -= ALIVE * GAP;
        layer.slot = (layer.slot + 4) % SLOTS.length;
        swap(layer);
      }
      place(layer);
    }

    // footstep bob + roll, so the corridor breathes like a stride
    const bob = Math.sin(camZ / 168) * 6.5;
    const roll = Math.sin(camZ / 337) * 0.3;
    stage.style.transform = `translateY(${bob}px) rotate(${roll}deg)`;

    // the vanishing point drifts — nobody walks perfectly straight
    stage.style.perspectiveOrigin = `${50 + Math.sin(camZ / 520) * 3.2 + look.x}% ${
      50 + Math.cos(camZ / 610) * 2.4 + look.y
    }%`;

    if (distEl) distEl.textContent = Math.round(camZ / 26) + 'm';
  };

  const TOTAL = (stations.length + 1.5) * GAP;

  const st = ScrollTrigger.create({
    trigger: pin,
    start: 'top top',
    end: '+=' + stations.length * 620,
    pin: true,
    scrub: 0.9,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate(self) {
      camZ = self.progress * TOTAL;
      render();
    },
    onRefresh: render,
  });

  if (FINE_POINTER) {
    world.addEventListener('mousemove', (e) => {
      gsap.to(look, {
        x: (e.clientX / window.innerWidth - 0.5) * 8,
        y: (e.clientY / window.innerHeight - 0.5) * 5,
        duration: 0.9,
        ease: 'power3.out',
        onUpdate: render,
      });
    });
  }

  window.addEventListener('resize', render);
  render();

  /** Scroll position that brings station `i` to just in front of the camera. */
  const scrollForStation = (i) => {
    const targetZ = Math.max(0, (i + 1) * GAP - 340);
    return st.start + (targetZ / TOTAL) * (st.end - st.start);
  };

  return { scrollForStation, stationCount: stations.length };
}
