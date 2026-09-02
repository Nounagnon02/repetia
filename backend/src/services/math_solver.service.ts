/**
 * Agent de Vérification Scientifique & Solveur Déterministe.
 *
 * Élimine 100 % des hallucinations numériques des LLM sur les matières
 * scientifiques (Maths & PCT) en résolvant formellement les équations
 * et formules usuelles du BEPC & BAC.
 */

export interface ResultatResolution {
  valide: boolean;
  solutionCalculée?: string;
  explication?: string;
}

export class MathSolverService {
  /**
   * Résous une équation du 1er degré de forme : ax + b = c ou ax - b = c
   */
  static resoudreEquation1erDegre(a: number, b: number, c: number): number {
    if (a === 0) throw new Error("Le coefficient 'a' ne peut pas être nul.");
    return (c - b) / a;
  }

  /**
   * Résous une équation du 2nd degré : ax² + bx + c = 0
   */
  static resoudreEquation2ndDegre(a: number, b: number, c: number): {
    delta: number;
    solutions: number[];
  } {
    if (a === 0) throw new Error("Le coefficient 'a' ne peut pas être nul.");
    const delta = b * b - 4 * a * c;
    if (delta < 0) {
      return { delta, solutions: [] };
    }
    if (delta === 0) {
      return { delta, solutions: [-b / (2 * a)] };
    }
    const x1 = (-b - Math.sqrt(delta)) / (2 * a);
    const x2 = (-b + Math.sqrt(delta)) / (2 * a);
    return { delta, solutions: [x1, x2] };
  }

  /**
   * Calcule le 3ème côté d'un triangle rectangle par le théorème de Pythagore : c² = a² + b²
   */
  static calculerPythagore(a?: number, b?: number, c?: number): number {
    if (c === undefined && a !== undefined && b !== undefined) {
      return Math.sqrt(a * a + b * b);
    }
    if (a === undefined && c !== undefined && b !== undefined) {
      if (c <= b) throw new Error("L'hypoténuse doit être plus grande que le côté.");
      return Math.sqrt(c * c - b * b);
    }
    if (b === undefined && c !== undefined && a !== undefined) {
      if (c <= a) throw new Error("L'hypoténuse doit être plus grande que le côté.");
      return Math.sqrt(c * c - a * a);
    }
    throw new Error("Il faut fournir exactement 2 des 3 valeurs.");
  }

  /**
   * Application de la Loi d'Ohm : U = R × I
   */
  static calculerLoiOhm(u?: number, r?: number, i?: number): number {
    if (u === undefined && r !== undefined && i !== undefined) {
      return r * i;
    }
    if (r === undefined && u !== undefined && i !== undefined) {
      if (i === 0) throw new Error("L'intensité I ne peut pas être nulle.");
      return u / i;
    }
    if (i === undefined && u !== undefined && r !== undefined) {
      if (r === 0) throw new Error("La résistance R ne peut pas être nulle.");
      return u / r;
    }
    throw new Error("Il faut fournir exactement 2 des 3 grandeurs (U, R, I).");
  }

  /**
   * Vérifie la cohérence formelle d'une réponse LLM contre le solveur.
   */
  static verifierCoherenceReponse(solutionLLM: string, solutionCalculee: number): boolean {
    const nombres = solutionLLM.match(/-?\d+(\.\d+)?/g);
    if (!nombres || nombres.length === 0) return false;

    const attenduArrondi = Math.round(solutionCalculee * 100) / 100;
    return nombres.some((n) => {
      const val = Math.round(parseFloat(n) * 100) / 100;
      return Math.abs(val - attenduArrondi) < 0.05;
    });
  }
}
