import Anthropic from '@anthropic-ai/sdk';
import { finalize, type RawTask } from './plan';
import { buildUserMessage, OUTPUT_SCHEMA, SYSTEM_PROMPT } from './prompt';
import type { DraftEvent, FollowUpQuestion, InterpretRequest, InterpretResponse, InterpretStatus } from './types';

/**
 * Modelo padrão. Troque aqui por 'claude-haiku-5-5' para ~40x menos custo
 * (ver docs/custos.md e scripts/estimate-cost.ts).
 */
export const DEFAULT_MODEL = 'claude-opus-5-5';

/** Modelos que aceitam a recuperação automática de recusas (fallbacks "default"). Haiku não aceita. */
const SUPPORTS_FALLBACKS = /^claude-(opus|sonnet|fable)-/;

type ModelOutput = {
  status: InterpretStatus;
  mascotReply: string;
  followUpQuestions: FollowUpQuestion[];
  event: DraftEvent | null;
  tasks: RawTask[];
};

export class ClaudeOutputError extends Error {}

export type ClaudeCallOptions = {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export async function interpretWithClaude(req: InterpretRequest, opts: ClaudeCallOptions): Promise<InterpretResponse> {
  const model = opts.model ?? DEFAULT_MODEL;
  const client = new Anthropic({
    apiKey: opts.apiKey,
    timeout: opts.timeoutMs ?? 30_000,
    maxRetries: 1,
    // No app de teste pessoal a chave fica no aparelho; no servidor isso não tem efeito.
    dangerouslyAllowBrowser: true,
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
  });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...(req.history ?? []).slice(-10).map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: buildUserMessage(req) },
  ];
  // A API exige que a conversa comece pelo usuário.
  while (messages.length && messages[0].role !== 'user') messages.shift();

  const fallbacks = SUPPORTS_FALLBACKS.test(model);
  const response = await client.beta.messages.create({
    model,
    max_tokens: 8000,
    ...(fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> } },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  if (response.stop_reason === 'refusal') throw new ClaudeOutputError('refusal');
  if (response.stop_reason === 'max_tokens') throw new ClaudeOutputError('max_tokens');

  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let out: ModelOutput;
  try {
    out = JSON.parse(text) as ModelOutput;
  } catch {
    throw new ClaudeOutputError('invalid_json');
  }

  const result = finalize(
    req,
    out.status === 'not_an_event' ? null : out.event,
    out.tasks ?? [],
    out.mascotReply,
    out.followUpQuestions ?? [],
    'claude',
  );
  result.usage = {
    model: response.model,
    inputTokens: response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0),
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };
  return result;
}
