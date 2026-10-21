import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Mascot from '@/components/Mascot';
import { Button, Field, Screen } from '@/components/ui';
import { colors, font, fonts } from '@/lib/theme';

export default function AuthForm({
  mode,
  onSubmit,
}: {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  async function submit() {
    setError('');
    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <View style={styles.header}>
        <Mascot mood={isSignup ? 'happy' : 'listening'} size={96} />
        <Text style={font.title}>{isSignup ? 'Bora começar' : 'Que bom te ver'}</Text>
        <Text style={[font.body, { color: colors.textSoft }]}>
          {isSignup ? 'Crie sua conta. Seus dados ficam guardados no seu celular.' : 'Entre com seu e-mail e senha.'}
        </Text>
      </View>
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="voce@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Senha"
        value={password}
        onChangeText={setPassword}
        placeholder={isSignup ? 'Pelo menos 6 caracteres' : 'Sua senha'}
        secureTextEntry={!show}
        autoComplete={isSignup ? 'new-password' : 'current-password'}
        textContentType={isSignup ? 'newPassword' : 'password'}
        onSubmitEditing={submit}
        right={
          <Pressable onPress={() => setShow(!show)} hitSlop={10}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSoft} />
          </Pressable>
        }
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={isSignup ? 'Criar conta' : 'Entrar'} onPress={submit} loading={loading} style={{ marginTop: 8 }} />
      <Button
        variant="ghost"
        title={isSignup ? 'Já tenho conta' : 'Criar uma conta nova'}
        onPress={() => router.replace(isSignup ? '/login' : '/signup')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  error: { color: colors.danger, fontFamily: fonts.bodySemi, fontSize: 15 },
});
