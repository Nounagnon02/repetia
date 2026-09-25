/**
 * Produit les exemples CANDIDATS du jeu d'entraînement (phase 2 du plan,
 * `recherche/PLAN_ENTRAINEMENT.md`), avec les prompts exacts de production.
 *
 *   npm run build --prefix backend && node recherche/src/exporter_sft.js
 *   recherche/.venv/bin/python recherche/src/construire_sft.py
 *
 * Ce script ne filtre pas la qualité : il rassemble. Le tri (défauts
 * d'écriture, doublons, fuite du jeu de test), le découpage et le rapport
 * sont faits par `construire_sft.py`, avec les MÊMES détecteurs que le banc.
 *
 * Deux règles appliquées dès ici :
 *
 *   1. Rien du banc n'entre. Les exercices listés dans
 *      `donnees/banc/exclusions.json` et TOUT exercice d'un thème réservé
 *      sont écartés — sinon le banc mesurerait la mémoire, pas la compétence.
 *   2. Pas de gabarit déguisé en données. Un générateur produit des centaines
 *      d'énoncés qui ne diffèrent que par leurs nombres : on en prend au plus
 *      PLAFOND_PAR_GABARIT par (niveau, matière, modèle, difficulté).
 */
const fs = require('fs');
const path = require('path');
const { mulberry32, tirages, empreinte, consigneResolution, reponseFausseNumerique, reponseJusteNumerique } =
  require('./banc_commun');

const racine = path.resolve(__dirname, '../..');
const dist = path.join(racine, 'backend/dist/src');
const { CATALOGUE } = require(path.join(dist, 'data/catalogue.js'));
const { nombreDeVariantes, exerciceGenere, modeleDeLExercice } = require(path.join(dist, 'data/generateurs.js'));
const { BANQUE } = require(path.join(dist, 'data/banque.js'));
const { promptSysteme, consigneGeneration, consigneCorrection } = require(path.join(dist, 'services/llm.service.js'));
const banqueGeneree = require(path.join(racine, 'backend/src/data/banque-generee.json'));
const themesGenerateurs = require(path.join(racine, 'recherche/donnees/brutes/themes_generateurs.json'));
const exclusions = require(path.join(racine, 'recherche/donnees/banc/exclusions.json'));

const SORTIE = path.join(racine, 'recherche/donnees/sft');
const GRAINE = 20260926; // distincte de celle du banc
const DIFFICULTES = ['facile', 'moyen', 'examen'];
const PLAFOND_PAR_GABARIT = { generation: 25, resolution: 30, correction: 24 };

const outils = tirages(mulberry32(GRAINE));
const { choisir, melanger } = outils;

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

const enoncesExclus = new Set(exclusions.exercices.map((e) => e.empreinte_enonce));
const estReserve = (niveau, matiere, theme) =>
  exclusions.themes_reserves.some((r) => r.niveau === niveau && r.matiere === matiere && r.theme === theme);
const matiereDuCatalogue = (niveau, matiere) => CATALOGUE.find((m) => m.niveau === niveau && m.libelle === matiere);

const compteurs = { ecartes_banc: 0, ecartes_theme_reserve: 0, ecartes_hors_catalogue: 0 };
const candidats = [];

function ajouter(c) {
  candidats.push(c);
}

// ---------------------------------------------------------------------------
// Cibles de correction
//
// Le verdict est court et varié ; l'explication reprend la VRAIE démarche de
// l'exercice (rédigée ou calculée), précédée, pour une réponse fausse, d'une
// phrase qui nomme l'erreur. Ce n'est pas un gabarit unique répété : la
// partie longue de chaque cible est différente d'un exemple à l'autre.
// ---------------------------------------------------------------------------

