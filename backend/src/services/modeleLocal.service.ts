import { prisma } from '../db';
import { niveauPar } from '../data/niveaux';

/**
 * Modèle affiné RépétIA, servi par llama.cpp (`llama-server`, API compatible
 * OpenAI) — phase 5 du plan d'entraînement (`recherche/PLAN_ENTRAINEMENT.md`).
 *
 * MODE OMBRE : pour chaque génération ou correction servie à l'élève, le même
 * prompt est aussi envoyé au modèle affiné ; sa réponse est rangée dans
 * `ComparaisonOmbre`, à côté de celle qui a été servie, et n'est JAMAIS
 * montrée à l'élève. On mesure ainsi le modèle sur le trafic réel avant de
 * lui confier le moindre élève.
 *
 * Garanties, dans l'esprit de l'invariant « le service IA ne fait jamais
 * planter une requête » :
 *   • `ombre()` ne renvoie rien et ne lève jamais : l'appel part après que la
 *     réponse servie est connue, sans que la requête de l'élève l'attende ;
 *   • délai maximal, échantillonnage et plafond d'appels simultanés : un
 *     serveur CPU lent ou tombé ne s'engorge pas et n'engorge rien ;
 *   • niveaux 6ème → BAC seulement : le banc a montré que le modèle ne tient
 *     pas le supérieur (résolution L1/L2 à 10 %) ;
 *   • aucun identifiant d'élève n'est conservé.
 *
 * Variables d'environnement (lues à chaque appel) :
 *   MODELE_LOCAL_MODE          off (défaut) | ombre
 *   MODELE_LOCAL_URL           ex. http://127.0.0.1:8080 (sans /v1)
 *   MODELE_LOCAL_CLE           jeton Bearer, si le serveur en exige un
 *   MODELE_LOCAL_NOM           nom consigné avec chaque comparaison
 *   MODELE_LOCAL_DELAI_MS      délai maximal d'une réponse (défaut 120 000)
 *   MODELE_LOCAL_ECHANTILLON   part des requêtes doublées, de 0 à 1 (défaut 1)
 *   MODELE_LOCAL_CONCURRENCE   appels simultanés au plus (défaut 1)
 */

export type TacheOmbre = 'generation' | 'correction';

export interface DemandeOmbre {
  tache: TacheOmbre;
  matiere: string;
  niveau: string;
  theme?: string;
  difficulte?: string;
  /** Persona courte (`promptSystemeCourt`) : celle de l'entraînement. */
  systeme: string;
  consigne: string;
  temperature: number;
  entree: Record<string, unknown>;
  reference: Record<string, unknown>;
  referenceSource: 'ia_genere' | 'banque' | 'repli';
  /** Vrai si le texte du modèle est un JSON conforme au schéma de la tâche. */
  valider: (texte: string) => boolean;
}

/** Le modèle n'est pas doublé au-delà du BAC (voir plus haut). */
const RANG_MAX = niveauPar('BAC').rang;

/** Même plafond que le banc d'évaluation (`banc.py --max-jetons`). */
const MAX_JETONS = 1024;

function configuration() {
  const url = (process.env.MODELE_LOCAL_URL || '').trim().replace(/\/+$/, '');
  const echantillon = Number(process.env.MODELE_LOCAL_ECHANTILLON ?? 1);
  return {
    ombre: process.env.MODELE_LOCAL_MODE === 'ombre' && Boolean(url),
    url,
    cle: process.env.MODELE_LOCAL_CLE || '',
    nom: process.env.MODELE_LOCAL_NOM || 'repetia-v2',
    delaiMs: Number(process.env.MODELE_LOCAL_DELAI_MS) || 120_000,
    echantillon: Number.isFinite(echantillon) ? Math.min(1, Math.max(0, echantillon)) : 1,
    concurrence: Math.max(1, Number(process.env.MODELE_LOCAL_CONCURRENCE) || 1),
  };
}

/** Comparaisons en cours : sert au plafond d'appels et aux tests. */
const enCours = new Set<Promise<void>>();

export class ModeleLocalService {
  /**
   * Double la requête vers le modèle affiné, sans l'attendre.
   * Ne renvoie rien et ne lève JAMAIS.
   */
  static ombre(demande: DemandeOmbre): void {
    try {
      const cfg = configuration();
      if (!cfg.ombre) return;
      if (niveauPar(demande.niveau).rang > RANG_MAX) return;
      if (enCours.size >= cfg.concurrence) return;
      if (Math.random() >= cfg.echantillon) return;

      const tache = this.comparer(demande, cfg);
      enCours.add(tache);
      void tache.finally(() => enCours.delete(tache));
    } catch (e: any) {
      console.warn('[Modèle local] Mode ombre ignoré :', e?.message || e);
    }
  }

  /** Attend la fin des comparaisons en cours (tests, arrêt propre). */
  static async attendre(): Promise<void> {
    await Promise.allSettled([...enCours]);
  }

  /** Appel au serveur llama.cpp. Lève en cas d'échec (le mode ombre l'intercepte). */
  static async appeler(
    systeme: string,
    consigne: string,
    temperature: number,
    cfg = configuration(),
  ): Promise<string> {
    const reponse = await fetch(`${cfg.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.cle ? { Authorization: `Bearer ${cfg.cle}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.nom,
        messages: [
          { role: 'system', content: systeme },
          { role: 'user', content: consigne },
        ],
        temperature,
        top_p: 0.95,
        max_tokens: MAX_JETONS,
        // Le modèle a été entraîné sans phase de réflexion (`enable_thinking=False`).
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(cfg.delaiMs),
    });
    if (!reponse.ok) {
      throw new Error(`HTTP ${reponse.status}`);
    }
    const corps: any = await reponse.json();
    const texte = corps?.choices?.[0]?.message?.content;
    if (typeof texte !== 'string') {
      throw new Error('Réponse sans texte');
    }
    return texte;
  }

  private static async comparer(d: DemandeOmbre, cfg: ReturnType<typeof configuration>): Promise<void> {
    const debut = Date.now();
    let candidat: string | null = null;
    let candidatValide = false;
    let erreur: string | null = null;
    try {
      candidat = await this.appeler(d.systeme, d.consigne, d.temperature, cfg);
      candidatValide = d.valider(candidat);
    } catch (e: any) {
      erreur = String(e?.name === 'TimeoutError' ? 'Délai dépassé' : e?.message || e).slice(0, 500);
    }
    try {
      await prisma.comparaisonOmbre.create({
        data: {
          tache: d.tache,
          matiere: d.matiere,
          niveau: d.niveau,
          theme: d.theme ?? null,
          difficulte: d.difficulte ?? null,
          entree: JSON.stringify(d.entree),
          reference: JSON.stringify(d.reference),
          referenceSource: d.referenceSource,
          candidat,
          candidatValide,
          dureeMs: Date.now() - debut,
          erreur,
          modele: cfg.nom,
        },
      });
    } catch (e: any) {
      console.warn("[Modèle local] Comparaison non enregistrée :", e?.message || e);
    }
  }
}
