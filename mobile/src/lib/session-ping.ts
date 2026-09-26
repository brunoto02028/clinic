import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { apiFetch } from "@/api/client";

/**
 * "Continuo aqui" (085, T-1).
 *
 * É o que permite responder *"quanto tempo essa pessoa usa o app"* sem guardar
 * cada toque. Um sinal na abertura, e um a cada três minutos.
 *
 * **Só em primeiro plano.** Bateria é do paciente: um app que acorda para
 * avisar que existe é um app que a pessoa desinstala. Quando ela sai, o timer
 * morre; quando volta, um sinal imediato reabre ou continua a sessão — e quem
 * decide qual das duas é o servidor, pelo silêncio.
 *
 * **Nunca atrapalha.** Falha de rede é engolida: isto é do nosso interesse, não
 * do interesse de quem está usando o app.
 */

const INTERVALO_MS = 3 * 60 * 1000;

async function sinal() {
  try {
    await apiFetch("/api/mobile/session/ping", {
      method: "POST",
      body: JSON.stringify({
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? null,
      }),
    });
  } catch {
    /* sem rede, sem sessão, sem problema */
  }
}

export function useSessionPing(ativo: boolean) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ativo) return;

    const comecar = () => {
      if (timer.current) return;
      void sinal();
      timer.current = setInterval(() => void sinal(), INTERVALO_MS);
    };
    const parar = () => {
      if (!timer.current) return;
      clearInterval(timer.current);
      timer.current = null;
    };

    comecar();
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") comecar();
      else parar();
    });

    return () => {
      parar();
      sub.remove();
    };
  }, [ativo]);
}
