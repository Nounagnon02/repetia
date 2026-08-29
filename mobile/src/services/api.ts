import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { getUserId } from './identite';
import type {
  Matiere,
  Theme,
  Exercice,
  Correction,
  Progression,
  MessageChat,
} from '@/types';

/** Les appels IA passent par le serveur et peuvent être longs. */
const TIMEOUT_MS = 60_000;

const PORT_API = process.env.EXPO_PUBLIC_API_PORT ?? '3000';

/**
 * Détermine l'URL du backend.
 *
 * Piège classique en développement mobile : `localhost` désigne le téléphone
 * ou l'émulateur, PAS la machine de développement. On déduit donc l'adresse
 * depuis l'hôte Metro auquel l'application est déjà connectée
 * (`hostUri` vaut par exemple « 192.168.1.12:8081 »), ce qui fonctionne aussi
 * bien sur un appareil physique que sur un émulateur du même réseau.
 *
 * `EXPO_PUBLIC_API_BASE_URL` reste prioritaire : indispensable pour pointer
 * vers un backend déployé, ou en mode `--tunnel`.
 */
export function urlApiParDefaut(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  const hote = hostUri?.split(':')[0];
  if (hote && hote !== 'localhost' && hote !== '127.0.0.1') {
    return `http://${hote}:${PORT_API}/api`;
  }
  return `http://localhost:${PORT_API}/api`;
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? urlApiParDefaut();

const api = axios.create({ baseURL: API_BASE_URL, timeout: TIMEOUT_MS });

api.interceptors.request.use(async (config) => {
  config.headers['X-User-Id'] = await getUserId();
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

/** Traduit une erreur réseau en message compréhensible par un élève. */
function versErreurApi(erreur: unknown): ErreurApi {
  const axiosErr = erreur as AxiosError<{ error?: string }>;

  if (axiosErr?.code === 'ECONNABORTED') {
    return new ErreurApi(
      'La réponse met trop de temps à arriver. Vérifie ta connexion et réessaie.',
      undefined,
      true,
    );
  }

  if (!axiosErr?.response) {
    return new ErreurApi(
      "Impossible de joindre RépétIA. Vérifie ta connexion, puis réessaie.",
      undefined,
      true,
    );
  }

  const { status, data } = axiosErr.response;
  if (data?.error) return new ErreurApi(data.error, status);

  if (status === 429) {
    return new ErreurApi('Tu vas un peu vite ! Patiente quelques instants.', status);
  }
  if (status >= 500) {
    return new ErreurApi('Le serveur rencontre un problème. Réessaie dans un instant.', status);
  }
  return new ErreurApi('Une erreur est survenue. Réessaie.', status);
}

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
