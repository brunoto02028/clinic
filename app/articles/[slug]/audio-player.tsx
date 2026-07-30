"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Loader2, Pause } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface ArticleAudioPlayerProps {
  articleId: string;
}

/**
 * "Listen to article" button — lazily fetches (and lets the server cache)
 * ElevenLabs narration in the visitor's current language. See
 * app/api/articles/[id]/audio/route.ts for the generation/caching logic.
 */
export function ArticleAudioPlayer({ articleId }: ArticleAudioPlayerProps) {
  const { locale } = useLocale();
  const isPt = locale.startsWith("pt");
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Reset if the visitor switches language mid-read — the cached English
  // audio shouldn't keep playing under a Portuguese article and vice versa.
  useEffect(() => {
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    audioRef.current = null;
    urlRef.current = null;
    setStatus("idle");
  }, [locale]);

  const handleClick = async () => {
    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("paused");
      return;
    }
    if (status === "paused" && audioRef.current) {
      audioRef.current.play();
      setStatus("playing");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch(`/api/articles/${articleId}/audio?locale=${isPt ? "pt" : "en"}`);
      if (!res.ok) throw new Error("Failed to load audio");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.onended = () => setStatus("idle");
      audioRef.current = audio;
      await audio.play();
      setStatus("playing");
    } catch (err) {
      console.error("[article-audio-player]", err);
      setStatus("error");
    }
  };

  const label = {
    idle: isPt ? "Ouvir artigo" : "Listen to article",
    loading: isPt ? "Gerando áudio…" : "Generating audio…",
    playing: isPt ? "Pausar" : "Pause",
    paused: isPt ? "Continuar" : "Resume",
    error: isPt ? "Tentar novamente" : "Try again",
  }[status];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading"}
      className="inline-flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors rounded-full px-4 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {status === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : status === "playing" ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
