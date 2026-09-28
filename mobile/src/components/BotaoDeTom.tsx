import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import { useThemeStore } from "@/store/theme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * Trocar claro/escuro de onde a pessoa está (092 T-6).
 *
 * O Bruno: *"às vezes eu quero mudar e eu tenho que ir lá no profile achar e
 * voltar."* Três toques e uma navegação para uma coisa que é de olhar, não de
 * configurar.
 *
 * ## Onde ele fica, e o que cede quando há disputa
 *
 * No `headerRight`, que é o canto livre das telas com cabeçalho. Quando a tela
 * já tem uma ação própria ali, **o tema cede**: a opção da tela vence, porque
 * trocar de tom é raro e a ação da tela é o motivo de ela existir. Isso sai de
 * graça do `expo-router` — o que a tela define sobrepõe o padrão do layout.
 *
 * E ele **não** empurra o voltar nem o fechar de lugar: fica do outro lado.
 *
 * ## Por que um ícone e não um menu
 *
 * Existem três estados — claro, escuro, e seguir o aparelho. Um menu de três
 * itens para isso é pesado demais; um interruptor de dois esconderia o
 * terceiro, que é o padrão e o que a maioria deveria manter.
 *
 * Então: **toque alterna claro/escuro**, e **toque longo volta a seguir o
 * aparelho**. Quem nunca encostar fica no automático, que é o certo. Quem quer
 * fixar, fixa num toque. E quem se arrependeu tem como voltar — sem isso,
 * encostar uma vez trancaria a pessoa fora do modo automático para sempre, que
 * foi o defeito da versão anterior deste app, quando `userInterfaceStyle`
 * estava fixo em `light`.
 */
export function BotaoDeTom() {
  const t = useTheme();
  const lang = useLang();
  const modo = useThemeStore((s) => s.modo);
  const escolha = useThemeStore((s) => s.escolha);
  const definir = useThemeStore((s) => s.definir);

  const escuro = modo === "dark";

  return (
    <Pressable
      // Sem retorno tátil: `expo-haptics` não está no projeto, e acrescentá-lo
      // seria dependência nova **e** módulo nativo — mudaria o fingerprint e
      // cortaria o `eas update` do binário instalado. Não vale por uma
      // vibração.
      onPress={() => definir(escuro ? "light" : "dark")}
      onLongPress={() => definir("system")}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={tr(lang, {
        en: escuro ? "Switch to the light tone" : "Switch to the dark tone",
        pt: escuro ? "Mudar para o tom claro" : "Mudar para o tom escuro",
      })}
      accessibilityHint={tr(lang, {
        en: "Press and hold to follow the device again",
        pt: "Toque e segure para voltar a seguir o aparelho",
      })}
      testID="botao-de-tom"
      style={{ paddingHorizontal: 4, paddingVertical: 4 }}
    >
      <Ionicons
        name={escuro ? "sunny-outline" : "moon-outline"}
        size={20}
        // No automático o ícone fica discreto: ele está informando, não
        // anunciando uma escolha que a pessoa não fez.
        color={escolha === "system" ? t.colors.textMuted : t.colors.text}
      />
    </Pressable>
  );
}
