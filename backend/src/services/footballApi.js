/**
 * Service API-Football v3 (api-football.com)
 * Clé via variable d'environnement API_FOOTBALL_KEY
 * Fallback sur mock si clé absente
 */
import axios from 'axios';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;

// Saison courante : 2025 = saison 2025-2026
const SEASON = 2025;

// Compétitions affichées — uniquement ce qui est disponible sur les grands bookmakers (Winamax, Betclic, etc.)
// Pas de U19, réserves, D4, ligues obscures.
const LEAGUES = [
  // ── Compétitions mondiales & internationales ─────────────────────────────────
  { id: 1,   displayName: 'Coupe du Monde FIFA',      country: 'World'         },
  { id: 9,   displayName: 'Copa América',             country: 'World'         },
  { id: 4,   displayName: 'Championnat d\'Europe',    country: 'Europe'        },
  { id: 5,   displayName: 'Ligue des Nations',        country: 'Europe'        },
  { id: 6,   displayName: 'CAN',                      country: 'Africa'        },
  { id: 17,  displayName: 'Coupe d\'Asie AFC',        country: 'Asia'          },
  { id: 30,  displayName: 'Gold Cup CONCACAF',        country: 'World'         },
  { id: 10,  displayName: 'Amicaux Internationaux',   country: 'World'         },
  { id: 15,  displayName: 'Coupe du Monde des Clubs', country: 'World'         },

  // ── UEFA – Coupes européennes ────────────────────────────────────────────────
  { id: 2,   displayName: 'Champions League',         country: 'Europe'        },
  { id: 3,   displayName: 'Europa League',            country: 'Europe'        },
  { id: 848, displayName: 'Conference League',        country: 'Europe'        },
  { id: 531, displayName: 'UEFA Super Cup',           country: 'Europe'        },
  { id: 667, displayName: 'Amicaux de clubs',         country: 'World'         },

  // ── France ──────────────────────────────────────────────────────────────────
  { id: 61,  displayName: 'Ligue 1',                  country: 'France'        },
  { id: 62,  displayName: 'Ligue 2',                  country: 'France'        },
  { id: 66,  displayName: 'Coupe de France',          country: 'France'        },
  { id: 526, displayName: 'Trophée des Champions',    country: 'France'        },

  // ── Angleterre ──────────────────────────────────────────────────────────────
  { id: 39,  displayName: 'Premier League',           country: 'England'       },
  { id: 40,  displayName: 'Championship',             country: 'England'       },
  { id: 45,  displayName: 'FA Cup',                   country: 'England'       },
  { id: 48,  displayName: 'EFL Cup',                  country: 'England'       },
  { id: 528, displayName: 'Community Shield',         country: 'England'       },

  // ── Espagne ─────────────────────────────────────────────────────────────────
  { id: 140, displayName: 'La Liga',                  country: 'Spain'         },
  { id: 141, displayName: 'La Liga 2',                country: 'Spain'         },
  { id: 143, displayName: 'Copa del Rey',             country: 'Spain'         },
  { id: 556, displayName: 'Supercopa de España',      country: 'Spain'         },

  // ── Allemagne ───────────────────────────────────────────────────────────────
  { id: 78,  displayName: 'Bundesliga',               country: 'Germany'       },
  { id: 79,  displayName: '2. Bundesliga',            country: 'Germany'       },
  { id: 81,  displayName: 'DFB-Pokal',                country: 'Germany'       },
  { id: 529, displayName: 'DFL Supercup',             country: 'Germany'       },

  // ── Italie ──────────────────────────────────────────────────────────────────
  { id: 135, displayName: 'Serie A',                  country: 'Italy'         },
  { id: 136, displayName: 'Serie B',                  country: 'Italy'         },
  { id: 137, displayName: 'Coppa Italia',             country: 'Italy'         },
  { id: 547, displayName: 'Supercoppa Italiana',      country: 'Italy'         },

  // ── Pays-Bas ─────────────────────────────────────────────────────────────────
  { id: 88,  displayName: 'Eredivisie',               country: 'Netherlands'   },
  { id: 89,  displayName: 'Eerste Divisie',           country: 'Netherlands'   },
  { id: 680, displayName: 'KNVB Beker',               country: 'Netherlands'   },

  // ── Portugal ─────────────────────────────────────────────────────────────────
  { id: 94,  displayName: 'Primeira Liga',            country: 'Portugal'      },
  { id: 96,  displayName: 'Liga Portugal 2',          country: 'Portugal'      },
  { id: 95,  displayName: 'Taça de Portugal',         country: 'Portugal'      },

  // ── Belgique ─────────────────────────────────────────────────────────────────
  { id: 144, displayName: 'Jupiler Pro League',       country: 'Belgium'       },
  { id: 145, displayName: 'Coupe de Belgique',        country: 'Belgium'       },

  // ── Écosse ───────────────────────────────────────────────────────────────────
  { id: 179, displayName: 'Scottish Premiership',     country: 'Scotland'      },
  { id: 190, displayName: 'Scottish FA Cup',          country: 'Scotland'      },

  // ── Turquie ───────────────────────────────────────────────────────────────────
  { id: 203, displayName: 'Süper Lig',                country: 'Turkey'        },
  { id: 204, displayName: 'Coupe de Turquie',         country: 'Turkey'        },

  // ── Autres ligues européennes majeures ───────────────────────────────────────
  { id: 197, displayName: 'Super League',             country: 'Greece'        },
  { id: 207, displayName: 'Swiss Super League',       country: 'Switzerland'   },
  { id: 218, displayName: 'Bundesliga Austria',       country: 'Austria'       },
  { id: 119, displayName: 'Superliga',                country: 'Denmark'       },
  { id: 103, displayName: 'Eliteserien',              country: 'Norway'        },
  { id: 113, displayName: 'Allsvenskan',              country: 'Sweden'        },
  { id: 244, displayName: 'Veikkausliiga',            country: 'Finland'       },
  { id: 246, displayName: 'Suomen Cup',               country: 'Finland'       },
  { id: 329, displayName: 'Meistriliiga',             country: 'Estonia'       },
  { id: 106, displayName: 'Ekstraklasa',              country: 'Poland'        },
  { id: 210, displayName: 'HNL',                      country: 'Croatia'       },
  { id: 345, displayName: 'Czech Liga',               country: 'Czech Republic'},
  { id: 333, displayName: 'Premier League Ukraine',   country: 'Ukraine'       },

  // ── Asie & Moyen-Orient ──────────────────────────────────────────────────────
  { id: 98,  displayName: 'J1 League',                country: 'Japan'         },
  { id: 292, displayName: 'K League 1',               country: 'South Korea'   },
  { id: 307, displayName: 'Saudi Pro League',         country: 'Saudi Arabia'  },
  { id: 188, displayName: 'A-League',                 country: 'Australia'     },

  // ── Asie (suite) ─────────────────────────────────────────────────────────────
  { id: 169, displayName: 'Super League',             country: 'China'         },

  // ── Angleterre (suite) ───────────────────────────────────────────────────────
  { id: 41,  displayName: 'League One',               country: 'England'       },
  { id: 42,  displayName: 'League Two',               country: 'England'       },

  // ── Amériques ────────────────────────────────────────────────────────────────
  { id: 11,  displayName: 'Copa Libertadores',        country: 'South America' },
  { id: 13,  displayName: 'Copa Sudamericana',        country: 'South America' },
  { id: 71,  displayName: 'Série A Brésil',           country: 'Brazil'        },
  { id: 73,  displayName: 'Copa do Brasil',           country: 'Brazil'        },
  { id: 128, displayName: 'Liga Profesional',         country: 'Argentina'     },
  { id: 253, displayName: 'MLS',                      country: 'USA'           },
  { id: 262, displayName: 'Liga MX',                  country: 'Mexico'        },
  { id: 239, displayName: 'Liga BetPlay',             country: 'Colombia'      },
  { id: 265, displayName: 'Primera División',         country: 'Chile'         },
  { id: 240, displayName: 'LigaPro',                  country: 'Ecuador'       },
];

