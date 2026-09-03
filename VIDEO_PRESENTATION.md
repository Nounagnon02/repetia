# Vidéo de présentation — RépétIA

Kit de production pour la vidéo de démonstration du hackathon.
**Durée cible : 2 min 40.** Format 16:9, 1920×1080, 30 fps.

---

## ⚠️ Étape 0 — à faire AVANT de filmer

Deux vérifications, sans lesquelles la vidéo montrera autre chose que ce que
dit la voix off.

### 1. La production est en retard sur le code

`https://repetia-api.onrender.com/api/matieres` sert aujourd'hui **6 matières,
niveau BEPC uniquement**, avec l'ancien libellé « Français ». Le code, lui, gère
**25 couples matière × niveau sur 5 niveaux** (6ème, 5ème, 4ème, BEPC, BAC) et a
remplacé « Français » par *Lecture* et *Communication écrite*.

La cause : **24 commits ne sont pas poussés**. Render ne redéploie que sur
`git push`.

```bash
git push origin main       # déclenche le redéploiement Render
# attendre ~3 min, puis vérifier :
curl -s https://repetia-api.onrender.com/api/matieres | python3 -c "import json,sys;print(len(json.load(sys.stdin)),'matières')"
```

Tant que cette commande ne renvoie pas 25, **ne filmez pas** : le script parle
de la sixième au baccalauréat.

### 2. Réveiller l'API avant chaque prise

Render (offre gratuite) met le service en veille après 15 minutes d'inactivité.
Mesuré aujourd'hui : **34 secondes** au réveil, **0,8 seconde** à chaud.

Trente-quatre secondes de chargement à l'écran ruinent une démonstration.
Lancez ceci **5 minutes avant** de filmer, et laissez-le tourner :

```bash
while true; do curl -s -o /dev/null https://repetia-api.onrender.com/health; sleep 240; done
```

---

## Le script narré

À lire à voix haute, calmement. **Votre voix, pas une voix de synthèse** : un
jury francophone préfère entendre le porteur du projet. Les durées sont des
repères, pas des contraintes.

| # | Temps | Image | Texte à dire |
|---|---|---|---|
| 1 | 0:00–0:12 | B-roll IA — élève bloqué, le soir | « Au Bénin, chaque année, des dizaines de milliers d'élèves préparent le BEPC. Le soir, quand une question résiste, il n'y a souvent personne pour l'expliquer. » |
| 2 | 0:12–0:22 | B-roll IA — la main prend le téléphone | « Un répétiteur particulier coûte cher. Un téléphone, presque toutes les familles en ont un. » |
| 3 | 0:22–0:30 | Carton logo | « RépétIA, c'est un répétiteur qui tient dans ce téléphone. » |
| 4 | 0:30–0:50 | **Capture web** — choix niveau → matière → thème | « L'élève choisit son niveau — de la sixième au baccalauréat —, sa matière, son thème, et sa difficulté. L'application lui génère un exercice sur mesure. » |
| 5 | 0:50–1:12 | **Capture web** — il répond, puis la correction s'affiche | « Il répond. Et c'est là que tout se joue : il ne reçoit pas seulement un verdict. Il reçoit la correction, expliquée pas à pas — parce qu'un élève qui voit la bonne réponse sans le raisonnement n'a rien appris. » |
| 6 | 1:12–1:26 | **Capture web** — le chat | « S'il bloque encore, il demande. Le répétiteur lui répond, dans sa langue de classe. » |
| 7 | 1:26–1:40 | **Capture web** — progression | « L'application retient ce qu'il maîtrise, et lui propose ensuite ce qu'il maîtrise le moins. » |
| 8 | 1:40–1:58 | **Capture mobile** — mode avion | « Nous l'avons conçue pour le réseau béninois, pas pour une démonstration. Coupez la connexion : les exercices déjà chargés restent là. Si le modèle d'IA tombe en panne, une banque de plusieurs milliers d'exercices vérifiés prend le relais, calibrée sur la classe de l'élève. Il ne voit jamais d'écran d'erreur. » |
| 9a | 1:58–2:12 | Carton « modèle entraîné » | « Nous ne nous sommes pas contentés d'appeler une API. Nous avons entraîné notre propre modèle à reconnaître la matière d'une question, et nous l'avons évalué sur trois cent dix-huit extraits d'annales réelles du BEPC. » |
| 9b | 2:12–2:26 | Carton « latence » | « Il décide en deux dixièmes de milliseconde, là où l'appel au grand modèle en demande près de trois. Et nos résultats disent aussi ce qui ne marche pas encore : c'est à cela que sert la mesure. » |
| 10 | 2:26–2:40 | Carton final + URL | « RépétIA est en ligne, gratuit, et tourne sur un téléphone d'entrée de gamme. Parce que ce qui manque à l'élève béninois, ce n'est pas l'envie. C'est quelqu'un pour lui expliquer. » |

