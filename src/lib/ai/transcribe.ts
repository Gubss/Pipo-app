/**
 * Transcrição de áudio.
 *
 * A API do Claude não recebe áudio, então a voz vira texto antes de chegar no interpret().
 * Caminhos, do mais barato para o mais caro:
 *  1. Ditado do teclado do sistema (iOS e Android): grátis, funciona no Expo Go. É o da v1.
 *  2. expo-speech-recognition (reconhecimento nativo do aparelho, pt-BR, grátis):
 *     exige dev build (não roda no Expo Go). Recomendado quando sair do Expo Go.
 *  3. Backend de transcrição (outro provedor de speech-to-text): o app grava o áudio e manda
 *     para um endpoint seu, que devolve { text }. Custa por minuto e exige servidor.
 *
 * Esta função implementa o caminho 3 de forma genérica e devolve null quando não há endpoint,
 * para o app cair no ditado do teclado ou guardar como nota de voz.
 */
export async function transcribeAudio(
  uri: string,
  opts: { endpoint?: string; mimeType?: string; language?: string; fetch?: typeof fetch } = {},
): Promise<string | null> {
  if (!opts.endpoint) return null;
  const f = opts.fetch ?? fetch;
  try {
    const form = new FormData();
    // Formato de arquivo do React Native: { uri, name, type }.
    form.append('file', { uri, name: 'audio.m4a', type: opts.mimeType ?? 'audio/m4a' } as unknown as Blob);
    form.append('language', opts.language ?? 'pt');
    const res = await f(opts.endpoint, { method: 'POST', body: form });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
