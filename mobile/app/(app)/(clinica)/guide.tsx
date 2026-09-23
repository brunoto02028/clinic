import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { PlanGate } from "@/components/PlanGate";
import { useLang, t as tr } from "@/lib/i18n";

function GuideScreen() {
  const t = useTheme();
  const lang = useLang();

  const STEPS = [
    {
      number: "1",
      title: tr(lang, { en: "Complete your profile", pt: "Complete seu perfil" }),
      desc: tr(lang, {
        en: "Add your phone, address and emergency contact.",
        pt: "Adicione telefone, endereço e contato de emergência.",
      }),
      icon: "person-outline" as const,
      color: t.colors.health,
      soft: t.colors.healthSoft,
      // Not "/profile": three files resolve to it — the profile tab of the
      // clinic, the BA and the lab module — and the router picked the BA one,
      // so this step opened another product's menu. Same ambiguity that froze
      // sign-out on "/".
      path: "/(app)/(clinica)/(tabs)/profile",
      cta: tr(lang, { en: "Go to profile", pt: "Ir ao Perfil" }),
    },
    {
      number: "2",
      title: tr(lang, { en: "Medical assessment", pt: "Avaliação Médica" }),
      desc: tr(lang, {
        en: "Answer the 9-step questionnaire about your health.",
        pt: "Responda o questionário de 9 etapas sobre sua saúde.",
      }),
      icon: "clipboard-outline" as const,
      color: t.colors.work,
      soft: t.colors.workSoft,
      path: "/(app)/(clinica)/screening",
      cta: tr(lang, { en: "Start assessment", pt: "Fazer Avaliação" }),
    },
    {
      number: "3",
      title: tr(lang, { en: "Book your appointment", pt: "Agende sua consulta" }),
      desc: tr(lang, {
        en: "Pick a time with your therapist.",
        pt: "Escolha um horário com seu terapeuta.",
      }),
      icon: "calendar-outline" as const,
      color: t.colors.warn,
      soft: t.colors.warnSoft,
      path: "/(app)/(clinica)/(tabs)/appointments",
      cta: tr(lang, { en: "View appointments", pt: "Ver Agenda" }),
    },
    {
      number: "4",
      title: tr(lang, { en: "Arrive prepared", pt: "Chegue preparado" }),
      desc: tr(lang, {
        en: "Arrive 5 minutes early. Bring comfortable clothes and any relevant documents.",
        pt: "Chegue 5 min antes. Traga roupas confortáveis e documentos relevantes.",
      }),
      icon: "checkmark-circle-outline" as const,
      color: t.colors.ok,
      soft: t.colors.okSoft,
      path: null,
      cta: null,
    },
  ];

  const FEATURES = [
    { icon: "fitness-outline" as const, label: tr(lang, { en: "Personalised exercises", pt: "Exercícios personalizados" }), color: t.colors.health },
    { icon: "clipboard-outline" as const, label: tr(lang, { en: "Clinical notes", pt: "Notas clínicas" }), color: t.colors.work },
    { icon: "footsteps-outline" as const, label: tr(lang, { en: "3D foot scans", pt: "Scans 3D dos pés" }), color: t.colors.community },
    { icon: "document-text-outline" as const, label: tr(lang, { en: "Documents & reports", pt: "Documentos & laudos" }), color: t.colors.warn },
    { icon: "school-outline" as const, label: tr(lang, { en: "Educational content", pt: "Conteúdo educativo" }), color: t.colors.ok },
    { icon: "chatbubble-outline" as const, label: tr(lang, { en: "Direct messaging", pt: "Comunicação direta" }), color: t.colors.bad },
  ];

  return (
    <Screen scroll testID="guide-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "How it works", pt: "Como funciona" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 24 }}>
        {/* Header */}
        <View style={{ alignItems: "center", gap: 12 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: t.colors.healthSoft,
            borderWidth: 1, borderColor: t.colors.borderSubtle,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="compass-outline" size={32} color={t.colors.health} />
          </View>
          <Text variant="title" style={{ textAlign: "center" }}>
            {tr(lang, { en: "Welcome to BPR", pt: "Bem-vindo ao BPR" })}
          </Text>
          <Text variant="body" color={t.colors.textSecondary} style={{ textAlign: "center", lineHeight: 22 }}>
            {tr(lang, {
              en: "This guide explains how the portal works, what to complete before your appointment, and how to get the most out of it.",
              pt: "Este guia explica como funciona o portal, o que completar antes da consulta e como aproveitar ao máximo.",
            })}
          </Text>
        </View>

        {/* Steps */}
        <View style={{ gap: 12 }}>
          <Text variant="subtitle">
            {tr(lang, { en: "Steps before your appointment", pt: "Passos para sua consulta" })}
          </Text>
          {STEPS.map((s) => (
            <Card key={s.number}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: s.soft, alignItems: "center", justifyContent: "center",
                }}>
                  <Text variant="label" color={s.color} style={{ fontWeight: "700" }}>{s.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontWeight: "600" }}>{s.title}</Text>
                  <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2, lineHeight: 18 }}>
                    {s.desc}
                  </Text>
                  {s.cta && s.path && (
                    <Pressable
                      onPress={() => router.push(s.path)}
                      style={{
                        alignSelf: "flex-start", marginTop: 8,
                        flexDirection: "row", alignItems: "center", gap: 4,
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
                        backgroundColor: s.soft, borderWidth: 1, borderColor: t.colors.borderSubtle,
                      }}
                    >
                      <Text variant="caption" color={s.color} style={{ fontWeight: "600" }}>{s.cta}</Text>
                      <Ionicons name="arrow-forward" size={12} color={s.color} />
                    </Pressable>
                  )}
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* The one rule the web states and the app used to leave out. */}
        <Card accent="health">
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Ionicons name="time-outline" size={18} color={t.colors.warn} />
            <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
              {tr(lang, {
                en: "Need to cancel or reschedule? Please let the clinic know at least 24 hours in advance.",
                pt: "Precisa cancelar ou remarcar? Avise a clínica com pelo menos 24 horas de antecedência.",
              })}
            </Text>
          </View>
        </Card>

        {/* Features */}
        <View style={{ gap: 12 }}>
          <Text variant="subtitle">
            {tr(lang, { en: "What you can do here", pt: "O que você pode fazer" })}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {FEATURES.map((f) => (
              <View
                key={f.label}
                style={{
                  width: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8,
                  padding: 12, borderRadius: 12,
                  backgroundColor: t.colors.surfaceMuted,
                  borderWidth: 1, borderColor: t.colors.borderSubtle,
                }}
              >
                <Ionicons name={f.icon} size={18} color={f.color} />
                <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1, fontSize: 11 }}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={{ gap: 4, alignItems: "center" }}>
          <Button
            variant="health"
            title={tr(lang, { en: "Start now", pt: "Começar agora" })}
            onPress={() => router.push("/(app)/(clinica)/screening")}
            size="lg"
          />
          <Text variant="caption" color={t.colors.textSecondary}>
            {tr(lang, { en: "Complete your profile and assessment", pt: "Complete seu perfil e avaliação" })}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

/**
 * Gated on `mod_guide` — the same module the web checks before it renders the
 * matching page. Without this the app showed what the web had just refused.
 */
export default function Guide() {
  return (
    <PlanGate module="mod_guide">
      <GuideScreen />
    </PlanGate>
  );
}
