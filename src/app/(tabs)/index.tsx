import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bubble, EventCard, TaskRow } from '@/components/EventBits';
import Mascot, { type MascotMood } from '@/components/Mascot';
import { Card, Screen, SectionTitle, tap } from '@/components/ui';
import { tasksDueToday, upcomingEvents } from '@/lib/agenda';
import { useAuth } from '@/lib/auth';
import { greeting } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { colors, font, radius, shadow, fonts } from '@/lib/theme';

const SUGGESTIONS = ['Casamento domingo às 16h', 'Vacina do cachorro', 'Aniversário da minha mãe dia 12/03', 'Dentista sexta 10h'];

function openChat(text?: string) {
  tap();
  router.push(text ? { pathname: '/chat', params: { text } } : '/chat');
}

export default function Home() {
  const { account } = useAuth();
  const { events, toggleTask } = useEvents();
  const firstName = account?.profile?.name.split(' ')[0] ?? '';
  const today = tasksDueToday(events);
  const upcoming = upcomingEvents(events).slice(0, 5);
  const late = today.filter((t) => t.when.getTime() < Date.now());
  const hour = new Date().getHours();

  let mood: MascotMood = 'happy';
  let line = 'Me conta o que vem por aí que eu cuido do resto.';
  if (hour >= 23 || hour < 5) {
    mood = 'sleeping';
    line = 'Tá tarde, hein. Anota aí e vai dormir que amanhã eu te lembro.';
  } else if (late.length) {
    mood = 'worried';
    line = `Eita, ${late.length === 1 ? 'tem 1 coisa atrasada' : `tem ${late.length} coisas atrasadas`}. Bora resolver?`;
  } else if (today.length) {
    line = `Hoje ${today.length === 1 ? 'tem 1 coisinha' : `tem ${today.length} coisinhas`} pra fazer. Tamo junto!`;
  } else if (upcoming.length) {
    mood = 'celebrating';
    line = `Tudo em dia! Próximo: ${upcoming[0].ev.title.toLowerCase()}.`;
  }

  return (
    <Screen>
      <Text style={font.small}>{greeting()},</Text>
      <Text style={[font.title, { marginTop: -12 }]}>{firstName} 👋</Text>

      <View style={styles.mascotRow}>
        <Mascot mood={mood} size={96} />
        <Bubble text={line} />
      </View>

      <Pressable onPress={() => openChat()} style={({ pressed }) => [styles.composer, pressed && { opacity: 0.9 }]}>
        <Text style={styles.composerText}>Tenho um casamento domingo...</Text>
        <View style={styles.composerMic}>
          <Ionicons name="mic" size={20} color={colors.white} />
        </View>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {SUGGESTIONS.map((s) => (
          <Pressable key={s} onPress={() => openChat(s)} style={styles.chip}>
            <Text style={styles.chipText}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle>Pra hoje</SectionTitle>
      {today.length ? (
        <Card style={{ gap: 2 }}>
          {today.map(({ task, event }) => (
            <TaskRow key={task.id} task={task} event={event} onToggle={() => toggleTask(event.id, task.id)} />
          ))}
        </Card>
      ) : (
        <Card style={styles.empty}>
          <Text style={{ fontSize: 28 }}>🌤️</Text>
          <Text style={[font.body, { color: colors.textSoft, flex: 1 }]}>Nada pendente pra hoje. Aproveita!</Text>
        </Card>
      )}

      <SectionTitle
        right={
          upcoming.length ? (
            <Pressable onPress={() => router.push('/agenda')}>
              <Text style={styles.link}>Ver agenda</Text>
            </Pressable>
          ) : undefined
        }>
        Vem aí
      </SectionTitle>
      {upcoming.length ? (
        upcoming.map(({ ev, when }) => <EventCard key={ev.id} event={ev} when={when} />)
      ) : (
        <Card style={styles.empty}>
          <Text style={{ fontSize: 28 }}>🗓️</Text>
          <Text style={[font.body, { color: colors.textSoft, flex: 1 }]}>
            Nenhum evento ainda. Toca ali em cima e me conta o primeiro.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingLeft: 20,
    paddingRight: 6,
    height: 58,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    ...shadow,
  },
  composerText: { flex: 1, fontSize: 16, color: colors.textFaint },
  composerMic: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.purpleSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { color: colors.purple, fontFamily: fonts.bodyBold, fontSize: 14 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { color: colors.primaryDark, fontFamily: fonts.bodyBlack },
});
