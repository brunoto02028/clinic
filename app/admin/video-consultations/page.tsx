"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  BellRing,
  Plus,
  Phone,
  Calendar,
  Clock,
  Users,
  Loader2,
  ExternalLink,
  VideoOff,
  AlertCircle,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
import { t as i18nT } from "@/lib/i18n";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface VideoAppointment {
  id: string;
  dateTime: string;
  duration: number;
  treatmentType: string;
  status: string;
  mode: string;
  videoRoomUrl: string | null;
  notes: string | null;
  patient: { id: string; firstName: string; lastName: string; email: string };
  therapist: { id: string; firstName: string; lastName: string };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300",
  CONFIRMED: "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300",
  COMPLETED: "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
  CANCELLED: "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300",
  NO_SHOW: "bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-300",
};

export default function VideoConsultationsPage() {
  const { locale } = useLocale();
  const { relabel } = useVocab();
  const T = (key: string) => relabel(i18nT(key, locale));
  const [appointments, setAppointments] = useState<VideoAppointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    dateTime: "",
    duration: 30,
    treatmentType: "Video Consultation",
    notes: "",
  });
  const { toast } = useToast();

  /**
   * "Testar agora": o mesmo agendamento, com a hora já preenchida (095 T-2).
   *
   * O Bruno não achou onde testar a videochamada. A tela sabia agendar desde o
   * começo — o que faltava era um caminho que não exigisse escolher data, hora
   * e duração só para ver a sala abrir.
   *
   * **O paciente continua sendo escolhido por você.** Criar um paciente de
   * teste por botão encheria a lista de gente que não existe, e a regra da casa
   * é que QA usa paciente de teste **identificado** — quem identifica é quem
   * sabe qual é.
   *
   * Cinco minutos à frente porque a sala abre dez minutos antes: assim ela já
   * está aberta quando a tela recarregar.
   */
  const agendarTeste = () => {
    const daqui = new Date(Date.now() + 5 * 60000);
    const local = new Date(daqui.getTime() - daqui.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setForm((f) => ({
      ...f,
      dateTime: local,
      duration: 30,
      /**
       * Um tipo que **existe na lista** (QA da 095, T-2).
       *
       * Eu punha `"TEST — video call"`, que não casa com nenhum `SelectItem` —
       * então o campo Tipo aparecia **em branco**. O valor sobrevivia no estado
       * e a consulta nascia com ele, mas um campo vazio convida a pessoa a
       * tocar no seletor, e aí a marca de teste se perdia.
       *
       * A marca vai na observação, que é texto livre e ninguém precisa tocar.
       */
      treatmentType: "Video Consultation",
      notes: "TEST — consulta de teste. Apague depois.",
    }));
    setShowDialog(true);
  };

  useEffect(() => {
    fetchVideoAppointments();
    fetchPatients();
    fetchTreatmentTypes();
  }, []);

  const fetchVideoAppointments = async () => {
    try {
      const res = await fetch("/api/admin/appointments?mode=VIDEO");
      if (res.ok) {
        const data = await res.json();
        const videoAppts = Array.isArray(data) ? data.filter((a: any) => a.mode === "VIDEO") : [];
        setAppointments(videoAppts);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load video consultations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/admin/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : data.patients || []);
      }
    } catch {}
  };

  const fetchTreatmentTypes = async () => {
    try {
      const res = await fetch("/api/admin/treatment-types");
      if (res.ok) setTreatmentTypes(await res.json());
    } catch {}
  };

  const handleCreate = async () => {
    if (!form.patientId || !form.dateTime) {
      toast({ title: "Error", description: "Patient and date/time are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mode: "VIDEO",
          // Sem `videoRoomId`/`videoRoomUrl`: a sala nasce no servidor, na
          // primeira vez que alguem pede para entrar. Inventar um id aqui
          // criava um endereco que nao correspondia a sala nenhuma.
          price: 0,
        }),
      });
      if (res.ok) {
        toast({ title: "Created", description: "Video consultation scheduled" });
        setShowDialog(false);
        fetchVideoAppointments();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to create", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to schedule consultation", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Entrar pela pagina da sala, e nao pela URL gravada.
   *
   * Isto fazia `window.open(appointment.videoRoomUrl)`, e o valor gravado era
   * `/video-room/<id aleatorio>` — uma pagina que **nao existia**. O clique
   * abria 404, e nenhuma sala tinha sido criada em lugar nenhum.
   *
   * A sala e privada: a URL dela sozinha nao abre nada. Quem entra precisa de um
   * token nosso, preso a esta pessoa e a janela do horario, e quem o emite e o
   * servidor — por isso o caminho e a pagina, que pede o token, e nao o link.
   */
  /**
   * Chamar o paciente — a metade da videochamada que não existia.
   *
   * O terapeuta conseguia entrar na sala e esperar, e **nada avisava o
   * paciente**. Se ele não estivesse com o app aberto naquele minuto, a consulta
   * não acontecia.
   *
   * É botão e não automático ao entrar, de propósito: abrir a sala cedo para
   * testar o microfone faria o telefone do paciente tocar sem ninguém ter
   * decidido. E a resposta diz **quantos aparelhos tocaram** — zero é notícia,
   * não erro: quer dizer que ele não tem o app ou desligou os avisos, e o
   * terapeuta precisa saber disso antes de esperar dez minutos.
   */
  const [chamando, setChamando] = useState<string | null>(null);

  /**
   * Quem está olhando a tela.
   *
   * A lista traz as consultas por vídeo da **clínica inteira**, e entrar numa
   * sala não é permissão administrativa: são duas pessoas na consulta, e quem é
   * atendido tem direito de saber quem entrou. Quem decide isso é o servidor;
   * aqui só se evita oferecer um botão que ele vai recusar.
   */
  const { data: sessao } = useSession();
  const meuId = (sessao?.user as any)?.id as string | undefined;

  const chamarPaciente = async (appointment: VideoAppointment) => {
    setChamando(appointment.id);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/video/call`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: relabel("Could not call"),
          description: data.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      toast(
        data.aparelhos > 0
          ? {
              title: relabel("Patient called"),
              description: relabel(
                `Their phone is ringing on ${data.aparelhos} device${data.aparelhos > 1 ? "s" : ""}.`
              ),
            }
          : data.falhas > 0
            ? {
                // `falhas > 0` com `aparelhos: 0` é envio que não saiu — não é
                // um fato sobre o paciente (achado 4 do QA da T-8).
                title: relabel("The call did not go out"),
                description: relabel(
                  "The patient has a device, but the send failed. Try again, and reach them another way if it persists."
                ),
                variant: "destructive" as const,
              }
          : {
              // Sem aparelho não é falha da chamada: é um fato sobre o paciente, e
              // o terapeuta tem de saber para avisar por outro caminho.
              title: relabel("Nobody to ring"),
              description: relabel(
                "This patient has no device registered, or has notifications off. Reach them another way."
              ),
              variant: "destructive",
            }
      );
    } catch {
      toast({ title: relabel("Could not call"), description: relabel("Try again."), variant: "destructive" });
    } finally {
      setChamando(null);
    }
  };

  const startCall = (appointment: VideoAppointment) => {
    window.open(`/video-room/${appointment.id}`, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{T("admin.videoConsultTitle")}</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  /**
   * "Upcoming" passa a significar **a janela ainda aberta**, e não "hoje".
   *
   * O QA de 27/09/2026 viu o painel oferecer "Join Video Call" numa consulta das
   * 16:35 cuja janela fechou às 17:05 — o botão ativo, e o clique levando a
   * "esta consulta já terminou". O servidor recusava certo; era a tela prometendo
   * o que não entrega.
   *
   * A mesma folga do servidor (`FOLGA_DEPOIS_MIN`), para as duas pontas
   * concordarem sobre quando uma consulta deixa de estar por vir.
   */
  const FIM_COM_FOLGA_MIN = 30;
  const aindaPorVir = (a: VideoAppointment) => {
    const fim = new Date(a.dateTime).getTime() + ((a.duration ?? 60) + FIM_COM_FOLGA_MIN) * 60_000;
    return Date.now() <= fim;
  };
  const upcoming = appointments.filter(
    (a) => ["PENDING", "CONFIRMED"].includes(a.status) && aindaPorVir(a)
  );
  /**
   * "Passadas" é **tudo o que não está por vir** — e não uma lista de status.
   *
   * Era `["COMPLETED", "CANCELLED", "NO_SHOW"]`, e uma consulta `CONFIRMED` de
   * ontem não cai em nenhum dos dois: sumia da tela inteira. Só o contador
   * "Total" sabia dela, então os números não fechavam com o que se via, e a
   * consulta que não aconteceu — a que mais precisa ser olhada — era justamente
   * a invisível.
   */
  const past = appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" /> {T("admin.videoConsultTitle")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{T("admin.videoConsultDesc")}</p>
        </div>
        <div className="flex gap-2">
          {/* "Testar agora" **fora** do estado vazio (QA da 095, T-2).
              O botão morava dentro da lista vazia: bastava existir uma consulta
              por vídeo para ele sumir — e o roteiro de teste é justamente o que
              alguém abre quando quer testar **de novo**. */}
          <Button variant="outline" onClick={agendarTeste} className="gap-2">
            <Video className="h-4 w-4" /> {relabel("Test it now")}
          </Button>
          <Button onClick={() => { setForm({ patientId: "", dateTime: "", duration: 30, treatmentType: "Video Consultation", notes: "" }); setShowDialog(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Schedule Call
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-primary">{upcoming.length}</p><p className="text-xs text-muted-foreground">Upcoming</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{past.filter(a => a.status === "COMPLETED").length}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{appointments.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Upcoming Consultations</h2>
        {upcoming.length === 0 ? (
          <Card>
            {/* Uma lista vazia não ensina nada, e esta tela só tem conteúdo
                depois que alguém já soube marcar por vídeo — foi por isso que a
                videochamada pareceu não existir (095 T-2). */}
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
              <VideoOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No upcoming video consultations</h3>
              <p className="text-sm text-muted-foreground mb-5 text-center max-w-md">
                {relabel(
                  "There are two ways in: schedule one here, or open an appointment you already have in the agenda and change its format to Remote."
                )}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={() => setShowDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Schedule Call
                </Button>
                <Button variant="outline" onClick={agendarTeste} className="gap-2">
                  <Video className="h-4 w-4" /> {relabel("Test it now")}
                </Button>
                <Button variant="outline" asChild className="gap-2">
                  <a href="/admin/appointments">
                    <Calendar className="h-4 w-4" /> {relabel("Open the agenda")}
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-5 text-center max-w-md">
                {relabel(
                  "The room opens ten minutes before the time and closes thirty after. The patient joins from the app; you join from here or from the agenda, and \"Call patient\" rings their phone."
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((apt) => (
              <Card key={apt.id} className="group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" />
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{apt.treatmentType}</p>
                    </div>
                    <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(apt.dateTime).toLocaleDateString("en-GB")}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(apt.dateTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>{apt.duration} min</span>
                  </div>
                  {/* Os dois botões só para quem atende — e, para quem não
                      atende, o nome de quem atende no lugar deles.

                      A agenda já fazia isto (achado 5 do QA da 089 T-8); esta
                      tela ficou para trás, e é a tela cujo nome é "consultas por
                      vídeo": os botões apareciam em todas as consultas da
                      clínica, e o servidor recusava com 404 — "esta consulta não
                      está disponível" — para uma consulta visível ali na frente.
                      Parece defeito, e é permissão. */}
                  {apt.therapist?.id === meuId ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1 flex-1" onClick={() => startCall(apt)}>
                        <Phone className="h-3.5 w-3.5" /> Join Video Call
                      </Button>
                      {/* Chamar vem ao lado de entrar, e não no lugar: são duas
                          coisas, e o terapeuta costuma fazer as duas — entra, vê
                          que está sozinho, chama. */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={chamando === apt.id}
                        onClick={() => chamarPaciente(apt)}
                      >
                        <BellRing className="h-3.5 w-3.5" />
                        {chamando === apt.id ? relabel("Calling...") : relabel("Call patient")}
                      </Button>
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {relabel(
                        `${apt.therapist?.firstName ?? ""} ${apt.therapist?.lastName ?? ""}`.trim()
                          ? `${apt.therapist.firstName} ${apt.therapist.lastName} is seeing this patient — only they can join.`
                          : "Another therapist is seeing this patient — only they can join."
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Past Consultations</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {past.map((apt) => (
              <Card key={apt.id} className="opacity-75">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">{apt.patient.firstName} {apt.patient.lastName}</p>
                    <Badge className={statusColors[apt.status]} variant="outline">{apt.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(apt.dateTime).toLocaleDateString("en-GB")} — {apt.treatmentType}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Video Consultation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{relabel("Patient")} *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder={relabel("Select patient...")} /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 30 })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.treatmentType} onValueChange={(v) => setForm({ ...form, treatmentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video Consultation">Video Consultation</SelectItem>
                    <SelectItem value="Follow-up Video Call">Follow-up Video Call</SelectItem>
                    {treatmentTypes.map((tt: any) => (
                      <SelectItem key={tt.id} value={tt.name}>{tt.name} (Video)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
