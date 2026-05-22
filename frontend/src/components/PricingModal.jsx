import { useState } from 'react';
import './PricingModal.css';

const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

export default function PricingModal({ onClose, authFetch, isLoggedIn, onOpenAuth, user }) {
  const [loading, setLoading] = useState(null); // 'monthly' | 'yearly' | 'portal'
  const [error,   setError]   = useState(null);

  const isPro   = user?.role === 'pro' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  async function handleSubscribe(plan) {
    if (!isLoggedIn) { onOpenAuth(); return; }
    setLoading(plan);
    setError(null);
    try {
      const res  = await authFetch(`${API}/api/stripe/create-checkout`, {
        method: 'POST',
        body:   JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading('portal');
    setError(null);
    try {
      const res  = await authFetch(`${API}/api/stripe/portal`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pricing-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* ── Déjà Pro / Admin ── */}
        {isPro ? (
          <div className="pricing-current">
            <div className="pricing-current-icon">{isAdmin ? '👑' : '⚡'}</div>
            <h2>{isAdmin ? 'Compte Admin' : 'Tu es déjà Pro !'}</h2>
            <p>{isAdmin
              ? 'Tu as accès à toutes les fonctionnalités sans restriction.'
              : `Abonnement actif${user?.subscriptionExpiry ? ` jusqu'au ${new Date(user.subscriptionExpiry).toLocaleDateString('fr-FR')}` : ''}`
            }</p>
            {!isAdmin && (
              <button
                className="btn-subscribe btn-subscribe--best"
                onClick={handlePortal}
                disabled={loading === 'portal'}
                style={{ marginTop: 16 }}
              >
                {loading === 'portal' ? 'Chargement…' : '⚙ Gérer mon abonnement'}
              </button>
            )}
            {error && <p className="pricing-error">❌ {error}</p>}
          </div>
        ) : (
          <>
            <div className="pricing-header">
              <h2>Passe à DoddBet <span className="pro-badge">PRO</span></h2>
              <p>Accède à toutes les analyses, value bets, combos et statistiques avancées</p>
            </div>

            <div className="pricing-cards">
              {/* Gratuit */}
              <div className="pricing-card pricing-card--free">
                <div className="pricing-card-top">
                  <span className="pricing-period">Gratuit</span>
                  <div className="pricing-price">
                    <span className="price-amount">0€</span>
                    <span className="price-period">/toujours</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>✅ 3 picks du jour sélectionnés par l'IA</li>
                  <li>❌ Accès à tous les matchs</li>
                  <li>❌ Analyses IA détaillées</li>
                  <li>❌ Value bets en temps réel</li>
                  <li>❌ Générateur de combos</li>
                  <li>❌ Suivi de paris</li>
                </ul>
                <button className="btn-subscribe btn-subscribe--free" disabled>
                  Plan actuel
                </button>
              </div>

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
                  <li>✅ Priorité nouvelles fonctions</li>
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

            {!isLoggedIn && (
              <p className="pricing-login-hint">
                Déjà un compte ? <button className="pricing-link" onClick={onOpenAuth}>Se connecter</button>
              </p>
            )}

            {error && <p className="pricing-error">❌ {error}</p>}

            <p className="pricing-legal">
              Paiement sécurisé par Stripe · Sans engagement pour le mensuel · Remboursement sous 14 jours
            </p>
          </>
        )}
      </div>
    </div>
  );
}
