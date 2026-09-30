"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Send, Loader2 } from "lucide-react";

/**
 * Enviar um material a pacientes, **a partir do próprio material** (096 T-6).
 *
 * O Bruno: *"temos os artigos ali, mas eu não sei como encaminhar a um paciente
 * em específico ou a todos. Quando vou em atribuir está vazia a página."*
 *
 * As peças já existiam todas — importar sem duplicar, atribuir a um, enviar a
 * todos, enviar por condição, e a prévia com a contagem. **O que faltava era
 * achar**: saía-se do material, ia-se a uma tela separada, e lá escolhia-se o
 * material outra vez.
 *
 * ## Três destinos, um diálogo
 *
 * Não um assistente de três passos. O gesto é *"enviar isto a alguém"*, e começa
 * onde a pessoa está: a olhar o material.
 *
 * **A contagem aparece antes de escolher**, porque descobrir o tamanho depois de
 * clicar é como se manda um artigo a trinta e quatro pessoas sem querer. A
 * prévia já existia no servidor (`dryRun`) e não tinha quem a chamasse.
 *
 * **"Quem tem a condição" é o achado desta tarefa.** A capacidade existe no
 * servidor e não tinha porta nenhuma. Mandar um artigo de isquiotibial para toda
 * a clínica é ruído; mandar a quem tem a condição é o que uma clínica quer.
 *
 * ## O que este botão não faz
 *
 * **Não toca o telefone de ninguém.** Atribuir põe o material na área do
 * paciente; avisar é um segundo ato, com a sua própria prévia — é o
 * `AvisarMaterial`, ao lado. A casa decidiu que nada alcança ninguém sem alguém
 * ver antes, e separar os dois atos é o que mantém isso verdadeiro.
 */

type Destino = "um" | "todos" | "condicao";

interface Previa {
  totalPatients: number;
  wouldSend: number;
  alreadyAssigned: number;
}

