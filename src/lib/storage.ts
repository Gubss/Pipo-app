import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string) {
  await AsyncStorage.removeItem(key);
}

// Segredos (sessão, chave da IA) ficam no Keychain/Keystore. No navegador não há
// SecureStore, então cai no AsyncStorage só para desenvolvimento.
export async function readSecret(key: string) {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function writeSecret(key: string, value: string) {
  if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function removeSecret(key: string) {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

export const keys = {
  accounts: 'lembra.accounts',
  session: 'lembra.session',
  aiKey: 'lembra.aiKey',
  events: (userId: string) => `lembra.events.${userId}`,
};
