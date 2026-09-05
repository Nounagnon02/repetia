# Candidature AI4Youth-Lomé 2026 — réponses à recopier

Thème : **Éducation** · Catégorie : **Application (Intégration et Expérience IA)**

---

## Description du projet & Approche

> À recopier dans le champ « Description du projet & Approche ».

**Le problème.** Au Bénin, des dizaines de milliers d'élèves préparent le BEPC
chaque année. Le soir, quand une question résiste, il n'y a souvent personne
pour l'expliquer : un répétiteur particulier coûte plusieurs milliers de francs
par mois, hors de portée de la plupart des familles. Ce qui manque à ces élèves
n'est ni l'envie ni le travail — c'est quelqu'un qui reprenne le raisonnement
avec eux.

**La solution.** RépétIA est un répétiteur qui tient dans un téléphone
d'entrée de gamme. L'élève choisit sa classe — de la sixième à la terminale —,
sa matière, son thème et sa difficulté. L'application lui génère un exercice
ancré dans son quotidien, corrige sa réponse en déroulant le raisonnement pas
à pas, répond à ses questions dans un chat, et suit sa progression pour lui
proposer ensuite ce qu'il maîtrise le moins. Le catalogue couvre les
**25 couples matière × niveau** du secondaire béninois et 156 thèmes, calés sur
les épreuves réelles : au BEPC, « Français » n'existe pas — ce sont deux
épreuves distinctes, *Lecture* et *Communication écrite*.

**L'approche, et ce qui la distingue.** Les directives du hackathon demandent
d'utiliser les API d'IA comme briques complémentaires, non comme solution
complète. C'est précisément notre architecture.

1. **Un grand modèle** génère les exercices et les explications — ce qu'il fait
   de mieux.
2. **Un modèle que nous avons entraîné** reconnaît la matière d'une question
   posée dans le chat. Nous avons comparé quatre approches (référence triviale,
   Bayes naïf, régression logistique, SVM à n-grammes de caractères), en
   validation croisée puis sur **318 passages d'annales réelles du BEPC**,
   océrisées par nos soins. Le SVM caractères obtient 0,58 de F1 macro sur ces
   annales, contre 0,05 pour la référence, et décide en **0,18 ms** là où
   l'appel au grand modèle en demande 2,8 s — quinze mille fois plus vite, sans
   consommer de quota.
3. **Une banque hors ligne** prend le relais quand le modèle est indisponible.
   Elle tient **plus de 50 exercices distincts par matière et par classe** :
   2 688 en mathématiques et physique-chimie, produits par des générateurs
   paramétrés dont la solution est *calculée* — donc juste par construction — et
   1 452 dans les matières qualitatives, produits hors ligne puis validés un par
   un contre six filtres automatiques.

**La question scientifique** que nous nous sommes posée : *un classifieur
entraîné sur des exercices générés par une IA sait-il reconnaître la matière
d'un vrai sujet d'examen béninois, rédigé par un enseignant ?* Deux notebooks y
répondent, mesures à l'appui, et disent aussi ce qui ne marche pas : le
classifieur confond *Lecture* et *Communication écrite* dans 56 % des cas, et
n'est pas prêt pour la production. La courbe d'apprentissage montre qu'il manque
des données, pas un meilleur modèle.

**L'état.** L'application est **en ligne et publique** — web et Android —,
couverte par 186 tests automatisés, et conçue pour le réseau béninois :
elle fonctionne sur un téléphone d'entrée de gamme et ne fait jamais transiter
de clé d'IA vers le client.

---

## Pourquoi souhaitez-vous participer ?

> À recopier dans le champ « Pourquoi souhaitez-vous participer ? ».

J'ai construit RépétIA parce que je connais le problème de l'intérieur : au
Bénin, l'écart entre un élève qui a un répétiteur et un élève qui n'en a pas se
lit directement sur les résultats du BEPC. Je voulais vérifier si une IA pouvait
combler une partie de cet écart, pour le prix d'un forfait data.

Je participe à AI4Youth pour trois raisons précises.

**Pour être évalué sur la méthode, pas sur la démonstration.** Il est facile de
brancher une API et d'appeler cela de l'intelligence artificielle. Ce hackathon
demande l'inverse : mesurer, comparer plusieurs approches, documenter ses choix,
et énoncer ses limites. J'ai déjà travaillé ainsi — mes notebooks disent
explicitement où mon modèle échoue — et je veux confronter cette démarche au
regard de chercheurs.

**Pour le mentorat.** Mon classifieur plafonne à 0,58 de F1 macro sur données
réelles. Je sais que le corpus est trop petit ; je ne sais pas si c'est la seule
cause. Une heure avec un mentor sur ce point précis vaudrait des jours d'essais
solitaires.

**Pour que ce travail serve.** RépétIA est déjà en ligne et gratuit. Ce qui lui
manque pour atteindre des élèves, ce n'est plus du code — c'est un réseau
d'enseignants qui valident les contenus et une visibilité que je n'ai pas seul.
AI4Youth réunit exactement ces gens, en Afrique de l'Ouest, autour d'une IA
pensée pour nos contextes.

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
