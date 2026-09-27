# Sources des données d'entraînement et d'évaluation

Tout exemple du jeu d'entraînement garde sa provenance (`meta.source`). Ce
fichier dit, source par source, **ce qu'on a le droit d'en faire** — et donc
sous quelles conditions un modèle entraîné dessus peut être publié.

Règle du projet : **aucune protection n'est contournée** (paiement, connexion,
DRM, zone réservée). Ce qui n'est pas librement accessible n'est pas utilisé.

| Source | Contenu | Licence / statut | Usage | Conséquence pour le modèle publié |
|---|---|---|---|---|
| Générateurs paramétrés (`generateurs.ts`) | Maths, PCT, 6ème → Terminale | Code du projet | Entraînement | Aucune |
| Banque rédigée (`banque.ts`) | 1 exercice par thème | Projet | Entraînement | Aucune |
| Banque produite hors ligne, collectes (`banque-generee.json`, `complement_generation.jsonl`, `corpus_exercices.csv`) | Toutes matières | Produites par Gemini ; usage pour l'entraînement **décidé par le porteur du projet** (2026-09-25) | Entraînement | Conditions de Google à surveiller |
| **Exo7** (exo7.emath.fr) | ≈ 1 500 exercices corrigés de licence (L1, L2) | **CC BY-NC-SA 3.0 FR** | Entraînement (vague 5) + banc | Attribution obligatoire ; **pas d'usage commercial** ; partage dans les mêmes conditions |
| **Sésamath** (manuel.sesamath.net) | Énoncés de maths, 6ème → Terminale (programme français) | **CC BY-SA 2.0 FR** + GNU FDL | Entraînement (énoncés seulement) | Attribution ; partage dans les mêmes conditions |
| Sésamath — corrigés | — | **Réservés aux enseignants inscrits** | **Non utilisés** | — |
| Annales BEPC / BAC du Bénin (sites de diffusion gratuite) | Sujets d'examen et corrigés | **Aucune licence déclarée** ; auteur des corrigés non indiqué | Entraînement **décidé par le porteur du projet** (2026-09-27) + une part réservée au banc | Risque juridique si le modèle est publié : droits non établis. Textes gardés dans `donnees/privees/`, jamais versionnés |
| Manuels béninois au programme (éditeurs) | — | Droits réservés, pas de version libre | **Non utilisés** | — |

## Conséquence d'ensemble

Tant que le modèle est entraîné sur Exo7, il **ne peut pas être exploité
commercialement** (clause NC), et il doit être diffusé avec attribution et
sous licence compatible (clause SA). Tant qu'il l'est sur les annales, sa
**publication** suppose d'avoir établi les droits sur ces textes — ce qui
n'est pas fait. Les adaptateurs restent donc **privés** sur Hugging Face.

Pour retirer une source d'un futur entraînement : filtrer `meta.source` dans
`construire_sft.py`.

## Attributions

- Exo7 — exercices de mathématiques, Arnaud Bodin et contributeurs,
  http://exo7.emath.fr, licence CC BY-NC-SA 3.0 FR.
- Sésamath — manuels et cahiers de mathématiques, association Sésamath,
  https://manuel.sesamath.net, licence CC BY-SA 2.0 FR et GNU FDL.
