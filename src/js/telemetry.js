import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED, FINE_POINTER, qs, qsa } from './utils.js';

/**
 * TELEMETRY — GitHub data, hand-rolled SVG.
 * Cumulative public repos by creation date (May 9 → Jul 28, 2026).
 */
const SHIPS = [
  { day: 0, count: 1, label: 'MAY 09' },
  { day: 8, count: 3, label: 'MAY 17' },
  { day: 20, count: 4, label: 'MAY 29' },
  { day: 21, count: 6, label: 'MAY 30' },
  { day: 24, count: 8, label: 'JUN 02' },
  { day: 25, count: 9, label: 'JUN 03' },
  { day: 30, count: 10, label: 'JUN 08' },
  { day: 57, count: 11, label: 'JUL 05' },
  { day: 64, count: 12, label: 'JUL 12' },
  { day: 66, count: 13, label: 'JUL 14' },
  { day: 80, count: 14, label: 'JUL 28' },
  { day: 81, count: 16, label: 'JUL 29' },
  { day: 83, count: 17, label: 'JUL 31' },
];

const X_MAX = 83;
const Y_MAX = 19; // headroom above 17
const X_TICKS = [
  { day: 0, label: 'MAY' },
  { day: 23, label: 'JUN' },
  { day: 53, label: 'JUL' },
];
const Y_TICKS = [0, 8, 17];

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/* ---------------- language bars ---------------- */

function initBars() {
  const rows = qsa('.langbars__row');

  rows.forEach((row) => {
    const fill = qs('.langbars__fill', row);
    const pct = (Number(row.dataset.value) / Number(row.dataset.max)) * 100;
    fill.style.width = pct + '%';
  });

  const values = qsa('[data-roll]');

  if (REDUCED) {
    values.forEach((v) => (v.textContent = v.dataset.roll));
    return;
  }

  gsap.set('.langbars__fill', { scaleX: 0 });

  ScrollTrigger.create({
    trigger: '#langbars',
    start: 'top 82%',
    once: true,
    onEnter() {
      gsap.to('.langbars__fill', {
        scaleX: 1,
        duration: 1.4,
        stagger: 0.12,
        ease: 'expo.out',
      });
      values.forEach((v, i) => {
        const state = { value: 0 };
        gsap.to(state, {
          value: Number(v.dataset.roll),
          duration: 1.4,
          delay: i * 0.12,
          ease: 'expo.out',
          snap: { value: 1 },
          onUpdate: () => (v.textContent = String(Math.round(state.value))),
        });
      });
    },
  });
}

/* ---------------- cumulative ships line ---------------- */

