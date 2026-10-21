/**
 * Contrato entre o app e o módulo de IA.
 * Sem dependências: roda no Hermes (React Native), Node, Deno e Workers.
 */

/** Mesmos valores do EventKind do app (lembra-app/src/lib/types.ts). */
export type EventKind =
  | 'casamento'
  | 'aniversario'
  | 'festa'
  | 'pet'
  | 'saude'
  | 'viagem'
  | 'beleza'
  | 'trabalho'
  | 'outro';

export type TaskCategory =
  | 'beleza'
  | 'compras'
  | 'roupa'
  | 'dinheiro'
  | 'documentos'
  | 'saude'
  | 'pet'
  | 'logistica'
  | 'social'
  | 'outro';

/** Uma fala da conversa com o mascote. */
export type Turn = { role: 'user' | 'assistant'; content: string };

/** Resumo de um evento que o app já tem salvo (evita duplicar e ajuda o contexto). */
export type EventSummary = {
  title: string;
  kind: EventKind;
  /** AAAA-MM-DD */
  date: string;
};

/** Hábito aprendido pelo app (ver learnHabits). */
export type Habit = {
  /** Chave normalizada, ex.: "corte de cabelo". */
  key: string;
  label: string;
  /** Intervalo médio em dias entre as vezes que a pessoa fez. */
  everyDays: number;
  /** AAAA-MM-DD da última vez. */
  lastDone: string;
  /** AAAA-MM-DD da próxima vez prevista. */
  nextDue: string;
  /** Quantas vezes foi observado. */
  samples: number;
  /** 0 a 1: quão regular é o intervalo. */
  confidence: number;
};

/** O evento sendo montado. Campos que faltam vêm como null. */
export type DraftEvent = {
  title: string;
  kind: EventKind;
  emoji: string;
  /** AAAA-MM-DD ou null se a pessoa não disse o dia. */
  date: string | null;
  /** HH:MM ou null se a pessoa não disse a hora. */
  time: string | null;
  allDay: boolean;
  repeatYearly: boolean;
  location: string | null;
  notes: string | null;
};

export type TaskOffset = {
  /** Dias antes do evento (0 = no dia do evento). */
  days: number;
  /** Horário do lembrete, HH:MM. */
  atTime: string;
};

/** Tarefa preparatória com lembrete. (Chamada de DraftTask para não colidir com o Task do app.) */
export type DraftTask = {
  title: string;
  emoji: string;
  category: TaskCategory;
  offset: TaskOffset;
  /** Data/hora local do lembrete, "AAAA-MM-DDTHH:MM" (sem fuso). null se o evento ainda não tem data. */
  dueAt: string | null;
  /** true = lembrete normal; false = só aparece no checklist. */
  notify: boolean;
  /** Frase do mascote para a notificação, ex.: "Já cortou o cabelo? Não vai aparecer zoado no casamento!" */
  nudge: string;
};

export type FollowUpField = 'date' | 'time' | 'title' | 'location' | 'other';

export type FollowUpQuestion = { field: FollowUpField; question: string };

export type InterpretStatus = 'needs_info' | 'ready' | 'not_an_event';

export type InterpretRequest = {
  /** O que a pessoa acabou de escrever ou ditar. */
  text: string;
  /** Agora, em ISO. Usado para resolver "domingo", "amanhã", etc. */
  now: string;
  /** IANA, ex.: "America/Sao_Paulo". */
  timezone?: string;
  userName?: string;
  city?: string;
  /** Nome do bichinho, para ele falar de si mesmo. */
  mascotName?: string;
  /** Falas anteriores desta conversa (sem a atual). */
  history?: Turn[];
  /** O rascunho devolvido na resposta anterior, para completar em vez de recomeçar. */
  draft?: DraftEvent | null;
  knownEvents?: EventSummary[];
  habits?: Habit[];
};

export type InterpretResponse = {
  status: InterpretStatus;
  /** O que o mascote fala na tela. */
  mascotReply: string;
  followUpQuestions: FollowUpQuestion[];
  event: DraftEvent | null;
  tasks: DraftTask[];
  /** Quem respondeu: o Claude, ou as regras locais (offline / falha). */
  source: 'claude' | 'local';
  usage?: { model: string; inputTokens: number; outputTokens: number; cacheReadTokens: number };
};

export type InterpretOptions = {
  /** URL do backend (POST JSON). Caminho recomendado para produção. */
  endpoint?: string;
  /**
   * Chave da API chamada direto do aparelho.
   * SÓ PARA TESTE PESSOAL. Não publique o app assim: qualquer pessoa extrai a chave do binário.
   */
  apiKey?: string;
  model?: string;
  /** Tempo máximo da chamada remota antes de cair nas regras locais. */
  timeoutMs?: number;
  /** Injeção de fetch para testes. */
  fetch?: typeof fetch;
};
