/**
 * Données joueurs : buteurs récupérés en live via API-Football,
 * style/rôles en statique (changent rarement).
 */
import axios from 'axios';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;
const SEASON   = 2025;

const client = API_KEY
  ? axios.create({ baseURL: BASE_URL, timeout: 10_000, headers: { 'x-apisports-key': API_KEY } })
  : null;

// Cache mémoire : teamId (API-Football) → { topScorer, scorer2, scorer3 }
// TTL 12h — rechargé au démarrage et à chaque nouvelle journée
const scorersCache = new Map();   // teamId → scorers
let   cacheLoadedAt = 0;
const CACHE_TTL_MS  = 12 * 60 * 60 * 1000;

function posCode(pos) {
  if (!pos) return 'BU';
  const p = pos.toLowerCase();
  if (p.includes('forward')  || p.includes('attacker')) return 'BU';
  if (p.includes('midfielder'))                          return 'MO';
  if (p.includes('defender'))                            return 'DF';
  return 'BU';
}

// Ligues principales dont on charge les buteurs
const SCORER_LEAGUES = [1, 39, 61, 140, 135, 78, 2, 3, 848, 88, 94, 144, 179, 203, 197, 207, 218]; // 1 = Coupe du Monde

async function fetchLeagueScorers(leagueId) {
  if (!client) return;
  try {
    const res = await client.get('/players/topscorers', {
      params: { league: leagueId, season: SEASON },
    });
    for (const entry of (res.data?.response ?? [])) {
      const stat   = entry.statistics?.[0];
      if (!stat) continue;
      const teamId = stat.team.id;
      if (!scorersCache.has(teamId)) scorersCache.set(teamId, []);
      scorersCache.get(teamId).push({
        name:          entry.player.name,
        goals:         stat.goals.total ?? 0,
        pos:           posCode(stat.games.position),
        matchesPlayed: stat.games.appearences ?? 1,
      });
    }
  } catch (err) {
    console.warn(`[playerStats] topscorers ligue ${leagueId}:`, err.message);
  }
}

/** Charge les buteurs pour toutes les ligues principales (appelé une fois par démarrage). */
export async function preloadTopScorers() {
  if (!client) return;
  if (Date.now() - cacheLoadedAt < CACHE_TTL_MS) return; // déjà chargé

  scorersCache.clear();
  await Promise.all(SCORER_LEAGUES.map(id => fetchLeagueScorers(id)));
  cacheLoadedAt = Date.now();
  console.log(`[playerStats] ${scorersCache.size} équipes chargées depuis API`);
}

/** Retourne top 3 buteurs depuis la cache API, triés par buts. */
function getApiScorers(teamId) {
  const list = scorersCache.get(Number(teamId));
  if (!list?.length) return null;
  const sorted = [...list].sort((a, b) => b.goals - a.goals);
  return {
    topScorer: sorted[0] ?? null,
    scorer2:   sorted[1] ?? null,
    scorer3:   sorted[2] ?? null,
  };
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
  const scorers    = getApiScorers(resolvedId) ?? getStaticScorers(resolvedId);
  const meta       = getTeamMeta(resolvedId);
  if (!scorers && !meta) return null;
  return { ...scorers, ...meta };
}

