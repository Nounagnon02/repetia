import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Send, Camera, Mic } from 'lucide-react-native';
import { apiService, ErreurApi } from '@/services/api';
import LogoMark from '@/components/LogoMark';
import MessageErreur from '@/components/MessageErreur';
import TexteFormate from '@/components/TexteFormate';
import { couleurs } from '@/constants/theme';
import type { MessageChat } from '@/types';

const ACCUEIL: MessageChat = {
  role: 'model',
  content:
    "Bonjour ! Je suis RépétIA, ton répétiteur. Pose-moi ta question sur ton cours ou tes exercices (BEPC ou BAC).",
};

export default function Chat() {
  const params = useLocalSearchParams<{ exerciceId?: string; contexte?: string }>();

  const [messages, setMessages] = useState<MessageChat[]>([ACCUEIL]);
  const [saisie, setSaisie] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  /** Mémorisé pour que « Réessayer » renvoie exactement le même message. */
  const [messageEnEchec, setMessageEnEchec] = useState<string | null>(null);

  const liste = useRef<FlatList<MessageChat>>(null);

  const versLeBas = () => setTimeout(() => liste.current?.scrollToEnd({ animated: true }), 60);

  /**
   * `base` permet de repartir d'un fil corrigé (cas du « Réessayer », où le
   * message resté sans réponse a été retiré) : sans cela, la nouvelle tentative
   * enverrait ce message à la fois dans l'historique et comme message courant.
   */
  const envoyer = async (texte: string, base?: MessageChat[]) => {
    const message = texte.trim();
    if (!message || chargement) return;

    const fil = base ?? messages;
    const historique = fil.filter((m) => m !== ACCUEIL);

    setMessages([...fil, { role: 'user', content: message }]);
    setSaisie('');
    setChargement(true);
    setErreur(null);
    setMessageEnEchec(null);
    versLeBas();

    try {
      const { reponse } = await apiService.chat(message, historique, params.exerciceId);
      setMessages((actuels) => [...actuels, { role: 'model', content: reponse }]);
      versLeBas();
    } catch (e) {
      // Une panne du répétiteur n'est jamais présentée comme une réponse de
      // RépétIA : on affiche une vraie erreur, avec reprise.
      setErreur(e as ErreurApi);
      setMessageEnEchec(message);
    } finally {
      setChargement(false);
    }
  };

  const reessayer = () => {
    if (!messageEnEchec) return;
    const dernier = messages[messages.length - 1];
    const base =
      dernier?.role === 'user' && dernier.content === messageEnEchec
        ? messages.slice(0, -1)
        : messages;

    const aRenvoyer = messageEnEchec;
    setMessageEnEchec(null);
    setErreur(null);
    void envoyer(aRenvoyer, base);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-paper" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <View className="flex-row items-center gap-3 border-b border-brand-lines bg-white px-4 py-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-green">
            <LogoMark taille={16} teinte={couleurs.goldSoft} evide={couleurs.green} />
          </View>
          <Text className="text-brand-green-dark text-base font-bold">RépétIA</Text>
        </View>

        {params.contexte ? (
          <View className="mx-4 mt-3 rounded-lg bg-brand-gold-soft p-2">
            <Text className="text-brand-green-dark text-center text-xs">
              Question sur : {params.contexte.slice(0, 70)}
              {params.contexte.length > 70 ? '…' : ''}
            </Text>
          </View>
        ) : null}

        <FlatList
          ref={liste}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerClassName="gap-3 p-4"
          onContentSizeChange={() => liste.current?.scrollToEnd({ animated: false })}
          accessibilityLabel="Conversation avec le répétiteur"
          renderItem={({ item }) => (
            <View className={item.role === 'user' ? 'items-end' : 'items-start'}>
              <View
                className={`max-w-[85%] rounded-2xl p-3 ${
                  item.role === 'user'
                    ? 'rounded-tr-sm bg-brand-green'
                    : 'rounded-tl-sm border border-brand-lines bg-white'
                }`}
              >
                {item.role === 'user' ? (
                  <Text className="text-sm text-white">{item.content}</Text>
                ) : (
                  <TexteFormate texte={item.content} className="text-sm" />
                )}
              </View>
            </View>
          )}
          ListFooterComponent={
            <View className="gap-3">
              {chargement ? (
                <View className="items-start">
                  <View className="flex-row items-center gap-2 rounded-2xl rounded-tl-sm border border-brand-lines bg-white p-3">
                    <ActivityIndicator size="small" color={couleurs.green} />
                    <Text className="text-brand-ink/60 text-xs">RépétIA écrit…</Text>
                  </View>
                </View>
              ) : null}

              {erreur ? (
                <MessageErreur
                  message={erreur.message}
                  horsLigne={erreur.horsLigne}
                  onReessayer={reessayer}
                />
              ) : null}
            </View>
          }
        />

        <View className="flex-row gap-2 border-t border-brand-lines bg-white p-3">
          <TextInput
            value={saisie}
            onChangeText={setSaisie}
            placeholder="Pose ta question…"
            placeholderTextColor="#8a9691"
            multiline
            accessibilityLabel="Ta question pour RépétIA"
            className="max-h-28 min-h-[46px] flex-1 rounded-xl border border-brand-lines bg-brand-paper px-4 py-3 text-brand-ink"
          />
          <Pressable
            disabled
            accessibilityRole="button"
            accessibilityLabel="Scanner photo d'exercice — bientôt disponible"
            className="h-[46px] w-[46px] items-center justify-center rounded-xl border border-brand-lines bg-brand-paper opacity-40"
          >
            <Camera size={19} color={couleurs.green} />
          </Pressable>
          <Pressable
            disabled
            accessibilityRole="button"
            accessibilityLabel="Dictée vocale — bientôt disponible"
            className="h-[46px] w-[46px] items-center justify-center rounded-xl border border-brand-lines bg-brand-paper opacity-40"
          >
            <Mic size={19} color={couleurs.gold} />
          </Pressable>
          <Pressable
            onPress={() => void envoyer(saisie)}
            disabled={!saisie.trim() || chargement}
            accessibilityRole="button"
            accessibilityLabel="Envoyer la question"
            style={({ pressed }) => ({
              opacity: !saisie.trim() || chargement ? 0.5 : pressed ? 0.7 : 1,
            })}
            className="h-[46px] w-[46px] items-center justify-center rounded-xl bg-brand-green"
          >
            <Send size={19} color={couleurs.blanc} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
