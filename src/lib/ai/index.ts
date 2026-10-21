// Provisório: substituído pelo módulo de IA (ia-eventos) quando chegar.
import type { InterpretOptions, InterpretRequest, InterpretResponse } from './types';

export async function interpret(req: InterpretRequest, _opts: InterpretOptions): Promise<InterpretResponse> {
  return {
    status: 'not_an_event',
    mascotReply: `Anotei: "${req.text}". Meu cérebro ainda está chegando!`,
    followUpQuestions: [],
    event: null,
    tasks: [],
    source: 'local',
  };
}
