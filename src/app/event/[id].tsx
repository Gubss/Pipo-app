import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { kindColor, TaskRow } from '@/components/EventBits';
import Mascot from '@/components/Mascot';
import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { nextOccurrence } from '@/lib/agenda';
import { countdownLabel, formatLongDay, formatTime } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { colors, font, radius, fonts } from '@/lib/theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, toggleTask, removeEvent } = useEvents();
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <Screen>
        <BackButton />
        <Text style={font.h2}>Esse evento não existe mais.</Text>
      </Screen>
    );
  }

  const when = nextOccurrence(event);
  const done = event.tasks.filter((t) => t.done).length;
  const allDone = event.tasks.length > 0 && done === event.tasks.length;

  function onDelete() {
    const run = async () => {
      await removeEvent(event!.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Apagar este evento e os lembretes dele?')) run();
      return;
    }
    Alert.alert('Apagar evento?', 'Os lembretes dele também somem.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: run },
    ]);
  }

  return (
    <Screen>
      <BackButton />
      <View style={[styles.hero, { backgroundColor: kindColor(event.kind) }]}>
        <Text style={{ fontSize: 48 }}>{event.emoji}</Text>
        <Text style={[font.title, { textAlign: 'center' }]}>{event.title}</Text>
        <Text style={[font.body, { color: colors.textSoft }]}>
          {formatLongDay(when)}
          {event.allDay ? '' : ` às ${formatTime(when)}`}
          {event.repeatYearly ? ' · todo ano' : ''}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{countdownLabel(when)}</Text>
        </View>
      </View>

      {event.voiceNoteUri ? <VoiceNote uri={event.voiceNoteUri} /> : null}
      {event.notes ? (
        <Card>
          <Text style={font.small}>Anotação</Text>
          <Text style={font.body}>{event.notes}</Text>
        </Card>
      ) : null}

      <SectionTitle>
        Checklist {event.tasks.length ? `(${done}/${event.tasks.length})` : ''}
      </SectionTitle>
      {allDone && (
        <Card style={styles.celebrate}>
          <Mascot mood="celebrating" size={64} />
          <Text style={[font.body, { flex: 1, fontFamily: fonts.bodyBold }]}>Tudo pronto! Agora é só curtir.</Text>
        </Card>
      )}
      {event.tasks.length ? (
        <Card style={{ gap: 2 }}>
          {event.tasks.map((t) => (
            <TaskRow key={t.id} task={t} event={event} showEvent={false} onToggle={() => toggleTask(event.id, t.id)} />
          ))}
        </Card>
      ) : (
        <Card>
          <Text style={[font.body, { color: colors.textSoft }]}>Sem tarefas. Eu te aviso perto do dia.</Text>
        </Card>
      )}

      <Button title="Apagar evento" variant="danger" icon="trash-outline" onPress={onDelete} style={{ marginTop: 12 }} />
    </Screen>
  );
}

function BackButton() {
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} style={{ width: 40, height: 40, justifyContent: 'center' }}>
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}

function VoiceNote({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <Pressable
      onPress={() => {
        if (status.playing) player.pause();
        else {
          if (status.didJustFinish || status.currentTime >= status.duration) player.seekTo(0);
          player.play();
        }
      }}
      style={styles.voice}>
      <Ionicons name={status.playing ? 'pause' : 'play'} size={22} color={colors.white} />
      <Text style={styles.voiceText}>Seu áudio{status.duration ? ` · ${Math.round(status.duration)}s` : ''}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: 24, alignItems: 'center', gap: 6 },
  badge: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, marginTop: 6 },
  badgeText: { fontFamily: fonts.bodyBlack, color: colors.primaryDark },
  celebrate: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.mintSoft },
  voice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.purple,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  voiceText: { color: colors.white, fontFamily: fonts.bodyBold },
});
