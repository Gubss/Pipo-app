import type { EventKind, TaskCategory } from './types';

/**
 * Biblioteca de modelos de eventos comuns.
 * Fonte única: usada pelas regras locais (offline) e enviada ao Claude como referência no prompt.
 */

export type TemplateTask = {
  title: string;
  emoji: string;
  category: TaskCategory;
  daysBefore: number;
  atTime: string;
  nudge: string;
  /** Só entra se a frase bater com esta regex (ex.: só sugere terno se for casamento à noite). */
  onlyIf?: RegExp;
};

export type EventTemplate = {
  id: string;
  kind: EventKind;
  emoji: string;
  /** Título padrão quando a frase não dá um melhor. */
  title: string;
  /** Palavras que identificam o evento (sem acento, minúsculas). */
  match: RegExp;
  /** Precisa de horário? (aniversário de alguém não precisa, médico precisa). */
  needsTime: boolean;
  allDay: boolean;
  repeatYearly: boolean;
  tasks: TemplateTask[];
  comment: string;
};

export const TEMPLATES: EventTemplate[] = [
  {
    id: 'casamento',
    kind: 'casamento',
    emoji: '💒',
    title: 'Casamento',
    match: /\bcasamento|casorio|casar\b|cerimonia religiosa/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Casamento! Deixa comigo que ninguém vai te pegar de mão vazia.',
    tasks: [
      { title: 'Confirmar presença (RSVP)', emoji: '💌', category: 'social', daysBefore: 10, atTime: '19:00', nudge: 'Já confirmou presença no casamento? Os noivos agradecem!' },
      { title: 'Escolher presente da lista', emoji: '🎁', category: 'compras', daysBefore: 7, atTime: '19:00', nudge: 'Bora escolher o presente? A lista dos noivos não espera!' },
      { title: 'Separar ou alugar a roupa', emoji: '👔', category: 'roupa', daysBefore: 5, atTime: '19:00', nudge: 'Terno, vestido, sapato... a roupa do casamento já tá separada?' },
      { title: 'Cortar o cabelo', emoji: '💇', category: 'beleza', daysBefore: 2, atTime: '09:00', nudge: 'Já cortou o cabelo? Não vai aparecer zoado no casamento!' },
      { title: 'Separar dinheiro da gravata', emoji: '💵', category: 'dinheiro', daysBefore: 1, atTime: '18:00', nudge: 'Separa um dinheirinho para a gravata do noivo!' },
      { title: 'Ver endereço e como chegar', emoji: '🗺️', category: 'logistica', daysBefore: 1, atTime: '20:00', nudge: 'Já viu o endereço e como vai chegar amanhã?' },
    ],
  },
  {
    id: 'aniversario-meu',
    kind: 'aniversario',
    emoji: '🥳',
    title: 'Meu aniversário',
    match: /\bmeu aniversario|meu niver|faco anos|eu faco aniversario/,
    needsTime: false,
    allDay: true,
    repeatYearly: true,
    comment: 'Seu aniversário! Já vou começar a contagem regressiva.',
    tasks: [
      { title: 'Decidir como comemorar', emoji: '🎉', category: 'social', daysBefore: 21, atTime: '19:00', nudge: 'Faltam 3 semanas pro seu niver! Vai ter festa, bar ou jantar?' },
      { title: 'Reservar lugar / chamar a galera', emoji: '📣', category: 'social', daysBefore: 10, atTime: '19:00', nudge: 'Hora de reservar o lugar e chamar a galera!' },
    ],
  },
  {
    id: 'aniversario',
    kind: 'aniversario',
    emoji: '🎂',
    title: 'Aniversário',
    match: /\baniversario|\bniver\b|faz anos/,
    needsTime: false,
    allDay: true,
    repeatYearly: true,
    comment: 'Aniversário anotado! Todo ano eu te lembro, pode confiar.',
    tasks: [
      { title: 'Comprar presente', emoji: '🎁', category: 'compras', daysBefore: 5, atTime: '19:00', nudge: 'O aniversário tá chegando. Já pensou no presente?' },
      { title: 'Mandar parabéns', emoji: '🎉', category: 'social', daysBefore: 0, atTime: '09:00', nudge: 'Hoje é o dia! Manda os parabéns antes que esqueça.' },
    ],
  },
  {
    id: 'festa',
    kind: 'festa',
    emoji: '🎈',
    title: 'Festa',
    match: /\bfesta|churrasco|confraternizacao|cha de (bebe|panela|revelacao|cozinha)|formatura|batizado|balada/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Festa na agenda! Vou cuidar para você chegar pronto.',
    tasks: [
      { title: 'Confirmar presença', emoji: '✅', category: 'social', daysBefore: 3, atTime: '19:00', nudge: 'Confirma que você vai na festa?' },
      { title: 'Comprar presente ou levar algo', emoji: '🛍️', category: 'compras', daysBefore: 2, atTime: '19:00', nudge: 'Vai levar presente, bebida ou um prato? Melhor resolver hoje.' },
      { title: 'Separar a roupa', emoji: '👕', category: 'roupa', daysBefore: 1, atTime: '20:00', nudge: 'Roupa da festa separada?' },
    ],
  },
  {
    id: 'pet-vacina',
    kind: 'pet',
    emoji: '🐶',
    title: 'Vacina do pet',
    match: /\bvacina\b.*\b(cachorro|cachorra|gato|gata|pet|dog|cao|filhote)|\b(cachorro|cachorra|gato|gata|pet|dog|cao)\b.*\bvacina|\bv10\b|\bv8\b|antirrabica|vermifugo|veterinari|\blevar .{1,25}\b(pra|para|pro|a|ao) (vacinar|vacina\b|tomar vacina)/,
    needsTime: true,
    allDay: false,
    repeatYearly: true,
    comment: 'Saúde do pet em dia! Anotei a vacina.',
    tasks: [
      { title: 'Marcar horário na clínica', emoji: '📞', category: 'pet', daysBefore: 5, atTime: '10:00', nudge: 'Já ligou para a clínica marcar a vacina do pet?' },
      { title: 'Separar carteirinha de vacinação', emoji: '📒', category: 'documentos', daysBefore: 1, atTime: '20:00', nudge: 'Separa a carteirinha de vacinação do pet para amanhã.' },
    ],
  },
  {
    id: 'pet-banho',
    kind: 'pet',
    emoji: '🛁',
    title: 'Banho e tosa',
    match: /banho e tosa|\btosa\b|pet ?shop|banho (no|do|da) (cachorro|cachorra|gato|gata|dog)/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Dia de spa para o pet!',
    tasks: [
      { title: 'Agendar banho e tosa', emoji: '📞', category: 'pet', daysBefore: 2, atTime: '10:00', nudge: 'Já agendou o banho e tosa?' },
    ],
  },
  {
    id: 'exame',
    kind: 'saude',
    emoji: '🧪',
    title: 'Exame',
    match: /\bexame|exames|coleta de sangue|ultrassom|ressonancia|tomografia|raio[- ]?x|hemograma|laboratorio/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Exame anotado. Vou te lembrar do preparo.',
    tasks: [
      { title: 'Conferir preparo (jejum?)', emoji: '🍽️', category: 'saude', daysBefore: 1, atTime: '18:00', nudge: 'Amanhã tem exame. Precisa de jejum? Confere o preparo!' },
      { title: 'Separar pedido médico e documentos', emoji: '📄', category: 'documentos', daysBefore: 1, atTime: '20:00', nudge: 'Pedido médico, documento e carteirinha do plano separados?' },
    ],
  },
  {
    id: 'dentista',
    kind: 'saude',
    emoji: '🦷',
    title: 'Dentista',
    match: /\bdentista|ortodontista|limpeza nos dentes|manutencao do aparelho/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Dentista marcado. Sorriso em dia!',
    tasks: [
      { title: 'Confirmar a consulta', emoji: '📞', category: 'saude', daysBefore: 1, atTime: '10:00', nudge: 'Confirma a consulta no dentista de amanhã?' },
    ],
  },
  {
    id: 'medico',
    kind: 'saude',
    emoji: '🩺',
    title: 'Consulta médica',
    match: /\bmedic[oa]|consulta|doutor|doutora|\bdra?\b\.?|cardiologista|dermatologista|ginecologista|oftalmo|pediatra|psicolog|psiquiatra|fisioterapia|check[- ]?up/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Consulta anotada. Saúde em primeiro lugar!',
    tasks: [
      { title: 'Confirmar a consulta', emoji: '📞', category: 'saude', daysBefore: 1, atTime: '10:00', nudge: 'Amanhã tem consulta. Já confirmou o horário?' },
      { title: 'Separar documentos e exames antigos', emoji: '📄', category: 'documentos', daysBefore: 1, atTime: '20:00', nudge: 'Separa documento, carteirinha do plano e exames antigos.' },
      { title: 'Anotar dúvidas para o médico', emoji: '📝', category: 'saude', daysBefore: 1, atTime: '20:30', nudge: 'Anota o que você quer perguntar na consulta, senão esquece lá!' },
    ],
  },
  {
    id: 'viagem',
    kind: 'viagem',
    emoji: '✈️',
    title: 'Viagem',
    match: /\bviagem|viajar|viajo|voo\b|aeroporto|ferias|feriado|praia\b|passagem/,
    needsTime: false,
    allDay: true,
    repeatYearly: false,
    comment: 'Viagem! Vou montar o checklist para não esquecer nada.',
    tasks: [
      { title: 'Reservar hospedagem e transporte', emoji: '🏨', category: 'logistica', daysBefore: 21, atTime: '19:00', nudge: 'Hospedagem e passagem já reservadas? Perto da data fica mais caro!' },
      { title: 'Conferir documentos', emoji: '🪪', category: 'documentos', daysBefore: 7, atTime: '19:00', nudge: 'RG, CNH ou passaporte dentro da validade?' },
      { title: 'Fazer a mala', emoji: '🧳', category: 'logistica', daysBefore: 1, atTime: '19:00', nudge: 'Bora fazer a mala? Carregador, remédio, documento...' },
      { title: 'Check-in online', emoji: '🎫', category: 'logistica', daysBefore: 1, atTime: '10:00', nudge: 'Faz o check-in online do voo!', onlyIf: /\bvoo|aeroporto|aviao|passagem aerea/ },
    ],
  },
  {
    id: 'beleza',
    kind: 'beleza',
    emoji: '💇',
    title: 'Corte de cabelo',
    match: /cortar o cabelo|corte de cabelo|cabeleireir|barbeiro|barbearia|\bunha|manicure|sobrancelha|depilacao|escova\b|luzes\b/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Anotado! Vai sair de lá na régua.',
    tasks: [
      { title: 'Confirmar o horário', emoji: '📞', category: 'beleza', daysBefore: 1, atTime: '10:00', nudge: 'Amanhã tem horário marcado. Confirma lá!' },
    ],
  },
  {
    id: 'entrevista',
    kind: 'trabalho',
    emoji: '💼',
    title: 'Entrevista de emprego',
    match: /entrevista|processo seletivo|dinamica de grupo/,
    needsTime: true,
    allDay: false,
    repeatYearly: false,
    comment: 'Entrevista! Vou te ajudar a chegar preparado.',
    tasks: [
      { title: 'Pesquisar sobre a empresa', emoji: '🔎', category: 'outro', daysBefore: 2, atTime: '19:00', nudge: 'Dá uma pesquisada na empresa antes da entrevista.' },
      { title: 'Separar roupa e currículo', emoji: '👔', category: 'roupa', daysBefore: 1, atTime: '20:00', nudge: 'Roupa e currículo prontos para amanhã?' },
      { title: 'Ver o trajeto', emoji: '🗺️', category: 'logistica', daysBefore: 1, atTime: '20:30', nudge: 'Já viu quanto tempo leva para chegar? Melhor sair cedo.' },
    ],
  },
  {
    id: 'documento',
    kind: 'outro',
    emoji: '📄',
    title: 'Documento / conta',
    match: /\bipva\b|licenciamento|renovar (a )?cnh|\bcnh\b|passaporte|imposto de renda|boleto|vencimento|vence\b|pagar (a |o )?(conta|aluguel|fatura)/,
    needsTime: false,
    allDay: true,
    repeatYearly: false,
    comment: 'Anotado! Nada de multa ou juros por esquecimento.',
    tasks: [
      { title: 'Separar dinheiro / documentos', emoji: '💳', category: 'dinheiro', daysBefore: 3, atTime: '10:00', nudge: 'Daqui a 3 dias vence. Já separou o necessário?' },
      { title: 'Resolver hoje', emoji: '⏰', category: 'documentos', daysBefore: 0, atTime: '09:00', nudge: 'Vence hoje! Bora resolver logo cedo.' },
    ],
  },
];

