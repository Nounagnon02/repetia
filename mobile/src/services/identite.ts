import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const CLE = 'repetia_user_id';

/**
 * Identifiant anonyme de l'élève.
 *
 * Généré au premier lancement, conservé dans AsyncStorage et envoyé dans
 * l'en-tête `X-User-Id` de chaque requête — même mécanique que le client web.
 * Aucun compte, aucune donnée personnelle : le serveur n'associe à cet
 * identifiant que la progression scolaire.
 *
 * Le format doit satisfaire la validation du serveur : /^[A-Za-z0-9_-]{8,64}$/
 * (un UUID v4 la respecte).
 */
let enMemoire: string | null = null;

function genererIdentifiant(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    // Filet de sécurité si le module natif n'est pas disponible (tests, web).
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'eleve-';
    for (let i = 0; i < 24; i++) {
      id += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return id;
  }
}

export async function getUserId(): Promise<string> {
  if (enMemoire) return enMemoire;

  try {
    const stocke = await AsyncStorage.getItem(CLE);
    if (stocke) {
      enMemoire = stocke;
      return stocke;
    }
  } catch {
    // Stockage indisponible : on continue avec un identifiant de session.
  }

  const nouveau = genererIdentifiant();
  enMemoire = nouveau;
  try {
    await AsyncStorage.setItem(CLE, nouveau);
  } catch {
    // Sans persistance, la progression repartira de zéro au prochain lancement.
  }
  return nouveau;
}

/** Utilisé par les tests pour repartir d'un état neuf. */
export function reinitialiserIdentite(): void {
  enMemoire = null;
}
