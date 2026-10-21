import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';

import Mascot, { MASCOT_NAME } from '@/components/Mascot';
import { Button, Card, Field, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { maskCpf } from '@/lib/cpf';
import { useEvents } from '@/lib/events';
import { keys, readSecret, removeSecret, writeSecret } from '@/lib/storage';
import { colors, font, fonts } from '@/lib/theme';

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: onYes },
  ]);
}

export default function Profile() {
  const { account, saveProfile, signOut, deleteAccount } = useAuth();
  const { events, rescheduleAll } = useEvents();
  const profile = account?.profile;
  const [aiKey, setAiKey] = useState('');
  const [savedKey, setSavedKey] = useState(false);

  useEffect(() => {
    readSecret(keys.aiKey).then((k) => setSavedKey(!!k));
  }, []);

  if (!account || !profile) return null;
  const [y, m, d] = profile.birthDate.split('-');

  async function saveKey() {
    const k = aiKey.trim();
    if (!k) return;
    await writeSecret(keys.aiKey, k);
    setAiKey('');
    setSavedKey(true);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Mascot mood="happy" size={80} />
        <View style={{ flex: 1 }}>
          <Text style={font.title}>{profile.name}</Text>
          <Text style={font.small}>{account.email}</Text>
        </View>
      </View>

      <Card>
        <Row icon="card" label="CPF" value={maskCpf(profile.cpf)} />
        <Row icon="gift" label="Nascimento" value={`${d}/${m}/${y}`} />
        <Row icon="location" label="Cidade" value={profile.city} />
        <Row icon="calendar" label="Eventos guardados" value={String(events.length)} />
      </Card>

      <SectionTitle>Lembretes</SectionTitle>
      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[font.body, { fontFamily: fonts.bodyBold }]}>Lembretes extras do {MASCOT_NAME}</Text>
            <Text style={font.small}>Avisos de cada tarefa, tipo "sexta: já cortou o cabelo?"</Text>
          </View>
          <Switch
            value={profile.extraNudges}
            onValueChange={async (v) => {
              await saveProfile({ ...profile, extraNudges: v });
              await rescheduleAll(v);
            }}
            trackColor={{ true: colors.mint, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      <SectionTitle>Inteligência do {MASCOT_NAME}</SectionTitle>
      <Card>
        <Text style={font.small}>
          Sem chave, o {MASCOT_NAME} usa regras simples e funciona offline. Com uma chave da API do Claude, ele entende
          qualquer frase. A chave fica guardada só neste celular. Use isso só no seu teste pessoal.
        </Text>
        {savedKey ? (
          <View style={styles.switchRow}>
            <Ionicons name="checkmark-circle" size={22} color={colors.mint} />
            <Text style={[font.body, { flex: 1 }]}>Chave salva</Text>
            <Button
              title="Remover"
              variant="danger"
              style={{ minHeight: 40 }}
              onPress={async () => {
                await removeSecret(keys.aiKey);
                setSavedKey(false);
              }}
            />
          </View>
        ) : (
          <>
            <Field label="Chave da API" value={aiKey} onChangeText={setAiKey} placeholder="sk-ant-..." autoCapitalize="none" secureTextEntry />
            <Button title="Salvar chave" variant="secondary" onPress={saveKey} disabled={!aiKey.trim()} />
          </>
        )}
      </Card>

      <SectionTitle>Conta</SectionTitle>
      <Button title="Sair" variant="secondary" icon="log-out-outline" onPress={signOut} />
      <Button
        title="Apagar minha conta e meus dados"
        variant="danger"
        icon="trash-outline"
        onPress={() =>
          confirm('Apagar tudo?', 'Sua conta, seus eventos e seus lembretes serão apagados deste celular. Não dá pra desfazer.', deleteAccount)
        }
      />
      <Text style={[font.small, { textAlign: 'center' }]}>Seus dados ficam só neste aparelho (modo local).</Text>
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: 'card' | 'gift' | 'location' | 'calendar'; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.purple} />
      <Text style={[font.body, { color: colors.textSoft, flex: 1 }]}>{label}</Text>
      <Text style={[font.body, { fontFamily: fonts.bodyBold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
