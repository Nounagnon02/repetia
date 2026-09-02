const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
const LOCAL_MODEL_NAME = process.env.LOCAL_MODEL_NAME || 'repetia-llm:latest';
const TIMEOUT_MS = 15_000;

export class LocalLlmService {
  /**
   * Vérifie si l'instance locale Ollama / vLLM est disponible.
   */
  static async estDisponible(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${LOCAL_LLM_URL}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Génère du texte ou du JSON via l'API locale.
   */
  static async generer(prompt: string, systemInstruction?: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(`${LOCAL_LLM_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LOCAL_MODEL_NAME,
          prompt,
          system: systemInstruction,
          stream: false,
          options: { temperature: 0.7 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as { response?: string };
        return data.response || null;
      }
    } catch (e: any) {
      console.warn(`[LocalLLM] Serveur local non joignable (${e?.message || e}) — bascule cloud.`);
    }
    return null;
  }

  /**
   * Dialogue dans le chat via l'API locale.
   */
  static async chat(
    messages: { role: string; content: string }[],
    systemInstruction?: string,
  ): Promise<string | null> {
    try {
      const formattedMessages = [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        ...messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(`${LOCAL_LLM_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LOCAL_MODEL_NAME,
          messages: formattedMessages,
          stream: false,
          options: { temperature: 0.5 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as { message?: { content?: string } };
        return data.message?.content || null;
      }
    } catch (e: any) {
      console.warn(`[LocalLLM] Serveur local de chat non joignable (${e?.message || e}) — bascule cloud.`);
    }
    return null;
  }
}
