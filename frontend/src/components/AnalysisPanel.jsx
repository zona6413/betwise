import { useEffect } from 'react';
import BetTiers from './BetTiers.jsx';
import './AnalysisPanel.css';

/**
 * Panneau latéral d'analyse d'un match.
 * S'ouvre en overlay depuis le bouton "Analyser" sur la carte.
 */
export default function AnalysisPanel({ match, onClose }) {
  // Fermeture avec Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Bloquer le scroll du body pendant l'ouverture
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!match) return null;

  const { homeTeam, awayTeam, odds, bets, tieredBets, analysis, league, leagueCountry } = match;

  // Meilleur pari (EV max positif)
  const bestBet = bets
    ?.filter(b => b.ev > 0)
    .sort((a, b) => b.ev - a.ev)[0] ?? null;

  // Lignes de l'analyse textuelle
  const lines = analysis?.split('\n') ?? [];

  return (
    <>
      {/* Overlay */}
      <div className="panel-overlay" onClick={onClose} aria-hidden="true" />

      {/* Panneau */}
      <aside className="analysis-panel animate-slide" role="dialog" aria-modal="true" aria-label="Analyse du match">

        {/* Header */}
        <div className="panel-header">
          <div>
            <div className="panel-league">
              {flagFor(leagueCountry)} {league}
            </div>
            <h2 className="panel-title">
              {homeTeam.name} <span>vs</span> {awayTeam.name}
            </h2>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Contenu scrollable */}
        <div className="panel-body">

          {/* 3 niveaux de paris */}
          {tieredBets && (
            <section className="panel-section">
              <h3 className="section-title">Paris recommandés — 3 niveaux</h3>
              <BetTiers tieredBets={tieredBets} />
            </section>
          )}

          {/* Formes récentes */}
          <section className="panel-section">
            <h3 className="section-title">Forme récente</h3>
            <div className="form-comparison">
              <FormRow team={homeTeam} side="Domicile" />
              <FormRow team={awayTeam} side="Extérieur" />
            </div>
          </section>

          {/* Probabilités */}
          {bets && (
            <section className="panel-section">
              <h3 className="section-title">Probabilités</h3>
              <div className="probs-table">
                <div className="probs-header">
                  <span>Issue</span>
                  <span>Cote</span>
                  <span>Bookmaker</span>
                  <span>IA</span>
                  <span>Edge</span>
                </div>
                {bets.map(bet => (
                  <div key={bet.outcome} className={`probs-row ${bet.isValue ? 'probs-row--value' : ''}`}>
                    <span className="probs-outcome">{bet.outcome}</span>
                    <span className="probs-odd">{bet.odd?.toFixed(2)}</span>
                    <span>{(bet.bmProb * 100).toFixed(1)}%</span>
                    <span className="probs-ai">{(bet.aiProb * 100).toFixed(1)}%</span>
                    <span className={`probs-edge ${bet.edge > 0 ? 'edge-pos' : 'edge-neg'}`}>
                      {bet.edge > 0 ? '+' : ''}{(bet.edge * 100).toFixed(1)}pts
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Meilleur pari */}
          {bestBet && (
            <section className="panel-section">
              <h3 className="section-title">Recommandation</h3>
              <div className="best-bet">
                <div className="best-bet-label">Meilleur pari détecté</div>
                <div className="best-bet-outcome">{bestBet.outcome}</div>
                <div className="best-bet-details">
                  <div className="best-bet-stat">
                    <span>Cote</span>
                    <strong>{bestBet.odd?.toFixed(2)}</strong>
                  </div>
                  <div className="best-bet-stat">
                    <span>EV</span>
                    <strong className="text-green">+{(bestBet.ev * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="best-bet-stat">
                    <span>Edge</span>
                    <strong className="text-green">+{(bestBet.edge * 100).toFixed(1)}pts</strong>
                  </div>
                  <div className="best-bet-stat">
                    <span>Proba IA</span>
                    <strong>{(bestBet.aiProb * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Analyse textuelle */}
          {lines.length > 0 && (
            <section className="panel-section">
              <h3 className="section-title">Analyse</h3>
              <div className="analysis-text">
                {lines.map((line, i) => (
                  <p key={i} className="analysis-line">{line}</p>
                ))}
              </div>
            </section>
          )}

          {/* Disclaimer */}
          <p className="panel-disclaimer">
            ⚠️ Cette analyse est générée automatiquement à titre informatif.
            Elle ne constitue pas un conseil financier. Pariez de façon responsable.
          </p>
        </div>
      </aside>
    </>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────────

function FormRow({ team, side }) {
  const chars = (team.form ?? '').toUpperCase().split('').slice(-5);
  return (
    <div className="form-row">
      <div className="form-row-info">
        <span className="form-side">{side}</span>
        <span className="form-team">{team.name}</span>
        {team.position && <span className="form-pos">{team.position}ᵉ</span>}
      </div>
      <div className="form-dots-lg">
        {chars.map((c, i) => (
          <span key={i} className={`form-dot-lg ${c === 'W' ? 'fdot--w' : c === 'D' ? 'fdot--d' : 'fdot--l'}`}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function flagFor(country) {
  const f = { France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Germany: '🇩🇪', Italy: '🇮🇹' };
  return f[country] ?? '🌍';
}
