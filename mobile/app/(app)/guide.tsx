import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Text, Card } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

const STEPS = [
  {
    number: "1",
    title: "Complete seu perfil",
    desc: "Adicione telefone, endereço e contato de emergência.",
    icon: "person-outline" as const,
    color: "#5dc9c0",
    path: "/profile",
    cta: "Ir ao Perfil",
  },
  {
    number: "2",
    title: "Avaliação Médica",
    desc: "Responda o questionário de 9 etapas sobre sua saúde.",
    icon: "clipboard-outline" as const,
    color: "#60a5fa",
    path: "/screening",
    cta: "Fazer Avaliação",
  },
  {
    number: "3",
    title: "Agende sua consulta",
    desc: "Escolha um horário com seu terapeuta.",
    icon: "calendar-outline" as const,
    color: "#f59e0b",
    path: "/appointments",
    cta: "Ver Agenda",
  },
  {
    number: "4",
    title: "Chegue preparado",
    desc: "Chegue 5 min antes. Traga roupas confortáveis e documentos relevantes.",
    icon: "checkmark-circle-outline" as const,
    color: "#34d399",
    path: null,
    cta: null,
  },
];

const FEATURES = [
  { icon: "fitness-outline" as const, label: "Exercícios personalizados", color: "#5dc9c0" },
  { icon: "clipboard-outline" as const, label: "Notas clínicas", color: "#60a5fa" },
  { icon: "footsteps-outline" as const, label: "Scans 3D dos pés", color: "#8b5cf6" },
  { icon: "document-text-outline" as const, label: "Documentos & laudos", color: "#f59e0b" },
  { icon: "school-outline" as const, label: "Conteúdo educativo", color: "#34d399" },
  { icon: "chatbubble-outline" as const, label: "Comunicação direta", color: "#f87171" },
];

export default function Guide() {
  const t = useTheme();

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
            backgroundColor: "rgba(74, 124, 138, 0.15)",
            borderWidth: 1, borderColor: "rgba(93, 201, 192, 0.2)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="compass-outline" size={32} color="#5dc9c0" />
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
                  backgroundColor: `${s.color}20`, alignItems: "center", justifyContent: "center",
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
                        backgroundColor: `${s.color}15`, borderWidth: 1, borderColor: `${s.color}30`,
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
                  backgroundColor: "rgba(74, 124, 138, 0.06)",
                  borderWidth: 1, borderColor: "rgba(74, 124, 138, 0.1)",
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
        <Pressable
          onPress={() => router.push("/screening")}
          style={{ borderRadius: 14, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#4a7c8a", "#2c4f58"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 16, borderRadius: 14, alignItems: "center", gap: 4 }}
          >
            <Text variant="label" color="#fff" style={{ fontWeight: "700" }}>Começar agora</Text>
            <Text variant="caption" color="rgba(255,255,255,0.7)">Complete seu perfil e avaliação</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Screen>
  );
}
