import { FlatList, Pressable, View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchEducation, educationList } from "@/api/education";
import { useTheme } from "@/theme/useTheme";

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  ARTICLE: { icon: "document-text-outline", color: "#60a5fa" },
  VIDEO: { icon: "videocam-outline", color: "#f87171" },
  EXERCISE: { icon: "fitness-outline", color: "#5dc9c0" },
  INFOGRAPHIC: { icon: "image-outline", color: "#8b5cf6" },
};

export default function Education() {
  const t = useTheme();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["education"],
    queryFn: fetchEducation,
  });

  const list = data ? educationList(data) : [];

  return (
    <Screen testID="education-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Educação",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.danger} />
            <Text color={t.colors.danger}>Não foi possível carregar.</Text>
          </View>
        </Card>
      ) : list.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="book-outline" size={48} color={t.colors.textMuted} />
          <Text muted testID="education-empty">Nenhum conteúdo disponível.</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const typeInfo = TYPE_ICONS[item.contentType] ?? { icon: "document-outline", color: "#64748b" };
            return (
              <Pressable testID={`edu-${item.id}`} onPress={() => router.push(`/education/${item.id}`)}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: `${typeInfo.color}15`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>{item.title}</Text>
                      {item.description ? (
                        <Text variant="caption" color={t.colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
                          {item.description}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                        {item.category?.name ? (
                          <View style={{
                            backgroundColor: "rgba(74, 124, 138, 0.1)",
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}>
                            <Text variant="caption" color={t.colors.secondary} style={{ fontSize: 10 }}>
                              {item.category.name}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{
                          backgroundColor: `${typeInfo.color}12`,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}>
                          <Text variant="caption" color={typeInfo.color} style={{ fontSize: 10 }}>
                            {item.contentType}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
