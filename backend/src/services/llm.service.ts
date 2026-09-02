import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { exerciceDeSecours } from '../data/banque';
import { normaliserChamps, normaliserTexte } from './texte.service';
import { RagService } from './rag.service';
import { MathSolverService } from './math_solver.service';

/**
 * Modèles essayés dans l'ordre.
 *
 * Le quota gratuit de Gemini se compte par modèle et par jour : un modèle
 * principal peut être épuisé alors qu'un modèle allégé répond encore. On
 * dégrade donc vers le second AVANT de tomber sur la banque de secours —
 * l'élève garde une vraie explication de l'IA plutôt qu'un exercice figé.
 */
const MODELES = [
  process.env.LLM_MODEL || 'gemini-3.5-flash',
  process.env.LLM_MODEL_SECOURS || 'gemini-flash-lite-latest',
];

/** Matières où l'écriture symbolique compte : maths, physique-chimie. */
const MATIERES_SCIENTIFIQUES = /math|physique|chimie|technolog/i;

const REGLE_MATHS = `

RÈGLE D'ÉCRITURE DES SYMBOLES — impérative :
N'utilise JAMAIS de LaTeX. Pas de $, pas de \\sqrt, pas de \\frac, pas de \\times.
Écris directement avec les symboles que l'élève voit au tableau :
  racine carrée → √45, √(x + 1)
  puissances    → x², x³, 10⁵
  multiplication→ 3 × 5      division → 12 ÷ 4      fraction → 3/4
  comparaisons  → ≤ ≥ ≠ ≈    angle → ∠ABC = 60°     parallèle → (MN) ∥ (BC)`;

/**
 * Persona du répétiteur, adaptée à la matière et enrichie par le RAG du programme officiel.
 */
function promptSysteme(matiere: string, niveau: string = 'BEPC', theme?: string): string {
  const examen = niveau === 'BAC' ? 'le Baccalauréat' : 'le BEPC';
  const public_ = niveau === 'BAC' ? 'lycéens (2nde–Terminale)' : 'collégiens (6ème–3ème)';
  const base = `Tu es RépétIA, un répétiteur particulier bienveillant pour des ${public_} béninois qui préparent ${examen}. Tu enseignes ${matiere} du programme béninois. Tu expliques toujours PAS À PAS, en français simple et clair, avec encouragements. Tu ne donnes jamais seulement la réponse : tu fais comprendre la démarche. Quand c'est utile, tu prends des exemples proches du quotidien au Bénin.

N'utilise pas de titres Markdown (# ou ##). Pour insister, entoure de **deux
astérisques**. Sépare les étapes par des retours à la ligne, pas par des tirets
de séparation.`;

  const promptComplet = MATIERES_SCIENTIFIQUES.test(matiere) ? base + REGLE_MATHS : base;
  return RagService.enrichirPromptSysteme(promptComplet, matiere, theme, niveau);
}

/** Matière par défaut quand l'appelant n'en fournit pas (chat libre). */
const MATIERE_GENERIQUE = 'les mathématiques';

/** Levée quand le LLM reste injoignable après tous les essais (chat uniquement). */
export class LlmIndisponibleError extends Error {
  constructor(message = 'Le répétiteur est momentanément indisponible.') {
    super(message);
    this.name = 'LlmIndisponibleError';
  }
}

/**
 * Schémas de la sortie attendue du LLM.
 * Un JSON syntaxiquement valide mais incomplet (ex. `{}`) doit être REJETÉ :
 * sans cela il traverserait le service et ferait échouer l'écriture en base.
 */
const texteNonVide = z.string().trim().min(1);

const ExerciceGenereSchema = z.object({
  enonce: texteNonVide,
  solution: texteNonVide,
  explication: texteNonVide,
});

const CorrectionSchema = z.object({
  correct: z.boolean(),
  verdict: texteNonVide,
  explication: texteNonVide,
});

export type ExerciceGenere = z.infer<typeof ExerciceGenereSchema> & {
  source: 'ia_genere' | 'banque';
};
export type Correction = z.infer<typeof CorrectionSchema>;