const VERDICTS_JUSTES = [
  'Bravo, ta réponse est juste !',
  'Très bien, c\'est la bonne réponse.',
  'Excellent travail, ta réponse est correcte.',
  'C\'est juste, continue comme ça !',
  'Parfait, tu as trouvé la bonne réponse.',
  'Bien joué, ta réponse est exacte.',
];
const VERDICTS_FAUX = [
  'Pas tout à fait, mais tu y es presque.',
  'Ce n\'est pas la bonne réponse, reprenons ensemble.',
  'Ta réponse n\'est pas juste, mais ne te décourage pas.',
  'Presque ! Il y a une erreur, regardons-la ensemble.',
  'Ce n\'est pas encore ça, on reprend pas à pas.',
];
const VERDICTS_HORS_SUJET = [
  'Ta réponse ne correspond pas à la question posée.',
  'Attention, ta réponse ne répond pas à cet exercice.',
  'Relis bien la consigne : ta réponse parle d\'autre chose.',
  'Ce n\'est pas ce que l\'exercice demande, reprenons la consigne.',
];

function cibleCorrection(ex, reponse, genre, detail) {
  if (genre === 'juste') {
    return { correct: true, verdict: choisir(VERDICTS_JUSTES), explication: ex.explication };
  }
  if (genre === 'nombre_fausse') {
    return {
      correct: false,
      verdict: choisir(VERDICTS_FAUX),
      explication: `Tu as écrit ${detail.faux} là où il fallait ${detail.juste}. Reprenons la démarche :\n\n${ex.explication}`,
    };
  }
  return {
    correct: false,
    verdict: choisir(VERDICTS_HORS_SUJET),
    explication: `Ta réponse ne traite pas la question de cet exercice. Voici la démarche attendue :\n\n${ex.explication}`,
  };
}

function ajouterCorrection(base, ex, genre, reponse, detail) {
  ajouter({
    ...base,
    tache: 'correction',
    systeme: promptSysteme(base.matiere, base.niveau),
    consigne: consigneCorrection(ex.enonce, ex.solution, reponse),
    cible: cibleCorrection(ex, reponse, genre, detail),
    enonce: ex.enonce,
    fabrication: genre,
  });
}

// ---------------------------------------------------------------------------
// 1. Générateurs paramétrés : génération (si le modèle a un thème),
//    résolution et correction numérique.
// ---------------------------------------------------------------------------

