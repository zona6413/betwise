# BetWise ⚡

Site de paris sportifs intelligent : matchs du jour, cotes bookmakers, value bets et analyse IA.

## Stack

| Partie    | Techno                          |
|-----------|---------------------------------|
| Backend   | Node.js 20 · Express 4          |
| Frontend  | React 18 · Vite 5               |
| APIs      | API-Football · TheOddsAPI       |

---

## Lancer le projet

### 1. Cloner / ouvrir le dossier

```bash
cd betwise
```

### 2. Backend

```bash
cd backend
npm install

# Copier et remplir les clés API
cp .env.example .env

# Lancer en développement (rechargement auto)
npm run dev
```

> Sans clés API, le backend tourne en **mode mock** avec des données réalistes.  
> Le serveur écoute sur `http://localhost:3001`.

### 3. Frontend

```bash
# Dans un second terminal
cd frontend
npm install
npm run dev
```

> Le frontend tourne sur `http://localhost:5173`.  
> Les requêtes `/api/*` sont proxifiées vers le backend automatiquement (vite.config.js).

---

## Clés API (optionnel)

### API-Football
1. Créer un compte sur [api-sports.io](https://www.api-sports.io/)
2. Copier la clé dans `backend/.env` → `API_FOOTBALL_KEY=...`
- Plan gratuit : 100 requêtes/jour

### TheOddsAPI
1. Créer un compte sur [the-odds-api.com](https://the-odds-api.com/)
2. Copier la clé dans `backend/.env` → `ODDS_API_KEY=...`
- Plan gratuit : 500 requêtes/mois

---

## Architecture

```
betwise/
├── backend/
│   ├── src/
│   │   ├── index.js               # Serveur Express
│   │   ├── routes/
│   │   │   └── matches.js         # GET /api/matches
│   │   └── services/
│   │       ├── footballApi.js     # API-Football (fixtures, stats)
│   │       ├── oddsApi.js         # TheOddsAPI (cotes 1X2)
│   │       ├── merger.js          # Fusion des deux sources (matching fuzzy)
│   │       └── analyzer.js        # Probabilités IA + value bets + analyse texte
│   └── .env.example
└── frontend/
    └── src/
        ├── App.jsx                # Page principale + filtres
        ├── hooks/
        │   └── useMatches.js      # Fetch + polling 60s
        └── components/
            ├── Header.jsx         # Barre de nav + filtres ligue
            ├── MatchCard.jsx      # Carte match avec cotes et badges
            └── AnalysisPanel.jsx  # Panneau latéral d'analyse
```

---

## Algorithme

### Probabilité bookmaker
```
prob_brute = 1 / cote
prob_normalisée = prob_brute / (somme des 3 probs brutes)
```
La normalisation supprime la **marge bookmaker** (overround ~5–10 %).

### Probabilité IA
```
force_equipe = forme_recente × 0.55 + classement × 0.35 + avantage_terrain × 0.10
```
- **Forme** : 5 derniers matchs (W=3pts, D=1pt, L=0pt), normalisé 0–1
- **Classement** : position inversée, normalisée 0–1
- **Avantage terrain** : +10 % sur la force domicile

### Value bet
```
edge = prob_IA - prob_bookmaker
value_bet = edge > 5 %
EV = prob_IA × cote - 1
```

---

## API REST

| Méthode | Route             | Description                             |
|---------|-------------------|-----------------------------------------|
| GET     | `/api/health`     | Statut du serveur                       |
| GET     | `/api/matches`    | Tous les matchs enrichis du jour        |
| GET     | `/api/matches/:id`| Un match par son ID (depuis le cache)   |

---

## Jeu responsable

Cette application est un outil d'analyse informatif. Elle ne constitue pas un conseil financier.  
Jouez de façon responsable : [joueurs.be](https://www.joueurs.be) · [jeu-responsable.fr](https://www.jeu-responsable.fr)
