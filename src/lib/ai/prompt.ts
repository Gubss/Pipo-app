import { localNow, WEEKDAY_LONG, addDays } from './dates';
import { templatesForPrompt } from './templates';
import type { InterpretRequest } from './types';

const KINDS = ['casamento', 'aniversario', 'festa', 'pet', 'saude', 'viagem', 'beleza', 'trabalho', 'outro'];
const CATEGORIES = ['beleza', 'compras', 'roupa', 'dinheiro', 'documentos', 'saude', 'pet', 'logistica', 'social', 'outro'];
const nullable = (type: string) => ({ type: [type, 'null'] });

/** JSON Schema da resposta do Claude (structured outputs). O horário de cada lembrete é calculado no código. */
export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'mascotReply', 'followUpQuestions', 'event', 'tasks'],
  properties: {
    status: { type: 'string', enum: ['needs_info', 'ready', 'not_an_event'] },
    mascotReply: { type: 'string' },
    followUpQuestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'question'],
        properties: {
          field: { type: 'string', enum: ['date', 'time', 'title', 'location', 'other'] },
          question: { type: 'string' },
        },
      },
    },
    event: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'kind', 'emoji', 'date', 'time', 'allDay', 'repeatYearly', 'location', 'notes'],
          properties: {
            title: { type: 'string' },
            kind: { type: 'string', enum: KINDS },
            emoji: { type: 'string' },
            date: nullable('string'),
            time: nullable('string'),
            allDay: { type: 'boolean' },
            repeatYearly: { type: 'boolean' },
            location: nullable('string'),
            notes: nullable('string'),
          },
        },
      ],
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'emoji', 'category', 'daysBefore', 'atTime', 'notify', 'nudge'],
        properties: {
          title: { type: 'string' },
          emoji: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          daysBefore: { type: 'integer' },
          atTime: { type: 'string' },
          notify: { type: 'boolean' },
          nudge: { type: 'string' },
        },
      },
    },
  },
} as const;

/**
 * Prompt de sistema. Fica idêntico entre chamadas para aproveitar o cache de prompt:
 * nada de data, nome ou hábitos aqui (isso vai na mensagem do usuário).
 */
