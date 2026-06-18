import { useState } from 'react';
import { GetStartedButton } from '@/components/ui/get-started-button';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { GoldGlow } from '@/components/ui/glow-background';
import './LandingPage.css';

const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

const FEATURES = [
  {
    title: 'Analyses Dodd',
    desc: 'Chaque match analysé par Dodd : probabilités, forme, H2H, blessés — tout en un coup d\'œil.',
  },
  {
    title: 'Value Bets',
    desc: 'Notre algorithme détecte les cotes sous-évaluées par les bookmakers pour maximiser ton edge.',
  },
  {
    title: 'Combos Dodd',
    desc: 'Génère des combinés optimisés automatiquement selon ton profil de risque (Prudent / Audacieux).',
  },
  {
    title: 'Suivi de paris',
    desc: 'Enregistre tes paris, suis ton ROI en temps réel et synchronise sur tous tes appareils.',
  },
  {
    title: 'En direct',
    desc: 'Scores et cotes mis à jour en temps réel. Ne rate jamais un match à fort potentiel.',
  },
  {
    title: 'Modèle Poisson',
    desc: 'Nos cotes sont calculées via un modèle statistique basé sur les vrais buts par match.',
  },
];

const STATS = [
  { value: '500+', label: 'Matchs analysés / semaine' },
  { value: '5',    label: 'Ligues top européennes' },
  { value: '3',    label: 'Niveaux de paris Dodd' },
  { value: '24/7', label: 'Mises à jour en temps réel' },
];

