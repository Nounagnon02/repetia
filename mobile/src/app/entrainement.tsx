import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  CheckCircle2,
  MessageCircle,
  Pencil,
  RefreshCw,
  WifiOff,
  XCircle,
} from 'lucide-react-native';
import { apiService, ErreurApi } from '@/services/api';
import { couleurs } from '@/constants/theme';
import { ajouterExerciceAuLot, enregistrerCorrection, lireDernierExercice } from '@/services/cache';
import Chargement from '@/components/Chargement';
import MessageErreur from '@/components/MessageErreur';
import TexteFormate from '@/components/TexteFormate';
import Bouton from '@/components/Bouton';
import EnTeteEcran from '@/components/EnTeteEcran';
import type { Correction, Exercice } from '@/types';

const LIBELLE_DIFFICULTE: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  examen: 'Type Examen',
};

export default function Entrainement() {
  const params = useLocalSearchParams<{
    themeId?: string;
    difficulte?: string;
    themeLibelle?: string;
  }>();

  const themeId = params.themeId;
  const difficulte = params.difficulte ?? 'moyen';

  const [exercice, setExercice] = useState<Exercice | null>(null);
  const [chargementExo, setChargementExo] = useState(true);
  const [erreurExo, setErreurExo] = useState<ErreurApi | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);

  const [reponse, setReponse] = useState('');
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [chargementCorrection, setChargementCorrection] = useState(false);
  const [erreurCorrection, setErreurCorrection] = useState<ErreurApi | null>(null);

  const genererExercice = useCallback(async () => {
    if (!themeId) return;

    setChargementExo(true);
    setErreurExo(null);
    setErreurCorrection(null);
    setCorrection(null);
    setReponse('');

    try {
      const nouvel = await apiService.genererExercice(themeId, difficulte);
      setExercice(nouvel);
      setHorsLigne(false);
      void ajouterExerciceAuLot(nouvel);
    } catch (e) {
      const err = e as ErreurApi;

      // Sans réseau, on ressort le dernier exercice du lot mis en cache
      // plutôt que de laisser l'élève devant un écran vide.
      const enCache = err.horsLigne ? await lireDernierExercice() : null;
      if (enCache) {
        setExercice(enCache.exercice);
        setCorrection(enCache.correction);
        setHorsLigne(true);
      } else {
        setErreurExo(err);
        setExercice(null);
      }
    } finally {
      setChargementExo(false);
    }
  }, [themeId, difficulte]);

  useEffect(() => {
    if (!themeId) {
      router.replace('/');
      return;
    }
    void genererExercice();
  }, [themeId, genererExercice]);

  const corriger = async () => {
    if (!reponse.trim() || !exercice) return;

    setChargementCorrection(true);
    setErreurCorrection(null);
    try {
      const resultat = await apiService.soumettreTentative(exercice.exerciceId, reponse);
      setCorrection(resultat);
      void enregistrerCorrection(exercice.exerciceId, resultat);
    } catch (e) {
      setErreurCorrection(e as ErreurApi);
    } finally {
      setChargementCorrection(false);
    }
  };

  const poserQuestion = () => {
    router.push({
      pathname: '/chat',
      params: { exerciceId: exercice?.exerciceId, contexte: exercice?.enonce },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-paper" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View className="px-4">
          <EnTeteEcran titre="Entraînement" retourVers="/" />

          <View className="mb-2 flex-row flex-wrap gap-2">
            {params.themeLibelle ? (
              <View className="rounded-full bg-brand-gold-soft px-3 py-1">
                <Text className="text-brand-green-dark text-xs font-bold">
                  {params.themeLibelle}
                </Text>
              </View>
            ) : null}
            <View className="rounded-full border border-brand-lines bg-white px-3 py-1">
              <Text className="text-brand-ink text-xs font-bold">
                {LIBELLE_DIFFICULTE[difficulte] ?? difficulte}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerClassName="gap-4 px-4 pb-6" keyboardShouldPersistTaps="handled">
          {chargementExo ? (
            <Chargement message="RépétIA prépare ton exercice…" pleinEcran />
          ) : null}

          {!chargementExo && erreurExo ? (
            <MessageErreur
              message={erreurExo.message}
              horsLigne={erreurExo.horsLigne}
              onReessayer={genererExercice}
            />
          ) : null}

          {!chargementExo && !erreurExo && exercice ? (
            <>
              {horsLigne ? (
                <View className="flex-row items-start gap-2 rounded-xl border border-brand-gold/40 bg-brand-gold-soft p-3">
                  <WifiOff size={18} color={couleurs.greenDark} />
                  <Text className="text-brand-green-dark flex-1 text-sm">
                    Hors connexion : voici ton dernier exercice enregistré. La correction
                    reviendra dès que le réseau sera rétabli.
                  </Text>
                </View>
              ) : null}

              {/* Carte d'énoncé, style cahier : bordure gauche dorée. */}
              <View className="rounded-xl border-l-4 border-l-brand-gold bg-white p-4">
                <View className="mb-2 flex-row items-center gap-2">
                  <BookOpen size={17} color={couleurs.gold} />
                  <Text className="text-brand-green-dark text-base font-bold">Exercice</Text>
                </View>
                <TexteFormate texte={exercice.enonce} />
              </View>

              {!correction ? (
                <View className="gap-3">
                  <View className="flex-row items-center gap-2">
                    <Pencil size={16} color={couleurs.green} />
                    <Text className="text-brand-green-dark font-bold">Ta réponse</Text>
                  </View>
                  <TextInput
                    value={reponse}
                    onChangeText={setReponse}
                    placeholder="Écris ta réponse et ta démarche…"
                    placeholderTextColor="#8a9691"
                    multiline
                    textAlignVertical="top"
                    accessibilityLabel="Ta réponse"
                    className="min-h-[120px] rounded-xl border border-brand-lines bg-white p-4 text-brand-ink"
                  />

                  {erreurCorrection ? (
                    <MessageErreur
                      message={erreurCorrection.message}
                      horsLigne={erreurCorrection.horsLigne}
                      onReessayer={corriger}
                    />
                  ) : null}

                  <Bouton
                    titre="Corriger ma réponse"
                    Icone={CheckCircle2}
                    onPress={corriger}
                    desactive={!reponse.trim()}
                    chargement={chargementCorrection}
                  />
                  <Bouton
                    titre="Je bloque, explique-moi"
                    Icone={MessageCircle}
                    variante="secondaire"
                    onPress={poserQuestion}
                  />
                </View>
              ) : (
                <View className="gap-4">
                  <View
                    accessibilityRole="alert"
                    className={`rounded-xl p-4 ${
                      correction.correct ? 'bg-brand-correct-bg' : 'bg-brand-wrong-bg'
                    }`}
                  >
                    <View className="mb-1 flex-row items-center gap-2">
                      {correction.correct ? (
                        <CheckCircle2 size={22} color={couleurs.correctText} />
                      ) : (
                        <XCircle size={22} color={couleurs.wrongText} />
                      )}
                      <Text
                        className={`text-lg font-bold ${
                          correction.correct ? 'text-brand-correct-text' : 'text-brand-wrong-text'
                        }`}
                      >
                        {correction.correct ? 'Bien joué !' : 'À revoir'}
                      </Text>
                    </View>
                    <Text
                      className={
                        correction.correct ? 'text-brand-correct-text' : 'text-brand-wrong-text'
                      }
                    >
                      {correction.verdict}
                    </Text>
                  </View>

                  <View className="rounded-xl border border-brand-lines bg-white p-4">
                    <View className="mb-3 flex-row items-center gap-2">
                      <BookOpen size={17} color={couleurs.green} />
                      <Text className="text-brand-green-dark text-base font-bold">
                        Explication pas à pas
                      </Text>
                    </View>
                    <TexteFormate texte={correction.explication} className="text-sm" />
                  </View>

                  <Text className="text-center text-sm text-brand-ink/70">
                    Maîtrise de ce thème :{' '}
                    <Text className="text-brand-green-dark font-bold">
                      {correction.progression.scoreMaitrise} %
                    </Text>
                  </Text>

                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Bouton
                        titre="Une question ?"
                        Icone={MessageCircle}
                        variante="secondaire"
                        onPress={poserQuestion}
                      />
                    </View>
                    <View className="flex-1">
                      <Bouton
                        titre="Suivant"
                        Icone={RefreshCw}
                        variante="dore"
                        onPress={genererExercice}
                      />
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
