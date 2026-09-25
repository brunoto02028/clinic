"use client";

import { useEffect, useState } from "react";

/**
 * O login com Google está mesmo disponível?
 *
 * O provedor era montado sempre, com `clientId: process.env.GOOGLE_CLIENT_ID || ""`.
 * Sem a variável configurada — que é o caso em produção — o botão aparecia nas
 * três telas, o servidor estourava `client_id is required`, e o paciente era
 * mandado para uma página de erro que responde 302 **com corpo vazio**: a tela
 * piscava e ele voltava ao mesmo lugar, sem uma frase sequer.
 *
 * Um botão que promete um caminho inexistente é pior que a ausência do botão.
 * Agora o provedor só é montado quando há credencial, e a tela pergunta ao
 * servidor o que ele oferece de verdade antes de oferecer.
 *
 * Enquanto a resposta não chega, o botão fica escondido: mostrar e esconder
 * assusta mais do que aparecer meio segundo depois.
 */
export function useGoogleSignIn(): boolean {
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => vivo && setDisponivel(!!d?.google))
      .catch(() => vivo && setDisponivel(false));
    return () => {
      vivo = false;
    };
  }, []);

  return disponivel;
}
