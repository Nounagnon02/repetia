import { exerciceGenere, nombreDeVariantes, type Difficulte } from '../src/data/generateurs';

const NIVEAUX = ['6ème', '5ème', '4ème', 'BEPC', 'BAC'] as const;
const MATIERES = ['Mathématiques', 'Physique-Chimie-Technologie'] as const;
const DIFFICULTES: Difficulte[] = ['facile', 'moyen', 'examen'];

/** Parcourt tout ce que les générateurs savent produire. */
function tout(): { niveau: string; matiere: string; difficulte: Difficulte; index: number; enonce: string; solution: string; explication: string }[] {
  const sortie = [];
  for (const niveau of NIVEAUX) {
    for (const matiere of MATIERES) {
      for (const difficulte of DIFFICULTES) {
        const total = nombreDeVariantes(matiere, '', niveau, difficulte);
        for (let index = 0; index < total; index++) {
          const e = exerciceGenere(matiere, '', niveau, difficulte, index)!;
          sortie.push({ niveau, matiere, difficulte, index, ...e });
        }
      }
    }
  }
  return sortie;
}

describe('générateurs d\'exercices', () => {
  const exercices = tout();

  it('produit de quoi tenir la promesse de cinquante exercices par matière et par classe', () => {
    for (const niveau of NIVEAUX) {
      for (const matiere of MATIERES) {
        const total = DIFFICULTES.reduce(
          (somme, d) => somme + nombreDeVariantes(matiere, '', niveau, d),
          0,
        );
        expect(total).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it('remplit les trois champs de chaque exercice', () => {
    for (const e of exercices) {
      expect(e.enonce.trim().length).toBeGreaterThan(10);
      expect(e.solution.trim().length).toBeGreaterThan(0);
      expect(e.explication.trim().length).toBeGreaterThan(80);
    }
  });

  it('n\'écrit jamais de forme mathématique bancale', () => {
    // Ces motifs trahissent une substitution non maîtrisée : « 2x + 0 »,
    // « 1x », « + -6 », une division par zéro ou un NaN qui a traversé.
    // Chacun d'eux a été observé pendant l'écriture de ce module.
    const interdits = [
      /\+ 0[^,\d]/, /- 0[^,\d]/, /\+ -/, /- -/, /\b1x\b/,
      /NaN/, /undefined/, /Infinity/, /÷ 0[^,\d]/,
    ];
    for (const e of exercices) {
      const texte = `${e.enonce}\n${e.solution}\n${e.explication}`;
      for (const motif of interdits) {
        if (motif.test(texte)) {
          throw new Error(
            `${e.niveau}/${e.matiere}/${e.difficulte} #${e.index} : ${motif} dans « ${texte.match(motif)} »`,
          );
        }
      }
    }
  });

  it('ne sert jamais deux fois le même énoncé dans une même série', () => {
    for (const niveau of NIVEAUX) {
      for (const matiere of MATIERES) {
        for (const difficulte of DIFFICULTES) {
          const total = nombreDeVariantes(matiere, '', niveau, difficulte);
          const vus = new Set<string>();
          for (let i = 0; i < total; i++) {
            vus.add(exerciceGenere(matiere, '', niveau, difficulte, i)!.enonce);
          }
          expect(vus.size).toBe(total);
        }
      }
    }
  });

  it('est déterministe : le même index donne toujours le même exercice', () => {
    for (const index of [0, 7, 42, 137]) {
      expect(exerciceGenere('Mathématiques', '', 'BEPC', 'moyen', index)).toEqual(
        exerciceGenere('Mathématiques', '', 'BEPC', 'moyen', index),
      );
    }
  });

  it('reboucle sur un index hors bornes plutôt que de renvoyer null', () => {
    const total = nombreDeVariantes('Mathématiques', '', 'BEPC', 'moyen');
    expect(exerciceGenere('Mathématiques', '', 'BEPC', 'moyen', total)).toEqual(
      exerciceGenere('Mathématiques', '', 'BEPC', 'moyen', 0),
    );
    expect(exerciceGenere('Mathématiques', '', 'BEPC', 'moyen', -1)).not.toBeNull();
  });

  it('ne couvre pas les matières non numériques, et le dit', () => {
    for (const matiere of ['Anglais', 'Histoire-Géographie', 'Philosophie']) {
      expect(nombreDeVariantes(matiere, '', 'BEPC', 'moyen')).toBe(0);
      expect(exerciceGenere(matiere, '', 'BEPC', 'moyen', 0)).toBeNull();
    }
  });

  // ── Justesse mathématique ────────────────────────────────────────────────
  // Les solutions étant calculées, elles ne peuvent être fausses que si la
  // FORMULE l'est. On les recalcule donc depuis l'énoncé, sans réutiliser le
  // code du générateur.

  it('produit des équations du premier degré dont la solution vérifie l\'égalité', () => {
    let verifiees = 0;
    for (const e of exercices) {
      const m = e.enonce.match(
        /Résous l'équation : (-?\d*)x ([+-]) (\d+) = (-?\d*)x(?: ([+-]) (\d+))?\./,
      );
      if (!m) continue;
      const a = m[1] === '' ? 1 : Number(m[1]);
      const b = (m[2] === '-' ? -1 : 1) * Number(m[3]);
      const c = m[4] === '' ? 1 : Number(m[4]);
      const d = m[5] ? (m[5] === '-' ? -1 : 1) * Number(m[6]) : 0;
      const x = parseFloat(e.solution.replace('x = ', '').replace(',', '.'));

      expect(a * x + b).toBeCloseTo(c * x + d, 9);
      verifiees++;
    }
    expect(verifiees).toBeGreaterThan(50);
  });

  it('produit des triangles rectangles qui vérifient réellement Pythagore', () => {
    let verifiees = 0;
    for (const e of exercices) {
      const m = e.enonce.match(/AB = (\d+) cm et AC = (\d+) cm/);
      if (!m) continue;
      const [ab, ac] = [Number(m[1]), Number(m[2])];
      const bc = Number(e.solution.match(/BC = (\d+)/)![1]);

      expect(ab * ab + ac * ac).toBe(bc * bc);
      verifiees++;
    }
    expect(verifiees).toBeGreaterThan(20);
  });

  it('produit des équations du second degré dont les racines annulent le polynôme', () => {
    let verifiees = 0;
    for (const e of exercices) {
      const m = e.enonce.match(/: (\d*)x²(?: ([+-]) (\d+)x)?(?: ([+-]) (\d+))? = 0/);
      if (!m) continue;
      const a = m[1] === '' ? 1 : Number(m[1]);
      const b = m[2] ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0;
      const c = m[4] ? (m[4] === '-' ? -1 : 1) * Number(m[5]) : 0;
      const racines = e.solution.match(/\{(-?[\d,]+) ; (-?[\d,]+)\}/)!;

      for (const brut of [racines[1], racines[2]]) {
        const r = parseFloat(brut.replace(',', '.'));
        expect(a * r * r + b * r + c).toBeCloseTo(0, 9);
        verifiees++;
      }
    }
    expect(verifiees).toBeGreaterThan(50);
  });

  it('produit des applications de la loi d\'Ohm cohérentes', () => {
    let verifiees = 0;
    for (const e of exercices) {
      const m = e.enonce.match(/R = ([\d ,]+) Ω est soumis à une tension U = ([\d,]+) V/);
      if (!m) continue;
      const nombre = (t: string): number => parseFloat(t.replace(/ /g, '').replace(',', '.'));
      const r = nombre(m[1]);
      const u = nombre(m[2]);
      const i = nombre(e.solution.match(/I = ([\d,]+) A/)![1]);

      expect(r * i).toBeCloseTo(u, 6);
      verifiees++;
    }
    expect(verifiees).toBeGreaterThan(20);
  });
});
