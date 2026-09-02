/** Exporte le catalogue des matières et thèmes en JSON, pour les notebooks. */
const fs = require('fs');
const path = require('path');
const racine = path.resolve(__dirname, '../..');
const { CATALOGUE } = require(path.join(racine, 'backend/dist/src/data/catalogue.js'));

const cible = path.join(racine, 'recherche/donnees/brutes/catalogue.json');
fs.writeFileSync(cible, JSON.stringify(CATALOGUE, null, 2) + '\n');
console.log(
  `${CATALOGUE.length} matières, ${CATALOGUE.reduce((n, m) => n + m.themes.length, 0)} thèmes → ${path.relative(racine, cible)}`,
);
