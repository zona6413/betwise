import './LandingPage.css';

const FEATURES = [
  {
    icon: '🤖',
    title: 'Analyses IA',
    desc: 'Chaque match analysé par notre IA : probabilités, forme, H2H, blessés — tout en un coup d\'œil.',
  },
  {
    icon: '💎',
    title: 'Value Bets',
    desc: 'Notre algorithme détecte les cotes sous-évaluées par les bookmakers pour maximiser ton edge.',
  },
  {
    icon: '🎯',
    title: 'Combos IA',
    desc: 'Génère des combinés optimisés automatiquement selon ton profil de risque (Prudent / Audacieux).',
  },
  {
    icon: '📊',
    title: 'Suivi de paris',
    desc: 'Enregistre tes paris, suis ton ROI en temps réel et synchronise sur tous tes appareils.',
  },
  {
    icon: '⚡',
    title: 'En direct',
    desc: 'Scores et cotes mis à jour en temps réel. Ne rate jamais un match à fort potentiel.',
  },
  {
    icon: '📈',
    title: 'Modèle Poisson',
    desc: 'Nos cotes sont calculées via un modèle statistique basé sur les vrais buts par match.',
  },
];

const STATS = [
  { value: '500+', label: 'Matchs analysés / semaine' },
  { value: '5',    label: 'Ligues top européennes' },
  { value: '3',    label: 'Niveaux de paris IA' },
  { value: '24/7', label: 'Mises à jour en temps réel' },
];

export default function LandingPage({ onStart, onLogin, onPricing }) {
  return (
    <div className="landing">

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-logo">⚡ BetWise</div>
        <div className="landing-nav-actions">
          <button className="landing-btn-ghost" onClick={onLogin}>Se connecter</button>
          <button className="landing-btn-primary" onClick={onPricing}>Voir les offres</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-badge">🚀 IA · Cotes Poisson · Value Bets</div>
        <h1 className="landing-hero-title">
          Pariez plus<br />
          <span className="landing-gradient">intelligemment</span>
        </h1>
        <p className="landing-hero-sub">
          BetWise analyse chaque match avec l'IA pour te donner les meilleures chances de gagner.
          Value bets, combos optimisés, suivi de paris — tout au même endroit.
        </p>
        <div className="landing-hero-ctas">
          <button className="landing-cta-main" onClick={onStart}>
            Commencer gratuitement →
          </button>
          <button className="landing-cta-ghost" onClick={onPricing}>
            Voir les offres Pro
          </button>
        </div>
        <p className="landing-hero-hint">Gratuit · Sans carte bancaire · Accès immédiat</p>
      </section>

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
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="landing-pricing">
        <h2 className="landing-section-title">Simple et transparent</h2>
        <p className="landing-section-sub">Commence gratuitement, passe Pro quand tu es prêt</p>
        <div className="landing-pricing-cards">

          {/* Gratuit */}
          <div className="landing-plan">
            <div className="landing-plan-name">Gratuit</div>
            <div className="landing-plan-price">
              <span className="plan-amount">0€</span>
              <span className="plan-period">/ toujours</span>
            </div>
            <ul className="landing-plan-features">
              <li>✅ Matchs du jour</li>
              <li>✅ Analyses de base</li>
              <li>✅ Application mobile</li>
              <li>❌ Value bets</li>
              <li>❌ Combos IA</li>
              <li>❌ Suivi de paris cloud</li>
            </ul>
            <button className="landing-plan-btn" onClick={onStart}>
              Commencer gratuitement
            </button>
          </div>

          {/* Pro */}
          <div className="landing-plan landing-plan--pro">
            <div className="landing-plan-badge">Le plus populaire</div>
            <div className="landing-plan-name">Pro</div>
            <div className="landing-plan-price">
              <span className="plan-amount">4,99€</span>
              <span className="plan-period">/ mois</span>
            </div>
            <div className="landing-plan-yearly">ou 39€/an — économise 35%</div>
            <ul className="landing-plan-features">
              <li>✅ Tout le gratuit</li>
              <li>✅ Tous les matchs & ligues</li>
              <li>✅ Value bets en temps réel</li>
              <li>✅ Combos IA optimisés</li>
              <li>✅ Suivi paris synchronisé</li>
              <li>✅ Stats avancées & ROI</li>
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
        <p>Rejoins les parieurs qui utilisent l'IA pour avoir un edge sur les bookmakers.</p>
        <button className="landing-cta-main" onClick={onStart}>
          Accéder à BetWise gratuitement →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p>⚡ BetWise — Paris sportifs assistés par IA</p>
        <p className="landing-footer-legal">
          BetWise est un outil d'aide à la décision. Les paris comportent des risques. Jouez de manière responsable. 18+
        </p>
      </footer>

    </div>
  );
}
