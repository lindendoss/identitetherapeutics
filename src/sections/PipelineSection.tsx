import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PROGRAMS = [
  { name: "Observational Cohort", indication: "Filamentary Keratitis / Severe Dry Eye", progress: 75 },
  { name: "Preclinical Safety", indication: "Ophthalmic GLP Toxicology", progress: 40 },
  { name: "IND Enabling", indication: "Biomarker-Enriched Dry Eye Trial", progress: 20 },
];

export default function PipelineSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".anim");
    gsap.set(items, { opacity: 0, y: 20 });
    gsap.to(items, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 75%", once: true },
    });
    ScrollTrigger.create({ trigger: el.querySelector(".bars"), start: "top 80%", once: true, onEnter: () => setAnimated(true) });
  }, []);

  return (
    <section id="pipeline" ref={ref} className="w-full py-32 lg:py-44" style={{ background: "var(--cream)" }}>
      <div className="max-w-[1100px] mx-auto px-8 lg:px-16">
        <div className="mb-14">
          <span className="anim eyebrow text-[var(--olive)] block mb-6">Development Pipeline</span>
          <h2 className="anim font-display heading-md text-[var(--charcoal)]">Our path forward</h2>
        </div>

        <div className="bars flex flex-col gap-8 mb-14">
          {PROGRAMS.map((p, i) => (
            <div key={p.name} className="anim">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-body font-semibold text-[15px] text-[var(--charcoal)]">{p.name}</span>
                <span className="font-body text-[13px] text-[var(--charcoal)]/35">{p.indication}</span>
              </div>
              <div className="w-full h-[5px] rounded-full overflow-hidden" style={{ backgroundColor: "#E8E3DA" }}>
                <div className="h-full rounded-full" style={{
                  width: animated ? `${p.progress}%` : "0%",
                  backgroundColor: "var(--olive)",
                  transition: `width 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.15}s`,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* 505(b)(2) */}
        <div className="anim flex items-start gap-5 p-8 rounded-lg bg-white">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--olive)" }}>
            <span className="text-white font-display text-[12px]">505</span>
          </div>
          <div>
            <h3 className="font-display text-[18px] text-[var(--charcoal)] mb-2">505(b)(2) Regulatory Pathway</h3>
            <p className="font-body text-[13px] text-[var(--charcoal)]/45 leading-relaxed">
              Leveraging the existing Lexiscan NDA for systemic safety. Only route-specific ophthalmic data needs to be generated new.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
