import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service Multimodal Vision pour RépétIA :
 * Permet l'analyse des photos de sujets d'examen, schémas SVT et figures géométriques
 * envoyés par les élèves depuis leur smartphone.
 */
export class VisionService {
  private static ai = new GoogleGenAI({ apiKey: process.env.LLM_API_KEY || '' });

  static async analyserImageDevoir(
    base64Image: string,
    mimeType: string,
    promptUtilisateur: string = "Analyse et résous l'exercice ou la question présente sur cette image selon le programme officiel du Bénin (APC)."
  ): Promise<{ enonceExtrait: string; solutionPasAPas: string; matieresDetectee: string }> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Image,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
              {
                text: promptUtilisateur + " Réponds en français simple, pas à pas, sans utiliser de LaTeX (ex: √, ², ×, ÷).",
              },
            ],
          },
        ],
      });

      const texte = response.text || '';
      return {
        enonceExtrait: "Sujet/Graphique scanné extrait avec succès",
        solutionPasAPas: texte,
        matieresDetectee: "Mathématiques / Sciences",
      };
    } catch (e) {
      console.error("[VisionService Error]", e);
      return {
        enonceExtrait: "Impossible de lire l'image",
        solutionPasAPas: "Veuillez prendre une photo plus nette ou saisir le texte de votre exercice.",
        matieresDetectee: "Inconnue",
      };
    }
  }
}
