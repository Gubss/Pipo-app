import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Check, tap } from '@/components/ui';
import { countdownLabel, formatDayLabel, formatTime } from '@/lib/dates';
import { colors, font, radius, shadow, fonts } from '@/lib/theme';
import type { AppEvent, Task } from '@/lib/types';

const KIND_COLORS: Record<string, string> = {
  casamento: colors.purpleSoft,
  aniversario: colors.yellowSoft,
  festa: colors.yellowSoft,
  pet: colors.mintSoft,
  saude: colors.mintSoft,
  viagem: colors.purpleSoft,
  beleza: colors.primarySoft,
  trabalho: colors.cardSoft,
  outro: colors.cardSoft,
};

export function kindColor(kind: string) {
  return KIND_COLORS[kind] ?? colors.cardSoft;
}

export function EventCard({ event, when }: { event: AppEvent; when: Date }) {
  const done = event.tasks.filter((t) => t.done).length;
  const total = event.tasks.length;
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push({ pathname: '/event/[id]', params: { id: event.id } });
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.emoji, { backgroundColor: kindColor(event.kind) }]}>
        <Text style={{ fontSize: 26 }}>{event.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={font.small}>
          {formatDayLabel(when)}
          {event.allDay ? '' : ` · ${formatTime(when)}`} · {countdownLabel(when)}
        </Text>
        {total > 0 && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(done / total) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {done}/{total}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

export function TaskRow({
  task,
  event,
  onToggle,
  showEvent = true,
}: {
  task: Task;
  event: AppEvent;
  onToggle: () => void;
  showEvent?: boolean;
}) {
  const when = new Date(task.remindAt);
  const late = !task.done && when.getTime() < Date.now();
  return (
    <Check
      checked={task.done}
      onPress={onToggle}
      label={
        <View>
          <Text style={[font.body, task.done && styles.doneText]}>{task.title}</Text>
          <Text style={[font.small, late && { color: colors.danger, fontFamily: fonts.bodyBold }]}>
            {showEvent ? `${event.emoji} ${event.title} · ` : ''}
            {formatDayLabel(when)} · {formatTime(when)}
            {late ? ' · atrasada' : ''}
          </Text>
        </View>
      }
    />
  );
}

export function Bubble({ text }: { text: string }) {
  return (
    <View style={styles.bubble}>
      <Text style={styles.bubbleText}>{text}</Text>
      <View style={styles.bubbleTail} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow,
  },
  emoji: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: fonts.bodyBlack, color: colors.text },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.mint },
  progressText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.textSoft },
  doneText: { textDecorationLine: 'line-through', color: colors.textFaint },
  bubble: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    ...shadow,
  },
  bubbleText: { fontSize: 16, lineHeight: 22, color: colors.text, fontFamily: fonts.bodySemi },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    top: 22,
    width: 14,
    height: 14,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
});