**Environ 310 mots** — soit 2 min 05 de parole à débit normal, plus les
respirations et les temps d'image : on arrive à 2 min 40.

### Une règle à ne pas enfreindre

**Ne prononcez aucun chiffre que l'image ne montre pas.** Le jury vérifie. Le
plan 9 est le seul qui cite des mesures, et il affiche les figures
correspondantes. C'est pour cela qu'il est construit ainsi.

---

## Les prompts Veo (Gemini → Vidéos)

Quatre plans d'habillage, **8 secondes chacun**. Générez-les un par un, en
format **Paysage (16:9)**.

Trois consignes valables pour les quatre : ne demandez **jamais** de texte à
l'écran (Veo le rend illisible), ne demandez **aucune parole** (votre voix off
passera par-dessus), et regénérez si un visage ou une main paraît déformé.

### Plan 1 — l'élève bloqué

```
Un adolescent béninois de quinze ans, assis à une petite table en bois dans le
séjour d'une maison modeste à Cotonou, le soir. Un cahier de mathématiques
ouvert devant lui, un stylo à la main. Il fixe la page, sourcils froncés,
visiblement bloqué. Il pose son stylo et se passe la main sur le visage.
Éclairage : une seule ampoule à économie d'énergie, lumière chaude et faible,
ombres douces. Un ventilateur brasse l'air en arrière-plan.
Caméra : plan rapproché poitrine, fixe, très légère contre-plongée, objectif
50 mm, faible profondeur de champ, arrière-plan flou.
Style : documentaire intimiste, couleurs chaudes et naturelles, grain léger.
Audio : grillons nocturnes, ronronnement de ventilateur. Aucune parole.
Aucun texte à l'image.
```

### Plan 2 — le téléphone

```
Gros plan sur les mains d'un adolescent qui saisit un téléphone Android
d'entrée de gamme posé à côté d'un cahier d'écolier. L'écran s'allume et éclaire
son visage d'une lueur bleutée dans une pièce sombre. Le geste est d'abord
hésitant, puis décidé.
Caméra : macro sur les mains, puis léger panoramique vertical vers le visage.
Mise au point sur les doigts au départ, sur les yeux à l'arrivée.
Éclairage : lueur froide de l'écran contre une lampe chaude en arrière-plan.
Style : documentaire, réaliste, peu contrasté.
Audio : froissement de papier, léger déclic. Aucune parole.
L'écran du téléphone doit rester une lueur diffuse, sans interface ni texte
lisible.
```

### Plan 3 — le collège (transition, optionnel)

```
Cour d'un collège public au Bénin en fin de journée. Des élèves en uniforme
kaki sortent des salles de classe en discutant, sacs à l'épaule. Un manguier
projette son ombre sur le sol de latérite.
Éclairage : soleil rasant de fin d'après-midi, lumière dorée, poussière en
suspension dans les rayons.
Caméra : travelling latéral lent, hauteur d'épaule, objectif 35 mm.
Style : documentaire, couleurs chaudes et saturées, naturel.
Audio : brouhaha lointain d'élèves, chants d'oiseaux, une moto au loin.
Aucune parole distincte. Aucun texte à l'image.
```

### Plan 4 — la compréhension (clôture)

```
Le même adolescent, dans la même pièce, mais détendu : il sourit légèrement,
referme son cahier et s'adosse à sa chaise. Il a compris.
Éclairage : lumière chaude d'ampoule, plus douce que dans le premier plan.
Caméra : plan rapproché, très léger recul de la caméra, presque imperceptible.
Style : documentaire intimiste, tonalité optimiste et paisible.
Audio : ambiance nocturne calme, grillons. Aucune parole.
Aucun texte à l'image.
```

---

## Les captures d'écran (le cœur de la vidéo)

Six plans à filmer réellement. **C'est ce que le jury veut voir.**

### Réglages avant de lancer l'enregistreur

- Fermez les onglets et notifications ; masquez la barre de favoris.
- Zoom du navigateur à **125 %** — le texte doit rester lisible une fois la
  vidéo compressée par la plateforme de dépôt.
- Faites une **répétition complète à blanc** : l'enregistrement montre les
  hésitations.
- Déplacez la souris lentement. Marquez une pause d'une seconde après chaque
  clic, avant le suivant.

### Capture sur le web — `Ctrl+Alt+Shift+R`

L'enregistreur intégré de GNOME 46. Il fonctionne sous Wayland, sans rien
installer, et **n'a pas** la limite de 30 secondes des anciennes versions
(vérifié sur votre machine). Les fichiers arrivent dans `~/Vidéos`.
`Ctrl+Alt+Shift+R` de nouveau pour arrêter.

| Plan | Ce qu'on filme | Durée |
|---|---|---|
| 4 | Page d'accueil → choix du niveau → matière → thème → difficulté → « Générer » | ~20 s |
| 5 | L'exercice s'affiche, on saisit une réponse, on valide, la correction se déroule | ~22 s |
| 6 | Onglet Chat : on tape une vraie question, la réponse arrive | ~14 s |
| 7 | Onglet Progression : les barres de maîtrise, la recommandation | ~14 s |

