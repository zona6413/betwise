/**
 * Base de données des joueurs clés par équipe (saison 2025-2026)
 * teamId → { topScorer, scorer2, scorer3, keyPlayer, dangerMan, style }
 * matchesPlayed utilisé pour calculer un taux buts/match précis
 */

const PLAYERS = {
  // ── Premier League ───────────────────────────────────────────────────────
  133604: { // Arsenal
    topScorer: { name: 'Bukayo Saka',         goals: 14, pos: 'AD', matchesPlayed: 30 },
    scorer2:   { name: 'Kai Havertz',         goals: 11, pos: 'BU', matchesPlayed: 32 },
    scorer3:   { name: 'Leandro Trossard',    goals:  8, pos: 'AG', matchesPlayed: 28 },
    keyPlayer: { name: 'Martin Ødegaard',     role: 'Meneur de jeu' },
    dangerMan: { name: 'Kai Havertz',         note: 'Efficace en zone' },
    style: 'Possession haute, pressing intensif',
  },
  133605: { // Manchester City
    topScorer: { name: 'Erling Haaland',      goals: 22, pos: 'BU', matchesPlayed: 29 },
    scorer2:   { name: 'Phil Foden',          goals: 11, pos: 'MO', matchesPlayed: 31 },
    scorer3:   { name: 'Bernardo Silva',      goals:  7, pos: 'MO', matchesPlayed: 33 },
    keyPlayer: { name: 'Kevin De Bruyne',     role: 'Créateur' },
    dangerMan: { name: 'Phil Foden',          note: 'Percussif entre les lignes' },
    style: 'Monopole du ballon, transitions rapides',
  },
  133602: { // Liverpool
    topScorer: { name: 'Mohamed Salah',       goals: 19, pos: 'AD', matchesPlayed: 32 },
    scorer2:   { name: 'Diogo Jota',          goals: 12, pos: 'AT', matchesPlayed: 26 },
    scorer3:   { name: 'Luis Díaz',           goals:  9, pos: 'AG', matchesPlayed: 30 },
    keyPlayer: { name: 'Alexis Mac Allister', role: 'Milieu box-to-box' },
    dangerMan: { name: 'Darwin Núñez',        note: 'Dangereux à contre-courant' },
    style: 'Pressing haut, transitions verticales',
  },
  133612: { // Manchester United
    topScorer: { name: 'Rasmus Højlund',      goals:  9, pos: 'BU', matchesPlayed: 28 },
    scorer2:   { name: 'Bruno Fernandes',     goals:  8, pos: 'MO', matchesPlayed: 33 },
    scorer3:   { name: 'Marcus Rashford',     goals:  7, pos: 'AG', matchesPlayed: 27 },
    keyPlayer: { name: 'Bruno Fernandes',     role: 'Capitaine créateur' },
    dangerMan: { name: 'Marcus Rashford',     note: 'Explosif en duel' },
    style: 'Contre-attaque, duels directs',
  },
  133601: { // Aston Villa
    topScorer: { name: 'Ollie Watkins',       goals: 14, pos: 'BU', matchesPlayed: 31 },
    scorer2:   { name: 'Leon Bailey',         goals:  9, pos: 'AD', matchesPlayed: 28 },
    scorer3:   { name: 'John McGinn',         goals:  6, pos: 'MO', matchesPlayed: 32 },
    keyPlayer: { name: 'John McGinn',         role: 'Box-to-box' },
    dangerMan: { name: 'Leon Bailey',         note: 'Ailier imprévisible' },
    style: 'Pressing agressif, jeu aérien',
  },
  133610: { // Chelsea
    topScorer: { name: 'Cole Palmer',         goals: 18, pos: 'MO', matchesPlayed: 33 },
    scorer2:   { name: 'Nicolas Jackson',     goals: 12, pos: 'BU', matchesPlayed: 30 },
    scorer3:   { name: 'Christopher Nkunku',  goals:  9, pos: 'AT', matchesPlayed: 25 },
    keyPlayer: { name: 'Enzo Fernández',      role: 'Milieu créateur' },
    dangerMan: { name: 'Nicolas Jackson',     note: 'Mobile, termine bien' },
    style: 'Technique, possession en demi-terrain',
  },
  133619: { // Brighton
    topScorer: { name: 'Georginio Rutter',    goals: 10, pos: 'AT', matchesPlayed: 30 },
    scorer2:   { name: 'Kaoru Mitoma',        goals:  8, pos: 'AG', matchesPlayed: 29 },
    scorer3:   { name: 'João Pedro',          goals:  7, pos: 'BU', matchesPlayed: 24 },
    keyPlayer: { name: 'Carlos Baleba',       role: 'Récupérateur' },
    dangerMan: { name: 'Kaoru Mitoma',        note: 'Dribbleur côté gauche' },
    style: 'Jeu positionnel, nombreuses solutions',
  },
  133616: { // Tottenham
    topScorer: { name: 'Heung-min Son',       goals: 12, pos: 'AG', matchesPlayed: 31 },
    scorer2:   { name: 'Dominic Solanke',     goals: 10, pos: 'BU', matchesPlayed: 30 },
    scorer3:   { name: 'James Maddison',      goals:  6, pos: 'MO', matchesPlayed: 28 },
    keyPlayer: { name: 'James Maddison',      role: 'Meneur' },
    dangerMan: { name: 'Dominic Solanke',     note: 'Pivot technique' },
    style: 'Contre-attaque rapide, largeur du terrain',
  },
  134301: { // Bournemouth
    topScorer: { name: 'Antoine Semenyo',     goals:  9, pos: 'AD', matchesPlayed: 30 },
    scorer2:   { name: 'Evanilson',           goals:  8, pos: 'BU', matchesPlayed: 26 },
    scorer3:   { name: 'Dango Ouattara',      goals:  6, pos: 'AD', matchesPlayed: 28 },
    keyPlayer: { name: 'Ryan Christie',       role: 'Moteur du milieu' },
    dangerMan: { name: 'Dango Ouattara',      note: 'Vitesse en transition' },
    style: 'Intensité physique, jeu direct',
  },
  133632: { // Crystal Palace
    topScorer: { name: 'Jean-Phil. Mateta',   goals: 11, pos: 'BU', matchesPlayed: 30 },
    scorer2:   { name: 'Eberechi Eze',        goals:  9, pos: 'MO', matchesPlayed: 29 },
    scorer3:   { name: 'Ismaïla Sarr',        goals:  7, pos: 'AD', matchesPlayed: 27 },
    keyPlayer: { name: 'Eberechi Eze',        role: 'Dribbleur créateur' },
    dangerMan: { name: 'Ismaïla Sarr',        note: 'Explosif sur les côtés' },
    style: 'Direct, appui sur les ailiers',
  },
  133600: { // Fulham
    topScorer: { name: 'Raúl Jiménez',        goals: 10, pos: 'BU', matchesPlayed: 29 },
    scorer2:   { name: 'Rodrigo Muniz',       goals:  8, pos: 'BU', matchesPlayed: 26 },
    scorer3:   { name: 'Alex Iwobi',          goals:  5, pos: 'MO', matchesPlayed: 32 },
    keyPlayer: { name: 'Alex Iwobi',          role: 'Polyvalent milieu-attaque' },
    dangerMan: { name: 'Rodrigo Muniz',       note: 'Finisseur en pivot' },
    style: 'Solide défensivement, efficace en transition',
  },
  133620: { // Newcastle
    topScorer: { name: 'Alexander Isak',      goals: 16, pos: 'BU', matchesPlayed: 28 },
    scorer2:   { name: 'Anthony Gordon',      goals:  9, pos: 'AG', matchesPlayed: 31 },
    scorer3:   { name: 'Harvey Barnes',       goals:  7, pos: 'AG', matchesPlayed: 27 },
    keyPlayer: { name: 'Bruno Guimarães',     role: 'Milieu dominant' },
    dangerMan: { name: 'Anthony Gordon',      note: 'Très actif côté gauche' },
    style: 'Pressing haut, jeu direct vers Isak',
  },
  134777: { // Newcastle (doublon)
    topScorer: { name: 'Alexander Isak',      goals: 16, pos: 'BU', matchesPlayed: 28 },
    scorer2:   { name: 'Anthony Gordon',      goals:  9, pos: 'AG', matchesPlayed: 31 },
    scorer3:   { name: 'Harvey Barnes',       goals:  7, pos: 'AG', matchesPlayed: 27 },
    keyPlayer: { name: 'Bruno Guimarães',     role: 'Milieu dominant' },
    dangerMan: { name: 'Anthony Gordon',      note: 'Très actif côté gauche' },
    style: 'Pressing haut, jeu direct vers Isak',
  },
  133636: { // West Ham
    topScorer: { name: 'Jarrod Bowen',        goals: 10, pos: 'AD', matchesPlayed: 30 },
    scorer2:   { name: 'Mohammed Kudus',      goals:  9, pos: 'AT', matchesPlayed: 28 },
    scorer3:   { name: 'Lucas Paquetá',       goals:  6, pos: 'MO', matchesPlayed: 29 },
    keyPlayer: { name: 'Lucas Paquetá',       role: 'Milieu technique' },
    dangerMan: { name: 'Michail Antonio',     note: 'Physique, aérien' },
    style: 'Jeu aérien, duels physiques',
  },

  // ── Ligue 1 ──────────────────────────────────────────────────────────────
  133714: { // PSG
    topScorer: { name: 'Gonçalo Ramos',       goals: 14, pos: 'BU', matchesPlayed: 28 },
    scorer2:   { name: 'Bradley Barcola',     goals: 11, pos: 'AG', matchesPlayed: 31 },
    scorer3:   { name: 'Ousmane Dembélé',     goals:  9, pos: 'AD', matchesPlayed: 29 },
    keyPlayer: { name: 'Fabian Ruiz',         role: 'Relanceur créateur' },
    dangerMan: { name: 'Bradley Barcola',     note: 'Accélérateur côté gauche' },
    style: 'Pressing haut, domination technique',
  },
  133707: { // Marseille
    topScorer: { name: 'Mason Greenwood',     goals: 13, pos: 'AD', matchesPlayed: 30 },
    scorer2:   { name: 'Elye Wahi',           goals:  9, pos: 'BU', matchesPlayed: 28 },
    scorer3:   { name: 'Luis Henrique',       goals:  6, pos: 'AG', matchesPlayed: 29 },
    keyPlayer: { name: 'Valentin Rongier',    role: 'Milieu récupérateur' },
    dangerMan: { name: 'Elye Wahi',           note: 'Avant-centre mobile' },
    style: 'Bloc médian, transitions rapides',
  },
  133711: { // Lille
    topScorer: { name: 'Jonathan David',      goals: 20, pos: 'BU', matchesPlayed: 32 },
    scorer2:   { name: 'Edon Zhegrova',       goals:  8, pos: 'AD', matchesPlayed: 30 },
    scorer3:   { name: 'Angel Gomes',         goals:  6, pos: 'MO', matchesPlayed: 31 },
    keyPlayer: { name: 'Angel Gomes',         role: 'Meneur box-to-box' },
    dangerMan: { name: 'Edon Zhegrova',       note: 'Dribbleur côté droit' },
    style: 'Pressing haut, jeu direct vers David',
  },
  133713: { // Lyon
    topScorer: { name: 'Alexandre Lacazette', goals: 12, pos: 'BU', matchesPlayed: 30 },
    scorer2:   { name: 'Rayan Cherki',        goals:  9, pos: 'AT', matchesPlayed: 28 },
    scorer3:   { name: 'Ernest Nuamah',       goals:  7, pos: 'AD', matchesPlayed: 26 },
    keyPlayer: { name: 'Rayan Cherki',        role: 'Talent offensif' },
    dangerMan: { name: 'Rayan Cherki',        note: 'Imprévisible entre les lignes' },
    style: 'Combinaisons courtes, créativité offensive',
  },
  133822: { // Lens
    topScorer: { name: 'Florian Sotoca',      goals:  8, pos: 'AG', matchesPlayed: 29 },
    scorer2:   { name: 'Przemysław Frankowski', goals: 6, pos: 'AD', matchesPlayed: 31 },
    scorer3:   { name: 'Neil El Aynaoui',     goals:  5, pos: 'MO', matchesPlayed: 30 },
    keyPlayer: { name: 'Neil El Aynaoui',     role: 'Milieu moderne' },
    dangerMan: { name: 'M\'Baye Niang',       note: 'Puissant en pivot' },
    style: 'Pressing intense, bloc collectif',
  },
  133719: { // Rennes
    topScorer: { name: 'Arnaud Kalimuendo',   goals:  9, pos: 'BU', matchesPlayed: 28 },
    scorer2:   { name: 'Désiré Doué',         goals:  7, pos: 'AT', matchesPlayed: 26 },
    scorer3:   { name: 'Amine Gouiri',        goals:  6, pos: 'AG', matchesPlayed: 27 },
    keyPlayer: { name: 'Baptiste Santamaria', role: 'Chef d\'orchestre' },
    dangerMan: { name: 'Désiré Doué',         note: 'Jeune talent explosif' },
    style: 'Jeu collectif structuré, transitions',
  },
  133712: { // Nice
    topScorer: { name: 'Terem Moffi',         goals: 10, pos: 'BU', matchesPlayed: 29 },
    scorer2:   { name: 'Evann Guessand',      goals:  7, pos: 'AT', matchesPlayed: 28 },
    scorer3:   { name: 'Gaëtan Laborde',      goals:  6, pos: 'BU', matchesPlayed: 24 },
    keyPlayer: { name: 'Khéphren Thuram',     role: 'Milieu dominant' },
    dangerMan: { name: 'Evann Guessand',      note: 'Appels en profondeur' },
    style: 'Défense solide, efficacité sur coups de pied arrêtés',
  },

  // ── La Liga ──────────────────────────────────────────────────────────────
  133739: { // Real Madrid
    topScorer: { name: 'Kylian Mbappé',       goals: 21, pos: 'BU', matchesPlayed: 31 },
    scorer2:   { name: 'Vinicius Jr.',        goals: 16, pos: 'AG', matchesPlayed: 30 },
    scorer3:   { name: 'Jude Bellingham',     goals: 12, pos: 'MO', matchesPlayed: 29 },
    keyPlayer: { name: 'Jude Bellingham',     role: 'Box-to-box offensif' },
    dangerMan: { name: 'Vinicius Jr.',        note: 'Dribbleur explosif côté gauche' },
    style: 'Contre-attaque fulminante, possession équilibrée',
  },
  133738: { // Barcelona
    topScorer: { name: 'Robert Lewandowski',  goals: 18, pos: 'BU', matchesPlayed: 30 },
    scorer2:   { name: 'Lamine Yamal',        goals: 12, pos: 'AD', matchesPlayed: 31 },
    scorer3:   { name: 'Raphinha',            goals: 10, pos: 'AD', matchesPlayed: 29 },
    keyPlayer: { name: 'Lamine Yamal',        role: 'Ailier prodige' },
    dangerMan: { name: 'Pedri',               note: 'Créateur entre les lignes' },
    style: 'Tiki-taka modernisé, haut pressing',
  },
  133740: { // Atlético Madrid
    topScorer: { name: 'Antoine Griezmann',   goals: 12, pos: 'AT', matchesPlayed: 30 },
    scorer2:   { name: 'Álvaro Morata',       goals:  9, pos: 'BU', matchesPlayed: 27 },
    scorer3:   { name: 'Samuel Lino',         goals:  6, pos: 'AG', matchesPlayed: 28 },
    keyPlayer: { name: 'Rodrigo De Paul',     role: 'Milieu combatif' },
    dangerMan: { name: 'Álvaro Morata',       note: 'Finisseur de surface' },
    style: 'Bloc bas, contre-attaques précises',
  },
  133735: { // Sevilla
    topScorer: { name: 'Youssef En-Nesyri',   goals: 10, pos: 'BU', matchesPlayed: 29 },
    scorer2:   { name: 'Dodi Lukébakio',      goals:  7, pos: 'AG', matchesPlayed: 28 },
    scorer3:   { name: 'Jesús Corona',        goals:  4, pos: 'AD', matchesPlayed: 25 },
    keyPlayer: { name: 'Joan Jordán',         role: 'Box-to-box technique' },
    dangerMan: { name: 'Jesús Navas',         note: 'Expérience côté droit' },
    style: 'Pressing organisé, jeu de transition',
  },
  133722: { // Real Betis
    topScorer: { name: 'Borja Iglesias',      goals:  7, pos: 'BU', matchesPlayed: 27 },
    scorer2:   { name: 'Ayoze Pérez',         goals:  6, pos: 'AT', matchesPlayed: 29 },
    scorer3:   { name: 'Lo Celso',            goals:  5, pos: 'MO', matchesPlayed: 28 },
    keyPlayer: { name: 'Isco',                role: 'Meneur élégant' },
    dangerMan: { name: 'Ayoze Pérez',         note: 'Attaquant mobile' },
    style: 'Possession technique, coups de pied arrêtés',
  },
  133724: { // Real Sociedad
    topScorer: { name: 'Mikel Oyarzabal',     goals: 11, pos: 'AT', matchesPlayed: 29 },
    scorer2:   { name: 'Brais Méndez',        goals:  8, pos: 'MO', matchesPlayed: 30 },
    scorer3:   { name: 'Take Kubo',           goals:  6, pos: 'AD', matchesPlayed: 31 },
    keyPlayer: { name: 'Martin Zubimendi',    role: 'Sentinelle' },
    dangerMan: { name: 'Take Kubo',           note: 'Dribbleur japonais' },
    style: 'Jeu positionnel, pressing coordonné',
  },
  133727: { // Athletic Bilbao
    topScorer: { name: 'Iñaki Williams',      goals: 13, pos: 'BU', matchesPlayed: 31 },
    scorer2:   { name: 'Nico Williams',       goals: 10, pos: 'AG', matchesPlayed: 30 },
    scorer3:   { name: 'Oihan Sancet',        goals:  7, pos: 'MO', matchesPlayed: 29 },
    keyPlayer: { name: 'Nico Williams',       role: 'Ailier gauche explosif' },
    dangerMan: { name: 'Oihan Sancet',        note: 'Milieu offensif' },
    style: 'Jeu basque, intensité physique',
  },

  // ── Bundesliga ───────────────────────────────────────────────────────────
  133641: { // Bayern Munich
    topScorer: { name: 'Harry Kane',          goals: 22, pos: 'BU', matchesPlayed: 31 },
    scorer2:   { name: 'Jamal Musiala',       goals: 13, pos: 'MO', matchesPlayed: 30 },
    scorer3:   { name: 'Leroy Sané',          goals:  9, pos: 'AD', matchesPlayed: 27 },
    keyPlayer: { name: 'Jamal Musiala',       role: 'Milieu offensif génie' },
    dangerMan: { name: 'Leroy Sané',          note: 'Vitesse et dribble' },
    style: 'Pressing haut, domination totale',
  },
  133650: { // Dortmund
    topScorer: { name: 'Serhou Guirassy',     goals: 14, pos: 'BU', matchesPlayed: 28 },
    scorer2:   { name: 'Jamie Gittens',       goals: 11, pos: 'AG', matchesPlayed: 30 },
    scorer3:   { name: 'Julian Brandt',       goals:  8, pos: 'MO', matchesPlayed: 32 },
    keyPlayer: { name: 'Julian Brandt',       role: 'Meneur technique' },
    dangerMan: { name: 'Serhou Guirassy',     note: 'Finisseur puissant' },
    style: 'Contre-attaque rapide, largeur du jeu',
  },
  133666: { // Leverkusen
    topScorer: { name: 'Florian Wirtz',       goals: 15, pos: 'MO', matchesPlayed: 31 },
    scorer2:   { name: 'Victor Boniface',     goals: 11, pos: 'BU', matchesPlayed: 27 },
    scorer3:   { name: 'Granit Xhaka',        goals:  5, pos: 'MO', matchesPlayed: 32 },
    keyPlayer: { name: 'Granit Xhaka',        role: 'Sentinelle dominante' },
    dangerMan: { name: 'Victor Boniface',     note: 'Avant-centre physique' },
    style: 'Gegenpressing, jeu positionnel',
  },
  134695: { // RB Leipzig
    topScorer: { name: 'Benjamin Sesko',      goals: 14, pos: 'BU', matchesPlayed: 29 },
    scorer2:   { name: 'Lois Openda',         goals: 10, pos: 'AT', matchesPlayed: 27 },
    scorer3:   { name: 'Xavi Simons',         goals:  9, pos: 'MO', matchesPlayed: 31 },
    keyPlayer: { name: 'Xavi Simons',         role: 'Milieu offensif' },
    dangerMan: { name: 'Lois Openda',         note: 'Mobile, contre-attaque' },
    style: 'Pressing haut, transitions verticales',
  },

  // ── Serie A ──────────────────────────────────────────────────────────────
  133673: { // Inter Milan
    topScorer: { name: 'Lautaro Martínez',    goals: 18, pos: 'BU', matchesPlayed: 32 },
    scorer2:   { name: 'Marcus Thuram',       goals: 13, pos: 'AT', matchesPlayed: 31 },
    scorer3:   { name: 'Hakan Çalhanoğlu',    goals:  7, pos: 'MO', matchesPlayed: 29 },
    keyPlayer: { name: 'Marcus Thuram',       role: 'Avant-centre complet' },
    dangerMan: { name: 'Hakan Çalhanoğlu',    note: 'Milieu décisif sur coup franc' },
    style: 'Bloc médian solide, transitions rapides',
  },
  133672: { // Juventus
    topScorer: { name: 'Dušan Vlahović',      goals: 14, pos: 'BU', matchesPlayed: 29 },
    scorer2:   { name: 'Kenan Yıldız',        goals:  9, pos: 'AT', matchesPlayed: 30 },
    scorer3:   { name: 'Teun Koopmeiners',    goals:  7, pos: 'MO', matchesPlayed: 28 },
    keyPlayer: { name: 'Kenan Yıldız',        role: 'Talent offensif' },
    dangerMan: { name: 'Teun Koopmeiners',    note: 'Milieu technique décisif' },
    style: 'Solidité défensive, efficacité balistique',
  },
  133667: { // AC Milan
    topScorer: { name: 'Rafael Leão',         goals: 12, pos: 'AG', matchesPlayed: 30 },
    scorer2:   { name: 'Christian Pulisic',   goals: 10, pos: 'MO', matchesPlayed: 31 },
    scorer3:   { name: 'Álvaro Morata',       goals:  8, pos: 'BU', matchesPlayed: 26 },
    keyPlayer: { name: 'Christian Pulisic',   role: 'Milieu offensif' },
    dangerMan: { name: 'Rafael Leão',         note: 'Explosif en sprint' },
    style: 'Bloc médian, exploite la vitesse de Leão',
  },
  133680: { // Napoli
    topScorer: { name: 'Romelu Lukaku',       goals: 12, pos: 'BU', matchesPlayed: 29 },
    scorer2:   { name: 'Khvicha Kvaratskhelia', goals: 10, pos: 'AG', matchesPlayed: 28 },
    scorer3:   { name: 'Giacomo Raspadori',   goals:  7, pos: 'AT', matchesPlayed: 26 },
    keyPlayer: { name: 'Khvicha Kvaratskhelia', role: 'Ailier technique gauche' },
    dangerMan: { name: 'Giacomo Raspadori',   note: 'Mobile entre les lignes' },
    style: 'Pressing haut à la Conte, jeu direct',
  },
  133668: { // Lazio
    topScorer: { name: 'Mattia Zaccagni',     goals: 11, pos: 'AG', matchesPlayed: 29 },
    scorer2:   { name: 'Pedro',               goals:  7, pos: 'AT', matchesPlayed: 27 },
    scorer3:   { name: 'Ciro Immobile',       goals:  6, pos: 'BU', matchesPlayed: 22 },
    keyPlayer: { name: 'Nicolò Rovella',      role: 'Milieu box-to-box' },
    dangerMan: { name: 'Pedro',               note: 'Expérience et finesse' },
    style: 'Possession, attaque positionnelle',
  },
  133682: { // Roma
    topScorer: { name: 'Paulo Dybala',        goals: 11, pos: 'AT', matchesPlayed: 27 },
    scorer2:   { name: 'Tammy Abraham',       goals:  8, pos: 'BU', matchesPlayed: 25 },
    scorer3:   { name: 'Lorenzo Pellegrini',  goals:  6, pos: 'MO', matchesPlayed: 30 },
    keyPlayer: { name: 'Lorenzo Pellegrini',  role: 'Capitaine créateur' },
    dangerMan: { name: 'Tammy Abraham',       note: 'Puissant pivot' },
    style: 'Créativité offensive, pressing médian',
  },
  133674: { // Fiorentina
    topScorer: { name: 'Moise Kean',          goals: 14, pos: 'BU', matchesPlayed: 30 },
    scorer2:   { name: 'Albert Gudmundsson',  goals: 10, pos: 'AT', matchesPlayed: 27 },
    scorer3:   { name: 'Riccardo Sottil',     goals:  6, pos: 'AD', matchesPlayed: 26 },
    keyPlayer: { name: 'Albert Gudmundsson',  role: 'Meneur offensif' },
    dangerMan: { name: 'Riccardo Sottil',     note: 'Ailier droit explosif' },
    style: 'Jeu offensif, possession en demi-terrain',
  },
  134782: { // Atalanta
    topScorer: { name: 'Ademola Lookman',     goals: 16, pos: 'AT', matchesPlayed: 30 },
    scorer2:   { name: 'Gianluca Scamacca',   goals: 11, pos: 'BU', matchesPlayed: 26 },
    scorer3:   { name: 'Charles De Ketelaere', goals: 9, pos: 'MO', matchesPlayed: 31 },
    keyPlayer: { name: 'Gianluca Scamacca',   role: 'Avant-centre athlétique' },
    dangerMan: { name: 'Charles De Ketelaere', note: 'Milieu offensif décisif' },
    style: 'Gegenpressing à l\'italienne, attaque massive',
  },
};

