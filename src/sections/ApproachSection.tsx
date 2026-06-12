import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ApproachSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const els = el.querySelectorAll(".anim");
    gsap.set(els, { opacity: 0, y: 30 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 75%", once: true } });
    tl.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power2.out" });
    return () => { tl.kill(); };
  }, []);

  return (
    <section ref={ref} className="w-full py-32 lg:py-44 bg-white">
      <div className="max-w-[1100px] mx-auto px-8 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="anim eyebrow text-[var(--olive)] block mb-6">Our Approach</span>
            <h2 className="anim font-display heading-lg text-[var(--charcoal)] mb-8">
              Restoring the<br />tear film's<br />natural balance
            </h2>
            <p className="anim font-body text-[16px] text-[var(--charcoal)]/50 max-w-[400px] leading-relaxed">
              Current therapies only address one side of the equation. We engage a dual-receptor mechanism that restores the ratio from both sides simultaneously.
            </p>
          </div>
          <div className="anim">
            <img src="/images/tear-drop.jpg" alt="" className="w-full max-w-[400px] ml-auto rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
