/**
 * Extrait la banque de secours du backend vers un CSV étiqueté.
 *
 * Ces 42 exercices ont été rédigés à la main, thème par thème : ils
 * constituent la seule vérité terrain non générée par un modèle du corpus.
 * Ils serviront de jeu de test de référence, jamais d'entraînement — sans quoi
 * l'évaluation serait juge et partie.
 */
const fs = require('fs');
const path = require('path');

// On lit le build compilé : pas de dépendance à ts-node depuis ce dossier.
// Régénérer avec : npm run build --prefix backend
const racine = path.resolve(__dirname, '../..');
const dist = path.join(racine, 'backend/dist/src/data');
const { BANQUE, SECOURS_PAR_MATIERE } = require(path.join(dist, 'banque.js'));
const { CATALOGUE } = require(path.join(dist, 'catalogue.js'));

/** Retrouve la matière d'un thème depuis le catalogue. */
function matiereDuTheme(theme) {
  const m = CATALOGUE.find((c) => c.themes.includes(theme));
  return m ? m.libelle : 'Inconnue';
}

const lignes = [];

for (const [theme, parDifficulte] of Object.entries(BANQUE)) {
  for (const [difficulte, exo] of Object.entries(parDifficulte)) {
    lignes.push({
      matiere: matiereDuTheme(theme),
      theme,
      difficulte,
      origine: 'banque_manuelle',
      enonce: exo.enonce,
      solution: exo.solution,
      explication: exo.explication,
    });
  }
}

// Les replis par matière n'ont pas de thème précis : on les étiquette au niveau matière.
for (const { motif, exercices } of SECOURS_PAR_MATIERE) {
  const matiere =
    CATALOGUE.find((c) => motif.test(c.libelle))?.libelle ?? String(motif);
  for (const [difficulte, exo] of Object.entries(exercices)) {
    lignes.push({
      matiere,
      theme: '',
      difficulte,
      origine: 'banque_manuelle_matiere',
      enonce: exo.enonce,
      solution: exo.solution,
      explication: exo.explication,
    });
  }
}

const champs = ['matiere', 'theme', 'difficulte', 'origine', 'enonce', 'solution', 'explication'];
const echapper = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = [
  champs.join(','),
  ...lignes.map((l) => champs.map((c) => echapper(l[c])).join(',')),
].join('\n');

const cible = path.join(racine, 'recherche/donnees/brutes/banque_manuelle.csv');
fs.writeFileSync(cible, csv + '\n');
console.log(`${lignes.length} exercices écrits dans recherche/donnees/brutes/banque_manuelle.csv`);
console.log('Répartition par matière :');
const parMatiere = {};
for (const l of lignes) parMatiere[l.matiere] = (parMatiere[l.matiere] || 0) + 1;
for (const [m, n] of Object.entries(parMatiere).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(34)} ${n}`);
}
