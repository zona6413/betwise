import './PaymentSuccessModal.css';

export default function PaymentSuccessModal({ user, onClose }) {
  return (
    <div className="psm-overlay" onClick={onClose}>
      <div className="psm-card" onClick={e => e.stopPropagation()}>

        {/* Icon */}
        <div className="psm-icon">🎉</div>

        {/* Titre */}
        <h2 className="psm-title">Bienvenue dans DoddBet Pro !</h2>
        <p className="psm-sub">
          {user?.username ? `Félicitations ${user.username}` : 'Félicitations'} — ton abonnement est actif.
          Un reçu a été envoyé à <strong>{user?.email}</strong>.
        </p>

        {/* Features débloquées */}
        <div className="psm-features">
          <div className="psm-feature">
            <span className="psm-feature-icon">📊</span>
            <span>Tous les matchs &amp; ligues débloqués</span>
          </div>
          <div className="psm-feature">
            <span className="psm-feature-icon">🎯</span>
            <span>Value bets &amp; analyses IA illimitées</span>
          </div>
          <div className="psm-feature">
            <span className="psm-feature-icon">🔀</span>
            <span>Générateur de combos optimisés</span>
          </div>
          <div className="psm-feature">
            <span className="psm-feature-icon">📈</span>
            <span>Suivi de tes paris avec statistiques</span>
          </div>
        </div>

        <button className="psm-btn" onClick={onClose}>
          Accéder à mes analyses →
        </button>

        <p className="psm-legal">18+ · Jeu responsable · Outil à titre informatif uniquement</p>
      </div>
    </div>
  );
}
