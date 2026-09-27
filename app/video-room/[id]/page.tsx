"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<{ texto: string; code?: string } | null>(null);

  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        const res = await fetch(`/api/appointments/${params.id}/video`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!vivo) return;

        if (!res.ok) {
          setErro({ texto: data.errorPt || data.error || "Não foi possível abrir a consulta.", code: data.code });
          return;
        }

        /**
         * O token vai na URL porque é assim que a Daily o recebe, e ele já
         * nasce curto: vale só desta pessoa, só nesta sala, e só dentro da
         * janela do horário. Não é guardado em lugar nenhum.
         */
        setUrl(`${data.url}?t=${encodeURIComponent(data.token)}`);
      } catch {
        if (vivo) setErro({ texto: "Não foi possível falar com o servidor." });
      }
    })();

    return () => {
      vivo = false;
    };
  }, [params.id]);

  if (erro) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-lg font-semibold">Consulta por vídeo</h1>
          <p className="text-muted-foreground">{erro.texto}</p>
          {/* "Ainda não abriu" não é erro: é cedo. A frase já diz a partir de
              quando, então aqui só se oferece tentar de novo. */}
          {(erro.code === "too_early" || erro.code === "provider_error") && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Tentar de novo
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Abrindo a consulta…</p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title="Consulta por vídeo"
      className="h-screen w-full border-0"
      // Sem estes três, o navegador bloqueia câmera e microfone em silêncio, e
      // a pessoa entra na chamada muda e invisível sem entender por quê.
      allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
    />
  );
}
