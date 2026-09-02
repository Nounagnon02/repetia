# evolu.md — Journal d'évolution de RépétIA

Journal de bord du projet. Chaque session de travail — humaine ou assistée par
IA — **doit** y laisser une entrée. C'est par ce fichier que le travail se
transmet à la suivante.

L'état des lieux et les consignes de travail vivent dans
**[PASSATION.md](PASSATION.md)** ; ce fichier-ci n'enregistre que ce qui a
réellement été fait, dans l'ordre chronologique.

---

## Comment écrire une entrée

Une entrée **par tâche terminée**, pas un résumé global en fin de session.
Les plus récentes en haut. Format :

```markdown
## AAAA-MM-JJ — [Txx] Titre court de la tâche

**Auteur** Nom ou outil (ex. Antigravity, Claude Code) · **Commit** `abc1234` ou « non commité »

**Fait**
- ce qui a effectivement changé, avec les fichiers touchés

**Mesures**
- les chiffres, si un notebook a été réexécuté (F1 macro avant → après,
  effectifs, latences). Jamais « amélioré » sans le nombre.

**Échecs / non fait**
- ce qui n'a pas marché, ce qui a été laissé de côté, et pourquoi

**Observé, non traité**
- ce qui a été remarqué hors périmètre, pour la session suivante

**Vérifications**
- `npm test` : … · `npm run typecheck` : … · notebook réexécuté : oui/non
```

Deux règles :

1. **Les échecs se consignent.** Un résultat négatif écrit vaut mieux qu'un
   succès supposé. Si une modification fait baisser le F1, on l'écrit et on
   laisse la trace du chemin parcouru.
2. **Pas de chiffre sans mesure.** Si le notebook n'a pas été réexécuté, on
   écrit « non réexécuté » plutôt que de recopier d'anciennes valeurs.

---

## 2026-09-02 — [T0] Point de départ de la passation

**Auteur** Claude Code · **Commit** `83e5a64d` (état de référence)

**Fait**
- Rédaction de [PASSATION.md](PASSATION.md) : état des lieux complet, six tâches
  restantes (T1 → T6) et consignes pour l'IDE d'IA suivant.
- Création du présent journal.
- Mise en place de l'outillage de passation, après constat que `CLAUDE.md` seul
  ne suffisait pas — les IDE agentiques autres que Claude Code ne le lisent pas :
  - **[AGENTS.md](AGENTS.md)** — point d'entrée universel (Antigravity, Cursor,
    Copilot…) : rituel de démarrage, invariants, fichiers générés, méthode,
    conventions, pièges, définition de « terminé ».
  - **`tools/etat.sh`** — état du dépôt en une commande : arbre de travail,
    outils, données privées présentes, avancement de la collecte, état
    d'exécution des notebooks. Vérifié : s'exécute en ~2 s.
  - **`tools/verifier.sh`** — porte de sortie : refuse de valider si une donnée
    privée ou un `.env` est indexé, si un test tombe ou si le typage casse.
    Vérifié : passe sur l'état actuel.

**Mesures** *(état constaté, aucune modification de code)*
- `npm test` : **140 tests verts** — 68 backend, 11 web, 61 mobile (8 ignorés,
  test d'intégration optionnel).
- Recherche, notebook 02 (exécuté, non commité) : 87 exemples d'entraînement,
  318 passages de test réels, 9 matières.
  - Expérience A (validation croisée 5 plis) — F1 macro : référence 0,051 ·
    Bayes naïf 0,505 · régression logistique **0,764** · SVM caractères 0,709.
  - Expérience B (annales réelles) — meilleur : **SVM caractères**,
    exactitude 0,51, F1 macro 0,49. Écart A→B : +0,216.
  - Latence : 0,175 ms en local contre 2 228 ms pour l'appel LLM le plus
    rapide, soit un facteur ≈ 12 700.
- Collecte expérimentale : **41 / 1206** combinaisons (3,4 %), plafonnée par le
  quota gratuit de l'API.

**Échecs / non fait**
- Aucune tâche T1–T6 entamée : cette session ne fait qu'établir l'état des lieux.

**Observé, non traité**
- Le notebook 02 et ses quatre figures ne sont **pas commités**, non plus que
  les ajouts à `recherche/src/analyse.py` → **T1**.
- `recherche/README.md` annonce encore un notebook `02-classifieur-theme.ipynb`
  « en cours », un plan à 46 thèmes et un corpus sans annales : trois
  affirmations dépassées par le code → **T2**.
- `recherche/src/collecte.py:428` affiche « 46 thèmes » en dur alors que le
  catalogue en compte 67 ; seul le libellé est faux, le total 1206 est juste
  → **T3**.
- Deux classes se comportent anormalement sur les annales réelles : SVT
  (précision 0,06 / rappel 1,00 — le modèle y déverse tout) et Communication
  écrite (F1 0,04). Ces deux cas ne sont **pas** expliqués dans le notebook,
  contrairement à Espagnol et Allemand → **T4**.
- Le `README.md` racine ne mentionne nulle part le dossier `recherche/` → **T6**.

**Vérifications**
- `npm test` : ✅ 140 tests · `npm run typecheck` : non lancé (aucun TypeScript
  touché) · notebook réexécuté : non (aucune modification).
