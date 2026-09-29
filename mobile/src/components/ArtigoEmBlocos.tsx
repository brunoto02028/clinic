import { View, Image } from "react-native";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import type { BlocoDoArtigo } from "@/api/education";
import { textoEmPedacos } from "@/lib/texto-em-pedacos";

/**
 * O artigo desenhado com a tipografia da casa (28/09/2026).
 *
 * ## O que havia antes
 *
 * O corpo do material vem em HTML — é o que o editor do site produz — e a tela
 * o entregava a um `<Text>`, que desenha o que recebe. O paciente lia
 * `<h2><span style="background-color: transparent…` e dezenas de `&nbsp;`.
 *
 * ## Por que blocos, e não HTML renderizado
 *
 * Um `WebView` ou uma biblioteca de HTML traria a tipografia do HTML junto —
 * um artigo clínico dentro de uma moldura que não é a do aplicativo parece um
 * site embutido, e não acompanha o modo escuro.
 *
 * Com blocos, o telefone desenha com a fonte, o espaçamento e as cores daqui.
 * A tradução mora no servidor (`lib/rich-text-blocks.ts`), num lugar só.
 */
/**
 * Um texto com a marcação de dentro do parágrafo já aplicada (107 T-4).
 *
 * `<Text>` aninhado herda o estilo do pai no React Native, então basta o pai
 * carregar tamanho, cor e entrelinha, e cada pedaço dizer só o que muda.
 *
 * Um pedaço só e sem estilo devolve a string crua: assim o caso comum — texto
 * sem marcação nenhuma — não paga uma árvore de componentes.
 */
function TextoComMarcacao({ texto, paiItalico }: { texto: string; paiItalico?: boolean }) {
  const pedacos = textoEmPedacos(texto);
  if (pedacos.length === 1 && pedacos[0].estilo === "normal") return <>{texto}</>;

  return (
    <>
      {pedacos.map((p, i) => (
        <Text
          key={i}
          style={
            p.estilo === "negrito"
              ? { fontWeight: "700" }
              : p.estilo === "italico"
                ? // Ênfase dentro de texto já inclinado volta ao normal — é a
                  // convenção tipográfica, e é a única que se enxerga. Na
                  // citação, itálico dentro de itálico saía indistinguível
                  // (achado do QA, 29/09/2026).
                  { fontStyle: paiItalico ? "normal" : "italic" }
                : undefined
          }
        >
          {p.texto}
        </Text>
      ))}
    </>
  );
}

export function ArtigoEmBlocos({ blocos }: { blocos: BlocoDoArtigo[] }) {
  const t = useTheme();

  return (
    <View style={{ gap: 14 }}>
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case "titulo":
            return (
              <Text
                key={i}
                variant={b.nivel === 1 ? "title" : "subtitle"}
                style={{
                  // Um título encostado no parágrafo anterior não separa nada.
                  // O espaço acima é maior que o de baixo, de propósito: ele
                  // pertence ao que vem depois dele.
                  marginTop: i === 0 ? 0 : 10,
                  fontSize: b.nivel === 1 ? 22 : b.nivel === 2 ? 18 : 16,
                  lineHeight: b.nivel === 1 ? 29 : b.nivel === 2 ? 25 : 22,
                }}
              >
                {b.texto}
              </Text>
            );

          case "paragrafo":
            return (
              <Text key={i} variant="body" style={{ lineHeight: 25, fontSize: 15.5 }}>
                <TextoComMarcacao texto={b.texto} />
              </Text>
            );

          case "lista":
            return (
              <View key={i} style={{ gap: 8 }}>
                {b.itens.map((item, j) => (
                  <View key={j} style={{ flexDirection: "row", gap: 10 }}>
                    <Text variant="body" color={t.colors.textMuted} style={{ lineHeight: 25, fontSize: 15.5 }}>
                      {b.ordenada ? `${j + 1}.` : "•"}
                    </Text>
                    <Text variant="body" style={{ flex: 1, lineHeight: 25, fontSize: 15.5 }}>
                      <TextoComMarcacao texto={item} />
                    </Text>
                  </View>
                ))}
              </View>
            );

          case "citacao":
            return (
              <View
                key={i}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: t.colors.health,
                  paddingLeft: 14,
                  paddingVertical: 2,
                }}
              >
                <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 25, fontSize: 15.5, fontStyle: "italic" }}>
                  <TextoComMarcacao texto={b.texto} paiItalico />
                </Text>
              </View>
            );

          case "tabela":
            /**
             * Pares rotulados, e não uma tabela (107 T-5).
             *
             * Numa tela de telefone uma tabela de duas colunas ou espreme as
             * duas até ninguém ler, ou pede rolagem lateral — e rolagem lateral
             * dentro de um artigo que rola para baixo é onde o texto se perde.
             *
             * Cada linha vira um cartão: o rótulo da coluna em cima, o valor
             * embaixo. Lê-se de cima para baixo, que é como o resto do artigo
             * já se lê.
             */
            return (
              <View key={i} style={{ gap: 10 }}>
                {b.linhas.map((linha, j) => (
                  <View
                    key={j}
                    style={{
                      borderWidth: 1,
                      borderColor: t.colors.borderSubtle,
                      borderRadius: 12,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    {linha.map((celula, k) => {
                      if (!celula) return null;
                      const rotulo = b.cabecalho[k];
                      // A primeira coluna é o assunto da linha: vai em
                      // destaque, sem repetir o rótulo em cima dela.
                      if (k === 0) {
                        return (
                          <Text key={k} variant="label" style={{ fontWeight: "700", fontSize: 15 }}>
                            <TextoComMarcacao texto={celula} />
                          </Text>
                        );
                      }
                      return (
                        <View key={k} style={{ gap: 2 }}>
                          {rotulo ? (
                            <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 11 }}>
                              {rotulo}
                            </Text>
                          ) : null}
                          <Text variant="body" style={{ lineHeight: 22, fontSize: 15 }}>
                            <TextoComMarcacao texto={celula} />
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            );

          case "imagem":
            return (
              <View key={i} style={{ gap: 6 }}>
                <Image
                  source={{ uri: b.url }}
                  style={{ width: "100%", height: 200, borderRadius: t.radius.lg, backgroundColor: t.colors.surfaceMuted }}
                  resizeMode="cover"
                />
                {b.legenda ? (
                  <Text variant="caption" color={t.colors.textMuted} style={{ fontSize: 12 }}>
                    {b.legenda}
                  </Text>
                ) : null}
              </View>
            );

          case "separador":
            return (
              <View key={i} style={{ height: 1, backgroundColor: t.colors.border, marginVertical: 4 }} />
            );

          default:
            return null;
        }
      })}
    </View>
  );
}
