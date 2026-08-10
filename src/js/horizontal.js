import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { qs, qsa } from './utils.js';

/**
 * "Hall of Fame" — pinned horizontal gallery on desktop,
 * vertical stack with fade-ups on mobile / reduced motion.
 */
export function initHorizontal() {
  const track = qs('#hof-track');
  if (!track) return;

  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const distance = () => track.scrollWidth - window.innerWidth;

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '#hof-pin',
        start: 'top top',
        end: () => '+=' + distance(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          gsap.set('#hof-progress-bar', { scaleX: self.progress });
        },
      },
    });

    // inner parallax on each cover word while the track slides
    qsa('.project__cover-word').forEach((word) => {
      gsap.fromTo(
        word,
        { x: -60 },
        {
          x: 60,
          ease: 'none',
          scrollTrigger: {
            trigger: word.closest('.project__cover'),
            containerAnimation: tween,
            start: 'left right',
            end: 'right left',
            scrub: true,
          },
        }
      );
    });
  });

  mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    const panels = qsa('.hof__panel');
    gsap.set(panels, { autoAlpha: 0, y: 50 });
    ScrollTrigger.batch(panels, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
        }),
    });
  });
}
