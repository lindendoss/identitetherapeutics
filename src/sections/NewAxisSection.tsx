import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function NewAxisSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".anim");
    gsap.set(items, { opacity: 0, y: 24 });
    gsap.to(items, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 70%", once: true },
    });
    ScrollTrigger.create({ trigger: el.querySelector(".gradient-bar"), start: "top 75%", end: "bottom 40%", scrub: 1,
      onUpdate: (self) => setProgress(self.progress),
    });
  }, []);

  return (
    <section ref={ref} className="w-full py-32 lg:py-44" style={{ background: "var(--cream)" }}>
      <div className="max-w-[1100px] mx-auto px-8 lg:px-16">
        <div className="text-center mb-20">
          <span className="anim eyebrow text-[var(--olive)] block mb-6">The Untouched Axis</span>
          <h2 className="anim font-display heading-lg text-[var(--charcoal)]">
            A new axis in<br />dry eye treatment
          </h2>
        </div>

        {/* Animated gradient bar */}
        <div className="anim gradient-bar max-w-[700px] mx-auto mb-16">
          <div className="relative h-2 rounded-full overflow-hidden mb-8"
            style={{ background: "linear-gradient(to right, var(--m1), var(--m2))" }}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--m2)] transition-all duration-100"
              style={{ width: `${progress * 100}%`, opacity: 0.25 }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-[2px] h-5 bg-white transition-all"
              style={{ left: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Two axes */}
        <div className="anim grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 relative">
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-[var(--warm-gray)]/30" />

          {/* Adaptive — existing */}
          <div className="pr-0 lg:pr-16">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--taupe)]" />
              <span className="eyebrow text-[var(--taupe)]">Adaptive Immunity</span>
            </div>
            <h3 className="font-display text-[22px] text-[var(--charcoal)]/40 mb-4">Targeted by existing drugs</h3>
            <p className="font-body text-[14px] text-[var(--charcoal)]/35 leading-relaxed mb-8">
              Cyclosporine and lifitegrast suppress activated T-cells. They do not directly engage the innate immune system.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Cyclosporine", "Lifitegrast"].map((d) => (
                <span key={d} className="text-[12px] px-4 py-2 rounded-full border border-[var(--warm-gray)]/50 text-[var(--charcoal)]/40">{d}</span>
              ))}
            </div>
          </div>

          {/* Innate — ours */}
          <div className="pl-0 lg:pl-16">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--olive)]" />
              <span className="eyebrow text-[var(--olive)]">Innate Immunity</span>
            </div>
            <h3 className="font-display text-[22px] text-[var(--charcoal)] mb-4">Untouched until now</h3>
            <p className="font-body text-[14px] text-[var(--charcoal)]/55 leading-relaxed mb-8">
              No approved therapy directly engages innate immune resolution. Regadenoson is the first to target A2A-driven macrophage repolarization.
            </p>
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-[var(--olive)]/30 bg-[var(--olive)]/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--olive)]" />
              <span className="font-body text-[13px] text-[var(--charcoal)] font-medium">Regadenoson · Topical A2A Agonist</span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-8">
              {[
                { label: "M1 → M2", desc: "Macrophage repolarization" },
                { label: "A2A + A1", desc: "Dual receptor" },
                { label: "cAMP / Ca²⁺", desc: "Dual signaling" },
                { label: "Orthogonal", desc: "Additive to existing" },
              ].map((item) => (
                <div key={item.label}>
                  <span className="font-body text-[11px] text-[var(--olive)] font-semibold uppercase tracking-wide">{item.label}</span>
                  <span className="font-body text-[11px] text-[var(--charcoal)]/40 block">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
