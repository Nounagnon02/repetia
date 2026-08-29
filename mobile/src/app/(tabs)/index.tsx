import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Activity, BookOpen, GraduationCap, MessageCircle, WifiOff } from 'lucide-react-native';
import { apiService, ErreurApi } from '@/services/api';
import Logo from '@/components/Logo';
import { couleurs } from '@/constants/theme';
import { lireThemes, sauvegarderThemes, lireProgression, sauvegarderProgression } from '@/services/cache';
import Chargement from '@/components/Chargement';
import MessageErreur from '@/components/MessageErreur';
import Bouton from '@/components/Bouton';
import Puce from '@/components/Puce';
import type { Difficulte, Progression, Theme } from '@/types';

const DIFFICULTES: { valeur: Difficulte; libelle: string }[] = [
  { valeur: 'facile', libelle: 'Facile' },
  { valeur: 'moyen', libelle: 'Moyen' },
  { valeur: 'examen', libelle: 'Type Examen' },
];

export default function Accueil() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [themeChoisi, setThemeChoisi] = useState('');
  const [difficulte, setDifficulte] = useState<Difficulte>('moyen');

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  const [horsLigne, setHorsLigne] = useState(false);
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const matieres = await apiService.getMatieres();
      if (matieres.length === 0) {
        throw new ErreurApi("Aucune matière disponible. La base du serveur n'est pas initialisée.");
      }

      const listeThemes = await apiService.getThemes(matieres[0].id);
      setThemes(listeThemes);
      setThemeChoisi((actuel) => actuel || listeThemes[0]?.id || '');
      void sauvegarderThemes(listeThemes);

      const prog = await apiService.getProgression();
      setProgression(prog);
      void sauvegarderProgression(prog);

      setHorsLigne(false);
    } catch (e) {
      const err = e as ErreurApi;

      // Hors connexion : on repart du cache plutôt que d'afficher un écran vide.
      const themesEnCache = err.horsLigne ? await lireThemes() : null;
      if (themesEnCache && themesEnCache.length > 0) {
        setThemes(themesEnCache);
        setThemeChoisi((actuel) => actuel || themesEnCache[0].id);
        setProgression(await lireProgression());
        setHorsLigne(true);
      } else {
        setErreur(err);
      }
    } finally {
      setChargement(false);
      setRafraichit(false);
    }
  }, []);

  // Rechargé à chaque retour sur l'onglet : la progression reste à jour
  // après une session d'entraînement.
  useFocusEffect(
    useCallback(() => {
      void charger();
    }, [charger]),
  );

  const commencer = () => {
    if (!themeChoisi) return;
    const libelle = themes.find((t) => t.id === themeChoisi)?.libelle ?? '';
    router.push({
      pathname: '/entrainement',
      params: { themeId: themeChoisi, difficulte, themeLibelle: libelle },
    });
  };

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
        <View className="flex-row items-center justify-between">
          <Logo taille={30} />
          <View className="flex-row items-center gap-1.5 rounded-full bg-brand-gold-soft px-3 py-1.5">
            <GraduationCap size={14} color={couleurs.greenDark} />
            <Text className="text-brand-green-dark text-xs font-bold">BEPC · Maths</Text>
          </View>
        </View>

        <View className="rounded-2xl bg-brand-green p-5">
          <Text className="mb-1 text-xl font-bold text-white">Salut 👋</Text>
          <Text className="mb-2 text-xl font-bold text-white">On révise quoi aujourd&apos;hui ?</Text>
          <Text className="text-sm text-white/90">Choisis un thème et lance-toi !</Text>
        </View>

        {horsLigne ? (
          <View className="flex-row items-center gap-2 rounded-xl border border-brand-gold/40 bg-brand-gold-soft p-3">
            <WifiOff size={18} color={couleurs.greenDark} />
            <Text className="text-brand-green-dark flex-1 text-sm">
              Tu es hors connexion. Voici tes derniers thèmes enregistrés.
            </Text>
          </View>
        ) : null}

        {chargement ? <Chargement message="Chargement de tes thèmes…" pleinEcran /> : null}

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

        {!chargement && !erreur ? (
          <>
            {progression && progression.global.faits > 0 ? (
              <View className="rounded-xl border border-brand-lines bg-white p-4">
                <View className="flex-row items-center gap-2">
                  <Activity size={16} color={couleurs.gold} />
                  <Text className="text-brand-green-dark font-bold">Ta série du jour</Text>
                </View>
                <Text className="text-brand-ink mt-1 text-sm">
                  {progression.global.faits} exercice{progression.global.faits > 1 ? 's' : ''} ·{' '}
                  {progression.global.reussis} réussi{progression.global.reussis > 1 ? 's' : ''} ·{' '}
                  <Text className="text-brand-green font-bold">{progression.global.taux} %</Text> de
                  réussite
                </Text>
              </View>
            ) : null}

            <View>
              <View className="mb-3 flex-row items-center gap-2">
                <BookOpen size={17} color={couleurs.green} />
                <Text className="text-brand-green-dark font-bold">Thème</Text>
              </View>
              <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
                {themes.map((t) => (
                  <Puce
                    key={t.id}
                    libelle={t.libelle}
                    actif={themeChoisi === t.id}
                    onPress={() => setThemeChoisi(t.id)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text className="text-brand-green-dark mb-3 font-bold">Difficulté</Text>
              <View
                className="flex-row gap-2 rounded-xl border border-brand-lines bg-white p-1"
                accessibilityRole="radiogroup"
              >
                {DIFFICULTES.map((d) => (
                  <Puce
                    key={d.valeur}
                    libelle={d.libelle}
                    actif={difficulte === d.valeur}
                    onPress={() => setDifficulte(d.valeur)}
                    className="flex-1 items-center"
                  />
                ))}
              </View>
            </View>

            <View className="mt-2 gap-3">
              <Bouton
                titre="Commencer l'entraînement"
                Icone={BookOpen}
                onPress={commencer}
                desactive={!themeChoisi}
              />
              <Bouton
                titre="Poser une question au répétiteur"
                Icone={MessageCircle}
                variante="secondaire"
                onPress={() => router.push('/chat')}
              />
            </View>

            <View className="mt-4 border-t border-brand-lines pt-5">
              <Text className="mb-3 text-center text-xs font-bold uppercase text-brand-ink/50">
                Bientôt sur RépétIA
              </Text>
              <View className="flex-row gap-2">
                {[
                  { titre: 'Niveau', valeur: 'BAC' },
                  { titre: 'Matière', valeur: 'Physique' },
                ].map((item) => (
                  <View
                    key={item.titre}
                    className="flex-1 rounded-xl border border-brand-lines bg-white/60 p-3"
                  >
                    <Text className="text-center text-xs font-bold text-brand-ink/40">
                      {item.titre}
                    </Text>
                    <Text className="text-center text-sm text-brand-ink/50">{item.valeur}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
