import { useState } from "react";
import { View, Pressable, Linking } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner, Button } from "@/components/ui";
import { fetchEducation, educationList } from "@/api/education";
import { updateEducationProgress } from "@/api/education-progress";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

export default function EducationDetail() {
  const t = useTheme();
  const lang = useLang();
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
        options={{ headerShown: true, title: tr(lang, { en: "Article", pt: "Conteúdo" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      {isLoading ? (
        <Spinner center />
      ) : isError || !item ? (
        <Card><Text color={t.colors.danger}>{tr(lang, { en: "We could not load this.", pt: "Não foi possível carregar." })}</Text></Card>
      ) : (
        <View style={{ gap: 16 }}>
          <View>
            <Text variant="title">{item.title}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {item.category?.name && (
                <View style={{ backgroundColor: t.colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text variant="caption" color={t.colors.secondary} style={{ fontSize: 11 }}>{item.category.name}</Text>
                </View>
              )}
              <View style={{ backgroundColor: t.colors.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text variant="caption" color={t.colors.accent} style={{ fontSize: 11 }}>{item.contentType}</Text>
              </View>
              {isCompleted && (
                <View style={{ backgroundColor: t.colors.okSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={12} color={t.colors.ok} />
                  <Text variant="caption" color={t.colors.ok} style={{ fontSize: 11 }}>{tr(lang, { en: "Completed", pt: "Concluído" })}</Text>
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
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: t.colors.badSoft, borderRadius: 14, borderWidth: 1, borderColor: t.colors.badSoft }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.badSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="play" size={24} color={t.colors.bad} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontWeight: "600" }}>
                  {tr(lang, { en: "Watch video", pt: "Assistir vídeo" })}
                </Text>
                <Text variant="caption" color={t.colors.textMuted}>
                  {tr(lang, { en: "Opens in your browser", pt: "Abrir no navegador" })}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Rating & complete */}
          {!isCompleted && (
            <Card>
              <Text variant="label" style={{ fontWeight: "600", marginBottom: 8 }}>{tr(lang, { en: "Rate this article", pt: "Avaliar conteúdo" })}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={28}
                      color={star <= rating ? t.colors.warn : t.colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
              <Button
                title={tr(lang, { en: "Mark as completed", pt: "Marcar como concluído" })}
                onPress={() => completeMutation.mutate()}
                loading={completeMutation.isPending}
                icon={<Ionicons name="checkmark-circle-outline" size={20} color={t.colors.primaryFg} />}
              />
            </Card>
          )}
        </View>
      )}
    </Screen>
  );
}
