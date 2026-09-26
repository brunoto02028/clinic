import { create } from "zustand";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Claro ou escuro, escolha da pessoa (086, T-1).
 *
 * O Bruno: *"nós queremos usar sempre os dois tons... ter essas opções é
 * extremamente importante na dinâmica e na beleza do design do app."*
 *
 * **Por que não existe "seguir o aparelho" aqui ainda.** O `app.json` tem
 * `userInterfaceStyle: "light"`, o que força aparência clara no iOS — e então
 * `useColorScheme()` responde `"light"` para todo mundo, inclusive para quem
 * usa o telefone no escuro. Trocar para `"automatic"` muda o fingerprint e
 * **obriga um build novo**, que cortaria a entrega de updates para o binário
 * instalado.
 *
 * A escolha manual não precisa de nada disso: se a pessoa pede escuro, usamos a
 * nossa paleta escura. Quando houver um build por outro motivo, `"automatic"`
 * entra junto e o terceiro modo aparece aqui sem custo.
 */

export type ModoDeCor = "light" | "dark";

const CHAVE = "bpr.theme";
const isWeb = Platform.OS === "web";

async function ler(): Promise<ModoDeCor | null> {
  try {
    const v = isWeb ? globalThis.localStorage?.getItem(CHAVE) : await SecureStore.getItemAsync(CHAVE);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

async function gravar(v: ModoDeCor): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(CHAVE, v);
    else await SecureStore.setItemAsync(CHAVE, v);
  } catch {
    /* preferência que não persiste é chata, não é erro */
  }
}

interface EstadoDoTema {
  modo: ModoDeCor;
  /** Falso até a preferência gravada ser lida — evita piscar claro antes do escuro. */
  carregado: boolean;
  definir: (m: ModoDeCor) => void;
  alternar: () => void;
  carregar: () => Promise<void>;
}

export const useThemeStore = create<EstadoDoTema>((set, get) => ({
  modo: "light",
  carregado: false,
  definir: (m) => {
    set({ modo: m });
    void gravar(m);
  },
  alternar: () => get().definir(get().modo === "dark" ? "light" : "dark"),
  carregar: async () => {
    const guardado = await ler();
    set({ modo: guardado ?? "light", carregado: true });
  },
}));
