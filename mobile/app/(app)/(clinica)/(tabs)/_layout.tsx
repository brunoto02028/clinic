import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import { Platform } from "react-native";
import { useLang, t as tr } from "@/lib/i18n";

export default function ClinicaTabsLayout() {
  const t = useTheme();
  const lang = useLang();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.health,
        tabBarInactiveTintColor: t.colors.textMuted,
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 8.5,
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tr(lang, { en: "Home", pt: "Início" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "medkit" : "medkit-outline"} size={size} color={color} />
          ),
        }}
      />
      {/*
        * A aba Saúde, em segundo (118 T-1).
        *
        * Antes disto, **todas as medições viviam dentro do Menu**, numa lista
        * de dezoito entradas — e a tela dos dados do relógio não estava nem
        * nessa lista: chegava-se a ela por Menu → Aparelhos → "ver os meus
        * dados", três toques, enterrada dentro da tela de *ligação*.
        *
        * Para o que a clínica mede todos os dias, isso é o lugar errado. A
        * segunda posição é a da referência, e é a que diz que medir faz parte
        * do tratamento, não é uma definição.
        */}
      <Tabs.Screen
        name="saude"
        options={{
          title: tr(lang, { en: "Health", pt: "Saúde" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "pulse" : "pulse-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: tr(lang, { en: "Appointments", pt: "Consultas" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: tr(lang, { en: "Exercises", pt: "Exercícios" }),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "fitness" : "fitness-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tr(lang, { en: "Menu", pt: "Menu" }),
          tabBarActiveTintColor: t.colors.text,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "menu" : "menu-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
