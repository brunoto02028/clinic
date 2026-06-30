import { useState } from "react";
import { View, Pressable, Linking } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchEducation, educationList } from "@/api/education";
import { updateEducationProgress } from "@/api/education-progress";
import { useTheme } from "@/theme/useTheme";

export default function EducationDetail() {
  const t = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["education"],
    queryFn: fetchEducation,
  });

  const item = data ? educationList(data).find((c) => c.id === id) : undefined;
  const progress = data?.progress?.[id];
  const isCompleted = progress?.status === "completed";

  const completeMutation = useMutation({
    mutationFn: () => updateEducationProgress({
      contentId: id,
      status: "completed",
      rating: rating || undefined,
      feedback: feedback || undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["education"] }),
  });

  return (
    <Screen scroll testID="education-detail">
      <Stack.Screen
        options={{ headerShown: true, title: "Conteúdo", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError || !item ? (
        <Card><Text color={t.colors.danger}>Não foi possível carregar.</Text></Card>
      ) : (
        <View style={{ gap: 16 }}>
          <View>
            <Text variant="title">{item.title}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {item.category?.name && (
                <View style={{ backgroundColor: "rgba(74,124,138,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text variant="caption" color={t.colors.secondary} style={{ fontSize: 11 }}>{item.category.name}</Text>
                </View>
              )}
              <View style={{ backgroundColor: "rgba(107,163,176,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text variant="caption" color={t.colors.accent} style={{ fontSize: 11 }}>{item.contentType}</Text>
              </View>
              {isCompleted && (
                <View style={{ backgroundColor: "rgba(16,185,129,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={12} color="#34d399" />
                  <Text variant="caption" color="#34d399" style={{ fontSize: 11 }}>Concluído</Text>
                </View>
              )}
            </View>
          </View>

          {item.description && (
            <Card>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>{item.description}</Text>
            </Card>
          )}

          {(item.body || item.content) && (
            <Card>
              <Text variant="body" color={t.colors.textSecondary} style={{ lineHeight: 22 }}>{item.body || item.content}</Text>
            </Card>
          )}

          {item.videoUrl && (
            <Pressable onPress={() => Linking.openURL(item.videoUrl!)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(239,68,68,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="play" size={24} color="#f87171" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontWeight: "600" }}>Assistir vídeo</Text>
                <Text variant="caption" color={t.colors.textMuted}>Abrir no navegador</Text>
              </View>
            </Pressable>
          )}

          {/* Rating & complete */}
          {!isCompleted && (
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 8 }}>Avaliar conteúdo</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={28}
                      color={star <= rating ? "#f59e0b" : t.colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
              <Button
                title="Marcar como concluído"
                onPress={() => completeMutation.mutate()}
                loading={completeMutation.isPending}
                icon={<Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
              />
            </Card>
          )}
        </View>
      )}
    </Screen>
  );
}
