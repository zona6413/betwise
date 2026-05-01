/**
 * Fusion des données API-Football ↔ TheOddsAPI.
 *
 * Les deux APIs utilisent des noms d'équipes différents
 * (ex: "Manchester United" vs "Man United" vs "Manchester Utd").
 * On utilise un matching fuzzy sur le nom normalisé.
 */

// ── Normalisation des noms ──────────────────────────────────────────────────────

const STOP_WORDS = /\b(fc|ac|sc|rc|asc|ssc|ogc|as|us|ud|cd|cf|sk|bv|vfl|vfb|sv|fsv|rb|rcd|afc|bsc|osc|hsv|tsv|lsk|if)\b/gi;

/** Nettoie un nom d'équipe pour la comparaison. */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(STOP_WORDS, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Calcule un score de similarité entre deux noms normalisés (0–1). */
function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Premier mot significatif identique
  const wa = na.split(' ').find(w => w.length > 3);
  const wb = nb.split(' ').find(w => w.length > 3);
  if (wa && wb && wa === wb) return 0.70;

  return 0;
}

// ── Matching fixture ↔ odds ─────────────────────────────────────────────────────

function findOddsMatch(fixture, oddsData) {
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;

  let best = null;
  let bestScore = 0;

  for (const odd of oddsData) {
    const scoreHome = similarity(home, odd.home_team);
    const scoreAway = similarity(away, odd.away_team);
    const total = (scoreHome + scoreAway) / 2;
    if (total > bestScore && total >= 0.6) {
      bestScore = total;
      best = odd;
    }
  }

  return best;
}

/** Extrait les cotes home/draw/away depuis l'objet bookmaker. */
function extractOdds(fixture, odds) {
  if (!odds?.bookmakers?.length) return { homeOdd: null, drawOdd: null, awayOdd: null, bookmaker: null };

  const bm    = odds.bookmakers[0];
  const mkt   = bm.markets?.find(m => m.key === 'h2h');
  if (!mkt) return { homeOdd: null, drawOdd: null, awayOdd: null, bookmaker: bm.title };

  let homeOdd = null, drawOdd = null, awayOdd = null;

  for (const outcome of mkt.outcomes) {
    const simHome = similarity(outcome.name, fixture.teams.home.name);
    const simAway = similarity(outcome.name, fixture.teams.away.name);
    const isDraw  = /draw|nul|x\b/i.test(outcome.name);

    if (isDraw) {
      drawOdd = outcome.price;
    } else if (simHome > simAway && simHome >= 0.5) {
      homeOdd = outcome.price;
    } else if (simAway > simHome && simAway >= 0.5) {
      awayOdd = outcome.price;
    }
  }

  return { homeOdd, drawOdd, awayOdd, bookmaker: bm.title };
}

// ── Export principal ────────────────────────────────────────────────────────────

/**
 * Fusionne la liste de fixtures avec les données de cotes.
 * @returns {Array<{ fixture, homeOdd, drawOdd, awayOdd, bookmaker, hasOdds }>}
 */
export function mergeData(fixtures, oddsData) {
  return fixtures.map(fixture => {
    const odds = findOddsMatch(fixture, oddsData);
    const { homeOdd, drawOdd, awayOdd, bookmaker } = extractOdds(fixture, odds);

    return {
      fixture,
      homeOdd,
      drawOdd,
      awayOdd,
      bookmaker,
      hasOdds: !!(homeOdd && drawOdd && awayOdd),
    };
  });
}
