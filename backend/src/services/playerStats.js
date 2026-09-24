/**
 * Données joueurs, vérifiées contre l'API-Football pour la saison en cours :
 *  - effectif actuel (/players/squads) → aucun joueur parti n'est affiché
 *  - buteurs de la saison (/players?team&season) → noms et buts réels
 *  - rôles "joueur clé" / "danger" en statique (TEAM_META), gardés seulement
 *    si le joueur figure toujours dans l'effectif actuel
 */
import { createApiFootballClient } from './apiFootballClient.js';

const API_KEY = process.env.API_FOOTBALL_KEY;

const client = API_KEY
  ? createApiFootballClient({ timeout: 10_000, priority: 'low' })
  : null;

// teamId → { at, squad: string[], scorers: { topScorer, scorer2, scorer3 } }
// Données encore utilisées après expiration (en attendant le rafraîchissement).
const teamCache    = new Map();
const TEAM_TTL_MS  = 12 * 60 * 60 * 1000;
const inflight     = new Map(); // teamId → Promise (évite les doubles chargements)
// Au premier calcul (cache froid), on attend au plus ce délai : les équipes pas
// encore chargées s'afficheront sans noms de joueurs, puis complètes au calcul suivant.
const WAIT_BUDGET_MS = 10_000;

function posCode(pos) {
  if (!pos) return 'BU';
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper'))                          return 'GK';
  if (p.includes('forward')  || p.includes('attacker')) return 'BU';
  if (p.includes('midfielder'))                          return 'MO';
  if (p.includes('defender'))                            return 'DF';
  return 'BU';
}

// ── Correspondance de noms ("Kylian Mbappé" ↔ "K. Mbappé") ────────────────────
function nameTokens(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z .'-]/g, '').split(/[ .'-]+/)
    .filter(t => t && t !== 'jr' && t !== 'junior');
}

function isInSquad(name, squad) {
  if (!name || !squad?.length) return false;
  const t   = nameTokens(name);
  const sur = t[t.length - 1];
  return squad.some(p => {
    const pt = nameTokens(p);
    if (t.length === 1) return pt.some(x => x.startsWith(t[0]));   // "Pedri", "Raphinha"
    return pt.includes(sur) && (pt.length === 1 || pt[0][0] === t[0][0] || pt.includes(t[0]));
  });
}

// ── Chargement API par équipe ─────────────────────────────────────────────────
async function fetchSquad(teamId) {
  const { data } = await client.get('/players/squads', { params: { team: teamId } });
  return (data?.response?.[0]?.players ?? []).map(p => p.name).filter(Boolean);
}

async function fetchSeasonScorers(teamId, season) {
  const players = [];
  for (let page = 1, total = 1; page <= total && page <= 3; page++) {
    const { data } = await client.get('/players', { params: { team: teamId, season, page } });
    total = data?.paging?.total ?? 1;
    players.push(...(data?.response ?? []));
  }
  return players.map(p => {
    const stats = (p.statistics ?? []).filter(s => s.team?.id === Number(teamId));
    return {
      name:          p.player?.name,
      goals:         stats.reduce((n, s) => n + (s.goals?.total ?? 0), 0),
      matchesPlayed: stats.reduce((n, s) => n + (s.games?.appearences ?? 0), 0),
      pos:           posCode(stats[0]?.games?.position),
    };
  }).filter(p => p.name && p.goals > 0);
}

async function loadTeam(teamId, season) {
  const [squad, scorers] = await Promise.all([
    fetchSquad(teamId),
    fetchSeasonScorers(teamId, season),
  ]);
  // Un buteur de la saison parti depuis (transfert) n'est plus une menace pour ce match
  const current = squad.length ? scorers.filter(p => isInSquad(p.name, squad)) : scorers;
  const ranked  = current.sort((a, b) => b.goals - a.goals || a.matchesPlayed - b.matchesPlayed);
  teamCache.set(Number(teamId), {
    at: Date.now(),
    squad,
    scorers: {
      topScorer: ranked[0] ?? null,
      scorer2:   ranked[1] ?? null,
      scorer3:   ranked[2] ?? null,
    },
  });
}

/**
 * Charge (ou rafraîchit) effectif + buteurs des équipes qui jouent.
 * @param {{ id: number, season: number }[]} teams
 * @returns {Promise<boolean>} true si toutes les équipes sont prêtes
 */
