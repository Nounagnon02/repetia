# RépétIA — Cahier des Charges détaillé
### Répétiteur particulier propulsé par l'IA, calé sur le programme béninois
**Concours Afri'Tech Challenge 2026 · « Notre problème, ma solution »**
**Document de spécifications — v2 (blueprint de développement)**

---

## Sommaire

1. Présentation du projet
2. Glossaire & acronymes
3. Périmètre du projet
4. Acteurs & personas
5. User stories (backlog priorisé + critères d'acceptation)
6. Spécifications fonctionnelles détaillées
7. Règles de gestion (logique métier)
8. Spécifications non-fonctionnelles
9. Spécifications techniques (architecture & stack)
10. Modèle de données
11. Conception des API (contrats REST)
12. Prompts IA (gabarits)
13. Interface & écrans (IHM)
14. Plan de tests
15. Planning de développement
16. Modèle économique
17. Indicateurs de succès (KPIs)
18. Risques & mitigations
19. Annexes (checklist de dépôt, backlog condensé)

---

## 1. Présentation du projet

**Vision.** Mettre un répétiteur particulier, disponible 24h/24 et abordable, dans le téléphone de chaque élève béninois qui prépare le BEPC ou le BAC.

**Problème.** La réussite aux examens nationaux dépend fortement du soutien scolaire hors de la classe. Or : les classes sont surchargées (50–70 élèves), un bon répétiteur coûte cher, et beaucoup de familles ne peuvent pas payer. Résultat : l'élève qui a les moyens progresse, l'autre affronte l'examen sous-préparé. La réussite devient une question de portefeuille.

**Solution.** **RépétIA** : l'élève choisit son niveau et sa matière, l'IA génère des exercices type-examen, corrige instantanément sa réponse, explique la démarche pas à pas en français simple, suit sa progression et cible ses points faibles.

**Principe directeur (fil rouge du concours).** *Notre problème, ma solution* — une inégalité éducative réelle et locale, résolue par une solution numérique accessible.

**Objectifs mesurables.**
| Réf | Objectif |
|---|---|
| O1 | Offrir un tuteur disponible 24/7 depuis un smartphone d'entrée de gamme |
| O2 | Générer des exercices calibrés sur le format réel des épreuves |
| O3 | Corriger et **expliquer la démarche**, pas seulement donner la réponse |
| O4 | Suivre la progression et cibler les points faibles |
| O5 | Rester accessible en contexte à faible débit et faible coût |

---

## 2. Glossaire & acronymes

| Terme | Définition |
|---|---|
| **BEPC** | Brevet d'Études du Premier Cycle (fin de la classe de 3ème) |
| **BAC** | Baccalauréat (fin du secondaire ; séries A, B, C, D…) |
| **APC** | Approche Par Compétences (approche pédagogique en vigueur) |
| **MVP** | Produit Minimum Viable (périmètre de la 1ère version) |
| **PoC** | Preuve de concept (la démo présentée au jury) |
| **PWA** | Progressive Web App (appli web installable, fonctionne hors-ligne) |
| **LLM** | Grand modèle de langage (le moteur IA) |
| **OTP** | Code à usage unique (authentification par SMS) |
| **Freemium** | Modèle gratuit avec limites + offre payante |

---

## 3. Périmètre du projet

### 3.1 Dans le périmètre du MVP / de la démo concours
- Niveau **BEPC**, matière **Mathématiques**, traités en profondeur.
- Génération d'exercices, correction, explication pas à pas, chat répétiteur, suivi de progression.
- 1–2 matières supplémentaires en **aperçu** (pour montrer l'extensibilité).

### 3.2 Hors périmètre (vision, après le concours)
- Toutes les matières et tous les niveaux (BEPC + séries BAC).
- Paiement mobile money complet et abonnements.
- Mode hors-ligne avancé, notifications, gamification poussée.
- Tableau de bord enseignant / offre établissements.

> **Principe :** une démo étroite et bluffante vaut mieux qu'une démo large et creuse.

---

## 4. Acteurs & personas

| Acteur | Rôle |
|---|---|
| **Élève** | Utilisateur principal : s'entraîne, se fait corriger, pose des questions |
| **Parent** | Suit la progression, finance l'abonnement (vision) |
| **Enseignant** | Valide/enrichit la banque d'exercices, prescrit des séries (vision) |
| **Administrateur** | Gère matières, thèmes, contenus, statistiques (back-office) |

**Personas.**
- **Ama, 15 ans (BEPC)** — bloque en maths, pas de répétiteur faute de moyens, révise le soir sur le téléphone familial.
- **Koffi, 18 ans (BAC série D)** — révise seul, doute de ses réponses, a besoin qu'on lui explique *pourquoi* il se trompe.
- **Mme Dossou, parent** — cherche une aide fiable et abordable pour son enfant.

---

## 5. User stories

Format : *En tant que … je veux … afin de …* — avec **critères d'acceptation** (CA). Priorité MoSCoW : **M** = Must, **S** = Should, **C** = Could.

### EPIC 1 — Onboarding & compte

**US-01 (M) — Choisir mon niveau et ma matière**
*En tant qu'élève, je veux choisir mon niveau (BEPC) et ma matière (Maths) afin de recevoir des exercices adaptés.*
CA :
- Je peux sélectionner un niveau et une matière disponibles.
- Mon choix est mémorisé pour la session.
- Un thème par défaut est proposé si je n'en choisis pas.

**US-02 (S) — Créer un compte léger par téléphone**
*En tant qu'élève, je veux m'inscrire avec mon numéro afin de retrouver ma progression plus tard.*
CA :
- Je saisis mon numéro, je reçois un code (OTP), je le valide.
- Un compte est créé avec niveau + (série si BAC).
- En cas de code erroné, un message clair m'invite à réessayer.

### EPIC 2 — Entraînement

**US-03 (M) — Recevoir un exercice sur un thème**
*En tant qu'élève, je veux générer un exercice sur un thème choisi afin de m'entraîner de façon ciblée.*
CA :
- Je choisis un thème et une difficulté (Facile / Moyen / Type examen).
- Un exercice type-BEPC s'affiche en quelques secondes.
- Un indicateur de chargement s'affiche pendant la génération.
- En cas d'échec réseau, un message + bouton « Réessayer » apparaît.

**US-04 (M) — Répondre à un exercice**
*En tant qu'élève, je veux saisir ma réponse et ma démarche afin d'être corrigé.*
CA :
- Un champ de saisie libre est disponible.
- Le bouton « Corriger » est inactif tant que le champ est vide.

**US-05 (M) — Obtenir une correction instantanée**
*En tant qu'élève, je veux savoir si ma réponse est juste afin de me situer.*
CA :
- Après validation, un verdict clair s'affiche (juste / à revoir) avec un message encourageant.
- Les formes équivalentes d'une bonne réponse sont acceptées.
- La tentative est enregistrée (si connecté).

**US-06 (M) — Passer à l'exercice suivant**
*En tant qu'élève, je veux enchaîner un nouvel exercice afin de continuer à progresser.*
CA :
- Un bouton « Suivant » régénère un exercice du même thème/difficulté.

### EPIC 3 — Explications & tuteur

**US-07 (M) — Voir l'explication pas à pas**
*En tant qu'élève, je veux comprendre la démarche afin d'apprendre, pas seulement voir la réponse.*
CA :
- Après correction, une explication détaillée, étape par étape, en français simple s'affiche.
- L'explication est disponible que la réponse soit juste ou fausse.

**US-08 (M) — Poser une question au répétiteur (chat)**
*En tant qu'élève, je veux poser une question libre afin de débloquer un point précis.*
CA :
- Une interface de discussion permet d'envoyer des messages.
- Les réponses sont pédagogiques, bienveillantes, en français simple.
- Le contexte de l'exercice en cours est pris en compte s'il existe.

### EPIC 4 — Suivi de progression

**US-09 (S) — Voir ma progression**
*En tant qu'élève, je veux visualiser mes résultats afin de voir mes progrès.*
CA :
- Un résumé affiche le nombre d'exercices faits et le taux de réussite.
- La progression par thème est consultable.

**US-10 (C) — Recevoir une recommandation de révision**
*En tant qu'élève, je veux qu'on me dise quoi réviser afin de cibler mes points faibles.*
CA :
- Le thème avec le plus faible score de maîtrise est mis en avant.

### EPIC 5 — Contenu & extensibilité

**US-11 (S) — Découvrir les autres matières / niveaux**
*En tant qu'élève, je veux voir ce qui arrive (autres matières, BAC) afin de rester motivé.*
CA :
- Un aperçu « bientôt » présente d'autres matières/niveaux.

### EPIC 6 — Vision (post-MVP)

**US-12 (C)** — *Réviser hors-ligne* (exercices mis en cache consultables sans connexion).
**US-13 (C)** — *M'abonner via mobile money* pour lever les limites du gratuit.
**US-14 (C)** — *(Enseignant)* valider/ajouter des exercices à la banque.
**US-15 (C)** — *(Parent)* suivre la progression de mon enfant.

---

## 6. Spécifications fonctionnelles détaillées

### F1 — Sélection niveau / matière / thème
- **Objectif :** cadrer le contenu proposé.
- **Déroulé :** l'élève choisit niveau → matière → thème + difficulté.
- **Règles :** thème par défaut = premier de la liste ; difficulté par défaut = « Moyen ».
- **Données :** liste des matières et thèmes chargée depuis le back-office.

### F2 — Génération d'exercice
- **Objectif :** produire un exercice calibré.
- **Déclencheur :** clic « Commencer » ou « Suivant ».
- **Déroulé :** le client demande au **backend** un exercice (thème + difficulté). Le backend appelle le LLM, **met en cache** l'exercice généré et renvoie l'énoncé (sans la solution).
- **Cas limites :** réponse LLM mal formée → le backend réessaie ou pioche un exercice de la banque. Timeout → message + « Réessayer ».
- **Sécurité :** la clé API du LLM reste **côté serveur** (jamais dans le client).

### F3 — Saisie & correction
- **Objectif :** évaluer la réponse et enregistrer la tentative.
- **Déroulé :** l'élève saisit sa réponse → le backend envoie au LLM l'énoncé + la solution attendue + la réponse de l'élève → renvoie `{correct, verdict, explication}` → stocke la tentative et met à jour la progression.
- **Règles :** accepter les formes équivalentes ; verdict toujours encourageant, jamais humiliant.
- **Cas limites :** réponse vide → bouton inactif ; échec IA → message d'erreur.

### F4 — Explication pas à pas
- **Objectif :** faire comprendre la démarche.
- **Déroulé :** l'explication renvoyée par F3 s'affiche sous la correction, mise en forme lisible (sauts de ligne préservés).

### F5 — Chat répétiteur
- **Objectif :** répondre aux questions libres.
- **Déroulé :** conversation multi-tours ; l'historique et le contexte de l'exercice sont transmis au LLM ; réponses pédagogiques.
- **Règles :** rester dans le champ scolaire ; refuser poliment le hors-sujet ; expliquer simplement.

### F6 — Suivi de progression
- **Objectif :** mesurer et afficher les progrès.
- **Déroulé :** après chaque tentative, mise à jour du score par thème ; affichage d'un résumé (exercices faits, taux de réussite) et du détail par thème.

### F7 — Recommandation (Could)
- **Objectif :** orienter la révision.
- **Déroulé :** identifier le thème au score de maîtrise le plus bas et le proposer en priorité.

---

## 7. Règles de gestion (logique métier)

| Réf | Règle |
|---|---|
| RG-01 | **Score de maîtrise** d'un thème = `round(100 × moyenne pondérée des N dernières tentatives)`, les tentatives récentes comptant davantage (moyenne mobile exponentielle, α ≈ 0,3). |
| RG-02 | **Progression de difficulté** : 3 bonnes réponses consécutives sur un thème → proposer la difficulté supérieure. |
| RG-03 | **Point faible** : un thème avec score de maîtrise < 50 % est marqué « à revoir ». |
| RG-04 | **Limite freemium** : `N_GRATUIT` exercices/jour (ex. 10) ; au-delà → invitation à s'abonner (vision). |
| RG-05 | **Cache d'exercices** : un exercice généré est réutilisable pour d'autres élèves du même thème/difficulté (réduit coût & latence). |
| RG-06 | **Équivalence de réponses** : une réponse est correcte si mathématiquement équivalente à la solution attendue (ex. `1/2` = `0,5`). |

---

## 8. Spécifications non-fonctionnelles

| Réf | Exigence | Cible |
|---|---|---|
| NF-01 Performance | Temps de réponse IA perçu | < 6 s (p95), avec indicateur de chargement |
| NF-02 Légèreté | Poids initial du bundle (PWA) | < 500 Ko JS (gzip) |
| NF-03 Données | Consommation par exercice | Minimale (texte uniquement, pas d'images lourdes) |
| NF-04 Hors-ligne | Dernier lot d'exercices consultable sans connexion | Oui (cache PWA) |
| NF-05 Compatibilité | Android 8+ / Chrome mobile ; largeur ≥ 320 px | Oui |
| NF-06 Disponibilité | Hébergement managé | ≈ 99 % |
| NF-07 Sécurité | Clé API LLM **exclusivement côté serveur** ; HTTPS ; JWT ; OTP haché ; rate-limiting | Obligatoire |
| NF-08 Protection des mineurs | Données personnelles minimales ; consentement parental (vision) ; pas de contenu inapproprié | Obligatoire |
| NF-09 Accessibilité | Contraste AA, police lisible, langue simple | Oui |
| NF-10 Localisation | Français par défaut ; explication en langue locale en option (vision) | Extensible |
| NF-11 Maintenabilité | Code modulaire, composants réutilisables, variables d'environnement | Oui |
| NF-12 Fiabilité pédagogique | Réponses vérifiées ; banque validée par des enseignants (vision) | Progressive |

---

## 9. Spécifications techniques (architecture & stack)

### 9.1 Vue d'ensemble

```
   ┌────────────┐    HTTPS/REST   ┌──────────────┐   API    ┌──────────┐
   │  Élève     │ ───────────────▶│  Backend     │ ────────▶│  LLM     │
   │  (PWA React)│◀───────────────│  (API + logique)│◀──────│  (API)   │
   └────────────┘                 └──────┬───────┘          └──────────┘
                                         │
                                         ▼
                                   ┌────────────┐
                                   │ PostgreSQL │  (comptes, progression,
                                   └────────────┘   cache d'exercices)
```

Le **client n'appelle jamais le LLM directement** : tout passe par le backend, qui détient la clé API, applique les règles de gestion, met en cache et enregistre.

### 9.2 Stack recommandée (développeur solo)

| Couche | Choix recommandé | Alternative |
|---|---|---|
| Frontend | **React + Vite + TailwindCSS**, configuré en **PWA** (`vite-plugin-pwa`) | Next.js |
| Backend | **Supabase** (PostgreSQL + Auth + Edge Functions) pour aller vite | **Node.js + Express + PostgreSQL** |
| Appel IA | Depuis une **Edge Function / route backend** (clé côté serveur), avec cache DB | — |
| Auth | OTP par SMS ou email (Supabase Auth) | JWT maison |
| Hébergement | **Vercel** ou **Netlify** (offre gratuite) → URL publique pour la démo | Render / Railway |
| Paiement (vision) | MTN MoMo / Moov Money | — |

### 9.3 Organisation du frontend (indicatif)
- `components/` : Header, ExerciceCard, CorrectionPanel, ChatPanel, ProgressBar, ThemeChip, Button…
- `screens/` : Accueil, Entrainement, Chat, Progression.
- `services/api.js` : appels au backend.
- `state/` : contexte utilisateur + progression (hooks React).
- `pwa/` : manifest + service worker (cache des assets + dernier lot d'exercices).

### 9.4 Organisation du backend (indicatif)
- Routes/fonctions : `auth`, `matieres`, `themes`, `exercices/generer`, `tentatives`, `progression`, `chat`.
- Couche `llm.js` : construction des prompts + parsing JSON robuste (nettoyage des balises Markdown, extraction du premier objet `{…}`, `try/catch` + fallback banque).
- Couche `cache.js` : lecture/écriture des exercices générés.

---

## 10. Modèle de données

**Utilisateur**
| Champ | Type | Note |
|---|---|---|
| id | uuid (PK) | |
| nom | text | |
| telephone | text (unique) | identifiant de connexion |
| niveau | enum('BEPC','BAC') | |
| serie | text (nullable) | si BAC (A, B, C, D…) |
| plan | enum('freemium','premium') | défaut freemium |
| date_inscription | timestamp | |

**Matiere**
| id (PK) | code | libelle | niveau |
|---|---|---|---|

**Theme**
| id (PK) | matiere_id (FK) | libelle | ordre |
|---|---|---|---|

**Exercice** *(cache généré + banque validée)*
| Champ | Type | Note |
|---|---|---|
| id | uuid (PK) | |
| theme_id | uuid (FK) | |
| difficulte | enum('facile','moyen','examen') | |
| enonce | text | |
| solution | text | non exposée au client avant réponse |
| explication | text | |
| source | enum('ia_genere','banque') | |
| valide_enseignant | bool | défaut false |
| date_creation | timestamp | |

**Tentative**
| id (PK) | user_id (FK) | exercice_id (FK) | reponse_eleve (text) | correct (bool) | verdict (text) | date (timestamp) |
|---|---|---|---|---|---|---|

**Progression**
| id (PK) | user_id (FK) | theme_id (FK) | nb_tentatives (int) | nb_reussies (int) | score_maitrise (int 0–100) | derniere_activite (timestamp) |
|---|---|---|---|---|---|---|

**MessageChat** *(optionnel)*
| id (PK) | user_id (FK) | role (enum user/assistant) | contenu (text) | exercice_id (FK, nullable) | date |
|---|---|---|---|---|---|

**Relations :** un `Utilisateur` a plusieurs `Tentatives` et `Progressions` ; une `Matiere` a plusieurs `Themes` ; un `Theme` a plusieurs `Exercices`.

---

## 11. Conception des API (contrats REST)

> Toutes les routes protégées attendent un en-tête `Authorization: Bearer <token>`.

**POST `/auth/otp/request`**
Req : `{ "telephone": "+229..." }` → Rés : `{ "ok": true }`

**POST `/auth/otp/verify`**
Req : `{ "telephone": "+229...", "code": "123456", "niveau": "BEPC" }`
Rés : `{ "token": "...", "user": { "id": "...", "niveau": "BEPC" } }`

**GET `/matieres?niveau=BEPC`**
Rés : `[{ "id": "...", "libelle": "Mathématiques" }]`

**GET `/matieres/{id}/themes`**
Rés : `[{ "id": "...", "libelle": "Équations du 1er degré", "ordre": 1 }]`

**POST `/exercices/generer`**
Req : `{ "theme_id": "...", "difficulte": "moyen" }`
Rés : `{ "exercice_id": "...", "enonce": "Résoudre 2x + 3 = 11." }`
*(la solution n'est pas renvoyée)*

**POST `/tentatives`**
Req : `{ "exercice_id": "...", "reponse_eleve": "x = 4" }`
Rés :
```json
{
  "correct": true,
  "verdict": "Bravo, c'est juste !",
  "explication": "On isole x : 2x = 11 - 3 = 8, donc x = 8/2 = 4.",
  "progression": { "theme_id": "...", "score_maitrise": 78 }
}
```

**GET `/progression`**
Rés :
```json
{
  "global": { "faits": 12, "reussis": 9, "taux": 75 },
  "par_theme": [{ "theme_id": "...", "libelle": "Thalès", "score_maitrise": 40 }]
}
```

**POST `/chat`**
Req : `{ "message": "Pourquoi on change le signe ?", "exercice_id": "...", "historique": [{ "role": "user", "content": "..." }] }`
Rés : `{ "reponse": "Quand on fait passer un terme de l'autre côté du =, il change de signe parce que…" }`

---

## 12. Prompts IA (gabarits)

> À utiliser côté backend. Réglages conseillés : température modérée pour la génération, basse pour la correction.

**Prompt système (persona répétiteur) :**
> « Tu es RépétIA, un répétiteur particulier bienveillant pour des élèves béninois qui préparent le BEPC. Tu enseignes les mathématiques du programme béninois. Tu expliques toujours PAS À PAS, en français simple et clair, avec encouragements. Tu ne donnes jamais seulement la réponse : tu fais comprendre la démarche. Quand c'est utile, tu prends des exemples proches du quotidien au Bénin. »

**Génération d'exercice :**
> « Génère UN exercice de mathématiques de niveau BEPC (3ème, programme béninois) sur le thème "{theme}". Difficulté : {difficulte}. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises Markdown : `{"enonce": "...", "solution": "...", "explication": "..."}`. enonce = énoncé clair et court ; solution = réponse finale concise ; explication = résolution détaillée, étape par étape. »

**Correction :**
> « Voici un exercice, la solution attendue et la réponse d'un élève. Exercice : {enonce}. Solution attendue : {solution}. Réponse de l'élève : {reponse}. L'élève a-t-il juste (accepte les formes équivalentes) ? Réponds UNIQUEMENT en JSON valide : `{"correct": true/false, "verdict": "phrase courte et encourageante", "explication": "la bonne démarche pas à pas, en français simple"}`. »

**Chat :** prompt système ci-dessus + historique de la conversation + contexte de l'exercice en cours s'il existe.

**Parsing robuste (règle backend) :** retirer les balises ```` ```json ````/```` ``` ````, extraire le premier bloc `{…}`, `JSON.parse` dans un `try/catch` ; en cas d'échec, réessayer une fois puis basculer sur un exercice de la banque.

---

## 13. Interface & écrans (IHM)

| Écran | Contenu principal |
|---|---|
| **Accueil** | Message d'accueil, sélection thème (chips) + difficulté, bouton « Commencer », accès au chat, résumé de progression |
| **Entraînement** | Carte d'énoncé (style cahier), champ de réponse, bouton « Corriger », panneau de correction (verdict + explication), boutons « Suivant » / « Une question ? » |
| **Chat répétiteur** | Fil de discussion (bulles élève/RépétIA), champ de saisie, envoi |
| **Progression** | Taux de réussite global, détail par thème, thème à revoir |

**Direction visuelle :** mobile-first, ton scolaire et chaleureux ; vert profond (éducation) + accent doré, fond papier ; correction verte / rouge ; typo sobre et lisible. *(Voir le prototype fonctionnel fourni comme référence à reproduire.)*

---

## 14. Plan de tests

**Tests fonctionnels (cas nominaux)**
| # | Cas | Attendu |
|---|---|---|
| T1 | Générer un exercice sur un thème | Un énoncé s'affiche |
| T2 | Répondre juste | Verdict positif + explication |
| T3 | Répondre faux | Verdict « à revoir » + explication |
| T4 | Poser une question au chat | Réponse pédagogique cohérente |
| T5 | Enchaîner « Suivant » | Nouvel exercice généré |
| T6 | Consulter la progression | Compteurs et taux corrects |

**Tests aux limites / robustesse**
| # | Cas | Attendu |
|---|---|---|
| T7 | Champ de réponse vide | Bouton « Corriger » inactif |
| T8 | Panne réseau pendant la génération | Message clair + « Réessayer » |
| T9 | Réponse IA au JSON malformé | Fallback (nouvel essai ou banque), pas de plantage |
| T10 | Réponse équivalente (ex. `0,5` vs `1/2`) | Considérée correcte |

---

## 15. Planning de développement

**Échéance concours : 30 août 2026, minuit GMT** *(déposer en avance, pas à 23 h 59).*

| Jalon | Contenu |
|---|---|
| **J‑2 (aujourd'hui)** | Valider ce cahier des charges ; initialiser le projet (front + back) ; brancher le LLM ; **génération + correction** fonctionnelles |
| **J‑1** | Chat répétiteur ; suivi de progression ; polish UI ; **vidéo démo (2–3 min)** ; remplir le formulaire ; note technique ; CV |
| **Jour J** | Relecture ; **déploiement** (URL publique) ; **dépôt** des 3 pièces + lien démo, avec marge |

**Après le concours :** banque validée par des enseignants, ajout des matières et séries BAC, mobile money, mode hors-ligne, pilote en établissement.

---

## 16. Modèle économique (léger)

- **Freemium** : gratuit jusqu'à N exercices/jour ; **abonnement abordable** (quelques centaines de FCFA/mois, très en dessous d'un répétiteur humain).
- **B2B écoles** : licences pour établissements.
- **Partenariats** : ONG, collectivités, opérateurs télécoms (data zéro-rating pour l'éducation), sponsors.

---

## 17. Indicateurs de succès (KPIs)

- Nombre d'élèves actifs / inscrits.
- Nombre d'exercices résolus.
- Taux de complétion des séries.
- Progression moyenne (score de maîtrise dans le temps).
- Satisfaction élèves/parents.
- *(à terme)* impact sur les résultats aux examens.

---

## 18. Risques & mitigations

| Risque | Mitigation |
|---|---|
| Erreurs de l'IA (surtout en maths) | Vérification, correction basée sur la solution attendue, banque validée par des enseignants à terme |
| Coût des appels IA | Cache des exercices fréquents, freemium, modèle adapté |
| Accès data / smartphones limités | PWA légère, hors-ligne, faible consommation, partenariat zéro-rating, SMS/USSD (futur) |
| Confiance familles/enseignants | Validation pédagogique, transparence, témoignages |
| Concurrence générique | Ancrage curriculum **béninois** + langue locale = barrière difficile à copier |
| Délai (2 jours) | Périmètre MVP resserré (BEPC + Maths), prototype de référence déjà disponible |

---

## 19. Annexes

### 19.1 Checklist de dépôt — Afri'Tech Challenge 2026
- [ ] Formulaire de candidature rempli
- [ ] Note technique
- [ ] CV
- [ ] Lien vers la démo déployée + vidéo (2–3 min)
- [ ] Dépôt effectué **avant le 30 août, minuit GMT** (avec marge)

**Rappel du barème (200 pts + 40 vote public) :** PoC/démo (40), présentation (25), ancrage local (25), impact social & économique (25), innovation (25), faisabilité technique (20), vote du public (jusqu'à 40).

### 19.2 Backlog condensé (ordre de développement conseillé)
1. Sélection thème/difficulté (US-01)
2. Génération d'exercice via backend + cache (US-03, F2)
3. Saisie + correction + explication (US-04, US-05, US-07)
4. « Suivant » (US-06)
5. Chat répétiteur (US-08)
6. Suivi de progression (US-09)
7. Comptes OTP (US-02) — si le temps le permet
8. Aperçu autres matières + recommandation (US-11, US-10)

---

*Fin du cahier des charges détaillé — RépétIA v2. Prêt pour le développement.*
