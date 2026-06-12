import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    letter: "R",
    title: "Repurposed & Proven",
    body: "Regadenoson (Lexiscan) has been used safely in hundreds of thousands of patients for cardiac imaging. We are repurposing it as a topical eye drop — leveraging existing safety data and the 505(b)(2) pathway to dramatically reduce development risk, cost, and time to clinic.",
  },
  {
    letter: "D",
    title: "Dual Mechanism",
    body: "Unlike single-mechanism therapies that plateau, our approach engages both A2A (hydration, epithelial repair, innate immune resolution) and A1 (secretory recruitment from surface-accessory glands) — two parallel pathways that restore the tear film's functional ratio.",
  },
  {
    letter: "S",
    title: "Surface-Only Design",
    body: "By targeting the corneal and conjunctival epithelium and surface-accessory glands of Krause and Wolfring — not the deep main lacrimal gland — we achieve therapeutic action where the drug is applied, with minimal systemic exposure and an excellent safety margin.",
  },
];

export default function DifferentiatorsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current;
    if (!section || !header || !cards) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      gsap.set(header.querySelectorAll(".animate-in"), { opacity: 1, y: 0 });
      gsap.set(cards.querySelectorAll(".feature-card"), { opacity: 1, y: 0 });
      return;
    }

    const headerEls = header.querySelectorAll(".animate-in");
    gsap.set(headerEls, { opacity: 0, y: 20 });

    gsap.to(headerEls, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: header, start: "top 80%", once: true },
    });

    const cardEls = cards.querySelectorAll(".feature-card");
    gsap.set(cardEls, { opacity: 0, y: 20 });

    gsap.to(cardEls, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power2.out",
      scrollTrigger: { trigger: cards, start: "top 80%", once: true },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === header || t.trigger === cards) t.kill();
      });
    };
  }, []);

  return (
    <section
      id="differentiators"
      ref={sectionRef}
      style={{
        backgroundColor: "#F5F1EB",
        padding: "clamp(80px, calc(80px + (140 - 80) * ((100vw - 428px) / (1512 - 428))), 140px) 0",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 lg:px-[60px]">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className="animate-in text-eyebrow text-[#6B7B3E] block mb-4">
            WHY IDENTITÉ
          </span>
          <h2 className="animate-in font-display h2-size text-[#2D2926]">
            Built on substance
          </h2>
        </div>

        {/* Cards Grid */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-10"
        >
          {FEATURES.map((feature) => (
            <div key={feature.letter} className="feature-card">
              <div className="w-10 h-10 rounded-full border-[1.5px] border-[#6B7B3E] flex items-center justify-center mb-6">
                <span className="font-display text-lg text-[#6B7B3E]">
                  {feature.letter}
                </span>
              </div>
              <h3 className="font-display h3-size text-[#2D2926] mb-4">
                {feature.title}
              </h3>
              <p className="font-body text-base text-[#2D2926] opacity-70 leading-relaxed">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
