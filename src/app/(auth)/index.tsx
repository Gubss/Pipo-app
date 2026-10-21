import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import Mascot, { MASCOT_NAME } from '@/components/Mascot';
import { Button, Screen } from '@/components/ui';
import { colors, font } from '@/lib/theme';

export default function Welcome() {
  return (
    <Screen scroll={false} style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.halo}>
          <Mascot mood="celebrating" size={170} />
        </View>
        <Text style={styles.title}>Oi! Eu sou o {MASCOT_NAME}.</Text>
        <Text style={styles.subtitle}>
          Me conta o que vem por aí, tipo "casamento domingo", que eu lembro de tudo antes: o cabelo, o presente, a roupa.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Button title="Criar minha conta" onPress={() => router.push('/signup')} />
        <Button title="Já tenho conta" variant="secondary" onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'space-between', paddingTop: 40 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  halo: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { ...font.title, textAlign: 'center' },
  subtitle: { ...font.body, color: colors.textSoft, textAlign: 'center', lineHeight: 24, paddingHorizontal: 8 },
});
