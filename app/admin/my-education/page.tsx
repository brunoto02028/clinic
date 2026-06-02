"use client";

import { useState, useEffect, useRef } from "react";
import {
  GraduationCap, Award, Plus, Trash2, Edit2, Loader2, MessageSquare,
  Send, Bot, Calendar, Clock, MapPin, ExternalLink, BookOpen, Sparkles,
  CheckCircle, BookmarkPlus, X, Upload, Camera, FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Qualification {
  id: string;
  title: string;
  provider: string;
  providerUrl: string | null;
  certificateNumber: string | null;
  dateAchieved: string | null;
  cpdHours: number | null;
  level: string | null;
  category: string;
  accreditation: string | null;
  tutor: string | null;
  location: string | null;
  description: string | null;
  certificateUrl: string | null;
  status: string;
  notes: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUAL_CATEGORIES = [
  { value: "degree", label: "Degree / Academic" },
  { value: "electrotherapy", label: "Electrotherapy" },
  { value: "dry_needling", label: "Dry Needling / Acupuncture" },
  { value: "manual_therapy", label: "Manual Therapy" },
  { value: "shockwave_therapy", label: "Shockwave Therapy" },
  { value: "laser_therapy", label: "Laser Therapy" },
  { value: "sports_rehabilitation", label: "Sports Rehabilitation" },
  { value: "biomechanics", label: "Biomechanics" },
  { value: "injection_therapy", label: "Injection Therapy" },
  { value: "pain_management", label: "Pain Management" },
  { value: "clinical_pilates", label: "Clinical Pilates" },
  { value: "business", label: "Business & Leadership" },
  { value: "general_cpd", label: "General CPD" },
];

export default function MyEducationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"qualifications" | "advisor">("qualifications");
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "", provider: "", providerUrl: "", certificateNumber: "",
    dateAchieved: "", cpdHours: "", level: "", category: "general_cpd",
    accreditation: "", tutor: "", location: "", description: "", status: "completed", notes: "",
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchQualifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/qualifications");
      const data = await res.json();
      if (res.ok) setQualifications(data.qualifications || []);
    } catch (err) {
      console.error("Failed to fetch qualifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQualifications(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Seed qualifications if empty
  useEffect(() => {
    if (!loading && qualifications.length === 0) {
      fetch("/api/admin/qualifications/seed", { method: "POST" })
        .then((r) => r.json())
        .then((data) => { if (data.success) fetchQualifications(); });
    }
  }, [loading, qualifications.length]);

  const resetForm = () => {
    setFormData({
      title: "", provider: "", providerUrl: "", certificateNumber: "",
      dateAchieved: "", cpdHours: "", level: "", category: "general_cpd",
      accreditation: "", tutor: "", location: "", description: "", status: "completed", notes: "",
    });
    setEditingId(null);
    setShowForm(false);
    setPreviewImage(null);
  };

  const handleCertificateUpload = async (file: File) => {
    setOcrLoading(true);
    try {
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target?.result as string);
      reader.readAsDataURL(file);

      const formDataUpload = new FormData();
      formDataUpload.append("image", file);

      const res = await fetch("/api/admin/qualifications/ocr", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const ext = data.extracted;
      setFormData((prev) => ({
        ...prev,
        title: ext.title || prev.title,
        provider: ext.provider || prev.provider,
        providerUrl: ext.providerUrl || prev.providerUrl,
        certificateNumber: ext.certificateNumber || prev.certificateNumber,
        dateAchieved: ext.dateAchieved || prev.dateAchieved,
        cpdHours: ext.cpdHours?.toString() || prev.cpdHours,
        level: ext.level || prev.level,
        category: ext.category || prev.category,
        accreditation: ext.accreditation || prev.accreditation,
        tutor: ext.tutor || prev.tutor,
        location: ext.location || prev.location,
        description: ext.description || prev.description,
      }));

      toast({ title: "Certificate scanned!", description: `Extracted: ${ext.title || "data from image"}` });
    } catch (err: any) {
      toast({ title: "OCR failed", description: err.message, variant: "destructive" });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.provider) {
      toast({ title: "Title and Provider are required", variant: "destructive" });
      return;
    }

    try {
      const url = editingId ? `/api/admin/qualifications/${editingId}` : "/api/admin/qualifications";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast({ title: editingId ? "Qualification updated" : "Qualification added" });
        resetForm();
        fetchQualifications();
      }
    } catch (err: any) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const editQualification = (q: Qualification) => {
    setFormData({
      title: q.title, provider: q.provider, providerUrl: q.providerUrl || "",
      certificateNumber: q.certificateNumber || "", dateAchieved: q.dateAchieved ? q.dateAchieved.split("T")[0] : "",
      cpdHours: q.cpdHours?.toString() || "", level: q.level || "", category: q.category,
      accreditation: q.accreditation || "", tutor: q.tutor || "", location: q.location || "",
      description: q.description || "", status: q.status, notes: q.notes || "",
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const deleteQualification = async (id: string) => {
    try {
      await fetch(`/api/admin/qualifications/${id}`, { method: "DELETE" });
      setQualifications((prev) => prev.filter((q) => q.id !== id));
      toast({ title: "Qualification removed" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/admin/qualifications/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setChatMessages([...newMessages, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const totalCPD = qualifications.reduce((sum, q) => sum + (q.cpdHours || 0), 0);
  const completedCount = qualifications.filter((q) => q.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
            My Education & Career
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your qualifications portfolio and AI career advisor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 gap-1">
            <Award className="h-3.5 w-3.5" /> {completedCount} Qualifications
          </Badge>
          <Badge variant="outline" className="px-3 py-1 gap-1">
            <Clock className="h-3.5 w-3.5" /> {totalCPD} CPD Hours
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "qualifications" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("qualifications")}
          className="gap-2"
        >
          <Award className="h-4 w-4" /> My Qualifications
        </Button>
        <Button
          variant={activeTab === "advisor" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("advisor")}
          className="gap-2"
        >
          <Bot className="h-4 w-4" /> AI Career Advisor
        </Button>
      </div>

      {/* Qualifications Tab */}
      {activeTab === "qualifications" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Track your certifications, CPD courses, and qualifications.
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2" size="sm">
              <Plus className="h-4 w-4" /> Add Qualification
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-3">
              {qualifications.map((q) => (
                <Card key={q.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="secondary" className={
                            q.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : q.status === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }>
                            {q.status === "completed" ? <CheckCircle className="h-3 w-3 mr-1" /> : <BookmarkPlus className="h-3 w-3 mr-1" />}
                            {q.status}
                          </Badge>
                          {q.level && <Badge variant="outline" className="text-xs">{q.level}</Badge>}
                          {q.cpdHours && <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> {q.cpdHours} hrs</Badge>}
                        </div>
                        <h3 className="font-semibold text-base">{q.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{q.provider}</span>
                          {q.providerUrl && (
                            <a href={q.providerUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editQualification(q)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteQualification(q.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {q.dateAchieved && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(q.dateAchieved).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      )}
                      {q.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {q.location}</span>
                      )}
                      {q.tutor && (
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {q.tutor}</span>
                      )}
                      {q.accreditation && (
                        <span className="flex items-center gap-1"><Award className="h-3 w-3" /> {q.accreditation}</span>
                      )}
                      {q.certificateNumber && (
                        <span className="text-xs">Cert: #{q.certificateNumber}</span>
                      )}
                    </div>

                    {q.description && (
                      <p className="text-sm mt-2 text-foreground/70">{q.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Career Advisor Tab */}
      {activeTab === "advisor" && (
        <div className="space-y-4">
          <Card className="border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <h2 className="font-semibold text-foreground">AI Career & Education Advisor</h2>
              </div>
              <p className="text-sm text-foreground/70">
                Specialist in UK healthcare, physiotherapy, and rehabilitation. Knows your qualifications, equipment, and practice. Ask about next steps, licensing, career pathways, or specific courses.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  "What should I study next?",
                  "How can I get HCPC registered?",
                  "What new services can I offer?",
                  "Injection therapy pathway?",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 border-indigo-300 dark:border-indigo-600 text-foreground hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                    onClick={() => { setChatInput(suggestion); }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat area */}
          <Card className="min-h-[400px] max-h-[600px] flex flex-col border-border">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Sparkles className="h-10 w-10 mb-3 text-indigo-400 dark:text-indigo-300" />
                  <p className="font-medium text-foreground">Start a conversation with your Career Advisor</p>
                  <p className="text-sm mt-1 text-foreground/60">Ask about qualifications, career paths, or next steps for your practice.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-muted"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </CardContent>

            {/* Input */}
            <div className="border-t p-3 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ask about your career, next qualifications, licensing..."
                disabled={chatLoading}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()} size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add/Edit Qualification Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              {editingId ? "Edit Qualification" : "Add Qualification"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Certificate Upload with OCR */}
            <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleCertificateUpload(e.target.files[0]); }}
              />
              {previewImage ? (
                <div className="space-y-2">
                  <img src={previewImage} alt="Certificate" className="max-h-32 mx-auto rounded" />
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Data extracted from image</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="h-8 w-8 mx-auto text-indigo-400" />
                  <p className="text-sm font-medium text-foreground">Upload Certificate Photo</p>
                  <p className="text-xs text-foreground/60">AI will auto-read and fill all fields</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
              >
                {ocrLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {ocrLoading ? "Scanning..." : previewImage ? "Upload Another" : "Choose Image"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Title *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Dry Needling Foundation" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Provider *</Label>
                <Input value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} placeholder="e.g. Core Elements Training" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Provider URL</Label>
                <Input value={formData.providerUrl} onChange={(e) => setFormData({ ...formData, providerUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date Achieved</Label>
                <Input type="date" value={formData.dateAchieved} onChange={(e) => setFormData({ ...formData, dateAchieved: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPD Hours</Label>
                <Input type="number" value={formData.cpdHours} onChange={(e) => setFormData({ ...formData, cpdHours: e.target.value })} placeholder="e.g. 16" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUAL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Level</Label>
                <Input value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} placeholder="e.g. Foundation, Level 7" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Certificate Number</Label>
                <Input value={formData.certificateNumber} onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })} placeholder="e.g. 09202509" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Accreditation</Label>
                <Input value={formData.accreditation} onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })} placeholder="e.g. STO + FHT" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tutor</Label>
                <Input value={formData.tutor} onChange={(e) => setFormData({ ...formData, tutor: e.target.value })} placeholder="e.g. Dawn Morse MSc" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Swindon, Wiltshire" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Brief description..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Personal notes..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {editingId ? "Update" : "Add Qualification"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
