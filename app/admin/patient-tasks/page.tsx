"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Bell, Send, CheckCircle2, Clock, AlertTriangle,
  User, FileText, Mic, Shield, CreditCard, CalendarCheck,
  Loader2, Plus, Filter,
} from "lucide-react";

const TASK_TYPES = [
  { value: "CUSTOM", label: "Custom Message", icon: Bell },
  { value: "UPLOAD_DOCUMENT", label: "Upload Document", icon: FileText },
  { value: "COMPLETE_SCREENING", label: "Complete Screening", icon: Shield },
  { value: "RECORD_AUDIO", label: "Record Pre-Consultation", icon: Mic },
  { value: "SIGN_CONSENT", label: "Sign Consent", icon: FileText },
  { value: "UPDATE_PROFILE", label: "Update Profile", icon: User },
  { value: "CONFIRM_APPOINTMENT", label: "Confirm Appointment", icon: CalendarCheck },
  { value: "PAY_INVOICE", label: "Pay Invoice", icon: CreditCard },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-gray-400 text-white",
};

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", label: "Pending" },
  in_progress: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", label: "In Progress" },
  completed: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Completed" },
  cancelled: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300", label: "Cancelled" },
};

export default function PatientTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("CUSTOM");
  const [title, setTitle] = useState("");
  const [titlePt, setTitlePt] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionPt, setDescriptionPt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  // Patient search
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/patient-tasks?status=${filterStatus}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      toast({ title: "Failed to load tasks", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [filterStatus]);

  // Search patients
  const searchPatients = async (q: string) => {
    setPatientSearch(q);
    if (q.length < 2) { setPatientResults([]); return; }
    try {
      const res = await fetch(`/api/admin/patients?search=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setPatientResults(data.patients || []);
    } catch {}
  };

  const selectPatient = (p: any) => {
    setSelectedPatient(p);
    setPatientId(p.id);
    setPatientSearch(`${p.firstName} ${p.lastName}`);
    setPatientResults([]);
  };

  const handleSubmit = async () => {
    if (!patientId || !title) {
      toast({ title: "Patient and title are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/patient-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          type,
          title,
          titlePt: titlePt || undefined,
          description: description || undefined,
          descriptionPt: descriptionPt || undefined,
          priority,
          dueDate: dueDate || undefined,
          actionUrl: actionUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Task sent!",
        description: data.emailSent ? "Patient notified via email" : "Task created (email may have failed)",
      });

      // Reset form
      setShowForm(false);
      setPatientId("");
      setSelectedPatient(null);
      setPatientSearch("");
      setType("CUSTOM");
      setTitle("");
      setTitlePt("");
      setDescription("");
      setDescriptionPt("");
      setPriority("normal");
      setDueDate("");
      setActionUrl("");
      fetchTasks();
    } catch (err: any) {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-violet-500" />
            Patient Action Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send tasks and action requests to patients. They will be notified in-app and by email.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      {/* New Task Form */}
      {showForm && (
        <Card className="border-violet-400/30 dark:border-violet-400/30 bg-violet-50 dark:bg-violet-900/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Send className="h-5 w-5 text-violet-500" />
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">New Action Request</h2>
            </div>

            {/* Patient search */}
            <div className="space-y-1 relative">
              <Label className="text-xs font-medium text-gray-800 dark:text-white">Patient *</Label>
              <Input
                placeholder="Search patient by name or email..."
                value={patientSearch}
                onChange={(e) => searchPatients(e.target.value)}
              />
              {patientResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPatient(p)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      <span className="text-muted-foreground text-xs ml-auto">{p.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedPatient && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Selected: {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.email})
                </p>
              )}
            </div>

            {/* Type + Priority row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-800 dark:text-white">Task Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-800 dark:text-white">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-800 dark:text-white">Due Date (optional)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            {/* Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-800 dark:text-white">Title (English) *</Label>
                <Input placeholder="e.g. Please upload your ID document" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-800 dark:text-white">Titulo (Portugues)</Label>
                <Input placeholder="e.g. Por favor envie seu documento" value={titlePt} onChange={(e) => setTitlePt(e.target.value)} />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-800 dark:text-white">Description (English)</Label>
                <Textarea placeholder="Additional details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-800 dark:text-white">Descricao (Portugues)</Label>
                <Textarea placeholder="Detalhes adicionais..." value={descriptionPt} onChange={(e) => setDescriptionPt(e.target.value)} rows={3} />
              </div>
            </div>

            {/* Action URL */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-800 dark:text-white">Action URL (optional — where should patient go?)</Label>
              <Input placeholder="e.g. /dashboard/recordings or /dashboard/profile" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} />
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send to Patient
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{tasks.length} tasks</span>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No tasks found. Create one to request action from a patient.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const statusBadge = STATUS_BADGES[task.status] || STATUS_BADGES.pending;
            const typeConfig = TASK_TYPES.find((t) => t.value === task.type);
            const TypeIcon = typeConfig?.icon || Bell;

            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                        <TypeIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{task.title}</h3>
                          <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.patient?.firstName} {task.patient?.lastName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.createdAt).toLocaleDateString("en-GB")}
                          </span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              Due: {new Date(task.dueDate).toLocaleDateString("en-GB")}
                            </span>
                          )}
                          {task.emailSent && (
                            <span className="text-green-600 dark:text-green-400">Email sent</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                      {task.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
