import './LegalFooter.css';

export default function LegalFooter({ onOpenLegal }) {
  return (
    <footer className="legal-footer">
      <div className="legal-footer-inner">

        <div className="legal-row legal-row--top">
          <span className="legal-18">18+</span>
          <span className="legal-sep">·</span>
          <span>Jeu responsable</span>
          <span className="legal-sep">·</span>
          <a href="tel:0974751313" className="legal-link">
            Joueurs Info Service : 09 74 75 13 13
          </a>
        </div>

        <p className="legal-disclaimer">
          BetWise est un outil d'analyse statistique à titre informatif uniquement.
          Les probabilités affichées ne constituent pas des conseils financiers.
          Le jeu comporte des risques de dépendance — jouez de manière responsable.
          Interdit aux personnes de moins de 18 ans.
        </p>

        <div className="legal-links-row">
          <button className="legal-page-link" onClick={() => onOpenLegal?.('mentions')}>
            Mentions légales
          </button>
          <span className="legal-sep">·</span>
          <button className="legal-page-link" onClick={() => onOpenLegal?.('cgu')}>
            CGU
          </button>
          <span className="legal-sep">·</span>
          <button className="legal-page-link" onClick={() => onOpenLegal?.('confidentialite')}>
            Confidentialité
          </button>
          <span className="legal-sep">·</span>
          <button className="legal-page-link" onClick={() => onOpenLegal?.('jeu')}>
            Jeu responsable
          </button>
        </div>

        <p className="legal-disclaimer">
          © {new Date().getFullYear()} BetWise · Toutes les données sportives sont
          fournies à titre indicatif. Les résultats passés ne préjugent pas des
          résultats futurs.
        </p>

      </div>
    </footer>
  );
}
