import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import { usePullToRefresh } from "@/lib/pull-to-refresh";

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /**
   * Puxar para atualizar. Ligado por padrão em toda tela que rola — o Bruno
   * pediu o gesto no app inteiro, e pedir tela por tela garantiria esquecer
   * algumas. Passe `false` onde a atualização atrapalha, como um formulário
   * em preenchimento.
   */
  refreshable?: boolean;
  padded?: boolean;
  /**
   * A tela já tem cabeçalho de navegação, então o topo não precisa de recuo.
   *
   * O `SafeAreaView` desce o conteúdo abaixo do notch. Quando existe um
   * cabeçalho de navegação, **ele já fez isso** — e o recuo acontece duas
   * vezes, deixando uma faixa morta entre o cabeçalho e o primeiro conteúdo.
   *
   * O Bruno viu na lista de artigos: do cabeçalho até o primeiro título havia
   * ~85pt, dos quais o recuo desta tela explica 32. A diferença é do tamanho
   * de um inset de topo de iPhone.
   *
   * Fica opcional, e não ligado por padrão, porque as telas **sem** cabeçalho —
   * entrar e cadastrar — dependem desse recuo para não nascer embaixo do
   * relógio.
   */
  semRecuoNoTopo?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/**
 * The widest a column of content gets, whatever the screen.
 *
 * `supportsTablet: true` means the app installs on iPad and runs at the
 * tablet's own resolution, not in a scaled phone window — and nothing here
 * consulted the screen size, so every one of the 27 screens stretched a line
 * of text past a thousand pixels. This is not an iPad *design* (that is two
 * columns, and a different navigation model); it is the difference between a
 * comfortable reading column and a phone inflated to fill a tablet.
 *
 * 560 rather than a typographic 65ch: cards, rows of chips and the exercise
 * list all live in this column too, and they need more room than prose does.
 */
const MAX_CONTENT_WIDTH = 560;

export function Screen({ children, scroll, padded = true, semRecuoNoTopo, style, testID, refreshable = true }: ScreenProps) {
  const t = useTheme();
  const { controle } = usePullToRefresh();
  const inner: ViewStyle = {
    flex: scroll ? undefined : 1,
    padding: padded ? t.spacing.lg : 0,
    backgroundColor: t.colors.background,
    // On a phone this is inert: the screen is narrower than the cap, and
    // `alignSelf: center` on a full-width box changes nothing.
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  };

  return (
    <SafeAreaView
      edges={semRecuoNoTopo ? ["left", "right", "bottom"] : undefined}
      style={[styles.safe, { backgroundColor: t.colors.background }]}
      testID={testID}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // O teclado cobria o campo que a pessoa estava preenchendo, em
          // qualquer tela com formulário — ela digitava sem ver o que digitava.
          // Isto pede ao iOS que reserve a altura do teclado no próprio scroll,
          // que é a correção que vale para as 45 telas de uma vez em vez de
          // um `KeyboardAvoidingView` colado em cada uma. Achado pelo Bruno
          // testando no iPhone, 24/09/2026.
          automaticallyAdjustKeyboardInsets
          // Arrastar para baixo fecha o teclado, que é como o resto do iOS se
          // comporta e é a saída mais rápida quando ele está no caminho.
          keyboardDismissMode="interactive"
          refreshControl={refreshable ? controle : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[inner, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
