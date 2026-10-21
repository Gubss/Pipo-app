export type Profile = {
  name: string;
  cpf: string; // só dígitos
  birthDate: string; // AAAA-MM-DD
  city: string;
  latitude?: number;
  longitude?: number;
  acceptedTermsAt: string; // ISO
  extraNudges: boolean; // aceitou notificações extras ("já cortou o cabelo?")
};

export type Account = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  profile?: Profile;
};

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

export type Task = {
  id: string;
  title: string;
  /** Data/hora em que o lembrete da tarefa dispara (ISO). */
  remindAt: string;
  done: boolean;
  doneAt?: string;
  /** Frase do mascote na notificação da tarefa. */
  nudge?: string;
  emoji?: string;
  notificationId?: string;
};

export type AppEvent = {
  id: string;
  title: string;
  kind: EventKind;
  emoji: string;
  /** Data/hora do evento (ISO). */
  startsAt: string;
  allDay: boolean;
  repeatYearly: boolean;
  notes?: string;
  voiceNoteUri?: string;
  tasks: Task[];
  notificationIds: string[];
  createdAt: string;
};
