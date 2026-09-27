"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Video, CheckCircle2, Clock, Paperclip, Archive } from "lucide-react";
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
  archivedAt?: string | null;
  replyKind?: string | null;
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

  /** Ver o que foi arquivado — e poder trazer de volta. */
  const [verArquivados, setVerArquivados] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/exercise-submissions?patientId=${patientId}${verArquivados ? "&archived=1" : ""}`, { cache: "no-store" });
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
  }, [patientId, verArquivados]);

  useEffect(() => { void carregar(); }, [carregar]);

  /**
   * Responder por áudio ou vídeo, além do texto (095 T-6).
   *
   * Pedido do Bruno: *"quero responder por texto ou com outro vídeo se for o
   * caso, ou mesmo áudio"*. As três peças já existiam separadas — a conversa
   * com o paciente, a gravação de voz da 089, o upload de vídeo do exercício.
   * O que faltava era o **lugar**: aqui, junto do vídeo que se está vendo.
   *
   * A mídia vai pela rota de mensagens do painel, que já sabe guardar anexo de
   * conversa. Assim a resposta chega ao paciente **onde ele lê** — e não numa
   * anotação que só a clínica vê.
   */
  const [anexo, setAnexo] = useState<Record<string, File | null>>({});
  const [arquivando, setArquivando] = useState<string | null>(null);

  const arquivar = async (id: string, arquivado: boolean) => {
    setArquivando(id);
    try {
      const res = await fetch(`/api/admin/exercise-submissions/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: arquivado }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await carregar();
    } catch {
      setErro(true);
    } finally {
      setArquivando(null);
    }
  };

  const revisar = async (id: string) => {
    setSalvando(id);
    try {
      const arquivo = anexo[id] || null;
      const tipo = arquivo
        ? arquivo.type.startsWith("audio/")
          ? "audio"
          : arquivo.type.startsWith("video/")
            ? "video"
            : null
        : null;

      const texto = (rascunho[id] || "").trim();

      /**
       * A resposta vai para a conversa — **inclusive quando é só texto**
       * (QA da 095, achado 6.1).
       *
       * Antes, áudio e vídeo iam para a conversa e o texto ficava só no
       * `reviewNote`: duas formas de responder à mesma coisa, chegando em dois
       * lugares diferentes. O paciente via o texto encostado no vídeo dele e
       * não na conversa, onde ele lê o que a clínica escreve.
       *
       * O `reviewNote` continua: ele é a **anotação clínica**, ligada àquele
       * envio. A conversa é onde a pessoa lê. São dois papéis, e agora os dois
       * acontecem.
       *
       * ## A mídia primeiro, a revisão depois
       *
       * Se isto falhar, o envio **continua na fila** — e uma fila com um item a
       * mais é melhor que um paciente marcado como respondido sem ter recebido
       * o que o terapeuta gravou para ele.
       */
      if (arquivo || texto) {
        const fd = new FormData();
        if (arquivo) fd.append("file", arquivo);
        fd.append(
          "content",
          texto ||
            (isPt
              ? "Resposta do seu terapeuta sobre o vídeo que você enviou."
              : "Your therapist's reply about the video you sent.")
        );
        const up = await fetch(`/api/admin/patients/${patientId}/messages`, {
          method: "POST",
          body: fd,
        });
        if (!up.ok) {
          /**
           * A recusa do servidor, dita como ela é (QA 6.3).
           *
           * Antes isto virava `Error("400")`, caía no `catch` genérico e a tela
           * mostrava *"não consegui carregar"* — a frase de **carregamento**,
           * que não diz que o arquivo foi recusado nem por quê. O terapeuta
           * tentava de novo com o mesmo arquivo.
           */
          const erroDoServidor = await up.json().catch(() => null);
          throw new Error(
            erroDoServidor?.error ||
              (isPt ? "O anexo não foi aceito." : "The attachment was not accepted.")
          );
        }
      }

      const res = await fetch(`/api/admin/exercise-submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: texto, replyKind: tipo }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setAnexo((a) => ({ ...a, [id]: null }));
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Video className="h-4 w-4" />
            {isPt ? "Vídeos do paciente" : "Patient's videos"}
          </h3>
          {/* O arquivado não some do sistema — some da vista. Este botão é a
              porta de volta, e a prova disso (095 T-6). */}
          <Button
            size="sm"
            variant={verArquivados ? "default" : "ghost"}
            className="h-7 text-xs gap-1.5"
            onClick={() => setVerArquivados((v) => !v)}
          >
            <Archive className="h-3 w-3" />
            {verArquivados
              ? isPt ? "Ver os atuais" : "Back to current"
              : isPt ? "Ver arquivados" : "See archived"}
          </Button>
        </div>
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

            {/* Arquivar tira da lista e **não apaga**: o vídeo é registro
                clínico, e o Bruno pediu para limpar o painel, não para perder
                a execução de um exercício numa data (095 T-6). */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5 text-muted-foreground"
                disabled={arquivando === s.id}
                onClick={() => void arquivar(s.id, !s.archivedAt)}
              >
                {arquivando === s.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Archive className="h-3 w-3" />
                )}
                {s.archivedAt
                  ? isPt ? "Trazer de volta" : "Bring it back"
                  : isPt ? "Arquivar" : "Archive"}
              </Button>
            </div>

            {s.reviewedAt ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  {isPt ? "Revisado" : "Reviewed"}
                  {s.reviewedBy ? ` · ${s.reviewedBy.firstName} ${s.reviewedBy.lastName}` : ""}
                </p>
                {/* Áudio e vídeo não cabem numa anotação de texto — o que
                    fica aqui é o rastro de que houve resposta e de que tipo,
                    para o card não parecer um "vi e não disse nada". */}
                {s.replyKind && (
                  <p className="text-foreground text-xs">
                    {s.replyKind === "audio"
                      ? isPt ? "Respondido por áudio" : "Replied with audio"
                      : isPt ? "Respondido por vídeo" : "Replied with video"}
                  </p>
                )}
                {s.reviewNote ? (
                  <p className="text-foreground text-sm whitespace-pre-wrap">{s.reviewNote}</p>
                ) : s.replyKind ? null : (
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
                  {(rascunho[s.id] || "").trim() ||
                    (anexo[s.id] ? (
                      <span className="italic text-muted-foreground">
                        {isPt
                          ? "Sem texto — ele vai receber o anexo abaixo."
                          : "No text — they will receive the attachment below."}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground">
                        {isPt
                          ? "Sem texto — ele verá apenas que você assistiu e não há correção."
                          : "No text — they will only see that you watched and there is nothing to correct."}
                      </span>
                    ))}
                </p>
                {/**
                 * O anexo na prévia (QA da 095, achado 6.7).
                 *
                 * A prévia dizia *"sem texto — ele verá apenas que você
                 * assistiu"* com uma gravação de voz a caminho. Mentia por
                 * omissão, e furava a regra da casa: **nada chega ao paciente
                 * sem quem envia ver o que vai sair**.
                 */}
                {anexo[s.id] && (
                  <p className="flex items-center gap-1.5 text-xs text-foreground">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    {isPt ? "E este anexo:" : "And this attachment:"}{" "}
                    <span className="text-muted-foreground truncate">{anexo[s.id]!.name}</span>
                  </p>
                )}
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
                {/* Áudio ou vídeo: o `accept` limita o que o seletor oferece,
                    e o tipo real é lido do arquivo na hora de enviar. */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    id={`anexo-${s.id}`}
                    type="file"
                    accept="audio/*,video/*"
                    className="hidden"
                    onChange={(e) =>
                      setAnexo((a) => ({ ...a, [s.id]: e.target.files?.[0] ?? null }))
                    }
                  />
                  <Button size="sm" variant="outline" asChild>
                    <label htmlFor={`anexo-${s.id}`} className="cursor-pointer gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      {anexo[s.id]
                        ? isPt ? "Trocar anexo" : "Change attachment"
                        : isPt ? "Áudio ou vídeo" : "Audio or video"}
                    </label>
                  </Button>
                  {anexo[s.id] && (
                    <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                      {anexo[s.id]!.name}
                      <button
                        className="ml-2 underline"
                        onClick={() => setAnexo((a) => ({ ...a, [s.id]: null }))}
                      >
                        {isPt ? "remover" : "remove"}
                      </button>
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setConfirmando(s.id)}>
                    {isPt ? "Revisar e enviar" : "Review and send"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
