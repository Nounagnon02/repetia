/**
 * Construit le jeu de test FIGÉ du banc d'évaluation (phase 1 du plan
 * d'entraînement, `recherche/PLAN_ENTRAINEMENT.md`).
 *
 *   npm run build --prefix backend && node recherche/src/exporter_banc.js
 *
 * Trois tâches, chacune avec le prompt EXACT de production, tiré du backend
 * compilé plutôt que recopié :
 *
 *   generation  — demande d'exercice (matière, thème, niveau, difficulté).
 *                 Pas de référence : on juge le format, pas le contenu.
 *   resolution  — énoncé produit par un générateur paramétré ; la solution
 *                 étant calculée, la justesse du modèle se mesure.
 *   correction  — énoncé + solution + réponse d'élève FABRIQUÉE, dont le
 *                 verdict attendu est connu par construction.
 *
 * Le tirage est déterministe (graine fixe) : relancer le script redonne le
 * même fichier, octet pour octet. Les exercices retenus ici, et les thèmes
 * réservés, devront être EXCLUS du jeu d'entraînement de la phase 2 — c'est
 * le rôle de `exclusions.json`.
 */
const fs = require('fs');
const path = require('path');
const {
  mulberry32,
  tirages,
  empreinte,
  consigneResolution,
  reponseFausseNumerique,
  reponseJusteNumerique,
} = require('./banc_commun');

const racine = path.resolve(__dirname, '../..');
const dist = path.join(racine, 'backend/dist/src');
const { CATALOGUE } = require(path.join(dist, 'data/catalogue.js'));
const { nombreDeVariantes, exerciceGenere } = require(path.join(dist, 'data/generateurs.js'));
const { promptSysteme, promptSystemeCourt, consigneGeneration, consigneCorrection } = require(path.join(dist, 'services/llm.service.js'));
const { exerciceDeSecours } = require(path.join(dist, 'data/banque.js'));
const banqueGeneree = require(path.join(racine, 'backend/src/data/banque-generee.json'));

const SORTIE = path.join(racine, 'recherche/donnees/banc');
const GRAINE = 20260925;
const DIFFICULTES = ['facile', 'moyen', 'examen'];

const EFFECTIFS = {
  generation: 300,
  resolutionParCellule: 5, // 10 couples (niveau, matière) × 3 difficultés × 5 = 150
  correctionNumeriqueParCellule: 5, // idem = 150
  correctionQualitative: 150,
};

// ---------------------------------------------------------------------------
// Hasard reproductible et réponses d'élève fabriquées (banc_commun.js)
// ---------------------------------------------------------------------------

const outils = tirages(mulberry32(GRAINE));
const { entier, choisir, melanger } = outils;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

const items = [];
const exclusions = { themes_reserves: [], exercices: [] };

function ajouter(item) {
  item.id = `${item.tache}-${empreinte(JSON.stringify([item.matiere, item.niveau, item.consigne]))}`;
  items.push(item);
}

// Thèmes réservés : un par matière qui en compte au moins quatre. Aucun
// exercice de ces thèmes n'entrera dans l'entraînement ; le banc mesure
// ainsi la généralisation à un thème jamais vu.
for (const m of CATALOGUE) {
  if (m.themes.length >= 4) {
    exclusions.themes_reserves.push({ niveau: m.niveau, matiere: m.libelle, theme: choisir(m.themes) });
  }
}
const estReserve = (niveau, matiere, theme) =>
  exclusions.themes_reserves.some((r) => r.niveau === niveau && r.matiere === matiere && r.theme === theme);

// --- Génération : réparti matière par matière, thèmes réservés garantis ---
{
  const parMatiere = CATALOGUE.map((m) => ({
    m,
    combinaisons: melanger(m.themes.flatMap((theme) => DIFFICULTES.map((d) => ({ theme, d })))),
  }));
  const retenus = [];
  for (const r of exclusions.themes_reserves) {
    const pm = parMatiere.find((p) => p.m.niveau === r.niveau && p.m.libelle === r.matiere);
    const i = pm.combinaisons.findIndex((c) => c.theme === r.theme);
    retenus.push({ m: pm.m, ...pm.combinaisons.splice(i, 1)[0] });
  }
  let tour = 0;
  while (retenus.length < EFFECTIFS.generation) {
    const pm = parMatiere[tour++ % parMatiere.length];
    if (pm.combinaisons.length) retenus.push({ m: pm.m, ...pm.combinaisons.shift() });
  }
  for (const { m, theme, d } of retenus) {
    ajouter({
      tache: 'generation',
      matiere: m.libelle,
      niveau: m.niveau,
      theme,
      difficulte: d,
      theme_reserve: estReserve(m.niveau, m.libelle, theme),
      systeme: promptSysteme(m.libelle, m.niveau, theme),
      consigne: consigneGeneration(theme, d, m.libelle, m.niveau),
      attendu: {},
      provenance: 'catalogue',
    });
  }
}

