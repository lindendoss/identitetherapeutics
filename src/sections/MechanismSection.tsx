import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function MechanismSection() {
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
    <section id="mechanism" ref={ref} className="w-full py-32 lg:py-44 bg-white">
      <div className="max-w-[1100px] mx-auto px-8 lg:px-16">
        <div className="text-center mb-16">
          <span className="anim eyebrow text-[var(--olive)] block mb-6">Mechanism of Action</span>
          <h2 className="anim font-display heading-lg text-[var(--charcoal)]">
            The Bicarbonate<br />Bridge
          </h2>
        </div>

        <div className="anim grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[900px] mx-auto">
          {/* A2A */}
          <div className="bg-white rounded-lg p-10 relative overflow-hidden shadow-sm border border-[var(--warm-gray)]/20">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: "var(--olive)" }} />
            <h3 className="font-display text-[22px] text-[var(--charcoal)] mb-4">A2A — Hydration & Repair</h3>
            <p className="font-body text-[14px] text-[var(--charcoal)]/50 leading-relaxed">
              cAMP signaling hydrates mucin via CFTR/bicarbonate channels. Calms innate inflammation by shifting macrophages from M1 to M2 — the mechanism cyclosporine cannot access.
            </p>
          </div>

          {/* A1 */}
          <div className="bg-white rounded-lg p-10 relative overflow-hidden shadow-sm border border-[var(--warm-gray)]/20">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: "var(--taupe)" }} />
            <h3 className="font-display text-[22px] text-[var(--charcoal)] mb-4">A1 — Secretory Recruitment</h3>
            <p className="font-body text-[14px] text-[var(--charcoal)]/50 leading-relaxed">
              At ocular surface concentrations, regadenoson engages A1 receptors, driving calcium-dependent secretion from Krause and Wolfring glands.
            </p>
          </div>
        </div>

        {/* Bridge divider */}
        <div className="anim mt-14 flex items-center justify-center">
          <div className="w-16 h-[1px]" style={{ background: "linear-gradient(to right, transparent, var(--olive))" }} />
          <div className="mx-5 text-center">
            <span className="font-display text-[16px] text-[var(--olive)]">Dual Receptor</span>
          </div>
          <div className="w-16 h-[1px]" style={{ background: "linear-gradient(to left, transparent, var(--taupe))" }} />
        </div>
      </div>
    </section>
  );
}