export async function preloadTeamPlayers(teams) {
  if (!client) return true;
  const jobs = [];
  for (const { id, season } of teams) {
    const key    = Number(id);
    const cached = teamCache.get(key);
    if (!key || !season || (cached && Date.now() - cached.at < TEAM_TTL_MS)) continue;
    if (!inflight.has(key)) {
      inflight.set(key, loadTeam(key, season)
        .catch(err => console.warn(`[playerStats] équipe ${key}:`, err.message))
        .finally(() => inflight.delete(key)));
    }
    jobs.push(inflight.get(key));
  }
  if (!jobs.length) return true;
  await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, WAIT_BUDGET_MS))]);
  console.log(`[playerStats] ${teamCache.size} équipes en cache (${inflight.size} encore en chargement)`);
  return inflight.size === 0;
}

// ── Données statiques : style de jeu et rôles ────────────────────────────────
// teamId = ID API-Football (colonne de gauche dans API_FOOTBALL_IDS)
const TEAM_META = {
  // ── Coupe du Monde 2026 — Sélections nationales ──────────────────────────────
  2:    { keyPlayer: { name: 'Désiré Doué',         role: 'Talent offensif émergent' },  dangerMan: { name: 'Kylian Mbappé',      note: 'Finisseur de classe mondiale' },  style: 'Pressing haut, domination technique' },
  6:    { keyPlayer: { name: 'Raphinha',            role: 'Créateur offensif' },  dangerMan: { name: 'Vinicius Jr.',       note: 'Dribbleur électrique côté gauche' },style: 'Samba football, jeu en triangle' },
  26:   { keyPlayer: { name: 'Lionel Messi',        role: 'Légende, créateur' },  dangerMan: { name: 'Julián Álvarez',     note: 'Finisseur explosif' },            style: 'Possession, jeu entre les lignes' },
  9:    { keyPlayer: { name: 'Pedri',               role: 'Meneur technique' },   dangerMan: { name: 'Lamine Yamal',       note: 'Génie précoce, ailier droit' },   style: 'Tiki-taka modernisé, pressing intense' },
  10:   { keyPlayer: { name: 'Jude Bellingham',     role: 'Box-to-box offensif' },dangerMan: { name: 'Harry Kane',         note: 'Meilleur buteur anglais de l\'histoire' },style: 'Direct, physique, efficacité anglaise' },
  25:   { keyPlayer: { name: 'Joshua Kimmich',      role: 'Sentinelle moderne' }, dangerMan: { name: 'Florian Wirtz',      note: 'Milieu offensif le plus en forme' },style: 'Gegenpressing, jeu positionnel' },
  27:   { keyPlayer: { name: 'Bruno Fernandes',     role: 'Capitaine créateur' }, dangerMan: { name: 'Cristiano Ronaldo',  note: 'Buteur insatiable' },             style: 'Efficacité offensive, pressing moyen' },
  16:   { keyPlayer: { name: 'Edson Álvarez',       role: 'Sentinelle, récupérateur' }, dangerMan: { name: 'Santiago Giménez', note: 'Finisseur technique' },          style: 'Bloc médian, transitions rapides' },
  2384: { keyPlayer: { name: 'Christian Pulisic',   role: 'Meneur polyvalent' },  dangerMan: { name: 'Ricardo Pepi',       note: 'Avant-centre montant' },          style: 'Athletic, direct, pression haute' },
  1:    { keyPlayer: { name: 'Kevin De Bruyne',     role: 'Maître à jouer' },     dangerMan: { name: 'Romelu Lukaku',      note: 'Pivot physique dominant' },       style: 'Contre-attaque rapide, qualité individuelle' },
  1118: { keyPlayer: { name: 'Virgil van Dijk',     role: 'Leader défensif' },    dangerMan: { name: 'Cody Gakpo',         note: 'Ailier gauche décisif' },         style: 'Bloc compact, transition directe' },
  31:   { keyPlayer: { name: 'Brahim Díaz',         role: 'Meneur créateur' },    dangerMan: { name: 'Ayoub El Kaabi',     note: 'Finisseur efficace en pivot' },   style: 'Bloc bas, organisation défensive' },
  1569: { keyPlayer: { name: 'Akram Afif',          role: 'Capitaine, meneur' },  dangerMan: { name: 'Almoez Ali',         note: 'Finisseur de surface' },          style: 'Bloc bas, possession patiente' },
  15:   { keyPlayer: { name: 'Granit Xhaka',        role: 'Sentinelle, capitaine' },dangerMan: { name: 'Breel Embolo',     note: 'Pivot physique' },                style: 'Bloc compact, solidité défensive' },
  3:    { keyPlayer: { name: 'Luka Modrić',         role: 'Légende du milieu' },  dangerMan: { name: 'Ivan Perišić',       note: 'Ailier gauche expérimenté' },     style: 'Technique, possession, efficacité' },
  7:    { keyPlayer: { name: 'Federico Valverde',   role: 'Box-to-box intense' }, dangerMan: { name: 'Darwin Núñez',       note: 'Avant-centre athlétique' },       style: 'Pressing intense, solidité défensive' },
  12:   { keyPlayer: { name: 'Wataru Endō',         role: 'Récupérateur' },       dangerMan: { name: 'Takefusa Kubo',      note: 'Dribbleur technique décisif' },   style: 'Organisation rigoureuse, transitions rapides' },
  13:   { keyPlayer: { name: 'Pape Matar Sarr',     role: 'Milieu récupérateur' }, dangerMan: { name: 'Nicolas Jackson',   note: 'Finisseur rapide' },              style: 'Pressing intense, transitions verticales' },
  32:   { keyPlayer: { name: 'Emam Ashour',         role: 'Sentinelle' },          dangerMan: { name: 'Mohamed Salah',     note: 'Ailier de classe mondiale' },     style: 'Bloc bas, danger sur les transitions via Salah' },
  8:    { keyPlayer: { name: 'James Rodríguez',    role: 'Meneur créateur' },     dangerMan: { name: 'Luis Díaz',         note: 'Ailier rapide et technique' },    style: 'Possession, transitions via les ailes' },
  // ── Coupe du Monde 2026 — autres sélections qualifiées (joueurs vérifiés via API) ──
  5: { keyPlayer: { name: 'Yasin Ayari', role: 'Milieu box-to-box' }, dangerMan: { name: 'Viktor Gyökeres', note: 'Buteur prolifique' }, style: 'Bloc médian, danger sur le duo offensif' }, // Suède
  11: { keyPlayer: { name: 'Aníbal Godoy', role: 'Récupérateur, capitaine' }, dangerMan: { name: 'José Fajardo', note: 'Finisseur de surface' }, style: 'Bloc bas, contres rapides' }, // Panama
  17: { keyPlayer: { name: 'Hwang In-Beom', role: 'Meneur de jeu' }, dangerMan: { name: 'Lee Kang-In', note: 'Créateur technique' }, style: 'Pressing intense, transitions rapides' }, // Corée du Sud
  20: { keyPlayer: { name: 'Jackson Irvine', role: 'Box-to-box, capitaine' }, dangerMan: { name: 'Mathew Leckie', note: 'Vitesse en transition' }, style: 'Intensité physique, jeu direct' }, // Australie
  22: { keyPlayer: { name: 'Alireza Jahanbakhsh', role: 'Ailier créateur, capitaine' }, dangerMan: { name: 'Mehdi Ghaedi', note: 'Dribbleur incisif' }, style: 'Bloc compact, solidité défensive' }, // Iran
  23: { keyPlayer: { name: 'Nasser Al-Dawsari', role: 'Milieu créateur' }, dangerMan: { name: 'Firas Al-Buraikan', note: 'Avant-centre mobile' }, style: 'Possession patiente, bloc médian' }, // Arabie Saoudite
  28: { keyPlayer: { name: 'Ellyes Skhiri', role: 'Sentinelle box-to-box' }, dangerMan: { name: 'Seifeddine Tounekti', note: 'Ailier rapide' }, style: 'Bloc bas, organisation rigoureuse' }, // Tunisie
  770: { keyPlayer: { name: 'Lukáš Provod', role: 'Milieu offensif' }, dangerMan: { name: 'Adam Hložek', note: 'Polyvalent offensif' }, style: 'Pressing, jeu direct vers les attaquants' }, // Tchéquie
  775: { keyPlayer: { name: 'Marcel Sabitzer', role: 'Meneur box-to-box' }, dangerMan: { name: 'Marko Arnautović', note: 'Finisseur expérimenté' }, style: 'Gegenpressing, intensité athlétique' }, // Autriche
  777: { keyPlayer: { name: 'Hakan Çalhanoğlu', role: 'Régisseur, capitaine' }, dangerMan: { name: 'Kenan Yıldız', note: 'Talent offensif décisif' }, style: 'Possession, qualité technique' }, // Turquie
  1090: { keyPlayer: { name: 'Sander Berge', role: 'Milieu box-to-box' }, dangerMan: { name: 'Erling Haaland', note: 'Machine à buts' }, style: 'Jeu direct vers Haaland, transitions' }, // Norvège
  1108: { keyPlayer: { name: 'John McGinn', role: 'Box-to-box' }, dangerMan: { name: 'Che Adams', note: 'Finisseur mobile' }, style: 'Pressing agressif, jeu de duels' }, // Écosse
  1113: { keyPlayer: { name: 'Toma Bašić', role: 'Milieu relayeur' }, dangerMan: { name: 'Edin Džeko', note: 'Buteur légendaire' }, style: 'Possession, danger sur Džeko' }, // Bosnie
  1501: { keyPlayer: { name: 'Franck Kessié', role: 'Milieu complet, leader' }, dangerMan: { name: 'Amad Diallo', note: 'Ailier explosif' }, style: 'Pressing, transitions par les ailes' }, // Côte d'Ivoire
  1504: { keyPlayer: { name: 'Thomas Partey', role: 'Sentinelle' }, dangerMan: { name: 'Antoine Semenyo', note: 'Ailier puissant' }, style: 'Bloc médian, transitions verticales' }, // Ghana
  1508: { keyPlayer: { name: 'Gaël Kakuta', role: 'Meneur créateur' }, dangerMan: { name: 'Fiston Mayele', note: 'Finisseur rapide' }, style: 'Transitions, danger sur les ailes' }, // RD Congo
  1531: { keyPlayer: { name: 'Teboho Mokoena', role: 'Milieu box-to-box' }, dangerMan: { name: 'Lyle Foster', note: 'Avant-centre mobile' }, style: 'Possession, pressing coordonné' }, // Afrique du Sud
  1532: { keyPlayer: { name: 'Houssem Aouar', role: 'Meneur créateur' }, dangerMan: { name: 'Mohamed Amoura', note: 'Attaquant rapide et prolifique' }, style: 'Possession, danger via Amoura' }, // Algérie
  1533: { keyPlayer: { name: 'Deroy Duarte', role: 'Milieu créateur' }, dangerMan: { name: 'Jovane Cabral', note: 'Ailier technique' }, style: 'Bloc compact, contres' }, // Cap-Vert
  1548: { keyPlayer: { name: 'Nizar Al-Rashdan', role: 'Milieu relayeur' }, dangerMan: { name: 'Ali Olwan', note: 'Finisseur de surface' }, style: 'Bloc bas, contres organisés' }, // Jordanie
  1567: { keyPlayer: { name: 'Zidane Iqbal', role: 'Milieu technique' }, dangerMan: { name: 'Aymen Hussein', note: 'Avant-centre puissant' }, style: 'Bloc médian, jeu physique' }, // Irak
  1568: { keyPlayer: { name: 'Jaloliddin Masharipov', role: 'Meneur de jeu' }, dangerMan: { name: 'Eldor Shomurodov', note: 'Avant-centre de référence' }, style: 'Possession, transitions verticales' }, // Ouzbékistan
  2380: { keyPlayer: { name: 'Andrés Cubas', role: 'Sentinelle' }, dangerMan: { name: 'Julio Enciso', note: 'Talent offensif décisif' }, style: 'Bloc bas, contres tranchants' }, // Paraguay
  2382: { keyPlayer: { name: 'Moisés Caicedo', role: 'Milieu récupérateur' }, dangerMan: { name: 'Kendry Páez', note: 'Pépite créative' }, style: 'Bloc solide, transitions rapides' }, // Équateur
  2386: { keyPlayer: { name: 'Danley Jean Jacques', role: 'Milieu récupérateur' }, dangerMan: { name: 'Wilfried Isidor', note: 'Avant-centre athlétique' }, style: 'Bloc bas, contres' }, // Haïti
  4673: { keyPlayer: { name: 'Matthew Garbett', role: 'Milieu box-to-box' }, dangerMan: { name: 'Chris Wood', note: 'Buteur de référence' }, style: 'Jeu direct vers Wood, jeu aérien' }, // Nouvelle-Zélande
  5529: { keyPlayer: { name: 'Stephen Eustáquio', role: 'Milieu créateur' }, dangerMan: { name: 'Jonathan David', note: 'Finisseur prolifique' }, style: 'Pressing, transitions vers David' }, // Canada
  5530: { keyPlayer: { name: 'Leandro Bacuna', role: 'Milieu d\'expérience' }, dangerMan: { name: 'Jurgen Locadia', note: 'Avant-centre physique' }, style: 'Bloc compact, contres' }, // Curaçao
  // ── Premier League
  42:  { keyPlayer: { name: 'Martin Ødegaard',     role: 'Meneur de jeu' },     dangerMan: { name: 'Bukayo Saka',          note: 'Dribbleur droit décisif' },    style: 'Possession haute, pressing intensif' },
  50:  { keyPlayer: { name: 'Bernardo Silva',      role: 'Meneur technique' },   dangerMan: { name: 'Erling Haaland',       note: 'Finisseur implacable' },       style: 'Monopole du ballon, transitions rapides' },
  40:  { keyPlayer: { name: 'Alexis Mac Allister', role: 'Box-to-box' },         dangerMan: { name: 'Mohamed Salah',        note: 'Ailier prolifique côté droit' },style: 'Pressing haut, transitions verticales' },
  33:  { keyPlayer: { name: 'Bruno Fernandes',     role: 'Capitaine créateur' }, dangerMan: { name: 'Bruno Fernandes',      note: 'Décisif sur coup franc' },     style: 'Contre-attaque, duels directs' },
  66:  { keyPlayer: { name: 'John McGinn',         role: 'Box-to-box' },         dangerMan: { name: 'Ollie Watkins',        note: 'Avant-centre mobile' },        style: 'Pressing agressif, jeu aérien' },
  49:  { keyPlayer: { name: 'Enzo Fernández',      role: 'Milieu créateur' },    dangerMan: { name: 'Cole Palmer',          note: 'Milieu offensif décisif' },    style: 'Technique, possession en demi-terrain' },
  51:  { keyPlayer: { name: 'Carlos Baleba',       role: 'Récupérateur' },       dangerMan: { name: 'Kaoru Mitoma',         note: 'Dribbleur côté gauche' },      style: 'Jeu positionnel, nombreuses solutions' },
  47:  { keyPlayer: { name: 'James Maddison',      role: 'Meneur' },             dangerMan: { name: 'Mohammed Kudus',       note: 'Ailier polyvalent décisif' },  style: 'Contre-attaque rapide, largeur du terrain' },
  35:  { keyPlayer: { name: 'Ryan Christie',       role: 'Moteur du milieu' },   dangerMan: { name: 'Evanilson',            note: 'Finisseur en pivot' },         style: 'Intensité physique, jeu direct' },
  52:  { keyPlayer: { name: 'Daichi Kamada',       role: 'Meneur technique' },   dangerMan: { name: 'Jean-Philippe Mateta', note: 'Avant-centre puissant' },      style: 'Direct, appui sur les ailiers' },
  36:  { keyPlayer: { name: 'Alex Iwobi',          role: 'Polyvalent' },         dangerMan: { name: 'Rodrigo Muniz',        note: 'Finisseur en pivot' },         style: 'Solide défensivement, efficace en transition' },
  34:  { keyPlayer: { name: 'Bruno Guimarães',     role: 'Milieu dominant' },    dangerMan: { name: 'Nick Woltemade',       note: 'Avant-centre athlétique, recrue phare' },style: 'Pressing haut, jeu direct vers Woltemade' },
  48:  { keyPlayer: { name: 'Lucas Paquetá',       role: 'Milieu technique' },   dangerMan: { name: 'Jarrod Bowen',         note: 'Ailier droit actif' },         style: 'Jeu aérien, duels physiques' },
  // Ligue 1
  85:  { keyPlayer: { name: 'Fabian Ruiz',         role: 'Relanceur créateur' }, dangerMan: { name: 'Bradley Barcola',      note: 'Accélérateur côté gauche' },   style: 'Pressing haut, domination technique' },
  81:  { keyPlayer: { name: 'Geoffrey Kondogbia',  role: 'Récupérateur' },       dangerMan: { name: 'Mason Greenwood',      note: 'Ailier droit technique' },     style: 'Bloc médian, transitions rapides' },
  79:  { keyPlayer: { name: 'Hákon Haraldsson',    role: 'Meneur technique' },   dangerMan: { name: 'Olivier Giroud',       note: 'Finisseur expérimenté' },      style: 'Pressing haut, jeu direct vers Giroud' },
  80:  { keyPlayer: { name: 'Corentin Tolisso',    role: "Milieu d'expérience" },dangerMan: { name: 'Martín Šulc',          note: 'Talent offensif tchèque' },    style: 'Combinaisons courtes, créativité offensive' },
  116: { keyPlayer: { name: 'Adrien Thomasson',    role: 'Milieu créateur' },    dangerMan: { name: 'Florian Sotoca',       note: 'Explosif côté gauche' },       style: 'Pressing intense, bloc collectif' },
  94:  { keyPlayer: { name: 'Valentin Rongier',    role: 'Capitaine récupérateur' },dangerMan: { name: 'Breel Embolo',       note: 'Pivot physique, finisseur' },   style: 'Bloc médian, transitions par les ailes' },
  111: { keyPlayer: { name: 'Lassana Doucouré',    role: 'Milieu récupérateur' },dangerMan: { name: 'Sofiane Boufal',       note: 'Ailier technique' },           style: 'Jeu collectif structuré, transitions' },
  84:  { keyPlayer: { name: 'Hicham Boudaoui',     role: 'Milieu récupérateur' },dangerMan: { name: 'Evann Wahi',           note: 'Avant-centre puissant' },      style: 'Défense solide, coups de pied arrêtés' },
  // La Liga
  541: { keyPlayer: { name: 'Jude Bellingham',     role: 'Box-to-box offensif' },dangerMan: { name: 'Vinicius Jr.',         note: 'Dribbleur explosif côté gauche' },style: 'Contre-attaque fulminante, possession équilibrée' },
  529: { keyPlayer: { name: 'Lamine Yamal',        role: 'Ailier prodige' },     dangerMan: { name: 'Pedri',                note: 'Créateur entre les lignes' },  style: 'Tiki-taka modernisé, haut pressing' },
  530: { keyPlayer: { name: 'Koke',                role: "Capitaine, milieu d'expérience" },dangerMan: { name: 'Antoine Griezmann', note: 'Mobile entre les lignes' },    style: 'Bloc bas, contre-attaques précises' },
  536: { keyPlayer: { name: 'Joan Jordán',         role: 'Box-to-box technique' },dangerMan: { name: 'Chidera Ejuke',        note: 'Ailier gauche rapide' },       style: 'Pressing organisé, jeu de transition' },
  543: { keyPlayer: { name: 'Isco',                role: 'Meneur élégant' },     dangerMan: { name: 'Antony',               note: 'Ailier explosif, dribbleur' },style: 'Possession technique, coups de pied arrêtés' },
  548: { keyPlayer: { name: 'Carlos Soler',        role: 'Milieu créateur' },    dangerMan: { name: 'Mikel Oyarzabal',      note: 'Finisseur technique' },        style: 'Jeu positionnel, pressing coordonné' },
  531: { keyPlayer: { name: 'Nico Williams',       role: 'Ailier gauche explosif' },dangerMan: { name: 'Iñaki Williams',    note: 'Avant-centre physique' },      style: 'Jeu basque, intensité physique' },
  // Bundesliga
  157: { keyPlayer: { name: 'Jamal Musiala',       role: 'Milieu offensif génie' },dangerMan: { name: 'Harry Kane',         note: 'Finisseur de surface' },       style: 'Pressing haut, domination totale' },
  165: { keyPlayer: { name: 'Julian Brandt',       role: 'Meneur technique' },   dangerMan: { name: 'Serhou Guirassy',      note: 'Finisseur puissant' },         style: 'Contre-attaque rapide, largeur du jeu' },
  168: { keyPlayer: { name: 'Aleix García',        role: 'Milieu créateur' },    dangerMan: { name: 'Patrik Schick',       note: 'Finisseur de classe mondiale' },style: 'Gegenpressing, jeu positionnel' },
  173: { keyPlayer: { name: 'Christoph Baumgartner', role: 'Meneur offensif' }, dangerMan: { name: 'Antonio Nusa',          note: 'Ailier rapide et technique' }, style: 'Pressing haut, transitions verticales' },
  // Serie A
  505: { keyPlayer: { name: 'Marcus Thuram',       role: 'Avant-centre complet' },dangerMan: { name: 'Lautaro Martínez',   note: 'Finisseur de surface' },       style: 'Bloc médian solide, transitions rapides' },
  496: { keyPlayer: { name: 'Kenan Yıldız',        role: 'Talent offensif' },    dangerMan: { name: 'Dušan Vlahović',       note: 'Finisseur puissant' },         style: 'Solidité défensive, efficacité balistique' },
  489: { keyPlayer: { name: 'Christian Pulisic',   role: 'Milieu offensif' },    dangerMan: { name: 'Rafael Leão',          note: 'Explosif en sprint' },         style: 'Bloc médian, exploite la vitesse de Leão' },
  492: { keyPlayer: { name: 'Scott McTominay',     role: 'Box-to-box' },         dangerMan: { name: 'Romelu Lukaku',        note: 'Pivot physique dominant' },    style: 'Pressing haut à la Conte, jeu direct' },
  487: { keyPlayer: { name: 'Nicolò Rovella',      role: 'Milieu box-to-box' },  dangerMan: { name: 'Mattia Zaccagni',      note: 'Ailier gauche décisif' },      style: 'Possession, attaque positionnelle' },
  497: { keyPlayer: { name: 'Lorenzo Pellegrini',  role: 'Capitaine créateur' }, dangerMan: { name: 'Paulo Dybala',         note: 'Technique et finesse' },       style: 'Créativité offensive, pressing médian' },
  502: { keyPlayer: { name: 'Albert Gudmundsson',  role: 'Meneur offensif' },    dangerMan: { name: 'Moise Kean',           note: 'Avant-centre puissant' },      style: 'Jeu offensif, possession en demi-terrain' },
  499: { keyPlayer: { name: 'Gianluca Scamacca',   role: 'Avant-centre athlétique' },dangerMan: { name: 'Nikola Krstović', note: 'Avant-centre puissant' },   style: "Gegenpressing à l'italienne, attaque massive" },
};

