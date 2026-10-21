import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import Mascot, { MASCOT_NAME } from '@/components/Mascot';
import { Button, Card, Check, Field, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatBirth, formatCpf, isValidCpf, onlyDigits, parseBirth } from '@/lib/cpf';
import { detectCity, ensureMicPermission, ensureNotificationPermission } from '@/lib/permissions';
import { colors, font, radius, fonts } from '@/lib/theme';

type Errors = Partial<Record<'name' | 'cpf' | 'birth' | 'city' | 'terms', string>>;

export default function Onboarding() {
  const { saveProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birth, setBirth] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [notif, setNotif] = useState(false);
  const [mic, setMic] = useState(false);
  const [extraNudges, setExtraNudges] = useState(true);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function useMyLocation() {
    setLocating(true);
    setLocError('');
    const res = await detectCity();
    setLocating(false);
    if ('error' in res) return setLocError(res.error);
    setCoords({ latitude: res.latitude, longitude: res.longitude });
    if (res.city) setCity(res.city);
  }

  async function submit() {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = 'Como você quer ser chamado?';
    if (!isValidCpf(cpf)) e.cpf = 'CPF inválido. Confere os números?';
    const birthDate = parseBirth(birth);
    if (!birthDate) e.birth = 'Use o formato dd/mm/aaaa.';
    if (city.trim().length < 2) e.city = 'Qual sua cidade?';
    if (!terms) e.terms = 'Precisa aceitar para continuar.';
    setErrors(e);
    if (Object.keys(e).length || !birthDate) return;

    setSaving(true);
    setFormError('');
    try {
      await saveProfile({
        name: name.trim(),
        cpf: onlyDigits(cpf),
        birthDate,
        city: city.trim(),
        ...(coords ?? {}),
        acceptedTermsAt: new Date().toISOString(),
        extraNudges,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não consegui salvar.');
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Mascot mood="happy" size={84} />
        <View style={{ flex: 1 }}>
          <Text style={font.title}>Prazer!</Text>
          <Text style={[font.body, { color: colors.textSoft }]}>Me conta um pouco de você pra eu te ajudar direitinho.</Text>
        </View>
      </View>

      <Card>
        <Field label="Seu nome" value={name} onChangeText={setName} placeholder="Gustavo" autoComplete="name" error={errors.name} />
        <Field
          label="CPF"
          value={cpf}
          onChangeText={(v) => setCpf(formatCpf(v))}
          placeholder="000.000.000-00"
          keyboardType="number-pad"
          maxLength={14}
          error={errors.cpf}
          hint="Serve como seu código único. Não mostramos pra ninguém."
        />
        <Field
          label="Data de nascimento"
          value={birth}
          onChangeText={(v) => setBirth(formatBirth(v))}
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          error={errors.birth}
          hint="Pra eu lembrar do seu aniversário."
        />
        <Field
          label="Cidade"
          value={city}
          onChangeText={setCity}
          placeholder="Mongaguá - SP"
          error={errors.city || locError}
        />
        <Pressable onPress={useMyLocation} hitSlop={10} style={styles.locBtn} disabled={locating}>
          {locating ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="navigate" size={16} color={colors.primaryDark} />}
          <Text style={styles.locText}>{locating ? 'Procurando...' : 'Usar minha localização'}</Text>
        </Pressable>
      </Card>

      <Text style={font.h2}>Permissões</Text>
      <Card style={{ gap: 4 }}>
        <PermRow
          icon="notifications"
          title="Notificações"
          text="Pra eu te avisar na hora certa."
          granted={notif}
          onPress={async () => setNotif(await ensureNotificationPermission())}
        />
        <PermRow
          icon="mic"
          title="Microfone"
          text="Pra você me mandar áudio."
          granted={mic}
          onPress={async () => setMic(await ensureMicPermission())}
        />
        <PermRow
          icon="location"
          title="Localização"
          text="Pra saber sua cidade."
          granted={!!coords}
          onPress={useMyLocation}
        />
      </Card>

      <Card>
        <Check
          checked={extraNudges}
          onPress={() => setExtraNudges(!extraNudges)}
          label={
            <Text style={font.body}>
              Quero lembretes extras do {MASCOT_NAME}{' '}
              <Text style={{ color: colors.textSoft }}>(tipo "sexta: já cortou o cabelo?")</Text>
            </Text>
          }
        />
        <Check
          checked={terms}
          onPress={() => setTerms(!terms)}
          label={
            <Text style={font.body}>
              Li e aceito que meus dados (nome, CPF, nascimento, cidade e lembretes) sejam usados só para me lembrar das
              coisas. Posso apagar tudo quando quiser no meu perfil.
            </Text>
          }
        />
        {errors.terms ? <Text style={styles.error}>{errors.terms}</Text> : null}
      </Card>

      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button title="Tudo certo, vamos lá" icon="sparkles" onPress={submit} loading={saving} />
      <Button title="Sair" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

function PermRow({
  icon,
  title,
  text,
  granted,
  onPress,
}: {
  icon: 'notifications' | 'mic' | 'location';
  title: string;
  text: string;
  granted: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.permRow} disabled={granted}>
      <View style={styles.permIcon}>
        <Ionicons name={icon} size={20} color={colors.purple} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[font.body, { fontFamily: fonts.bodyBold }]}>{title}</Text>
        <Text style={font.small}>{text}</Text>
      </View>
      {granted ? (
        <Ionicons name="checkmark-circle" size={26} color={colors.mint} />
      ) : (
        <View style={styles.allow}>
          <Text style={styles.allowText}>Permitir</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: -2 },
  locText: { color: colors.primaryDark, fontFamily: fonts.bodyBold, fontSize: 13 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allow: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  allowText: { color: colors.primaryDark, fontFamily: fonts.bodyBlack, fontSize: 13 },
  error: { color: colors.danger, fontFamily: fonts.bodySemi },
});
