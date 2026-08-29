# CLAUDE.md — Repères pour travailler sur RépétIA

Contexte pour toute session d'assistance sur ce dépôt. Le `README.md` s'adresse
aux utilisateurs ; ce fichier s'adresse à celui qui **modifie** le code.

---

## Le projet en une phrase

Révision des mathématiques du BEPC béninois : génération d'exercices par IA,
correction expliquée pas à pas, chat répétiteur, suivi de progression.
Monorepo npm à trois espaces : `backend/` (Express + Prisma), `frontend/`
(React + Vite, PWA) et `mobile/` (React Native + Expo, Android).

**`frontend/` et `mobile/` sont deux clients du MÊME backend.** Toute évolution
du contrat d'API doit être répercutée dans les deux.

---

## Invariants à ne jamais casser

1. **Le LLM ne s'appelle que depuis le serveur.**
   `backend/src/services/llm.service.ts` est le seul fichier qui importe
   `@google/genai`. N'installez jamais de SDK IA dans `frontend/` ni dans
   `mobile/`, et ne faites jamais transiter `LLM_API_KEY` vers un client.

2. **`/api/exercices/generer` ne renvoie ni `solution` ni `explication`.**
   L'élève ne les découvre qu'après `POST /api/tentatives`. Un test verrouille
   ce comportement — s'il casse, c'est la fonctionnalité qui est cassée, pas le test.

3. **Le service IA ne doit jamais faire planter une requête.**
   Génération et correction retombent sur un repli ; seul le chat lève
   `LlmIndisponibleError`, traduite en `503` par le contrôleur.

4. **Les tests ne touchent pas `dev.db`.**
   `tests/env.setup.ts` force `DATABASE_URL=file:./test.db` et
   `tests/global.setup.ts` recrée cette base. Ne rétablissez jamais un
   `deleteMany()` sur la base de développement.

5. **`.env` reste hors du dépôt.** Le `.gitignore` racine couvre `.env`,
   `*.db`, `node_modules/` et `dist/` ; `mobile/.gitignore` ajoute `.expo/`.
   Seuls les `.env.example` sont versionnés.

6. **Le mobile ne duplique pas la logique métier.** Score de maîtrise, repli sur
   la banque, validation des entrées : tout vit côté serveur. `mobile/` affiche
   ce que l'API renvoie, rien de plus.

---

## Commandes

```bash
npm run setup       # install + db push + seed  (première fois)
npm run dev         # backend (3000) + frontend web (5173)
npm run dev:mobile  # application Expo (Metro sur 8081)
npm run typecheck   # tsc sur les deux projets
npm run build       # backend puis frontend
npm test            # toute la suite (112 tests : 51 back + 11 web + 50 mobile)
npm run seed        # recharge matière + 8 thèmes (idempotent)
```

Depuis `backend/` : `npm run db:push`, `npm run start`, `npm run seed:prod`.
Depuis `mobile/` : `npx expo start`, `npm test`, `npm run build:android`.

---

## Architecture backend

```
server.ts
  └─ config/env.ts        ← DOIT rester le premier import
  └─ middleware           helmet → cors → json(64ko) → rate-limit global
  └─ routes/index.ts
        auth (X-User-Id) → limiteurIA → valider(schéma Zod) → contrôleur
  └─ gestionnaire d'erreurs (JSON malformé → 400, reste → 500)
```

- **`config/env.ts`** cherche `.env` dans trois emplacements (cwd, `../..`,
  `../../..`) parce que `__dirname` diffère entre `ts-node` (`src/`) et le
  build (`dist/src/`). Ne le simplifiez pas en un seul chemin : la clé
  deviendrait introuvable en production alors que tout marche en local.
- **`middleware/validate.middleware.ts`** : `req.query` et `req.params` sont en
  lecture seule sur Express 5. La version validée est rangée dans
  `req.validated` et se relit avec l'aide `valide(req, 'query')`.
- **`middleware/rateLimit.middleware.ts`** : le comptage se fait par
  `X-User-Id`, pas par IP — une classe ou un cybercafé partage une seule IP.
- **`services/llm.service.ts`** : client Gemini créé **paresseusement**
  (`getClient()`), pour que l'import du module reste sans effet de bord quand
  aucune clé n'est configurée (tests, build, mode dégradé).

