"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Ban, Inbox, Loader2, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/**
 * Partilhar item a item, com a equipe (102 T-9).
 *
 * O Bruno: *"eu da clínica quero determinar o que o médico ou os outros
 * profissionais vão ver do meu paciente. Não pode ser automaticamente liberado
 * para todo mundo, só com permissões."*
 *
 * ## O que esta tela **não** tem, e por quê
 *
 * Não há "partilhar com a equipe", não há caixa "médicos veem exames", não há
 * seleção múltipla de colegas. Cada um desses botões seria liberação automática
 * com outro nome, e quem entrasse na equipe amanhã herdaria o acesso de hoje.
 *
 * Um item, um nome, um clique. Partilhar o mesmo exame com três colegas são três
 * cliques — é mais trabalho de propósito, porque é o trabalho que a palavra
 * "permissão" significa.
 *
 * ## A prévia
 *
 * Antes do clique, a tela mostra a linha exata que vai aparecer na caixa de
 * entrada do colega. É a mesma regra do material educativo (101 T-2), onde o
 * Bruno descobriu o que tinha mandado abrindo o telefone.
 */
export function PartilharComAEquipe({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState<any[]>([]);
  const [colegas, setColegas] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [enviadas, setEnviadas] = useState<any[]>([]);
  const [recebidas, setRecebidas] = useState<any[]>([]);

  const [escolhido, setEscolhido] = useState<string>("");
  const [colega, setColega] = useState<string>("");
  const [nota, setNota] = useState("");
  const [ciente, setCiente] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/admin/patients/${patientId}/shareable`),
        fetch(`/api/admin/patients/${patientId}/shares`),
      ]);
      if (a.ok) {
        const d = await a.json();
        setItens(Array.isArray(d.items) ? d.items : []);
        setColegas(Array.isArray(d.colleagues) ? d.colleagues : []);
        setTipos(Array.isArray(d.kinds) ? d.kinds : []);
      }
      if (b.ok) {
        const d = await b.json();
        setEnviadas(Array.isArray(d.sent) ? d.sent : []);
        setRecebidas(Array.isArray(d.received) ? d.received : []);
      }
    } finally {
      setCarregando(false);
    }
  }, [patientId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const item = itens.find((i) => `${i.item}:${i.itemId}` === escolhido) ?? null;
  const tipoDoItem = tipos.find((t) => t.value === item?.item) ?? null;
  const destino = colegas.find((c) => c.id === colega) ?? null;
  const precisaCiente = !!tipoDoItem?.extraStep;
  const pronto = !!item && !!destino && (!precisaCiente || ciente);

  const partilhar = async () => {
    if (!item || !destino) return;
    setOcupado(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: item.item,
          itemId: item.itemId,
          toUserId: destino.id,
          note: nota.trim() || null,
          acknowledgeSessionNote: ciente || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Not shared",
          description: d.errorPt || d.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Shared",
        description: `${destino.firstName} can see this one item. Nothing else changed.`,
      });
      setEscolhido("");
      setColega("");
      setNota("");
      setCiente(false);
      await carregar();
    } finally {
      setOcupado(false);
    }
  };

  const revogar = async (id: string) => {
    setOcupado(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/shares/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "No longer needed" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast({
          title: "Could not revoke",
          description: d.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      await carregar();
    } finally {
      setOcupado(false);
    }
  };

  const rotulo = (v: string) => tipos.find((t) => t.value === v)?.label ?? v;
  const primeiro = patientName.split(" ")[0] || "this patient";

  if (carregando) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading what can be shared…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">The care team</h3>
        </div>

        {colegas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other professional is treating {primeiro} yet. When one is, you can pass them
            single items from here — one item, one colleague at a time.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>What to share</Label>
                <Select
                  value={escolhido}
                  onValueChange={(v) => {
                    setEscolhido(v);
                    setCiente(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick one item" />
                  </SelectTrigger>
                  <SelectContent>
                    {itens.map((i) => (
                      <SelectItem key={`${i.item}:${i.itemId}`} value={`${i.item}:${i.itemId}`}>
                        {rotulo(i.item)} — {i.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {itens.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nothing of yours to share yet.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                {/* Um colega, e não uma lista: a tela não tem como partilhar com
                    "a equipe" porque essa decisão não existe. */}
                <Label>With whom</Label>
                <Select value={colega} onValueChange={setColega}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick one colleague" />
                  </SelectTrigger>
                  <SelectContent>
                    {colegas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} — {c.clinic?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="share-note">A line for them (optional)</Label>
                <Input
                  id="share-note"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="e.g. see page 2"
                />
              </div>

              {precisaCiente && (
                /* A evolução é a mais sensível da lista, e a de psicologia não
                   entra na partilha comum. O passo a mais é a diferença entre
                   partilhar sem perceber e partilhar sabendo. */
                <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  <input
                    type="checkbox"
                    checked={ciente}
                    onChange={(e) => setCiente(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                    This is a session note. I am passing a clinical session record to a named
                    colleague, and {primeiro} will see that I did.
                  </span>
                </label>
              )}

              <Button onClick={partilhar} disabled={!pronto || ocupado} className="gap-1.5">
                {ocupado ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                Share this one item
              </Button>
            </div>

            {/* A prévia: a linha exata que vai aparecer na caixa dele. */}
            <div className="md:border-l md:pl-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                What {destino ? destino.firstName : "they"} will see
              </p>
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                {item ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{rotulo(item.item)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.quando).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1.5 font-medium">{item.titulo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {patientName} · shared by you
                    </p>
                    {nota.trim() && <p className="mt-1.5 text-xs italic">“{nota.trim()}”</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Pick an item and the line they will get appears here.
                  </p>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                They see this item and nothing else. {primeiro} sees that you shared it, and can
                revoke it.
              </p>
            </div>
          </div>
        )}

        {enviadas.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Shared by this clinic</p>
            {enviadas.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-sm"
              >
                <Badge variant={s.revokedAt ? "destructive" : "secondary"}>
                  {s.revokedAt ? "Revoked" : rotulo(s.item)}
                </Badge>
                <span className="flex-1">
                  to {s.toUser?.firstName} {s.toUser?.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.sharedAt).toLocaleDateString()}
                </span>
                {!s.revokedAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                    disabled={ocupado}
                    onClick={() => revogar(s.id)}
                  >
                    <Ban className="h-3.5 w-3.5" /> Revoke
                  </Button>
                )}
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Revoking stops access from here on. What was already read stays on the record.
            </p>
          </div>
        )}

        {recebidas.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" /> Shared with you
            </p>
            {recebidas.map((s) => (
              <div key={s.id} className="rounded-lg border p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{rotulo(s.item)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    from {s.fromUser?.firstName} {s.fromUser?.lastName} · {s.fromClinic?.name}
                  </span>
                </div>
                {s.note && <p className="mt-1 text-xs italic">“{s.note}”</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
