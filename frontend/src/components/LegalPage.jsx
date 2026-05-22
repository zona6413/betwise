import { useState } from 'react';
import './LegalPage.css';

const TABS = [
  { id: 'mentions',       label: 'Mentions légales' },
  { id: 'cgu',            label: 'CGU' },
  { id: 'confidentialite',label: 'Confidentialité' },
  { id: 'jeu',            label: 'Jeu responsable' },
];

export default function LegalPage({ initialTab = 'mentions', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="legal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="legal-page">

        <div className="legal-page-header">
          <div className="legal-page-brand">DoddBet — Informations légales</div>
          <button className="legal-page-close" onClick={onClose} aria-label="Fermer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="legal-page-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`legal-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        <div className="legal-page-body">

          {/* ── MENTIONS LÉGALES ── */}
          {activeTab === 'mentions' && (
            <div className="legal-content">
              <h1>Mentions légales</h1>
              <p className="legal-date">En vigueur au 16 mai 2026</p>

              <h2>1. Éditeur du site</h2>
              <p>
                Le site <strong>DoddBet</strong> (accessible à l'adresse <strong>doddbet.com</strong>)
                est édité par :<br/><br/>
                <strong>Noah — Entrepreneur individuel</strong><br/>
                Statut : Auto-entrepreneur<br/>
                Activité : Édition de logiciels et services numériques<br/>
                Contact : <a href="mailto:contact@doddbet.com">contact@doddbet.com</a>
              </p>

              <h2>2. Directeur de la publication</h2>
              <p>Le directeur de la publication est Noah, en qualité d'éditeur du service.</p>

              <h2>3. Hébergement</h2>
              <p>
                <strong>Frontend :</strong><br/>
                Netlify, Inc.<br/>
                44 Montgomery Street, Suite 300, San Francisco, CA 94104, USA<br/>
                <a href="https://www.netlify.com" target="_blank" rel="noreferrer">www.netlify.com</a>
                <br/><br/>
                <strong>Backend / API :</strong><br/>
                Render Services, Inc.<br/>
                San Francisco, CA, USA<br/>
                <a href="https://render.com" target="_blank" rel="noreferrer">render.com</a>
                <br/><br/>
                <strong>Base de données :</strong><br/>
                MongoDB, Inc. — MongoDB Atlas (région EU West)<br/>
                <a href="https://www.mongodb.com" target="_blank" rel="noreferrer">www.mongodb.com</a>
              </p>

              <h2>4. Paiement</h2>
              <p>
                Les paiements sont traités par <strong>Stripe, Inc.</strong><br/>
                510 Townsend Street, San Francisco, CA 94103, USA<br/>
                Certifié PCI DSS niveau 1 — DoddBet ne stocke aucune donnée bancaire.<br/>
                <a href="https://stripe.com/fr" target="_blank" rel="noreferrer">stripe.com/fr</a>
              </p>

              <h2>5. Propriété intellectuelle</h2>
              <p>
                L'ensemble du contenu du site (textes, analyses, algorithmes, interface graphique, marque « DoddBet »)
                est la propriété exclusive de l'éditeur et est protégé par les lois françaises et
                internationales relatives au droit d'auteur et à la propriété intellectuelle.
                Toute reproduction partielle ou totale est interdite sans autorisation écrite préalable.
              </p>

              <h2>6. Données sportives</h2>
              <p>
                Les données sportives (cotes, statistiques, résultats) sont fournies par
                des tiers (API-Football, The Odds API) à titre indicatif.
                DoddBet ne garantit pas leur exactitude en temps réel.
              </p>

              <h2>7. Contact</h2>
              <p>
                Pour toute question relative aux mentions légales :<br/>
                <a href="mailto:contact@doddbet.com">contact@doddbet.com</a>
              </p>
            </div>
          )}

          {/* ── CGU ── */}
          {activeTab === 'cgu' && (
            <div className="legal-content">
              <h1>Conditions Générales d'Utilisation</h1>
              <p className="legal-date">Version en vigueur au 16 mai 2026</p>

              <h2>1. Objet</h2>
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et
                l'utilisation du service DoddBet, plateforme d'analyse statistique de paris sportifs.
                Toute utilisation du service implique l'acceptation pleine et entière des présentes CGU.
              </p>

              <h2>2. Description du service</h2>
              <p>
                DoddBet est un <strong>outil d'aide à la décision</strong> qui fournit :
              </p>
              <ul>
                <li>Des analyses statistiques de matchs de football basées sur des modèles mathématiques (Poisson, Dixon-Coles)</li>
                <li>Des probabilités calculées par intelligence artificielle</li>
                <li>Des suggestions de paris à titre informatif uniquement</li>
                <li>Un outil de suivi personnel de paris</li>
              </ul>
              <p>
                <strong>DoddBet n'est pas un opérateur de paris agréé.</strong> Le service ne prend
                aucun pari et ne gère aucune mise financière. Aucune des informations fournies
                ne constitue un conseil financier, fiscal ou d'investissement.
              </p>

              <h2>3. Conditions d'accès</h2>
              <p>
                L'accès au service est réservé aux personnes :<br/>
                — Âgées de <strong>18 ans ou plus</strong><br/>
                — Résidant dans un pays où la consultation d'analyses de paris sportifs est légale<br/>
                — Ayant accepté les présentes CGU
              </p>
              <p>
                En créant un compte, l'utilisateur certifie sur l'honneur avoir 18 ans ou plus.
                DoddBet se réserve le droit de suspendre tout compte dont l'utilisateur
                serait mineur.
              </p>

              <h2>4. Comptes utilisateurs</h2>
              <p>
                L'utilisateur est responsable de la confidentialité de ses identifiants.
                Toute utilisation du compte est réputée effectuée par son titulaire.
                En cas de compromission, l'utilisateur doit contacter immédiatement DoddBet
                à <a href="mailto:contact@doddbet.com">contact@doddbet.com</a>.
              </p>
              <p>
                DoddBet se réserve le droit de suspendre ou supprimer tout compte en cas de :
                violation des CGU, usage abusif, tentative de contournement des restrictions d'accès,
                fraude ou impersonation.
              </p>

              <h2>5. Offres et tarifs</h2>
              <p>
                DoddBet propose deux niveaux d'accès :
              </p>
              <ul>
                <li><strong>Gratuit</strong> : accès aux matchs du jour et aux analyses de base</li>
                <li><strong>Pro — 4,99€/mois ou 39€/an</strong> : accès complet à toutes les fonctionnalités
                  (value bets, combos IA, suivi de paris synchronisé, toutes les ligues)</li>
              </ul>
              <p>
                Les tarifs sont affichés TTC. DoddBet se réserve le droit de modifier ses tarifs
                avec un préavis de <strong>30 jours</strong> par email. Les abonnements en cours
                ne sont pas affectés jusqu'à leur renouvellement.
              </p>

              <h2>6. Paiement et renouvellement</h2>
              <p>
                Les paiements sont traités par <strong>Stripe</strong>. L'abonnement est renouvelé
                automatiquement à chaque échéance (mensuelle ou annuelle). L'utilisateur peut
                annuler à tout moment depuis son espace client ou via le portail de gestion
                accessible dans l'application. L'annulation prend effet à la fin de la période
                en cours (pas de remboursement prorata sauf cas légaux).
              </p>
              <p>
                Conformément à l'article L.221-18 du Code de la consommation, l'utilisateur dispose
                d'un <strong>droit de rétractation de 14 jours</strong> à compter de la souscription
                pour les nouvelles souscriptions. Ce droit ne s'applique pas aux renouvellements.
                Pour exercer ce droit : <a href="mailto:contact@doddbet.com">contact@doddbet.com</a>.
              </p>

              <h2>7. Absence de garantie de gains</h2>
              <p>
                <strong>Les analyses fournies par DoddBet ne garantissent aucun gain.</strong>
                Les performances passées du modèle ne préjugent pas des résultats futurs.
                Les paris sportifs comportent un risque de perte en capital. L'utilisateur
                assume seul la responsabilité de ses décisions de jeu.
              </p>
              <p>
                DoddBet ne saurait être tenu responsable des pertes financières résultant
                de l'utilisation de ses analyses, quelle que soit leur nature.
              </p>

              <h2>8. Limitation de responsabilité</h2>
              <p>
                DoddBet ne garantit pas la disponibilité continue du service (maintenance,
                pannes, mises à jour). En cas d'indisponibilité prolongée (supérieure à 72h
                consécutives), l'abonnement pourra être prolongé d'autant, sur demande.
              </p>
              <p>
                L'exactitude des données sportives dépend de fournisseurs tiers.
                DoddBet n'est pas responsable des erreurs ou retards de ces fournisseurs.
              </p>

              <h2>9. Propriété intellectuelle</h2>
              <p>
                Tous les éléments du service (algorithmes, modèles, interface, textes, marque)
                sont protégés par le droit d'auteur. Il est interdit de copier, reproduire,
                modifier, distribuer ou revendre tout ou partie du service sans autorisation écrite.
              </p>

              <h2>10. Modification des CGU</h2>
              <p>
                DoddBet se réserve le droit de modifier les présentes CGU à tout moment.
                Les utilisateurs seront informés par email au moins <strong>15 jours avant</strong>
                l'entrée en vigueur des nouvelles CGU. La poursuite de l'utilisation du service
                vaut acceptation des nouvelles CGU.
              </p>

              <h2>11. Résiliation</h2>
              <p>
                L'utilisateur peut supprimer son compte à tout moment en contactant
                <a href="mailto:contact@doddbet.com"> contact@doddbet.com</a>.
                La suppression entraîne la perte de toutes les données associées (historique de paris,
                paramètres) dans un délai de 30 jours.
              </p>

              <h2>12. Droit applicable</h2>
              <p>
                Les présentes CGU sont soumises au droit français.
                En cas de litige, une solution amiable sera recherchée en priorité.
                À défaut, les tribunaux français compétents seront saisis.
                Pour tout litige de consommation, l'utilisateur peut recourir à la médiation
                via la plateforme européenne de règlement en ligne des litiges :
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer"> ec.europa.eu/consumers/odr</a>.
              </p>
            </div>
          )}

          {/* ── POLITIQUE DE CONFIDENTIALITÉ ── */}
          {activeTab === 'confidentialite' && (
            <div className="legal-content">
              <h1>Politique de confidentialité</h1>
              <p className="legal-date">
                Conforme au Règlement Général sur la Protection des Données (RGPD — UE 2016/679)<br/>
                En vigueur au 16 mai 2026
              </p>

              <h2>1. Responsable du traitement</h2>
              <p>
                Le responsable du traitement des données personnelles est :<br/><br/>
                <strong>Noah — DoddBet</strong><br/>
                Contact : <a href="mailto:contact@doddbet.com">contact@doddbet.com</a>
              </p>

              <h2>2. Données collectées</h2>
              <p>DoddBet collecte uniquement les données strictement nécessaires au fonctionnement du service :</p>
              <ul>
                <li><strong>À l'inscription</strong> : adresse email, mot de passe (hashé en bcrypt — jamais stocké en clair), pseudo (optionnel)</li>
                <li><strong>À l'abonnement</strong> : les données de paiement sont gérées exclusivement par Stripe — DoddBet ne voit ni ne stocke vos numéros de carte</li>
                <li><strong>En cours d'utilisation</strong> : historique de paris enregistrés volontairement, rôle et statut d'abonnement</li>
                <li><strong>Techniques</strong> : logs serveur (adresse IP, date/heure des requêtes, user-agent) conservés 30 jours à des fins de sécurité</li>
              </ul>

              <h2>3. Finalité et base légale</h2>
              <div className="legal-table">
                <div className="legal-table-row legal-table-header">
                  <span>Finalité</span>
                  <span>Base légale</span>
                </div>
                <div className="legal-table-row">
                  <span>Création et gestion du compte</span>
                  <span>Exécution du contrat (Art. 6.1.b RGPD)</span>
                </div>
                <div className="legal-table-row">
                  <span>Traitement des paiements</span>
                  <span>Exécution du contrat (Art. 6.1.b RGPD)</span>
                </div>
                <div className="legal-table-row">
                  <span>Envoi d'emails transactionnels (confirmation, reçu)</span>
                  <span>Exécution du contrat (Art. 6.1.b RGPD)</span>
                </div>
                <div className="legal-table-row">
                  <span>Sécurité et lutte contre la fraude</span>
                  <span>Intérêt légitime (Art. 6.1.f RGPD)</span>
                </div>
                <div className="legal-table-row">
                  <span>Amélioration du service (analyses anonymisées)</span>
                  <span>Intérêt légitime (Art. 6.1.f RGPD)</span>
                </div>
              </div>

              <h2>4. Durée de conservation</h2>
              <ul>
                <li><strong>Compte actif</strong> : données conservées pendant toute la durée de vie du compte</li>
                <li><strong>Après suppression du compte</strong> : suppression effective dans les 30 jours, sauf obligations légales</li>
                <li><strong>Données de facturation</strong> : conservées 10 ans (obligation comptable française)</li>
                <li><strong>Logs serveur</strong> : 30 jours glissants</li>
              </ul>

              <h2>5. Destinataires des données</h2>
              <p>Vos données sont partagées uniquement avec :</p>
              <ul>
                <li><strong>Stripe</strong> — traitement des paiements (politique : <a href="https://stripe.com/fr/privacy" target="_blank" rel="noreferrer">stripe.com/fr/privacy</a>)</li>
                <li><strong>MongoDB Atlas</strong> — hébergement de la base de données (UE)</li>
                <li><strong>Render.com</strong> — hébergement du serveur applicatif (USA — Privacy Shield)</li>
                <li><strong>Netlify</strong> — hébergement du frontend (USA — Privacy Shield)</li>
              </ul>
              <p>DoddBet ne vend, ne loue et ne cède jamais vos données à des tiers à des fins commerciales.</p>

              <h2>6. Vos droits (RGPD)</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul>
                <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
                <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
                <li><strong>Droit à l'effacement</strong> (« droit à l'oubli ») : demander la suppression de vos données</li>
                <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
                <li><strong>Droit à la limitation</strong> : limiter temporairement le traitement</li>
              </ul>
              <p>
                Pour exercer ces droits : <a href="mailto:contact@doddbet.com">contact@doddbet.com</a><br/>
                Délai de réponse : 30 jours maximum.<br/>
                En cas de réponse insatisfaisante, vous pouvez saisir la <strong>CNIL</strong> :
                <a href="https://www.cnil.fr" target="_blank" rel="noreferrer"> cnil.fr</a>
              </p>

              <h2>7. Cookies</h2>
              <p>
                DoddBet utilise uniquement des cookies <strong>strictement nécessaires</strong>
                au fonctionnement du service (token de session en localStorage). Aucun cookie
                publicitaire, de tracking tiers ou d'analyse comportementale n'est utilisé.
                Aucun consentement supplémentaire n'est requis pour ces cookies essentiels
                (Art. 82 de la loi Informatique et Libertés).
              </p>

              <h2>8. Sécurité</h2>
              <p>
                DoddBet met en œuvre les mesures techniques suivantes pour protéger vos données :
              </p>
              <ul>
                <li>Mots de passe hashés avec <strong>bcrypt</strong> (facteur de coût 10)</li>
                <li>Communications chiffrées via <strong>HTTPS/TLS</strong></li>
                <li>Authentification par <strong>JWT</strong> (tokens signés)</li>
                <li>Accès à la base de données restreint au serveur applicatif uniquement</li>
              </ul>

              <h2>9. Transferts hors UE</h2>
              <p>
                Certains prestataires (Render, Netlify, Stripe) sont basés aux États-Unis.
                Ces transferts sont encadrés par des Clauses Contractuelles Types (CCT) approuvées
                par la Commission européenne, conformément à l'Art. 46 RGPD.
              </p>

              <h2>10. Contact</h2>
              <p>
                Pour toute question relative à la protection de vos données :<br/>
                <a href="mailto:contact@doddbet.com">contact@doddbet.com</a><br/>
                Objet : « Protection des données — [votre demande] »
              </p>
            </div>
          )}

          {/* ── JEU RESPONSABLE ── */}
          {activeTab === 'jeu' && (
            <div className="legal-content">
              <h1>Jeu responsable</h1>

              <div className="legal-warning-box">
                <div className="legal-warning-title">Avertissement important</div>
                <p>
                  Les paris sportifs comportent des risques de dépendance et de pertes financières.
                  DoddBet est un outil d'aide à la décision — <strong>les analyses ne garantissent aucun gain.</strong>
                  Ne misez jamais plus que ce que vous pouvez vous permettre de perdre.
                </p>
              </div>

              <h2>Aide et soutien</h2>
              <p>Si vous ou un proche êtes concerné par des problèmes de jeu :</p>

              <div className="legal-help-card">
                <div className="legal-help-title">Joueurs Info Service</div>
                <div className="legal-help-num">09 74 75 13 13</div>
                <div className="legal-help-desc">Numéro national d'aide — Gratuit, confidentiel, 7j/7</div>
                <a href="https://www.joueurs-info-service.fr" target="_blank" rel="noreferrer" className="legal-help-link">
                  joueurs-info-service.fr
                </a>
              </div>

              <div className="legal-help-card">
                <div className="legal-help-title">Évaluer sa pratique</div>
                <div className="legal-help-desc">
                  L'Autorité Nationale des Jeux (ANJ) propose des outils d'auto-évaluation
                  pour mieux comprendre votre rapport au jeu.
                </div>
                <a href="https://www.anj.fr" target="_blank" rel="noreferrer" className="legal-help-link">
                  anj.fr
                </a>
              </div>

              <h2>Signaux d'alerte</h2>
              <ul>
                <li>Miser pour récupérer des pertes (chasing losses)</li>
                <li>Cacher ses activités de jeu à ses proches</li>
                <li>Miser de l'argent destiné aux dépenses essentielles</li>
                <li>Penser au jeu de manière obsessionnelle</li>
                <li>Continuer à jouer malgré des pertes répétées</li>
              </ul>

              <h2>Nos engagements</h2>
              <ul>
                <li>DoddBet est strictement <strong>interdit aux mineurs de moins de 18 ans</strong></li>
                <li>Aucune publicité ciblant les populations vulnérables</li>
                <li>Rappel systématique des risques dans l'interface</li>
                <li>Les analyses sont présentées comme des <strong>probabilités, jamais des certitudes</strong></li>
              </ul>

              <h2>Jeu en France</h2>
              <p>
                En France, les paris sportifs en ligne sont régulés par l'<strong>Autorité Nationale des Jeux (ANJ)</strong>.
                Seuls les opérateurs agréés par l'ANJ sont autorisés à prendre des paris.
                DoddBet n'est pas un opérateur de paris — nous fournissons uniquement des analyses statistiques.
              </p>
              <p>
                Pour connaître les opérateurs légaux agréés en France :
                <a href="https://www.anj.fr/operateurs-agrees" target="_blank" rel="noreferrer"> anj.fr/operateurs-agrees</a>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
