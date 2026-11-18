# Abdullah Asghar — Portfolio 2026

**🔗 Live site:** [abdullahasghar.vercel.app](https://abdullahasghar.vercel.app)

A Lando-Norris-inspired, animation-first portfolio. Giant condensed typography, volt-on-black palette, smooth scrolling and scroll-driven storytelling — built to prove the craft it describes.

**Stack:** Vite · vanilla JS · GSAP 3.15 (ScrollTrigger, SplitText, MorphSVG) · Lenis · raw WebGL2

## Features (v2 — branch `redesign/loopsii-style`)

A motion-first rebuild on a fluid "design-px" system (every size is authored in px of a 1920 / 768 / 375 frame and scaled by `--u`).

- **Preloader**: volt sheet, corner dots fly into a square, guide lines draw, a `000 %` counter tracks real work, and the AA mark drops in. The square then expands into the hero frame and the sheet wipes up (first visit only).
- **Hero**: headline with a rotating word (chars swell in weight and settle from a random colour), and an 11-column sliding-puzzle tile grid with shape morphs and a cursor "spotlight".
- **Travelling monogram**: the AA mark flies from its hero tile to the centre of an orbit of tech chips.
- **Dark panel**: scales in with rounded corners, the two title halves fly apart, and pain-point tags pop between brackets. A WebGL field of volt cells then dissolves diagonally into the next section.
- **Toolkit**: hairline grid that draws on scroll, popping tool cards, count-ups, and a process loop that rotates in 60° steps.
- **Work**: six sticky case-study cards that recede and tilt back with halftone depth shading, with scroll-snap between them.
- **Archive**: an endless stack of folder tabs labelled with every repo. Hover to peek into it.
- **Services**: cards flip up into place, and on hover the note swaps for the description.
- **Shipping log**: a pinned wheel. Scrolling rotates the cards around a tick ring, with velocity glow and snap.
- **Contact**: count-up plus a live analog Islamabad clock. Then FAQ, a "wave" outro, and the nav pill morphing into the footer card over a WebGL dot-matrix monogram.
- **Global**: Lenis (1.4s expo glide), signature buttons (four-colour sweep, letter swell, morphing arrow), weight-lens links, a 34px WebGL grid heated by a mouse trail, reduced-motion support, skip link and focus rings.
- Lawn Defense 3D is still playable in a modal.

## Palette

Volt (`#d4ff3f`) on near-black (`#0b0b0c`) with a warm paper (`#f2f3ec`) for light sections.
A deeper volt (`#5f7d00`) is used for accents on light surfaces so text and chart marks keep
their contrast; chart fills use a tempered `#b9e32c` to avoid glare on large areas.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deploy

The build is fully static (`dist/`). Push to GitHub and import into [Vercel](https://vercel.com) (framework preset: Vite) — or any static host. Relative asset paths (`base: './'`) mean GitHub Pages works too.

## Structure

```
index.html              all content/markup
src/styles/base.css     fluid --u unit, tokens, type, loader, mark, nav + footer morph, button, game modal
src/styles/sections.css hero → footer stage, responsive, reduced motion
src/main.js             boot: fonts → hero/mark/loader → modules (yielding per frame) → hand-off
src/js/scroll.js        Lenis on the GSAP ticker + idle scroll-snap helper
src/js/gl.js            fixed WebGL2 canvas: grid bands + mouse trail, volt pixel reveal, footer dots
src/js/preloader.js     first-visit loader and hand-off into the hero
src/js/mark.js          the travelling AA monogram
src/js/hero.js          rotating word, sliding-puzzle tiles, spotlight, entrance
src/js/nav.js           mini/compact pill, ink inversion, footer morph
src/js/button.js        signature button (colour sweep, letter swell, MorphSVG arrow)
src/js/weight.js        weight-lens hover for links
src/js/reveal.js        masked word reveals, clip notes, count-ups
src/js/sections.js      intro, dark panel, why, toolkit, work stack, archive, services, timeline, clocks, FAQ, outro
src/js/gameEmbed.js     Lawn Defense 3D modal
```