// Mapping ID API-Football → meta statique (via lookup direct dans TEAM_META)
// Les IDs dans TEAM_META correspondent déjà aux IDs API-Football

/** Retourne style + rôles depuis les données statiques */
function getTeamMeta(apiId) {
  return TEAM_META[Number(apiId)] ?? null;
}

/** Lookup par nom d'équipe (partiel, insensible à la casse) */
const NAME_TO_ID = [
  // Sélections nationales — Coupe du Monde 2026
  ['france', 2], ['équipe de france', 2],
  ['brazil', 6], ['brasil', 6], ['brésil', 6],
  ['argentina', 26], ['argentine', 26],
  ['spain', 9], ['espagne', 9], ['españa', 9],
  ['england', 10], ['angleterre', 10],
  ['germany', 25], ['allemagne', 25], ['deutschland', 25],
  ['portugal', 27],
  ['mexico', 16], ['mexique', 16], ['méxico', 16],
  ['usa', 2384], ['united states', 2384], ['états-unis', 2384],
  ['belgium', 1], ['belgique', 1],
  ['netherlands', 1118], ['pays-bas', 1118], ['holland', 1118],
  ['morocco', 31], ['maroc', 31],
  ['qatar', 1569],
  ['switzerland', 15], ['suisse', 15], ['schweiz', 15],
  ['croatia', 3], ['croatie', 3],
  ['senegal', 13], ['sénégal', 13],
  ['japan', 12], ['japon', 12],
  ['uruguay', 7],
  ['colombia', 8], ['colombie', 8],
  ['sweden', 5], ['suède', 5], ['suede', 5],
  ['panama', 11], ['panamá', 11],
  ['south korea', 17], ['corée du sud', 17], ['coree du sud', 17], ['korea republic', 17],
  ['australia', 20], ['australie', 20],
  ['iran', 22],
  ['saudi arabia', 23], ['arabie saoudite', 23],
  ['tunisia', 28], ['tunisie', 28],
  ['czechia', 770], ['czech republic', 770], ['tchéquie', 770], ['tchequie', 770], ['rép. tchèque', 770],
  ['austria', 775], ['autriche', 775],
  ['türkiye', 777], ['turkey', 777], ['turquie', 777], ['turkiye', 777],
  ['norway', 1090], ['norvège', 1090], ['norvege', 1090],
  ['scotland', 1108], ['écosse', 1108], ['ecosse', 1108],
  ['bosnia', 1113], ['bosnie', 1113], ['bosnia and herzegovina', 1113], ['bosnia & herzegovina', 1113],
  ['ivory coast', 1501], ['côte d\'ivoire', 1501], ['cote d\'ivoire', 1501], ['cote d ivoire', 1501],
  ['ghana', 1504],
  ['congo dr', 1508], ['dr congo', 1508], ['rd congo', 1508], ['congo', 1508],
  ['south africa', 1531], ['afrique du sud', 1531],
  ['algeria', 1532], ['algérie', 1532], ['algerie', 1532],
  ['cape verde', 1533], ['cap-vert', 1533], ['cabo verde', 1533], ['cap vert', 1533],
  ['jordan', 1548], ['jordanie', 1548],
  ['iraq', 1567], ['irak', 1567],
  ['uzbekistan', 1568], ['ouzbékistan', 1568], ['ouzbekistan', 1568],
  ['paraguay', 2380],
  ['ecuador', 2382], ['équateur', 2382], ['equateur', 2382],
  ['haiti', 2386], ['haïti', 2386],
  ['new zealand', 4673], ['nouvelle-zélande', 4673], ['nouvelle zelande', 4673],
  ['canada', 5529],
  ['curacao', 5530], ['curaçao', 5530],
  // Clubs — Premier League
  ['arsenal', 42], ['manchester city', 50], ['man city', 50],
  ['liverpool', 40], ['manchester united', 33], ['man united', 33],
  ['aston villa', 66], ['chelsea', 49], ['brighton', 51],
  ['tottenham', 47], ['spurs', 47], ['bournemouth', 35],
  ['crystal palace', 52], ['fulham', 36], ['newcastle', 34],
  ['west ham', 48],
  ['paris saint-germain', 85], ['psg', 85], ['marseille', 81],
  ['lille', 79], ['lyon', 80], ['lens', 116], ['rennes', 94], ['le havre', 111], ['nice', 84],
  ['real madrid', 541], ['barcelona', 529], ['fc barcelona', 529],
  ['atlético madrid', 530], ['atletico madrid', 530],
  ['sevilla', 536], ['real betis', 543], ['real sociedad', 548],
  ['athletic bilbao', 531], ['athletic club', 531],
  ['bayern', 157], ['dortmund', 165], ['borussia dortmund', 165],
  ['leverkusen', 168], ['bayer leverkusen', 168],
  ['rb leipzig', 173], ['leipzig', 173],
  ['inter milan', 505], ['inter', 505], ['juventus', 496],
  ['ac milan', 489], ['milan', 489], ['napoli', 492],
  ['lazio', 487], ['roma', 497], ['fiorentina', 502], ['atalanta', 499],
];

