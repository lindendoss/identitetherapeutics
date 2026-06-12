import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { num: "01", title: "A2A Engagement", body: "Regadenoson binds A2A receptors on M1 macrophages in the conjunctival epithelium." },
  { num: "02", title: "M1 Suppression", body: "cAMP signaling brakes TNF-α, IL-1β, iNOS, and NLRP3 inflammasome activity." },
  { num: "03", title: "M2 Resolution", body: "Macrophages shift to Arg1, CD206, IL-10. Goblet cells secrete TGF-β." },
];

export default function MacrophageSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".anim");
    gsap.set(items, { opacity: 0, y: 24 });
    gsap.to(items, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 70%", once: true },
    });
  }, []);

  return (
    <section ref={ref} className="w-full py-32 lg:py-44" style={{ background: "var(--cream)" }}>
      <div className="max-w-[1100px] mx-auto px-8 lg:px-16">
        <div className="text-center mb-16">
          <span className="anim eyebrow text-[var(--olive)] block mb-6">Innate Immune Resolution</span>
          <h2 className="anim font-display heading-md text-[var(--charcoal)]">
            Macrophage repolarization
          </h2>
        </div>

        {/* Gradient bar */}
        <div className="anim max-w-[600px] mx-auto mb-16">
          <div className="h-2 rounded-full" style={{ background: "linear-gradient(to right, var(--m1), var(--m2))" }} />
          <div className="flex justify-between mt-3">
            <span className="font-body text-[10px] uppercase tracking-widest text-[var(--m1)] font-semibold">Pro-inflammatory</span>
            <span className="font-body text-[10px] uppercase tracking-widest text-[var(--m2)] font-semibold">Anti-inflammatory</span>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[900px] mx-auto">
          {STEPS.map((s) => (
            <div key={s.num} className="anim border-t-2 border-[var(--olive)]/20 pt-6">
              <span className="font-display text-[32px] text-[var(--olive)]/20">{s.num}</span>
              <h3 className="font-display text-[18px] text-[var(--charcoal)] mt-2 mb-3">{s.title}</h3>
              <p className="font-body text-[13px] text-[var(--charcoal)]/45 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
