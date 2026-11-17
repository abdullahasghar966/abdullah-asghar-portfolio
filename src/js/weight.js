import gsap from 'gsap';
import { REDUCED, FINE_POINTER, qsa } from './utils.js';

/**
 * Weight lens: letters thicken toward 900 the closer the cursor is, fading out
 * over 0.9 × the link's width. Letter widths are locked so nothing reflows.
 */
export function initWeightHover(scope = document) {
  if (REDUCED || !FINE_POINTER) return;
  qsa('[data-weight]', scope).forEach((el) => {
    let chars = null;
    const base = 450;
    const build = () => {
      if (chars) return;
      const text = el.textContent;
      el.setAttribute('aria-label', el.getAttribute('aria-label') || text.trim());
      el.textContent = '';
      chars = [...text].map((ch) => {
        const s = document.createElement('span');
        s.className = 'char';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch === ' ' ? ' ' : ch;
        el.appendChild(s);
        return s;
      });
      const w = chars.map((c) => c.getBoundingClientRect().width);
      chars = chars.map((c, i) => {
        c.style.width = w[i] + 'px';
        c.style.textAlign = 'center';
        const st = { w: base };
        return {
          el: c,
          to: gsap.quickTo(st, 'w', {
            duration: 0.3,
            ease: 'power2.out',
            onUpdate: () => (c.style.fontVariationSettings = `'wght' ${st.w | 0}`),
          }),
        };
      });
    };
    const move = (e) => {
      build();
      const reach = el.offsetWidth * 0.9 || 1;
      for (const c of chars) {
        const r = c.el.getBoundingClientRect();
        const d = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
        c.to(base + (900 - base) * Math.max(0, 1 - d / reach));
      }
    };
    el.addEventListener('mouseenter', move);
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', () => chars?.forEach((c) => c.to(base)));
  });
}