const LIVE_STATUSES    = new Set(['1H', '2H', 'HT', 'ET', 'P', 'BT']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'INT', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 12_000,
  headers: { 'x-apisports-key': API_KEY },
});

function getParisDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function mapFixture(item) {
  const f = item.fixture;
  const l = item.league;
  const t = item.teams;
  const g = item.goals;
  return {
    fixture: {
      id:     f.id,
      // API-Football inclut le fuseau horaire dans la date — pas besoin d'ajouter 'Z'
      date:   f.date,
      status: { short: f.status.short, elapsed: f.status.elapsed ?? null },
      venue:  { name: f.venue?.name ?? '', city: f.venue?.city ?? '' },
    },
    league: {
      id:      l.id,
      name:    LEAGUE_MAP_DISPLAY.get(l.id)?.displayName ?? l.name,
      country: l.country,
      logo:    l.logo ?? '',
      round:   l.round ?? null,   // ex: "Group Stage - 1", "Round of 16"
      season:  l.season ?? null,
    },
    teams: {
      home: { id: t.home.id, name: t.home.name, logo: t.home.logo ?? '' },
      away: { id: t.away.id, name: t.away.name, logo: t.away.logo ?? '' },
    },
    goals: { home: g.home, away: g.away },
  };
}

// Map id → displayName pour l'affichage.
const LEAGUE_MAP_DISPLAY = new Map(LEAGUES.map(l => [l.id, l]));

