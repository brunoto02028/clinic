"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck, Plus, Loader2, CheckCircle, Clock,
  AlertCircle, User, GraduationCap, X,
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

interface ContentItem { id: string; title: string; contentType: string; }
interface PatientItem { id: string; firstName: string; lastName: string; email: string; }

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
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
        fetch("/api/admin/education/content?published=true"),
        fetch("/api/patients"),
      ]);
      const assData = await assRes.json();
      const contData = await contRes.json();
      const patData = await patRes.json();
      setAssignments(assData.assignments || []);
      setContentList((contData.content || []).map((c: any) => ({ id: c.id, title: c.title, contentType: c.contentType })));
      setPatients((patData.patients || []).map((p: any) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email })));
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  const createAssignment = async () => {
    if (!contentId || !patientId) { setError("Content and patient are required"); return; }
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
        setSuccess("Assignment created!");
        setTimeout(() => setSuccess(null), 3000);
        fetchAll();
      }
    } catch { setError("Failed to create"); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" /> Assignments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Assign educational content to patients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Assign Content</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Content to Patient</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Content</Label>
                <Select value={contentId} onValueChange={setContentId}>
                  <SelectTrigger><SelectValue placeholder="Select content" /></SelectTrigger>
                  <SelectContent>
                    {contentList.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="3x_week">3x per week</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date (optional)</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Note to Patient (optional)</Label>
                <Textarea placeholder="Instructions or context for this assignment..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="required" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="rounded" />
                <Label htmlFor="required" className="text-sm">Mark as required</Label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" onClick={createAssignment} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Assign to Patient
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            <p className="font-medium">No assignments yet</p>
            <p className="text-sm text-muted-foreground">Assign educational content to help patients with home treatment</p>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Create First Assignment
            </Button>
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
                      {a.isRequired && <Badge className="text-[10px] bg-red-100 text-red-700">Required</Badge>}
                      {a.isCompleted && <Badge className="text-[10px] bg-green-100 text-green-700">Completed</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{a.patient.firstName} {a.patient.lastName}</span>
                      {a.frequency && a.frequency !== "once" && (
                        <Badge variant="outline" className="text-[10px] capitalize">{a.frequency.replace("_", " ")}</Badge>
                      )}
                      {a.dueDate && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> Due {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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
