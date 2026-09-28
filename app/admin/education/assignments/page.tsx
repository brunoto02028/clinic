"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck, Plus, Loader2, CheckCircle, Clock,
  AlertCircle, User, GraduationCap, X, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ImportArticlesDialog } from "@/components/admin/import-articles-dialog";
import { PreviaDoMaterial, type MaterialParaPrevia } from "@/components/admin/previa-do-material";
import { useLocale } from "@/hooks/use-locale";

interface Assignment {
  id: string;
  note: string | null;
  dueDate: string | null;
  frequency: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  content: { id: string; title: string; contentType: string; thumbnailUrl: string | null; duration: number | null };
  patient: { id: string; firstName: string; lastName: string; email: string };
  assignedBy: { firstName: string; lastName: string } | null;
}

/**
 * O item guarda o **material inteiro**, e nao so o titulo.
 *
 * A previa precisa do corpo, da capa e das duas linguas — e a rota ja mandava
 * tudo isso (`include` devolve a linha inteira). A tela jogava fora e ficava
 * com quatro campos, entao nao havia o que mostrar antes de enviar.
 */
interface ContentItem extends MaterialParaPrevia {
  id: string;
  title: string;
  contentType: string;
  isPublished: boolean;
}
interface PatientItem { id: string; firstName: string; lastName: string; email: string; }