function resolveIdByName(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  for (const [kw, id] of NAME_TO_ID) {
    if (key.includes(kw) || kw.includes(key)) return id;
  }
  return null;
}

/**
 * Croise les données joueurs avec la liste de blessés/suspendus du match.
 * Marque chaque joueur injured:true si son nom est dans la liste,
 * et remplace le topScorer par le suivant disponible quand c'est possible.
 */
export function applyInjuryFilter(players, injuries, homeId, awayId) {
  if (!injuries?.length || !players) return players;

  // Map teamId → Set<name_lowercase>
  const injuredByTeam = new Map();
  for (const inj of injuries) {
    const tid = String(inj.teamId);
    if (!injuredByTeam.has(tid)) injuredByTeam.set(tid, new Set());
    const name = inj.name?.toLowerCase().trim();
    if (name) injuredByTeam.get(tid).add(name);
  }
  // Fallback global (si teamId non disponible)
  const allInjured = new Set(
    injuries.map(i => i.name?.toLowerCase().trim()).filter(Boolean)
  );

  function isOut(playerName, teamId) {
    if (!playerName) return false;
    const n = playerName.toLowerCase().trim();
    return injuredByTeam.get(String(teamId))?.has(n) || allInjured.has(n);
  }

  function markTeam(team, teamId) {
    if (!team) return null;
    const mark = p => p ? { ...p, injured: isOut(p.name, teamId) } : p;

    // Pour le topScorer : si blessé, chercher le premier disponible parmi scorer2/scorer3
    let effectiveTop = mark(team.topScorer);
    let s2 = mark(team.scorer2);
    let s3 = mark(team.scorer3);
    // Réorganiser : mettre en avant le premier non-blessé
    const ordered = [effectiveTop, s2, s3].filter(Boolean);
    const available = ordered.filter(p => !p.injured);
    const unavailable = ordered.filter(p => p.injured);
    const reordered = [...available, ...unavailable];

    return {
      ...team,
      topScorer: reordered[0] ?? null,
      scorer2:   reordered[1] ?? null,
      scorer3:   reordered[2] ?? null,
      keyPlayer: mark(team.keyPlayer),
      dangerMan: mark(team.dangerMan),
    };
  }

  return {
    home: markTeam(players.home, homeId),
    away: markTeam(players.away, awayId),
  };
}

