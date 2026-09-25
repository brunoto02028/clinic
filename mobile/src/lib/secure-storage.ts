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

const LOCK_KEY = "bpr.biometricLock";

/**
 * Se o paciente ligou a tranca biométrica neste aparelho.
 *
 * É preferência, não segredo — mas mora no mesmo cofre porque é por aparelho,
 * como os tokens, e some junto quando o app é desinstalado. Não é apagada no
 * logout de propósito: quem sai e volta na mesma conta espera a tranca ligada
 * do jeito que deixou.
 */
export const lockPreference = {
  async get(): Promise<boolean> {
    return (await getItem(LOCK_KEY)) === "1";
  },
  async set(on: boolean): Promise<void> {
    if (on) await setItem(LOCK_KEY, "1");
    else await removeItem(LOCK_KEY);
  },
};

/**
 * Guardar uma coisa pequena no aparelho, por chave.
 *
 * O cofre já existia para os tokens e para a preferência da tranca; isto só
 * abre a mesma porta para quem precisa de uma chave própria — evitando somar
 * `AsyncStorage`, que é dependência nativa e exigiria build novo por causa de
 * um lembrete de cinco minutos.
 */
export const deviceStore = {
  get: (key: string) => getItem(key),
  set: (key: string, value: string) => setItem(key, value),
  remove: (key: string) => removeItem(key),
};
