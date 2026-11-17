import gsap from 'gsap';
import { FINE_POINTER, REDUCED, qs, qsa } from './utils.js';
import { getLenis } from './scroll.js';

/**
 * One fixed WebGL2 canvas behind the page, rendered on demand:
 *  1. a 34px hairline grid shown only inside "bands" ([data-grid-band]),
 *     heated by a soft mouse trail (thicker, brighter lines near the cursor)
 *  2. a full-screen field of volt cells that dissolves diagonally (pixel reveal)
 *  3. a dot-matrix field behind the footer, with the AA monogram drawn in dots
 */

const VERT = `#version 300 es
in vec2 position;
out vec2 vUv;
void main(){ vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;

const GRID = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uDpr; uniform float uScroll; uniform float uCell;
uniform vec4 uBands[4]; uniform int uBandCount;
uniform sampler2D uTrail; uniform vec3 uColor; uniform vec3 uHot;
in vec2 vUv; out vec4 o;
float inBand(vec2 p){
  float m = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uBandCount) break;
    vec4 b = uBands[i];
    m = max(m, step(b.x, p.x) * step(p.x, b.z) * step(b.y, p.y) * step(p.y, b.w));
  }
  return m;
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr; // css px, y down
  float m = inBand(p);
  if (m < 0.5) discard;
  float spot = clamp(texture(uTrail, vec2(vUv.x, 1.0 - vUv.y)).r, 0.0, 1.0);
  vec2 cell = vec2(p.x, p.y + uScroll) / uCell;
  vec2 d = fwidth(cell);
  vec2 g = abs(fract(cell - 0.5) - 0.5) / max(d, vec2(1e-5));
  float th = 1.0 + spot * 0.6;
  float cv = 1.0 - smoothstep(0.0, 1.0, g.x - (th - 1.0));
  float ch = 1.0 - smoothstep(0.0, 1.0, g.y - (th - 1.0));
  float a = mix(0.13, 0.5, spot) * max(cv, ch);
  if (a < 0.002) discard;
  vec3 c = mix(uColor, uHot, spot);
  o = vec4(c * a, a);
}`;

const REVEAL = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uCell; uniform float uProgress; uniform vec3 uColor;
in vec2 vUv; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
void main(){
  vec2 px = vUv * uRes;
  vec2 cell = floor(px / uCell);
  vec2 count = max(ceil(uRes / uCell), vec2(1.0));
  vec2 pos = (cell + 0.5) / count;
  vec2 dir = normalize(vec2(-1.0, 1.0));
  float grad = (dot(pos, dir) + 1.0) / 2.0 * 1.4142;
  float th = mix(clamp(grad, 0.0, 1.0), hash(cell), 0.4);
  float e = 0.5;
  float p = uProgress * (1.0 + 2.0 * e) - e;
  float v = 1.0 - smoothstep(th - e * 0.25, th + e * 0.25, p);
  o = vec4(uColor * v, v);
}`;

const DOTS = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uDpr; uniform vec4 uRect; uniform float uTime; uniform float uCell;
uniform sampler2D uMask; uniform sampler2D uTrail; uniform float uIn;
in vec2 vUv; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  if (p.y < uRect.y || p.y > uRect.w) discard;
  vec2 cell = floor(p / uCell);
  vec2 c = (cell + 0.5) * uCell;
  vec2 f = (p - c) / uCell;                       // -0.5..0.5 within the cell
  vec2 muv = vec2(c.x / uRes.x, (c.y - uRect.y) / max(uRect.w - uRect.y, 1.0));
  float m = texture(uMask, muv).r;
  float trail = texture(uTrail, vec2(c.x / uRes.x, c.y / uRes.y)).r;
  float n = hash(cell);
  float reveal = step(n * 0.6, uIn);
  float wave = 0.5 + 0.5 * sin(uTime * 1.6 + cell.x * 0.35 + cell.y * 0.22);
  vec3 bg = vec3(0.949, 0.953, 0.925);
  vec3 col; float r;
  if (m > 0.5) {
    bool cross = mod(cell.x + cell.y, 2.0) < 1.0;
    col = cross ? vec3(0.831, 1.0, 0.247) : vec3(0.788, 0.722, 1.0);
    r = 0.42 + trail * 0.08;
  } else {
    col = n > 0.55 ? vec3(0.663, 0.804, 0.961) : vec3(0.78, 0.86, 0.97);
    r = 0.2 + 0.14 * wave * step(0.3, n) + trail * 0.22;
  }
  float d = max(abs(f.x), abs(f.y));
  float dotA = (1.0 - smoothstep(r - 0.04, r + 0.04, length(f) * (m > 0.5 ? 0.85 : 1.0) + (m > 0.5 ? d * 0.15 : 0.0))) * reveal;
  vec3 outc = mix(bg, col, dotA);
  o = vec4(outc, 1.0);
}`;

function program(gl, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'position');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