/** Point d'entrée principal — retourne données des deux équipes */
export function getMatchPlayers(homeId, awayId, homeName, awayName) {
  const hId = Number(homeId) || resolveIdByName(homeName);
  const aId = Number(awayId) || resolveIdByName(awayName);

  const hApiId = hId || resolveIdByName(homeName);
  const aApiId = aId || resolveIdByName(awayName);

  return {
    home: buildTeamPlayers(hApiId, homeName),
    away: buildTeamPlayers(aApiId, awayName),
  };
}

function buildTeamPlayers(apiId, name) {
  const resolvedId = apiId ?? resolveIdByName(name);
  const data       = teamCache.get(Number(resolvedId));
  const meta       = getTeamMeta(resolvedId);

  // Effectif pas encore chargé : on n'affiche aucun nom plutôt qu'un nom non vérifié
  if (!data) return meta?.style ? { style: meta.style } : null;

  const { squad, scorers } = data;
  const keyPlayer = meta?.keyPlayer && isInSquad(meta.keyPlayer.name, squad) ? meta.keyPlayer : null;
  let   dangerMan = meta?.dangerMan && isInSquad(meta.dangerMan.name, squad) ? meta.dangerMan : null;
  // Danger statique parti ou absent → meilleur buteur réel de la saison
  if (!dangerMan && scorers.topScorer) {
    const s = scorers.topScorer;
    dangerMan = { name: s.name, note: `Meilleur buteur de la saison (${s.goals} but${s.goals > 1 ? 's' : ''})` };
  }

  const result = { ...scorers, keyPlayer, dangerMan, style: meta?.style ?? null };
  const hasAny = result.topScorer || keyPlayer || dangerMan || result.style;
  return hasAny ? result : null;
}
