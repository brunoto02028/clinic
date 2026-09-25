"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Video, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/hooks/use-locale";

/**
 * O que o paciente mandou do exercício feito em casa, no prontuário dele.
 *
 * É aqui que o Bruno pediu para ser avisado — *"na área do paciente da clinic,
 * para eu fazer uma revisão e dar um retorno"* (25/09/2026). A notificação
 * mora onde se age sobre ela; uma fila em outra tela seria mais um lugar para
 * esquecer.
 *
 * O vídeo toca na própria tela, com a tag `<video>`: nada a instalar, e o
 * servidor responde a faixa, então dá para voltar e rever o mesmo movimento
 * sem recomeçar.
 */

interface Submission {
  id: string;
  kind: "VIDEO" | "PHOTO";
  mimeType: string;
  durationSeconds: number | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  exercisePrescription?: { id: string; exercise?: { name: string } | null } | null;
  protocolItem?: { id: string; title: string } | null;
  reviewedBy?: { firstName: string; lastName: string } | null;
}

export default function ExerciseSubmissionsPanel({ patientId }: { patientId: string }) {
  const { locale } = useLocale();
  const isPt = String(locale).toLowerCase().startsWith("pt");
  const [items, setItems] = useState<Submission[] | null>(null);
  const [erro, setErro] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/exercise-submissions?patientId=${patientId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setItems(data.submissions || []);
      setErro(false);
    } catch {
      // Lista vazia e consulta falha não podem parecer a mesma coisa — é o
      // erro que as telas de Alertas e Medições se deram ao trabalho de evitar.
      setErro(true);
      setItems((p) => p ?? []);
    }
  }, [patientId]);

  useEffect(() => { void carregar(); }, [carregar]);

  const revisar = async (id: string) => {
    setSalvando(id);
    try {
      const res = await fetch(`/api/admin/exercise-submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: (rascunho[id] || "").trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setRascunho((r) => ({ ...r, [id]: "" }));
      setConfirmando(null);
      await carregar();
    } catch {
      setErro(true);
    } finally {
      setSalvando(null);
    }
  };

  const nomeDoExercicio = (s: Submission) =>
    s.exercisePrescription?.exercise?.name ||
    s.protocolItem?.title ||
    (isPt ? "Exercício" : "Exercise");

  if (items === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Video className="h-4 w-4" />
          {isPt ? "Vídeos do paciente" : "Patient's videos"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isPt
            ? "O que ele gravou fazendo o exercício em casa. Assista e responda — a resposta aparece no app dele, junto do vídeo."
            : "What they recorded doing the exercise at home. Watch and reply — the reply appears in their app, next to the video."}
        </p>
      </div>

      {erro && (
        <p className="text-xs text-destructive">
          {isPt
            ? "Não foi possível carregar. Isto não quer dizer que não há vídeos."
            : "Could not load. That does not mean there are none."}
        </p>
      )}

      {items.length === 0 && !erro && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {isPt ? "Nenhum vídeo enviado ainda." : "No videos sent yet."}
        </p>
      )}

      {items.map((s) => {
        const pendente = !s.reviewedAt;
        return (
          <div
            key={s.id}
            className={`rounded-2xl border p-4 space-y-3 ${pendente ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {pendente ? (
                <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{nomeDoExercicio(s)}</span>
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(isPt ? "pt-BR" : "en-GB", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                }).format(new Date(s.submittedAt))}
                {s.durationSeconds ? ` · ${Math.round(s.durationSeconds)}s` : ""}
              </span>
            </div>

            {s.kind === "VIDEO" ? (
              <video
                src={`/api/exercise-submissions/${s.id}/file`}
                controls
                preload="metadata"
                className="w-full max-h-[420px] rounded-xl bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/exercise-submissions/${s.id}/file`}
                alt={nomeDoExercicio(s)}
                className="w-full max-h-[420px] object-contain rounded-xl bg-muted"
              />
            )}

            {s.reviewedAt ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  {isPt ? "Revisado" : "Reviewed"}
                  {s.reviewedBy ? ` · ${s.reviewedBy.firstName} ${s.reviewedBy.lastName}` : ""}
                </p>
                {s.reviewNote ? (
                  <p className="text-foreground text-sm whitespace-pre-wrap">{s.reviewNote}</p>
                ) : (
                  <p className="italic">
                    {isPt ? "Sem correção — execução está certa." : "No correction — the execution is right."}
                  </p>
                )}
              </div>
            ) : confirmando === s.id ? (
              /* A prévia antes de sair. Regra do Bruno: nada chega ao paciente
                 sem ele ver o texto exato. */
              <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {isPt ? "O paciente vai ler isto:" : "The patient will read this:"}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {(rascunho[s.id] || "").trim() || (
                    <span className="italic text-muted-foreground">
                      {isPt
                        ? "Sem texto — ele verá apenas que você assistiu e não há correção."
                        : "No text — they will only see that you watched and there is nothing to correct."}
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void revisar(s.id)} disabled={salvando === s.id}>
                    {salvando === s.id && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    {isPt ? "Enviar ao paciente" : "Send to patient"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmando(null)} disabled={salvando === s.id}>
                    {isPt ? "Voltar" : "Back"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={rascunho[s.id] || ""}
                  onChange={(e) => setRascunho((r) => ({ ...r, [s.id]: e.target.value }))}
                  placeholder={
                    isPt
                      ? "O que corrigir na execução… (deixe vazio se está certo)"
                      : "What to correct in the execution… (leave empty if it is right)"
                  }
                  rows={3}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => setConfirmando(s.id)}>
                  {isPt ? "Revisar e enviar" : "Review and send"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
