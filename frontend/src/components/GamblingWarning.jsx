import { useState } from 'react';
import './GamblingWarning.css';

const KEY = 'betwise_warning_v1';

export function shouldShowWarning() {
  try { return !localStorage.getItem(KEY); }
  catch { return true; }
}

export default function GamblingWarning({ onClose }) {
  const [dontShow, setDontShow] = useState(false);

  function handleClose() {
    if (dontShow) {
      try { localStorage.setItem(KEY, '1'); } catch {}
    }
    onClose();
  }

  return (
    <div className="gw-overlay">
      <div className="gw-modal">
        <div className="gw-icon">⚠️</div>

        <h2 className="gw-title">Jeu responsable</h2>

        <p className="gw-body">
          Les paris sportifs peuvent créer une <strong>dépendance</strong>.
          Jouez de manière responsable — ne misez que ce que vous pouvez vous
          permettre de perdre.
        </p>

        <ul className="gw-list">
          <li>Interdit aux mineurs de moins de 18 ans</li>
          <li>BetWise est un outil d'aide à la décision, pas un conseil financier</li>
          <li>Aucun système ne garantit des gains</li>
        </ul>

        <a
          className="gw-helpline"
          href="tel:0974751313"
          onClick={e => e.stopPropagation()}
        >
          <span className="gw-helpline-icon">📞</span>
          <span>
            <strong>Joueurs Info Service</strong>
            <small>09 74 75 13 13 — gratuit, anonyme, 7j/7</small>
          </span>
        </a>

        <label className="gw-checkbox">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={e => setDontShow(e.target.checked)}
          />
          Ne plus afficher ce message
        </label>

        <button className="gw-btn" onClick={handleClose}>
          J'ai compris — accéder au site
        </button>
      </div>
    </div>
  );
}
