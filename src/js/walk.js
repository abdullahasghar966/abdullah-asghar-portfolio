import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED, FINE_POINTER, qs } from './utils.js';

/**
 * THE WALK — an infinite hand-drawn corridor you move *through*.
 *
 * The feel of walking (rather than zooming) comes from four things:
 *   1. real perspective — frames are placed off-axis and sweep past you
 *   2. a footstep bob + roll on the whole stage
 *   3. the vanishing point drifting, as if you don't walk perfectly straight
 *   4. layer recycling, so the corridor never ends
 *
 * Infinite without precision loss: a fixed pool of layers is reused. When a
 * frame passes behind the camera it is pushed back to the end of the corridor
 * with the next scene, so depth values stay in a bounded range forever.
 */

const PERSP = 900; // must match .walk__stage perspective
const GAP = 520; // z-distance between consecutive frames
const ALIVE = 9; // frames rendered at once
const PASSED = -560; // z at which a frame is behind you and recycles
const FADE_IN = 4100; // depth where a frame starts emerging from the paper haze

/* Off-axis slots, in viewport-relative units. A frame at x=0.6 starts near the
   vanishing point and sweeps out past your shoulder as you approach it — this
   is what sells "walking down a hall" instead of "zooming at a wall". */
const SLOTS = [
  [0.05, -0.02],
  [-0.72, -0.2],
  [0.7, 0.16],
  [-0.3, 0.36],
  [0.38, -0.34],
  [-0.62, 0.24],
  [0.6, -0.1],
  [0.08, 0.34],
  [-0.42, -0.3],
];

const SCENES = [
  { type: 'note', big: 'THIS WAY', small: 'keep scrolling' },
  {
    type: 'project',
    name: 'THE W',
    note: 'a WebGL hover shader,\nscoped so it never\ntouches the rest',
    tag: 'REACT · WEBGL',
  },
  {
    type: 'project',
    name: 'DAHLIA',
    note: 'a real cafe in F-6\nuses this every day',
    tag: 'NEXT.JS 15 · GSAP',
  },
  { type: 'note', big: '14 REPOS', small: 'in 81 days →' },
  {
    type: 'project',
    name: 'NEXUS',
    note: 'three roles, realtime\nstock, Stripe checkout',
    tag: 'FIREBASE · STRIPE',
  },
  {
    type: 'project',
    name: 'NO.8',
    note: 'draggable physics shrine\n+ a hidden TECH FOUL',
    tag: 'REACT 18 · VITE',
  },
  { type: 'note', big: 'SELF', small: 'taught, all of it' },
  {
    type: 'project',
    name: 'MARGIN',
    note: 'speak a note and it\nlands on the wall',
    tag: 'SPEECH API',
  },
  {
    type: 'project',
    name: 'ORBIT',
    note: 'tokens stream in live\nfrom Groq',
    tag: 'NEXT.JS · GROQ',
  },
  {
    type: 'project',
    name: 'VOID',
    note: 'resume analysis in a\nbioluminescent terminal',
    tag: 'TYPESCRIPT · AI',
  },
  { type: 'note', big: 'STILL', small: 'shipping →' },
  {
    type: 'project',
    name: 'XAU/USD',
    note: 'a decade of gold,\nRSI + drawdowns',
    tag: 'DATA-VIZ',
  },
];

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (n, a = {}) => {
  const e = document.createElementNS(NS, n);
  for (const [k, v] of Object.entries(a)) e.setAttribute(k, v);
  return e;
};

/* ---------------- frame drawing ---------------- */

