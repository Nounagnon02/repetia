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
npm test            # toute la suite (139 tests : 67 back + 11 web + 61 mobile)
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

`exerciceDeSecours(theme, difficulte, matiere, niveau)` résout du plus précis au
plus large : **thème exact → niveau + matière → matière → générique**. Le niveau
passe avant la matière seule, car les replis par matière sont calibrés BEPC :
les consulter d'abord servirait un énoncé de 3ème à un élève de 6ème.

`backend/src/data/niveaux.ts` est la **source unique** du niveau — persona du
répétiteur, consigne de génération et banque de secours doivent parler du même.
Un code inconnu retombe sur le BEPC plutôt que de lever. N'écrivez plus de test
`niveau === 'BAC'` ailleurs : c'est ce raccourci qui faisait recevoir à un élève
de 6ème une consigne réclamant du niveau BEPC.

Le premier cycle (6ème, 5ème, 4ème × Maths, PCT, SVT) a sa propre table. Le BAC
hérite encore du repli BEPC : mauvais calibrage assumé, pas un contresens.

### Générateurs paramétrés

`backend/src/data/generateurs.ts` produit des exercices **calculés** plutôt que
stockés : un modèle d'énoncé (« Résous *ax + b = cx + d* ») dont les valeurs
varient selon un index. La solution étant calculée, elle ne peut être fausse
que si la formule l'est — d'où les tests qui **recalculent** chaque solution
depuis l'énoncé, sans réutiliser le code du générateur.

Couvre **Mathématiques et Physique-Chimie sur les 5 niveaux**, soit plus de
2 600 exercices distincts. Les matières qualitatives (SVT, langues,
Histoire-Géo, Philosophie, Lecture, Communication écrite) en sont exclues :
faire varier des nombres n'y produit pas un exercice différent.

Trois règles à respecter en ajoutant un modèle :

1. **`variantes` doit être le nombre RÉEL d'énoncés distincts.** Si deux
   paramètres défilent au même rythme, leurs périodes se resynchronisent et
   les variantes se répètent — découpez l'index en tranches
   (`i % 5`, puis `Math.floor(i / 5) % 7`…). Un test le vérifie.
2. **Chaque (niveau, difficulté) ouvre sur un modèle qui lui est propre**,
   sinon « facile » et « examen » servent le même énoncé à l'index 0 et le
   sélecteur de difficulté ne sert plus à rien.
3. **Passez par les aides `membre()` et `avecSigne()`** pour écrire un
   polynôme : elles évitent `1x`, `+ -6` et `+ 0`, tous rencontrés en écrivant
   ce module et verrouillés par un test.

`exerciceDeSecours` tire une variante **au hasard** par défaut, pour qu'un
élève qui retombe sur le repli ne revoie pas le même énoncé. Les tests passent
un index explicite, ou figent `Math.random`.

### Banque produite hors ligne

Les matières qualitatives — SVT, langues, histoire-géographie, philosophie,
lecture, communication écrite — échappent aux générateurs : y faire varier des
nombres ne produit pas un exercice différent. Leurs exercices sont **produits
par le modèle hors ligne**, validés, puis figés dans
`backend/src/data/banque-generee.json`.

```bash
npm run build --prefix backend && node recherche/src/exporter_catalogue.js
set -a && . backend/.env && set +a
recherche/.venv/bin/python recherche/src/generer_banque.py --plan
recherche/.venv/bin/python recherche/src/generer_banque.py --limite 20
recherche/.venv/bin/python recherche/src/generer_banque.py --export
```

Le script demande **neuf exercices par appel** — le quota gratuit est de
quelques dizaines d'appels par jour, un exercice par appel prendrait des
semaines — et complète en priorité le couple le plus pauvre, pour que la
couverture progresse partout plutôt qu'en un seul endroit. Il est reprenable :
chaque exercice validé est écrit aussitôt dans le JSONL, un arrêt sur quota ne
perd rien.

**Rien n'entre sans contrôle** : champ vide, énoncé de moins de vingt
caractères, explication de moins de quatre-vingts, LaTeX, titre Markdown,
doublon, **français dépouillé de ses accents** — tout cela est rejeté et
compté, jamais rafistolé.

Ce dernier filtre mérite un mot. Le modèle rend parfois un texte français privé
à la fois de ses accents et de ses apostrophes : *« Le travail alienant est il
une fatalite pour l homme »*. C'est illisible pour un élève et irrattrapable
après coup — on ne devine pas où replacer les apostrophes. Le seuil est de
1,5 % de lettres accentuées, quand un texte français courant en porte 4 à 6 % ;
il est placé bas pour tolérer les énoncés courts ou très techniques. Les
épreuves de langue en sont exclues, leur énoncé étant légitimement rédigé en
anglais, en espagnol ou en allemand. Sur la première collecte, 60 exercices sur
1 512 ont été retirés à ce titre. `banqueGeneree.test.ts`
revérifie ces invariants sur le JSON exporté, et vérifie aussi que les thèmes
cités existent bien au catalogue.

