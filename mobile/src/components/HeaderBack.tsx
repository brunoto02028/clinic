import { Pressable } from "react-native";
import { useNavigation, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PATIENT_HOME } from "@/lib/go-back";

/**
 * O botão de voltar do app.
 *
 * Este botão foi consertado errado três vezes em 24/09/2026 — o rótulo, depois
 * a propriedade que o esconde, depois um botão próprio. O terceiro falhou por
 * um motivo que eu deveria ter visto: ele chamava `router.back()` por dentro.
 * Se `router.back()` é a coisa que não funciona, envolvê-la num botão novo não
 * muda nada; troca a embalagem, não o conteúdo.
 *
 * A diferença que importa, e que eu não estava usando: **`router.back()` age no
 * roteador raiz; `navigation.goBack()` age no navegador que é dono desta
 * tela.** Numa árvore com Stack dentro de Stack dentro de abas, esses dois não
 * apontam para o mesmo lugar. Esta tela vive no Stack do módulo, e é a esse
 * Stack que o pedido precisa chegar.
 *
 * A ordem aqui é deliberada, do mais específico ao mais garantido:
 *
 * 1. `navigation.goBack()` — o navegador desta tela, se ele tiver para onde;
 * 2. `router.back()` — o roteador raiz, caso a pilha esteja acima;
 * 3. `router.replace(casa)` — que não depende de histórico nenhum.
 *
 * O terceiro passo é o que garante que **o toque sempre faz alguma coisa**.
 * Nenhum dos três pode falhar em silêncio, que era o problema original: um
 * botão que não responde, sem erro, sem log, sem nada.
 */
export function HeaderBack({ tint = "#20242D" }: { tint?: string }) {
  const navigation = useNavigation();

  const voltar = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(PATIENT_HOME as never);
  };

  return (
    <Pressable
      onPress={voltar}
      accessibilityRole="button"
      accessibilityLabel="Back"
      // O alvo desenhado tem 40pt e o mínimo da Apple é 44.
      hitSlop={12}
      testID="header-back"
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Ionicons name="chevron-back" size={26} color={tint} />
    </Pressable>
  );
}
