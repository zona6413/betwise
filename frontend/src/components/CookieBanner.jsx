import { useState, useEffect } from 'react';
import './CookieBanner.css';

const COOKIE_KEY = 'bw_cookie_consent';

export function useCookieConsent() {
  return localStorage.getItem(COOKIE_KEY); // null | 'essential' | 'all'
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [detail,  setDetail]  = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      // Délai court pour ne pas bloquer le premier rendu
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept(choice) {
    localStorage.setItem(COOKIE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Consentement cookies" aria-modal="true">
      <div className="cookie-inner">

        {!detail ? (
          /* ── Vue principale ── */
          <>
            <div className="cookie-top">
              <div className="cookie-icon">🍪</div>
              <div className="cookie-text">
                <p className="cookie-title">Cookies & confidentialité</p>
                <p className="cookie-desc">
                  Nous utilisons uniquement des cookies <strong>essentiels</strong> au fonctionnement de l'application (session, préférences).
                  Aucun tracker publicitaire.
                </p>
              </div>
            </div>

            <div className="cookie-actions">
              <button className="cookie-btn cookie-btn--ghost" onClick={() => setDetail(true)}>
                Personnaliser
              </button>
              <button className="cookie-btn cookie-btn--accept" onClick={() => accept('essential')}>
                Accepter les essentiels
              </button>
            </div>
          </>
        ) : (
          /* ── Vue détaillée ── */
          <>
            <p className="cookie-title" style={{ marginBottom: 12 }}>Gestion des cookies</p>

            <div className="cookie-category">
              <div className="cookie-cat-header">
                <span className="cookie-cat-name">Cookies essentiels</span>
                <span className="cookie-toggle cookie-toggle--on">Toujours actif</span>
              </div>
              <p className="cookie-cat-desc">Authentification, session utilisateur, préférences d'affichage. Indispensables au fonctionnement de BetWise.</p>
            </div>

            <div className="cookie-category">
              <div className="cookie-cat-header">
                <span className="cookie-cat-name">Analytics (désactivé)</span>
                <span className="cookie-toggle cookie-toggle--off">Inactif</span>
              </div>
              <p className="cookie-cat-desc">BetWise ne collecte pas de données analytiques tierces. Aucun Google Analytics, Meta Pixel ou tracker publicitaire.</p>
            </div>

            <div className="cookie-actions">
              <button className="cookie-btn cookie-btn--ghost" onClick={() => setDetail(false)}>
                Retour
              </button>
              <button className="cookie-btn cookie-btn--accept" onClick={() => accept('essential')}>
                Confirmer
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
