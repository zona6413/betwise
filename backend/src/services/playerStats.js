/**
 * Base de données statique des joueurs clés par équipe (saison 2025-2026)
 * teamId → { topScorer, keyPlayer, dangerMan, style }
 */

const PLAYERS = {
  // ── Premier League ───────────────────────────────────────────────────────
  133604: { // Arsenal
    topScorer:   { name: 'Bukayo Saka',       goals: 14, pos: 'AD' },
    keyPlayer:   { name: 'Martin Ødegaard',    role: 'Meneur de jeu' },
    dangerMan:   { name: 'Kai Havertz',        note: 'Efficace en zone' },
    style:       'Possession haute, pressing intensif',
  },
  133605: { // Manchester City
    topScorer:   { name: 'Erling Haaland',    goals: 22, pos: 'BU' },
    keyPlayer:   { name: 'Kevin De Bruyne',    role: 'Créateur' },
    dangerMan:   { name: 'Phil Foden',         note: 'Percussif entre les lignes' },
    style:       'Monopole du ballon, transitions rapides',
  },
  133602: { // Liverpool
    topScorer:   { name: 'Mohamed Salah',     goals: 19, pos: 'AD' },
    keyPlayer:   { name: 'Alexis Mac Allister', role: 'Milieu box-to-box' },
    dangerMan:   { name: 'Darwin Núñez',       note: 'Dangereux à contre-courant' },
    style:       'Pressing haut, transitions verticales',
  },
  133612: { // Manchester United
    topScorer:   { name: 'Rasmus Højlund',    goals: 9,  pos: 'BU' },
    keyPlayer:   { name: 'Bruno Fernandes',   role: 'Capitaine créateur' },
    dangerMan:   { name: 'Marcus Rashford',   note: 'Explosif en duel' },
    style:       'Contre-attaque, duels directs',
  },
  133601: { // Aston Villa
    topScorer:   { name: 'Ollie Watkins',     goals: 14, pos: 'BU' },
    keyPlayer:   { name: 'John McGinn',        role: 'Box-to-box' },
    dangerMan:   { name: 'Leon Bailey',        note: 'Ailier imprévisible' },
    style:       'Pressing agressif, jeu aérien',
  },
  133610: { // Chelsea
    topScorer:   { name: 'Cole Palmer',       goals: 18, pos: 'MO' },
    keyPlayer:   { name: 'Enzo Fernández',    role: 'Milieu créateur' },
    dangerMan:   { name: 'Nicolas Jackson',   note: 'Mobile, termine bien' },
    style:       'Technique, possession en demi-terrain',
  },
  133619: { // Brighton
    topScorer:   { name: 'Georginio Rutter',  goals: 10, pos: 'AT' },
    keyPlayer:   { name: 'Carlos Baleba',      role: 'Récupérateur' },
    dangerMan:   { name: 'Kaoru Mitoma',       note: 'Dribbleur côté gauche' },
    style:       'Jeu positionnel, nombreuses solutions',
  },
  133616: { // Tottenham
    topScorer:   { name: 'Heung-min Son',     goals: 12, pos: 'AG' },
    keyPlayer:   { name: 'James Maddison',    role: 'Meneur' },
    dangerMan:   { name: 'Dominic Solanke',   note: 'Pivot technique' },
    style:       'Contre-attaque rapide, largeur du terrain',
  },
  134301: { // Bournemouth
    topScorer:   { name: 'Antoine Semenyo',   goals: 9,  pos: 'AD' },
    keyPlayer:   { name: 'Ryan Christie',      role: 'Moteur du milieu' },
    dangerMan:   { name: 'Dango Ouattara',     note: 'Vitesse en transition' },
    style:       'Intensité physique, jeu direct',
  },
  133632: { // Crystal Palace
    topScorer:   { name: 'Jean-Phil. Mateta', goals: 11, pos: 'BU' },
    keyPlayer:   { name: 'Eberechi Eze',       role: 'Dribbleur créateur' },
    dangerMan:   { name: 'Ismaïla Sarr',       note: 'Explosif sur les côtés' },
    style:       'Direct, appui sur les ailiers',
  },
  133615: { // Everton
    topScorer:   { name: 'Beto',              goals: 6,  pos: 'BU' },
    keyPlayer:   { name: 'Iliman Ndiaye',     role: 'Attaquant de soutien' },
    dangerMan:   { name: 'Dwight McNeil',      note: 'Technique en zone droite' },
    style:       'Bloc bas, sorties en contre',
  },
  133600: { // Fulham
    topScorer:   { name: 'Raúl Jiménez',     goals: 10, pos: 'BU' },
    keyPlayer:   { name: 'Alex Iwobi',        role: 'Polyvalent milieu-attaque' },
    dangerMan:   { name: 'Rodrigo Muniz',     note: 'Finisseur en pivot' },
    style:       'Solide défensivement, efficace en transition',
  },
  133620: { // Newcastle
    topScorer:   { name: 'Alexander Isak',   goals: 16, pos: 'BU' },
    keyPlayer:   { name: 'Bruno Guimarães',   role: 'Milieu dominant' },
    dangerMan:   { name: 'Anthony Gordon',    note: 'Très actif côté gauche' },
    style:       'Pressing haut, jeu direct vers Isak',
  },
  134777: { // Newcastle (doublon)
    topScorer:   { name: 'Alexander Isak',   goals: 16, pos: 'BU' },
    keyPlayer:   { name: 'Bruno Guimarães',   role: 'Milieu dominant' },
    dangerMan:   { name: 'Anthony Gordon',    note: 'Très actif côté gauche' },
    style:       'Pressing haut, jeu direct vers Isak',
  },
  133636: { // West Ham
    topScorer:   { name: 'Jarrod Bowen',     goals: 10, pos: 'AD' },
    keyPlayer:   { name: 'Lucas Paquetá',    role: 'Milieu technique' },
    dangerMan:   { name: 'Michail Antonio',  note: 'Physique, aérien' },
    style:       'Jeu aérien, duels physiques',
  },

  // ── Ligue 1 ──────────────────────────────────────────────────────────────
  133714: { // PSG
    topScorer:   { name: 'Gonçalo Ramos',    goals: 14, pos: 'BU' },
    keyPlayer:   { name: 'Fabian Ruiz',       role: 'Relanceur créateur' },
    dangerMan:   { name: 'Bradley Barcola',   note: 'Accélérateur côté gauche' },
    style:       'Pressing haut, domination technique',
  },
  133707: { // Marseille
    topScorer:   { name: 'Mason Greenwood',  goals: 13, pos: 'AD' },
    keyPlayer:   { name: 'Valentin Rongier',  role: 'Milieu récupérateur' },
    dangerMan:   { name: 'Elye Wahi',         note: 'Avant-centre mobile' },
    style:       'Bloc médian, transitions rapides',
  },
  133711: { // Lille
    topScorer:   { name: 'Jonathan David',   goals: 20, pos: 'BU' },
    keyPlayer:   { name: 'Angel Gomes',       role: 'Meneur box-to-box' },
    dangerMan:   { name: 'Edon Zhegrova',     note: 'Dribbleur côté droit' },
    style:       'Pressing haut, jeu direct vers David',
  },
  133713: { // Lyon
    topScorer:   { name: 'Alexandre Lacazette', goals: 12, pos: 'BU' },
    keyPlayer:   { name: 'Rayan Cherki',      role: 'Talent offensif' },
    dangerMan:   { name: 'Ainsley Maitland-Niles', note: 'Polyvalent' },
    style:       'Combinaisons courtes, créativité offensive',
  },
  133822: { // Lens
    topScorer:   { name: 'Florian Sotoca',   goals: 8,  pos: 'AG' },
    keyPlayer:   { name: 'Neil El Aynaoui',   role: 'Milieu moderne' },
    dangerMan:   { name: 'M\'Baye Niang',     note: 'Puissant en pivot' },
    style:       'Pressing intense, bloc collectif',
  },
  133719: { // Rennes
    topScorer:   { name: 'Arnaud Kalimuendo', goals: 9, pos: 'BU' },
    keyPlayer:   { name: 'Baptiste Santamaria', role: 'Chef d\'orchestre' },
    dangerMan:   { name: 'Désiré Doué',       note: 'Jeune talent explosif' },
    style:       'Jeu collectif structuré, transitions',
  },
  133712: { // Nice
    topScorer:   { name: 'Terem Moffi',      goals: 10, pos: 'BU' },
    keyPlayer:   { name: 'Khéphren Thuram',   role: 'Milieu dominant' },
    dangerMan:   { name: 'Evann Guessand',    note: 'Appels en profondeur' },
    style:       'Défense solide, efficacité sur coups de pied arrêtés',
  },
  133861: { // Nantes
    topScorer:   { name: 'Mostafa Mohamed',  goals: 7,  pos: 'BU' },
    keyPlayer:   { name: 'Pedro Chirivella',  role: 'Sentinelle créatrice' },
    dangerMan:   { name: 'Moses Simon',       note: 'Ailier technique' },
    style:       'Bloc bas, coups de pied arrêtés',
  },

  // ── La Liga ──────────────────────────────────────────────────────────────
  133739: { // Real Madrid
    topScorer:   { name: 'Vinicius Jr.',     goals: 16, pos: 'AG' },
    keyPlayer:   { name: 'Jude Bellingham',   role: 'Box-to-box offensif' },
    dangerMan:   { name: 'Kylian Mbappé',    note: 'Finisseur d\'élite' },
    style:       'Contre-attaque fulminante, possession équilibrée',
  },
  133738: { // Barcelona
    topScorer:   { name: 'Robert Lewandowski', goals: 18, pos: 'BU' },
    keyPlayer:   { name: 'Lamine Yamal',      role: 'Ailier prodige' },
    dangerMan:   { name: 'Pedri',             note: 'Créateur entre les lignes' },
    style:       'Tiki-taka modernisé, haut pressing',
  },
  133740: { // Atlético Madrid
    topScorer:   { name: 'Antoine Griezmann', goals: 12, pos: 'AT' },
    keyPlayer:   { name: 'Rodrigo De Paul',    role: 'Milieu combatif' },
    dangerMan:   { name: 'Álvaro Morata',      note: 'Finisseur de surface' },
    style:       'Bloc bas, contre-attaques précises',
  },
  133735: { // Sevilla
    topScorer:   { name: 'Youssef En-Nesyri', goals: 10, pos: 'BU' },
    keyPlayer:   { name: 'Joan Jordán',        role: 'Box-to-box technique' },
    dangerMan:   { name: 'Jesús Navas',        note: 'Expérience côté droit' },
    style:       'Pressing organisé, jeu de transition',
  },
  133722: { // Real Betis
    topScorer:   { name: 'Borja Iglesias',   goals: 7,  pos: 'BU' },
    keyPlayer:   { name: 'Isco',              role: 'Meneur élégant' },
    dangerMan:   { name: 'Ayoze Pérez',       note: 'Attaquant mobile' },
    style:       'Possession technique, coups de pied arrêtés',
  },
  133724: { // Real Sociedad
    topScorer:   { name: 'Mikel Oyarzabal',  goals: 11, pos: 'AT' },
    keyPlayer:   { name: 'Martin Zubimendi',  role: 'Sentinelle' },
    dangerMan:   { name: 'Take Kubo',         note: 'Dribbleur japonais' },
    style:       'Jeu positionnel, pressing coordonné',
  },
  133727: { // Athletic Bilbao
    topScorer:   { name: 'Iñaki Williams',   goals: 13, pos: 'BU' },
    keyPlayer:   { name: 'Nico Williams',     role: 'Ailier gauche explosif' },
    dangerMan:   { name: 'Oihan Sancet',      note: 'Milieu offensif' },
    style:       'Jeu basque, intensité physique',
  },
  133730: { // Osasuna
    topScorer:   { name: 'Ante Budimir',     goals: 9,  pos: 'BU' },
    keyPlayer:   { name: 'Rubén García',      role: 'Milieu créateur' },
    dangerMan:   { name: 'Aimar Oroz',        note: 'Jeune talent' },
    style:       'Bloc compact, efficacité sur corner',
  },

  // ── Bundesliga ───────────────────────────────────────────────────────────
  133641: { // Bayern Munich
    topScorer:   { name: 'Harry Kane',       goals: 22, pos: 'BU' },
    keyPlayer:   { name: 'Jamal Musiala',    role: 'Milieu offensif génie' },
    dangerMan:   { name: 'Leroy Sané',       note: 'Vitesse et dribble' },
    style:       'Pressing haut, domination totale',
  },
  133650: { // Dortmund
    topScorer:   { name: 'Jamie Gittens',    goals: 11, pos: 'AG' },
    keyPlayer:   { name: 'Julian Brandt',     role: 'Meneur technique' },
    dangerMan:   { name: 'Serhou Guirassy',   note: 'Finisseur puissant' },
    style:       'Contre-attaque rapide, largeur du jeu',
  },
  133666: { // Leverkusen
    topScorer:   { name: 'Florian Wirtz',    goals: 15, pos: 'MO' },
    keyPlayer:   { name: 'Granit Xhaka',      role: 'Sentinelle dominante' },
    dangerMan:   { name: 'Victor Boniface',   note: 'Avant-centre physique' },
    style:       'Gegenpressing, jeu positionnel',
  },
  134695: { // RB Leipzig
    topScorer:   { name: 'Benjamin Sesko',   goals: 14, pos: 'BU' },
    keyPlayer:   { name: 'Xavi Simons',       role: 'Milieu offensif' },
    dangerMan:   { name: 'Lois Openda',       note: 'Mobile, contre-attaque' },
    style:       'Pressing haut, transitions verticales',
  },
  133653: { // Freiburg
    topScorer:   { name: 'Michael Gregoritsch', goals: 9, pos: 'AT' },
    keyPlayer:   { name: 'Nicolas Höfler',    role: 'Sentinelle' },
    dangerMan:   { name: 'Junior Adamu',      note: 'Vitesse en profondeur' },
    style:       'Bloc compact, sorties en contre',
  },
  133813: { // St. Pauli
    topScorer:   { name: 'Morgan Guilavogui', goals: 6, pos: 'BU' },
    keyPlayer:   { name: 'Elias Saad',         role: 'Milieu offensif' },
    dangerMan:   { name: 'Oladapo Afolabi',    note: 'Ailier rapide' },
    style:       'Pressing intense, collectif fort',
  },

  // ── Serie A ──────────────────────────────────────────────────────────────
  133673: { // Inter Milan
    topScorer:   { name: 'Lautaro Martínez', goals: 18, pos: 'BU' },
    keyPlayer:   { name: 'Marcus Thuram',     role: 'Avant-centre complet' },
    dangerMan:   { name: 'Hakan Çalhanoğlu',  note: 'Milieu décisif sur coup franc' },
    style:       'Bloc médian solide, transitions rapides',
  },
  133672: { // Juventus
    topScorer:   { name: 'Dušan Vlahović',   goals: 14, pos: 'BU' },
    keyPlayer:   { name: 'Kenan Yıldız',      role: 'Talent offensif' },
    dangerMan:   { name: 'Teun Koopmeiners',  note: 'Milieu technique décisif' },
    style:       'Solidité défensive, efficacité balistique',
  },
  133667: { // AC Milan
    topScorer:   { name: 'Rafael Leão',      goals: 12, pos: 'AG' },
    keyPlayer:   { name: 'Christian Pulisic', role: 'Milieu offensif' },
    dangerMan:   { name: 'Olivier Giroud',    note: 'Finisseur expérimenté' },
    style:       'Bloc médian, exploite la vitesse de Leão',
  },
  133680: { // Napoli
    topScorer:   { name: 'Romelu Lukaku',    goals: 12, pos: 'BU' },
    keyPlayer:   { name: 'Khvicha Kvaratskhelia', role: 'Ailier technique gauche' },
    dangerMan:   { name: 'Giacomo Raspadori', note: 'Mobile entre les lignes' },
    style:       'Pressing haut à la Conte, jeu direct',
  },
  133668: { // Lazio
    topScorer:   { name: 'Mattia Zaccagni',  goals: 11, pos: 'AG' },
    keyPlayer:   { name: 'Nicolò Rovella',    role: 'Milieu box-to-box' },
    dangerMan:   { name: 'Pedro',             note: 'Expérience et finesse' },
    style:       'Possession, attaque positionnelle',
  },
  133682: { // Roma
    topScorer:   { name: 'Paulo Dybala',     goals: 11, pos: 'AT' },
    keyPlayer:   { name: 'Lorenzo Pellegrini', role: 'Capitaine créateur' },
    dangerMan:   { name: 'Tammy Abraham',     note: 'Puissant pivot' },
    style:       'Créativité offensive, pressing médian',
  },
  133674: { // Fiorentina
    topScorer:   { name: 'Moise Kean',       goals: 14, pos: 'BU' },
    keyPlayer:   { name: 'Albert Gudmundsson', role: 'Meneur offensif' },
    dangerMan:   { name: 'Riccardo Sottil',   note: 'Ailier droit explosif' },
    style:       'Jeu offensif, possession en demi-terrain',
  },
  134782: { // Atalanta
    topScorer:   { name: 'Ademola Lookman',  goals: 16, pos: 'AT' },
    keyPlayer:   { name: 'Gianluca Scamacca', role: 'Avant-centre athlétique' },
    dangerMan:   { name: 'Charles De Ketelaere', note: 'Milieu offensif décisif' },
    style:       'Gegenpressing à l\'italienne, attaque massive',
  },
  133687: { // Torino
    topScorer:   { name: 'Duván Zapata',     goals: 6,  pos: 'BU' },
    keyPlayer:   { name: 'Samuele Ricci',     role: 'Milieu élégant' },
    dangerMan:   { name: 'Nemanja Radonjić',  note: 'Explosif en duel' },
    style:       'Bloc compact, efficacité sur phase arrêtée',
  },
};

/**
 * Retourne les stats joueurs d'une équipe (ou null si inconnue)
 */
export function getPlayerStats(teamId) {
  return PLAYERS[String(teamId)] ?? null;
}

/**
 * Retourne le nom du buteur probable (top scorer)
 */
export function getTopScorer(teamId) {
  return PLAYERS[String(teamId)]?.topScorer ?? null;
}

/**
 * Retourne tous les joueurs pour les deux équipes
 */
export function getMatchPlayers(homeId, awayId) {
  return {
    home: getPlayerStats(homeId),
    away: getPlayerStats(awayId),
  };
}
