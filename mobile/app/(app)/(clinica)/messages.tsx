import { useEffect, useRef, useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert, Image, Linking } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, usePathname } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Text, Card, Input, Button, Spinner } from "@/components/ui";
import {
  fetchMessages,
  sendMessage,
  markMessagesRead,
  attachmentIsImage,
  attachmentHref,
  ATTACHMENT_MAX_BYTES,
  type ClinicMessage,
  type OutgoingAttachment,
} from "@/api/messages";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ImageViewer, openFileInApp } from "@/components/FileViewer";
import { explainDeniedPermission } from "@/lib/ask-permission";
import { t as tr } from "@/lib/i18n";
import { fetchProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { LoadFailure } from "@/components/LoadFailure";
import { PlanGate } from "@/components/PlanGate";

/** Screen copy, English canonical. */
const UI = {
  en: {
    header: "Messages",
    subtitle: "Your conversation with the clinic",
    empty: "No messages yet.",
    emptyHint: "Write below and your therapist will see it.",
    failed: "We could not load your messages.",
    failedHint: "This does not mean you have none — the request failed.",
    retry: "Try again",
    placeholder: "Write a message…",
    send: "Send",
    sendFailed: "Your message was not sent. Try again.",
    attachment: "Attachment",
    notice: "Notice",
  },
  pt: {
    header: "Mensagens",
    subtitle: "Sua conversa com a clínica",
    empty: "Nenhuma mensagem ainda.",
    emptyHint: "Escreva abaixo que seu terapeuta vai ver.",
    failed: "Não foi possível carregar suas mensagens.",
    failedHint: "Isto não quer dizer que você não tenha nenhuma — a consulta falhou.",
    retry: "Tentar de novo",
    placeholder: "Escreva uma mensagem…",
    send: "Enviar",
    sendFailed: "Sua mensagem não foi enviada. Tente de novo.",
    attachment: "Anexo",
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

function MessagesScreen() {
  const t = useTheme();
  // A altura do header, que o teclado precisa descontar. O módulo ganhou
  // header em 24/09/2026 e sem isto o campo ficava atrás do teclado.
  const headerHeight = useHeaderHeight();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [anexo, setAnexo] = useState<OutgoingAttachment | null>(null);
  const [imagemAberta, setImagemAberta] = useState<{ uri: string; titulo: string } | null>(null);
  const caminho = usePathname();
  const scrollRef = useRef<ScrollView>(null);

  const { data: profile, error } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const lang: "en" | "pt" = profile?.preferredLocale?.startsWith("pt") ? "pt" : "en";
  const ui = UI[lang];

  const { data, isLoading, isError, error: messagesError, refetch } = useQuery({
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
    mutationFn: () => sendMessage(draft.trim(), anexo),
    onSuccess: () => {
      setDraft("");
      setAnexo(null);
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  /**
   * Anexar uma imagem.
   *
   * O servidor já aceitava anexo — só o app não mandava. Aqui vai imagem;
   * **vídeo não**, e não por limitação técnica: vídeo de exercício tem lugar
   * próprio, preso ao exercício, senão em duas semanas a conversa vira uma
   * pilha de vídeos sem contexto (atividade 076).
   *
   * PDF vai logo abaixo, em `anexarArquivo`.
   */
  const anexarImagem = async (origem: "camera" | "galeria") => {
    const permissao =
      origem === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      explainDeniedPermission(permissao, origem === "camera" ? "camera" : "library", lang, caminho);
      return;
    }

    const opcoes = { quality: 0.8 as const, mediaTypes: ImagePicker.MediaTypeOptions.Images };
    const r =
      origem === "camera"
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled || !r.assets[0]) return;

    const a = r.assets[0];
    // Barrado aqui, o arquivo grande não sobe só para voltar recusado — numa
    // rede de celular isso é meio minuto de espera para nada.
    //
    // `fileSize` nem sempre vem: foto tirada na hora e item do iCloud chegam
    // sem ele. Com `?? 0` a comparação era sempre falsa e o arquivo subia
    // inteiro para voltar 400 — e o único retorno na tela era "não foi
    // possível enviar". Sem o tamanho, a verificação fica com o servidor, que
    // é quem sempre soube; o que mudou é que agora a razão dele aparece.
    if (a.fileSize != null && a.fileSize > ATTACHMENT_MAX_BYTES) {
      Alert.alert(
        tr(lang, { en: "Image too large", pt: "Imagem muito grande" }),
        tr(lang, { en: "The limit is 25 MB.", pt: "O limite é 25 MB." })
      );
      return;
    }

    setAnexo({
      uri: a.uri,
      name: a.fileName ?? `foto-${Date.now()}.jpg`,
      mimeType: a.mimeType ?? "image/jpeg",
    });
  };

  /**
   * Anexar um PDF.
   *
   * É o caso real de quem chega com exame, laudo ou receita de outro serviço —
   * e o servidor já aceitava desde sempre. O seletor é do próprio sistema, e
   * só oferece PDF: uma lista que mostra tudo e depois recusa quase tudo é
   * pior que uma lista curta.
   */
  const anexarArquivo = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      // Sem a cópia para o cache, o `uri` do iOS aponta para um arquivo que o
      // app não tem mais permissão de ler na hora do upload.
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;

    const a = r.assets[0];
    if (a.size != null && a.size > ATTACHMENT_MAX_BYTES) {
      Alert.alert(
        tr(lang, { en: "File too large", pt: "Arquivo muito grande" }),
        tr(lang, { en: "The limit is 25 MB.", pt: "O limite é 25 MB." })
      );
      return;
    }

    setAnexo({
      uri: a.uri,
      name: a.name || `documento-${Date.now()}.pdf`,
      mimeType: a.mimeType || "application/pdf",
    });
  };

  const escolherAnexo = () => {
    Alert.alert(
      tr(lang, { en: "Attach", pt: "Anexar" }),
      undefined,
      [
        { text: tr(lang, { en: "Take photo", pt: "Tirar foto" }), onPress: () => void anexarImagem("camera") },
        { text: tr(lang, { en: "Choose photo", pt: "Escolher foto" }), onPress: () => void anexarImagem("galeria") },
        { text: tr(lang, { en: "Choose a PDF", pt: "Escolher um PDF" }), onPress: () => void anexarArquivo() },
        // Vídeo não entra na conversa — ele tem lugar próprio, preso ao
        // exercício. Sem esta linha, quem quisesse mandar um abria o menu, não
        // achava a opção, e não recebia pista nenhuma de onde ela está.
        {
          text: tr(lang, { en: "Exercise video…", pt: "Vídeo do exercício…" }),
          onPress: () =>
            Alert.alert(
              tr(lang, { en: "Exercise videos", pt: "Vídeos do exercício" }),
              tr(lang, {
                en: "Send those from the exercise itself, so your therapist sees which one it is. Open Exercises and pick the exercise.",
                pt: "Envie pelo próprio exercício, assim seu terapeuta sabe qual é. Abra Exercícios e escolha o exercício.",
              })
            ),
        },
        ...(Platform.OS === "android" ? [] : [{ text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" as const }]),
      ],
      { cancelable: true }
    );
  };

  return (
    /**
     * Aqui a raiz é o `KeyboardAvoidingView`, não o `Screen`.
     *
     * Enfiado dentro do `Screen`, ele ficava abaixo de um `SafeAreaView` e de
     * um `padding` — ou seja, a base dele não era a base da janela, e a conta
     * de quanto o teclado cobre saía errada por essa diferença. O campo ficava
     * atrás do teclado, e a pessoa digitava sem ver o que digitava. Tentei
     * consertar com `keyboardVerticalOffset` e **piorei**: o campo sumiu de
     * vez, porque o deslocamento diminui a compensação em vez de aumentá-la.
     *
     * Com o KAV na raiz, `keyboardVerticalOffset={headerHeight}` passa a ser o
     * que a documentação do React Navigation manda: o header é a única coisa
     * acima dele. A margem de baixo volta como `SafeAreaView edges={["bottom"]}`
     * em volta do campo, que é onde ela precisa estar numa tela de conversa.
     */
    <KeyboardAvoidingView
      testID="messages-screen"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={headerHeight}
      style={{ flex: 1, backgroundColor: t.colors.background }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: ui.header,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ flex: 1, gap: 12, padding: 16 }}>
          <View>
            {/* `ui.title` repeated `ui.header` word for word — the screen read
                "Messages Messages". The header keeps the name. */}
            <Text variant="caption" color={t.colors.textSecondary}>
              {ui.subtitle}
            </Text>
          </View>

          {isLoading ? (
            <Spinner center />
          ) : isError ? (
            /* An empty thread and a failed request must not look alike — the
               mistake this app made everywhere else. `error` used to be read
               here from the *profile* query, which is normally null, so
               LoadFailure could never recognise a plan refusal on this screen;
               the thread's own error is what this branch is about. */
            <LoadFailure error={messagesError} onRetry={() => refetch()} />
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              // Sem isto, o primeiro toque com o teclado aberto só fecha o
              // teclado — tocar em "Enviar" exigia dois toques.
              keyboardShouldPersistTaps="handled"
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
                          color={mine ? t.colors.accentFg : t.colors.textMuted}
                          style={{ fontWeight: "700", textTransform: "uppercase", fontSize: 10 }}
                        >
                          {m.title || ui.notice}
                        </Text>
                      )}
                      <Text variant="body" color={mine ? t.colors.accentFg : t.colors.text} style={{ lineHeight: 20 }}>
                        {m.content}
                      </Text>

                      {/* O anexo. A imagem aparece e amplia **aqui**; o PDF
                          abre no navegador de dentro do app. A URL vem assinada
                          pelo servidor — `/api/files` não aceita o bearer do
                          app — e mandá-la para o Safari deixava um link de
                          documento clínico no histórico de outro aplicativo. */}
                      {m.attachmentUrl && (
                        attachmentIsImage(m.attachmentType) && attachmentHref(m) ? (
                          <Pressable
                            onPress={() => {
                              const href = attachmentHref(m);
                              if (href) setImagemAberta({ uri: href, titulo: m.attachmentName ?? ui.attachment });
                            }}
                            accessibilityRole="imagebutton"
                            accessibilityLabel={m.attachmentName ?? ui.attachment}
                            style={{ marginTop: 8 }}
                          >
                            <Image
                              source={{ uri: attachmentHref(m)! }}
                              style={{ width: 200, height: 200, borderRadius: 12, backgroundColor: t.colors.surfaceMuted }}
                              resizeMode="cover"
                            />
                          </Pressable>
                        ) : (
                          <Pressable
                            onPress={() => {
                              const href = attachmentHref(m);
                              if (href) void openFileInApp(href).catch(() => {});
                            }}
                            accessibilityRole="button"
                            hitSlop={8}
                            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}
                          >
                            <Ionicons name="document-outline" size={16} color={mine ? t.colors.accentFg : t.colors.text} />
                            <Text
                              variant="caption"
                              color={mine ? t.colors.accentFg : t.colors.text}
                              style={{ textDecorationLine: "underline", flexShrink: 1 }}
                            >
                              {m.attachmentName ?? ui.attachment}
                            </Text>
                          </Pressable>
                        )
                      )}
                      <Text
                        variant="caption"
                        color={mine ? t.colors.accentFgSoft : t.colors.textMuted}
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

          {/* O que vai junto, antes de ir. Sem isto o anexo some da vista
              entre escolher e enviar, e ninguém confere o que anexou. */}
          {anexo && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 12, backgroundColor: t.colors.surfaceMuted }}>
              {/* PDF não tem miniatura: desenhado como imagem, virava um
                  retângulo vazio e parecia anexo quebrado. */}
              {anexo.mimeType.startsWith("image/") ? (
                <Image source={{ uri: anexo.uri }} style={{ width: 40, height: 40, borderRadius: 8 }} />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.border }}>
                  <Ionicons name="document-text-outline" size={20} color={t.colors.textSecondary} />
                </View>
              )}
              <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
                {anexo.name}
              </Text>
              <Pressable
                onPress={() => setAnexo(null)}
                accessibilityRole="button"
                accessibilityLabel={tr(lang, { en: "Remove attachment", pt: "Remover anexo" })}
                hitSlop={10}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={18} color={t.colors.textSecondary} />
              </Pressable>
            </View>
          )}

          <SafeAreaView edges={["bottom"]} style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            {/* Anexar: foto ou PDF. Vídeo não — ele tem lugar próprio, preso
                ao exercício. */}
            <Pressable
              onPress={escolherAnexo}
              disabled={send.isPending}
              accessibilityRole="button"
              accessibilityLabel={tr(lang, { en: "Attach", pt: "Anexar" })}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
                opacity: pressed ? 0.6 : 1,
                backgroundColor: t.colors.surfaceMuted,
              })}
            >
              <Ionicons name="add" size={22} color={t.colors.text} />
            </Pressable>
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
              disabled={(!draft.trim() && !anexo) || send.isPending}
              style={({ pressed }) => ({
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
                opacity: (!draft.trim() && !anexo) || send.isPending ? 0.4 : 1,
                backgroundColor: pressed ? t.colors.healthSoft : t.colors.health,
              })}
            >
              <Ionicons name="send" size={18} color={t.colors.accentFg} />
            </Pressable>
          </SafeAreaView>

          {send.isError && (
            <Text variant="caption" color={t.colors.danger} style={{ textAlign: "center" }}>
              {/* A razão do servidor, quando ele dá uma: "arquivo muito
                  grande" é acionável, "não foi possível enviar" não é. */}
              {(send.error as any)?.message || ui.sendFailed}
            </Text>
          )}
      </View>

      <ImageViewer
        uri={imagemAberta?.uri ?? null}
        title={imagemAberta?.titulo}
        onClose={() => setImagemAberta(null)}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * Gated on `mod_messages`. Nothing in the registry governed this screen, so
 * a clinic that wanted to switch messaging off for a patient had no switch to
 * throw, and the app showed five clinical messages regardless.
 */
export default function Messages() {
  return (
    <PlanGate module="mod_messages">
      <MessagesScreen />
    </PlanGate>
  );
}
