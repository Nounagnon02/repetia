import { useEffect, useRef, useState } from 'react';

/**
 * L'API Web Speech n'existe que sous préfixe navigateur (Chrome/Edge/Safari
 * récents) : pas de type officiel dans lib.dom.d.ts, d'où le typage minimal.
 */
interface ReconnaissanceVocale extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function obtenirConstructeur(): (new () => ReconnaissanceVocale) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => ReconnaissanceVocale) | null;
}

/**
 * Dictée vocale réelle via l'API Web Speech du navigateur — aucune
 * transcription côté serveur, aucun envoi audio. `onTranscription` reçoit le
 * texte reconnu à ajouter à la saisie en cours.
 */
export function useDicteeVocale(onTranscription: (texte: string) => void) {
  const reconnaissanceRef = useRef<ReconnaissanceVocale | null>(null);
  const [ecoute, setEcoute] = useState(false);
  const disponible = obtenirConstructeur() !== null;

  useEffect(() => () => reconnaissanceRef.current?.stop(), []);

  const basculer = () => {
    if (ecoute) {
      reconnaissanceRef.current?.stop();
      return;
    }
    const Constructeur = obtenirConstructeur();
    if (!Constructeur) return;

    const reconnaissance = new Constructeur();
    reconnaissance.lang = 'fr-FR';
    reconnaissance.interimResults = false;
    reconnaissance.maxAlternatives = 1;
    reconnaissance.onresult = (event) => onTranscription(event.results[0][0].transcript);
    reconnaissance.onerror = () => setEcoute(false);
    reconnaissance.onend = () => setEcoute(false);
    reconnaissanceRef.current = reconnaissance;
    reconnaissance.start();
    setEcoute(true);
  };

  return { ecoute, disponible, basculer };
}
