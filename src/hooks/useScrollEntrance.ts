import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollEntranceOptions {
  threshold?: number;
  stagger?: number;
  y?: number;
  duration?: number;
  delay?: number;
  childSelector?: string;
}

export function useScrollEntrance(options: ScrollEntranceOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    threshold = 0.2,
    stagger = 0.1,
    y = 20,
    duration = 0.6,
    delay = 0,
    childSelector,
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      gsap.set(childSelector ? el.querySelectorAll(childSelector) : el, {
        opacity: 1,
        y: 0,
      });
      return;
    }

    const targets = childSelector
      ? el.querySelectorAll(childSelector)
      : el;

    gsap.set(targets, { opacity: 0, y });

    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      stagger: childSelector ? stagger : 0,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: `top ${100 - threshold * 100}%`,
        once: true,
      },
    });

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, [threshold, stagger, y, duration, delay, childSelector]);

  return ref;
}
