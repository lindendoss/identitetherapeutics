import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ClinicalSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".anim");
    gsap.set(items, { opacity: 0, y: 24 });
    gsap.to(items, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 75%", once: true },
    });
  }, []);

  return (
    <section id="clinical" ref={ref} className="w-full py-32 lg:py-44 bg-white">
      <div className="max-w-[1100px] mx-auto px-8 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="anim eyebrow text-[var(--olive)] block mb-6">Clinical Program</span>
            <h2 className="anim font-display heading-md text-[var(--charcoal)] mb-6">
              Early signals<br />in patients
            </h2>
            <p className="anim font-body text-[15px] text-[var(--charcoal)]/50 leading-relaxed mb-4">
              Under <strong className="text-[var(--charcoal)]/70">Linden Doss, MD</strong>, patients with severe, treatment-resistant ocular surface disease have shown improvement using topical regadenoson.
            </p>
            <p className="anim font-body text-[14px] text-[var(--charcoal)]/40 leading-relaxed">
              Partnership with <strong className="text-[var(--charcoal)]/60">UCSB Center for Stem Cell Biology</strong>. Supported by the <strong className="text-[var(--charcoal)]/60">DoD CDMRP Vision Research Program</strong>.
            </p>
          </div>
          <div className="anim">
            <img src="/images/eyedrop.jpg" alt="" className="w-full rounded-lg" style={{ aspectRatio: "4/3", objectFit: "cover" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