// Fallback statique pour les buteurs (si API pas encore chargée ou quota atteint)
const STATIC_SCORERS = {
  // ── Coupe du Monde 2026 — Buteurs des sélections (éliminatoires + LDN) ───────
  2:    { topScorer: { name: 'Kylian Mbappé',        goals: 9,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Ousmane Dembélé',   goals: 6, pos: 'AD', matchesPlayed: 12 }, scorer3: { name: 'Bradley Barcola',   goals: 4, pos: 'AG', matchesPlayed: 11 } },
  6:    { topScorer: { name: 'Vinicius Jr.',          goals: 10, pos: 'AG', matchesPlayed: 12 }, scorer2: { name: 'Raphinha',          goals: 7, pos: 'AD', matchesPlayed: 12 }, scorer3: { name: 'Endrick',            goals: 5, pos: 'BU', matchesPlayed: 10 } },
  26:   { topScorer: { name: 'Lionel Messi',          goals: 8,  pos: 'AT', matchesPlayed: 11 }, scorer2: { name: 'Julián Álvarez',    goals: 7, pos: 'BU', matchesPlayed: 12 }, scorer3: { name: 'Lautaro Martínez',   goals: 6, pos: 'BU', matchesPlayed: 12 } },
  9:    { topScorer: { name: 'Mikel Oyarzabal',       goals: 8,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Lamine Yamal',      goals: 6, pos: 'AD', matchesPlayed: 11 }, scorer3: { name: 'Pedri',              goals: 4, pos: 'MO', matchesPlayed: 12 } },
  10:   { topScorer: { name: 'Harry Kane',            goals: 9,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Jude Bellingham',   goals: 5, pos: 'MO', matchesPlayed: 12 }, scorer3: { name: 'Bukayo Saka',        goals: 4, pos: 'AD', matchesPlayed: 11 } },
  25:   { topScorer: { name: 'Florian Wirtz',         goals: 7,  pos: 'MO', matchesPlayed: 12 }, scorer2: { name: 'Kai Havertz',       goals: 5, pos: 'BU', matchesPlayed: 12 }, scorer3: { name: 'Nick Woltemade',     goals: 4, pos: 'BU', matchesPlayed: 10 } },
  27:   { topScorer: { name: 'Cristiano Ronaldo',     goals: 9,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Bruno Fernandes',   goals: 5, pos: 'MO', matchesPlayed: 12 }, scorer3: { name: 'Pedro Neto',         goals: 4, pos: 'AD', matchesPlayed: 11 } },
  16:   { topScorer: { name: 'Santiago Giménez',      goals: 8,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Raúl Jiménez',      goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Edson Álvarez',      goals: 3, pos: 'MO', matchesPlayed: 12 } },
  2384: { topScorer: { name: 'Christian Pulisic',     goals: 7,  pos: 'AT', matchesPlayed: 12 }, scorer2: { name: 'Ricardo Pepi',      goals: 6, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Folarin Balogun',    goals: 4, pos: 'BU', matchesPlayed: 10 } },
  1:    { topScorer: { name: 'Romelu Lukaku',         goals: 9,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Kevin De Bruyne',   goals: 6, pos: 'MO', matchesPlayed: 10 }, scorer3: { name: 'Dodi Lukébakio',     goals: 4, pos: 'AD', matchesPlayed: 11 } },
  1118: { topScorer: { name: 'Cody Gakpo',            goals: 8,  pos: 'AG', matchesPlayed: 12 }, scorer2: { name: 'Memphis Depay',     goals: 5, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Donyell Malen',      goals: 4, pos: 'AD', matchesPlayed: 11 } },
  31:   { topScorer: { name: 'Ayoub El Kaabi',        goals: 7,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Brahim Díaz',       goals: 4, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'Abde Ezzalzouli',    goals: 3, pos: 'AG', matchesPlayed: 10 } },
  1569: { topScorer: { name: 'Almoez Ali',            goals: 6,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Akram Afif',        goals: 5, pos: 'AT', matchesPlayed: 12 }, scorer3: { name: 'Hassan Al-Haydos',   goals: 2, pos: 'MO', matchesPlayed: 11 } },
  15:   { topScorer: { name: 'Breel Embolo',          goals: 6,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Dan Ndoye',         goals: 5, pos: 'AT', matchesPlayed: 12 }, scorer3: { name: 'Ruben Vargas',       goals: 3, pos: 'AG', matchesPlayed: 11 } },
  3:    { topScorer: { name: 'Andrej Kramarić',       goals: 7,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Ivan Perišić',      goals: 4, pos: 'AG', matchesPlayed: 11 }, scorer3: { name: 'Ante Budimir',       goals: 3, pos: 'BU', matchesPlayed: 10 } },
  7:    { topScorer: { name: 'Darwin Núñez',          goals: 8,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Federico Valverde', goals: 4, pos: 'MO', matchesPlayed: 12 }, scorer3: { name: 'Facundo Pellistri',  goals: 3, pos: 'AD', matchesPlayed: 10 } },
  12:   { topScorer: { name: 'Takefusa Kubo',         goals: 6,  pos: 'AD', matchesPlayed: 12 }, scorer2: { name: 'Ayase Ueda',        goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Ritsu Doan',         goals: 4, pos: 'AD', matchesPlayed: 12 } },
  8:    { topScorer: { name: 'Luis Díaz',             goals: 8,  pos: 'AG', matchesPlayed: 12 }, scorer2: { name: 'Luis Suárez',       goals: 4, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Jhon Córdoba',       goals: 5, pos: 'BU', matchesPlayed: 11 } },
  13:   { topScorer: { name: 'Nicolas Jackson',       goals: 6,  pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Sadio Mané',        goals: 5, pos: 'AG', matchesPlayed: 12 }, scorer3: { name: 'Pape Matar Sarr',    goals: 3, pos: 'MO', matchesPlayed: 10 } },
  32:   { topScorer: { name: 'Mohamed Salah',         goals: 9,  pos: 'AD', matchesPlayed: 12 }, scorer2: { name: 'Ahmed Zizo',        goals: 5, pos: 'AD', matchesPlayed: 11 }, scorer3: { name: 'Omar Marmoush',      goals: 4, pos: 'AT', matchesPlayed: 10 } },
  // ── Coupe du Monde 2026 — autres sélections (buteurs vérifiés via API) ──
  5: { topScorer: { name: 'Viktor Gyökeres', goals: 8, pos: 'BU', matchesPlayed: 10 }, scorer2: { name: 'Alexander Isak', goals: 6, pos: 'BU', matchesPlayed: 9 }, scorer3: { name: 'Anthony Elanga', goals: 4, pos: 'AD', matchesPlayed: 10 } }, // Suède
  11: { topScorer: { name: 'José Fajardo', goals: 5, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Cecilio Waterman', goals: 4, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Adalberto Carrasquilla', goals: 3, pos: 'MO', matchesPlayed: 12 } }, // Panama
  17: { topScorer: { name: 'Lee Kang-In', goals: 6, pos: 'MO', matchesPlayed: 12 }, scorer2: { name: 'Bae Jun-Ho', goals: 4, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'Lee Jae-Sung', goals: 4, pos: 'MO', matchesPlayed: 12 } }, // Corée du Sud
  20: { topScorer: { name: 'Kusini Yengi', goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer2: { name: 'Mathew Leckie', goals: 4, pos: 'AD', matchesPlayed: 12 }, scorer3: { name: 'Cristian Volpato', goals: 3, pos: 'AT', matchesPlayed: 9 } }, // Australie
  22: { topScorer: { name: 'Mehdi Ghaedi', goals: 6, pos: 'AT', matchesPlayed: 12 }, scorer2: { name: 'Ali Alipour', goals: 4, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Mohammad Mohebi', goals: 3, pos: 'AT', matchesPlayed: 11 } }, // Iran
  23: { topScorer: { name: 'Firas Al-Buraikan', goals: 5, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Abdullah Al-Hamdan', goals: 4, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Khalid Al-Ghannam', goals: 3, pos: 'AT', matchesPlayed: 10 } }, // Arabie Saoudite
  28: { topScorer: { name: 'Firas Chaouat', goals: 5, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Seifeddine Tounekti', goals: 4, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'Elias Saad', goals: 3, pos: 'AG', matchesPlayed: 9 } }, // Tunisie
  770: { topScorer: { name: 'Tomáš Chorý', goals: 6, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Adam Hložek', goals: 5, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'Mojmír Chytil', goals: 4, pos: 'BU', matchesPlayed: 10 } }, // Tchéquie
  775: { topScorer: { name: 'Marko Arnautović', goals: 6, pos: 'BU', matchesPlayed: 11 }, scorer2: { name: 'Sasa Kalajdzic', goals: 4, pos: 'BU', matchesPlayed: 9 }, scorer3: { name: 'Christoph Baumgartner', goals: 4, pos: 'MO', matchesPlayed: 12 } }, // Autriche
  777: { topScorer: { name: 'Kerem Aktürkoğlu', goals: 6, pos: 'AG', matchesPlayed: 12 }, scorer2: { name: 'Kenan Yıldız', goals: 5, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'Yunus Akgün', goals: 3, pos: 'AD', matchesPlayed: 10 } }, // Turquie
  1090: { topScorer: { name: 'Erling Haaland', goals: 12, pos: 'BU', matchesPlayed: 10 }, scorer2: { name: 'Alexander Sørloth', goals: 6, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Antonio Nusa', goals: 4, pos: 'AG', matchesPlayed: 11 } }, // Norvège
  1108: { topScorer: { name: 'Che Adams', goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer2: { name: 'Lawrence Shankland', goals: 4, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'John McGinn', goals: 4, pos: 'MO', matchesPlayed: 12 } }, // Écosse
  1113: { topScorer: { name: 'Edin Džeko', goals: 7, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Ermedin Demirović', goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Smail Bazdar', goals: 3, pos: 'AT', matchesPlayed: 9 } }, // Bosnie
  1501: { topScorer: { name: 'Nicolas Pépé', goals: 6, pos: 'AD', matchesPlayed: 11 }, scorer2: { name: 'Simon Adingra', goals: 5, pos: 'AG', matchesPlayed: 12 }, scorer3: { name: 'Amad Diallo', goals: 4, pos: 'AD', matchesPlayed: 10 } }, // Côte d'Ivoire
  1504: { topScorer: { name: 'Jordan Ayew', goals: 5, pos: 'AT', matchesPlayed: 12 }, scorer2: { name: 'Antoine Semenyo', goals: 5, pos: 'AD', matchesPlayed: 11 }, scorer3: { name: 'Iñaki Williams', goals: 4, pos: 'BU', matchesPlayed: 10 } }, // Ghana
  1508: { topScorer: { name: 'Cédric Bakambu', goals: 6, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Fiston Mayele', goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Simon Banza', goals: 4, pos: 'BU', matchesPlayed: 10 } }, // RD Congo
  1531: { topScorer: { name: 'Evidence Makgopa', goals: 5, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Lyle Foster', goals: 4, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Oswin Appollis', goals: 3, pos: 'AG', matchesPlayed: 11 } }, // Afrique du Sud
  1532: { topScorer: { name: 'Mohamed Amoura', goals: 7, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Amine Gouiri', goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Ibrahim Maza', goals: 3, pos: 'MO', matchesPlayed: 10 } }, // Algérie
  1533: { topScorer: { name: 'Nuno da Costa', goals: 4, pos: 'BU', matchesPlayed: 11 }, scorer2: { name: 'Jovane Cabral', goals: 4, pos: 'AT', matchesPlayed: 10 }, scorer3: { name: 'Gilson Benchimol', goals: 3, pos: 'BU', matchesPlayed: 9 } }, // Cap-Vert
  1548: { topScorer: { name: 'Ali Olwan', goals: 5, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Mahmoud Al-Mardi', goals: 3, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'Yazan Al-Naimat', goals: 3, pos: 'AT', matchesPlayed: 10 } }, // Jordanie
  1567: { topScorer: { name: 'Aymen Hussein', goals: 6, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Ali Al-Hamadi', goals: 4, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Youssef Amyn', goals: 3, pos: 'AT', matchesPlayed: 9 } }, // Irak
  1568: { topScorer: { name: 'Eldor Shomurodov', goals: 6, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Igor Sergeev', goals: 4, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Abbosbek Fayzullaev', goals: 4, pos: 'AT', matchesPlayed: 10 } }, // Ouzbékistan
  2380: { topScorer: { name: 'Ramón Sosa', goals: 5, pos: 'AT', matchesPlayed: 12 }, scorer2: { name: 'Julio Enciso', goals: 4, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'Ángel Romero', goals: 4, pos: 'AT', matchesPlayed: 10 } }, // Paraguay
  2382: { topScorer: { name: 'Kevin Rodríguez', goals: 5, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Kendry Páez', goals: 4, pos: 'AT', matchesPlayed: 11 }, scorer3: { name: 'John Yeboah', goals: 3, pos: 'AT', matchesPlayed: 10 } }, // Équateur
  2386: { topScorer: { name: 'Duckens Nazon', goals: 4, pos: 'BU', matchesPlayed: 11 }, scorer2: { name: 'Wilfried Isidor', goals: 4, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Josué Casimir', goals: 3, pos: 'AT', matchesPlayed: 9 } }, // Haïti
  4673: { topScorer: { name: 'Chris Wood', goals: 7, pos: 'BU', matchesPlayed: 11 }, scorer2: { name: 'Ben Waine', goals: 3, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Kosta Barbarouses', goals: 3, pos: 'AT', matchesPlayed: 9 } }, // Nouvelle-Zélande
  5529: { topScorer: { name: 'Jonathan David', goals: 8, pos: 'BU', matchesPlayed: 12 }, scorer2: { name: 'Cyle Larin', goals: 5, pos: 'BU', matchesPlayed: 11 }, scorer3: { name: 'Jacob Shaffelburg', goals: 3, pos: 'AG', matchesPlayed: 10 } }, // Canada
  5530: { topScorer: { name: 'Gervane Kastaneer', goals: 4, pos: 'AT', matchesPlayed: 11 }, scorer2: { name: 'Jurgen Locadia', goals: 4, pos: 'BU', matchesPlayed: 10 }, scorer3: { name: 'Brandley Kuwas', goals: 3, pos: 'AD', matchesPlayed: 9 } }, // Curaçao
  // ── Clubs — Premier League
  42:  { topScorer: { name: 'Bukayo Saka',         goals: 14, pos: 'AD', matchesPlayed: 30 }, scorer2: { name: 'Kai Havertz',      goals: 11, pos: 'BU', matchesPlayed: 32 }, scorer3: { name: 'Leandro Trossard',  goals:  8, pos: 'AG', matchesPlayed: 28 } },
  50:  { topScorer: { name: 'Erling Haaland',      goals: 22, pos: 'BU', matchesPlayed: 29 }, scorer2: { name: 'Phil Foden',        goals: 11, pos: 'MO', matchesPlayed: 31 }, scorer3: { name: 'Bernardo Silva',     goals:  7, pos: 'MO', matchesPlayed: 33 } },
  40:  { topScorer: { name: 'Mohamed Salah',        goals: 19, pos: 'AD', matchesPlayed: 32 }, scorer2: { name: 'Alexander Isak',   goals: 12, pos: 'BU', matchesPlayed: 26 }, scorer3: { name: 'Florian Wirtz',      goals:  9, pos: 'MO', matchesPlayed: 30 } },
  33:  { topScorer: { name: 'Bruno Fernandes',      goals:  8, pos: 'MO', matchesPlayed: 33 }, scorer2: { name: 'Bryan Mbeumo',     goals: 9, pos: 'AD', matchesPlayed: 30 }, scorer3: { name: 'Matheus Cunha',      goals:  7, pos: 'AT', matchesPlayed: 20 } },
  66:  { topScorer: { name: 'Ollie Watkins',        goals: 14, pos: 'BU', matchesPlayed: 31 }, scorer2: { name: 'Leon Bailey',      goals:  9, pos: 'AD', matchesPlayed: 28 }, scorer3: { name: 'John McGinn',        goals:  6, pos: 'MO', matchesPlayed: 32 } },
  49:  { topScorer: { name: 'Cole Palmer',          goals: 18, pos: 'MO', matchesPlayed: 33 }, scorer2: { name: 'João Pedro',       goals: 11, pos: 'BU', matchesPlayed: 30 }, scorer3: { name: 'Pedro Neto',         goals:  8, pos: 'AD', matchesPlayed: 25 } },
  51:  { topScorer: { name: 'Georginio Rutter',     goals: 10, pos: 'AT', matchesPlayed: 30 }, scorer2: { name: 'Kaoru Mitoma',     goals:  8, pos: 'AG', matchesPlayed: 29 }, scorer3: { name: 'Yankuba Minteh',     goals:  6, pos: 'AD', matchesPlayed: 24 } },
  47:  { topScorer: { name: 'Dominic Solanke',      goals: 12, pos: 'BU', matchesPlayed: 31 }, scorer2: { name: 'Mohammed Kudus',  goals: 10, pos: 'AT', matchesPlayed: 30 }, scorer3: { name: 'James Maddison',     goals:  6, pos: 'MO', matchesPlayed: 28 } },
  35:  { topScorer: { name: 'Evanilson',            goals: 12, pos: 'BU', matchesPlayed: 30 }, scorer2: { name: 'Justin Kluivert', goals:  9, pos: 'AG', matchesPlayed: 26 }, scorer3: { name: 'David Brooks',       goals:  6, pos: 'MO', matchesPlayed: 28 } },
  52:  { topScorer: { name: 'Jean-Phil. Mateta',    goals: 11, pos: 'BU', matchesPlayed: 30 }, scorer2: { name: 'Daichi Kamada',   goals:  7, pos: 'MO', matchesPlayed: 29 }, scorer3: { name: 'Ismaïla Sarr',       goals:  7, pos: 'AD', matchesPlayed: 27 } },
  36:  { topScorer: { name: 'Raúl Jiménez',         goals: 10, pos: 'BU', matchesPlayed: 29 }, scorer2: { name: 'Rodrigo Muniz',   goals:  8, pos: 'BU', matchesPlayed: 26 }, scorer3: { name: 'Alex Iwobi',         goals:  5, pos: 'MO', matchesPlayed: 32 } },
  34:  { topScorer: { name: 'Nick Woltemade',       goals: 12, pos: 'BU', matchesPlayed: 28 }, scorer2: { name: 'Anthony Gordon',  goals:  9, pos: 'AG', matchesPlayed: 31 }, scorer3: { name: 'Harvey Barnes',      goals:  7, pos: 'AG', matchesPlayed: 27 } },
  48:  { topScorer: { name: 'Jarrod Bowen',         goals: 10, pos: 'AD', matchesPlayed: 30 }, scorer2: { name: 'Mohammed Kudus',  goals:  9, pos: 'AT', matchesPlayed: 28 }, scorer3: { name: 'Lucas Paquetá',      goals:  6, pos: 'MO', matchesPlayed: 29 } },
  85:  { topScorer: { name: 'Gonçalo Ramos',        goals: 14, pos: 'BU', matchesPlayed: 28 }, scorer2: { name: 'Bradley Barcola', goals: 11, pos: 'AG', matchesPlayed: 31 }, scorer3: { name: 'Ousmane Dembélé',    goals:  9, pos: 'AD', matchesPlayed: 29 } },
  81:  { topScorer: { name: 'Mason Greenwood',      goals: 13, pos: 'AD', matchesPlayed: 30 }, scorer2: { name: 'Amine Gouiri',    goals:  8, pos: 'BU', matchesPlayed: 28 }, scorer3: { name: 'Igor Paixão',        goals:  6, pos: 'AG', matchesPlayed: 29 } },
  79:  { topScorer: { name: 'Olivier Giroud',       goals: 12, pos: 'BU', matchesPlayed: 32 }, scorer2: { name: 'Hákon Haraldsson', goals:  8, pos: 'AD', matchesPlayed: 30 }, scorer3: { name: 'Nabil Bentaleb',     goals:  5, pos: 'MO', matchesPlayed: 31 } },
  80:  { topScorer: { name: 'Endrick',              goals:  8, pos: 'BU', matchesPlayed: 30 }, scorer2: { name: 'Corentin Tolisso', goals:  7, pos: 'MO', matchesPlayed: 28 }, scorer3: { name: 'Ernest Nuamah',      goals:  7, pos: 'AD', matchesPlayed: 26 } },
  116: { topScorer: { name: 'Florian Sotoca',       goals:  8, pos: 'AG', matchesPlayed: 29 }, scorer2: { name: 'Adrien Thomasson', goals: 6, pos: 'MO', matchesPlayed: 31 }, scorer3: { name: 'Odsonne Édouard', goals: 7, pos: 'BU', matchesPlayed: 30 } },
  94:  { topScorer: { name: 'Breel Embolo',         goals: 10, pos: 'BU', matchesPlayed: 28 }, scorer2: { name: 'Esteban Lepaul',  goals:  8, pos: 'BU', matchesPlayed: 27 }, scorer3: { name: 'Ludovic Blas',       goals:  6, pos: 'AT', matchesPlayed: 29 } },
  111: { topScorer: { name: 'Sofiane Boufal',       goals:  7, pos: 'AG', matchesPlayed: 28 }, scorer2: { name: 'Mounaïm Mambimbi', goals:  6, pos: 'BU', matchesPlayed: 27 }, scorer3: { name: 'Ibrahima Soumaré',   goals:  4, pos: 'MO', matchesPlayed: 25 } },
  84:  { topScorer: { name: 'Evann Wahi',           goals:  9, pos: 'BU', matchesPlayed: 29 }, scorer2: { name: 'Morgan Sanson',   goals:  6, pos: 'MO', matchesPlayed: 28 }, scorer3: { name: 'Kevin Carlos',       goals:  5, pos: 'BU', matchesPlayed: 24 } },
  541: { topScorer: { name: 'Kylian Mbappé',        goals: 21, pos: 'BU', matchesPlayed: 31 }, scorer2: { name: 'Vinicius Jr.',    goals: 16, pos: 'AG', matchesPlayed: 30 }, scorer3: { name: 'Jude Bellingham',    goals: 12, pos: 'MO', matchesPlayed: 29 } },
  529: { topScorer: { name: 'Robert Lewandowski',   goals: 18, pos: 'BU', matchesPlayed: 30 }, scorer2: { name: 'Lamine Yamal',    goals: 12, pos: 'AD', matchesPlayed: 31 }, scorer3: { name: 'Raphinha',            goals: 10, pos: 'AD', matchesPlayed: 29 } },
  530: { topScorer: { name: 'Antoine Griezmann',    goals: 12, pos: 'AT', matchesPlayed: 30 }, scorer2: { name: 'Julián Álvarez',  goals: 11, pos: 'BU', matchesPlayed: 29 }, scorer3: { name: 'Alexander Sørloth',  goals:  6, pos: 'BU', matchesPlayed: 28 } },
  536: { topScorer: { name: 'Alexis Sánchez',       goals:  8, pos: 'BU', matchesPlayed: 29 }, scorer2: { name: 'Akor Adams',     goals:  6, pos: 'BU', matchesPlayed: 28 }, scorer3: { name: 'Chidera Ejuke',      goals:  5, pos: 'AD', matchesPlayed: 25 } },
  543: { topScorer: { name: 'Cédric Bakambu',       goals:  9, pos: 'BU', matchesPlayed: 28 }, scorer2: { name: 'Antony',         goals:  7, pos: 'AT', matchesPlayed: 29 }, scorer3: { name: 'Lo Celso',            goals:  5, pos: 'MO', matchesPlayed: 28 } },
  548: { topScorer: { name: 'Mikel Oyarzabal',       goals: 11, pos: 'AT', matchesPlayed: 29 }, scorer2: { name: 'Brais Méndez',   goals:  8, pos: 'MO', matchesPlayed: 30 }, scorer3: { name: 'Take Kubo',           goals:  6, pos: 'AD', matchesPlayed: 31 } },
  531: { topScorer: { name: 'Iñaki Williams',        goals: 13, pos: 'BU', matchesPlayed: 31 }, scorer2: { name: 'Nico Williams',  goals: 10, pos: 'AG', matchesPlayed: 30 }, scorer3: { name: 'Oihan Sancet',        goals:  7, pos: 'MO', matchesPlayed: 29 } },
  157: { topScorer: { name: 'Harry Kane',            goals: 22, pos: 'BU', matchesPlayed: 31 }, scorer2: { name: 'Jamal Musiala',  goals: 13, pos: 'MO', matchesPlayed: 30 }, scorer3: { name: 'Michael Olise',       goals: 10, pos: 'AD', matchesPlayed: 28 } },
  165: { topScorer: { name: 'Serhou Guirassy',       goals: 14, pos: 'BU', matchesPlayed: 28 }, scorer2: { name: 'Karim Adeyemi', goals: 9, pos: 'AT', matchesPlayed: 30 }, scorer3: { name: 'Julian Brandt',       goals:  8, pos: 'MO', matchesPlayed: 32 } },
  168: { topScorer: { name: 'Patrik Schick',         goals: 14, pos: 'BU', matchesPlayed: 30 }, scorer2: { name: 'Ernest Poku',    goals:  8, pos: 'AT', matchesPlayed: 27 }, scorer3: { name: 'Malik Tillman',       goals:  7, pos: 'MO', matchesPlayed: 28 } },
  173: { topScorer: { name: 'Christoph Baumgartner', goals: 10, pos: 'AT', matchesPlayed: 29 }, scorer2: { name: 'Antonio Nusa',  goals:  8, pos: 'AG', matchesPlayed: 27 }, scorer3: { name: 'Yan Diomande',        goals:  6, pos: 'AT', matchesPlayed: 26 } },
  505: { topScorer: { name: 'Lautaro Martínez',      goals: 18, pos: 'BU', matchesPlayed: 32 }, scorer2: { name: 'Marcus Thuram', goals: 13, pos: 'AT', matchesPlayed: 31 }, scorer3: { name: 'Hakan Çalhanoğlu',    goals:  7, pos: 'MO', matchesPlayed: 29 } },
  496: { topScorer: { name: 'Dušan Vlahović',        goals: 14, pos: 'BU', matchesPlayed: 29 }, scorer2: { name: 'Kenan Yıldız',  goals:  9, pos: 'AT', matchesPlayed: 30 }, scorer3: { name: 'Teun Koopmeiners',    goals:  7, pos: 'MO', matchesPlayed: 28 } },
  489: { topScorer: { name: 'Rafael Leão',           goals: 12, pos: 'AG', matchesPlayed: 30 }, scorer2: { name: 'Christian Pulisic', goals: 10, pos: 'MO', matchesPlayed: 31 }, scorer3: { name: 'Santiago Giménez', goals:  9, pos: 'BU', matchesPlayed: 25 } },
  492: { topScorer: { name: 'Romelu Lukaku',         goals: 12, pos: 'BU', matchesPlayed: 29 }, scorer2: { name: 'Scott McTominay',goals: 8, pos: 'MO', matchesPlayed: 30 }, scorer3: { name: 'Matteo Politano',     goals:  7, pos: 'AD', matchesPlayed: 26 } },
  487: { topScorer: { name: 'Mattia Zaccagni',       goals: 11, pos: 'AG', matchesPlayed: 29 }, scorer2: { name: 'Pedro',          goals:  7, pos: 'AT', matchesPlayed: 27 }, scorer3: { name: 'Boulaye Dia',        goals: 6, pos: 'BU', matchesPlayed: 25 } },
  497: { topScorer: { name: 'Paulo Dybala',          goals: 11, pos: 'AT', matchesPlayed: 27 }, scorer2: { name: 'Artem Dovbyk',   goals:  9, pos: 'BU', matchesPlayed: 28 }, scorer3: { name: 'Lorenzo Pellegrini', goals:  6, pos: 'MO', matchesPlayed: 30 } },
  502: { topScorer: { name: 'Moise Kean',            goals: 14, pos: 'BU', matchesPlayed: 30 }, scorer2: { name: 'Albert Gudmundsson', goals: 10, pos: 'AT', matchesPlayed: 27 }, scorer3: { name: 'Roberto Piccoli',  goals:  6, pos: 'BU', matchesPlayed: 26 } },
  499: { topScorer: { name: 'Giacomo Raspadori',     goals: 10, pos: 'AT', matchesPlayed: 26 }, scorer2: { name: 'Gianluca Scamacca', goals: 11, pos: 'BU', matchesPlayed: 26 }, scorer3: { name: 'Charles De Ketelaere', goals: 9, pos: 'MO', matchesPlayed: 31 } },
};

function getStaticScorers(apiId) {
  return STATIC_SCORERS[Number(apiId)] ?? null;
}