export default function LandingPage({ onStart, onLogin, onPricing }) {
  const [leadEmail,   setLeadEmail]   = useState('');
  const [leadStatus,  setLeadStatus]  = useState('idle'); // idle | loading | done | error

  async function handleLeadSubmit(e) {
    e.preventDefault();
    if (!leadEmail) return;
    setLeadStatus('loading');
    try {
      await fetch(`${API}/api/leads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: leadEmail, source: 'landing' }),
      });
      setLeadStatus('done');
    } catch {
      setLeadStatus('error');
    }
  }

  return (
    <div className="landing">

      {/* ── Fond sunrise doré — full screen ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle 800px at 50% 0px, rgba(234,179,8,0.10), transparent)`,
        }}
      />

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-logo">DoddBet</div>
        <div className="landing-nav-actions">
          <button className="landing-btn-ghost" onClick={onLogin}>Se connecter</button>
          <button className="landing-btn-primary" onClick={onPricing}>Voir les offres</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-badge">Dodd · Cotes · Value Bets</div>
        <h1 className="landing-hero-title">
          Pariez plus<br />
          <span className="landing-gradient">intelligemment</span>
        </h1>
        <p className="landing-hero-sub">
          DoddBet analyse chaque match pour te donner les meilleures chances de gagner.
          Value bets, combos optimisés, suivi de paris — tout au même endroit.
        </p>
        <div className="landing-hero-ctas">
          <GetStartedButton onClick={onStart} label="Commencer gratuitement" />
          <button className="landing-cta-ghost" onClick={onPricing}>
            Voir les offres Pro
          </button>
        </div>
        <p className="landing-hero-hint">Gratuit · Sans carte bancaire · Accès immédiat</p>

        {/* ── Capture email ── */}
        <div className="landing-email-capture">
          {leadStatus !== 'done' ? (
            <>
              <p className="landing-email-caption">
                Notifié en avant-première pour la Coupe du Monde 2026
              </p>
              <form className="landing-email-form" onSubmit={handleLeadSubmit}>
                <input
                  type="email"
                  className="landing-email-input"
                  placeholder="ton@email.com"
                  value={leadEmail}
                  onChange={e => setLeadEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="landing-email-btn"
                  disabled={leadStatus === 'loading'}
                >
                  {leadStatus === 'loading' ? '...' : 'Me notifier'}
                </button>
              </form>
              {leadStatus === 'error' && (
                <p className="landing-email-error">Erreur — réessaie dans un instant</p>
              )}
            </>
          ) : (
            <div className="landing-email-done">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Parfait ! On te prévient dès que la CdM 2026 commence.</span>
            </div>
          )}
        </div>

        {/* ── Indicateur de scroll ── */}
        <button
          className="landing-scroll-cue"
          aria-label="Découvre l'app"
          onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
        >
          <span>Découvre l'app</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </section>

      {/* ── Scroll Animation ── */}
      <ContainerScroll
        titleComponent={
          <div style={{ marginBottom: "2rem" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--violet)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Aperçu de l'app
            </span>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, color: "var(--text)", marginTop: "0.5rem", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
              Tout ce qu'il te faut<br />
              <span style={{ color: "#eab308" }}>
                en un seul endroit
              </span>
            </h2>
          </div>
        }
      >
        {/* Mockup UI de l'app */}
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#05070B", borderRadius: "18px", overflow: "hidden" }}>
          {/* Barre nav simulée */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#080B12" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#eab308" }}></div>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#E8EAF2" }}>DoddBet</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              {["Tous", "Aujourd'hui", "Value bets"].map((t, i) => (
                <span key={t} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: i === 1 ? "rgba(234,179,8,0.15)" : "transparent", color: i === 1 ? "#EAB308" : "rgba(232,234,242,0.4)", border: i === 1 ? "1px solid rgba(234,179,8,0.3)" : "1px solid transparent" }}>{t}</span>
              ))}
            </div>
          </div>
          {/* Cards simulées */}
          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "hidden" }}>
            {[
              { home: "Chelsea", away: "Arsenal", h: "2.10", n: "3.40", a: "3.20", live: true,  score: "1–0" },
              { home: "PSG",     away: "Lyon",    h: "1.75", n: "3.80", a: "4.50", live: false, score: null },
              { home: "Madrid",  away: "Barça",   h: "2.40", n: "3.20", a: "2.90", live: false, score: null, value: true },
            ].map((m) => (
              <div key={m.home} style={{ background: "#0C0F18", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    {m.live && <span style={{ fontSize: "9px", fontWeight: 700, color: "#F43F5E", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "4px", padding: "1px 5px" }}>EN DIRECT</span>}
                    {m.value && <span style={{ fontSize: "9px", fontWeight: 700, color: "#FCBF49", background: "rgba(252,191,73,0.1)", border: "1px solid rgba(252,191,73,0.25)", borderRadius: "4px", padding: "1px 5px" }}>VALUE</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#E8EAF2" }}>{m.home}</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#FCBF49", minWidth: "40px", textAlign: "center" }}>{m.score ?? "vs"}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#E8EAF2" }}>{m.away}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[m.h, m.n, m.a].map((odd, i) => (
                    <div key={i} style={{ background: i === 0 && m.value ? "rgba(252,191,73,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 && m.value ? "rgba(252,191,73,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: "6px", padding: "4px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "rgba(232,234,242,0.4)" }}>{["1", "N", "2"][i]}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: i === 0 && m.value ? "#FCBF49" : "#E8EAF2" }}>{odd}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ContainerScroll>

      {/* ── Stats ── */}
      <section className="landing-stats">
        {STATS.map(s => (
          <div key={s.label} className="landing-stat">
            <span className="landing-stat-value">{s.value}</span>
            <span className="landing-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="landing-features">
        <h2 className="landing-section-title">Tout ce dont tu as besoin</h2>
        <p className="landing-section-sub">Des outils professionnels, accessibles à tous</p>
        <div className="landing-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="landing-feature-card">
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="landing-pricing">
        <h2 className="landing-section-title">Simple et transparent</h2>
        <p className="landing-section-sub">Un seul plan, tout débloqué</p>
        <div className="landing-pricing-cards">

          {/* Pro (offre unique) */}
          <div className="landing-plan landing-plan--pro landing-plan--single">
            <div className="landing-plan-badge">Accès complet</div>
            <div className="landing-plan-name">DoddBet Pro</div>
            <div className="landing-plan-price">
              <span className="plan-amount">5€</span>
              <span className="plan-period">/ mois</span>
            </div>
            <div className="landing-plan-yearly">ou 39,99€/an — 2 mois offerts</div>
            <ul className="landing-plan-features">
              <li>Tous les matchs & ligues (60+)</li>
              <li>Analyses Dodd illimitées</li>
              <li>Value bets en temps réel</li>
              <li>Combos Dodd optimisés</li>
              <li>Suivi de paris synchronisé</li>
              <li>Stats avancées & ROI</li>
              <li>Application mobile</li>
            </ul>
            <button className="landing-plan-btn landing-plan-btn--pro" onClick={onPricing}>
              Essayer Pro →
            </button>
          </div>

        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="landing-final">
        <h2>Prêt à parier plus intelligemment ?</h2>
        <p>Rejoins les parieurs qui utilisent Dodd pour avoir un edge sur les bookmakers.</p>
        <GetStartedButton onClick={onStart} label="Accéder à DoddBet gratuitement" />
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p>DoddBet — L'edge sur les bookmakers</p>
        <p className="landing-footer-legal">
          DoddBet est un outil d'aide à la décision. Les paris comportent des risques. Jouez de manière responsable. 18+
        </p>
      </footer>

    </div>
  );
}
