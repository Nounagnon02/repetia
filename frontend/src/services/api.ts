import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { Matiere, Theme, Exercice, Correction, Progression, MessageChat } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** Les appels IA passent par le serveur et peuvent être longs. */
const TIMEOUT_MS = 60_000;

const CLE_STOCKAGE = 'repetia_user_id';

/**
 * Identifiant anonyme de l'élève : généré une fois côté navigateur, conservé
 * en localStorage, envoyé dans l'en-tête X-User-Id. Aucune donnée personnelle
 * n'est collectée et aucun compte n'est nécessaire.
 */
export function getUserId(): string {
  let userId = localStorage.getItem(CLE_STOCKAGE);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(CLE_STOCKAGE, userId);
  }
  return userId;
}

const api = axios.create({ baseURL: API_URL, timeout: TIMEOUT_MS });

api.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = getUserId();
  return config;
});

/** Erreur applicative portant un message déjà rédigé en français. */
export class ErreurApi extends Error {
  readonly status?: number;
  readonly horsLigne: boolean;

  constructor(message: string, status?: number, horsLigne = false) {
    super(message);
    this.name = 'ErreurApi';
    this.status = status;
    this.horsLigne = horsLigne;
  }
}

/** Traduit une erreur axios en message compréhensible par un élève. */
function versErreurApi(erreur: unknown): ErreurApi {
  const axiosErr = erreur as AxiosError<{ error?: string }>;

  if (axiosErr?.code === 'ECONNABORTED') {
    return new ErreurApi(
      "La réponse met trop de temps à arriver. Vérifie ta connexion et réessaie.",
      undefined,
      true,
    );
  }

  if (!axiosErr?.response) {
    return new ErreurApi(
      "Pas de connexion au serveur. Vérifie ton réseau, puis réessaie.",
      undefined,
      true,
    );
  }

  const { status, data } = axiosErr.response;
  const messageServeur = data?.error;

  if (messageServeur) return new ErreurApi(messageServeur, status);

  if (status === 429) {
    return new ErreurApi('Tu vas un peu vite ! Patiente quelques instants.', status);
  }
  if (status >= 500) {
    return new ErreurApi("Le serveur rencontre un problème. Réessaie dans un instant.", status);
  }
  return new ErreurApi("Une erreur est survenue. Réessaie.", status);
}

/** Enveloppe un appel pour qu'il rejette toujours une ErreurApi. */
async function appeler<T>(promesse: Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await promesse;
    return data;
  } catch (erreur) {
    throw versErreurApi(erreur);
  }
}

export const apiService = {
  getMatieres: (niveau = 'BEPC') =>
    appeler<Matiere[]>(api.get('/matieres', { params: { niveau } })),

  getThemes: (matiereId: string) => appeler<Theme[]>(api.get(`/matieres/${matiereId}/themes`)),

  genererExercice: (themeId: string, difficulte: string) =>
    appeler<Exercice>(api.post('/exercices/generer', { themeId, difficulte })),

  soumettreTentative: (exerciceId: string, reponseEleve: string) =>
    appeler<Correction>(api.post('/tentatives', { exerciceId, reponseEleve })),

  getProgression: () => appeler<Progression>(api.get('/progression')),

  chat: (message: string, historique: MessageChat[], exerciceId?: string) =>
    appeler<{ reponse: string }>(api.post('/chat', { message, historique, exerciceId })),
};

export default api;