export default function AssignmentsPage() {
  /**
   * As duas línguas, e o inglês primeiro (101 T-2).
   *
   * A tela era uma mistura: título "Assignments" em inglês, subtítulo em
   * português, botões em inglês, um botão em português, e o estado vazio
   * inteiro em português. O painel tem chave EN/PT e esta tela a ignorava — o
   * inglês é a língua primária da casa, e quem usa a clínica em inglês lia
   * frases soltas noutro idioma.
   */
  const { locale } = useLocale();
  const isPt = locale?.startsWith("pt");
  const T = (en: string, pt: string) => (isPt ? pt : en);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  /**
   * Trazer os artigos **daqui** (28/09/2026).
   *
   * O Bruno: *"eu quero vincular os artigos do site, pois já estão prontos…
   * não entendi como vou criar os Assignments"*. E não havia como entender:
   * esta tela só oferecia "Assign Content", e o seletor de material abria
   * **vazio** enquanto ninguém tivesse importado nada noutra tela.
   *
   * O passo que falta é o primeiro, então ele passa a caber aqui.
   */
  const [importarAberto, setImportarAberto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [contentId, setContentId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [frequency, setFrequency] = useState("once");
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [assRes, contRes, patRes] = await Promise.all([
        fetch("/api/admin/education/assignments"),
        /**
         * **Sem `?published=true`** (096, corrigido em 28/09/2026).
         *
         * O material que vem dos artigos do site nasce **restrito** — de
         * propósito: trazer para a clínica e mandar para um paciente são duas
         * decisões. Mas o filtro daqui só listava o publicado, então
         * **justamente o restrito era o que não dava para atribuir** — e
         * atribuir é a única forma de ele chegar a alguém.
         *
         * A lista agora traz tudo, e o item diz qual é qual.
         */
        fetch("/api/admin/education/content"),
        fetch("/api/patients"),
      ]);
      const assData = await assRes.json();
      const contData = await contRes.json();
      const patData = await patRes.json();
      setAssignments(assData.assignments || []);
      setContentList((contData.content || []) as ContentItem[]);
      setPatients((patData.patients || []).map((p: any) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email })));
    } catch { setError(T("Could not load the data.", "Não foi possível carregar os dados.")); }
    finally { setLoading(false); }
  };

  const createAssignment = async () => {
    if (!contentId || !patientId) { setError(T("Pick a material and a patient.", "Escolha um material e um paciente.")); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/education/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId, patientId,
          note: note || null,
          dueDate: dueDate || null,
          frequency,
          isRequired,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setDialogOpen(false);
        setContentId(""); setPatientId(""); setNote(""); setDueDate("");
        setSuccess(T("Material assigned.", "Material atribuído."));
        setTimeout(() => setSuccess(null), 3000);
        fetchAll();
      }
    } catch { setError(T("Could not assign it.", "Não foi possível atribuir.")); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" /> {T("Assignments", "Atribuições")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isPt ? (
              <>
                Dois passos: <strong>1)</strong> trazer o artigo do site para a clínica;{" "}
                <strong>2)</strong> atribuir a um paciente. Só o segundo faz o material aparecer
                no aplicativo dele.
              </>
            ) : (
              <>
                Two steps: <strong>1)</strong> bring the article from the site into the clinic;{" "}
                <strong>2)</strong> assign it to a patient. Only the second one makes it appear in
                their app.
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <Button variant="outline" className="gap-2" onClick={() => setImportarAberto(true)}>
          <FileText className="h-4 w-4" /> {T("Bring articles from the site", "Trazer artigos do site")}
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> {T("Assign material", "Atribuir material")}</Button>
          </DialogTrigger>
          {/* Duas colunas: as escolhas à esquerda, e **o que o paciente vai
              ler** à direita. A caixa era estreita e só tinha campos — dava
              para atribuir um artigo sem nunca ter visto o texto dele. */}
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>{T("Assign material to a patient", "Atribuir material a um paciente")}</DialogTitle></DialogHeader>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>{T("Material", "Material")}</Label>
                <Select value={contentId} onValueChange={setContentId}>
                  <SelectTrigger><SelectValue placeholder={T("Select a material", "Escolha um material")} /></SelectTrigger>
                  <SelectContent>
                    {contentList.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                        {/* Quem atribui precisa saber se aquele material já está
                            na biblioteca de todos ou se só chega por atribuição —
                            é a diferença entre lembrar alguém de algo público e
                            liberar algo para ele. */}
                        <span className="text-muted-foreground text-xs ml-2">
                          {c.isPublished ? T("· in the library", "· na biblioteca") : T("· assigned only", "· só atribuído")}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{T("Patient", "Paciente")}</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder={T("Select a patient", "Escolha um paciente")} /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{T("Frequency", "Frequência")}</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">{T("One-time", "Uma vez")}</SelectItem>
                    <SelectItem value="daily">{T("Daily", "Diária")}</SelectItem>
                    <SelectItem value="3x_week">{T("3x per week", "3x por semana")}</SelectItem>
                    <SelectItem value="weekly">{T("Weekly", "Semanal")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{T("Due date (optional)", "Prazo (opcional)")}</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{T("Note to the patient (optional)", "Observação ao paciente (opcional)")}</Label>
                <Textarea placeholder={T("Instructions or context for this material…", "Instruções ou contexto para este material…")} value={note} onChange={e => setNote(e.target.value)} rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="required" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="rounded" />
                <Label htmlFor="required" className="text-sm">{T("Mark as required", "Marcar como obrigatório")}</Label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {/* Sem material escolhido não há o que enviar, e o botão dizia
                  "Assign to Patient" o tempo todo — clicar dava um erro que a
                  tela já sabia de antemão. */}
              <Button
                className="w-full"
                onClick={createAssignment}
                disabled={creating || !contentId || !patientId}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {T("Assign to patient", "Atribuir ao paciente")}
              </Button>
            </div>

            <div className="mt-2 md:border-l md:pl-6">
              <PreviaDoMaterial
                material={contentList.find((c) => c.id === contentId) ?? null}
                note={note}
              />
            </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* O mesmo dialogo da tela de material, aqui: o passo que falta e o
          primeiro, entao ele precisa caber onde a pessoa esta. */}
      <ImportArticlesDialog
        open={importarAberto}
        onOpenChange={setImportarAberto}
        onImported={fetchAll}
      />

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            {/* A tela vazia agora sabe **qual** dos dois passos falta. Antes ela
                oferecia "Create First Assignment", e o seletor de material abria
                vazio — um botão que leva a um beco. */}
            {contentList.length === 0 ? (
              <>
                <p className="font-medium">{T("No material in the clinic yet", "Nenhum material na clínica ainda")}</p>
                <p className="text-sm text-muted-foreground">
                  {T(
                    "The articles on the site are already written. Bring in the ones that work as clinical material — then you choose who each one goes to.",
                    "Os artigos do site já estão escritos. Traga os que servirem como material clínico — depois você escolhe para quem cada um vai."
                  )}
                </p>
                <Button className="gap-2" onClick={() => setImportarAberto(true)}>
                  <FileText className="h-4 w-4" /> {T("Bring articles from the site", "Trazer artigos do site")}
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium">{T("No assignments yet", "Nenhuma atribuição ainda")}</p>
                <p className="text-sm text-muted-foreground">
                  {T(
                    `You have ${contentList.length} material(s) in the clinic. Pick one and say who it goes to — that is what makes it appear in the patient's app.`,
                    `Você tem ${contentList.length} material(is) na clínica. Escolha um e diga para quem ele vai — é isso que o faz aparecer no aplicativo do paciente.`
                  )}
                </p>
                <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> {T("Assign to a patient", "Atribuir a um paciente")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <Card key={a.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.isCompleted ? "bg-green-100" : "bg-blue-100"}`}>
                    {a.isCompleted ? <CheckCircle className="h-5 w-5 text-green-600" /> : <GraduationCap className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{a.content.title}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{a.content.contentType}</Badge>
                      {a.isRequired && <Badge className="text-[10px] bg-red-100 text-red-700">{T("Required", "Obrigatório")}</Badge>}
                      {a.isCompleted && <Badge className="text-[10px] bg-green-100 text-green-700">{T("Completed", "Concluído")}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{a.patient.firstName} {a.patient.lastName}</span>
                      {a.frequency && a.frequency !== "once" && (
                        <Badge variant="outline" className="text-[10px] capitalize">{a.frequency.replace("_", " ")}</Badge>
                      )}
                      {a.dueDate && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {T("Due", "Prazo")} {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    {a.note && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">{a.note}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
