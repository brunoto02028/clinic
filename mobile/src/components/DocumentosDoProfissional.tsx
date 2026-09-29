import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import type { DocumentoDoProfissional } from "@/api/professional-documents";

/**
 * O que os profissionais devolveram (102 T-8).
 *
 * ## Por que dentro da tela de Documentos
 *
 * Para a pessoa, receita e laudo sao "papeis sobre mim" — ela nao precisa
 * saber que um veio como arquivo e o outro como texto assinado. Uma tela
 * separada seria uma que ninguem acha.
 *
 * ## O encerrado continua aqui
 *
 * Com a tarja e o motivo. E justamente quando uma receita e suspensa que a
 * pessoa precisa ver — para nao continuar tomando o que foi suspenso.
 */
export function DocumentosDoProfissional({
  documentos,
}: {
  documentos: DocumentoDoProfissional[];
}) {
  const t = useTheme();
  const lang = useLang();
  if (documentos.length === 0) return null;

  const data = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <View style={{ gap: 10 }}>
      <Text variant="caption" muted>
        {tr(lang, { en: "From your professionals", pt: "Dos seus profissionais" })}
      </Text>

      {documentos.map((d) => {
        const encerrado = !!d.revokedAt;
        return (
          <Card key={d.id} testID={`doc-profissional-${d.id}`}>
            <View style={{ gap: 8, opacity: encerrado ? 0.75 : 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons
                  name={d.kind === "PRESCRIPTION" ? "medkit-outline" : "document-text-outline"}
                  size={18}
                  color={encerrado ? t.colors.textMuted : t.colors.health}
                />
                <Text variant="caption" muted>
                  {lang === "pt" ? d.kindLabelPt : d.kindLabel}
                  {d.from ? ` · ${d.from}` : ""}
                </Text>
                {encerrado && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                      backgroundColor: t.colors.badSoft,
                    }}
                  >
                    <Text variant="caption" color={t.colors.bad} style={{ fontSize: 11, fontWeight: "700" }}>
                      {tr(lang, { en: "Closed", pt: "Encerrada" })}
                    </Text>
                  </View>
                )}
              </View>

              <Text variant="label" style={{ fontWeight: "700" }}>
                {d.title}
              </Text>
              <Text variant="body" style={{ lineHeight: 23, fontSize: 15 }}>
                {d.body}
              </Text>

              {/* O motivo do encerramento vem **antes** da assinatura: e o que
                  a pessoa precisa ler primeiro quando algo foi suspenso. */}
              {encerrado && d.revokedReason ? (
                <View
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: t.colors.bad,
                    paddingLeft: 10,
                    paddingVertical: 2,
                  }}
                >
                  <Text variant="caption" color={t.colors.bad}>
                    {tr(lang, { en: "Closed on", pt: "Encerrada em" })} {data(d.revokedAt!)} — {d.revokedReason}
                  </Text>
                </View>
              ) : null}

              <View style={{ height: 1, backgroundColor: t.colors.borderSubtle }} />
              <Text variant="caption" muted style={{ fontSize: 12 }}>
                {d.signature} · {data(d.sentAt)}
              </Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