/** Modelo genérico quando nenhum outro bate. */
export const GENERIC_TEMPLATE: EventTemplate = {
  id: 'generico',
  kind: 'outro',
  emoji: '📌',
  title: 'Compromisso',
  match: /$^/,
  needsTime: true,
  allDay: false,
  repeatYearly: false,
  comment: 'Anotado! Pode deixar que eu te lembro.',
  tasks: [
    { title: 'Lembrete na véspera', emoji: '⏰', category: 'outro', daysBefore: 1, atTime: '19:00', nudge: 'Amanhã tem compromisso, hein!' },
  ],
};

export function findTemplate(text: string): EventTemplate | null {
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return TEMPLATES.find((tpl) => tpl.match.test(t)) ?? null;
}

/** Texto compacto da biblioteca para o prompt do Claude. */
export function templatesForPrompt(): string {
  return TEMPLATES.map((tpl) => {
    const tasks = tpl.tasks
      .map((t) => `    - ${t.emoji} ${t.title} (${t.daysBefore}d antes, ${t.atTime}${t.onlyIf ? ', só se fizer sentido' : ''})`)
      .join('\n');
    const flags = [
      `kind=${tpl.kind}`,
      tpl.needsTime ? 'precisa de horário' : 'dia inteiro',
      tpl.repeatYearly ? 'repete todo ano' : null,
    ].filter(Boolean).join(', ');
    return `- ${tpl.emoji} ${tpl.title} [${flags}]\n${tasks}`;
  }).join('\n');
}
