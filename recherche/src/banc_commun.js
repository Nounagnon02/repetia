/**
 * Outils communs au banc d'évaluation (`exporter_banc.js`) et au jeu
 * d'entraînement (`exporter_sft.js`) : hasard reproductible, consigne de
 * résolution, réponses d'élève fabriquées.
 *
 * Tout ce qui tire au hasard reçoit le générateur en paramètre : chaque
 * script garde SA graine, et le jeu de test figé ne bouge pas d'un octet
 * quand le jeu d'entraînement évolue.
 */
const crypto = require('crypto');

function mulberry32(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Outils de tirage liés à un générateur donné. */
function tirages(hasard) {
  const entier = (n) => Math.floor(hasard() * n);
  const choisir = (tab) => tab[entier(tab.length)];
  function melanger(tab) {
    const t = [...tab];
    for (let i = t.length - 1; i > 0; i--) {
      const j = entier(i + 1);
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  }
  return { hasard, entier, choisir, melanger };
}

const empreinte = (texte) => crypto.createHash('sha1').update(texte).digest('hex').slice(0, 12);

/**
 * Consigne de résolution — la seule qui n'existe pas en production. Elle
 * reprend la forme des deux autres pour que le modèle soit jugé sur le fond,
 * pas sur un format inédit.
 */
function consigneResolution(enonce) {
  return `Résous cet exercice : ${enonce} Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises Markdown : {"solution":"...","explication":"..."}. solution = réponse finale concise ; explication = résolution détaillée, étape par étape, en texte brut.`;
}

/** Nombre écrit à la française : « 150 000 », « -2,5 », « 3 ». */
const NOMBRE_FR = /-?\d{1,3}(?:[  ]\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/;

function lireNombre(texte) {
  return Number(texte.replace(/[  ]/g, '').replace(',', '.'));
}

function ecrireNombre(n) {
  const arrondi = Math.round(n * 1e6) / 1e6;
  const [ent, dec] = String(arrondi).split('.');
  const milliers = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec ? `${milliers},${dec}` : milliers;
}

/**
 * Fausse le premier nombre de la solution : l'erreur d'un élève qui a mené
 * la bonne démarche mais s'est trompé dans un calcul ou un signe. Renvoie
 * aussi la valeur juste et la valeur fausse, pour que l'explication puisse
 * nommer l'erreur.
 */
function reponseFausseNumerique(solution, { choisir }) {
  const m = solution.match(NOMBRE_FR);
  if (!m) return null;
  const n = lireNombre(m[0]);
  const candidats = [n + 1, n - 1, n * 2, -n, n + 10].filter((v) => v !== n && Number.isFinite(v));
  const faux = ecrireNombre(choisir(candidats));
  return {
    reponse: solution.slice(0, m.index) + faux + solution.slice(m.index + m[0].length),
    juste: m[0],
    faux,
  };
}

/**
 * Réponse juste, parfois dépouillée du « x = » initial : un élève écrit
 * volontiers « -1 » là où la solution dit « x = -1 ».
 */
function reponseJusteNumerique(solution, { hasard }) {
  const simple = solution.match(/^\s*[A-Za-z]\w*\s*=\s*([^;=]+)$/);
  return simple && hasard() < 0.5 ? simple[1].trim() : solution;
}

module.exports = {
  mulberry32,
  tirages,
  empreinte,
  consigneResolution,
  reponseFausseNumerique,
  reponseJusteNumerique,
};
