import { useState } from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, Input, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { previewCoupon, type CouponPreviewOk, type CouponScope } from "@/api/coupons";

/**
 * O campo do cupom (084, T-3).
 *
 * A razão de não usarmos o cupom pronto do Stripe está aqui: o desconto tem de
 * aparecer **antes** de pagar. Com `allow_promotion_codes` a tela mostraria £100
 * e o cartão seria debitado em £80 — a tela prometendo um número e o servidor
 * cobrando outro, que foi a N4 do QA da 080 e custou uma rodada inteira.
 *
 * O campo é opcional e nunca bloqueia: quem não digita nada paga o preço da 082.
 *
 * A recusa mostra **o motivo**, não "erro". Um cupom expirado e um cupom de
 * outra pessoa levam a ações diferentes, e dizer só "não funcionou" manda a
 * pessoa perguntar à clínica o que a tela já sabia.
 */
export function CouponField({
  scope,
  targetId,
  onChange,
  testID = "coupon-field",
}: {
  scope: CouponScope;
  targetId?: string;
  /** O cupom aplicado, ou `null` quando não há nenhum. */
  onChange: (aplicado: CouponPreviewOk | null) => void;
  testID?: string;
}) {
  const t = useTheme();
  const lang = useLang();
  const [codigo, setCodigo] = useState("");
  const [aplicado, setAplicado] = useState<CouponPreviewOk | null>(null);
  const [recusa, setRecusa] = useState<string | null>(null);
  const [checando, setChecando] = useState(false);
  const [aberto, setAberto] = useState(false);

  const aplicar = async () => {
    const limpo = codigo.trim();
    if (!limpo) return;
    setChecando(true);
    setRecusa(null);
    try {
      const r = await previewCoupon({ code: limpo, scope, targetId });
      if (r.ok) {
        setAplicado(r);
        onChange(r);
      } else {
        setAplicado(null);
        onChange(null);
        setRecusa(lang === "pt" ? r.errorPt : r.error);
      }
    } catch {
      setRecusa(
        tr(lang, {
          en: "We could not check that code just now.",
          pt: "Não foi possível verificar esse código agora.",
        })
      );
    } finally {
      setChecando(false);
    }
  };

  const remover = () => {
    setAplicado(null);
    setRecusa(null);
    setCodigo("");
    onChange(null);
  };

  // Aplicado: o campo sai de cena e fica o resultado. Deixar o input aberto com
  // um cupom já valendo convida a digitar outro por cima.
  if (aplicado) {
    return (
      <View
        testID={`${testID}-applied`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          backgroundColor: t.colors.okSoft,
          borderRadius: 10,
          padding: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={t.colors.ok} style={{ fontWeight: "700" }}>
            {aplicado.code}
            {aplicado.campaign ? ` · ${aplicado.campaign}` : ""}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            {tr(lang, {
              en: `${aplicado.currency} ${aplicado.discount.toFixed(2)} off`,
              pt: `${aplicado.currency} ${aplicado.discount.toFixed(2)} de desconto`,
            })}
          </Text>
        </View>
        <Pressable onPress={remover} hitSlop={10} testID={`${testID}-remove`}>
          <Ionicons name="close-circle" size={22} color={t.colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  // Fechado por padrão: um campo de cupom sempre aberto sugere que há um código
  // a saber, e a maioria das pessoas não tem nenhum.
  if (!aberto) {
    return (
      <Pressable onPress={() => setAberto(true)} testID={`${testID}-open`}>
        <Text variant="caption" color={t.colors.health} style={{ fontWeight: "600" }}>
          {tr(lang, { en: "Have a discount code?", pt: "Tem um código de desconto?" })}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 8 }} testID={testID}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            value={codigo}
            onChangeText={setCodigo}
            placeholder={tr(lang, { en: "Discount code", pt: "Código de desconto" })}
            autoCapitalize="characters"
            autoCorrect={false}
            testID={`${testID}-input`}
          />
        </View>
        <Button
          title={tr(lang, { en: "Apply", pt: "Aplicar" })}
          variant="health"
          size="md"
          onPress={aplicar}
          loading={checando}
          disabled={checando || !codigo.trim()}
          testID={`${testID}-apply`}
        />
      </View>
      {recusa && (
        <Text variant="caption" color={t.colors.bad} testID={`${testID}-refusal`}>
          {recusa}
        </Text>
      )}
    </View>
  );
}

/**
 * O preço, com e sem cupom.
 *
 * O original só aparece riscado **quando há cupom**. Sem ele, mostrar um preço
 * riscado seria inventar um desconto — e a exceção de preço da 082 não se
 * anuncia: aquele paciente vê um número, não uma negociação (decisão 3 da 082).
 */
export function PrecoComCupom({
  currency,
  original,
  cupom,
  suffix,
}: {
  currency: string;
  original: number;
  cupom: CouponPreviewOk | null;
  suffix?: string;
}) {
  const t = useTheme();
  // "GBP 100.00" leva espaço; "£100.00" não. As telas passam os dois — a de
  // consulta usa o código que vem do servidor, a de planos usa o símbolo.
  const dinheiro = (v: number) =>
    currency.length === 1 ? `${currency}${v.toFixed(2)}` : `${currency} ${v.toFixed(2)}`;
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      {cupom && (
        <Text
          variant="caption"
          color={t.colors.textMuted}
          style={{ textDecorationLine: "line-through" }}
          testID="price-original"
        >
          {dinheiro(original)}
        </Text>
      )}
      <Text variant="label" style={{ fontWeight: "700" }} testID="price-final">
        {dinheiro(cupom ? cupom.final : original)}
      </Text>
      {suffix ? (
        <Text variant="caption" color={t.colors.textSecondary}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}