// ── IDs API-Football → données joueurs ──────────────────────────────────────
// API-Football utilise des IDs différents de TheSportsDB
const API_FOOTBALL_IDS = {
  // Premier League
  42:  133604, // Arsenal
  50:  133605, // Manchester City
  40:  133602, // Liverpool
  33:  133612, // Manchester United
  66:  133601, // Aston Villa
  49:  133610, // Chelsea
  51:  133619, // Brighton
  47:  133616, // Tottenham
  35:  134301, // Bournemouth
  52:  133632, // Crystal Palace
  36:  133600, // Fulham
  34:  133620, // Newcastle
  37:  133636, // West Ham
  // Ligue 1
  85:  133714, // PSG
  81:  133707, // Marseille
  79:  133711, // Lille
  80:  133713, // Lyon
  116: 133822, // Lens
  111: 133719, // Rennes
  84:  133712, // Nice
  // La Liga
  541: 133739, // Real Madrid
  529: 133738, // Barcelona
  530: 133740, // Atlético Madrid
  536: 133735, // Sevilla
  543: 133722, // Real Betis
  548: 133724, // Real Sociedad
  531: 133727, // Athletic Bilbao
  // Bundesliga
  157: 133641, // Bayern Munich
  165: 133650, // Dortmund
  168: 133666, // Leverkusen
  173: 134695, // RB Leipzig
  // Serie A
  505: 133673, // Inter Milan
  496: 133672, // Juventus
  489: 133667, // AC Milan
  492: 133680, // Napoli
  487: 133668, // Lazio
  497: 133682, // Roma
  502: 133674, // Fiorentina
  499: 134782, // Atalanta
};