function buildLineChart(container) {
  const W = container.clientWidth;
  const H = container.clientHeight;
  if (!W || !H) return null;

  // extra right margin so the "14" end label always clears the edge
  const m = { top: 14, right: 46, bottom: 26, left: 30 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;

  const x = (day) => m.left + (day / X_MAX) * iw;
  const y = (count) => m.top + ih - (count / Y_MAX) * ih;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-label': 'Cumulative public repos over time, 1 in May to 17 in July 2026' });

  // gradient for the area fill
  const defs = el('defs');
  const grad = el('linearGradient', { id: 'ship-grad', x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.appendChild(el('stop', { offset: '0%', 'stop-color': '#d4ff3f', 'stop-opacity': 0.22 }));
  grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#d4ff3f', 'stop-opacity': 0 }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // recessive grid + axis labels
  Y_TICKS.forEach((t) => {
    svg.appendChild(el('line', {
      x1: m.left, x2: W - m.right, y1: y(t), y2: y(t),
      stroke: 'rgba(242,243,236,0.1)', 'stroke-dasharray': '3 5',
    }));
    const lbl = el('text', {
      x: m.left - 8, y: y(t) + 3, 'text-anchor': 'end',
      fill: '#8b8b90', 'font-size': 9, 'font-family': 'JetBrains Mono, monospace',
    });
    lbl.textContent = t;
    svg.appendChild(lbl);
  });
  X_TICKS.forEach((t) => {
    const lbl = el('text', {
      x: x(t.day), y: H - 6, 'text-anchor': 'start',
      fill: '#8b8b90', 'font-size': 9, 'font-family': 'JetBrains Mono, monospace', 'letter-spacing': 1,
    });
    lbl.textContent = t.label;
    svg.appendChild(lbl);
  });

  const pts = SHIPS.map((p) => [x(p.day), y(p.count)]);
  const lineD = 'M' + pts.map((p) => p.join(',')).join(' L');

  // area under the line
  const area = el('path', {
    d: `${lineD} L${pts.at(-1)[0]},${y(0)} L${pts[0][0]},${y(0)} Z`,
    fill: 'url(#ship-grad)', opacity: 0,
  });
  svg.appendChild(area);

  // the line itself
  const line = el('path', {
    d: lineD, fill: 'none', stroke: '#d4ff3f', 'stroke-width': 2,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  });
  svg.appendChild(line);

  // end marker + direct label (2px surface ring so it reads on the line)
  const [ex, ey] = pts.at(-1);
  const endDot = el('circle', { cx: ex, cy: ey, r: 5, fill: '#d4ff3f', stroke: '#0b0b0c', 'stroke-width': 2, opacity: 0 });
  const endLbl = el('text', {
    x: ex + 10, y: ey + 4, fill: '#f2f3ec', 'font-size': 11, 'font-weight': 700,
    'font-family': 'JetBrains Mono, monospace', opacity: 0,
  });
  endLbl.textContent = '17';
  svg.appendChild(endDot);
  svg.appendChild(endLbl);

  // hover layer: crosshair + dot (tooltip div lives in the container)
  const crosshair = el('line', { y1: m.top, y2: m.top + ih, stroke: 'rgba(242,243,236,0.25)', opacity: 0 });
  const hoverDot = el('circle', { r: 5, fill: '#d4ff3f', stroke: '#0b0b0c', 'stroke-width': 2, opacity: 0 });
  svg.appendChild(crosshair);
  svg.appendChild(hoverDot);

  container.appendChild(svg);

  return { svg, line, area, endDot, endLbl, crosshair, hoverDot, pts, x, m, iw };
}

function initLineChart() {
  const container = qs('#shipchart');
  const tip = qs('#ship-tip');
  let chart = null;
  let trigger = null;

  const render = () => {
    trigger?.kill();
    trigger = null;
    qs('svg', container)?.remove();
    chart = buildLineChart(container);
    if (!chart) return;

    const { line, area, endDot, endLbl } = chart;
    const len = line.getTotalLength();

    if (REDUCED) {
      gsap.set(area, { opacity: 1 });
      gsap.set([endDot, endLbl], { opacity: 1 });
      return;
    }

    // the line "rolls" itself out as you scroll through the section
    gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top 88%',
        end: 'top 30%',
        scrub: 0.6,
        onUpdate(self) {
          const done = self.progress > 0.97;
          gsap.to([endDot, endLbl], { opacity: done ? 1 : 0, duration: 0.25 });
        },
      },
    });
    tl.to(line, { strokeDashoffset: 0, ease: 'none' }).to(area, { opacity: 1, ease: 'none' }, 0.4);
    trigger = tl.scrollTrigger;
  };

  render();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 200);
  });

  // crosshair + tooltip
  if (FINE_POINTER) {
    container.addEventListener('mousemove', (e) => {
      if (!chart) return;
      const rect = container.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * (chart.svg.viewBox.baseVal.width || rect.width);

      let nearest = 0;
      let best = Infinity;
      chart.pts.forEach((p, i) => {
        const d = Math.abs(p[0] - mx);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });

      const [px, py] = chart.pts[nearest];
      const point = SHIPS[nearest];
      chart.crosshair.setAttribute('x1', px);
      chart.crosshair.setAttribute('x2', px);
      chart.crosshair.setAttribute('opacity', 1);
      chart.hoverDot.setAttribute('cx', px);
      chart.hoverDot.setAttribute('cy', py);
      chart.hoverDot.setAttribute('opacity', 1);

      tip.textContent = `${point.label} — ${point.count} REPO${point.count > 1 ? 'S' : ''}`;
      tip.style.left = (px / (chart.svg.viewBox.baseVal.width || rect.width)) * rect.width + 'px';
      tip.style.top = (py / (chart.svg.viewBox.baseVal.height || rect.height)) * rect.height + 'px';
      tip.style.opacity = 1;
    });

    container.addEventListener('mouseleave', () => {
      if (!chart) return;
      chart.crosshair.setAttribute('opacity', 0);
      chart.hoverDot.setAttribute('opacity', 0);
      tip.style.opacity = 0;
    });
  }
}

export function initTelemetry() {
  if (!qs('#telemetry')) return;
  initBars();
  initLineChart();
}