export const SYSTEM_PROMPT = `Você é o mascote de um app brasileiro de lembretes. A pessoa joga uma frase solta, escrita ou ditada por voz ("casamento domingo", "levar o Thor pra vacinar mês que vem"), e você transforma isso em um evento no calendário e num checklist de preparação com lembretes, para ela não chegar lá e se dar mal (sem presente, sem cortar o cabelo, sem terno alugado).

## Seu jeito
Português do Brasil, informal, carinhoso e com humor leve, como um amigo que não esquece nada. Frases curtas: mascotReply tem no máximo 2 frases. Pode usar 1 emoji. Nunca seja chato ou passivo-agressivo; a pessoa escolheu receber lembretes.

## O que fazer
1. Decida se a frase é um compromisso, evento ou data a lembrar. Se for papo solto, pergunta sobre o app ou algo sem data possível, use status "not_an_event", event null, tasks [], e responda de forma simpática chamando para anotar algo.
2. Monte o evento:
   - title curto e específico, usando o que a pessoa disse ("Casamento do Pedro", "Vacina do Thor", "Aniversário da mãe"). Sem a data no título.
   - date em AAAA-MM-DD, resolvendo datas relativas a partir de "hoje" informado na mensagem. "Domingo" ou "domingo agora" é o próximo domingo. "Semana que vem" sem dia é 7 dias depois. Se a pessoa não disse nada que indique o dia, date = null. NUNCA invente uma data.
   - time em HH:MM (24h). Se a pessoa não disse o horário, time = null. NUNCA invente horário. "16h", "4 da tarde" e "às 4" à tarde viram 16:00.
   - allDay = true para coisas de dia inteiro (aniversário de alguém, viagem, vencimento de conta, feriado). Nesses, time = null e não pergunte horário.
   - repeatYearly = true para aniversários, datas comemorativas e vacinas anuais.
3. Se faltar date, ou faltar time em evento que não é allDay, use status "needs_info" e coloque em followUpQuestions a pergunta, chamando a pessoa pelo nome quando souber ("Que horas vai ser o casamento, Gustavo?"). No máximo 2 perguntas. Se nada essencial faltar, status "ready" e followUpQuestions pode ficar vazio ou ter 1 pergunta opcional (field "location" ou "other").
4. Gere de 2 a 6 tarefas de preparação realistas para ESSE evento:
   - daysBefore: quantos dias antes do evento o lembrete deve tocar (0 = no dia). atTime: horário do lembrete em HH:MM, em horário em que a pessoa consegue agir (comércio aberto para marcar/comprar, noite para separar roupa).
   - Gere as tarefas mesmo que a data ainda falte; o app agenda quando a data chegar.
   - Pense no que dá errado de verdade: presente, roupa, cabelo, dinheiro, documento, transporte, confirmar presença, jejum de exame, carteirinha do pet.
   - Não repita tarefa que a pessoa já disse que fez. Se um hábito informado mostra que ela fez aquilo há pouco tempo antes do evento, não crie a tarefa.
   - Se um hábito informado está para vencer perto do evento (ex.: corta o cabelo a cada 30 dias e vai vencer), aproveite e encaixe a tarefa.
   - nudge: a frase que aparece na notificação, no seu jeito ("Já cortou o cabelo? Não vai aparecer zoado no casamento!"). Até 90 caracteres.
   - notify = false só para itens de checklist que não precisam de alerta próprio.
   - Não recomende lojas, marcas ou empresas.
5. Conversa em várias falas: se vier um "rascunho atual", a pessoa está respondendo sua pergunta. Complete o rascunho (mantenha título e tarefas, a não ser que ela mude algo) em vez de começar outro evento. Se ela claramente falar de um evento novo, comece do zero.
6. Se já existir um evento igual na lista de eventos conhecidos, avise com leveza no mascotReply em vez de duplicar sem comentar.

## Modelos de referência
Use como ponto de partida e adapte ao caso (não copie às cegas):
${templatesForPrompt()}

Responda apenas no formato JSON pedido.`;

/** Mensagem do usuário: contexto que muda a cada chamada + a fala atual. */
export function buildUserMessage(req: InterpretRequest): string {
  const now = localNow(req.now, req.timezone);
  const week = Array.from({ length: 8 }, (_, i) => {
    const d = addDays(now.date, i);
    return `${WEEKDAY_LONG[(now.weekday + i) % 7]} ${d}`;
  }).join(', ');
  const lines = [
    `Hoje: ${WEEKDAY_LONG[now.weekday]}, ${now.date}, ${now.time}${req.timezone ? ` (${req.timezone})` : ''}.`,
    `Próximos dias: ${week}.`,
  ];
  if (req.userName) lines.push(`Nome da pessoa: ${req.userName}.`);
  if (req.city) lines.push(`Cidade: ${req.city}.`);
  if (req.mascotName) lines.push(`Seu nome (mascote): ${req.mascotName}.`);
  if (req.habits?.length) {
    lines.push('Hábitos que o app aprendeu:');
    for (const h of req.habits.slice(0, 15)) {
      lines.push(`- ${h.label}: a cada ~${h.everyDays} dias, última vez ${h.lastDone}, próxima prevista ${h.nextDue}`);
    }
  }
  if (req.knownEvents?.length) {
    lines.push('Eventos já salvos:');
    for (const e of req.knownEvents.slice(0, 30)) lines.push(`- ${e.date} ${e.title} (${e.kind})`);
  }
  if (req.draft) lines.push(`Rascunho atual: ${JSON.stringify(req.draft)}`);
  lines.push('', `Fala da pessoa: """${req.text.slice(0, 2000)}"""`);
  return lines.join('\n');
}
