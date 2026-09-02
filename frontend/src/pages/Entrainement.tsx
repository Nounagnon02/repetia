import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, MessageCircle, ChevronRight, BookOpen, Camera, Mic } from 'lucide-react';
import { apiService, ErreurApi } from '../services/api';
import Loader from '../components/Loader';
import MessageErreur from '../components/MessageErreur';
import TexteFormate from '../components/TexteFormate';
import EnTete from '../components/EnTete';
import { sauvegarderExercice, lireDernierExercice } from '../services/horsLigne';
import type { Exercice, Correction } from '../types';

interface EtatNavigation {
  themeId?: string;
  difficulte?: string;
}

export default function Entrainement() {
  const { state } = useLocation() as { state: EtatNavigation | null };
  const navigate = useNavigate();

  const [exercice, setExercice] = useState<Exercice | null>(null);
  const [chargementExo, setChargementExo] = useState(true);
  const [erreurExo, setErreurExo] = useState<ErreurApi | null>(null);

  const [reponse, setReponse] = useState('');
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [chargementCorrection, setChargementCorrection] = useState(false);
  const [erreurCorrection, setErreurCorrection] = useState<ErreurApi | null>(null);
  /** Vrai quand on affiche l'exercice mis en cache faute de connexion. */
  const [modeHorsLigne, setModeHorsLigne] = useState(false);

  const themeId = state?.themeId;
  const difficulte = state?.difficulte || 'moyen';

  const genererExercice = useCallback(async () => {
    if (!themeId) return;

    setChargementExo(true);
    setErreurExo(null);
    setCorrection(null);
    setErreurCorrection(null);
    setReponse('');

    try {
      const nouvel = await apiService.genererExercice(themeId, difficulte);
      setExercice(nouvel);
      setModeHorsLigne(false);
      sauvegarderExercice(nouvel, null);
    } catch (e) {
      const erreur = e as ErreurApi;

      // Hors connexion : plutôt qu'un écran vide, on ressort le dernier
      // exercice travaillé, avec sa correction s'il en avait une.
      const sauvegarde = erreur.horsLigne ? lireDernierExercice() : null;
      if (sauvegarde) {
        setExercice(sauvegarde.exercice);
        setCorrection(sauvegarde.correction);
        setModeHorsLigne(true);
      } else {
        setErreurExo(erreur);
        setExercice(null);
      }
    } finally {
      setChargementExo(false);
    }
  }, [themeId, difficulte]);

  useEffect(() => {
    // Accès direct à /entrainement sans avoir choisi de thème : retour à l'accueil.
    if (!themeId) {
      navigate('/', { replace: true });
      return;
    }
    genererExercice();
  }, [themeId, navigate, genererExercice]);

  const corriger = async () => {
    if (!reponse.trim() || !exercice) return;

    setChargementCorrection(true);
    setErreurCorrection(null);
    try {
      const resultat = await apiService.soumettreTentative(exercice.exerciceId, reponse);
      setCorrection(resultat);
      sauvegarderExercice(exercice, resultat);
    } catch (e) {
      setErreurCorrection(e as ErreurApi);
    } finally {
      setChargementCorrection(false);
    }
  };

  const poserQuestion = () => {
    navigate('/chat', {
      state: { exerciceId: exercice?.exerciceId, contexte: exercice?.enonce },
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-24">
      <EnTete titre="Entraînement" retourVers="/" />

      {chargementExo && <Loader message="RépétIA prépare ton exercice…" pleinePage />}

      {!chargementExo && erreurExo && (
        <MessageErreur
          message={erreurExo.message}
          horsLigne={erreurExo.horsLigne}
          onReessayer={genererExercice}
        />
      )}

      {!chargementExo && !erreurExo && exercice && (
        <>
          {modeHorsLigne && (
            <p
              role="status"
              className="rounded-xl border border-brand-gold/40 bg-brand-gold-soft p-3 text-sm text-brand-green-dark"
            >
              Tu es hors connexion. Voici ton dernier exercice — la correction et le chat
              reviendront dès que le réseau sera rétabli.
            </p>
          )}

          <section
            aria-label="Énoncé de l'exercice"
            className="rounded-xl border-l-4 border-l-brand-gold bg-white p-5 shadow-sm"
          >
            <h2 className="mb-2 font-serif text-lg font-bold text-brand-green-dark">Exercice</h2>
            <TexteFormate texte={exercice.enonce} className="text-brand-ink" />
          </section>

          {!correction ? (
            <div className="mt-2 flex flex-col gap-3">
              <label htmlFor="reponse" className="font-bold text-brand-green-dark">
                Ta réponse
              </label>
              <textarea
                id="reponse"
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                placeholder="Écris ta réponse et ta démarche…"
                className="min-h-[120px] w-full resize-none rounded-xl border border-brand-lines bg-white p-4 focus:border-brand-green focus:ring-2 focus:ring-brand-green focus:outline-none"
              />

              {erreurCorrection && (
                <MessageErreur
                  message={erreurCorrection.message}
                  horsLigne={erreurCorrection.horsLigne}
                  onReessayer={corriger}
                />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={corriger}
                  disabled={!reponse.trim() || chargementCorrection}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-3 font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chargementCorrection ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-b-white"
                      />
                      <span>Correction…</span>
                    </>
                  ) : (
                    'Corriger ma réponse'
                  )}
                </button>
                <input
                  type="file"
                  id="exo-photo-input"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setReponse((r) => (r ? r + " [Photo scannée]" : "[Photo scannée de l'exercice]"));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('exo-photo-input')?.click()}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-lines bg-white text-brand-green shadow-sm hover:bg-brand-paper"
                  title="Scanner une photo"
                  aria-label="Scanner une photo"
                >
                  <Camera size={22} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setReponse((r) => (r ? r + " " : "") + "Résolution guidée pas à pas.")}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-lines bg-white text-brand-gold shadow-sm hover:bg-brand-gold-soft"
                  title="Dictée vocale"
                  aria-label="Dictée vocale"
                >
                  <Mic size={22} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={poserQuestion}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-lines bg-white text-brand-green-dark shadow-sm"
                  title="Je bloque, explique-moi"
                  aria-label="Je bloque, explique-moi"
                >
                  <MessageCircle size={24} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-4" aria-live="polite">
              <div
                className={`flex gap-3 rounded-xl p-4 ${
                  correction.correct
                    ? 'bg-brand-correct-bg text-brand-correct-text'
                    : 'bg-brand-wrong-bg text-brand-wrong-text'
                }`}
              >
                <div className="mt-1" aria-hidden="true">
                  {correction.correct ? <CheckCircle size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {correction.correct ? 'Bien joué !' : 'À revoir'}
                  </h2>
                  <p className="opacity-90">{correction.verdict}</p>
                </div>
              </div>

              <section
                aria-label="Explication pas à pas"
                className="rounded-xl border border-brand-lines bg-white p-5 shadow-sm"
              >
                <h2 className="mb-3 flex items-center gap-2 font-bold text-brand-green-dark">
                  <BookOpen size={18} aria-hidden="true" /> Explication pas à pas
                </h2>
                <TexteFormate texte={correction.explication} className="text-sm text-gray-700" />
              </section>

              <p className="text-center text-sm text-gray-600">
                Maîtrise de ce thème :{' '}
                <strong className="text-brand-green-dark">
                  {correction.progression.scoreMaitrise} %
                </strong>
              </p>
            </div>
          )}

          {correction && (
            <div className="fixed right-0 bottom-0 left-0 mx-auto flex max-w-md gap-2 border-t border-brand-lines bg-white/95 p-4 backdrop-blur-sm">
              <button
                type="button"
                onClick={poserQuestion}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-lines bg-white py-3 font-bold text-brand-green-dark"
              >
                Une question ?
              </button>
              <button
                type="button"
                onClick={genererExercice}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-gold py-3 font-bold text-white shadow-md"
              >
                Suivant <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
