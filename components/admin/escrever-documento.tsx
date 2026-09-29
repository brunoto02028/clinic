"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, FileSignature, Loader2, Send, Smartphone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  TIPOS_DE_DOCUMENTO,
  assinatura,
  estadoDoDocumento,
  rotuloDoTipo,
  type TipoDeDocumento,
} from "@/lib/professional-document";

/**
 * Escrever, ver a prévia, e **então** enviar (102 T-8).
 *
 * ## As duas regras da casa, juntas
 *
 * *"Nada sai sem o Bruno ver a prévia"* e *"nada sai para paciente sozinho"*.
 * Criar deixa em rascunho; a prévia mostra exatamente o que o telefone vai
 * desenhar; enviar é um botão separado.
 *
 * É o mesmo desenho do material educativo (101 T-2), pela mesma razão: lá o
 * Bruno descobriu o que tinha mandado abrindo o telefone.
 *
 * ## A assinatura não é digitada
 *
 * Ela vem de quem está logado e do registro da clínica dele, congelada no
 * servidor no momento de emitir. Um campo de texto aqui deixaria alguém
 * assinar com o registro de outra pessoa.
 */
export function EscreverDocumento({
  patientId,
  patientName,
  onEnviado,
}: {
  patientId: string;
  patientName: string;
  onEnviado?: () => void;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<TipoDeDocumento>("GUIDANCE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rascunho, setRascunho] = useState<any>(null);
  const [ocupado, setOcupado] = useState(false);
  const [emitidos, setEmitidos] = useState<any[] | null>(null);
  const [encerrando, setEncerrando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  /**
   * O que já foi emitido, na mesma tela.
   *
   * Sem esta lista quem prescreveu não vê o que prescreveu — e, pior, não tem
   * por onde **encerrar**: a rota existia e nenhum botão a chamava. Uma receita
   * que não pode ser suspensa é a pessoa continuando a tomar o que foi
   * cancelado.
   */
  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/professional-documents`);
      if (!res.ok) return;
      const d = await res.json();
      setEmitidos(Array.isArray(d.documents) ? d.documents : []);
    } catch {
      /* a lista é complemento: falhar aqui não pode impedir de escrever */
    }
  }, [patientId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const encerrar = async (id: string) => {
    const razao = motivo.trim();
    if (!razao) return;
    setOcupado(true);
    try {
      const res = await fetch(
        `/api/admin/patients/${patientId}/professional-documents/${id}/send`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: razao }),
        }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not close it",
          description: d.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Closed",
        description: `${patientName.split(" ")[0] || "The patient"} sees it as closed, with your reason.`,
      });
      setEncerrando(null);
      setMotivo("");
      await carregar();
    } finally {
      setOcupado(false);
    }
  };

  const criar = async () => {
    setOcupado(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/professional-documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not write it",
          description: d.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      setRascunho(d.document);
      // Na lista imediatamente: o rascunho que só aparece depois de um reload
      // é um rascunho que a pessoa acha que não foi salvo.
      await carregar();
    } finally {
      setOcupado(false);
    }
  };

  /**
   * Enviar **por id**, e não pelo rascunho em memória.
   *
   * O botão de cima lia o estado local, que morre ao sair da página: quem
   * salvava, fechava e voltava no dia seguinte via a linha "Draft" na lista e
   * **nenhum botão** — não dava para enviar nem para encerrar, só reescrever,
   * deixando a linha morta no banco. Achado 1 do QA de 29/09/2026.
   */
  const enviar = async (id?: string) => {
    const alvo = id ?? rascunho?.id;
    if (!alvo) return;
    setOcupado(true);
    try {
      const res = await fetch(
        `/api/admin/patients/${patientId}/professional-documents/${alvo}/send`,
        { method: "POST" }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not send it",
          description: d.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Sent",
        description: `${patientName} has it in their app, and their phone was notified.`,
      });
      setRascunho(null);
      setTitle("");
      setBody("");
      await carregar();
      onEnviado?.();
    } finally {
      setOcupado(false);
    }
  };

  const pronto = title.trim().length > 0 && body.trim().length > 0;
  const assinaturaDoRascunho = rascunho
    ? [
        rascunho.signerName,
        [rascunho.registryKind, rascunho.registryNumber].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Write a document</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as TipoDeDocumento);
                  setRascunho(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_DOCUMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rotuloDoTipo(kind).exigeRegistro && (
                <p className="text-xs text-muted-foreground">
                  Signed with your professional registry number. A prescription without one
                  looks valid and is not.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setRascunho(null);
                }}
                placeholder="e.g. Ibuprofen 400mg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-body">Text</Label>
              <Textarea
                id="doc-body"
                rows={8}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setRascunho(null);
                }}
                placeholder="What the patient needs to read."
              />
            </div>

            {/* Dois botões, e nunca um.
                Escrever deixa em rascunho; a prévia fica ao lado; enviar é uma
                segunda decisão. Um botão só faria a prévia enfeite — e foi
                assim que o material educativo chegou ao paciente sem ninguém
                ter visto (101 T-2). */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={criar} disabled={!pronto || ocupado}>
                {ocupado && !rascunho ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {rascunho ? "Saved as draft" : "Save draft"}
              </Button>
              {/* `() => enviar()` e não `enviar`: como referência, o React
                  passaria o evento do clique como se fosse o id. */}
              <Button onClick={() => enviar()} disabled={!rascunho || ocupado} className="gap-1.5">
                {ocupado && rascunho ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send to {patientName.split(" ")[0] || "the patient"}
              </Button>
            </div>
            {!rascunho && pronto && (
              <p className="text-xs text-muted-foreground">
                Save the draft to see exactly what they will read, then send.
              </p>
            )}
          </div>

          {/* A prévia: o que o telefone vai desenhar, com o logo da casa. */}
          <div className="md:border-l md:pl-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" />
              What the patient sees
            </p>
            <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border bg-background shadow-sm">
              <div className="flex items-center gap-2 border-b px-4 py-2.5">
                <img src="/logo.png" alt="BPR" className="h-5 w-auto" />
                <span className="text-xs font-medium text-muted-foreground">Documents</span>
              </div>
              <div className="space-y-2 p-4">
                <p className="text-[11px] text-muted-foreground">{rotuloDoTipo(kind).label}</p>
                <p className="text-[15px] font-bold leading-tight">
                  {title.trim() || <span className="text-muted-foreground">Title</span>}
                </p>
                <p className="whitespace-pre-wrap text-[15px] leading-[23px]">
                  {body.trim() || (
                    <span className="text-muted-foreground">
                      The text you write appears here, exactly like this.
                    </span>
                  )}
                </p>
                <div className="h-px bg-border" />
                <p className="text-xs text-muted-foreground">
                  {assinaturaDoRascunho ??
                    "Your name and registry number, added when you save the draft."}
                </p>
              </div>
            </div>

            {rascunho && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                Nothing has reached them yet. A draft stays here until you send it.
              </p>
            )}
          </div>
        </div>

        {/* O que já foi emitido — e o único lugar de onde se encerra.
            Rascunho aparece aqui também: é dele que se vê que alguém escreveu
            e não enviou. */}
        {emitidos && emitidos.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Issued to {patientName.split(" ")[0] || "this patient"}
            </p>
            {emitidos.map((d) => {
              const estado = estadoDoDocumento(d);
              return (
                <div key={d.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={estado === "encerrado" ? "destructive" : "secondary"}>
                      {estado === "rascunho" ? "Draft" : estado === "enviado" ? "Sent" : "Closed"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {rotuloDoTipo(d.kind).label}
                    </span>
                    <span className="font-medium">{d.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{assinatura(d)}</p>
                  {d.revokedReason && (
                    <p className="mt-1 text-xs text-destructive">
                      Closed: {d.revokedReason}
                    </p>
                  )}

                  {/* Rascunho tem os dois caminhos aqui, e não só no formulário
                      acima: é esta linha que a pessoa encontra amanhã. */}
                  {estado !== "encerrado" && encerrando !== d.id && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {estado === "rascunho" && (
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 px-2 text-xs"
                          disabled={ocupado}
                          onClick={() => enviar(d.id)}
                        >
                          <Send className="h-3.5 w-3.5" /> Send this
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          setEncerrando(d.id);
                          setMotivo("");
                        }}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {estado === "rascunho" ? "Discard this" : "Close this"}
                      </Button>
                    </div>
                  )}

                  {encerrando === d.id && (
                    <div className="mt-2 space-y-2">
                      {/* O motivo é obrigatório porque o paciente o lê: ver
                          "encerrada" sem saber por quê é pior que não ver. */}
                      <Label htmlFor={`motivo-${d.id}`} className="text-xs">
                        {estadoDoDocumento(d) === "rascunho"
                          ? "Why are you discarding it? It stays in the record."
                          : "Why? The patient reads this."}
                      </Label>
                      <Input
                        id={`motivo-${d.id}`}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="e.g. Replaced by a new prescription"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!motivo.trim() || ocupado}
                          onClick={() => encerrar(d.id)}
                        >
                          {ocupado ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                          Close it
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEncerrando(null)}>
                          Keep it
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground">
              Documents are never deleted — closing keeps the record and tells the patient why.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