// --- Résolution et correction numérique : générateurs paramétrés ---
{
  const couplesNumeriques = CATALOGUE.filter((m) =>
    DIFFICULTES.some((d) => nombreDeVariantes(m.libelle, m.themes[0], m.niveau, d) > 0),
  );
  // Énoncés déjà retenus, toutes difficultés confondues : certains
  // générateurs servent le même énoncé en « facile » et en « moyen ».
  const vus = new Set();
  let alternance = 0;
  for (const m of couplesNumeriques) {
    for (const d of DIFFICULTES) {
      const total = nombreDeVariantes(m.libelle, m.themes[0], m.niveau, d);
      const besoin = EFFECTIFS.resolutionParCellule + EFFECTIFS.correctionNumeriqueParCellule;
      // Index distincts ET énoncés distincts (deux index peuvent tomber sur
      // le même énoncé si un modèle reboucle).
      const tires = [];
      for (let essai = 0; tires.length < besoin && essai < besoin * 50; essai++) {
        const index = entier(total);
        const ex = exerciceGenere(m.libelle, m.themes[0], m.niveau, d, index);
        if (!ex || vus.has(ex.enonce)) continue;
        vus.add(ex.enonce);
        tires.push({ index, ex });
      }
      tires.forEach(({ index, ex }, rang) => {
        const source = { type: 'generateur', niveau: m.niveau, matiere: m.libelle, difficulte: d, index };
        exclusions.exercices.push({ ...source, empreinte_enonce: empreinte(ex.enonce) });
        if (rang < EFFECTIFS.resolutionParCellule) {
          ajouter({
            tache: 'resolution',
            matiere: m.libelle,
            niveau: m.niveau,
            theme: null,
            difficulte: d,
            theme_reserve: false,
            systeme: promptSysteme(m.libelle, m.niveau),
            consigne: consigneResolution(ex.enonce),
            attendu: { solution: ex.solution, explication: ex.explication, enonce: ex.enonce },
            provenance: source,
          });
          return;
        }
        // Alternance sur l'ensemble des cellules, pas dans la cellule : cinq
        // items par cellule donneraient sinon 2 justes pour 3 fausses partout.
        const juste = alternance++ % 2 === 0;
        const reponse = juste
          ? reponseJusteNumerique(ex.solution, outils)
          : reponseFausseNumerique(ex.solution, outils)?.reponse ?? null;
        if (reponse === null) return;
        ajouter({
          tache: 'correction',
          matiere: m.libelle,
          niveau: m.niveau,
          theme: null,
          difficulte: d,
          theme_reserve: false,
          systeme: promptSysteme(m.libelle, m.niveau),
          consigne: consigneCorrection(ex.enonce, ex.solution, reponse),
          attendu: { correct: juste, reponse_eleve: reponse },
          provenance: { ...source, fabrication: juste ? 'solution' : 'nombre_fausse' },
        });
      });
    }
  }
}