### Capture sur mobile — plan 8

Le plus convaincant de la vidéo, parce qu'il montre une contrainte réelle.

1. Ouvrez l'application, chargez quelques exercices.
2. Lancez l'enregistreur d'écran du téléphone.
3. Activez le **mode avion** — que l'on voie l'icône apparaître.
4. Naviguez : les exercices en cache restent accessibles.

Récupérez le fichier par câble ou par `adb pull`.

---

## Les cartons (plans 3, 9, 10)

Générés par `tools/cartons-video.sh` (voir plus bas) :

| Fichier | Contenu | Plan |
|---|---|---|
| `carton-01-titre.png` | Logo RépétIA + baseline | 3 |
| `carton-02-recherche.png` | Généralisation : validation croisée contre annales réelles | 9a |
| `carton-03-latence.png` | Distribution de la latence des deux modèles | 9b |
| `carton-04-final.png` | URL + baseline | 10 |

Les cartons 2 et 3 affichent **vos vraies figures**, celles des notebooks. Une
courbe mesurée vaut mieux qu'une animation générée : elle prouve que la mesure
a eu lieu. Un seul graphique par carton — deux côte à côte deviennent illisibles
une fois la vidéo compressée.

### Les chiffres exacts, si le jury vous interroge

| Mesure | Valeur |
|---|---|
| Corpus d'entraînement | 149 énoncés, 9 matières |
| Jeu de test | 318 passages d'annales réelles océrisées |
| F1 macro, validation croisée | 0,881 (SVM caractères) |
| F1 macro, annales réelles | 0,581 — contre 0,049 pour la référence triviale |
| Latence du classifieur | 0,18 ms par passage |
| Latence de l'appel LLM le plus rapide | 2,8 s |
| Rapport | ≈ 15 000× |

**Assumez la limite si on vous la demande** : le modèle n'est pas prêt pour la
production, il confond Lecture et Communication écrite dans 56 % des cas, et le
notebook l'écrit noir sur blanc. Devant un jury technique, une limite mesurée
et nommée vaut mieux qu'un score gonflé.

### Si on vous interroge sur la banque de secours

Elle a deux moitiés, et il vaut mieux le dire que le cacher.

- **Mathématiques et physique-chimie** : les exercices sont **calculés**, pas
  stockés. Un modèle d'énoncé, des valeurs qui varient, une solution obtenue
  par le calcul — donc juste par construction. Plus de 2 600 énoncés distincts,
  et des tests qui recalculent les solutions depuis l'énoncé pour le prouver.
- **Les autres matières** : les exercices sont **produits par le modèle hors
  ligne, puis validés un par un** avant d'entrer dans le dépôt. Ni LaTeX, ni
  titre Markdown, ni doublon, ni explication trop courte — le contrôle est
  automatique et ce qui échoue est rejeté, pas rafistolé.

Ne dites pas « écrits à la main » : ce n'était vrai que des 55 premiers.

---

## Montage

Vous n'avez ni OBS ni Kdenlive installés, mais `ffmpeg` est présent. Deux voies.

### Voie A — assemblage par script (aucune installation)

1. Enregistrez la voix off **en une seule prise** dans `montage/voix.wav`
   (l'application « Enregistreur de sons » de GNOME suffit ; recommencez
   autant de fois qu'il faut, c'est la piste qui porte la vidéo).
2. Rangez les rushes dans `montage/` en les nommant `01-`, `02-`… dans l'ordre.
3. Lancez `bash tools/monter-video.sh`.

Le script met tous les plans au même format, les enchaîne, cale la voix off
par-dessus et produit `montage/repetia-presentation.mp4`.

### Voie B — éditeur graphique

```bash
sudo apt install kdenlive
```

Plus souple pour ajuster la synchronisation image/voix au quart de seconde.
Si le rendu final compte plus que le temps passé, prenez cette voie.

### Dans les deux cas

- **Sous-titres français incrustés.** Beaucoup de jurys regardent sans le son,
  et une connexion faible dégrade l'audio avant l'image.
- **Musique de fond** : facultative, et à −25 dB sous la voix si vous en mettez.
  Une musique trop forte fait perdre plus de points qu'elle n'en fait gagner.
- **Vérifiez le poids final** avant dépôt : beaucoup de formulaires plafonnent
  à 100 Mo.

---

## Ordre de travail conseillé

1. `git push origin main`, attendre le redéploiement, **vérifier les 25 matières**.
2. Générer les 4 clips Veo (comptez plusieurs essais par plan).
3. Générer les cartons : `bash tools/cartons-video.sh`.
4. Filmer les captures web, puis la capture mobile.
5. Enregistrer la voix off.
6. Monter, sous-titrer, exporter.

L'étape 1 conditionne les étapes 4 et 5. Ne l'inversez pas.