### Chaîne de robustesse du LLM

`appelModele` → `parseJsonResponse` (retire le Markdown, isole `{…}`) →
`schema.safeParse` (Zod) → nouvel essai (2 au total) → `exerciceDeSecours()`.

Le piège historique : `{}` est un JSON **valide**. Sans la validation Zod, il
traversait le service et faisait échouer l'écriture Prisma en `500`. Toute
modification du parsing doit conserver ce garde-fou.

---

## Architecture frontend

- 4 écrans dans `src/pages/` : `Accueil`, `Entrainement`, `Chat`, `Progression`.
- `src/services/api.ts` convertit toute erreur axios en `ErreurApi`, qui porte
  un **message déjà rédigé en français** et un booléen `horsLigne`. Les écrans
  n'affichent jamais de message technique brut.
- Composants partagés : `Loader`, `MessageErreur` (avec « Réessayer »),
  `TexteFormate`, `EnTete`.
- **`TexteFormate`** rend le Markdown léger (`**gras**`, `` `code` ``) que le
  modèle glisse dans ses explications, sans dépendance externe (bundle léger).
  Ne remplacez pas par `react-markdown` sans raison : le poids compte pour des
  élèves en données mobiles.
- **Palette** : les couleurs vivent dans `src/index.css` (`@theme`) et
  s'utilisent comme classes Tailwind (`bg-brand-green`, `text-brand-gold`,
  `border-brand-lines`…). N'écrivez pas de hex en dur (`bg-[#0f5f52]`).

### Conventions d'écriture

- Tout ce que voit l'élève est **en français**.
- Le code (variables, fonctions, commentaires) est également en français, pour
  rester cohérent avec le domaine métier. Suivez le style existant.
- Chaque bouton icône porte un `aria-label`. Les états de chargement utilisent
  `role="status"`, les erreurs `role="alert"`.

---

## Architecture mobile (`mobile/`)

Expo SDK 57 · React Native 0.86 · Expo Router · NativeWind. **Second client du
backend, pas une réécriture** : mêmes endpoints, mêmes contrats, même palette.

```
src/
  app/                     ← routes Expo Router (racine : src/app, pas app/)
    _layout.tsx            Stack racine ; importe global.css (NativeWind)
    (tabs)/_layout.tsx     Onglets : Accueil · Répétiteur · Progression
    (tabs)/index.tsx       Accueil (F1)
    (tabs)/chat.tsx        Chat répétiteur (F5)
    (tabs)/progression.tsx Progression + recommandation (F6, F7)
    entrainement.tsx       Écran empilé (F2, F3, F4)
  components/              Bouton, Puce, Chargement, MessageErreur,
                           TexteFormate, EnTeteEcran
  services/
    api.ts                 Client axios + ErreurApi + détection de l'URL
    identite.ts            UUID anonyme persisté (X-User-Id)
    cache.ts               Cache hors-ligne (thèmes, progression, 10 exercices)
  constants/theme.ts       Palette en constantes (ActivityIndicator, onglets…)
  types/                   Miroir du contrat backend
```

### Points d'attention

- **`urlApiParDefaut()`** (`services/api.ts`) déduit l'adresse du backend depuis
  `Constants.expoConfig.hostUri`, l'hôte Metro auquel l'app est déjà connectée.
  C'est ce qui évite le piège classique : sur un téléphone, `localhost` désigne
  le téléphone. Ne le remplacez pas par une constante en dur.
- **NativeWind** exige quatre pièces cohérentes : `babel.config.js`
  (`jsxImportSource: 'nativewind'` + preset), `metro.config.js`
  (`withNativeWind` avec `input: './src/global.css'`), `tailwind.config.js`
  (`presets: [require('nativewind/preset')]`) et `nativewind-env.d.ts`.
  Retirer l'une des quatre casse silencieusement le style.
- **Palette** : les couleurs viennent de `tailwind.config.js` et s'utilisent en
  classes (`bg-brand-green`). `constants/theme.ts` ne sert qu'aux propriétés qui
  n'acceptent pas de className (`ActivityIndicator`, options d'onglets).
- **Les routes vivent dans `src/app`**, pas `app/`. Expo Router le détecte seul
  (« Using src/app as the root directory ») ; ne créez pas de `app/` à la racine.

