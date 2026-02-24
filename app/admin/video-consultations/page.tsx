"use client";

import { useState, useEffect } from "react";
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
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-gray-100 text-gray-800",
};

export default function VideoConsultationsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
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

  const generateRoomId = () => {
    return `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  };

  const handleCreate = async () => {
    if (!form.patientId || !form.dateTime) {
      toast({ title: "Error", description: "Patient and date/time are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const roomId = generateRoomId();
      const videoRoomUrl = `/video-room/${roomId}`;
      
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mode: "VIDEO",
          videoRoomId: roomId,
          videoRoomUrl,
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

  const startCall = (appointment: VideoAppointment) => {
    if (appointment.videoRoomUrl) {
      window.open(appointment.videoRoomUrl, "_blank");
    } else {
      toast({ title: "No Room", description: "Video room not configured for this appointment", variant: "destructive" });
    }
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

  const upcoming = appointments.filter((a) => ["PENDING", "CONFIRMED"].includes(a.status));
  const past = appointments.filter((a) => ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" /> {T("admin.videoConsultTitle")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{T("admin.videoConsultDesc")}</p>
        </div>
        <Button onClick={() => { setForm({ patientId: "", dateTime: "", duration: 30, treatmentType: "Video Consultation", notes: "" }); setShowDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Schedule Call
        </Button>
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
            <CardContent className="flex flex-col items-center justify-center py-12">
              <VideoOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No upcoming video consultations</h3>
              <p className="text-sm text-muted-foreground mb-4">Schedule a video call with a patient</p>
              <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Schedule Call</Button>
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
                  <Button size="sm" className="gap-1 w-full" onClick={() => startCall(apt)}>
                    <Phone className="h-3.5 w-3.5" /> Join Video Call
                  </Button>
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
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
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
