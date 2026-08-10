import { qs } from './utils.js';

/**
 * The cumulative "ships over time" line, drawn in ink.
 * Inside the corridor there is no ordinary scroll to scrub against, so the
 * chart renders complete and the walk itself brings it into view.
 */
const SHIPS = [
  { day: 0, count: 1 },
  { day: 8, count: 3 },
  { day: 20, count: 4 },
  { day: 21, count: 6 },
  { day: 24, count: 8 },
  { day: 25, count: 9 },
  { day: 30, count: 10 },
  { day: 57, count: 11 },
  { day: 64, count: 12 },
  { day: 66, count: 13 },
  { day: 80, count: 14 },
];

const X_MAX = 80;
const Y_MAX = 15;
const NS = 'http://www.w3.org/2000/svg';

const el = (n, a = {}) => {
  const e = document.createElementNS(NS, n);
  for (const [k, v] of Object.entries(a)) e.setAttribute(k, v);
  return e;
};

export function drawShipChart() {
  const host = qs('#shipchart');
  if (!host) return;

  const W = 640;
  const H = 200;
  const m = { top: 12, right: 40, bottom: 24, left: 26 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;

  const x = (d) => m.left + (d / X_MAX) * iw;
  const y = (c) => m.top + ih - (c / Y_MAX) * ih;

  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': 'Cumulative public repositories: 1 in May 2026 rising to 14 by July 2026',
  });

  const ink = el('g', { filter: 'url(#sk-rough-soft)' });

  // baseline + month ticks, drawn like ruled pencil
  ink.appendChild(
    el('path', {
      d: `M${m.left},${y(0)} L${W - m.right},${y(0) + 1.5}`,
      stroke: 'rgba(25,25,22,0.45)',
      'stroke-width': 1.6,
      fill: 'none',
    })
  );
  [
    { d: 0, l: 'MAY' },
    { d: 23, l: 'JUN' },
    { d: 53, l: 'JUL' },
  ].forEach((t) => {
    const lb = el('text', {
      x: x(t.d),
      y: H - 6,
      fill: 'rgba(25,25,22,0.55)',
      'font-family': "'JetBrains Mono', monospace",
      'font-size': 10,
      'letter-spacing': 1,
    });
    lb.textContent = t.l;
    ink.appendChild(lb);
  });

  const pts = SHIPS.map((p) => [x(p.day), y(p.count)]);
  const d = 'M' + pts.map((p) => p.join(',')).join(' L');

  // highlighter wash under the line
  ink.appendChild(
    el('path', {
      d: `${d} L${pts.at(-1)[0]},${y(0)} L${pts[0][0]},${y(0)} Z`,
      fill: '#d4ff3f',
      opacity: 0.42,
    })
  );

  ink.appendChild(
    el('path', {
      d,
      fill: 'none',
      stroke: '#191916',
      'stroke-width': 2.4,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    })
  );

  // the last point, circled by hand
  const [ex, ey] = pts.at(-1);
  ink.appendChild(
    el('circle', { cx: ex, cy: ey, r: 7, fill: 'none', stroke: '#2b4a8b', 'stroke-width': 2 })
  );
  const lbl = el('text', {
    x: ex + 12,
    y: ey + 5,
    fill: '#2b4a8b',
    'font-family': "'Architects Daughter', cursive",
    'font-size': 18,
  });
  lbl.textContent = '14';
  ink.appendChild(lbl);

  svg.appendChild(ink);
  host.replaceChildren(svg);
}
