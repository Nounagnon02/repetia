# RépétIA — Note technique

**Concours** Afri'Tech Challenge 2026 · **Candidat** Prince Kangbode · **Version** 1.0 · **30 août 2026**

| Accès | Adresse |
|---|---|
| Démonstration | https://repetia.vercel.app |
| API publique | https://repetia-api.onrender.com/health |
| Code source | https://github.com/Nounagnon02/repetia |
| Application Android | Expo — build EAS, APK sur demande |

Un répétiteur particulier propulsé par l'IA pour les **six matières écrites du BEPC béninois**.
Un backend, deux clients : une application web installable et une application Android native.

---

## 1. Le problème

Au Bénin, le répétiteur particulier est la norme pour préparer le BEPC — et il coûte entre
5 000 et 15 000 FCFA par mois. Beaucoup de familles ne peuvent pas se le permettre. L'élève se
retrouve seul face à un exercice qu'il ne comprend pas, avec un manuel qui donne la réponse mais
jamais la démarche.

Les ressources en ligne existantes échouent sur trois points concrets : elles ne suivent pas le
programme béninois, elles supposent une connexion stable et un forfait de données confortable, et
elles donnent des corrigés au lieu d'expliquer.

**Le pari de RépétIA.** Ce n'est pas une banque d'exercices. C'est un répétiteur : il génère un
exercice calé sur le programme, corrige la réponse de l'élève **en expliquant la démarche pas à
pas**, répond aux questions de suivi, et retient les thèmes à retravailler.

## 2. La solution

| Réf | Fonctionnalité | État |
|---|---|---|
| F1 | Sélection de la matière (6), du thème (46) et de la difficulté | Livré |
| F2 | Génération d'un exercice par l'IA, adapté au thème et au niveau | Livré |
| F3 | Saisie de la réponse et correction, formes équivalentes acceptées | Livré |
| F4 | Explication pas à pas après chaque tentative | Livré |
| F5 | Chat répétiteur, avec le contexte de l'exercice en cours | Livré |
| F6 | Suivi de progression : taux global et maîtrise par thème | Livré |
| F7 | Recommandation du thème à revoir en priorité | Livré |

### Les six matières couvertes

| Matière | Thèmes | Exemples |
|---|---|---|
| Mathématiques | 8 | Thalès, Pythagore, équations, racines carrées |
| Physique-Chimie-Technologie | 8 | Loi d'Ohm, forces, réactions chimiques |
| Sciences de la Vie et de la Terre | 8 | Digestion, génétique, écosystèmes |
| Français | 7 | Grammaire, conjugaison, figures de style |
| Anglais | 7 | Tenses, reported speech, comprehension |
| Histoire-Géographie | 8 | Indépendances, climats et économie du Bénin |

**46 thèmes au total.** Le modèle de données portait matière et niveau dès la première version :
l'ajout des cinq matières n'a demandé **aucune modification de l'API**.

## 3. Architecture

```
   Web (PWA React) ─┐
                    ├── HTTPS ──▶  Backend Express  ──▶  Modèle Gemini
   Android (Expo)  ─┘                    │                (côté serveur)
                                         ▼
                                    PostgreSQL
```

Aucune flèche ne relie un client au modèle. C'est la contrainte structurante du projet.

> **Pourquoi la clé ne descend jamais dans le client**
>
> Une clé d'API embarquée dans une application mobile est extractible en quelques minutes : il
> suffit de décompiler l'APK. Elle serait alors utilisée par des tiers, aux frais du projet,
> jusqu'à épuisement du quota — et l'application tomberait pour tous les élèves.
>
> Un seul fichier importe le SDK d'IA : `backend/src/services/llm.service.ts`.
> Vérification reproductible : `grep -r "LLM_API_KEY\|GoogleGenAI" frontend/src mobile/src`
> ne renvoie rien. L'audit du bundle Android exporté ne renvoie rien non plus.

### Pile technique

| Couche | Choix | Version |
|---|---|---|
| Backend | Node.js · Express · TypeScript | Express 5.2 |
| Base de données | Prisma — SQLite en local, PostgreSQL en production | Prisma 5.22 |
| Validation | Zod — entrées HTTP *et* sorties du modèle | Zod 4.5 |
| Sécurité | Helmet · CORS · limitation de débit | rate-limit 8.6 |
| Client web | React · Vite · Tailwind — PWA installable | React 19.2 |
| Client mobile | React Native · Expo · Expo Router · NativeWind | Expo SDK 57 |
| IA | Google Gemini via `@google/genai` | 2.19 |

