import banque from '../src/data/banque-generee.json';
import { exerciceDeBanqueGeneree, nombreDExercicesGeneres } from '../src/data/banqueGeneree';
import { CATALOGUE } from '../src/data/catalogue';
import { exerciceDeSecours, exercicesDisponibles } from '../src/data/banque';

type Difficulte = 'facile' | 'moyen' | 'examen';
const DIFFICULTES: Difficulte[] = ['facile', 'moyen', 'examen'];

interface Exercice {
  enonce: string;
  solution: string;
  explication: string;
  theme: string;
}

const donnees = banque as Record<string, Partial<Record<Difficulte, Exercice[]>>>;

/** Tous les exercices de la banque, avec leur provenance. */
function tous(): { couple: string; difficulte: Difficulte; exercice: Exercice }[] {
  const sortie = [];
  for (const [couple, parDifficulte] of Object.entries(donnees)) {
    for (const difficulte of DIFFICULTES) {
      for (const exercice of parDifficulte[difficulte] ?? []) {
        sortie.push({ couple, difficulte, exercice });
      }
    }
  }
  return sortie;
}

describe('banque générée hors ligne', () => {
  const exercices = tous();

  it('n\'est pas vide', () => {
    expect(exercices.length).toBeGreaterThan(0);
  });

  it('remplit les trois champs de chaque exercice', () => {
    for (const { couple, exercice } of exercices) {
      expect(exercice.enonce.trim().length).toBeGreaterThanOrEqual(20);
      expect(exercice.solution.trim().length).toBeGreaterThan(0);
      expect(exercice.explication.trim().length).toBeGreaterThanOrEqual(80);
      expect(typeof exercice.theme).toBe('string');
      expect(couple).toContain('||');
    }
  });

  it('ne laisse passer ni LaTeX ni titre Markdown', () => {
    // Le prompt système les interdit, mais un modèle finit toujours par
    // désobéir : c'est le script de production qui filtre, et ce test qui
    // vérifie que le filtre a bien tourné avant l'export.
    const latex = /\\\(|\\\[|\$\$?|\\frac|\\times|\\sqrt|\\div|\^\{|_\{|\\begin/;
    const titre = /^#{1,6}\s/m;
    for (const { couple, difficulte, exercice } of exercices) {
      const texte = `${exercice.enonce}\n${exercice.solution}\n${exercice.explication}`;
      if (latex.test(texte) || titre.test(texte)) {
        throw new Error(`${couple}/${difficulte} : « ${exercice.enonce.slice(0, 60)} »`);
      }
    }
  });

  it('ne contient pas deux fois le même énoncé dans un couple', () => {
    for (const [couple, parDifficulte] of Object.entries(donnees)) {
      const vus = new Set<string>();
      for (const difficulte of DIFFICULTES) {
        for (const e of parDifficulte[difficulte] ?? []) {
          const cle = e.enonce.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          expect(vus.has(cle)).toBe(false);
          vus.add(cle);
        }
      }
    }
  });

  it('ne référence que des couples et des thèmes du catalogue', () => {
    const connus = new Map(
      CATALOGUE.map((m) => [`${m.niveau}||${m.libelle}`, new Set(m.themes)]),
    );
    for (const [couple, parDifficulte] of Object.entries(donnees)) {
      expect(connus.has(couple)).toBe(true);
      for (const difficulte of DIFFICULTES) {
        for (const e of parDifficulte[difficulte] ?? []) {
          expect(connus.get(couple)!.has(e.theme)).toBe(true);
        }
      }
    }
  });

  it('ne sert pas de français dépouillé de ses accents', () => {
    // Le modèle rend parfois un texte français sans accents NI apostrophes :
    // « Le travail alienant est il une fatalite pour l homme ». Illisible pour
    // un élève, et irrattrapable après coup — le script de production le
    // rejette, ce test vérifie qu'aucun n'a échappé au filtre.
    // Les épreuves de langue sont exclues : leur énoncé est légitimement
    // rédigé en anglais, en espagnol ou en allemand.
    const lettres = /[a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/g;
    const accents = /[àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/g;

    for (const { couple, exercice } of exercices) {
      if (/Anglais|Espagnol|Allemand/.test(couple)) continue;
      const texte = `${exercice.enonce} ${exercice.solution} ${exercice.explication}`;
      const total = (texte.match(lettres) ?? []).length;
      const accentues = (texte.match(accents) ?? []).length;
      if (total && accentues / total < 0.015) {
        throw new Error(`${couple} : « ${exercice.enonce.slice(0, 70)} »`);
      }
    }
  });

  it('ne couvre aucune matière numérique — celles-ci relèvent des générateurs', () => {
    for (const couple of Object.keys(donnees)) {
      expect(couple).not.toMatch(/Mathématiques|Physique-Chimie/);
    }
  });

  it('préfère le thème demandé quand il est disponible', () => {
    const couple = Object.keys(donnees)[0];
    const [niveau, matiere] = couple.split('||');
    const difficulte = DIFFICULTES.find((d) => (donnees[couple][d] ?? []).length > 0)!;
    const theme = donnees[couple][difficulte]![0].theme;

    const duTheme = (donnees[couple][difficulte] ?? []).filter((e) => e.theme === theme);
    expect(nombreDExercicesGeneres(matiere, niveau, difficulte, theme)).toBe(duTheme.length);

    const servi = exerciceDeBanqueGeneree(matiere, niveau, difficulte, theme, 0)!;
    expect(duTheme.some((e) => e.enonce === servi.enonce)).toBe(true);
  });

  it('reboucle plutôt que de sortir du tableau, et rend null hors couverture', () => {
    const couple = Object.keys(donnees)[0];
    const [niveau, matiere] = couple.split('||');
    const difficulte = DIFFICULTES.find((d) => (donnees[couple][d] ?? []).length > 0)!;
    const total = nombreDExercicesGeneres(matiere, niveau, difficulte);

    expect(exerciceDeBanqueGeneree(matiere, niveau, difficulte, '', total)).toEqual(
      exerciceDeBanqueGeneree(matiere, niveau, difficulte, '', 0),
    );
    expect(exerciceDeBanqueGeneree(matiere, niveau, difficulte, '', -1)).not.toBeNull();
    expect(exerciceDeBanqueGeneree('Matière inexistante', 'BEPC', 'moyen', '', 0)).toBeNull();
  });

  it('alimente réellement le repli servi à l\'élève', () => {
    // Le lien qui compte : ce que la banque contient doit ressortir par
    // `exerciceDeSecours`, pas rester un fichier inerte.
    for (const [couple, parDifficulte] of Object.entries(donnees)) {
      const [niveau, matiere] = couple.split('||');
      for (const difficulte of DIFFICULTES) {
        const attendu = (parDifficulte[difficulte] ?? []).length;
        if (!attendu) continue;
        expect(exercicesDisponibles('', difficulte, matiere, niveau)).toBeGreaterThanOrEqual(attendu);
      }
    }
  });
});

describe('promesse faite à l\'élève', () => {
  it('offre au moins cinquante exercices distincts par matière et par classe', () => {
    // La promesse porte sur le couple, toutes difficultés confondues.
    // Elle est tenue par deux moyens complémentaires : les générateurs
    // paramétrés pour les matières numériques, la banque produite hors ligne
    // pour les autres. Aucun couple du catalogue ne doit rester en dehors.
    const insuffisants: string[] = [];

    for (const matiere of CATALOGUE) {
      const total = DIFFICULTES.reduce(
        (somme, d) =>
          somme + exercicesDisponibles(matiere.themes[0], d, matiere.libelle, matiere.niveau),
        0,
      );
      if (total < 50) {
        insuffisants.push(`${matiere.niveau}/${matiere.libelle} : ${total}`);
      }
    }

    expect(insuffisants).toEqual([]);
  });

  it('renouvelle les énoncés sur cinquante tirages dans une même matière', () => {
    // La promesse porte sur la MATIÈRE, pas sur un thème isolé : on tire donc
    // sans contrainte de thème, comme le fait le repli quand le thème demandé
    // n'a pas d'exercice dédié.
    for (const matiere of CATALOGUE) {
      const vus = new Set<string>();
      for (let i = 0; i < 50; i++) {
        vus.add(exerciceDeSecours('', 'moyen', matiere.libelle, matiere.niveau, i).enonce);
      }
      expect(vus.size).toBeGreaterThanOrEqual(25);
    }
  });

  it('reste concentré sur le thème demandé quand celui-ci est couvert', () => {
    // Le revers assumé : en se limitant au thème, le vivier est plus petit —
    // quatre à six énoncés par thème et par difficulté. C'est le bon
    // compromis : un élève qui révise « Presente de indicativo » doit recevoir
    // de l'espagnol au présent, pas un exercice pris ailleurs dans la matière.
    const espagnol = CATALOGUE.find((m) => m.libelle === 'Espagnol')!;
    const theme = espagnol.themes[0];
    for (let i = 0; i < 20; i++) {
      const exo = exerciceDeSecours(theme, 'moyen', 'Espagnol', espagnol.niveau, i);
      const pool = donnees[`${espagnol.niveau}||Espagnol`]?.moyen ?? [];
      const duTheme = pool.filter((e) => e.theme === theme);
      expect(duTheme.some((e) => e.enonce === exo.enonce)).toBe(true);
    }
  });
});
