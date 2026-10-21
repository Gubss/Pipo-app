import { interpretWithClaude } from './claude';
import { interpretLocal } from './local';
import type { InterpretOptions, InterpretRequest, InterpretResponse } from './types';

/**
 * Ponto de entrada único do app.
 * - endpoint: POST no backend (caminho de produção, a chave fica no servidor).
 * - apiKey sem endpoint: chama o Claude direto do aparelho. SÓ PARA TESTE PESSOAL, não publique assim.
 * - nenhum dos dois, ou qualquer falha: regras locais (funciona offline).
 */
export async function interpret(req: InterpretRequest, opts: InterpretOptions = {}): Promise<InterpretResponse> {
  try {
    if (opts.endpoint) return await viaEndpoint(req, opts);
    if (opts.apiKey) {
      return await interpretWithClaude(req, {
        apiKey: opts.apiKey, model: opts.model, timeoutMs: opts.timeoutMs, fetch: opts.fetch,
      });
    }
  } catch (err) {
    if (typeof console !== 'undefined') console.warn('[ia-eventos] caindo nas regras locais:', String(err));
  }
  return interpretLocal(req);
}

async function viaEndpoint(req: InterpretRequest, opts: InterpretOptions): Promise<InterpretResponse> {
  const f = opts.fetch ?? fetch;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000) : null;
  try {
    const res = await f(opts.endpoint!, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: ctrl?.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as InterpretResponse;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
