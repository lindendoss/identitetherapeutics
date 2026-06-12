export default function Footer() {
  return (
    <footer id="footer" className="w-full border-t border-[var(--warm-gray)]/30" style={{ backgroundColor: "var(--cream)" }}>
      <div className="max-w-[1100px] mx-auto px-8 lg:px-16 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <img src="/images/logo-black.png" alt="Identite Therapeutics" className="h-7 w-auto mb-4" />
            <div className="font-body text-[13px] text-[var(--charcoal)]/50 leading-relaxed">
              <p>Identit&eacute; Therapeutics</p>
              <p>Santa Barbara, California</p>
            </div>
          </div>
          <div>
            <h4 className="font-body font-semibold text-[13px] text-[var(--charcoal)] mb-4">Science</h4>
            <ul className="space-y-2">
              {["The Bicarbonate Bridge", "A2A Innate Resolution", "A1 Secretory Mechanism"].map((s) => (
                <li key={s} className="font-body text-[13px] text-[var(--charcoal)]/40">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-body font-semibold text-[13px] text-[var(--charcoal)] mb-4">Program</h4>
            <ul className="space-y-2">
              {["Observational Cohort", "Preclinical Safety", "IND Enabling"].map((s) => (
                <li key={s} className="font-body text-[13px] text-[var(--charcoal)]/40">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-body font-semibold text-[13px] text-[var(--charcoal)] mb-4">Connect</h4>
            <ul className="space-y-2">
              <li><a href="mailto:info@identitetherapeutics.com" className="font-body text-[13px] text-[var(--charcoal)]/40 hover:text-[var(--olive)] transition-colors">Contact Us</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="font-body text-[13px] text-[var(--charcoal)]/40 hover:text-[var(--olive)] transition-colors">LinkedIn ↗</a></li>
              <li><a href="https://stemcell.ucsb.edu" target="_blank" rel="noopener noreferrer" className="font-body text-[13px] text-[var(--charcoal)]/40 hover:text-[var(--olive)] transition-colors">UCSB ↗</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-[var(--warm-gray)]/30 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="font-body text-[11px] text-[var(--charcoal)]/30 tracking-wide">&copy; 2026 Identit&eacute; Therapeutics</span>
          <span className="font-body text-[11px] text-[var(--charcoal)]/30 tracking-wide">Privacy · Terms</span>
        </div>
      </div>
    </footer>
  );
}
