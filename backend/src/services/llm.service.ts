import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { exerciceDeSecours } from '../data/banque';

const MODEL_NAME = process.env.LLM_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `Tu es RépétIA, un répétiteur particulier bienveillant pour des élèves béninois qui préparent le BEPC. Tu enseignes les mathématiques du programme béninois. Tu expliques toujours PAS À PAS, en français simple et clair, avec encouragements. Tu ne donnes jamais seulement la réponse : tu fais comprendre la démarche. Quand c'est utile, tu prends des exemples proches du quotidien au Bénin.`;

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

/** Nombre d'appels au LLM avant de renoncer (1 essai + 1 nouvelle tentative). */
const MAX_ESSAIS = 2;

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
  ): Promise<string> {
    const reponse = await getClient().models.generateContent({
      model: MODEL_NAME,
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
  ): Promise<T | null> {
    for (let essai = 1; essai <= MAX_ESSAIS; essai++) {
      try {
        const texte = await this.appelModele(prompt, temperature, SYSTEM_PROMPT);
        const brut = this.parseJsonResponse(texte);
        const valide = schema.safeParse(brut);

        if (valide.success) return valide.data;

        console.warn(
          `[LLM] Réponse hors schéma (essai ${essai}/${MAX_ESSAIS}) :`,
          valide.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', '),
        );
      } catch (e: any) {
        console.warn(`[LLM] Échec de l'appel (essai ${essai}/${MAX_ESSAIS}) :`, e?.message || e);
      }
    }
    return null;
  }

  /**
   * Génère un exercice. Ne lève JAMAIS d'exception : si le LLM est
   * indisponible ou renvoie une réponse inexploitable, un exercice de la
   * banque de secours (même thème, même difficulté) est renvoyé.
   */
  static async genererExercice(theme: string, difficulte: string): Promise<ExerciceGenere> {
    const prompt = `Génère UN exercice de mathématiques de niveau BEPC (3ème, programme béninois) sur le thème "${theme}". Difficulté : ${difficulte}. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises Markdown : {"enonce":"...","solution":"...","explication":"..."}. enonce = énoncé clair et court, en texte brut sans Markdown (utilise ² pour les carrés) ; solution = réponse finale concise ; explication = résolution détaillée, étape par étape, en texte brut.`;

    const resultat = await this.demanderJson(prompt, ExerciceGenereSchema, 0.7);

    if (resultat) return { ...resultat, source: 'ia_genere' };

    console.warn(`[LLM] Bascule sur la banque de secours (thème="${theme}", difficulté="${difficulte}")`);
    return { ...exerciceDeSecours(theme, difficulte), source: 'banque' };
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
  ): Promise<Correction> {
    const prompt = `Voici un exercice, la solution attendue et la réponse d'un élève. Exercice : ${enonce}. Solution attendue : ${solution}. Réponse de l'élève : ${reponseEleve}. L'élève a-t-il juste (accepte les formes mathématiquement équivalentes, par exemple 0,5 et 1/2) ? Réponds UNIQUEMENT en JSON valide, sans Markdown : {"correct":true/false,"verdict":"phrase courte et encourageante","explication":"la bonne démarche pas à pas, en français simple et en texte brut"}.`;

    const resultat = await this.demanderJson(prompt, CorrectionSchema, 0.1);
    if (resultat) return resultat;

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
  ): Promise<string> {
    let systemInstruction = SYSTEM_PROMPT;
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
      try {
        const texte = await this.appelModele(contents, 0.5, systemInstruction);
        if (texte.trim()) return texte;
        console.warn(`[LLM] Réponse de chat vide (essai ${essai}/${MAX_ESSAIS})`);
      } catch (e: any) {
        derniereErreur = e;
        console.warn(`[LLM] Échec du chat (essai ${essai}/${MAX_ESSAIS}) :`, e?.message || e);
      }
    }

    throw new LlmIndisponibleError(
      derniereErreur?.message
        ? `Le répétiteur est momentanément indisponible (${derniereErreur.message}).`
        : 'Le répétiteur est momentanément indisponible.',
    );
  }
}
