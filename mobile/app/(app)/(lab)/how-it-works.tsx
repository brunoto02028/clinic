import { View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { fetchPontosDeColeta } from "@/api/labs";

/**
 * Como funciona um exame pelo app (081).
 *
 * O Bruno: *"eu preciso de uma página ou de alguma forma explicar como é que
 * funciona para o paciente entender. Ele compra e onde está feita a busca de
 * endereço dos pontos de coleta relacionadas ao endereço dele."*
 *
 * **O enquadramento é o do contrato dele, não o de uma clínica vendendo exame.**
 * A pessoa pede qualquer exame por conta própria, nada é associado à clínica, o
 * laboratório responde pelo exame e pelo resultado, e o resultado é dela — para
 * mandar ao médico que preferir. É o mesmo texto que os termos publicados e o
 * consentimento já dizem; divergir aqui seria prometer outra coisa na tela
 * onde a pessoa decide.
 *
 * A parte dos pontos de coleta **já mostra alguma coisa hoje**, mesmo com a
 * conexão do laboratório fechada: o código postal do cadastro, conferido contra
 * o serviço de códigos postais. Uma tela que reconhece o que a pessoa cadastrou
 * é diferente de uma tela vazia.
 */
export default function ComoFunciona() {
  const t = useTheme();
  const lang = useLang();
  const pontos = useQuery({ queryKey: ["lab-collection-points"], queryFn: fetchPontosDeColeta });

  const passos = [
    {
      icone: "search-outline" as const,
      titulo: { en: "Choose your test", pt: "Escolha seu exame" },
      corpo: {
        en: "Browse the tests and see exactly which markers each one measures, what it costs and how long the result takes. You do not need a referral, and you do not need to be a patient of anyone.",
        pt: "Veja os exames e exatamente quais marcadores cada um mede, quanto custa e em quanto tempo o resultado sai. Você não precisa de encaminhamento, nem de ser paciente de ninguém.",
      },
    },
    {
      icone: "card-outline" as const,
      titulo: { en: "Pay for it", pt: "Pague" },
      corpo: {
        en: "One payment, nothing recurring. The price on the test is the price you pay.",
        pt: "Um pagamento, nada recorrente. O preço que está no exame é o que você paga.",
      },
    },
    {
      icone: "water-outline" as const,
      titulo: { en: "Give your sample", pt: "Dê sua amostra" },
      corpo: {
        en: "This is the part that changes from test to test — the three ways are below.",
        pt: "É a parte que muda de exame para exame — os três caminhos estão logo abaixo.",
      },
    },
    {
      icone: "document-text-outline" as const,
      titulo: { en: "Get your result", pt: "Receba seu resultado" },
      corpo: {
        en: "The laboratory sends the result and it appears here, usually within a working day. It is yours: keep it, download it, or send it to whichever doctor you prefer.",
        pt: "O laboratório envia o resultado e ele aparece aqui, em geral em um dia útil. Ele é seu: guarde, baixe, ou mande para o médico que você preferir.",
      },
    },
  ];

  const caminhos = [
    {
      icone: "home-outline" as const,
      titulo: { en: "A kit at home", pt: "Kit em casa" },
      corpo: {
        en: "A finger-prick kit arrives by post. You follow the steps in the app and post it back the same day.",
        pt: "Um kit de picada no dedo chega pelo correio. Você segue os passos no app e posta de volta no mesmo dia.",
      },
    },
    {
      icone: "location-outline" as const,
      titulo: { en: "A collection point near you", pt: "Um ponto de coleta perto de você" },
      corpo: {
        en: "Some tests need a full blood draw, which a professional has to take. You book a time at one of the laboratory's collection points — many are inside pharmacies — and it takes a few minutes.",
        pt: "Alguns exames precisam de coleta venosa, que só um profissional pode fazer. Você marca um horário num dos pontos de coleta do laboratório — muitos ficam dentro de farmácias — e leva poucos minutos.",
      },
    },
    {
      icone: "person-outline" as const,
      titulo: { en: "Someone comes to you", pt: "Alguém vai até você" },
      corpo: {
        en: "For some tests a phlebotomist can visit your home instead.",
        pt: "Para alguns exames, um profissional de coleta pode ir até sua casa.",
      },
    },
  ];

  const estado = pontos.data?.estado;

  return (
    <Screen scroll testID="lab-how-it-works">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 18 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "How it works", pt: "Como funciona" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
            {tr(lang, {
              en: "From choosing a test to holding the result.",
              pt: "De escolher o exame a ter o resultado na mão.",
            })}
          </Text>
        </View>

        {passos.map((p, i) => (
          <Card key={p.icone}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: t.colors.labSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={p.icone} size={18} color={t.colors.lab} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="label" style={{ fontWeight: "700" }}>
                  {i + 1}. {tr(lang, p.titulo)}
                </Text>
                <Text variant="caption" color={t.colors.textSecondary}>{tr(lang, p.corpo)}</Text>
              </View>
            </View>
          </Card>
        ))}

        <View style={{ marginTop: 6 }}>
          <Text variant="subtitle">
            {tr(lang, { en: "Three ways to give your sample", pt: "Três caminhos para dar sua amostra" })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
            {tr(lang, {
              en: "Which one applies depends on the test — each test page says so before you pay.",
              pt: "Qual deles vale depende do exame — a página de cada exame diz isso antes de você pagar.",
            })}
          </Text>
        </View>

        {caminhos.map((c) => (
          <Card key={c.icone}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Ionicons name={c.icone} size={20} color={t.colors.lab} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="label" style={{ fontWeight: "700" }}>{tr(lang, c.titulo)}</Text>
                <Text variant="caption" color={t.colors.textSecondary}>{tr(lang, c.corpo)}</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* ── Os pontos perto da pessoa ── */}
        <View style={{ marginTop: 6 }}>
          <Text variant="subtitle">
            {tr(lang, { en: "Collection points near you", pt: "Pontos de coleta perto de você" })}
          </Text>
        </View>

        {pontos.isLoading ? (
          <Spinner center />
        ) : estado === "sem_postcode" ? (
          <Card testID="pontos-sem-postcode">
            <Text variant="caption" color={t.colors.textSecondary}>
              {tr(lang, {
                en: "Add your postcode to your profile and we will show the collection points closest to you.",
                pt: "Adicione seu código postal ao seu perfil e mostramos os pontos de coleta mais perto de você.",
              })}
            </Text>
            <Button
              title={tr(lang, { en: "Add my postcode", pt: "Adicionar meu código postal" })}
              variant="primary"
              style={{ backgroundColor: t.colors.lab, marginTop: 10 }}
              onPress={() => router.push("/(app)/profile-edit")}
              testID="pontos-ir-ao-perfil"
            />
          </Card>
        ) : estado === "postcode_desconhecido" ? (
          <Card testID="pontos-postcode-desconhecido">
            <Text variant="caption" color={t.colors.textSecondary}>
              {tr(lang, {
                en: `We could not find the postcode on your profile (${pontos.data?.postcode}). Check it and we will find your nearest points.`,
                pt: `Não encontramos o código postal do seu perfil (${pontos.data?.postcode}). Confira e achamos os pontos mais próximos.`,
              })}
            </Text>
            <Button
              title={tr(lang, { en: "Check my postcode", pt: "Conferir meu código postal" })}
              variant="primary"
              style={{ backgroundColor: t.colors.lab, marginTop: 10 }}
              onPress={() => router.push("/(app)/profile-edit")}
            />
          </Card>
        ) : estado === "laboratorio_desconectado" ? (
          <Card testID="pontos-lab-desconectado">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="location" size={18} color={t.colors.lab} />
              <Text variant="label" style={{ fontWeight: "700" }}>
                {pontos.data?.postcode}
                {pontos.data?.local ? ` · ${pontos.data.local}` : ""}
              </Text>
            </View>
            <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 6 }}>
              {tr(lang, {
                en: "We have your postcode. The list of collection points near it appears here as soon as the laboratory connection opens.",
                pt: "Temos seu código postal. A lista de pontos de coleta perto dele aparece aqui assim que a conexão com o laboratório abrir.",
              })}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {(pontos.data?.pontos ?? []).map((ponto) => (
              <Card key={ponto.id} testID={`ponto-${ponto.id}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Text variant="label" style={{ fontWeight: "700", flex: 1 }}>{ponto.nome}</Text>
                  {ponto.distanciaKm != null && (
                    <Text variant="caption" color={t.colors.lab}>{ponto.distanciaKm.toFixed(1)} km</Text>
                  )}
                </View>
                <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 3 }}>
                  {ponto.endereco}
                </Text>
                {/* Como se chega lá a pé é metade da decisão de ir. */}
                {(ponto.trem || ponto.onibus) && (
                  <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 3 }}>
                    {[ponto.trem, ponto.onibus].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* ── De quem é a responsabilidade ── */}
        <Card style={{ backgroundColor: t.colors.surfaceMuted, borderWidth: 0 }}>
          <Text variant="label" style={{ fontWeight: "700" }}>
            {tr(lang, { en: "Who is responsible for what", pt: "De quem é cada parte" })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 6 }}>
            {tr(lang, {
              en: "The laboratory runs the test and issues the result — the test, the sample and the result are theirs, and they are accredited to do it. What we do is give you access to private testing without a referral, and a place to keep the result.",
              pt: "O laboratório faz o exame e emite o resultado — o exame, a amostra e o resultado são dele, e ele é credenciado para isso. O que fazemos é dar a você acesso a exames privados sem encaminhamento, e um lugar para guardar o resultado.",
            })}
          </Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 8 }}>
            {tr(lang, {
              en: "A result is not a diagnosis. Nobody here reads it before you do, and ordering a test is not linked to any treatment. Send it to the doctor of your choice — and if anything about it worries you, speak to a doctor.",
              pt: "Um resultado não é um diagnóstico. Ninguém aqui o lê antes de você, e pedir um exame não está ligado a tratamento nenhum. Mande para o médico que você escolher — e se algo nele preocupar, procure um médico.",
            })}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
