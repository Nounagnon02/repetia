import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Send } from 'lucide-react';
import { apiService, ErreurApi } from '../services/api';
import MessageErreur from '../components/MessageErreur';
import TexteFormate from '../components/TexteFormate';
import EnTete from '../components/EnTete';
import type { MessageChat } from '../types';

const ACCUEIL: MessageChat = {
  role: 'model',
  content: "Bonjour ! Je suis RépétIA, ton répétiteur. Pose-moi ta question sur ton cours ou tes exercices (BEPC ou BAC).",
};

export default function Chat() {
  const { state } = useLocation() as { state: { exerciceId?: string; contexte?: string } | null };

  const [messages, setMessages] = useState<MessageChat[]>([ACCUEIL]);
  const [saisie, setSaisie] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<ErreurApi | null>(null);
  /** Mémorisé pour que « Réessayer » renvoie le même message. */
  const [messageEnEchec, setMessageEnEchec] = useState<string | null>(null);

  const finDeListe = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finDeListe.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chargement, erreur]);

  /**
   * `base` permet de repartir d'un fil corrigé (cas du « Réessayer », où le
   * message resté sans réponse a été retiré). Sans cela, la nouvelle tentative
   * renverrait ce message à la fois dans l'historique et comme message courant.
   */
  const envoyer = async (texte: string, base?: MessageChat[]) => {
    const message = texte.trim();
    if (!message || chargement) return;

    const fil = base ?? messages;
    // L'historique envoyé au serveur exclut le message d'accueil local.
    const historique = fil.filter((m) => m !== ACCUEIL);
    setMessages([...fil, { role: 'user', content: message }]);
    setSaisie('');
    setChargement(true);
    setErreur(null);
    setMessageEnEchec(null);

    try {
      const { reponse } = await apiService.chat(message, historique, state?.exerciceId);
      setMessages((actuels) => [...actuels, { role: 'model', content: reponse }]);
    } catch (e) {
      // Une panne du répétiteur n'est PAS affichée comme une réponse de RépétIA :
      // on montre une vraie erreur avec un bouton « Réessayer ».
      setErreur(e as ErreurApi);
      setMessageEnEchec(message);
    } finally {
      setChargement(false);
    }
  };

  const reessayer = () => {
    if (!messageEnEchec) return;

    // On retire le message resté sans réponse avant de le renvoyer.
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

  const surTouche = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void envoyer(saisie);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <EnTete titre="RépétIA" avecMarque />

      <div
        className="flex flex-1 flex-col gap-4 overflow-y-auto pt-2 pb-28"
        role="log"
        aria-live="polite"
        aria-label="Conversation avec le répétiteur"
      >
        {state?.contexte && (
          <p className="mx-auto max-w-[90%] rounded-lg bg-brand-gold-soft p-2 text-center text-xs text-brand-green-dark">
            Question sur : {state.contexte.slice(0, 70)}
            {state.contexte.length > 70 ? '…' : ''}
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                msg.role === 'user'
                  ? 'rounded-tr-sm bg-brand-green text-white'
                  : 'rounded-tl-sm border border-brand-lines bg-white text-brand-ink shadow-sm'
              }`}
            >
              <span className="sr-only">{msg.role === 'user' ? 'Toi : ' : 'RépétIA : '}</span>
              <TexteFormate texte={msg.content} />
            </div>
          </div>
        ))}

        {chargement && (
          <div className="flex justify-start" role="status" aria-label="RépétIA écrit une réponse">
            <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-brand-lines bg-white p-4 shadow-sm">
              {[0, 0.2, 0.4].map((delai) => (
                <span
                  key={delai}
                  aria-hidden="true"
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: `${delai}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {erreur && (
          <MessageErreur
            message={erreur.message}
            horsLigne={erreur.horsLigne}
            onReessayer={reessayer}
          />
        )}

        <div ref={finDeListe} />
      </div>

      <div className="fixed right-0 bottom-0 left-0 mx-auto max-w-md border-t border-brand-lines bg-white/95 p-4 backdrop-blur-md">
        <div className="flex gap-2">
          <label htmlFor="question" className="sr-only">
            Ta question pour RépétIA
          </label>
          <textarea
            id="question"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={surTouche}
            placeholder="Pose ta question…"
            rows={1}
            className="scrollbar-hide max-h-32 min-h-[48px] flex-1 resize-none rounded-xl border border-brand-lines bg-brand-paper px-4 py-3 text-sm focus:border-brand-green focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void envoyer(saisie)}
            disabled={!saisie.trim() || chargement}
            aria-label="Envoyer la question"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white disabled:opacity-50"
          >
            <Send size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
