import { useState } from 'react';
import './OnboardingTour.css';

// ── Dodd — the football mascot ────────────────────────────────────────────────
function Dodd({ mood = 'happy', size = 72 }) {
  const mouths = {
    happy:   'M26,53 Q37,63 48,53',
    excited: 'M24,51 Q37,67 50,51',
    wink:    'M26,53 Q37,60 48,53',
  };
  const mouth = mouths[mood] ?? mouths.happy;

  return (
    <svg width={size} height={size} viewBox="0 0 76 76" className="dodd-mascot">
      {/* Shadow */}
      <ellipse cx="38" cy="74" rx="22" ry="4" fill="rgba(0,0,0,0.18)" />
      {/* Ball body */}
      <circle cx="38" cy="37" r="35" fill="#fff" stroke="#0f1117" strokeWidth="1.5" />
      {/* Pentagon patches */}
      <path d="M38,4 L50,14 L46,28 L30,28 L26,14Z" fill="#0f1117" />
      <path d="M7,27 L16,20 L30,28 L26,43 L11,44Z" fill="#0f1117" />
      <path d="M69,27 L60,20 L46,28 L50,43 L65,44Z" fill="#0f1117" />
      <path d="M15,59 L11,44 L26,43 L33,55 L23,65Z" fill="#0f1117" />
      <path d="M61,59 L65,44 L50,43 L43,55 L53,65Z" fill="#0f1117" />
      {/* Eyes — white sclera */}
      <circle cx="29" cy="33" r="5.5" fill="white" stroke="#0f1117" strokeWidth="0.8" />
      {mood === 'wink' ? (
        <path d="M24,33 L34,33" stroke="#0f1117" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <circle cx="45" cy="33" r="5.5" fill="white" stroke="#0f1117" strokeWidth="0.8" />
      )}
      {/* Pupils */}
      <circle cx="30" cy="34" r="3" fill="#0f1117" />
      {mood !== 'wink' && <circle cx="46" cy="34" r="3" fill="#0f1117" />}
      {/* Eye shine */}
      <circle cx="31" cy="32.5" r="1.1" fill="white" />
      {mood !== 'wink' && <circle cx="47" cy="32.5" r="1.1" fill="white" />}
      {/* Mouth */}
      <path d={mouth} stroke="#0f1117" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Little arms */}
      <line x1="5" y1="38" x2="16" y2="32" stroke="#0f1117" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="71" y1="38" x2="60" y2="32" stroke="#0f1117" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Per-step illustrations ────────────────────────────────────────────────────
function IllWelcome() {
  return (
    <div className="ill ill-welcome">
      <Dodd mood="excited" size={100} />
      <div className="ill-sparkles">
        {[0, 1, 2, 3, 4].map(i => (
          <svg key={i} className="ill-spark" style={{ animationDelay: `${i * 0.18}s` }}
            width="14" height="14" viewBox="0 0 14 14">
            <path d="M7,0 L8,6 L14,7 L8,8 L7,14 L6,8 L0,7 L6,6Z" fill="#eab308" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function IllOdds() {
  return (
    <div className="ill ill-odds">
      <div className="ill-odds-row">
        <div className="ill-odds-chip">10 €<span className="ill-odds-chip-sub">mise</span></div>
        <span className="ill-odds-op">×</span>
        <div className="ill-odds-chip ill-odds-chip--gold">2.00<span className="ill-odds-chip-sub">cote</span></div>
        <span className="ill-odds-op">=</span>
        <div className="ill-odds-chip ill-odds-chip--green">20 €<span className="ill-odds-chip-sub">retour</span></div>
      </div>
      <div className="ill-odds-profit">+10 € de bénéfice net</div>
    </div>
  );
}

function IllBtts() {
  return (
    <div className="ill ill-btts">
      <div className="ill-goal-pair">
        <div className="ill-goal-net">
          <svg viewBox="0 0 56 38" width="72" height="48">
            <rect x="2" y="2" width="52" height="34" rx="2" fill="none" stroke="#eab308" strokeWidth="2" />
            <line x1="9" y1="2" x2="9" y2="36" stroke="#eab308" strokeWidth="0.8" strokeDasharray="3,3" />
            <circle cx="28" cy="19" r="9" fill="#eab308" />
            <path d="M25,19 L28,14 L31,19 L28,23Z" fill="rgba(0,0,0,0.25)" />
          </svg>
          <span className="ill-goal-label">Equipe A</span>
        </div>
        <span className="ill-btts-amp">&amp;</span>
        <div className="ill-goal-net">
          <svg viewBox="0 0 56 38" width="72" height="48">
            <rect x="2" y="2" width="52" height="34" rx="2" fill="none" stroke="#00d68f" strokeWidth="2" />
            <line x1="9" y1="2" x2="9" y2="36" stroke="#00d68f" strokeWidth="0.8" strokeDasharray="3,3" />
            <circle cx="28" cy="19" r="9" fill="#00d68f" />
            <path d="M25,19 L28,14 L31,19 L28,23Z" fill="rgba(0,0,0,0.25)" />
          </svg>
          <span className="ill-goal-label" style={{ color: '#00d68f' }}>Equipe B</span>
        </div>
      </div>
      <div className="ill-btts-tag">Les deux doivent marquer</div>
    </div>
  );
}

function IllOU() {
  return (
    <div className="ill ill-ou">
      <div className="ill-ou-cols">
        <div className="ill-ou-col">
          <div className="ill-ou-score green">2 — 1</div>
          <div className="ill-ou-row"><span className="ill-ou-badge win">+1.5</span><span>Gagné (3 buts)</span></div>
          <div className="ill-ou-row"><span className="ill-ou-badge win">+2.5</span><span>Gagné (3 buts)</span></div>
        </div>
        <div className="ill-ou-divider" />
        <div className="ill-ou-col">
          <div className="ill-ou-score dim">1 — 0</div>
          <div className="ill-ou-row"><span className="ill-ou-badge lose">+1.5</span><span>Perdu (1 but)</span></div>
          <div className="ill-ou-row"><span className="ill-ou-badge win">-1.5</span><span>Gagné (1 but)</span></div>
        </div>
      </div>
    </div>
  );
}

function IllDC() {
  const boxes = [
    { label: '1', sub: 'Domicile', active: true },
    { label: 'X', sub: 'Nul',      active: true },
    { label: '2', sub: 'Extérieur', active: false },
  ];
  return (
    <div className="ill ill-dc">
      <div className="ill-dc-label">Double chance 1X :</div>
      <div className="ill-dc-row">
        {boxes.map(b => (
          <div key={b.label} className={`ill-dc-box ${b.active ? 'ill-dc-box--on' : 'ill-dc-box--off'}`}>
            <span className="ill-dc-result">{b.label}</span>
            <span className="ill-dc-sub">{b.sub}</span>
            {b.active && <span className="ill-dc-tick">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function IllValue() {
  return (
    <div className="ill ill-value">
      <div className="ill-value-rows">
        <div className="ill-value-row">
          <span className="ill-value-name">Bookmaker</span>
          <div className="ill-value-track">
            <div className="ill-value-fill ill-value-fill--bk" style={{ width: '45%' }} />
          </div>
          <span className="ill-value-pct">45%</span>
        </div>
        <div className="ill-value-row">
          <span className="ill-value-name ill-value-name--ai">Dodd</span>
          <div className="ill-value-track">
            <div className="ill-value-fill ill-value-fill--ai" style={{ width: '62%' }} />
          </div>
          <span className="ill-value-pct ill-value-pct--ai">62%</span>
        </div>
      </div>
      <div className="ill-value-badge">+17% d'avantage — Value Bet !</div>
    </div>
  );
}

function IllAnalysis() {
  return (
    <div className="ill ill-analysis">
      <div className="ill-mini-card">
        <div className="ill-mini-top">
          <span className="ill-mini-league">Premier League</span>
          <span className="ill-mini-value-tag">Value Bet</span>
        </div>
        <div className="ill-mini-teams">Arsenal — Chelsea</div>
        <div className="ill-mini-probs">
          <div className="ill-mini-prob-col">
            <span className="ill-mini-prob-val green">58%</span>
            <span className="ill-mini-prob-lbl">Dodd Domicile</span>
          </div>
          <div className="ill-mini-prob-col">
            <span className="ill-mini-prob-val">21%</span>
            <span className="ill-mini-prob-lbl">Nul</span>
          </div>
          <div className="ill-mini-prob-col">
            <span className="ill-mini-prob-val">21%</span>
            <span className="ill-mini-prob-lbl">Extérieur</span>
          </div>
        </div>
        <div className="ill-mini-form">
          Forme : <span className="form-w">G</span><span className="form-w">G</span>
          <span className="form-d">N</span><span className="form-w">G</span>
          <span className="form-l">P</span>
        </div>
      </div>
    </div>
  );
}

function IllBankroll() {
  return (
    <div className="ill ill-bankroll">
      <div className="ill-bankroll-dial">
        <svg viewBox="0 0 100 60" width="140" height="84">
          {/* Arc de fond */}
          <path d="M10,55 A45,45 0 0,1 90,55" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
          {/* Arc 5% en or */}
          <path d="M10,55 A45,45 0 0,1 22,20" fill="none" stroke="#eab308" strokeWidth="8" strokeLinecap="round" />
          {/* Centre */}
          <text x="50" y="42" textAnchor="middle" fontSize="13" fontWeight="800" fill="#eab308" fontFamily="system-ui">5%</text>
          <text x="50" y="56" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="system-ui">MAX PAR PARI</text>
        </svg>
      </div>
      <div className="ill-bankroll-row">
        <div className="ill-bankroll-chip">
          <span className="ill-bankroll-num">200 €</span>
          <span className="ill-bankroll-lbl">Bankroll</span>
        </div>
        <span className="ill-bankroll-arrow">→</span>
        <div className="ill-bankroll-chip ill-bankroll-chip--gold">
          <span className="ill-bankroll-num">10 €</span>
          <span className="ill-bankroll-lbl">mise max</span>
        </div>
      </div>
    </div>
  );
}

function IllReady() {
  return (
    <div className="ill ill-ready">
      <div className="ill-ready-ring">
        <Dodd mood="excited" size={88} />
      </div>
      <div className="ill-ready-sparks">
        {[0, 1, 2, 3].map(i => (
          <svg key={i} className="ill-spark ill-spark--ready"
            style={{ animationDelay: `${i * 0.22}s` }}
            width="16" height="16" viewBox="0 0 14 14">
            <path d="M7,0 L8,6 L14,7 L8,8 L7,14 L6,8 L0,7 L6,6Z" fill="#eab308" />
          </svg>
        ))}
      </div>
    </div>
  );
}

// ── Steps definition ──────────────────────────────────────────────────────────
const STEPS = [
  {
    mood:  'excited',
    title: 'Salut, je suis Dodd !',
    text:  "Je suis Dodd, l'intelligence qui analyse les matchs pour toi. Je vais t'expliquer les paris sportifs et te montrer comment tirer le meilleur de mes analyses. C'est parti !",
    Ill:   IllWelcome,
  },
  {
    mood:  'happy',
    title: 'Les cotes — la base',
    text:  "Une cote est un multiplicateur appliqué à ta mise. Cote 2.00 sur 10 € = 20 € si tu gagnes. Plus la cote est haute, plus le pari est risqué et moins probable.",
    Ill:   IllOdds,
  },
  {
    mood:  'happy',
    title: 'BTTS — Les deux équipes marquent',
    text:  "Both Teams To Score. Les DEUX équipes doivent marquer au moins 1 but. Score 1-0 → perdu. Score 1-1 ou 2-1 → gagné ! Parfait pour les matchs offensifs.",
    Ill:   IllBtts,
  },
  {
    mood:  'happy',
    title: 'Plus / Moins de buts',
    text:  "Tu paries sur le nombre total de buts. +1.5 = au moins 2 buts. +2.5 = au moins 3 buts. -1.5 = au plus 1 but. Simple et très populaire pour les grosses affiches.",
    Ill:   IllOU,
  },
  {
    mood:  'wink',
    title: 'Double chance — moins de risque',
    text:  "Tu couvres 2 résultats sur 3 possibles. 1X = domicile gagne OU nul. X2 = nul OU extérieur. 12 = l'un des deux gagne. Cotes plus basses, mais beaucoup plus sûr.",
    Ill:   IllDC,
  },
  {
    mood:  'excited',
    title: "Value Bet — l'avantage caché",
    text:  "Quand Dodd estime qu'un résultat est plus probable que ce que le bookmaker propose, c'est un Value Bet. C'est là que se trouvent les vraies opportunités sur le long terme.",
    Ill:   IllValue,
  },
  {
    mood:  'happy',
    title: "Zone d'analyse",
    text:  "Chaque carte de match affiche les probabilités que Dodd a calculées, la forme récente des équipes, les joueurs blessés et les paris recommandés. Tout est analysé en temps réel.",
    Ill:   IllAnalysis,
  },
  {
    mood:  'wink',
    title: 'Gère ta bankroll',
    text:  "Ta bankroll = ton capital de jeu. Règle d'or : ne mise jamais plus de 5% sur un seul pari. Avec 200 €, max 10 € par pari. Tu survivras aux séries négatives.",
    Ill:   IllBankroll,
  },
  {
    mood:  'excited',
    title: "Tu es prêt !",
    text:  "Explore les matchs du jour, suis les recommandations de Dodd et enregistre tes paris dans l'onglet Mes paris pour suivre ton évolution. Parie responsable.",
    Ill:   IllReady,
  },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  function finish() {
    try { localStorage.setItem('betwise_tour_v1', '1'); } catch {}
    onClose();
  }

  return (
    <div className="tour-backdrop" onClick={e => e.target === e.currentTarget && finish()}>
      <div className="tour-card">

        {/* Close */}
        <button className="tour-close" onClick={finish} aria-label="Fermer">✕</button>

        {/* Illustration */}
        <div className="tour-ill-zone">
          <current.Ill />
        </div>

        {/* Progress dots */}
        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`tour-dot ${i === step ? 'tour-dot--active' : i < step ? 'tour-dot--done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Étape ${i + 1}`}
            />
          ))}
        </div>

        {/* Mascot + text */}
        <div className="tour-body">
          <div className="tour-mascot-wrap">
            <Dodd mood={current.mood} size={64} />
          </div>
          <div className="tour-text">
            <div className="tour-title">{current.title}</div>
            <div className="tour-desc">{current.text}</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="tour-nav">
          <button className="tour-skip" onClick={finish}>
            Passer
          </button>
          <div className="tour-nav-right">
            {step > 0 && (
              <button className="tour-prev" onClick={() => setStep(s => s - 1)}>
                Précédent
              </button>
            )}
            {isLast ? (
              <button className="tour-next tour-next--finish" onClick={finish}>
                Commencer
              </button>
            ) : (
              <button className="tour-next" onClick={() => setStep(s => s + 1)}>
                Suivant
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
