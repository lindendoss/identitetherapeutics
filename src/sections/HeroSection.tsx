import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Props { onExplore: () => void; }

/* Animated honeycomb canvas — Recursion-style hexagonal grid */
function HoneycombCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouseX = 0, mouseY = 0;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const hexRadius = 35;
    const hexHeight = hexRadius * Math.sqrt(3);

    const drawHex = (x: number, y: number, r: number, alpha: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(107, 123, 62, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    let frame: number;
    const draw = () => {
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);
      time += 0.008;

      const cols = Math.ceil(cw / (hexRadius * 3)) + 2;
      const rows = Math.ceil(ch / hexHeight) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const xOffset = (row % 2) * hexRadius * 1.5;
          const x = col * hexRadius * 3 + xOffset;
          const y = row * hexHeight;

          const distToMouse = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2);
          const maxDist = 180;
          const proximity = Math.max(0, 1 - distToMouse / maxDist);

          const wave = Math.sin(time + col * 0.3 + row * 0.2) * 0.5 + 0.5;
          const baseAlpha = 0.04 + wave * 0.06;
          const alpha = baseAlpha + proximity * 0.25;
          const radius = hexRadius + proximity * 8;

          drawHex(x, y, radius, Math.min(alpha, 0.4));
        }
      }
      frame = requestAnimationFrame(draw);
    };
    draw();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    canvas.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
  );
}

export default function HeroSection({ onExplore }: Props) {
  const tagRef = useRef<HTMLSpanElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const pRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.to(tagRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
      .to(h1Ref.current, { opacity: 1, y: 0, duration: 1.0, ease: "power3.out" }, 0.15)
      .to(pRef.current, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 0.5)
      .to(btnRef.current, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.7);
    return () => { tl.kill(); };
  }, []);

  return (
    <section id="hero" className="relative w-full grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "100vh" }}>
      {/* Left — Text */}
      <div className="relative z-10 flex flex-col justify-center px-8 lg:px-16 py-20 lg:py-0">
        <span ref={tagRef} className="eyebrow text-[var(--olive)] mb-6 block" style={{ opacity: 0, transform: "translateY(15px)" }}>
          Ocular Surface Therapeutics
        </span>
        <h1 ref={h1Ref} className="font-display heading-xl text-[var(--charcoal)] mb-8" style={{ opacity: 0, transform: "translateY(20px)" }}>
          Helping the<br />eye heal<br />itself
        </h1>
        <p ref={pRef} className="font-body text-[17px] text-[var(--charcoal)]/50 max-w-[380px] mb-10 leading-relaxed" style={{ opacity: 0, transform: "translateY(15px)" }}>
          Repurposing regadenoson as a topical eye drop for dry eye, filamentary keratitis, and corneal injury.
        </p>
        <button ref={btnRef} onClick={onExplore}
          className="self-start font-body text-[13px] text-[var(--charcoal)] border border-[var(--charcoal)]/20 rounded-full px-8 py-3 hover:bg-[var(--charcoal)] hover:text-white transition-all duration-300"
          style={{ opacity: 0, transform: "translateY(10px)" }}>
          Explore Our Science
        </button>
      </div>

      {/* Right — Animated honeycomb */}
      <div className="relative hidden lg:block" style={{ background: "var(--cream)" }}>
        <HoneycombCanvas />
        {/* Eye image overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src="/images/hero-eye.jpg" alt="" className="w-[70%] h-auto rounded-lg shadow-2xl object-cover" style={{ opacity: 0.85, mixBlendMode: "multiply" }} />
        </div>
      </div>

      {/* Mobile: background image */}
      <div className="lg:hidden absolute inset-0 -z-10">
        <img src="/images/hero-eye.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-white/80" />
      </div>
    </section>
  );
}
