import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Armazenamento da sessão do Supabase.
 * - Android/iOS: Keychain/Keystore via SecureStore, em partes (limite de ~2 KB por valor).
 * - Web (somente desenvolvimento): localStorage.
 */
const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${key}__n`;
const partKey = (key: string, i: number) => `${key}__${i}`;

const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = await SecureStore.getItemAsync(countKey(key));
    if (n === null) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(n); i++) {
      const part = await SecureStore.getItemAsync(partKey(key, i));
      if (part === null) return null; // sessão corrompida: trata como ausente
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    await nativeStorage.removeItem(key);
    const total = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      await SecureStore.setItemAsync(
        partKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    await SecureStore.setItemAsync(countKey(key), String(total));
  },
  async removeItem(key: string): Promise<void> {
    const n = await SecureStore.getItemAsync(countKey(key));
    for (let i = 0; i < Number(n ?? 0); i++) await SecureStore.deleteItemAsync(partKey(key, i));
    await SecureStore.deleteItemAsync(countKey(key));
  },
};

const webStorage = {
  getItem: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key: string) => globalThis.localStorage?.removeItem(key),
};

export const sessionStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