export function EnviarMaterial({
  contentId,
  contentTitle,
  onEnviado,
}: {
  contentId: string;
  contentTitle: string;
  onEnviado?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState<Destino>("todos");
  const [busca, setBusca] = useState("");
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [escolhido, setEscolhido] = useState<any>(null);
  const [condicao, setCondicao] = useState("");
  const [nota, setNota] = useState("");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  /**
   * A contagem, atualizada enquanto se escolhe.
   *
   * Só para os destinos que alcançam mais de uma pessoa — para um paciente só,
   * o número é um e mostrá-lo seria ruído.
   */
  useEffect(() => {
    if (!aberto || destino === "um") {
      setPrevia(null);
      return;
    }
    if (destino === "condicao" && condicao.trim().length < 2) {
      setPrevia(null);
      return;
    }
    let vivo = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/education/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId,
            dryRun: true,
            sendTo: destino === "todos" ? "all" : "condition",
            conditionTags: destino === "condicao" ? condicao.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          }),
        });
        const d = await res.json().catch(() => null);
        if (!vivo) return;
        // Um 404 aqui quer dizer "ninguém corresponde", que é uma resposta e
        // não uma falha: zero é exatamente o que a pessoa precisa de saber
        // antes de clicar.
        setPrevia(res.ok ? d : { totalPatients: 0, wouldSend: 0, alreadyAssigned: 0 });
      } catch {
        if (vivo) setPrevia(null);
      }
    }, 300);
    return () => { vivo = false; clearTimeout(timer); };
  }, [aberto, destino, condicao, contentId]);

  useEffect(() => {
    if (!aberto || destino !== "um") return;
    let vivo = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/patients?search=${encodeURIComponent(busca)}&limit=8`, { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        if (vivo) setPacientes(d.patients ?? d ?? []);
      } catch {}
    }, 250);
    return () => { vivo = false; clearTimeout(timer); };
  }, [aberto, destino, busca]);

  const enviar = async () => {
    setOcupado(true);
    setErro(null);
    try {
      if (destino === "um") {
        if (!escolhido) return;
        const res = await fetch("/api/admin/education/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, patientId: escolhido.id, note: nota || undefined }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          setErro(d?.error ?? "Failed");
          return;
        }
        setFeito(`Sent to ${escolhido.firstName} ${escolhido.lastName}.`);
      } else {
        const res = await fetch("/api/admin/education/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentId,
            sendTo: destino === "todos" ? "all" : "condition",
            conditionTags: destino === "condicao" ? condicao.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok) {
          setErro(d?.error ?? "Failed");
          return;
        }
        setFeito(`Sent to ${d?.assignedCount ?? previa?.wouldSend ?? 0} patients.`);
      }
      onEnviado?.();
    } catch {
      setErro("Failed");
    } finally {
      setOcupado(false);
    }
  };

  const podeEnviar =
    !ocupado &&
    ((destino === "um" && !!escolhido) ||
      (destino === "todos" && (previa?.wouldSend ?? 0) > 0) ||
      (destino === "condicao" && (previa?.wouldSend ?? 0) > 0));

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[10px] gap-1"
        onClick={() => { setAberto(true); setFeito(null); setErro(null); }}
        title="Enviar este material a pacientes"
      >
        <Send className="h-3 w-3" /> Enviar
      </Button>

      <Dialog open={aberto} onOpenChange={(v) => !ocupado && setAberto(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Send to patients</DialogTitle>
            <DialogDescription className="text-xs">
              &ldquo;{contentTitle}&rdquo; — the material appears in their app. Telling them is a
              separate step.
            </DialogDescription>
          </DialogHeader>

          {feito ? (
            <p className="text-sm">{feito}</p>
          ) : (
            <div className="space-y-3 text-sm">
              {([
                ["um", "One patient"],
                ["todos", "Everyone"],
                ["condicao", "Whoever has the condition"],
              ] as Array<[Destino, string]>).map(([chave, rotulo]) => (
                <label key={chave} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={destino === chave}
                    onChange={() => { setDestino(chave); setPrevia(null); setEscolhido(null); }}
                  />
                  <span>{rotulo}</span>
                  {/* A contagem ao lado da escolha, e não depois dela. */}
                  {destino === chave && chave !== "um" && previa && (
                    <span className="text-xs text-muted-foreground">
                      — {previa.wouldSend} {previa.wouldSend === 1 ? "person" : "people"}
                      {previa.alreadyAssigned > 0 && ` (${previa.alreadyAssigned} already have it)`}
                    </span>
                  )}
                </label>
              ))}

              {destino === "um" && (
                <div className="space-y-1.5 pl-6">
                  <Input
                    value={escolhido ? `${escolhido.firstName} ${escolhido.lastName}` : busca}
                    onChange={(e) => { setEscolhido(null); setBusca(e.target.value); }}
                    placeholder="Search by name or email"
                    className="h-8 text-xs"
                  />
                  {!escolhido && (
                    <div className="flex flex-wrap gap-1.5">
                      {pacientes.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className="rounded-md border px-2 py-1 text-[11px] hover:bg-muted"
                          onClick={() => setEscolhido(p)}
                        >
                          {p.firstName} {p.lastName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {destino === "condicao" && (
                <div className="pl-6">
                  <Input
                    value={condicao}
                    onChange={(e) => setCondicao(e.target.value)}
                    placeholder="hamstring, tendinopathy"
                    className="h-8 text-xs"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Matches the patient&rsquo;s protocols and assessments. Separate with commas.
                  </p>
                </div>
              )}

              {destino === "um" && (
                <Input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="A note for them (optional)"
                  className="h-8 text-xs"
                />
              )}

              {erro && <p className="text-xs text-red-600">{erro}</p>}
            </div>
          )}

          <DialogFooter>
            {feito ? (
              <Button size="sm" onClick={() => setAberto(false)}>Close</Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setAberto(false)} disabled={ocupado}>
                  Cancel
                </Button>
                <Button size="sm" onClick={enviar} disabled={!podeEnviar}>
                  {ocupado && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Send
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
