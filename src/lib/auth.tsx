import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { keys, readJson, readSecret, removeKey, removeSecret, writeJson, writeSecret } from './storage';
import type { Account, Profile } from './types';

// Modo local: as contas ficam no próprio aparelho. A interface (signUp, signIn,
// signOut, saveProfile, deleteAccount) é a mesma que o Supabase vai implementar.

type AuthState = {
  ready: boolean;
  account: Account | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function hash(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    (async () => {
      const sessionId = await readSecret(keys.session);
      if (sessionId) {
        const accounts = await readJson<Account[]>(keys.accounts, []);
        setAccount(accounts.find((a) => a.id === sessionId) ?? null);
      }
      setReady(true);
    })();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const e = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Esse e-mail não parece certo.');
    if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    const accounts = await readJson<Account[]>(keys.accounts, []);
    if (accounts.some((a) => a.email === e)) throw new Error('Já existe uma conta com esse e-mail.');
    const salt = Crypto.randomUUID();
    const created: Account = {
      id: Crypto.randomUUID(),
      email: e,
      salt,
      passwordHash: await hash(password, salt),
      createdAt: new Date().toISOString(),
    };
    await writeJson(keys.accounts, [...accounts, created]);
    await writeSecret(keys.session, created.id);
    setAccount(created);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const accounts = await readJson<Account[]>(keys.accounts, []);
    const found = accounts.find((a) => a.email === normalizeEmail(email));
    if (!found || (await hash(password, found.salt)) !== found.passwordHash) {
      throw new Error('E-mail ou senha incorretos.');
    }
    await writeSecret(keys.session, found.id);
    setAccount(found);
  }, []);

  const signOut = useCallback(async () => {
    await removeSecret(keys.session);
    setAccount(null);
  }, []);

  const saveProfile = useCallback(
    async (profile: Profile) => {
      if (!account) return;
      const accounts = await readJson<Account[]>(keys.accounts, []);
      if (accounts.some((a) => a.id !== account.id && a.profile?.cpf === profile.cpf)) {
        throw new Error('Esse CPF já está cadastrado em outra conta.');
      }
      const updated = { ...account, profile };
      await writeJson(keys.accounts, accounts.map((a) => (a.id === account.id ? updated : a)));
      setAccount(updated);
    },
    [account],
  );

  // LGPD: apagar a conta remove o cadastro e todos os eventos do aparelho.
  const deleteAccount = useCallback(async () => {
    if (!account) return;
    const accounts = await readJson<Account[]>(keys.accounts, []);
    await writeJson(keys.accounts, accounts.filter((a) => a.id !== account.id));
    await removeKey(keys.events(account.id));
    await removeKey(keys.memory(account.id));
    await removeSecret(keys.session);
    setAccount(null);
  }, [account]);

  const value = useMemo(
    () => ({ ready, account, signUp, signIn, signOut, saveProfile, deleteAccount }),
    [ready, account, signUp, signIn, signOut, saveProfile, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