Le JSON est **importé** (`resolveJsonModule`), pas lu au démarrage : la banque
doit rester disponible même sur un disque de production en lecture seule.

### Ordre de résolution complet du repli

```
thème exact (rédigé)  →  générateur paramétré  →  banque produite hors ligne
   →  niveau + matière  →  matière  →  générique
```

Conséquence à connaître : pour une matière couverte par un générateur ou par la
banque produite, **le repli rédigé par matière devient inatteignable**. C'est
voulu — les deux sources le battent sur le niveau et sur la variété — mais cela
signifie qu'un test qui vérifie un énoncé rédigé précis cassera dès qu'on
enrichit la banque. Vérifiez l'appartenance au vivier de la matière, pas un
énoncé figé.

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
  components/              Bouton, Puce, SelecteurDifficulte, Chargement,
                           MessageErreur, TexteFormate, EnTeteEcran, Logo
    LogoMark.tsx           ← GÉNÉRÉ, ne pas éditer à la main
  services/
    api.ts                 Client axios + ErreurApi + détection de l'URL
    identite.ts            UUID anonyme persisté (X-User-Id)
    cache.ts               Cache hors-ligne (thèmes, progression, 10 exercices)
  constants/theme.ts       Palette en constantes (ActivityIndicator, onglets…)
  types/                   Miroir du contrat backend
assets/brand/              SVG de marque (mark, icon, lockup)
scripts/logo.js            Géométrie du logo — SOURCE UNIQUE
scripts/generer-assets.js  Produit les SVG, les PNG Expo et LogoMark.tsx
```

### Marque et icônes

- **Ne modifiez jamais `src/components/LogoMark.tsx` ni les PNG d'`assets/images/`
  à la main.** Ils sont générés depuis `scripts/logo.js` :
  `node scripts/generer-assets.js`. C'est ce qui garantit que le logo affiché
  dans l'application et l'icône du lanceur restent identiques.
- L'**encoche** qui sépare la planche du calot est peinte avec la couleur du
  FOND, pas avec une couleur fixe : sur un fond vert elle doit être verte, sur
  du papier elle doit être papier. D'où la prop `evide` de `LogoMark`.
- L'icône adaptative Android a un premier plan **transparent** ; la couleur vient
  de `android.adaptiveIcon.backgroundColor`. Le symbole est cadré à 52 % du carré
  car le masque du système (cercle, squircle…) rogne les bords.
- **Icônes d'interface : `lucide-react-native` uniquement.** N'ajoutez pas une
  seconde bibliothèque. Aucun emoji ne doit servir d'icône fonctionnelle ; un
  emoji n'est toléré que dans un texte conversationnel (« Salut 👋 »).

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
- `lucide-react-native` est résolu en `.mjs` sous la condition « react-native »,
  extension que le transformeur de jest-expo ne couvre pas. `jest.config.js`
  le redirige vers le build CJS via `moduleNameMapper` — pour les tests seulement.
- `react-native-svg` normalise la prop `fill` en entier ARGB
  (`{ payload, type }`) : comparer à une chaîne hexadécimale échoue.
- Pour capturer l'application dans un navigateur, l'ancien mode headless de
  Chrome n'applique pas `--window-size` à la fenêtre de mise en page et fait
  croire à un débordement horizontal. Utiliser
  `Emulation.setDeviceMetricsOverride` via le protocole DevTools.

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

---

## Écriture des mathématiques

`backend/src/services/texte.service.ts` convertit le LaTeX et le Markdown riche
que le LLM produit malgré le prompt (`$\sqrt{45}$` → `√45`, `\times` → `×`,
`### titre` → `**titre**`, `* item` → `• item`).

- La normalisation a lieu **côté serveur**, sur `enonce`, `solution`,
  `explication`, `verdict` et les réponses du chat : les deux clients en
  profitent sans code dupliqué.
- Ne remplacez pas cela par un moteur LaTeX embarqué. La cible, ce sont des
  téléphones d'entrée de gamme avec des forfaits data limités, et l'écriture
  Unicode est celle que l'élève voit au tableau.
- Le prompt système interdit explicitement le LaTeX. Le normaliseur reste
  nécessaire : un modèle finit toujours par désobéir.

## Identité visuelle partagée

`mobile/scripts/generer-assets.js` génère **trois** artefacts depuis la même
géométrie (`mobile/scripts/logo.js`) : les PNG d'Expo,
`mobile/src/components/LogoMark.tsx` et `frontend/src/components/LogoMark.tsx`.
Le web et le mobile ne peuvent donc pas afficher deux logos différents.
Ces trois fichiers sont générés — ne les modifiez pas à la main.
