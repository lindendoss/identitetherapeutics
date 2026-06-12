import { useState, useEffect } from "react";
import { useNavVisibility } from "@/hooks/useNavVisibility";

const LINKS = [
  { label: "Science", target: "mechanism" },
  { label: "Pipeline", target: "pipeline" },
  { label: "Research", target: "clinical" },
  { label: "Contact", target: "footer" },
];

interface Props { onNav: (id: string) => void; }

export default function Navigation({ onNav }: Props) {
  const visible = useNavVisibility(0.85);
  const [open, setOpen] = useState(false);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-10px)", pointerEvents: visible ? "auto" : "none" }}>
        <div className="h-16 flex items-center justify-between px-8 lg:px-16 max-w-[1100px] mx-auto"
          style={{ backgroundColor: "rgba(255,255,255,0.93)", backdropFilter: "blur(12px)" }}>
          <button onClick={() => onNav("hero")}>
            <img src="/images/logo-black.png" alt="Identite Therapeutics" className="h-7 w-auto" />
          </button>

          <div className="hidden lg:flex items-center gap-8">
            {LINKS.map((l) => (
              <button key={l.label} onClick={() => onNav(l.target)} className="font-body text-[14px] text-[var(--charcoal)] hover:text-[var(--olive)] transition-colors">
                {l.label}
              </button>
            ))}
          </div>

          <a href="mailto:info@identitetherapeutics.com" className="hidden lg:inline-flex font-body text-[13px] text-[var(--charcoal)] border border-[var(--charcoal)]/15 rounded-full px-5 py-2 hover:bg-[var(--charcoal)] hover:text-white transition-all">
            Get in Touch
          </a>

          <button className="lg:hidden flex flex-col gap-[5px] p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            <span className="block w-5 h-[2px] bg-[var(--charcoal)] transition-all" style={{ transform: open ? "rotate(45deg) translate(3px, 3px)" : "none" }} />
            <span className="block w-5 h-[2px] bg-[var(--charcoal)] transition-opacity" style={{ opacity: open ? 0 : 1 }} />
            <span className="block w-5 h-[2px] bg-[var(--charcoal)] transition-all" style={{ transform: open ? "rotate(-45deg) translate(3px, -3px)" : "none" }} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8" style={{ backgroundColor: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}>
          {LINKS.map((l) => (
            <button key={l.label} onClick={() => { setOpen(false); onNav(l.target); }} className="font-display text-3xl text-[var(--charcoal)] hover:text-[var(--olive)] transition-colors">
              {l.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
