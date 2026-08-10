# Abdullah Asghar — Portfolio 2026

The whole site is one infinite hand-drawn corridor. You don't scroll down a page —
you walk forward through a sketchbook, and the work comes toward you.

**Stack:** Vite · vanilla JS · GSAP (ScrollTrigger) · Lenis
**Live:** https://abdullah-asghar-portfolio-ten.vercel.app

## The walk

It's a perspective dolly, not a zoom. A flat `scale()` reads as a camera lens;
walking needed four things together:

- **Real perspective** — panels sit off-axis, so they sweep past your shoulder
  and out of frame rather than growing at you from the centre
- **A footstep bob** — the stage rises and falls with a slight roll, on a stride cadence
- **A drifting vanishing point** — nobody walks perfectly straight
- **Mouse look** — glance around while moving

## Why it's actually infinite

Nine layers exist, ever. When a panel passes behind you it's pushed to the far end
of the corridor carrying the next station; walk backwards and the reverse happens.
Depth values stay in a bounded range, so float precision never degrades however far
you walk.

Which station belongs at a given depth is **derived from that depth**, not tracked
in a counter — that's what makes the corridor work in both directions. Walk back up
and every panel returns exactly where it was.

## The markup is still a document

Every panel lives in `#station-pool` in reading order. The engine *lifts* those live
nodes into 3D, so the corridor is a presentation of the page rather than a
replacement for it. With JS off, or under `prefers-reduced-motion`, the pool simply
reads as a normal page and every link still works. Links in the corridor are real
links; anything not in front of you is `inert`, so it can't be clicked or tabbed to
by accident.

## The sketch treatment

Graph paper, and an `feDisplacementMap` filter that pushes every edge around so
straight lines wander like a pen drew them — corners overshoot slightly, the way
they do when your hand doesn't stop in time. Annotations are in blue ballpoint.
Volt green survives the theme as a **highlighter swipe**, which is native to a
sketchbook rather than fighting it.

Two things that are load-bearing and easy to break:

- Panels must reach **full opacity** in the reading zone. Anything below 1.0 can't
  occlude the panel behind it, and two sets of text collide.
- The edge vignette must stay subtle. A strong one paints over the panels sweeping
  past — the exact thing that makes it feel like walking.

## Run it

```bash
npm install
npm run dev
npm run build
```

## Structure

```
index.html              all content, as stations in reading order
src/js/world.js         the corridor: 3D dolly, recycling, station lifting
src/js/telemetry.js     the ships-over-time chart, drawn in ink
src/js/scroll.js        Lenis + ScrollTrigger sync
src/js/preloader.js     loading sequence
src/js/cursor.js        custom cursor
src/js/menu.js          fullscreen menu
src/js/clock.js         Islamabad local time
src/styles/sketch.css   the whole hand-drawn theme
src/styles/base.css     reset + chrome scaffolding
```
