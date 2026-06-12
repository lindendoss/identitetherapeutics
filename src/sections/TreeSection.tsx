import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TreeSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".anim");
    gsap.set(items, { opacity: 0, y: 20 });
    gsap.to(items, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 60%", once: true },
    });
  }, []);

  return (
    <section ref={ref} className="relative w-full overflow-hidden" style={{ minHeight: "85vh" }}>
      <div className="absolute inset-0">
        <img src="/images/pine-forest.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(45,41,38,0.8) 0%, rgba(45,41,38,0.3) 50%, transparent 100%)" }} />
      </div>
      <div className="relative z-10 flex flex-col justify-end min-h-[85vh] pb-20 px-8 lg:px-16 max-w-[1100px] mx-auto">
        <span className="anim eyebrow text-[var(--olive-light)] mb-5 block">Our Identity</span>
        <h2 className="anim font-display text-white max-w-[500px] mb-5" style={{ fontSize: "clamp(40px, 6vw, 80px)", lineHeight: 1.0 }}>
          Rooted in<br />resilience
        </h2>
        <p className="anim font-body text-[15px] text-white/55 max-w-[400px] leading-relaxed mb-8">
          The bristlecone pine thrives for thousands of years in the harshest conditions. Like the tree, we believe in patient endurance and deep roots in science.
        </p>
        <div className="anim">
          <p className="font-display text-white text-[22px]">Identit&eacute;</p>
          <p className="font-body text-[10px] text-white/35 mt-1 tracking-[0.15em] uppercase">Root · Identity · Origin</p>
        </div>
      </div>
    </section>
  );
}
