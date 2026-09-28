"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";

/**
 * Quem entra por aqui é o **terapeuta**, e o inglês é a língua da casa.
 *
 * A página inteira estava escrita em português cru — título, "Abrindo a
 * consulta…", "Tentar de novo" — dentro de um painel que é inglês por padrão.
 * Um terapeuta da clínica abria a sala e lia outro idioma.
 *
 * O servidor já manda as duas versões da recusa (`error` e `errorPt`); faltava
 * a moldura à volta delas.
 */
const UI = {
  "en-GB": {
    titulo: "Video consultation",
    abrindo: "Opening the consultation…",
    tentar: "Try again",
    generico: "Could not open the consultation.",
    semServidor: "Could not reach the server.",
  },
  "pt-BR": {
    titulo: "Consulta por vídeo",
    abrindo: "Abrindo a consulta…",
    tentar: "Tentar de novo",
    generico: "Não foi possível abrir a consulta.",
    semServidor: "Não foi possível falar com o servidor.",
  },
} as const;

/**
 * A sala da consulta por vídeo (089 T-3).
 *
 * ## Esta página não existia, e o botão apontava para ela
 *
 * `/admin/video-consultations` gravava `videoRoomUrl = "/video-room/<id>"` e o
 * botão "entrar" fazia `window.open` nisso. Nunca houve página: o clique abria
 * 404. E o `<id>` era um número aleatório gerado no navegador, não uma sala.
 *
 * Agora o `[id]` é o **id da consulta**, e é o servidor que cria a sala e emite
 * o token — porque a sala é privada e a URL sozinha não abre nada.
 *
 * ## Por que um `iframe`, e não o SDK
 *
 * O `daily-js` seria dependência nova, e a interface pronta deles já faz tudo o
 * que uma consulta precisa. O `iframe` mantém a pessoa dentro do nosso endereço,
 * com o nosso cabeçalho — e `allow` precisa listar câmera e microfone, senão o
 * navegador bloqueia os dois sem dizer por quê.
 */
export default function SalaDeVideo() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const ui = UI[locale as keyof typeof UI] ?? UI["en-GB"];
  const [url, setUrl] = useState<string | null>(null);
  /**
   * As duas versões guardadas, e o idioma escolhido **na hora de desenhar**.
   *
   * `useLocale` nasce em `en-GB` e só sincroniza com o armazenamento depois de
   * montar. Escolher o idioma dentro do `fetch` congelava a frase no que o
   * estado era naquele instante — a recusa chegava em inglês mesmo com o painel
   * em português.
   */
  const [erro, setErro] = useState<{ en: string; pt?: string; code?: string } | null>(null);

  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        const res = await fetch(`/api/appointments/${params.id}/video`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!vivo) return;

        if (!res.ok) {
          // O servidor manda as duas: `error` em inglês e `errorPt` quando
          // existe. Uma rota sem frase nenhuma cai no genérico daqui, e não no
          // `Not found` cru que já chegou à tela uma vez.
          setErro({ en: data.error, pt: data.errorPt, code: data.code });
          return;
        }

        /**
         * O token vai na URL porque é assim que a Daily o recebe, e ele já
         * nasce curto: vale só desta pessoa, só nesta sala, e só dentro da
         * janela do horário. Não é guardado em lugar nenhum.
         */
        setUrl(`${data.url}?t=${encodeURIComponent(data.token)}`);
      } catch {
        if (vivo) setErro({ en: "", code: "sem_servidor" });
      }
    })();

    return () => {
      vivo = false;
    };
  }, [params.id]);

  if (erro) {
    const pt = locale === "pt-BR";
    const texto =
      erro.code === "sem_servidor"
        ? ui.semServidor
        : (pt ? erro.pt || erro.en : erro.en) || ui.generico;
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-lg font-semibold">{ui.titulo}</h1>
          <p className="text-muted-foreground">{texto}</p>
          {/* "Ainda não abriu" não é erro: é cedo. A frase já diz a partir de
              quando, então aqui só se oferece tentar de novo. Uma queda de rede
              entra pela mesma porta: nada mudou, vale insistir. */}
          {(erro.code === "too_early" ||
            erro.code === "provider_error" ||
            erro.code === "sem_servidor") && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border px-4 py-2 text-sm"
            >
              {ui.tentar}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{ui.abrindo}</p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title={ui.titulo}
      className="h-screen w-full border-0"
      // Sem estes três, o navegador bloqueia câmera e microfone em silêncio, e
      // a pessoa entra na chamada muda e invisível sem entender por quê.
      allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
    />
  );
}
