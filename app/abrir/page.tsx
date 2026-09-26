"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * A porta para o app (26/09/2026).
 *
 * O Bruno: *"a gente tem que começar a direcionar para o aplicativo, ainda que
 * o aplicativo não esteja publicado."*
 *
 * Um e-mail não pode mandar o paciente direto para `bprclinic://` — quem não
 * tem o app vê o navegador engasgar com um endereço que ele não entende, e
 * fica sem nada. Esta página é o meio-termo: ela **tenta** o app, e quem não o
 * tem continua tendo para onde ir.
 *
 * O detalhe que faz funcionar é a aposta no tempo. Se o app abre, o navegador
 * vai para segundo plano e o temporizador nunca chega ao fim; se não abre,
 * nada acontece e a alternativa aparece. Por isso o desvio para a web é
 * **oferecido**, e não automático: um desvio automático competiria com o app
 * que acabou de abrir, e a pessoa voltaria para o navegador sozinha.
 */

const ESQUEMA = "bprclinic";

/** Onde cada destino mora no app e na web. Nomes curtos porque vão num e-mail. */
const DESTINOS: Record<string, { app: string; web: string }> = {
  exercicios: { app: "/(app)/(clinica)/(tabs)/exercises", web: "/dashboard/treatment" },
  consultas: { app: "/(app)/(clinica)/(tabs)/appointments", web: "/dashboard/appointments" },
  mensagens: { app: "/(app)/(clinica)/messages", web: "/dashboard/questions" },
  dores: { app: "/(app)/(clinica)/daily-checkin", web: "/dashboard/journey" },
  exames: { app: "/(app)/(lab)/(tabs)", web: "/dashboard" },
  documentos: { app: "/(app)/(clinica)/documents", web: "/dashboard/documents" },
  inicio: { app: "/(app)/(clinica)/(tabs)", web: "/dashboard" },
};

export default function Abrir() {
  const params = useSearchParams();
  const pedido = params.get("para") ?? "inicio";
  const destino = DESTINOS[pedido] ?? DESTINOS.inicio;
  const pt = (params.get("lang") ?? "").toLowerCase().startsWith("pt");
  const [mostrarAlternativa, setMostrarAlternativa] = useState(false);

  useEffect(() => {
    // A tentativa acontece uma vez, logo ao abrir.
    window.location.href = `${ESQUEMA}://${destino.app.replace(/^\//, "")}`;
    const t = setTimeout(() => setMostrarAlternativa(true), 1500);
    return () => clearTimeout(t);
  }, [destino.app]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#F5F4F1",
        color: "#20242D",
      }}
    >
      <img src="/logo-ink.png" alt="BPR" style={{ height: 56 }} />

      <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
        {pt ? "Abrindo o aplicativo…" : "Opening the app…"}
      </p>

      {mostrarAlternativa && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#5B616C", maxWidth: 420, lineHeight: 1.5 }}>
            {pt
              ? "Se ele não abriu sozinho, você pode continuar pelo navegador."
              : "If it did not open on its own, you can carry on in the browser."}
          </p>
          <a
            href={destino.web}
            style={{
              display: "inline-block",
              background: "#4F7361",
              color: "#fff",
              padding: "13px 30px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {pt ? "Continuar no navegador →" : "Continue in the browser →"}
          </a>
        </div>
      )}
    </main>
  );
}
