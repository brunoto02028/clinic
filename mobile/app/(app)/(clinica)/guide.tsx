import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

export default function Guide() {
  const t = useTheme();

  const STEPS = [
    {
      number: "1",
      title: "Complete seu perfil",
      desc: "Adicione telefone, endereço e contato de emergência.",
      icon: "person-outline" as const,
      color: t.colors.health,
      soft: t.colors.healthSoft,
      path: "/profile",
      cta: "Ir ao Perfil",
    },
    {
      number: "2",
      title: "Avaliação Médica",
      desc: "Responda o questionário de 9 etapas sobre sua saúde.",
      icon: "clipboard-outline" as const,
      color: t.colors.work,
      soft: t.colors.workSoft,
      path: "/screening",
      cta: "Fazer Avaliação",
    },
    {
      number: "3",
      title: "Agende sua consulta",
      desc: "Escolha um horário com seu terapeuta.",
      icon: "calendar-outline" as const,
      color: t.colors.warn,
      soft: t.colors.warnSoft,
      path: "/appointments",
      cta: "Ver Agenda",
    },
    {
      number: "4",
      title: "Chegue preparado",
      desc: "Chegue 5 min antes. Traga roupas confortáveis e documentos relevantes.",
      icon: "checkmark-circle-outline" as const,
      color: t.colors.ok,
      soft: t.colors.okSoft,
      path: null,
      cta: null,
    },
  ];

  const FEATURES = [
    { icon: "fitness-outline" as const, label: "Exercícios personalizados", color: t.colors.health },
    { icon: "clipboard-outline" as const, label: "Notas clínicas", color: t.colors.work },
    { icon: "footsteps-outline" as const, label: "Scans 3D dos pés", color: t.colors.community },
    { icon: "document-text-outline" as const, label: "Documentos & laudos", color: t.colors.warn },
    { icon: "school-outline" as const, label: "Conteúdo educativo", color: t.colors.ok },
    { icon: "chatbubble-outline" as const, label: "Comunicação direta", color: t.colors.bad },
  ];

  return (
    <Screen scroll testID="guide-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Guia",
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
          <Text variant="title" style={{ textAlign: "center" }}>Bem-vindo ao BPR</Text>
          <Text variant="body" color={t.colors.textSecondary} style={{ textAlign: "center", lineHeight: 22 }}>
            Este guia explica como funciona o portal,{"\n"}o que completar antes da consulta{"\n"}e como aproveitar ao máximo.
          </Text>
        </View>

        {/* Steps */}
        <View style={{ gap: 12 }}>
          <Text variant="subtitle">Passos para sua consulta</Text>
          {STEPS.map((s, i) => (
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

        {/* Features */}
        <View style={{ gap: 12 }}>
          <Text variant="subtitle">O que você pode fazer</Text>
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
          <Button variant="health" title="Começar agora" onPress={() => router.push("/screening")} size="lg" />
          <Text variant="caption" color={t.colors.textSecondary}>Complete seu perfil e avaliação</Text>
        </View>
      </View>
    </Screen>
  );
}
