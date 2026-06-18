import { useState } from 'react';
import './PricingModal.css';

const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

const FEATURES = [
  'Tous les matchs & ligues (60+)',
  'Value bets détectés en temps réel',
  'Analyses Dodd illimitées',
  'Générateur de combos optimisés',
  'Suivi de paris synchronisé',
  'Support prioritaire',
];

export default function PricingModal({ onClose, authFetch, isLoggedIn, onOpenAuth, user, refreshUser, openPromo = false }) {
  const [billing, setBilling] = useState('yearly');
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState(null);
  const [showPromo,    setShowPromo]    = useState(openPromo);
  const [promoCode,    setPromoCode]    = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg,     setPromoMsg]     = useState(null); // { type: 'ok'|'err', text }

  const isPro   = user?.role === 'pro' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const isYearly = billing === 'yearly';
  const price    = isYearly ? '39,99€' : '5€';
  const sub      = isYearly ? '/an · soit 3,33€/mois' : '/mois · résiliable à tout moment';
  const plan     = isYearly ? 'yearly' : 'monthly';
  const ctaLabel = isYearly ? 'Commencer — 39,99€/an' : 'Commencer — 5€/mois';

  async function handleSubscribe() {
    if (!isLoggedIn) { onOpenAuth(); return; }
    setLoading('subscribe');
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

  async function handleRedeemPromo() {
    if (!isLoggedIn) { onOpenAuth(); return; }
    const code = promoCode.trim();
    if (!code) { setPromoMsg({ type: 'err', text: 'Entre un code.' }); return; }
    setPromoLoading(true);
    setPromoMsg(null);
    try {
      const res  = await authFetch(`${API}/api/promo/redeem`, {
        method: 'POST',
        body:   JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide');
      const days = data.days ?? 30;
      setPromoMsg({ type: 'ok', text: `🎉 Code validé ! ${days} jours de Pro débloqués.` });
      setPromoCode('');
      await refreshUser?.(); // bascule l'UI en mode Pro
    } catch (err) {
      setPromoMsg({ type: 'err', text: err.message });
    } finally {
      setPromoLoading(false);
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

        {isPro ? (
          <div className="pricing-current">
            <div className="pricing-current-icon"></div>
            <h2>{isAdmin ? 'Compte Admin' : 'Tu es déjà Pro !'}</h2>
            <p>{isAdmin
              ? 'Tu as accès à toutes les fonctionnalités sans restriction.'
              : `Abonnement actif${user?.subscriptionExpiry ? ` jusqu'au ${new Date(user.subscriptionExpiry).toLocaleDateString('fr-FR')}` : ''}`
            }</p>
            {!isAdmin && (
              <button className="btn-cta" onClick={handlePortal} disabled={loading === 'portal'} style={{ marginTop: 20 }}>
                {loading === 'portal' ? 'Chargement…' : 'Gérer mon abonnement'}
              </button>
            )}
            {error && <p className="pricing-error">{error}</p>}
          </div>
        ) : (
          <>
            <div className="pricing-header">
              <div className="pricing-icon"></div>
              <h2>Passe à DoddBet <span className="pro-badge">PRO</span></h2>
              <p>Toutes les analyses, value bets et combos pour maximiser tes gains</p>
            </div>

            <div className="billing-toggle">
              <button
                className={`billing-btn ${billing === 'monthly' ? 'billing-btn--active' : ''}`}
                onClick={() => setBilling('monthly')}
              >
                Mensuel
              </button>
              <button
                className={`billing-btn ${billing === 'yearly' ? 'billing-btn--active' : ''}`}
                onClick={() => setBilling('yearly')}
              >
                Annuel
                <span className="billing-save">−33%</span>
              </button>
            </div>

            <div className="pricing-price-block">
              <span className="pricing-price-amount">{price}</span>
              <span className="pricing-price-sub">{sub}</span>
            </div>

            <ul className="pricing-features">
              {FEATURES.map(f => (
                <li key={f}>
                  <span className="feat-check">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button className="btn-cta" onClick={handleSubscribe} disabled={!!loading}>
              {loading === 'subscribe' ? 'Redirection vers Stripe…' : ctaLabel}
            </button>

            {!isLoggedIn && (
              <p className="pricing-login-hint">
                Déjà un compte ? <button className="pricing-link" onClick={onOpenAuth}>Se connecter</button>
              </p>
            )}

            {error && <p className="pricing-error">{error}</p>}

            <div className="promo-block">
              {!showPromo ? (
                <button className="pricing-link" onClick={() => setShowPromo(true)}>
                  J'ai un code promo
                </button>
              ) : (
                <div className="promo-row">
                  <input
                    className="promo-input"
                    type="text"
                    placeholder="Entre ton code"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRedeemPromo()}
                    autoFocus
                    maxLength={40}
                  />
                  <button className="promo-btn" onClick={handleRedeemPromo} disabled={promoLoading}>
                    {promoLoading ? '…' : 'Valider'}
                  </button>
                </div>
              )}
              {promoMsg && (
                <p className={promoMsg.type === 'ok' ? 'promo-msg promo-msg--ok' : 'promo-msg promo-msg--err'}>
                  {promoMsg.text}
                </p>
              )}
            </div>

            <p className="pricing-legal">
              Paiement sécurisé par Stripe · Remboursement sous 14 jours
            </p>
          </>
        )}
      </div>
    </div>
  );
}
