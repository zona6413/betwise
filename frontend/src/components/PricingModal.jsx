import { useState } from 'react';
import './PricingModal.css';

const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

export default function PricingModal({ onClose, authFetch, isLoggedIn, onOpenAuth }) {
  const [loading, setLoading] = useState(null); // 'monthly' | 'yearly'
  const [error,   setError]   = useState(null);

  async function handleSubscribe(plan) {
    if (!isLoggedIn) { onOpenAuth(); return; }
    setLoading(plan);
    setError(null);
    try {
      const res  = await authFetch(`${API}/api/stripe/create-checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      window.location.href = data.url; // redirige vers Stripe Checkout
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pricing-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="pricing-header">
          <h2>Passe à BetWise <span className="pro-badge">PRO</span></h2>
          <p>Accède à toutes les analyses, value bets, combos et statistiques avancées</p>
        </div>

        <div className="pricing-cards">
          {/* Mensuel */}
          <div className="pricing-card">
            <div className="pricing-card-top">
              <span className="pricing-period">Mensuel</span>
              <div className="pricing-price">
                <span className="price-amount">4,99€</span>
                <span className="price-period">/mois</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li>✅ Tous les matchs & ligues</li>
              <li>✅ Analyses IA illimitées</li>
              <li>✅ Value bets en temps réel</li>
              <li>✅ Générateur de combos</li>
              <li>✅ Suivi de paris synchronisé</li>
              <li>✅ Résiliation à tout moment</li>
            </ul>
            <button
              className="btn-subscribe"
              onClick={() => handleSubscribe('monthly')}
              disabled={!!loading}
            >
              {loading === 'monthly' ? 'Redirection…' : 'Commencer — 4,99€/mois'}
            </button>
          </div>

          {/* Annuel */}
          <div className="pricing-card pricing-card--best">
            <div className="pricing-best-badge">Meilleure offre</div>
            <div className="pricing-card-top">
              <span className="pricing-period">Annuel</span>
              <div className="pricing-price">
                <span className="price-amount">39€</span>
                <span className="price-period">/an</span>
              </div>
              <span className="pricing-saving">soit 3,25€/mois — économise 35%</span>
            </div>
            <ul className="pricing-features">
              <li>✅ Tous les avantages Pro</li>
              <li>✅ Priorité sur les nouvelles fonctions</li>
              <li>✅ Support prioritaire</li>
              <li>✅ 2 mois offerts vs mensuel</li>
            </ul>
            <button
              className="btn-subscribe btn-subscribe--best"
              onClick={() => handleSubscribe('yearly')}
              disabled={!!loading}
            >
              {loading === 'yearly' ? 'Redirection…' : 'Commencer — 39€/an'}
            </button>
          </div>
        </div>

        {error && <p className="pricing-error">❌ {error}</p>}

        <p className="pricing-legal">
          Paiement sécurisé par Stripe · Sans engagement pour le mensuel · Remboursement sous 14 jours
        </p>
      </div>
    </div>
  );
}