/** Un essai par modèle de la chaîne. */
const MAX_ESSAIS = MODELES.length;

/**
 * Client Gemini créé à la demande (et non à l'import) : le serveur, les tests
 * et le build doivent fonctionner même sans LLM_API_KEY dans l'environnement.
 */
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new LlmIndisponibleError('LLM_API_KEY absente de la configuration serveur.');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Réinitialise le client mémorisé (utilisé par les tests). */
export function resetLlmClient(): void {
  client = null;
}

export class LlmService {
  /**
   * Extrait un objet JSON d'une réponse LLM : retire les balises Markdown,
   * ignore le texte autour, puis isole le premier bloc { ... }.
   * Lève une erreur si rien d'exploitable n'est trouvé.
   */
  private static parseJsonResponse(text: string): unknown {
    const cleaned = String(text ?? '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const debut = cleaned.indexOf('{');
    const fin = cleaned.lastIndexOf('}');
    if (debut === -1 || fin === -1 || fin <= debut) {
      throw new Error('Aucun objet JSON trouvé dans la réponse du LLM');
    }

    return JSON.parse(cleaned.substring(debut, fin + 1));
  }

  /** Un appel au modèle, sans gestion d'erreur (la boucle d'essais s'en charge). */
  private static async appelModele(
    contents: any,
    temperature: number,
    systemInstruction: string,
    modele: string,
  ): Promise<string> {
    const reponse = await getClient().models.generateContent({
      model: modele,
      contents,
      config: { systemInstruction, temperature },
    });
    return reponse.text || '';
  }

  /**
   * Appelle le LLM, parse puis VALIDE la réponse contre un schéma.
   * Réessaie une fois si le modèle échoue ou renvoie une réponse inexploitable.
   * Renvoie null quand tous les essais ont échoué.
   */
  private static async demanderJson<T>(
    prompt: string,
    schema: z.ZodType<T>,
    temperature: number,
    systemInstruction: string,
  ): Promise<T | null> {
    for (let essai = 1; essai <= MAX_ESSAIS; essai++) {
      const modele = MODELES[essai - 1];
      try {
        const texte = await this.appelModele(prompt, temperature, systemInstruction, modele);
        const brut = this.parseJsonResponse(texte);
        const valide = schema.safeParse(brut);

        if (valide.success) return valide.data;

        console.warn(
          `[LLM] Réponse hors schéma (${modele}, essai ${essai}/${MAX_ESSAIS}) :`,
          valide.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', '),
        );
      } catch (e: any) {
        console.warn(`[LLM] Échec de l'appel (${modele}, essai ${essai}/${MAX_ESSAIS}) :`, e?.message || e);
      }
    }
    return null;
  }

  /**
   * Génère un exercice. Ne lève JAMAIS d'exception : si le LLM est
   * indisponible ou renvoie une réponse inexploitable, un exercice de la
   * banque de secours (même thème, même difficulté) est renvoyé.
   */
  static async genererExercice(
    theme: string,
    difficulte: string,
    matiere: string = MATIERE_GENERIQUE,
    niveau: string = 'BEPC',
  ): Promise<ExerciceGenere> {
    const niveauTexte = niveau === 'BAC'
      ? 'BAC (Terminale, programme béninois)'
      : 'BEPC (3ème, programme béninois)';
    const prompt = `Génère UN exercice de ${matiere} de niveau ${niveauTexte} sur le thème "${theme}". Difficulté : ${difficulte}. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises Markdown : {"enonce":"...","solution":"...","explication":"..."}. enonce = énoncé clair et court, en texte brut ; solution = réponse finale concise ; explication = résolution détaillée, étape par étape, en texte brut.`;

    const resultat = await this.demanderJson(prompt, ExerciceGenereSchema, 0.7, promptSysteme(matiere, niveau, theme));

    if (resultat) {
      const propre = normaliserChamps(resultat, ['enonce', 'solution', 'explication']);
      return { ...propre, source: 'ia_genere' };
    }

    console.warn(
      `[LLM] Bascule sur la banque de secours (matière="${matiere}", thème="${theme}", difficulté="${difficulte}")`,
    );
    return { ...exerciceDeSecours(theme, difficulte, matiere), source: 'banque' };
  }

  /**
   * Corrige la réponse d'un élève. Ne lève JAMAIS d'exception : en dernier
   * recours, une correction de repli s'appuyant sur la solution attendue est
   * renvoyée, pour que l'élève ait toujours une explication.
   */
  static async corrigerExercice(
    enonce: string,
    solution: string,
    reponseEleve: string,
    matiere: string = MATIERE_GENERIQUE,
    niveau: string = 'BEPC',
  ): Promise<Correction> {
    const prompt = `Voici un exercice, la solution attendue et la réponse d'un élève. Exercice : ${enonce}. Solution attendue : ${solution}. Réponse de l'élève : ${reponseEleve}. L'élève a-t-il juste (accepte les formes mathématiquement équivalentes, par exemple 0,5 et 1/2) ? Réponds UNIQUEMENT en JSON valide, sans Markdown : {"correct":true/false,"verdict":"phrase courte et encourageante","explication":"la bonne démarche pas à pas, en français simple et en texte brut"}.`;

    const resultat = await this.demanderJson(prompt, CorrectionSchema, 0.1, promptSysteme(matiere, niveau));
    if (resultat) {
      const propre = normaliserChamps(resultat, ['verdict', 'explication']);
      // Validation croisée avec le solveur mathématique déterministe pour les matières scientifiques
      if (MATIERES_SCIENTIFIQUES.test(matiere) && !propre.correct) {
        const nombresSolution = solution.match(/-?\d+(\.\d+)?/g);
        if (nombresSolution && nombresSolution.length === 1) {
          const valAttendue = parseFloat(nombresSolution[0]);
          if (MathSolverService.verifierCoherenceReponse(reponseEleve, valAttendue)) {
            propre.correct = true;
            propre.verdict = 'Bravo ! Ta réponse est mathématiquement correcte.';
          }
        }
      }
      return propre;
    }

    console.warn('[LLM] Correction de repli utilisée.');
    return {
      correct: false,
      verdict: "Je n'ai pas pu vérifier ta réponse pour le moment, mais voici la démarche.",
      explication: `La solution attendue était : ${solution}.\n\nCompare-la avec ta réponse « ${reponseEleve} », puis reprends l'exercice étape par étape. Tu peux aussi me poser une question dans le chat.`,
    };
  }

  /**
   * Répond dans le chat répétiteur.
   * Contrairement à la génération et à la correction, il n'existe pas de repli
   * pertinent : après tous les essais, une LlmIndisponibleError est levée pour
   * que l'interface affiche une vraie erreur (et un bouton « Réessayer »)
   * plutôt qu'une fausse réponse du répétiteur.
   */
  static async chat(
    message: string,
    historique: { role: string; content: string }[],
    contexteExercice?: string,
    matiere: string = MATIERE_GENERIQUE,
    niveau: string = 'BEPC',
  ): Promise<string> {
    let systemInstruction = promptSysteme(matiere, niveau);
    if (contexteExercice) {
      systemInstruction += `\nL'élève travaille sur cet exercice : ${contexteExercice}`;
    }

    const contents = [
      ...historique.map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    let derniereErreur: any = null;

    for (let essai = 1; essai <= MAX_ESSAIS; essai++) {
      const modele = MODELES[essai - 1];
      try {
        const texte = await this.appelModele(contents, 0.5, systemInstruction, modele);
        if (texte.trim()) return normaliserTexte(texte);
        console.warn(`[LLM] Réponse de chat vide (${modele}, essai ${essai}/${MAX_ESSAIS})`);
      } catch (e: any) {
        derniereErreur = e;
        console.warn(`[LLM] Échec du chat (${modele}, essai ${essai}/${MAX_ESSAIS}) :`, e?.message || e);
      }
    }

    throw new LlmIndisponibleError(
      derniereErreur?.message
        ? `Le répétiteur est momentanément indisponible (${derniereErreur.message}).`
        : 'Le répétiteur est momentanément indisponible.',
    );
  }
}
