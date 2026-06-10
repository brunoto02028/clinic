import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Token storage. Uses expo-secure-store on native (Keychain/Keystore) and
 * localStorage on web (SecureStore is unavailable in the browser — needed so the
 * Expo Web dev/test target works).
 */

const ACCESS_KEY = "bpr.accessToken";
const REFRESH_KEY = "bpr.refreshToken";

const isWeb = Platform.OS === "web";

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  async save(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      setItem(ACCESS_KEY, accessToken),
      setItem(REFRESH_KEY, refreshToken),
    ]);
  },
  getAccess: () => getItem(ACCESS_KEY),
  getRefresh: () => getItem(REFRESH_KEY),
  async clear(): Promise<void> {
    await Promise.all([removeItem(ACCESS_KEY), removeItem(REFRESH_KEY)]);
  },
};