// Mapping par nom (insensible à la casse, correspondance partielle)
const NAME_KEYWORDS = [
  ['arsenal',           133604],
  ['manchester city',   133605],
  ['man city',          133605],
  ['liverpool',         133602],
  ['manchester united', 133612],
  ['man united',        133612],
  ['aston villa',       133601],
  ['chelsea',           133610],
  ['brighton',          133619],
  ['tottenham',         133616],
  ['spurs',             133616],
  ['bournemouth',       134301],
  ['crystal palace',    133632],
  ['fulham',            133600],
  ['newcastle',         133620],
  ['west ham',          133636],
  ['paris saint-germain', 133714],
  ['paris sg',          133714],
  ['psg',               133714],
  ['marseille',         133707],
  ['lille',             133711],
  ['lyon',              133713],
  ['lens',              133822],
  ['rennes',            133719],
  ['nice',              133712],
  ['real madrid',       133739],
  ['barcelona',         133738],
  ['fc barcelona',      133738],
  ['atlético madrid',   133740],
  ['atletico madrid',   133740],
  ['sevilla',           133735],
  ['real betis',        133722],
  ['real sociedad',     133724],
  ['athletic bilbao',   133727],
  ['athletic club',     133727],
  ['bayern',            133641],
  ['dortmund',          133650],
  ['borussia dortmund', 133650],
  ['leverkusen',        133666],
  ['bayer leverkusen',  133666],
  ['rb leipzig',        134695],
  ['leipzig',           134695],
  ['inter milan',       133673],
  ['inter',             133673],
  ['juventus',          133672],
  ['ac milan',          133667],
  ['milan',             133667],
  ['napoli',            133680],
  ['lazio',             133668],
  ['roma',              133682],
  ['fiorentina',        133674],
  ['atalanta',          134782],
];

