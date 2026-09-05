# Candidature AI4Youth-Lomé 2026 — réponses à recopier

Thème : **Éducation** · Catégorie : **Application (Intégration et Expérience IA)**

---

## Description du projet & Approche

> À recopier tel quel. **893 caractères** — la limite est de 900.

Au Bénin, des dizaines de milliers d'élèves préparent le BEPC sans personne pour leur expliquer ce qui résiste : un répétiteur particulier coûte plusieurs milliers de francs par mois.

RépétIA tient dans un téléphone d'entrée de gamme. L'élève choisit sa classe (6ème à Terminale), sa matière et son thème ; l'application génère un exercice, corrige sa réponse pas à pas, répond dans un chat et suit sa maîtrise. 25 couples matière x niveau, 156 thèmes, calés sur les épreuves du BEPC.

L'API n'est qu'une brique sur trois. Elle génère. Un modèle que nous avons entraîné reconnaît la matière d'une question : quatre approches comparées, évaluées sur 318 passages d'annales réelles océrisées — F1 macro 0,58 contre 0,05 pour la référence, en 0,18 ms. Une banque hors ligne de 4 140 exercices prend le relais quand le modèle tombe.

Deux notebooks disent aussi où il échoue. En ligne, 186 tests.

---

## Pourquoi souhaitez-vous participer ?

> À recopier tel quel. **871 caractères.**

J'ai construit RépétIA parce que je connais le problème de l'intérieur : au Bénin, l'écart entre un élève qui a un répétiteur et un élève qui n'en a pas se lit sur les résultats du BEPC.

Je participe pour trois raisons.

Être évalué sur la méthode. Brancher une API est facile ; ce hackathon demande de mesurer, de comparer plusieurs approches et d'énoncer ses limites. Mes notebooks disent explicitement où mon modèle échoue, et je veux confronter cette démarche au regard de chercheurs.

Le mentorat. Mon classifieur plafonne à 0,58 de F1 macro sur données réelles. Je sais le corpus trop petit ; j'ignore si c'est la seule cause. Une heure avec un mentor vaudrait des jours d'essais solitaires.

Que ce travail serve. RépétIA est déjà en ligne et gratuit. Ce qui lui manque n'est plus du code, mais des enseignants qui valident les contenus. AI4Youth réunit ces gens.

---

## Ce que j'ai dû retirer pour tenir en 900 signes

Gardez ces éléments **pour l'oral** ou pour la vidéo — ils portent, mais ne
tenaient pas dans le champ :

- « Français » n'existe pas au BEPC béninois : ce sont deux épreuves,
  *Lecture* et *Communication écrite*. C'est la preuve la plus nette que le
  catalogue est calé sur le terrain, pas recopié d'un programme français.
- Le détail de la banque : 2 688 exercices de maths et physique-chimie dont la
  solution est **calculée**, donc juste par construction, et 1 452 exercices
  qualitatifs validés un par un contre six filtres.
- La limite nommée : le classifieur confond *Lecture* et *Communication écrite*
  dans 56 % des cas. La slide 4 la porte déjà.
- L'invariant de sécurité : la clé d'IA ne transite jamais vers le client.

---

## Expérience en programmation

Sélectionner le niveau qui correspond. Éléments objectifs, si le formulaire
demande une justification : monorepo TypeScript de trois espaces (Express/Prisma,
React/Vite, React Native/Expo), 186 tests automatisés, déploiement continu sur
Render et Vercel, volet scientifique en Python (scikit-learn, pandas, OCR).

---

## Liens à fournir

| Champ | Valeur |
|---|---|
| Vidéo de présentation | *(votre lien YouTube, en « non répertorié » au minimum)* |
| Présentation PPT / Slides | *(lien Google Drive vers `AI4YOUTH_SLIDES.pdf`)* |
| Application web | https://repetia.vercel.app |
| Code source | https://github.com/Nounagnon02/repetia |

**Vérifiez que les deux liens sont accessibles en navigation privée** avant de
soumettre : le formulaire prévient qu'un lien inaccessible fait mal évaluer la
candidature. Sur Google Drive, réglez le partage sur « Tous les utilisateurs
disposant du lien ».

Réveillez aussi l'API cinq minutes avant que le jury n'ouvre le site : l'offre
gratuite de Render met le service en veille, et le premier chargement demande
alors une trentaine de secondes.
