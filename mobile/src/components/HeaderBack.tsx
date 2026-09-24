import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { goBackOr } from "@/lib/go-back";

/**
 * O botão de voltar do app, no lugar do nativo.
 *
 * O nativo foi diagnosticado errado três vezes em 24/09/2026 — primeiro o
 * rótulo ("(tabs)"), depois a propriedade certa para escondê-lo, e no fim ele
 * aparecia e **não navegava**. Cada rodada custou um build ou um update e
 * terminou com o Bruno preso na mesma tela.
 *
 * O problema de fundo é que o comportamento do botão nativo não é nosso: quem
 * decide se ele responde, e para onde, é o navegador. Quando não responde, não
 * há erro, não há log, não há nada — só um toque que não faz nada.
 *
 * Este é nosso. Chama `goBackOr()`, que volta quando há para onde e vai para a
 * casa do paciente quando não há. **O toque sempre faz alguma coisa** — que é
 * a única garantia que importa para quem está com dor segurando o telefone.
 *
 * `hitSlop` de 12: o alvo desenhado tem 40pt e o mínimo da Apple é 44.
 */
export function HeaderBack({ tint = "#20242D" }: { tint?: string }) {
  return (
    <Pressable
      onPress={() => goBackOr()}
      accessibilityRole="button"
      accessibilityLabel="Back"
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
