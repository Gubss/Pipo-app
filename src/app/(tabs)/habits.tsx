import { StyleSheet, Text, View } from 'react-native';

import Mascot, { MASCOT_NAME } from '@/components/Mascot';
import { Card, Screen, SectionTitle } from '@/components/ui';
import { learnedHabits } from '@/lib/habits';
import { formatDayLabel } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { progressFrom } from '@/lib/progress';
import { colors, font, radius } from '@/lib/theme';

const STAGE_NAME = { 1: 'Broto', 2: 'Plantinha', 3: 'Florzinha' } as const;

export default function Habits() {
  const { events } = useEvents();
  const p = progressFrom(events);
  const habits = learnedHabits(events);
  const pct = p.nextAt ? Math.min(1, p.activeDays / p.nextAt) : 1;

  return (
    <Screen>
      <Text style={font.title}>Rotina</Text>

      <Card style={styles.hero}>
        <Mascot mood={p.streak > 0 ? 'celebrating' : 'happy'} stage={p.stage} size={150} />
        <Text style={font.h2}>
          {MASCOT_NAME} · {STAGE_NAME[p.stage]}
        </Text>
        <Text style={[font.small, { textAlign: 'center' }]}>
          {p.nextAt
            ? `Cumpra algo em mais ${p.nextAt - p.activeDays} ${p.nextAt - p.activeDays === 1 ? 'dia' : 'dias'} pra eu crescer.`
            : 'Cheguei no máximo! Obrigado por cuidar de mim.'}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
      </Card>

      <View style={styles.stats}>
        <Stat value={p.streak} label={p.streak === 1 ? 'dia seguido' : 'dias seguidos'} emoji="🔥" bg={colors.yellowSoft} />
        <Stat value={p.doneCount} label="tarefas feitas" emoji="✅" bg={colors.mintSoft} />
        <Stat value={events.length} label="eventos" emoji="🗓️" bg={colors.purpleSoft} />
      </View>

      <SectionTitle>O que aprendi com você</SectionTitle>
      {habits.length ? (
        <Card style={{ gap: 12 }}>
          {habits.map((h) => (
            <View key={h.key} style={styles.habit}>
              <Text style={{ fontSize: 22 }}>🔁</Text>
              <View style={{ flex: 1 }}>
                <Text style={font.bodyStrong}>{h.label}</Text>
                <Text style={font.small}>
                  A cada ~{h.everyDays} dias · próximo {formatDayLabel(new Date(`${h.nextDue}T09:00`)).toLowerCase()}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card style={styles.habit}>
          <Mascot mood="thinking" size={56} />
          <Text style={[font.body, { color: colors.textSoft, flex: 1 }]}>
            Conforme você marca as tarefas como feitas, eu percebo sua rotina, tipo cortar o cabelo a cada mês, e passo a te
            lembrar sozinho.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function Stat({ value, label, emoji, bg }: { value: number; label: string; emoji: string; bg: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={font.title}>{value}</Text>
      <Text style={[font.small, { textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6 },
  track: { width: '100%', height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6 },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.mint },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  habit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
