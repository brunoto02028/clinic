import { useEffect, useRef } from "react";
import { View, Pressable } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { useVendoComo } from "@/store/vendo-como";

/**
 * A faixa que diz de quem é a tela (091 T-7).
 *
 * Enquanto o responsável vê a clínica como quem ele cuida, **toda** tela mostra
 * dados de outra pessoa: a agenda dela, o protocolo dela, os exercícios dela.
 * Sem um aviso permanente, é questão de minutos até alguém ler a dor da filha
 * como se fosse a própria — e num app clínico isso não é um engano pequeno.
 *
 * Por isso ela é fixa, some só quando se volta, e o caminho de volta está
 * dentro dela. Um aviso que não oferece a saída é um aviso que irrita.
 */
export function FaixaVendoComo() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const lang = useLang();
  const qc = useQueryClient();
  const pessoa = useVendoComo((s) => s.pessoa);
  const sair = useVendoComo((s) => s.sair);

  /**
   * O cache é limpo em **toda** saída, não só no toque do botão.
   *
   * O review de 27/09/2026 apontou o caminho que eu tinha deixado aberto: se o
   * empréstimo cai sozinho — token expirado e renovação recusada, porque o
   * vínculo foi desfeito —, o store volta para a própria conta em silêncio e
   * as telas seguem mostrando o que já tinham, que é o dado da filha. Observar
   * a transição cobre os dois casos com uma regra só.
   */
  const anterior = useRef<string | null>(null);
  useEffect(() => {
    if (anterior.current && !pessoa) qc.clear();
    anterior.current = pessoa?.id ?? null;
  }, [pessoa, qc]);

  if (!pessoa) return null;

  const voltar = () => sair();

  return (
    <View
      testID="faixa-vendo-como"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        // A faixa fica **fora** de qualquer `SafeAreaView` — é o preço de ela
        // viver acima do Stack, para não sumir a cada navegação. Sem somar o
        // inset à mão, num iPhone com notch ela é desenhada atrás da barra de
        // status e o "Voltar para mim" fica parcialmente coberto: o aviso
        // permanente perdia justamente a saída. Achado do review de 27/09.
        paddingTop: insets.top + 8,
        paddingBottom: 8,
        paddingHorizontal: 14,
        backgroundColor: t.colors.labWarmSoft,
      }}
    >
      <Ionicons name="eye-outline" size={15} color={t.colors.labWarm} />
      <Text variant="caption" color={t.colors.labWarm} style={{ flex: 1, fontWeight: "700" }}>
        {tr(lang, {
          en: `Viewing as ${pessoa.firstName}`,
          pt: `Vendo como ${pessoa.firstName}`,
        })}
      </Text>
      <Pressable onPress={voltar} hitSlop={10} accessibilityRole="button" testID="voltar-a-mim">
        <Text variant="caption" color={t.colors.labWarm} style={{ fontWeight: "700", textDecorationLine: "underline" }}>
          {tr(lang, { en: "Back to me", pt: "Voltar para mim" })}
        </Text>
      </Pressable>
    </View>
  );
}
