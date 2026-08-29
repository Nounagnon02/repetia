import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MessageCircle, Activity } from 'lucide-react';
import { apiService, ErreurApi } from '../services/api';
import Logo from '../components/Logo';
import SelecteurDifficulte from '../components/SelecteurDifficulte';
import Loader from '../components/Loader';
import MessageErreur from '../components/MessageErreur';
import type { Theme, Progression, Difficulte } from '../types';

export default function Accueil() {
  const navigate = useNavigate();

  const [themes, setThemes] = useState<Theme[]>([]);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [themeChoisi, setThemeChoisi] = useState('');
  const [difficulte, setDifficulte] = useState<Difficulte>('moyen');

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const matieres = await apiService.getMatieres();
      if (matieres.length === 0) {
        throw new ErreurApi(
          "Aucune matière n'est disponible. La base de données n'a peut-être pas été initialisée.",
        );
      }

      const listeThemes = await apiService.getThemes(matieres[0].id);
      setThemes(listeThemes);
      setThemeChoisi((actuel) => actuel || listeThemes[0]?.id || '');

      setProgression(await apiService.getProgression());
    } catch (e) {
      setErreur(e as ErreurApi);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const commencer = () => {
    if (!themeChoisi) return;
    navigate('/entrainement', { state: { themeId: themeChoisi, difficulte } });
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between py-2">
        <Logo taille={30} />
        <span className="rounded-full bg-brand-gold-soft px-3 py-1 text-xs font-bold text-brand-green-dark">
          BEPC · Maths
        </span>
      </header>

      <div className="rounded-2xl bg-brand-green p-6 text-white shadow-lg">
        <h2 className="mb-2 font-serif text-2xl">
          Salut 👋
          <br />
          On révise quoi aujourd'hui ?
        </h2>
        <p className="text-sm opacity-90">Choisis un thème et lance-toi !</p>
      </div>

      {chargement && <Loader message="Chargement de tes thèmes…" pleinePage />}

      {!chargement && erreur && (
        <MessageErreur message={erreur.message} horsLigne={erreur.horsLigne} onReessayer={charger} />
      )}

      {!chargement && !erreur && (
        <>
          {progression && progression.global.faits > 0 && (
            <button
              type="button"
              onClick={() => navigate('/progression')}
              className="flex items-center justify-between rounded-xl border border-brand-lines bg-white p-4 text-left shadow-sm active:scale-[0.99]"
            >
              <span>
                <span className="block font-bold text-brand-green-dark">Ta progression</span>
                <span className="block text-sm text-gray-600">
                  {progression.global.faits} exercice{progression.global.faits > 1 ? 's' : ''} fait
                  {progression.global.faits > 1 ? 's' : ''} · {progression.global.taux} % de réussite
                </span>
              </span>
              <Activity className="text-brand-gold" aria-hidden="true" />
            </button>
          )}

          <div className="flex flex-col gap-5">
            <fieldset>
              <legend className="mb-3 font-bold text-brand-green-dark">Thème</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choix du thème">
                {themes.map((t) => {
                  const actif = themeChoisi === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      onClick={() => setThemeChoisi(t.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        actif
                          ? 'bg-brand-green text-white'
                          : 'border border-brand-lines bg-white text-brand-ink'
                      }`}
                    >
                      {t.libelle}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 font-bold text-brand-green-dark">Difficulté</legend>
              <SelecteurDifficulte valeur={difficulte} onChange={setDifficulte} />
            </fieldset>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button
              type="button"
              onClick={commencer}
              disabled={!themeChoisi}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-4 text-lg font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-50"
            >
              <BookOpen size={20} aria-hidden="true" /> Commencer l'entraînement
            </button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-lines bg-white py-4 font-bold text-brand-green-dark transition-transform active:scale-95"
            >
              <MessageCircle size={20} aria-hidden="true" /> Poser une question
            </button>
          </div>
        </>
      )}

      <footer className="mt-4 mb-2 text-center text-xs text-gray-500">
        Notre problème, ma solution — RépétIA
      </footer>
    </div>
  );
}
