import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiService, ErreurApi } from '../services/api';
import Loader from '../components/Loader';
import MessageErreur from '../components/MessageErreur';
import EnTete from '../components/EnTete';
import type { Progression as ProgressionType } from '../types';

export default function Progression() {
  const navigate = useNavigate();

  const [progression, setProgression] = useState<ProgressionType | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
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

  const recommandation = progression?.recommandation;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <EnTete titre="Ta progression" retourVers="/" />

      {chargement && <Loader message="Chargement de ta progression…" pleinePage />}

      {!chargement && erreur && (
        <MessageErreur message={erreur.message} horsLigne={erreur.horsLigne} onReessayer={charger} />
      )}

      {!chargement && !erreur && progression && (
        <>
          <section
            aria-label="Résultats globaux"
            className="flex items-center gap-4 rounded-2xl bg-brand-green p-6 text-white shadow-lg"
          >
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-brand-gold bg-white/10">
              <span className="text-2xl font-bold">{progression.global.taux} %</span>
            </div>
            <div>
              <h2 className="mb-1 text-lg font-bold">Taux de réussite</h2>
              <p className="text-sm opacity-90">
                {progression.global.faits} exercice{progression.global.faits > 1 ? 's' : ''} réalisé
                {progression.global.faits > 1 ? 's' : ''}
              </p>
              <p className="text-sm opacity-90">
                {progression.global.reussis} réussite{progression.global.reussis > 1 ? 's' : ''}
              </p>
            </div>
          </section>

          {recommandation && (
            <section
              aria-label="Thème à revoir en priorité"
              className="flex items-start gap-3 rounded-xl border border-brand-wrong-text/30 bg-brand-wrong-bg p-4"
            >
              <AlertTriangle
                className="mt-0.5 shrink-0 text-brand-wrong-text"
                size={20}
                aria-hidden="true"
              />
              <div className="flex-1">
                <h2 className="mb-1 text-sm font-bold tracking-wider text-brand-wrong-text uppercase">
                  À revoir en priorité
                </h2>
                <p className="text-sm text-brand-ink">
                  Ton score est encore faible en <strong>{recommandation.libelle}</strong> (
                  {recommandation.scoreMaitrise} %).
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/entrainement', {
                      state: { themeId: recommandation.themeId, difficulte: 'facile' },
                    })
                  }
                  className="mt-3 w-full rounded-lg border border-brand-wrong-text/30 bg-white px-4 py-2 text-sm font-bold text-brand-wrong-text"
                >
                  S'entraîner sur ce thème (Facile)
                </button>
              </div>
            </section>
          )}

          <section aria-label="Maîtrise par thème">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-brand-green-dark">
              <Target size={18} aria-hidden="true" /> Maîtrise par thème
            </h2>

            <div className="flex flex-col gap-3">
              {progression.parTheme.map((t) => {
                const bon = t.scoreMaitrise >= 50;
                return (
                  <div
                    key={t.themeId}
                    className="rounded-xl border border-brand-lines bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-end justify-between gap-2">
                      <span className="text-sm font-medium text-brand-ink">{t.libelle}</span>
                      <span
                        className={`text-sm font-bold ${bon ? 'text-brand-correct-text' : 'text-brand-wrong-text'}`}
                      >
                        {t.scoreMaitrise} %
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-brand-lines/50"
                      role="progressbar"
                      aria-valuenow={t.scoreMaitrise}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Maîtrise de ${t.libelle}`}
                    >
                      <div
                        className={`h-full rounded-full ${bon ? 'bg-brand-correct-text' : 'bg-brand-wrong-text'}`}
                        style={{ width: `${t.scoreMaitrise}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      {t.nbReussies} réussi{t.nbReussies > 1 ? 's' : ''} sur {t.nbTentatives}{' '}
                      tentative{t.nbTentatives > 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}

              {progression.parTheme.length === 0 && (
                <div className="rounded-xl border border-dashed border-brand-lines bg-white py-8 text-center">
                  <TrendingUp className="mx-auto mb-2 text-brand-lines" size={32} aria-hidden="true" />
                  <p className="text-sm text-gray-600">
                    Fais ton premier exercice pour voir ta progression !
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-4 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white"
                  >
                    Choisir un thème
                  </button>
                </div>
              )}
            </div>
          </section>

          <section aria-label="Prochaines évolutions" className="mt-2 border-t border-brand-lines pt-6">
            <h2 className="mb-3 text-center text-sm font-bold tracking-wider text-gray-500 uppercase">
              Bientôt sur RépétIA
            </h2>
            <div className="flex gap-2">
              {[
                { titre: 'Niveau', valeur: 'BAC' },
                { titre: 'Matière', valeur: 'Physique' },
              ].map((item) => (
                <div
                  key={item.titre}
                  className="flex-1 rounded-xl border border-brand-lines bg-brand-paper p-3 text-center"
                >
                  <span className="mb-1 block text-xs font-bold text-gray-500">{item.titre}</span>
                  <span className="text-sm text-gray-700">{item.valeur}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
