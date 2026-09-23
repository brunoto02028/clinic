import { useEffect, useRef, useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Button, Spinner } from "@/components/ui";
import { fetchMessages, sendMessage, markMessagesRead, type ClinicMessage } from "@/api/messages";
import { fetchProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { LoadFailure } from "@/components/LoadFailure";

/** Screen copy, English canonical. */
const UI = {
  en: {
    header: "Messages",
    title: "Messages",
    subtitle: "Your conversation with the clinic",
    empty: "No messages yet.",
    emptyHint: "Write below and your therapist will see it.",
    failed: "We could not load your messages.",
    failedHint: "This does not mean you have none — the request failed.",
    retry: "Try again",
    placeholder: "Write a message…",
    send: "Send",
    sendFailed: "Your message was not sent. Try again.",
    notice: "Notice",
  },
  pt: {
    header: "Mensagens",
    title: "Mensagens",
    subtitle: "Sua conversa com a clínica",
    empty: "Nenhuma mensagem ainda.",
    emptyHint: "Escreva abaixo que seu terapeuta vai ver.",
    failed: "Não foi possível carregar suas mensagens.",
    failedHint: "Isto não quer dizer que você não tenha nenhuma — a consulta falhou.",
    retry: "Tentar de novo",
    placeholder: "Escreva uma mensagem…",
    send: "Enviar",
    sendFailed: "Sua mensagem não foi enviada. Tente de novo.",
    notice: "Aviso",
  },
} as const;

function formatWhen(iso: string, lang: "en" | "pt"): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(lang === "pt" ? "pt-BR" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Messages() {
  const t = useTheme();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const { data: profile, error } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const lang: "en" | "pt" = profile?.preferredLocale?.startsWith("pt") ? "pt" : "en";
  const ui = UI[lang];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["messages"],
    queryFn: () => fetchMessages(),
  });
  const messages = data ?? [];

  // Reading the thread is what marks it read — the same thing the web does on
  // open. Fire and forget: failing to clear the badge must not break the screen.
  useEffect(() => {
    if (messages.some((m) => m.senderRole === "staff" && !m.readAt)) {
      markMessagesRead()
        .then(() => qc.invalidateQueries({ queryKey: ["messages"] }))
        .catch(() => {});
    }
  }, [messages.length]);

  const send = useMutation({
    mutationFn: () => sendMessage(draft.trim()),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  return (
    <Screen testID="messages-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: ui.header,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, gap: 12 }}>
          <View>
            <Text variant="title" color={t.colors.secondary}>{ui.title}</Text>
            <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
              {ui.subtitle}
            </Text>
          </View>

          {isLoading ? (
            <Spinner center />
          ) : isError ? (
            /* An empty thread and a failed request must not look alike — the
               mistake this app made everywhere else. */
            <LoadFailure error={error} onRetry={() => refetch()} />
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {messages.length === 0 ? (
                <Card>
                  <View style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
                    <Ionicons name="chatbubbles-outline" size={32} color={t.colors.textMuted} />
                    <Text variant="body">{ui.empty}</Text>
                    <Text variant="caption" color={t.colors.textSecondary} style={{ textAlign: "center" }}>
                      {ui.emptyHint}
                    </Text>
                  </View>
                </Card>
              ) : (
                messages.map((m: ClinicMessage) => {
                  const mine = m.senderRole === "patient";
                  return (
                    <View
                      key={m.id}
                      style={{
                        alignSelf: mine ? "flex-end" : "flex-start",
                        maxWidth: "86%",
                        backgroundColor: mine ? t.colors.health : t.colors.surfaceMuted,
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        gap: 4,
                      }}
                    >
                      {m.kind !== "message" && (
                        <Text
                          variant="caption"
                          color={mine ? "#FFFFFF" : t.colors.textMuted}
                          style={{ fontWeight: "700", textTransform: "uppercase", fontSize: 10 }}
                        >
                          {m.title || ui.notice}
                        </Text>
                      )}
                      <Text variant="body" color={mine ? "#FFFFFF" : t.colors.text} style={{ lineHeight: 20 }}>
                        {m.content}
                      </Text>
                      <Text
                        variant="caption"
                        color={mine ? "rgba(255,255,255,0.75)" : t.colors.textMuted}
                        style={{ fontSize: 10 }}
                      >
                        {!mine && m.sender ? `${m.sender.firstName} · ` : ""}
                        {formatWhen(m.createdAt, lang)}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder={ui.placeholder}
                multiline
              />
            </View>
            <Pressable
              onPress={() => send.mutate()}
              disabled={!draft.trim() || send.isPending}
              style={({ pressed }) => ({
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
                opacity: !draft.trim() || send.isPending ? 0.4 : 1,
                backgroundColor: pressed ? t.colors.healthSoft : t.colors.health,
              })}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {send.isError && (
            <Text variant="caption" color={t.colors.danger} style={{ textAlign: "center" }}>
              {ui.sendFailed}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