### Tests mobile

| Fichier | Couvre |
|---|---|
| `tests/api.test.ts` | Requêtes, en-tête `X-User-Id`, traduction des erreurs |
| `tests/cache.test.ts` | Lot d'exercices hors-ligne, bornage, corruption |
| `tests/composants.test.tsx` | TexteFormate, MessageErreur, Bouton, Chargement |
| `tests/parcours.test.tsx` | Parcours clé + les 4 écrans, API mockée |
| `tests/integration.test.ts` | **Optionnel** : contrat du vrai backend |

- **RNTL v14 : `render` et `fireEvent` sont ASYNCHRONES.** Il faut les `await`,
  sinon `screen` reste vide avec le message trompeur « render function has not
  been called ».
- Les variables citées dans un `jest.mock()` doivent être préfixées `mock`
  (règle de hoisting) — d'où `mockParametresRoute`.
- `tests/integration.test.ts` passe par le module `http` de Node : en
  environnement React Native, ni `fetch` ni l'adaptateur XHR d'axios ne
  fonctionnent sous Jest.
- Pour inspecter un bundle exporté, attention : le minifieur échappe les
  caractères non-ASCII en `\uXXXX`, et Hermes stocke les chaînes en UTF-16.
  Un `grep` UTF-8 naïf conclut à tort que les écrans sont absents.

---

## Base de données

Modèles : `User`, `Matiere`, `Theme`, `Exercice`, `Tentative`, `Progression`.

- `Theme` a `@@unique([matiereId, libelle])` — c'est ce qui rend le seed
  idempotent par `upsert`.
- `Progression` a `@@unique([userId, themeId])`.
- `Exercice.source` vaut `"ia_genere"` ou `"banque"` : utile pour mesurer la
  fréquence du repli.
- Score de maîtrise : moyenne mobile exponentielle, α = 0,3, dans
  `exercices.controller.ts` (`mettreAJourProgression`).

Après toute modification de `schema.prisma` : `npm run db:push --prefix backend`
puis `npx prisma generate`.

---

## Tests

| Fichier | Couvre |
|---|---|
| `backend/tests/api.test.ts` | Routes, authentification, validation, rate-limit, 404/400/503 |
| `backend/tests/llm.service.test.ts` | Parsing, nouvel essai, banque de secours, chat |
| `frontend/tests/App.test.tsx` | Parcours clé, erreurs + « Réessayer », progression |

- Le backend mocke `../src/services/llm.service` mais **réutilise la vraie
  classe** `LlmIndisponibleError` (`jest.requireActual`) : le contrôleur fait un
  `instanceof`, un faux constructeur casserait le test.
- Les tests LLM stubbent `@google/genai`. Le nom de la variable de mock doit
  commencer par `mock` (règle de hoisting de Jest).
- Chaque test API utilise un `X-User-Id` unique : cela isole aussi les
  compteurs de rate-limit (`RATE_LIMIT_IA_MAX=5` en test).
- `jest.config.js` ignore `/dist/` : sans cela, `npm run build && npm test`
  exécuterait deux fois la suite sur la même base et échouerait.

---

## Écarts assumés

- **Contrats d'API en `camelCase`** alors que le cahier des charges §11 écrit
  `snake_case`. Front, back et base sont cohérents entre eux ; renommer serait
  cosmétique et risqué. Documenté dans le README.
- **`strict: false`** dans `backend/tsconfig.json`. L'activer ferait remonter un
  lot d'erreurs sur du code qui fonctionne ; à traiter comme un chantier à part.
- **Pas de migrations Prisma** (`db push` uniquement). Suffisant pour le MVP ;
  passer à `prisma migrate` avant d'avoir des données de production à préserver.

---

## Pièges déjà rencontrés

- `pkill -f "node dist/src/server.js"` tue aussi le shell qui contient ce motif.
  Arrêtez les serveurs par port (`ss -ltnp`).
- Les ports 3000 et 5173 peuvent être occupés par d'autres projets de la machine.
  Surchargez avec `PORT=…` plutôt que de modifier `.env`.
- Gemini renvoie régulièrement des `503 UNAVAILABLE` transitoires. C'est le
  comportement normal du service, pas un bug : la chaîne de repli existe pour ça.