Le backend ne dépend que de **neuf paquets en production**. C'est un choix : moins de dépendances,
moins de surface de faille et de maintenance.

## 4. Contrat d'API

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/matieres` | Matières du niveau |
| `GET` | `/api/matieres/:id/themes` | Thèmes, triés par progression pédagogique |
| `POST` | `/api/exercices/generer` | Génère un exercice — **ne renvoie ni solution ni explication** |
| `POST` | `/api/tentatives` | Corrige, explique, met à jour la maîtrise |
| `GET` | `/api/progression` | Global, par thème, et thème à revoir |
| `POST` | `/api/chat` | Question libre, avec l'exercice en contexte |
| `GET` | `/health` | État du serveur, de la base et de la configuration IA |

> **La solution reste au serveur jusqu'à la tentative**
>
> `/api/exercices/generer` renvoie l'énoncé, et rien d'autre. La solution est écrite en base mais
> jamais transmise avant que l'élève ait soumis sa réponse — sinon il suffirait d'ouvrir les outils
> de développement pour lire le corrigé, et l'outil perdrait tout intérêt pédagogique. Un test
> verrouille ce comportement : s'il casse, c'est la fonctionnalité qui est cassée, pas le test.

**Score de maîtrise.** Après chaque tentative, le score du thème suit une moyenne mobile
exponentielle (α = 0,3) : `nouveau = ancien × 0,7 + (100 si juste, sinon 0) × 0,3`. Les tentatives
récentes pèsent donc davantage — un élève qui progresse voit son score remonter au lieu d'être puni
indéfiniment par ses débuts.

## 5. Robustesse

Un modèle de langage tombe, sature, ou renvoie du texte inexploitable. Sur un produit destiné à des
élèves, une panne d'IA ne doit pas devenir une page blanche. Quatre niveaux de repli s'enchaînent
avant tout échec visible :

1. **Nettoyage de la réponse** — retrait des balises Markdown, extraction du premier objet JSON
   dans un texte bavard.
2. **Validation par schéma** — les trois champs doivent être présents *et* non vides. Un `{}` est
   un JSON parfaitement valide : sans cette étape il traversait le service et faisait échouer
   l'écriture en base par une erreur 500. C'est un incident réel, corrigé.
3. **Second modèle** — le quota gratuit se compte par modèle et par jour. Quand le principal est
   épuisé, un modèle allégé prend le relais : l'élève garde une vraie explication.
4. **Banque locale** — 42 exercices rédigés à la main. Les 8 thèmes de mathématiques sont couverts
   au thème près ; chaque autre matière dispose de trois exercices justes et de son niveau. Un élève
   d'anglais ne reçoit jamais un énoncé de mathématiques. Marqués `source: "banque"` en base, ce qui
   permet de mesurer la fréquence du repli.

La correction dispose du même filet. Le chat, lui, renvoie une erreur `503` explicite : il n'existe
pas de repli honnête à une question libre, et faire passer un message d'erreur pour une réponse du
répétiteur serait pire que d'admettre la panne.

> **Écrire les mathématiques comme au tableau**
>
> Les consignes d'écriture symbolique ne s'appliquent qu'aux matières scientifiques : les imposer
> en anglais ou en français n'aurait aucun sens. Le prompt est donc paramétré par matière.
>
> Le modèle produit spontanément du LaTeX — l'élève lisait `$\sqrt{45}$` tel quel. Embarquer un
> moteur LaTeX aurait coûté plusieurs centaines de kilo-octets sur des téléphones d'entrée de gamme,
> pour afficher ce qu'un élève lit déjà au tableau. Le serveur convertit donc en Unicode avant
> d'envoyer : `√45`, `x²`, `3 × 5`, `≤`, `(MN) ∥ (BC)`. Les deux clients en profitent sans une ligne
> de code dupliquée.

## 6. Décisions dictées par le contexte béninois

> **La limitation de débit compte par élève, pas par adresse IP**
>
> Une classe entière ou un cybercafé partage une seule adresse IP publique. Limiter par IP — le
> réglage par défaut de toutes les bibliothèques — aurait bloqué tout un établissement dès que
> quelques élèves travaillent ensemble. Le compteur porte donc sur l'identifiant de l'élève :
> 20 appels IA par minute chacun.

> **Aucun compte, aucune donnée personnelle**
>
> L'élève n'a ni email, ni téléphone, ni mot de passe à fournir. Un identifiant anonyme est généré
> au premier lancement et conservé sur l'appareil. Le serveur n'associe à cet identifiant que des
> données scolaires. Pour des mineurs, c'est la position la plus sûre : il n'y a rien à fuiter.

> **Le poids compte autant que les fonctionnalités**
>
> L'application web pèse **97 Ko compressés**, très en dessous de la cible de 500 Ko. Le rendu du
> texte enrichi est fait à la main plutôt qu'avec une bibliothèque Markdown, et les icônes sont
> vectorielles. Sur un forfait de données prépayé, chaque kilo-octet est un coût réel pour la famille.

### Fonctionnement dégradé

- La coquille de l'application et les thèmes sont mis en cache : elle s'ouvre sans réseau.
- Les **dix derniers exercices** travaillés, corrections comprises, restent consultables hors connexion.
- Générer un exercice ou discuter avec le répétiteur exige une connexion : ce sont des appels au modèle.
- Sans clé d'API configurée, le serveur démarre quand même et sert la banque locale.

### Accessibilité

Interface intégralement en français, langage simple. Contrastes conformes AA. Chaque bouton icône
porte un libellé accessible, les groupes de choix sont navigables au clavier, les chargements sont
annoncés aux lecteurs d'écran et les erreurs signalées comme telles. Mise en page utilisable dès
320 pixels de large.

## 7. Qualité

**140 tests automatisés, 0 échec** — backend 68, mobile 61, web 11.

Une commande unique, `npm test`, couvre les trois espaces. Le service d'IA est systématiquement
simulé : la suite tourne sans clé, sans réseau et sans coût. Une base de test dédiée est recréée à
chaque exécution, séparée de la base de développement.

Ce que les tests verrouillent, entre autres :

- La génération ne renvoie jamais la solution ni l'explication.
- Une réponse d'IA malformée — `{}`, JSON tronqué, texte libre, champ vide — déclenche le repli
  sans planter.
- Une panne du chat produit un `503` et une vraie erreur affichée, jamais une fausse réponse.
- La conversion des mathématiques, sur les cas réellement observés en production.
- La validation des entrées, la limitation de débit, le calcul du score de maîtrise.

S'y ajoute une suite d'intégration optionnelle qui valide le contrat contre le *vrai* backend
déployé, modèle d'IA compris. Elle est passée au vert sur l'instance de production.

## 8. Déploiement

| Composant | Hébergement | Adresse |
|---|---|---|
| Application web | Vercel | repetia.vercel.app |
| API | Render — région Francfort | repetia-api.onrender.com |
| Base de données | PostgreSQL 16 managé | interne, non exposée |
| Application Android | EAS Build | APK / AAB |

Francfort est la région la plus proche de l'Afrique de l'Ouest chez cet hébergeur. Le schéma de base
est appliqué au build, et le catalogue — matière et huit thèmes — s'installe seul au démarrage du
serveur : une base repartie de zéro se remplit d'elle-même, sans commande à lancer.

## 9. Limites assumées

Les dire est plus utile que les taire — elles conditionnent la suite du projet.

| Limite | Conséquence | Traitement prévu |
|---|---|---|
| Mise en veille de l'offre gratuite | La première visite après 15 min d'inactivité prend ~30 s | Offre payante, ou tâche de réveil planifiée |
| Quota du palier gratuit de l'IA | Sous forte affluence, l'application sert la banque locale | Activation de la facturation à l'usage |
| Un seul niveau | BEPC uniquement, les six matières écrites | Le modèle porte déjà le niveau : ajouter le BAC est un seed |
| Thèmes non validés officiellement | Découpage établi d'après le programme, à confirmer avec des enseignants | Relecture par des professeurs du secondaire |
| Pas de migrations de base | Suffisant sans données de production à préserver | Migrations versionnées avant la mise en service réelle |
| Contenu non validé par des enseignants | La pertinence repose sur le modèle et sur la banque | Relecture par des professeurs de mathématiques du secondaire |

### Suite envisagée

- Validation des exercices générés par un panel d'enseignants béninois.
- Extension au BAC — l'architecture le prévoit déjà.
- Enrichissement de la banque de secours thème par thème sur les cinq nouvelles matières.
- Mode « examen blanc » chronométré sur sujets d'annales.
- Explications en langues locales, pour les élèves qui butent d'abord sur le français.

---

*« Notre problème, ma solution. »* Le code, les tests et la présente note sont publics :
https://github.com/Nounagnon02/repetia
