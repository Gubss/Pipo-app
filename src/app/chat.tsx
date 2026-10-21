import Ionicons from '@expo/vector-icons/Ionicons';
import { RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Mascot, { MASCOT_NAME, type MascotMood } from '@/components/Mascot';
import { Button, tap } from '@/components/ui';
import { askPipo, draftToNewEvent, type DraftEvent, type DraftTask, type Turn } from '@/lib/assistant';
import { useAuth } from '@/lib/auth';
import { combine, formatDayLabel, formatLongDay } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { ensureMicPermission } from '@/lib/permissions';
import { colors, font, fonts, radius, shadow } from '@/lib/theme';

type Message =
  | { id: string; from: 'user'; text: string }
  | { id: string; from: 'pipo'; text: string }
  | { id: string; from: 'voice'; seconds: number }
  | { id: string; from: 'plan'; event: DraftEvent; tasks: DraftTask[] }
  | { id: string; from: 'saved'; eventId: string };

const TIME_CHIPS = ['9h', '14h', '19h', 'O dia todo'];
const DATE_CHIPS = ['Hoje', 'Amanhã', 'Sábado', 'Domingo'];

let seq = 0;
const nextId = () => String(++seq);

export default function Chat() {
  const params = useLocalSearchParams<{ text?: string }>();
  const { account } = useAuth();
  const { events, addEvent } = useEvents();
  const firstName = account?.profile?.name.split(' ')[0] ?? '';

  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), from: 'pipo', text: `E aí, ${firstName}! O que vem por aí? Pode escrever do seu jeito, tipo "casamento domingo".` },
  ]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<MascotMood>('happy');
  const [voiceUri, setVoiceUri] = useState<string | undefined>();
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const sentInitial = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 250);

  useEffect(() => {
    if (params.text && !sentInitial.current) {
      sentInitial.current = true;
      send(params.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.text]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, busy]);

  function push(...m: Message[]) {
    setMessages((prev) => [...prev, ...m]);
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    tap();
    setInput('');
    setChips([]);
    push({ id: nextId(), from: 'user', text });
    setBusy(true);
    setMood('thinking');
    try {
      const res = await askPipo({ text, history, draft, profile: account?.profile, events });
      setHistory((h) => [...h, { role: 'user', content: text }, { role: 'assistant', content: res.mascotReply }]);
      push({ id: nextId(), from: 'pipo', text: res.mascotReply });
      if (res.status === 'ready' && res.event?.date) {
        setDraft(res.event);
        setExcluded({});
        push({ id: nextId(), from: 'plan', event: res.event, tasks: res.tasks });
        setMood('happy');
      } else if (res.status === 'needs_info') {
        setDraft(res.event);
        const field = res.followUpQuestions[0]?.field;
        setChips(field === 'time' ? TIME_CHIPS : field === 'date' ? DATE_CHIPS : []);
        setMood('thinking');
      } else {
        setMood('happy');
      }
    } catch {
      push({ id: nextId(), from: 'pipo', text: 'Opa, me enrolei aqui. Tenta de novo?' });
      setMood('worried');
    } finally {
      setBusy(false);
    }
  }

  async function save(event: DraftEvent, tasks: DraftTask[], planId: string) {
    setSaving(true);
    try {
      const chosen = tasks.filter((_, i) => !excluded[`${planId}:${i}`]);
      const created = await addEvent(draftToNewEvent(event, chosen, voiceUri));
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== planId),
        { id: nextId(), from: 'saved', eventId: created.id },
        {
          id: nextId(),
          from: 'pipo',
          text: chosen.length
            ? `Anotado! Vou te lembrar de ${chosen.length === 1 ? '1 coisa' : `${chosen.length} coisas`} antes do dia. Mais alguma coisa?`
            : 'Anotado! Te aviso perto do dia. Mais alguma coisa?',
        },
      ]);
      setDraft(null);
      setHistory([]);
      setVoiceUri(undefined);
      setMood('celebrating');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRecording() {
    tap();
    if (recState.isRecording) {
      await recorder.stop();
      setMood('happy');
      const seconds = Math.max(1, Math.round(recState.durationMillis / 1000));
      if (recorder.uri) setVoiceUri(persistRecording(recorder.uri));
      push(
        { id: nextId(), from: 'voice', seconds },
        {
          id: nextId(),
          from: 'pipo',
          text: 'Guardei seu áudio junto do lembrete! Nessa versão de teste eu ainda não entendo voz, então me escreve rapidinho o que é. Dica: o microfone do teclado transforma sua fala em texto.',
        },
      );
      return;
    }
    if (!(await ensureMicPermission())) {
      push({ id: nextId(), from: 'pipo', text: 'Preciso da permissão do microfone pra te ouvir. Dá pra liberar nos Ajustes do celular.' });
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setMood('listening');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Mascot mood={mood} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={font.h2}>{MASCOT_NAME}</Text>
          <Text style={font.small}>
            {recState.isRecording ? 'ouvindo...' : busy ? 'pensando...' : 'seu parceiro de lembretes'}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {messages.map((m) => {
            if (m.from === 'user') return <UserBubble key={m.id} text={m.text} />;
            if (m.from === 'pipo') return <PipoBubble key={m.id} text={m.text} />;
            if (m.from === 'voice')
              return (
                <View key={m.id} style={[styles.userBubble, styles.voiceBubble]}>
                  <Ionicons name="mic" size={18} color={colors.white} />
                  <Text style={styles.userText}>Áudio · {m.seconds}s</Text>
                </View>
              );
            if (m.from === 'saved')
              return (
                <Pressable
                  key={m.id}
                  onPress={() => router.replace({ pathname: '/event/[id]', params: { id: m.eventId } })}
                  style={styles.savedCard}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.mint} />
                  <Text style={[font.bodyStrong, { flex: 1 }]}>Salvo no calendário</Text>
                  <Text style={styles.link}>Ver</Text>
                </Pressable>
              );
            return (
              <PlanCard
                key={m.id}
                event={m.event}
                tasks={m.tasks}
                isExcluded={(i) => !!excluded[`${m.id}:${i}`]}
                onToggle={(i) => setExcluded((x) => ({ ...x, [`${m.id}:${i}`]: !x[`${m.id}:${i}`] }))}
                onSave={() => save(m.event, m.tasks, m.id)}
                saving={saving}
              />
            );
          })}
          {busy && (
            <View style={[styles.pipoBubble, { width: 64, alignItems: 'center' }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {chips.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {chips.map((c) => (
              <Pressable key={c} onPress={() => send(c)} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.composer}>
          {recState.isRecording ? (
            <View style={styles.recording}>
              <View style={styles.recDot} />
              <Text style={[font.bodyStrong, { color: colors.purple }]}>
                Gravando · {Math.floor(recState.durationMillis / 1000)}s
              </Text>
            </View>
          ) : (
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Escreve aqui..."
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              multiline
              onSubmitEditing={() => send(input)}
              submitBehavior="submit"
              returnKeyType="send"
            />
          )}
          {input.trim() && !recState.isRecording ? (
            <Pressable onPress={() => send(input)} style={[styles.roundBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="arrow-up" size={22} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable onPress={toggleRecording} style={[styles.roundBtn, { backgroundColor: colors.purple }]}>
              <Ionicons name={recState.isRecording ? 'stop' : 'mic'} size={22} color={colors.white} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Move a gravação do cache para a pasta de documentos, para não sumir. */
function persistRecording(uri: string) {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'audios');
    if (!dir.exists) dir.create();
    const src = new File(uri);
    const dest = new File(dir, `${Date.now()}.m4a`);
    src.move(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userBubble}>
      <Text style={styles.userText}>{text}</Text>
    </View>
  );
}

function PipoBubble({ text }: { text: string }) {
  return (
    <View style={styles.pipoBubble}>
      <Text style={font.body}>{text}</Text>
    </View>
  );
}

function PlanCard({
  event,
  tasks,
  isExcluded,
  onToggle,
  onSave,
  saving,
}: {
  event: DraftEvent;
  tasks: DraftTask[];
  isExcluded: (i: number) => boolean;
  onToggle: (i: number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const when = combine(event.date!, event.time);
  return (
    <View style={styles.plan}>
      <View style={styles.planHead}>
        <Text style={{ fontSize: 34 }}>{event.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={font.h2}>{event.title}</Text>
          <Text style={font.small}>
            {formatLongDay(when)}
            {event.time && !event.allDay ? ` às ${event.time}` : ''}
            {event.repeatYearly ? ' · todo ano' : ''}
          </Text>
        </View>
      </View>
      {tasks.length > 0 && <Text style={font.caption}>Vou te lembrar de</Text>}
      {tasks.map((t, i) => {
        const off = isExcluded(i);
        const due = t.dueAt ? new Date(t.dueAt) : null;
        return (
          <Pressable key={i} onPress={() => onToggle(i)} style={styles.planTask}>
            <Ionicons name={off ? 'ellipse-outline' : 'checkmark-circle'} size={24} color={off ? colors.textFaint : colors.mint} />
            <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[font.bodyStrong, off && { color: colors.textFaint, textDecorationLine: 'line-through' }]}>{t.title}</Text>
              {due && (
                <Text style={font.small}>
                  {formatDayLabel(due)} · {t.offset.atTime}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
      <Button title="Salvar no calendário" icon="calendar" onPress={onSave} loading={saving} style={{ marginTop: 6 }} />
      <Text style={[font.small, { textAlign: 'center' }]}>Toque numa tarefa pra tirar. Quer mudar algo? É só me falar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
  },
  userText: { ...font.body, color: colors.white },
  voiceBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.purple },
  pipoBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '86%',
    ...shadow,
  },
  plan: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: 2, borderColor: colors.primarySoft, ...shadow },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  planTask: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.mintSoft,
    borderRadius: radius.md,
    padding: 14,
  },
  link: { color: colors.primaryDark, fontFamily: fonts.bodyBlack },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { backgroundColor: colors.purpleSoft, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { color: colors.purple, fontFamily: fonts.bodyBlack, fontSize: 15 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    margin: 12,
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingLeft: 18,
    padding: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow,
  },
  input: { flex: 1, minHeight: 44, maxHeight: 120, fontSize: 16, color: colors.text, fontFamily: fonts.body, paddingTop: 12, outlineWidth: 0 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  recording: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
});