function texture(gl) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export function initGL() {
  const canvas = qs('[data-gl-back]');
  const gl = canvas?.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return { setReveal() {}, setRevealVisible() {} };

  const grid = program(gl, GRID);
  const reveal = program(gl, REVEAL);
  const dots = program(gl, DOTS);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // ---- mouse trail (2D canvas → texture) ----
  const trail = document.createElement('canvas');
  const tctx = trail.getContext('2d');
  const trailTex = texture(gl);
  let trailUntil = 0;
  const mouse = { x: -1, y: -1, px: -1, py: -1 };
  if (FINE_POINTER && !REDUCED) {
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      trailUntil = performance.now() + 1800;
    }, { passive: true });
  }

  // ---- monogram mask for the footer dots ----
  const mask = document.createElement('canvas');
  const maskTex = texture(gl);
  const drawMask = () => {
    const w = 512;
    const h = Math.round((w * window.innerHeight) / window.innerWidth);
    mask.width = w; mask.height = h;
    const c = mask.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.font = `800 ${Math.round(h * 0.62)}px "Mona Sans", Arial, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const narrow = window.innerWidth < 768;
    if (narrow) { c.fillText('AA', w / 2, h * 0.54); }
    else {
      c.fillText('A', w * 0.13, h * 0.55);
      c.fillText('A', w * 0.87, h * 0.55);
    }
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
  };

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    trail.width = 160; trail.height = Math.round((160 * H) / W);
    tctx.fillStyle = '#000'; tctx.fillRect(0, 0, trail.width, trail.height);
    gl.bindTexture(gl.TEXTURE_2D, trailTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trail);
    document.fonts.ready.then(drawMask);
    dirty = true;
  };

  const bandsEls = qsa('[data-grid-band]');
  const footer = qs('[data-footer-open]');
  const state = { reveal: 0.15, revealOn: false, footIn: 0 };
  let dirty = true;
  let lastSig = '';
  let footVisible = false;
  let footRevealed = false;

  const updateTrail = (now) => {
    if (now > trailUntil) return false;
    const sx = trail.width / W;
    tctx.globalCompositeOperation = 'source-over';
    tctx.fillStyle = 'rgba(0,0,0,0.06)';
    tctx.fillRect(0, 0, trail.width, trail.height);
    if (mouse.x >= 0) {
      const steps = mouse.px < 0 ? 1 : Math.max(1, Math.ceil(Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py) / 12));
      tctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = ((mouse.px < 0 ? mouse.x : mouse.px + (mouse.x - mouse.px) * t)) * sx;
        const y = ((mouse.py < 0 ? mouse.y : mouse.py + (mouse.y - mouse.py) * t)) * sx;
        const r = 11;
        const g = tctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.3 / Math.sqrt(steps)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        tctx.fillStyle = g;
        tctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      mouse.px = mouse.x; mouse.py = mouse.y;
    }
    gl.bindTexture(gl.TEXTURE_2D, trailTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trail);
    return true;
  };

  const render = () => {
    const now = performance.now();
    const scroll = getLenis()?.animatedScroll ?? window.scrollY;
    const bands = [];
    for (const el of bandsEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H && bands.length < 4) bands.push([r.left, Math.max(r.top, 0), r.right, Math.min(r.bottom, H)]);
    }
    let foot = null;
    if (footer) {
      const r = footer.getBoundingClientRect();
      if (r.top < H && r.bottom > 0) foot = [0, Math.max(0, r.top), W, Math.min(H, r.bottom)];
    }
    if (foot && !footRevealed) {
      footRevealed = true;
      gsap.to(state, { footIn: 1, duration: REDUCED ? 0 : 1.6, ease: 'power2.out' });
    }
    footVisible = !!foot;
    const trailActive = updateTrail(now);
    const sig = `${W}|${H}|${scroll.toFixed(1)}|${bands.length}|${state.revealOn}|${state.reveal.toFixed(4)}|${foot ? foot[1].toFixed(1) : ''}|${state.footIn.toFixed(3)}`;
    const animating = footVisible && !REDUCED;
    if (!dirty && !trailActive && !animating && sig === lastSig) return;
    lastSig = sig;
    dirty = false;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (foot) {
      gl.useProgram(dots.p);
      gl.uniform2f(dots.u.uRes, W, H);
      gl.uniform1f(dots.u.uDpr, dpr);
      gl.uniform4f(dots.u.uRect, ...foot);
      gl.uniform1f(dots.u.uTime, REDUCED ? 0 : now / 1000);
      gl.uniform1f(dots.u.uCell, W < 480 ? 7 : 10);
      gl.uniform1f(dots.u.uIn, state.footIn);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(dots.u.uMask, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, trailTex); gl.uniform1i(dots.u.uTrail, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (bands.length) {
      gl.useProgram(grid.p);
      gl.uniform2f(grid.u.uRes, W, H);
      gl.uniform1f(grid.u.uDpr, dpr);
      gl.uniform1f(grid.u.uScroll, scroll);
      gl.uniform1f(grid.u.uCell, 34);
      const flat = new Float32Array(16);
      bands.forEach((b, i) => flat.set(b, i * 4));
      gl.uniform4fv(grid.u.uBands, flat);
      gl.uniform1i(grid.u.uBandCount, bands.length);
      gl.uniform3f(grid.u.uColor, 0.372, 0.49, 0.0);
      gl.uniform3f(grid.u.uHot, 0.31, 0.42, 0.0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, trailTex); gl.uniform1i(grid.u.uTrail, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (state.revealOn) {
      gl.useProgram(reveal.p);
      gl.uniform2f(reveal.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(reveal.u.uCell, (W < 768 ? 90 : 160) * dpr);
      gl.uniform1f(reveal.u.uProgress, state.reveal);
      gl.uniform3f(reveal.u.uColor, 0.831, 1.0, 0.247);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };

  resize();
  window.addEventListener('resize', resize);
  gsap.ticker.add(render);
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

  return {
    setReveal(v) { state.reveal = v; },
    setRevealVisible(on) { state.revealOn = on; },
  };
}
