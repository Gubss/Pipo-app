import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EventCard, TaskRow } from '@/components/EventBits';
import Mascot from '@/components/Mascot';
import { Card, Screen, SectionTitle, tap } from '@/components/ui';
import { hasSomethingOn, itemsOnDay, nextOccurrence, upcomingEvents } from '@/lib/agenda';
import { addDays, MONTH_SHORT, startOfDay, toDateKey, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { colors, font, radius, fonts } from '@/lib/theme';

const DAYS = 21;

export default function Agenda() {
  const { events, toggleTask } = useEvents();
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState(today);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(today, i)), [today.getTime()]);
  const { events: dayEvents, tasks } = itemsOnDay(events, selected);
  const later = upcomingEvents(events).filter((x) => x.when > addDays(today, DAYS));

  return (
    <Screen>
      <Text style={font.title}>Agenda</Text>
      <Text style={[font.small, { marginTop: -10 }]}>
        {MONTH_SHORT[selected.getMonth()].toUpperCase()} {selected.getFullYear()}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {days.map((d) => {
          const isSel = toDateKey(d) === toDateKey(selected);
          const dot = hasSomethingOn(events, d);
          return (
            <Pressable
              key={toDateKey(d)}
              onPress={() => {
                tap();
                setSelected(d);
              }}
              style={[styles.day, isSel && styles.daySel]}>
              <Text style={[styles.dayWeek, isSel && { color: colors.white }]}>{WEEKDAY_SHORT[d.getDay()]}</Text>
              <Text style={[styles.dayNum, isSel && { color: colors.white }]}>{d.getDate()}</Text>
              <View style={[styles.dot, { backgroundColor: dot ? (isSel ? colors.white : colors.primary) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle>
        {toDateKey(selected) === toDateKey(today) ? 'Hoje' : `${WEEKDAY_LONG[selected.getDay()]}, ${selected.getDate()}`}
      </SectionTitle>

      {dayEvents.map((ev) => (
        <EventCard key={ev.id} event={ev} when={nextOccurrence(ev)} />
      ))}
      {tasks.length > 0 && (
        <Card style={{ gap: 2 }}>
          {tasks.map(({ task, event }) => (
            <TaskRow key={task.id} task={task} event={event} onToggle={() => toggleTask(event.id, task.id)} />
          ))}
        </Card>
      )}
      {!dayEvents.length && !tasks.length && (
        <Card style={styles.empty}>
          <Mascot mood="sleeping" size={64} />
          <Text style={[font.body, { color: colors.textSoft, flex: 1 }]}>Dia livre. Nada marcado por aqui.</Text>
        </Card>
      )}

      {later.length > 0 && (
        <>
          <SectionTitle>Mais pra frente</SectionTitle>
          {later.map(({ ev, when }) => (
            <EventCard key={ev.id} event={ev} when={when} />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: {
    width: 56,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  daySel: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeek: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.textSoft, textTransform: 'uppercase' },
  dayNum: { fontSize: 20, fontFamily: fonts.bodyBlack, color: colors.text },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