/** Retourne les stats joueurs par ID TheSportsDB */
export function getPlayerStats(teamId) {
  return PLAYERS[String(teamId)] ?? null;
}

/** Retourne les stats joueurs par ID API-Football */
export function getPlayerStatsByApiId(apiFootballId) {
  const tsdbId = API_FOOTBALL_IDS[Number(apiFootballId)];
  return tsdbId ? (PLAYERS[tsdbId] ?? null) : null;
}

/** Retourne les stats joueurs par nom d'équipe (correspondance partielle) */
export function getPlayerStatsByName(teamName) {
  if (!teamName) return null;
  const key = teamName.toLowerCase().trim();
  for (const [keyword, tsdbId] of NAME_KEYWORDS) {
    if (key.includes(keyword) || keyword.includes(key)) {
      return PLAYERS[tsdbId] ?? null;
    }
  }
  return null;
}

/** Retourne le nom du buteur principal */
export function getTopScorer(teamId) {
  return PLAYERS[String(teamId)]?.topScorer ?? null;
}

/** Retourne tous les joueurs pour les deux équipes (essaie ID API-Football, puis nom) */
export function getMatchPlayers(homeId, awayId, homeName, awayName) {
  return {
    home: getPlayerStats(homeId)
       ?? getPlayerStatsByApiId(homeId)
       ?? getPlayerStatsByName(homeName),
    away: getPlayerStats(awayId)
       ?? getPlayerStatsByApiId(awayId)
       ?? getPlayerStatsByName(awayName),
  };
}