/** A hand-drawn rectangle: each edge wanders a little, corners overshoot. */
function sketchRect(x, y, w, h, seed = 1) {
  const r = (n) => (Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1;
  const j = (n, amt = 3.5) => (r(n) - 0.5) * amt;
  const o = 5; // corner overshoot, like a pen that doesn't stop in time
  return (
    `M${x + j(1) - o},${y + j(2)} ` +
    `L${x + w + j(3) + o},${y + j(4)} ` +
    `M${x + w + j(5)},${y + j(6) - o} ` +
    `L${x + w + j(7)},${y + h + j(8) + o} ` +
    `M${x + w + j(9) + o},${y + h + j(10)} ` +
    `L${x + j(11) - o},${y + h + j(12)} ` +
    `M${x + j(13)},${y + h + j(14) + o} ` +
    `L${x + j(15)},${y + j(16) - o}`
  );
}

function buildFrame(scene, index) {
  const W = 520;
  const H = 380;
  const svg = svgEl('svg', {
    class: 'walk__frame',
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-label': scene.type === 'project' ? scene.name : `${scene.big} ${scene.small}`,
  });

  const ink = svgEl('g', { filter: 'url(#sk-rough)' });

  if (scene.type === 'project') {
    // browser-ish window, drawn by hand
    ink.appendChild(
      svgEl('path', {
        d: sketchRect(16, 16, W - 32, H - 32, index + 1),
        stroke: '#191916',
        'stroke-width': 2.4,
        fill: 'none',
        'stroke-linecap': 'round',
      })
    );
    // title bar rule
    ink.appendChild(
      svgEl('path', {
        d: `M20,72 L${W - 20},70`,
        stroke: '#191916',
        'stroke-width': 1.6,
        fill: 'none',
        'stroke-linecap': 'round',
      })
    );
    [42, 66, 90].forEach((cx, i) =>
      ink.appendChild(
        svgEl('circle', {
          cx,
          cy: 44,
          r: 7,
          stroke: '#191916',
          'stroke-width': 1.8,
          fill: i === 0 ? '#d4ff3f' : 'none',
        })
      )
    );

    // highlighter swipe, sized to the name so short titles don't get a
    // marker stripe running off across the whole frame
    const swipe = Math.min(W - 80, scene.name.length * 29 + 26);
    ink.appendChild(
      svgEl('path', {
        d: `M40,158 L${40 + swipe},150 L${36 + swipe},196 L36,202 Z`,
        fill: '#d4ff3f',
        opacity: 0.85,
      })
    );

    const name = svgEl('text', {
      x: 46,
      y: 192,
      fill: '#191916',
      'font-family': "Anton, Impact, sans-serif",
      'font-size': 54,
      'letter-spacing': 1,
    });
    name.textContent = scene.name;
    ink.appendChild(name);

    // handwritten annotation with a leader line
    scene.note.split('\n').forEach((ln, i) => {
      const t = svgEl('text', {
        x: 48,
        y: 250 + i * 27,
        fill: '#2b4a8b',
        'font-family': "'Architects Daughter', cursive",
        'font-size': 21,
      });
      t.textContent = ln;
      ink.appendChild(t);
    });

    ink.appendChild(
      svgEl('path', {
        d: `M${W - 132},236 C${W - 96},250 ${W - 88},286 ${W - 116},312`,
        stroke: '#2b4a8b',
        'stroke-width': 1.7,
        fill: 'none',
        'stroke-linecap': 'round',
      })
    );

    const tag = svgEl('text', {
      x: 46,
      y: 344,
      fill: 'rgba(25,25,22,0.6)',
      'font-family': "'JetBrains Mono', monospace",
      'font-size': 14,
      'letter-spacing': 2,
    });
    tag.textContent = scene.tag;
    ink.appendChild(tag);
  } else {
    // a torn note pinned in the corridor
    ink.appendChild(
      svgEl('path', {
        d: sketchRect(40, 70, W - 80, H - 170, index + 7),
        stroke: '#191916',
        'stroke-width': 2.2,
        fill: 'none',
        'stroke-linecap': 'round',
      })
    );
    // cross-hatch shading in one corner
    const hatch = svgEl('g', { stroke: 'rgba(25,25,22,0.3)', 'stroke-width': 1.2 });
    for (let i = 0; i < 9; i++) {
      hatch.appendChild(
        svgEl('path', { d: `M${W - 128 + i * 10},${H - 118} L${W - 92 + i * 10},${H - 160}` })
      );
    }
    ink.appendChild(hatch);

    const big = svgEl('text', {
      x: W / 2,
      y: 178,
      'text-anchor': 'middle',
      fill: '#191916',
      'font-family': 'Anton, Impact, sans-serif',
      'font-size': 64,
    });
    big.textContent = scene.big;
    ink.appendChild(big);

    const small = svgEl('text', {
      x: W / 2,
      y: 224,
      'text-anchor': 'middle',
      fill: '#2b4a8b',
      'font-family': "'Architects Daughter', cursive",
      'font-size': 24,
    });
    small.textContent = scene.small;
    ink.appendChild(small);
  }

  svg.appendChild(ink);
  return svg;
}

/* ---------------- the corridor ---------------- */

export function initWalk() {
  const section = qs('#walk');
  if (!section) return;

  const stage = qs('.walk__stage', section);
  const pin = qs('.walk__pin', section);
  const distEl = qs('#walk-dist');
  const intro = qs('.walk__intro', section);

  // no-3D / reduced-motion: lay the frames out as a flat sketch wall
  if (REDUCED) {
    section.classList.add('walk--static');
    SCENES.forEach((s, i) => {
      const l = document.createElement('div');
      l.className = 'walk__layer';
      l.appendChild(buildFrame(s, i));
      stage.appendChild(l);
    });
    return;
  }

  const layers = [];
  for (let i = 0; i < ALIVE; i++) {
    const el = document.createElement('div');
    el.className = 'walk__layer';
    el.appendChild(buildFrame(SCENES[i % SCENES.length], i));
    stage.appendChild(el);
    layers.push({
      el,
      base: (i + 1) * GAP, // z of this frame along the corridor
      slot: i % SLOTS.length,
      scene: i % SCENES.length,
    });
  }

  let nextScene = ALIVE % SCENES.length;
  let camZ = 0;
  let look = { x: 0, y: 0 };

  const place = (layer) => {
    const d = layer.base - camZ;
    const [sx, sy] = SLOTS[layer.slot];
    const x = sx * window.innerWidth * 0.5;
    const y = sy * window.innerHeight * 0.5;

    // Atmospheric perspective: distance fades over the whole corridor, on a
    // curve, so only the nearest few frames are crisp and the rest are pencil
    // ghosts. A linear ramp left everything at full opacity and read as clutter.
    const inFade = Math.pow(gsap.utils.clamp(0, 1, (FADE_IN - d) / 3200), 1.7);
    const outFade = d < 260 ? gsap.utils.clamp(0, 1, (d - PASSED) / 700) : 1;
    const opacity = Math.min(inFade, outFade);

    layer.el.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), ${-d}px)`;
    layer.el.style.opacity = opacity;
    layer.el.classList.toggle('is-near', d < 1500 && d > 0);
  };

  const recycle = (layer) => {
    layer.base += ALIVE * GAP;
    layer.slot = (layer.slot + 5) % SLOTS.length; // 5 is coprime with 9 → no repeating pattern
    layer.scene = nextScene;
    nextScene = (nextScene + 1) % SCENES.length;
    layer.el.replaceChildren(buildFrame(SCENES[layer.scene], layer.scene));
  };

  const render = () => {
    for (const layer of layers) {
      if (layer.base - camZ < PASSED) recycle(layer);
      place(layer);
    }

    // footstep bob + a roll, so the corridor breathes like a stride
    const bob = Math.sin(camZ / 168) * 6.5;
    const roll = Math.sin(camZ / 337) * 0.32;
    stage.style.transform = `translateY(${bob}px) rotate(${roll}deg)`;

    // the vanishing point drifts — you never walk perfectly straight
    const driftX = 50 + Math.sin(camZ / 520) * 3.4 + look.x;
    const driftY = 50 + Math.cos(camZ / 610) * 2.6 + look.y;
    stage.style.perspectiveOrigin = `${driftX}% ${driftY}%`;

    if (distEl) distEl.textContent = Math.round(camZ / 26) + 'm';

    // the title card recedes once you've actually set off
    if (intro) {
      const gone = gsap.utils.clamp(0, 1, (camZ - 220) / 900);
      intro.style.opacity = 1 - gone;
      intro.style.transform = `translateY(${-gone * 60}px)`;
    }
  };

  const TOTAL = SCENES.length * GAP;

  ScrollTrigger.create({
    trigger: pin,
    start: 'top top',
    end: '+=' + SCENES.length * 470,
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

  // look around with the mouse as you walk
  if (FINE_POINTER) {
    section.addEventListener('mousemove', (e) => {
      gsap.to(look, {
        x: (e.clientX / window.innerWidth - 0.5) * 9,
        y: (e.clientY / window.innerHeight - 0.5) * 6,
        duration: 0.9,
        ease: 'power3.out',
        onUpdate: render,
      });
    });
  }

  window.addEventListener('resize', render);
  render();
}