// --- Correction qualitative : banque produite hors ligne ---
{
  const tous = [];
  for (const [cle, parDifficulte] of Object.entries(banqueGeneree)) {
    const [niveau, matiere] = cle.split('||');
    for (const d of DIFFICULTES) {
      for (const ex of parDifficulte[d] ?? []) tous.push({ niveau, matiere, d, ex });
    }
  }
  const tires = melanger(tous).slice(0, EFFECTIFS.correctionQualitative);
  tires.forEach(({ niveau, matiere, d, ex }, rang) => {
    const juste = rang % 2 === 0;
    let reponse = ex.solution;
    if (!juste) {
      // La solution d'un autre exercice de la même matière, sur un autre
      // thème : une réponse hors sujet, que le correcteur doit refuser.
      const autres = tous.filter(
        (o) => o.matiere === matiere && o.niveau === niveau && o.ex.theme !== ex.theme,
      );
      reponse = choisir(autres.length ? autres : tous.filter((o) => o.ex !== ex)).ex.solution;
    }
    const source = { type: 'banque_generee', niveau, matiere, difficulte: d, theme: ex.theme };
    exclusions.exercices.push({ ...source, empreinte_enonce: empreinte(ex.enonce) });
    ajouter({
      tache: 'correction',
      matiere,
      niveau,
      theme: ex.theme,
      difficulte: d,
      theme_reserve: estReserve(niveau, matiere, ex.theme),
      systeme: promptSysteme(matiere, niveau),
      consigne: consigneCorrection(ex.enonce, ex.solution, reponse),
      attendu: { correct: juste, reponse_eleve: reponse },
      provenance: { ...source, fabrication: juste ? 'solution' : 'solution_autre_theme' },
    });
  });
}

// ---------------------------------------------------------------------------
// Réponses sans LLM, au même format que celles d'un modèle
//
//   plancher  — ce que l'application sert AUJOURD'HUI quand aucun modèle ne
//               répond : exercice de secours, correction de repli (qui
//               répond toujours « faux »), rien pour la résolution.
//   controle  — la réponse attendue elle-même. Doit obtenir 100 % : c'est
//               l'autotest du scoreur, pas un modèle.
// ---------------------------------------------------------------------------

function reponsesSansLlm() {
  const plancher = [];
  const controle = [];
  for (const it of items) {
    if (it.tache === 'generation') {
      const ex = exerciceDeSecours(it.theme, it.difficulte, it.matiere, it.niveau, 0);
      plancher.push({ id: it.id, texte: JSON.stringify(ex) });
    } else if (it.tache === 'resolution') {
      plancher.push({ id: it.id, texte: '' });
      controle.push({ id: it.id, texte: JSON.stringify(it.attendu) });
    } else {
      plancher.push({
        id: it.id,
        texte: JSON.stringify({
          correct: false,
          verdict: "Je n'ai pas pu vérifier ta réponse pour le moment, mais voici la démarche.",
          explication: 'Correction de repli de production (llm.service.ts).',
        }),
      });
      controle.push({
        id: it.id,
        texte: JSON.stringify({
          correct: it.attendu.correct,
          verdict: 'Réponse de contrôle.',
          explication: 'Verdict attendu, recopié pour vérifier la notation.',
        }),
      });
    }
  }
  const dossier = path.join(SORTIE, 'reponses');
  fs.mkdirSync(dossier, { recursive: true });
  for (const [nom, liste] of [['plancher_application-sans-llm', plancher], ['controle_reference', controle]]) {
    const modele = nom.replace('_', ':');
    fs.writeFileSync(
      path.join(dossier, `${nom}.jsonl`),
      liste.map((r) => JSON.stringify({ ...r, modele, latence_s: 0 })).join('\n') + '\n',
    );
  }
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

// Persona courte du modèle affiné, rangée à part : les modèles non affinés
// restent interrogés avec la persona complète (`systeme`), le modèle affiné
// avec celle qu'il servira en production (`systeme_court`).
for (const it of items) it.systeme_court = promptSystemeCourt(it.matiere, it.niveau);

const ids = new Set(items.map((i) => i.id));
if (ids.size !== items.length) throw new Error(`Identifiants en double : ${items.length - ids.size}`);

fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, 'jeu_de_test.jsonl'), items.map((i) => JSON.stringify(i)).join('\n') + '\n');
fs.writeFileSync(path.join(SORTIE, 'exclusions.json'), JSON.stringify(exclusions, null, 2) + '\n');
reponsesSansLlm();

const compte = {};
for (const i of items) compte[i.tache] = (compte[i.tache] ?? 0) + 1;
const correctes = items.filter((i) => i.tache === 'correction' && i.attendu.correct).length;
console.log(`${items.length} items → recherche/donnees/banc/jeu_de_test.jsonl`, compte);
console.log(`correction : ${correctes} justes / ${compte.correction - correctes} fausses`);
console.log(
  `${exclusions.themes_reserves.length} thèmes réservés, ${exclusions.exercices.length} exercices exclus de l'entraînement`,
);
