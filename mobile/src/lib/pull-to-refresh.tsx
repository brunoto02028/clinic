import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/theme/useTheme";

/**
 * Puxar a tela para baixo atualiza (26/09/2026).
 *
 * O Bruno: *"toda vez que eu puxar a tela para baixo, eu quero que atualize. É
 * para eu não precisar sair do aplicativo e atualizar. Todas as vezes que a
 * clínica mandar alguma coisa, a atualização é automática."*
 *
 * **Ele atualiza tudo o que está montado, não uma consulta escolhida a dedo.**
 * `refetchQueries({ type: "active" })` pega cada consulta viva naquela tela —
 * a lista, o contador do cabeçalho, o aviso de pendência. Passar uma chave por
 * tela daria a mesma tela metade velha e metade nova, que é pior do que não
 * atualizar: a pessoa vê o número mudar e a lista não.
 *
 * O gesto existia zero vezes no app antes disto. Quem quisesse ver uma
 * mensagem nova tinha de fechar e abrir — `refetchOnWindowFocus` cobre esse
 * caminho, e era o único que existia.
 */
export function usePullToRefresh() {
  const qc = useQueryClient();
  const t = useTheme();
  const [atualizando, setAtualizando] = useState(false);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await qc.refetchQueries({ type: "active" });
    } finally {
      // `finally` e não o caminho feliz: uma consulta que falha ainda tem de
      // soltar a roda, senão ela gira para sempre e a tela parece travada.
      setAtualizando(false);
    }
  }, [qc]);

  return {
    atualizando,
    atualizar,
    /**
     * Pronto para entregar a um `ScrollView` ou `FlatList`. A cor vem do tema
     * porque no tom escuro a roda padrão do Android é escura sobre escuro.
     */
    controle: (
      <RefreshControl
        refreshing={atualizando}
        onRefresh={atualizar}
        tintColor={t.colors.textMuted}
        colors={[t.colors.primary]}
        progressBackgroundColor={t.colors.surface}
      />
    ),
  };
}