for (const m of CATALOGUE) {
  const table = themesGenerateurs[`${m.niveau}|${m.libelle}`];
  for (const d of DIFFICULTES) {
    const total = nombreDeVariantes(m.libelle, '', m.niveau, d);
    if (!total) continue;
    // Regrouper les énoncés distincts par modèle.
    const parModele = new Map();
    for (let index = 0; index < total; index++) {
      const nom = modeleDeLExercice(m.libelle, '', m.niveau, d, index);
      const ex = exerciceGenere(m.libelle, '', m.niveau, d, index);
      if (!parModele.has(nom)) parModele.set(nom, new Map());
      parModele.get(nom).set(ex.enonce, ex);
    }
    for (const [nom, exercices] of parModele) {
      const theme = table ? table[nom] ?? null : null;
      if (table && !(nom in table)) throw new Error(`Modèle sans entrée dans themes_generateurs.json : ${m.niveau} ${nom}`);
      const reserve = theme !== null && estReserve(m.niveau, m.libelle, theme);
      const disponibles = melanger([...exercices.values()]).filter((ex) => {
        if (enoncesExclus.has(empreinte(ex.enonce))) {
          compteurs.ecartes_banc++;
          return false;
        }
        return true;
      });
      if (reserve) {
        compteurs.ecartes_theme_reserve += disponibles.length;
        continue;
      }
      const base = { niveau: m.niveau, matiere: m.libelle, difficulte: d, source: 'generateur', gabarit: nom };

      if (theme !== null) {
        for (const ex of disponibles.slice(0, PLAFOND_PAR_GABARIT.generation)) {
          ajouter({
            ...base,
            theme,
            tache: 'generation',
            systeme: promptSysteme(m.libelle, m.niveau, theme),
            consigne: consigneGeneration(theme, d, m.libelle, m.niveau),
            cible: { enonce: ex.enonce, solution: ex.solution, explication: ex.explication },
            enonce: ex.enonce,
          });
        }
      }
      for (const ex of disponibles.slice(0, PLAFOND_PAR_GABARIT.resolution)) {
        ajouter({
          ...base,
          theme,
          tache: 'resolution',
          systeme: promptSysteme(m.libelle, m.niveau),
          consigne: consigneResolution(ex.enonce),
          cible: { solution: ex.solution, explication: ex.explication },
          enonce: ex.enonce,
        });
      }
      disponibles.slice(0, PLAFOND_PAR_GABARIT.correction).forEach((ex, rang) => {
        if (rang % 2 === 0) {
          ajouterCorrection({ ...base, theme }, ex, 'juste', reponseJusteNumerique(ex.solution, outils));
          return;
        }
        const faux = reponseFausseNumerique(ex.solution, outils);
        if (faux) ajouterCorrection({ ...base, theme }, ex, 'nombre_fausse', faux.reponse, faux);
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Banque produite hors ligne : génération et correction qualitative.
// ---------------------------------------------------------------------------

{
  const tous = [];
  for (const [cle, parDifficulte] of Object.entries(banqueGeneree)) {
    const [niveau, matiere] = cle.split('||');
    for (const d of DIFFICULTES) for (const ex of parDifficulte[d] ?? []) tous.push({ niveau, matiere, d, ex });
  }
  for (const { niveau, matiere, d, ex } of tous) {
    if (enoncesExclus.has(empreinte(ex.enonce))) {
      compteurs.ecartes_banc++;
      continue;
    }
    if (estReserve(niveau, matiere, ex.theme)) {
      compteurs.ecartes_theme_reserve++;
      continue;
    }
    const base = { niveau, matiere, difficulte: d, theme: ex.theme, source: 'banque_generee' };
    ajouter({
      ...base,
      tache: 'generation',
      systeme: promptSysteme(matiere, niveau, ex.theme),
      consigne: consigneGeneration(ex.theme, d, matiere, niveau),
      cible: { enonce: ex.enonce, solution: ex.solution, explication: ex.explication },
      enonce: ex.enonce,
    });
    // Chaque exercice reçoit une réponse juste ET une réponse hors sujet :
    // le modèle apprend à distinguer les deux sur le même énoncé.
    ajouterCorrection(base, ex, 'juste', ex.solution);
    const autres = tous.filter(
      (o) => o.matiere === matiere && o.niveau === niveau && o.ex.theme !== ex.theme && !estReserve(o.niveau, o.matiere, o.ex.theme),
    );
    if (autres.length) ajouterCorrection(base, ex, 'solution_autre_theme', choisir(autres).ex.solution);
  }
}

// ---------------------------------------------------------------------------
// 3. Banque rédigée à la main (un exercice par thème et par difficulté).
// ---------------------------------------------------------------------------

for (const [theme, parDifficulte] of Object.entries(BANQUE)) {
  for (const m of CATALOGUE.filter((x) => x.themes.includes(theme))) {
    for (const d of DIFFICULTES) {
      const ex = parDifficulte[d];
      if (!ex) continue;
      if (enoncesExclus.has(empreinte(ex.enonce))) {
        compteurs.ecartes_banc++;
        continue;
      }
      if (estReserve(m.niveau, m.libelle, theme)) {
        compteurs.ecartes_theme_reserve++;
        continue;
      }
      ajouter({
        niveau: m.niveau,
        matiere: m.libelle,
        difficulte: d,
        theme,
        source: 'banque_manuelle',
        tache: 'generation',
        systeme: promptSysteme(m.libelle, m.niveau, theme),
        consigne: consigneGeneration(theme, d, m.libelle, m.niveau),
        cible: { enonce: ex.enonce, solution: ex.solution, explication: ex.explication },
        enonce: ex.enonce,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Collecte expérimentale (notebook 01) : exercices Gemini de niveau BEPC.
// ---------------------------------------------------------------------------

/** Lecteur CSV minimal (RFC 4180 : champs entre guillemets, sauts de ligne inclus). */
function lireCsv(texte) {
  const lignes = [];
  let champ = '';
  let ligne = [];
  let entreGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"' && texte[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') entreGuillemets = false;
      else champ += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ',') {
      ligne.push(champ);
      champ = '';
    } else if (c === '\n') {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = '';
    } else if (c !== '\r') champ += c;
  }
  if (champ || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  const [entete, ...corps] = lignes;
  return corps.filter((l) => l.length === entete.length).map((l) => Object.fromEntries(entete.map((k, i) => [k, l[i]])));
}

for (const r of lireCsv(fs.readFileSync(path.join(racine, 'recherche/donnees/traitees/corpus_exercices.csv'), 'utf8'))) {
  const m = matiereDuCatalogue('BEPC', r.matiere);
  if (!m || !m.themes.includes(r.theme) || !DIFFICULTES.includes(r.difficulte)) {
    compteurs.ecartes_hors_catalogue++;
    continue;
  }
  if (enoncesExclus.has(empreinte(r.enonce))) {
    compteurs.ecartes_banc++;
    continue;
  }
  if (estReserve('BEPC', r.matiere, r.theme)) {
    compteurs.ecartes_theme_reserve++;
    continue;
  }
  ajouter({
    niveau: 'BEPC',
    matiere: r.matiere,
    difficulte: r.difficulte,
    theme: r.theme,
    source: `collecte_${r.modele}`,
    tache: 'generation',
    systeme: promptSysteme(r.matiere, 'BEPC', r.theme),
    consigne: consigneGeneration(r.theme, r.difficulte, r.matiere, 'BEPC'),
    cible: { enonce: r.enonce, solution: r.solution, explication: r.explication },
    enonce: r.enonce,
  });
}

// ---------------------------------------------------------------------------
// 5. Complément Gemini (`completer_generation.py`) : thèmes sans exemple.
//    Génération et correction pour tous ; résolution aussi pour les
//    exercices numériques confirmés par une résolution indépendante.
// ---------------------------------------------------------------------------

{
  const fichier = path.join(racine, 'recherche/donnees/brutes/complement_generation.jsonl');
  const complement = fs.existsSync(fichier)
    ? fs.readFileSync(fichier, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  for (const ex of complement) {
    if (enoncesExclus.has(empreinte(ex.enonce))) {
      compteurs.ecartes_banc++;
      continue;
    }
    if (estReserve(ex.niveau, ex.matiere, ex.theme)) {
      compteurs.ecartes_theme_reserve++;
      continue;
    }
    const base = { niveau: ex.niveau, matiere: ex.matiere, difficulte: ex.difficulte, theme: ex.theme,
      source: 'complement_gemini' };
    ajouter({
      ...base,
      tache: 'generation',
      systeme: promptSysteme(ex.matiere, ex.niveau, ex.theme),
      consigne: consigneGeneration(ex.theme, ex.difficulte, ex.matiere, ex.niveau),
      cible: { enonce: ex.enonce, solution: ex.solution, explication: ex.explication },
      enonce: ex.enonce,
    });
    ajouterCorrection(base, ex, 'juste', ex.solution);
    if (ex.verifie_par_resolution === true) {
      ajouter({
        ...base,
        tache: 'resolution',
        systeme: promptSysteme(ex.matiere, ex.niveau),
        consigne: consigneResolution(ex.enonce),
        cible: { solution: ex.solution, explication: ex.explication },
        enonce: ex.enonce,
      });
      const faux = reponseFausseNumerique(ex.solution, outils);
      if (faux) ajouterCorrection(base, ex, 'nombre_fausse', faux.reponse, faux);
    } else {
      const autres = complement.filter((o) => o.matiere === ex.matiere && o.niveau === ex.niveau && o.theme !== ex.theme);
      if (autres.length) ajouterCorrection(base, ex, 'solution_autre_theme', choisir(autres).solution);
    }
  }
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

fs.mkdirSync(SORTIE, { recursive: true });
fs.writeFileSync(path.join(SORTIE, 'candidats.jsonl'), candidats.map((c) => JSON.stringify(c)).join('\n') + '\n');
const parTache = {};
for (const c of candidats) parTache[c.tache] = (parTache[c.tache] ?? 0) + 1;
console.log(`${candidats.length} candidats → recherche/donnees/sft/candidats.jsonl`, parTache);
console.log('écartés :', compteurs);
