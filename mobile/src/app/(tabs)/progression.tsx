import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { apiService, ErreurApi } from '@/services/api';
import { lireProgression, sauvegarderProgression } from '@/services/cache';
import Chargement from '@/components/Chargement';
import MessageErreur from '@/components/MessageErreur';
import Bouton from '@/components/Bouton';
import type { Progression as ProgressionType } from '@/types';

export default function Progression() {
  const [progression, setProgression] = useState<ProgressionType | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const p = await apiService.getProgression();
      setProgression(p);
      void sauvegarderProgression(p);
      setHorsLigne(false);
    } catch (e) {
      const err = e as ErreurApi;
      const enCache = err.horsLigne ? await lireProgression() : null;
      if (enCache) {
        setProgression(enCache);
        setHorsLigne(true);
      } else {
        setErreur(err);
      }
    } finally {
      setChargement(false);
      setRafraichit(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  const recommandation = progression?.recommandation;

  return (
    <SafeAreaView className="flex-1 bg-brand-paper" edges={['top']}>
      <ScrollView
        contentContainerClassName="gap-5 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={() => {
              setRafraichit(true);
              void charger();
            }}
          />
        }
      >
        <Text className="text-brand-green-dark text-xl font-bold">Ta progression</Text>

        {horsLigne ? (
          <View className="rounded-xl border border-brand-gold/40 bg-brand-gold-soft p-3">
            <Text className="text-brand-green-dark text-sm">
              📡 Hors connexion : données enregistrées lors de ta dernière session.
            </Text>
          </View>
        ) : null}

        {chargement ? <Chargement message="Chargement de ta progression…" pleinEcran /> : null}

        {!chargement && erreur ? (
          <MessageErreur
            message={erreur.message}
            horsLigne={erreur.horsLigne}
            onReessayer={() => {
              setChargement(true);
              void charger();
            }}
          />
        ) : null}

        {!chargement && !erreur && progression ? (
          <>
            <View className="flex-row items-center gap-4 rounded-2xl bg-brand-green p-5">
              <View className="h-20 w-20 items-center justify-center rounded-full border-4 border-brand-gold">
                <Text className="text-xl font-bold text-white">{progression.global.taux} %</Text>
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-base font-bold text-white">Taux de réussite</Text>
                <Text className="text-sm text-white/90">
                  {progression.global.faits} exercice{progression.global.faits > 1 ? 's' : ''} fait
                  {progression.global.faits > 1 ? 's' : ''}
                </Text>
                <Text className="text-sm text-white/90">
                  {progression.global.reussis} réussite{progression.global.reussis > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {recommandation ? (
              <View className="gap-3 rounded-xl border border-brand-wrong-text/30 bg-brand-wrong-bg p-4">
                <Text className="text-brand-wrong-text text-xs font-bold uppercase">
                  ⚠️ À revoir en priorité
                </Text>
                <Text className="text-brand-ink text-sm">
                  Ton score est encore faible en{' '}
                  <Text className="font-bold">{recommandation.libelle}</Text> (
                  {recommandation.scoreMaitrise} %).
                </Text>
                <Bouton
                  titre="S'entraîner sur ce thème"
                  variante="secondaire"
                  onPress={() =>
                    router.push({
                      pathname: '/entrainement',
                      params: {
                        themeId: recommandation.themeId,
                        difficulte: 'facile',
                        themeLibelle: recommandation.libelle,
                      },
                    })
                  }
                />
              </View>
            ) : null}

            <View className="gap-3">
              <Text className="text-brand-green-dark font-bold">🎯 Maîtrise par thème</Text>

              {progression.parTheme.map((t) => {
                const bon = t.scoreMaitrise >= 50;
                return (
                  <View
                    key={t.themeId}
                    className="rounded-xl border border-brand-lines bg-white p-4"
                  >
                    <View className="mb-2 flex-row items-center justify-between gap-2">
                      <Text className="text-brand-ink flex-1 text-sm font-medium">{t.libelle}</Text>
                      <Text
                        className={`text-sm font-bold ${
                          bon ? 'text-brand-correct-text' : 'text-brand-wrong-text'
                        }`}
                      >
                        {t.scoreMaitrise} %
                      </Text>
                    </View>

                    <View
                      className="h-2 overflow-hidden rounded-full bg-brand-lines"
                      accessibilityRole="progressbar"
                      accessibilityValue={{ now: t.scoreMaitrise, min: 0, max: 100 }}
                      accessibilityLabel={`Maîtrise de ${t.libelle}`}
                    >
                      <View
                        style={{ width: `${t.scoreMaitrise}%` }}
                        className={`h-full rounded-full ${
                          bon ? 'bg-brand-correct-text' : 'bg-brand-wrong-text'
                        }`}
                      />
                    </View>

                    <Text className="text-brand-ink/60 mt-2 text-xs">
                      {t.nbReussies} réussi{t.nbReussies > 1 ? 's' : ''} sur {t.nbTentatives}{' '}
                      tentative{t.nbTentatives > 1 ? 's' : ''}
                    </Text>
                  </View>
                );
              })}

              {progression.parTheme.length === 0 ? (
                <View className="items-center gap-3 rounded-xl border border-dashed border-brand-lines bg-white py-8">
                  <Text className="text-3xl">📈</Text>
                  <Text className="text-brand-ink/70 text-center text-sm">
                    Fais ton premier exercice pour voir ta progression !
                  </Text>
                  <Bouton titre="Choisir un thème" onPress={() => router.push('/')} />
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
