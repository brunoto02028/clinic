import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

/**
 * Tocar na notificação abre a tela do assunto.
 *
 * Notificação que abre a home é notificação que ensina a ignorar notificação:
 * quem toca em "seu terapeuta respondeu ao seu vídeo" quer o vídeo, e cair na
 * tela inicial é uma segunda tarefa que ninguém pediu.
 *
 * São dois caminhos, e o segundo é o esquecido: com o app **fechado**, o toque
 * abre o app e o evento já aconteceu antes de qualquer listener existir —
 * `useLastNotificationResponse` é o que devolve esse toque. O listener sozinho
 * cobriria só o app já aberto.
 */
export function PushRouter() {
  const ultima = Notifications.useLastNotificationResponse();
  const jaTratada = useRef<string | null>(null);

  const navegar = (destino: unknown) => {
    const url = typeof destino === "string" ? destino.trim() : "";
    // Rota desconhecida não pode travar o app: sem destino utilizável, o toque
    // simplesmente abre o app, que já é o mínimo aceitável.
    if (!url || !url.startsWith("/")) return;
    try {
      router.push(url as never);
    } catch {
      /* rota que não existe mais — fica onde está */
    }
  };

  // App fechado: o toque que abriu o app.
  useEffect(() => {
    if (!ultima) return;
    const id = ultima.notification.request.identifier;
    if (jaTratada.current === id) return;
    jaTratada.current = id;
    navegar(ultima.notification.request.content.data?.url);
  }, [ultima]);

  // App aberto ou em segundo plano.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.identifier;
      if (jaTratada.current === id) return;
      jaTratada.current = id;
      navegar(r.notification.request.content.data?.url);
    });
    return () => sub.remove();
  }, []);

  return null;
}
