import { create } from "zustand";
import { Appearance, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Claro, escuro, ou o que o aparelho estiver (086).
 *
 * O Bruno: *"nós queremos usar sempre os dois tons... ter essas opções é
 * extremamente importante na dinâmica e na beleza do design do app."*
 *
 * **O terceiro modo chegou no build 16.** Até ele, o `app.json` tinha
 * `userInterfaceStyle: "light"`, que força aparência clara no iOS — e com ela
 * `Appearance.getColorScheme()` respondia `"light"` para todo mundo, inclusive
 * para quem usa o telefone no escuro. Trocar para `"automatic"` muda o
 * fingerprint e obriga um build, então ficou esperando um build que
 * acontecesse por outro motivo. Aconteceu: o build do push.
 *
 * `system` é o padrão para quem nunca escolheu. Quem já tinha escolhido claro
 * ou escuro mantém a escolha — ela está gravada, e sobrepor seria decidir de
 * novo por alguém que já decidiu.
 */

export type ModoDeCor = "light" | "dark";
export type EscolhaDeTema = ModoDeCor | "system";

const CHAVE = "bpr.theme";
const isWeb = Platform.OS === "web";

/** O que o aparelho está agora. `light` quando ele não sabe dizer. */
function doAparelho(): ModoDeCor {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

async function ler(): Promise<EscolhaDeTema | null> {
  try {
    const v = isWeb ? globalThis.localStorage?.getItem(CHAVE) : await SecureStore.getItemAsync(CHAVE);
    return v === "dark" || v === "light" || v === "system" ? v : null;
  } catch {
    return null;
  }
}

async function gravar(v: EscolhaDeTema): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(CHAVE, v);
    else await SecureStore.setItemAsync(CHAVE, v);
  } catch {
    /* preferência que não persiste é chata, não é erro */
  }
}

interface EstadoDoTema {
  /** O tom que está pintando agora — sempre claro ou escuro, nunca "system". */
  modo: ModoDeCor;
  /** O que a pessoa escolheu. `system` significa "o que o aparelho estiver". */
  escolha: EscolhaDeTema;
  /** Falso até a preferência gravada ser lida — evita piscar claro antes do escuro. */
  carregado: boolean;
  definir: (e: EscolhaDeTema) => void;
  alternar: () => void;
  carregar: () => Promise<void>;
}

export const useThemeStore = create<EstadoDoTema>((set, get) => ({
  modo: doAparelho(),
  escolha: "system",
  carregado: false,
  definir: (e) => {
    set({ escolha: e, modo: e === "system" ? doAparelho() : e });
    void gravar(e);
  },
  // Alternar sai de "seguir o aparelho" de propósito: quem toca no botão está
  // pedindo um tom, não pedindo para continuar seguindo.
  alternar: () => get().definir(get().modo === "dark" ? "light" : "dark"),
  carregar: async () => {
    const guardado = (await ler()) ?? "system";
    set({
      escolha: guardado,
      modo: guardado === "system" ? doAparelho() : guardado,
      carregado: true,
    });
  },
}));

/**
 * O aparelho pode mudar de tom com o app aberto — ao anoitecer, com o modo
 * automático do iOS. Quem escolheu `system` tem de acompanhar na hora; quem
 * escolheu um tom fixo não pode ser mexido por isso.
 *
 * Fora do `create` porque é uma assinatura só, para a vida do processo.
 */
Appearance.addChangeListener(({ colorScheme }) => {
  const { escolha } = useThemeStore.getState();
  if (escolha !== "system") return;
  useThemeStore.setState({ modo: colorScheme === "dark" ? "dark" : "light" });
});
