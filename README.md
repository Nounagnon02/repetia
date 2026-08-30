# RépétIA — Répétiteur particulier IA

Aide les élèves béninois à préparer l'épreuve de **mathématiques du BEPC** :
génération d'exercices calés sur le programme, correction avec explication pas
à pas, chat répétiteur, suivi de progression thème par thème.

Deux clients partagent **le même backend et la même IA** :

| Client | Dossier | Technologie |
|---|---|---|
| Web (PWA installable) | `frontend/` | React + Vite + TailwindCSS |
| **Mobile Android** | `mobile/` | React Native + Expo + NativeWind |

> *Notre problème, ma solution.*

---

## Sommaire

- Dossier d'Architecture Technique : [PDF](NOTE_TECHNIQUE.pdf) · [Markdown](NOTE_TECHNIQUE.md) · [.docx](NOTE_TECHNIQUE.docx)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Application mobile (Android)](#application-mobile-android)
- [Règle d'architecture](#règle-darchitecture-non-négociable)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes disponibles](#commandes-disponibles)
- [Tests](#tests)
- [Structure du projet](#structure-du-projet)
- [API](#api)
- [Robustesse : banque de secours](#robustesse--banque-de-secours)
- [PWA et hors-ligne](#pwa-et-hors-ligne)
- [Accessibilité](#accessibilité)
- [SQLite → PostgreSQL](#sqlite--postgresql)
- [Déploiement](#déploiement)

---

## Fonctionnalités

| Réf | Fonctionnalité | État |
|---|---|---|
| F1 | Sélection du thème (8 thèmes BEPC) et de la difficulté (Facile / Moyen / Type Examen) | ✅ |
| F2 | Génération d'un exercice par l'IA, adapté au thème et à la difficulté | ✅ |
| F3 | Saisie de la réponse et correction (les formes équivalentes sont acceptées) | ✅ |
| F4 | Explication pas à pas après chaque tentative | ✅ |
| F5 | Chat répétiteur, avec le contexte de l'exercice en cours | ✅ |
| F6 | Suivi de progression : taux global et maîtrise par thème | ✅ |
| F7 | Recommandation du thème à revoir en priorité | ✅ |

---

## Stack technique

| Couche | Choix |
|---|---|
| Frontend web | React 19, Vite, TypeScript, TailwindCSS v4, React Router, Axios, `vite-plugin-pwa` |
| Mobile | React Native 0.86, Expo SDK 57, Expo Router, NativeWind, AsyncStorage, Axios |
| Backend | Node.js, Express 5, TypeScript, Prisma |
| Base de données | SQLite en développement, PostgreSQL en production |
| IA | Google Gemini (`@google/genai`), appelée **uniquement côté serveur** |
| Validation | Zod (entrées HTTP **et** sorties du LLM) |
| Sécurité | Helmet, CORS configurable, rate-limiting par élève |
| Tests | Jest + Supertest (backend), Vitest + Testing Library (web), jest-expo + Testing Library (mobile) |

---

## Règle d'architecture (non négociable)

```
   Élève (PWA React)   ─┐
                        ├─HTTPS/REST─▶  Backend Express  ──API──▶  Gemini
   Élève (app Android) ─┘                     │
                                              ▼
                                       SQLite / PostgreSQL
```

- Ni le navigateur ni l'application mobile **n'appellent le LLM directement**.
- `LLM_API_KEY` vit dans `backend/.env`, lue par le seul processus serveur.
- Aucun SDK IA n'est installé côté client ; la clé n'apparaît dans aucun bundle,
  ni web ni mobile.
- `.env` est git-ignoré à la racine ; seuls les `.env.example` sont versionnés.
- L'élève est identifié par un **UUID anonyme** (en-tête `X-User-Id`), généré
  au premier lancement et conservé en `localStorage`. Aucun compte, aucune
  donnée personnelle.

Vérification rapide que rien ne fuit :

```bash
grep -r "LLM_API_KEY\|GoogleGenAI" frontend/src frontend/dist mobile/src   # ne doit rien renvoyer
```

---

## Démarrage rapide

**Prérequis** : Node.js 18+ (testé sur Node 24) et npm.

```bash
# 1. Installer les dépendances, créer la base et charger le seed
npm run setup

# 2. Configurer la clé IA
cp .env.example backend/.env
#    puis renseigner LLM_API_KEY (clé gratuite : https://aistudio.google.com/app/apikey)

# 3. Lancer le front et le back ensemble
npm run dev
```

- Frontend : http://localhost:5173
- API : http://localhost:3000 — état du serveur sur http://localhost:3000/health

`/health` indique notamment si la clé est bien vue par le serveur :

```json
{ "status": "ok", "db": "ok", "llm": "configuré", "modele": "gemini-2.5-flash" }
```

> **Sans clé, l'application fonctionne quand même** en mode dégradé : les
> exercices proviennent de la banque de secours locale et le chat renvoie une
> erreur explicite. C'est aussi ce qui permet aux tests et au build de tourner
> sans aucun secret.

---

## Variables d'environnement

Tout est décrit dans [`.env.example`](.env.example) (backend) et
[`frontend/.env.example`](frontend/.env.example).

### `backend/.env`

| Variable | Rôle | Défaut |
|---|---|---|
| `LLM_API_KEY` | Clé Google Gemini. **Jamais exposée au client.** | — |
| `LLM_MODEL` | Modèle utilisé | `gemini-2.5-flash` |
| `DATABASE_URL` | Connexion Prisma | `file:./dev.db` |
| `PORT` | Port d'écoute | `3000` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `CORS_ORIGIN` | Origines autorisées, séparées par des virgules. Vide = tout autoriser (dev). | vide |
| `RATE_LIMIT_IA_MAX` | Appels IA autorisés par élève et par fenêtre | `20` |
| `RATE_LIMIT_WINDOW_MS` | Durée de la fenêtre de comptage | `60000` |

### `frontend/.env`

| Variable | Rôle | Défaut |
|---|---|---|
| `VITE_API_URL` | URL de l'API backend | `http://localhost:3000/api` |

---

## Commandes disponibles

Depuis la racine du dépôt :

| Commande | Effet |
|---|---|
| `npm run setup` | Installe tout, crée la base et charge le seed |
| `npm run dev` | Démarre backend + frontend ensemble |
| `npm run build` | Compile le backend puis le frontend |
| `npm start` | Démarre le backend compilé (production) |
| `npm run typecheck` | Vérifie les types des deux projets |
| `npm test` | Lance **toute** la suite de tests |
| `npm run seed` | (Re)charge la matière et les 8 thèmes — idempotent |
| `npm run dev:mobile` | Démarre l'application mobile (Expo) |
| `npm run test:mobile` | Tests de l'application mobile uniquement |

---

## Tests

Une seule commande couvre les trois projets :

```bash
npm test        # backend (67) + web (11) + mobile (61) = 139 tests
```

- **Backend** (Jest + Supertest) — le service LLM est mocké : ni réseau, ni clé
  API, ni appel facturé. Une base SQLite **dédiée** (`prisma/test.db`) est
  recréée à chaque exécution, donc la suite ne touche jamais `dev.db`.
- **Frontend web** (Vitest + Testing Library) — le service API est mocké ; le
  parcours clé est joué de bout en bout : choisir un thème → générer →
  répondre → lire la correction et l'explication.
- **Mobile** (jest-expo + Testing Library) — service API mocké, aucun appel
  réseau : construction des requêtes et en-tête `X-User-Id`, cache hors-ligne,
  et le même parcours clé en composants natifs.

Ce qui est couvert, entre autres :

- `/api/exercices/generer` ne renvoie jamais `solution` ni `explication` ;
- une réponse LLM mal formée (`{}`, JSON tronqué, texte libre, champ vide)
  déclenche un nouvel essai puis la banque de secours, sans plantage ;
- une panne du chat renvoie `503` et l'interface affiche une vraie erreur
  avec « Réessayer », jamais une fausse réponse du répétiteur ;
- le rate-limiting, la validation des entrées, le corps JSON malformé (`400`) ;
- le calcul du score de maîtrise (moyenne mobile exponentielle).

---

## Structure du projet

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Modèle de données
│   │   └── seed.ts              # Matière « Mathématiques » + 8 thèmes
│   ├── src/
│   │   ├── config/env.ts        # Chargement .env (1er import de server.ts)
│   │   ├── controllers/         # Logique HTTP par ressource
│   │   ├── data/banque.ts       # Banque de secours (24 exercices)
│   │   ├── middleware/          # auth (X-User-Id), validation Zod, rate-limit
│   │   ├── routes/index.ts      # Table des routes
│   │   ├── schemas/requests.ts  # Schémas Zod des requêtes
│   │   ├── services/llm.service.ts  # SEUL point d'appel au LLM
│   │   └── server.ts
│   └── tests/                   # Jest — API + service IA
└── frontend/
    ├── src/
    │   ├── components/          # Loader, MessageErreur, TexteFormate, EnTete
    │   ├── pages/               # Accueil, Entrainement, Chat, Progression
    │   ├── services/api.ts      # Client HTTP + erreurs en français
    │   ├── services/horsLigne.ts# Cache local du dernier exercice
    │   └── types/               # Types partagés
    └── tests/                   # Vitest — parcours clé
```

---

## Application mobile (Android)

L'application native vit dans [`mobile/`](mobile/). C'est un **second client**
du même backend : elle ne contient **aucune clé ni aucun prompt IA**, tout passe
par les endpoints de `backend/`.

### Stack

Expo SDK 57 (workflow managed) · React Native 0.86 · TypeScript · Expo Router
(navigation par fichiers) · NativeWind (la palette du web, en classes Tailwind)
· `lucide-react-native` + `react-native-svg` pour les icônes et le logo
· AsyncStorage · Axios · jest-expo + Testing Library.

### Identité visuelle

Le logo est une **toque de diplômé** (le répétiteur) surmontée d'une **étincelle
à quatre branches** (l'IA), en crème sur le vert de la marque. Il est
volontairement géométrique et sans détail fin : il doit rester lisible à 48 px,
la taille d'une icône d'application.

| Fichier | Usage |
|---|---|
| `assets/brand/logo-mark.svg` | Symbole seul, fond transparent |
| `assets/brand/logo-icon.svg` | Symbole sur carré vert — base de l'icône d'app |
| `assets/brand/logo-lockup.svg` | Symbole + « Répét**IA** », pour fond clair |
| `assets/brand/logo-lockup-inverse.svg` | Même chose pour fond vert foncé |

Les PNG attendus par Expo (`icon.png`, `adaptive-icon.png`, `splash-icon.png`,
`favicon.png`) et le composant React `src/components/LogoMark.tsx` sont
**générés depuis la même géométrie** :

```bash
cd mobile && node scripts/generer-assets.js
```

La géométrie vit dans `scripts/logo.js`. Modifier ce fichier puis relancer le
script suffit à propager le changement partout — l'icône affichée dans
l'application ne peut pas diverger de celle du lanceur.

**Icônes d'interface** : `lucide-react-native` (les mêmes dessins que le client
web, qui utilise `lucide-react`), teintées à la palette. Aucun emoji ne sert
d'icône fonctionnelle.

### Écrans

| Écran | Accès | Contenu |
|---|---|---|
| **Accueil** | onglet | Puces de thème, sélecteur de difficulté, série du jour, boutons d'action |
| **Entraînement** | empilé depuis l'Accueil | Carte d'énoncé, champ de réponse, correction, explication pas à pas |
| **Répétiteur** | onglet | Fil de discussion (`FlatList`), saisie, indicateur « RépétIA écrit… » |
| **Progression** | onglet | Taux global, maîtrise par thème, thème à revoir |

### Lancer l'application en développement

```bash
# 1. Démarrer le backend (depuis la racine du dépôt)
npm run dev:backend           # écoute sur le port 3000

# 2. Démarrer l'application mobile
cd mobile && npx expo start
```

Scanner ensuite le QR code avec **Expo Go** (Android), ou appuyer sur `a` pour
lancer un émulateur Android.

### ⚠️ Le piège `localhost`

Depuis un téléphone ou un émulateur, **`localhost` désigne l'appareil lui-même**,
pas ta machine de développement. L'application gère ce cas toute seule : elle
déduit l'adresse du backend à partir de l'hôte Metro auquel elle est déjà
connectée (par exemple `192.168.1.12`), et n'utilise donc jamais `localhost`.

Tu n'as rien à configurer tant que **le téléphone et l'ordinateur sont sur le
même réseau Wi-Fi**. Sinon, deux solutions :

```bash
# A. Forcer l'URL de l'API (IP LAN de ta machine, obtenue par `hostname -I`)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.12:3000/api npx expo start

# B. Passer par un tunnel (réseaux différents, Wi-Fi public, pare-feu)
npx expo start --tunnel
```

Avec `--tunnel`, Metro est joignable mais **pas ton backend local** : il faut
alors viser un backend déployé.

```bash
EXPO_PUBLIC_API_BASE_URL=https://repetia-api.onrender.com/api npx expo start --tunnel
```

Autres variables (voir [`mobile/.env.example`](mobile/.env.example)) :

| Variable | Rôle | Défaut |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | URL complète de l'API, prioritaire | détection auto |
| `EXPO_PUBLIC_API_PORT` | Port du backend local | `3000` |

Le backend écoute sur toutes les interfaces : aucune configuration CORS n'est
nécessaire pour le mobile (CORS ne concerne que les navigateurs). Si le
téléphone ne joint pas le serveur, c'est le **pare-feu** de la machine qu'il
faut ouvrir sur le port 3000.

### Identifiant anonyme

Au premier lancement, l'application génère un UUID, le conserve dans
AsyncStorage et l'envoie dans l'en-tête `X-User-Id` de chaque requête — même
mécanique que le web. Aucun compte, aucune donnée personnelle.

### Hors-ligne

- Les thèmes et la progression sont mis en cache après chaque chargement réussi.
- Les **10 derniers exercices** travaillés (et leur correction) sont conservés :
  sans réseau, l'écran d'entraînement réaffiche le dernier avec un bandeau
  explicite, au lieu d'une page vide.
- Générer un nouvel exercice et discuter avec le répétiteur exigent une
  connexion : ce sont des appels au LLM.

### Tester

```bash
cd mobile && npm test          # 61 tests, aucun appel réseau
npm run typecheck              # tsc --noEmit
```

Un test d'**intégration optionnel** vérifie le contrat du vrai backend. Il est
ignoré par défaut ; pour l'exécuter, démarrer le backend puis :

```bash
REPETIA_API_URL=http://localhost:3000/api npm test
```

### Générer un APK installable

Prérequis : un **compte Expo** (gratuit) et l'outil EAS.

```bash
npm install -g eas-cli
cd mobile
eas login
eas build:configure          # crée/associe le projet EAS (renseigne EAS_PROJECT_ID)
```

Puis, avant de builder, pointer l'application vers le backend **déployé** en
modifiant `EXPO_PUBLIC_API_BASE_URL` dans [`mobile/eas.json`](mobile/eas.json) —
un APK ne peut évidemment pas joindre le `localhost` de ta machine.

```bash
# APK installable directement sur un téléphone
eas build -p android --profile preview
# ou : npm run build:android

# AAB pour le Play Store
eas build -p android --profile production
```

EAS renvoie un lien de téléchargement à la fin du build. Pour un build local
(sans passer par les serveurs Expo) : `eas build -p android --profile preview --local`
— nécessite le SDK Android et Java installés sur la machine.

---

## API

Toutes les routes sont préfixées par `/api`. Les routes marquées 🔒 exigent
l'en-tête `X-User-Id`.

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/matieres?niveau=BEPC` | Liste des matières |
| `GET` | `/matieres/:id/themes` | Thèmes d'une matière, triés |
| `POST` | 🔒 `/exercices/generer` | Génère un exercice — **ne renvoie pas la solution** |
| `POST` | 🔒 `/tentatives` | Corrige une réponse et met à jour la progression |
| `GET` | 🔒 `/progression` | Statistiques globales, par thème, et recommandation |
| `POST` | 🔒 `/chat` | Question libre au répétiteur |
| `GET` | `/health` | État du serveur, de la base et de la configuration IA |

<details>
<summary>Exemples de requêtes et de réponses</summary>

```http
POST /api/exercices/generer
X-User-Id: 6f1c…-…-…
{ "themeId": "…", "difficulte": "moyen" }
```
```json
{ "exerciceId": "…", "enonce": "Résous : 2x + 3 = 11.", "themeId": "…", "difficulte": "moyen" }
```

```http
POST /api/tentatives
{ "exerciceId": "…", "reponseEleve": "x = 4" }
```
```json
{
  "correct": true,
  "verdict": "Bravo, c'est juste !",
  "explication": "On isole x : 2x = 11 - 3 = 8, donc x = 8/2 = 4.",
  "progression": { "themeId": "…", "scoreMaitrise": 78, "nbTentatives": 5, "nbReussies": 4 }
}
```

```http
GET /api/progression
```
```json
{
  "global": { "faits": 12, "reussis": 9, "taux": 75 },
  "parTheme": [{ "themeId": "…", "libelle": "Thalès", "scoreMaitrise": 40, "nbTentatives": 5, "nbReussies": 2 }],
  "recommandation": { "themeId": "…", "libelle": "Thalès", "scoreMaitrise": 40 }
}
```
</details>

**Note.** Le cahier des charges décrit ces contrats en `snake_case`
(`theme_id`, `par_theme`). L'implémentation utilise le `camelCase` de manière
cohérente entre le front, le back et la base. C'est un écart assumé et
documenté ; le renommer serait purement cosmétique et risqué.

### Score de maîtrise

Après chaque tentative, le score du thème suit une moyenne mobile
exponentielle (α = 0,3) :

```
nouveau_score = ancien_score × 0,7 + (100 si juste, sinon 0) × 0,3
```

Les tentatives récentes pèsent donc davantage : un élève qui progresse voit son
score remonter sans être puni indéfiniment par ses débuts.

---

## Robustesse : banque de secours

Les modèles de langage renvoient parfois du JSON encadré de Markdown, du texte
bavard, un objet incomplet — ou rien du tout quand le service sature.
Le service IA traite ces cas dans cet ordre :

1. **Nettoyage** : retrait des balises ```` ```json ````, extraction du premier bloc `{…}`.
2. **Validation Zod** : les trois champs doivent être présents **et non vides**.
   Un `{}` syntaxiquement valide est donc rejeté.
3. **Nouvel essai** : un second appel est tenté.
4. **Banque de secours** : 24 exercices rédigés à la main (8 thèmes × 3
   difficultés), servis avec le **bon thème** et la **bonne difficulté**.
   L'exercice est enregistré avec `source: "banque"`, ce qui permet de mesurer
   la fréquence du repli.

La correction dispose du même filet ; le chat, lui, renvoie une erreur `503`
explicite plutôt qu'une fausse réponse.

### Écriture des mathématiques

Les modèles écrivent spontanément en LaTeX (`$\sqrt{45}$`, `\times`) et en
Markdown riche (`### titre`), que l'élève verrait alors tel quel. Embarquer un
moteur LaTeX coûterait des centaines de kilo-octets sur des téléphones d'entrée
de gamme, pour un bénéfice nul face à l'écriture qu'un élève lit déjà au
tableau. Le prompt impose donc l'Unicode — `√45`, `x²`, `3 × 5`, `≤` — et
`services/texte.service.ts` sert de filet de sécurité : il convertit tout LaTeX
résiduel avant que la réponse ne quitte le serveur. Les deux clients en
profitent sans une ligne de code supplémentaire.

---

## PWA et hors-ligne

- Application installable sur Android (manifeste + icônes 192/512).
- La coquille de l'application est précachée : elle s'ouvre sans réseau.
- Les requêtes `GET /api/matieres` et `GET /api/progression` sont servies en
  `NetworkFirst` : la dernière version connue reste disponible hors ligne.
- Le dernier exercice travaillé (et sa correction) est conservé en
  `localStorage` : en cas de coupure, l'écran d'entraînement le réaffiche avec
  un bandeau explicite au lieu d'une page vide.
- La **génération** d'un nouvel exercice et le **chat** nécessitent une
  connexion : ce sont des appels au LLM.

Bundle : **~100 Ko gzip**, bien en dessous de la cible de 500 Ko.

---

## Accessibilité

- Textes intégralement en français, langage simple.
- `lang="fr"`, contrastes conformes AA sur la palette.
- Chaque bouton icône porte un `aria-label` ; les groupes thème/difficulté sont
  des `radiogroup` navigables au clavier.
- Chargements annoncés via `role="status"`, erreurs via `role="alert"`,
  conversation via `role="log"`, barres de progression via `role="progressbar"`.
- Mobile-first, utilisable dès 320 px de large.

---

## SQLite → PostgreSQL

1. Dans `backend/prisma/schema.prisma`, remplacer le provider :

   ```prisma
   datasource db {
     provider = "postgresql"   // au lieu de "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. Définir `DATABASE_URL` dans l'environnement de production :

   ```
   DATABASE_URL="postgresql://user:motdepasse@hote:5432/repetia?schema=public"
   ```

3. Créer le schéma puis charger le seed sur la base distante :

   ```bash
   cd backend
   npx prisma db push
   npm run build && npm run seed:prod   # ou `npm run seed` si ts-node est disponible
   ```

Aucun code applicatif n'est à modifier : Prisma isole le dialecte SQL, et le
seed est idempotent (relançable sans créer de doublon).

---

## Déploiement

### Backend — Render

[`render.yaml`](render.yaml) provisionne l'API **et** sa base PostgreSQL. Sinon,
manuellement :

| Réglage | Valeur |
|---|---|
| Répertoire racine | `backend` |
| Build | `npm install && npm run build:prod && npm run db:push:prod` |
| Démarrage | `npm start` |
| Health check | `/health` |

`build:prod` dérive le schéma PostgreSQL depuis `schema.prisma` puis compile ;
`db:push:prod` crée les tables. Le **catalogue s'installe seul au démarrage** :
aucune commande à lancer après le déploiement, et une base repartie de zéro se
remplit toute seule.

Seule variable à saisir à la main dans le tableau de bord : **`LLM_API_KEY`**.
Ajouter ensuite `CORS_ORIGIN=https://<votre-front>` pour verrouiller les origines.

> Le plan gratuit de Render met le service en veille après 15 minutes
> d'inactivité : la première requête suivante prend ~30 s. C'est sans gravité
> pour une démo, mais prévenez-en le jury.

### Frontend — Vercel / Netlify

| Réglage | Valeur |
|---|---|
| Répertoire racine | `frontend` |
| Build | `npm run build` |
| Dossier publié | `dist` |
| Variable | `VITE_API_URL=https://<votre-api>/api` |

Les réécritures monopage sont déjà configurées
([`vercel.json`](frontend/vercel.json) et [`public/_redirects`](frontend/public/_redirects)),
sans quoi un rechargement sur `/progression` renverrait une 404.

### Instance en ligne

| | URL |
|---|---|
| Application | **https://repetia.vercel.app** |
| API | **https://repetia-api.onrender.com** |
| Santé | https://repetia-api.onrender.com/health |

### Après le premier déploiement

```bash
curl https://<votre-api>/health
# → {"status":"ok","db":"ok","llm":"configuré", …}
```

Si `llm` vaut `non configuré`, la variable `LLM_API_KEY` n'est pas passée à
l'hébergeur : l'application servira la banque de secours.