// Set des IDs autorisés — seuls ces championnats sont affichés (filtre anti-U19/D4/réserves)
const ALLOWED_LEAGUE_IDS = new Set(LEAGUES.map(l => l.id));

async function fetchAllFixturesForDate(date) {
  // Une seule requête pour toutes les ligues — timezone Paris pour coller aux dates
  try {
    const res = await client.get('/fixtures', {
      params: { date, timezone: 'Europe/Paris' },
    });
    return (res.data?.response ?? []).map(item => mapFixture(item));
  } catch (err) {
    console.warn(`[footballApi] Fetch date ${date}:`, err.message);
    return [];
  }
}

export async function getTodayFixtures() {
  if (!API_KEY) {
    console.error('[footballApi] API_FOOTBALL_KEY absent — aucun match disponible');
    return [];
  }

  try {
    const todayParis    = getParisDateStr(0);
    const tomorrowParis = getParisDateStr(1);

    // 2 requêtes seulement (aujourd'hui + demain)
    const [todayItems, tomorrowItems] = await Promise.all([
      fetchAllFixturesForDate(todayParis),
      fetchAllFixturesForDate(tomorrowParis),
    ]);

    const seen     = new Set();
    const fixtures = [];

    for (const item of [...todayItems, ...tomorrowItems]) {
      if (seen.has(item.fixture.id)) continue;
      seen.add(item.fixture.id);

      // Filtre ligue — on n'affiche que les compétitions référencées dans LEAGUES
      if (!ALLOWED_LEAGUE_IDS.has(item.league.id)) continue;

      const status = item.fixture.status.short;

      // Exclure uniquement les matchs définitivement terminés ou annulés
      if (FINISHED_STATUSES.has(status)) continue;

      if (!LIVE_STATUSES.has(status)) {
        const matchDate = item.fixture.date.split('T')[0];
        if (matchDate !== todayParis && matchDate !== tomorrowParis) continue;
      }

      fixtures.push(item);
    }

    fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    if (!fixtures.length) {
      console.warn('[footballApi] Aucun match disponible aujourd\'hui/demain');
      return [];
    }

    console.log(`[footballApi] ${fixtures.length} matchs pros retenus (U19/D4/réserves filtrés)`);
    return fixtures;

  } catch (err) {
    console.error('[footballApi] Erreur:', err.message);
    return []; // pas de données mock — on retourne vide pour que l'UI affiche "aucun match"
  }
}

export async function getTeamStats() { return null; }

// ── Blessures & suspensions ───────────────────────────────────────────────────
export async function getInjuries(fixtureId) {
  if (!API_KEY) return [];
  try {
    const res = await client.get('/injuries', { params: { fixture: fixtureId } });
    const seen = new Set();
    return (res.data?.response ?? []).reduce((acc, item) => {
      const key = `${item.player.id}_${item.team.id}`;
      if (seen.has(key)) return acc;
      seen.add(key);
      acc.push({
        name:   item.player.name,
        teamId: item.team.id,
        team:   item.team.name,
        type:   item.type === 'Yellow Cards' ? 'suspended' : 'injury',
        reason: item.reason ?? item.type ?? 'Blessure',
      });
      return acc;
    }, []);
  } catch {
    return [];
  }
}

// ── Face-à-face ───────────────────────────────────────────────────────────────
export async function getHeadToHead(homeId, awayId, last = 10) {
  if (!API_KEY) return null;
  try {
    const res = await client.get('/fixtures/headtohead', {
      params: { h2h: `${homeId}-${awayId}`, last, timezone: 'Europe/Paris' },
    });
    const fixtures = (res.data?.response ?? []).filter(f => f.fixture.status.short === 'FT');
    if (!fixtures.length) return null;

    let homeWins = 0, awayWins = 0, draws = 0, totalGoals = 0;
    const recent = [];

    for (const f of fixtures.slice(0, 6)) {
      const gh = f.goals.home ?? 0;
      const ga = f.goals.away ?? 0;
      const hId = f.teams.home.id;
      const winner = gh > ga ? hId : ga > gh ? f.teams.away.id : null;
      if (winner === homeId) homeWins++;
      else if (winner === awayId) awayWins++;
      else draws++;
      totalGoals += gh + ga;
      recent.push({
        date:  f.fixture.date.split('T')[0],
        home:  f.teams.home.name,
        away:  f.teams.away.name,
        score: `${gh}-${ga}`,
        // qui était la team "home" dans notre contexte
        winner: winner === homeId ? 'home' : winner === awayId ? 'away' : 'draw',
      });
    }

    const n = Math.min(fixtures.length, 6);
    return {
      homeWins,
      awayWins,
      draws,
      total: n,
      avgGoals: +(totalGoals / n).toFixed(1),
      recent,                    // derniers matchs (max 6)
    };
  } catch (err) {
    console.warn('[footballApi] H2H error:', err.message);
    return null;
  }
}

