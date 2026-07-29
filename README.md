# Abdullah Asghar — Portfolio 2026

A Lando-Norris-inspired, animation-first portfolio. Giant condensed typography, volt-on-black palette, smooth scrolling and scroll-driven storytelling — built to prove the craft it describes.

**Stack:** Vite · vanilla JS · GSAP 3.15 (ScrollTrigger + SplitText) · Lenis

## Features

- **Preloader** — percentage counter, name reveal, curtain opening into a staggered hero intro
- **Custom cursor** — trailing ring, "VIEW" state on project covers, click feedback (desktop only)
- **Lenis smooth scroll** synced to GSAP's ticker, with a top scroll-progress bar
- **Hero** — 18rem display type with masked line reveals, scroll parallax, mouse-following glow orb, rotating "open to work" badge, latest-ship ticket
- **Velocity-reactive marquees** — speed up with scroll, reverse when you scroll up, skew with momentum
- **Statement section** — word-by-word scrubbed reveal + count-up stats
- **Hall of Fame** — pinned horizontal project gallery with per-project colour themes, cover parallax and a progress bar (falls back to a vertical stack on mobile)
- **Archive** — all 13 repos as hover-fill list rows
- **Telemetry** — hand-rolled SVG charts driven by real GitHub data: language-split bars that roll up on scroll, and a cumulative "ships over time" line that draws itself as you scroll, with a crosshair tooltip
- **Open to roles** — three target roles as hover-fill rows with live availability status, each linking to a pre-filled email
- **Fullscreen menu** — clip-path overlay with staggered masked links
- **Contact** — volt takeover with masked title lines and an email hover-swap button
- **Footer** — "ALWAYS SHIPPING." display reveal, live Islamabad clock, magnetic back-to-top
- `prefers-reduced-motion` respected throughout; content is fully visible without JS

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
src/styles/base.css     tokens, reset, preloader, cursor, nav, menu, marquees
src/styles/sections.css hero → footer + responsive + reduced-motion
src/main.js             boot sequence (fonts → modules → preloader → hero intro)
src/js/scroll.js        Lenis + ScrollTrigger sync, anchors, nav hide/show
src/js/preloader.js     loading timeline
src/js/reveals.js       all scroll reveals, counters, parallax
src/js/horizontal.js    pinned Hall of Fame gallery
src/js/telemetry.js     SVG charts — language bars + self-drawing ships line
src/js/marquee.js       velocity-reactive infinite marquees
src/js/cursor.js        custom cursor
src/js/magnetic.js      magnetic hover elements
src/js/menu.js          fullscreen menu timeline
src/js/clock.js         Islamabad local time (nav + footer)
```
