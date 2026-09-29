# Relecture par des enseignants — phase 4

Le banc automatique (notebook 05) juge la forme. La vérité du contenu ne se
juge qu'à la lecture : c'est ce que mesure cette grille.

## Ce qu'il faut envoyer

**Seulement** `grille_relecture_v1.xlsx`. **Jamais** `cle_relecture_v1.json`,
qui dit quelle ligne vient de quel système : la relecture doit rester à
l'aveugle.

## Contenu

| Onglet | Lignes | Dont RépétIA v1 | Dont témoins (Gemini) |
|---|---|---|---|
| Exercices | 60 | 50 | 10 |
| Corrections | 60 | 50 | 10 |

24 lignes par niveau (6ème, 5ème, 4ème, 3ème, Terminale), toutes matières. Les
témoins sont mêlés sans être signalés : la note du modèle se lit en regard de
celle de la référence, pour le même relecteur.

## Répartition conseillée

Chaque enseignant ne relit que sa discipline et ses niveaux (filtres des
colonnes « Matière » et « Niveau »). Idéalement **deux enseignants par
ligne** : l'analyse mesure alors leur accord, sans lequel une note isolée ne
prouve pas grand-chose.

- Maths et physique-chimie : un enseignant de collège, un de lycée.
- SVT, histoire-géographie, français / lecture, langues : idem si possible.

Compter environ une minute par ligne : 20 à 40 minutes par enseignant.

## Au retour

Déposer les fichiers remplis dans `recherche/relecture/retours/`, puis :

```bash
recherche/.venv/bin/python recherche/src/relecture.py analyser recherche/relecture/retours/*.xlsx
```

Le rapport (`rapport_relecture_v1.json`) donne, pour le modèle et pour les
témoins : note moyenne (critère de la phase 4 : ≥ 3,5), part d'exercices
justes, part utilisable en classe, par niveau, et l'accord entre relecteurs.

La grille se régénère à l'identique (graine fixe) :
`recherche/.venv/bin/python recherche/src/relecture.py preparer`.
