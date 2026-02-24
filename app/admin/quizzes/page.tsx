"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import {
  Plus, Trash2, Edit2, Loader2, Search, Sparkles, Eye, EyeOff,
  ChevronDown, ChevronUp, HelpCircle, CheckCircle2, BookOpen,
  Send, MessageSquare, Bot, UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const QUIZ_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "condition_specific", label: "Condition-Specific" },
  { value: "treatment", label: "Treatment" },
  { value: "prevention", label: "Prevention" },
  { value: "lifestyle", label: "Lifestyle" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

interface QuizQuestion {
  id?: string;
  questionEn: string;
  questionPt: string;
  options: { en: string; pt: string; isCorrect: boolean }[];
  explanationEn?: string;
  explanationPt?: string;
}

interface Quiz {
  id: string;
  titleEn: string;
  titlePt: string;
  descriptionEn?: string;
  descriptionPt?: string;
  category: string;
  difficulty: string;
  xpReward: number;
  iconEmoji?: string;
  isActive: boolean;
  isPublished: boolean;
  condition?: { id: string; nameEn: string; namePt: string; iconEmoji?: string };
  _count: { questions: number; attempts: number };
  questions?: QuizQuestion[];
}

interface Condition {
  id: string;
  nameEn: string;
  namePt: string;
  iconEmoji?: string;
  descriptionEn?: string;
}

export default function QuizzesPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const { toast } = useToast();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    titleEn: "", titlePt: "", descriptionEn: "", descriptionPt: "",
    conditionId: "", category: "general", difficulty: "beginner",
    xpReward: 25, iconEmoji: "", isPublished: false,
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, cRes] = await Promise.all([
        fetch("/api/admin/quizzes"),
        fetch("/api/admin/conditions"),
      ]);
      const qData = await qRes.json();
      const cData = await cRes.json();
      setQuizzes(qData.quizzes || []);
      setConditions(cData.conditions || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingQuiz(null);
    setForm({ titleEn: "", titlePt: "", descriptionEn: "", descriptionPt: "", conditionId: "", category: "general", difficulty: "beginner", xpReward: 25, iconEmoji: "", isPublished: false });
    setQuestions([]);
    setShowChat(false);
    setChatMessages([]);
    setChatInput("");
    setShowDialog(true);
  };

  const openEdit = async (q: Quiz) => {
    // Fetch full quiz with questions
    const res = await fetch(`/api/admin/quizzes`);
    const data = await res.json();
    const full = data.quizzes?.find((quiz: any) => quiz.id === q.id);

    setEditingQuiz(q);
    setForm({
      titleEn: q.titleEn, titlePt: q.titlePt,
      descriptionEn: q.descriptionEn || "", descriptionPt: q.descriptionPt || "",
      conditionId: q.condition?.id || "", category: q.category, difficulty: q.difficulty,
      xpReward: q.xpReward, iconEmoji: q.iconEmoji || "", isPublished: q.isPublished,
    });
    // We need to fetch questions separately if not included
    if (full?.questions) {
      setQuestions(full.questions.map((qq: any) => ({
        id: qq.id,
        questionEn: qq.questionEn, questionPt: qq.questionPt,
        options: qq.options,
        explanationEn: qq.explanationEn || "", explanationPt: qq.explanationPt || "",
      })));
    } else {
      setQuestions([]);
    }
    setShowDialog(true);
  };

  const sendChatMessage = async (userMsg?: string) => {
    const msg = userMsg || chatInput.trim();
    if (!msg) return;
    const newMessages = [...chatMessages, { role: "user" as const, content: msg }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const cond = conditions.find((c) => c.id === form.conditionId);
      const res = await fetch("/api/admin/quizzes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          conditionName: cond?.nameEn || form.titleEn || "",
          conditionDescription: cond?.descriptionEn || "",
          currentForm: { ...form, questionCount: questions.length },
        }),
      });
      const data = await res.json();
      if (data.reply) {
        const reply = data.reply;
        setChatMessages([...newMessages, { role: "assistant", content: reply }]);

        // Extract JSON if present (AI filled the quiz)
        const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.action === "fill_quiz") {
              setForm((prev) => ({
                ...prev,
                titleEn: parsed.titleEn || prev.titleEn,
                titlePt: parsed.titlePt || prev.titlePt,
                descriptionEn: parsed.descriptionEn || prev.descriptionEn,
                descriptionPt: parsed.descriptionPt || prev.descriptionPt,
                category: parsed.category || prev.category,
                difficulty: parsed.difficulty || prev.difficulty,
                xpReward: parsed.xpReward || prev.xpReward,
                iconEmoji: parsed.iconEmoji || prev.iconEmoji,
              }));
              if (parsed.questions?.length) {
                setQuestions(parsed.questions.map((q: any) => ({
                  questionEn: q.questionEn, questionPt: q.questionPt,
                  options: q.options || [],
                  explanationEn: q.explanationEn || "", explanationPt: q.explanationPt || "",
                })));
              }
              toast({ title: "Quiz Filled!", description: `AI filled ${parsed.questions?.length || 0} questions. Review and save.` });
            } else if (parsed.action === "update_field" && parsed.field && parsed.value !== undefined) {
              setForm((prev) => ({ ...prev, [parsed.field]: parsed.value }));
              toast({ title: "Field Updated", description: `${parsed.field} updated by AI.` });
            }
          } catch { /* JSON parse error, ignore */ }
        }
      }
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        chatInputRef.current?.focus();
      }, 100);
    }
  };

  const openChatPanel = () => {
    setShowChat(true);
    if (chatMessages.length === 0) {
      const cond = conditions.find((c) => c.id === form.conditionId);
      const intro = cond
        ? `I want to create a quiz about ${cond.nameEn}. Suggest a quiz structure.`
        : "I want to create an educational quiz for my patients. Help me decide the topic and structure.";
      sendChatMessage(intro);
    }
  };

  const handleSave = async () => {
    if (!form.titleEn || !form.titlePt) {
      toast({ title: "Error", description: "Title (EN & PT) required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const method = editingQuiz ? "PATCH" : "POST";
      const payload: any = {
        ...(editingQuiz ? { id: editingQuiz.id } : {}),
        ...form,
        conditionId: form.conditionId || null,
        questions,
      };
      const res = await fetch("/api/admin/quizzes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: editingQuiz ? "Updated" : "Created", description: `Quiz saved with ${questions.length} questions.` });
        setShowDialog(false);
        fetchData();
      }
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete quiz "${name}"?`)) return;
    const res = await fetch(`/api/admin/quizzes?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Deleted" });
      fetchData();
    }
  };

  const togglePublish = async (q: Quiz) => {
    await fetch("/api/admin/quizzes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, isPublished: !q.isPublished }),
    });
    fetchData();
  };

  const addEmptyQuestion = () => {
    setQuestions([...questions, {
      questionEn: "", questionPt: "",
      options: [
        { en: "", pt: "", isCorrect: true },
        { en: "", pt: "", isCorrect: false },
        { en: "", pt: "", isCorrect: false },
        { en: "", pt: "", isCorrect: false },
      ],
      explanationEn: "", explanationPt: "",
    }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "isCorrect" && value === true) {
      updated[qIdx].options.forEach((o, i) => { o.isCorrect = i === oIdx; });
    } else {
      (updated[qIdx].options[oIdx] as any)[field] = value;
    }
    setQuestions(updated);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const filtered = quizzes.filter((q) => {
    const s = search.toLowerCase();
    return !s || q.titleEn.toLowerCase().includes(s) || q.titlePt.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground text-sm">Create educational quizzes for patients — manually or with AI</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Create Quiz</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search quizzes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No quizzes yet</p>
          <p className="text-sm">Create your first quiz or generate one with AI.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{q.iconEmoji || "📝"}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{locale === "pt-BR" ? q.titlePt : q.titleEn}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px]">{q.category}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{q.difficulty}</Badge>
                        <Badge className="text-[10px] bg-amber-100 text-amber-700">{q.xpReward} XP</Badge>
                        {q.condition && <Badge className="text-[10px] bg-blue-100 text-blue-700">{q.condition.iconEmoji} {locale === "pt-BR" ? q.condition.namePt : q.condition.nameEn}</Badge>}
                        <Badge className={`text-[10px] ${q.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {q.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{q._count.questions} questions · {q._count.attempts} attempts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(q)} title={q.isPublished ? "Unpublish" : "Publish"}>
                      {q.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(q.id, q.titleEn)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuiz ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* AI Chat Panel */}
            {!showChat ? (
              <button
                onClick={openChatPanel}
                className="w-full flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-violet-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-800">AI Quiz Assistant</p>
                  <p className="text-xs text-violet-600">Chat with AI to generate and refine your quiz — it fills all fields for you.</p>
                </div>
                <MessageSquare className="h-5 w-5 text-violet-400 flex-shrink-0" />
              </button>
            ) : (
              <div className="border border-violet-200 rounded-lg overflow-hidden">
                {/* Chat header */}
                <div className="flex items-center justify-between px-3 py-2 bg-violet-50 border-b border-violet-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-semibold text-violet-800">AI Quiz Assistant</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-violet-600" onClick={() => setShowChat(false)}>Minimize</Button>
                </div>
                {/* Messages */}
                <div className="h-56 overflow-y-auto p-3 space-y-3 bg-white">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="h-3 w-3 text-violet-600" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-slate-100 text-slate-800"
                      }`}>
                        {m.content.replace(/```json[\s\S]*?```/g, "✅ Quiz data generated and applied to the form below.")}
                      </div>
                      {m.role === "user" && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <UserIcon className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-3 w-3 text-violet-600 animate-pulse" />
                      </div>
                      <div className="bg-slate-100 rounded-lg px-3 py-2 text-xs text-slate-500">
                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Input */}
                <div className="flex gap-2 p-2 border-t border-violet-100 bg-white">
                  <Input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                    placeholder="e.g. Generate 5 beginner questions about ankle sprains..."
                    className="text-xs h-8"
                    disabled={chatLoading}
                  />
                  <Button size="sm" className="h-8 px-3" onClick={() => sendChatMessage()} disabled={chatLoading || !chatInput.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Quick actions */}
                <div className="flex gap-1.5 px-2 pb-2 flex-wrap">
                  {[
                    "Generate 5 beginner questions",
                    "Make it harder",
                    "Add more options variety",
                    "Translate and fill all fields",
                  ].map((hint) => (
                    <button
                      key={hint}
                      onClick={() => sendChatMessage(hint)}
                      disabled={chatLoading}
                      className="text-[10px] px-2 py-1 rounded-full border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title (EN) *</Label><Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} /></div>
              <div><Label>Title (PT) *</Label><Input value={form.titlePt} onChange={(e) => setForm({ ...form, titlePt: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Description (EN)</Label><Textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} rows={2} /></div>
              <div><Label>Description (PT)</Label><Textarea value={form.descriptionPt} onChange={(e) => setForm({ ...form, descriptionPt: e.target.value })} rows={2} /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Condition</Label>
                <Select value={form.conditionId} onValueChange={(v) => setForm({ ...form, conditionId: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (General)</SelectItem>
                    {conditions.map((c) => <SelectItem key={c.id} value={c.id}>{c.iconEmoji} {c.nameEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{QUIZ_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>XP Reward</Label>
                <Input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Emoji Icon</Label><Input value={form.iconEmoji} onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })} placeholder="📝" /></div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="rounded" />
                  <span className="text-sm">Publish immediately (visible to patients)</span>
                </label>
              </div>
            </div>

            {/* Questions */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Questions ({questions.length})</h3>
                <Button variant="outline" size="sm" onClick={addEmptyQuestion} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Question</Button>
              </div>
              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No questions yet. Add manually or use AI Generate above.</p>
              )}
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <Card key={qIdx} className="border-slate-200">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-muted-foreground">Q{qIdx + 1}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeQuestion(qIdx)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">Question (EN)</Label><Textarea value={q.questionEn} onChange={(e) => updateQuestion(qIdx, "questionEn", e.target.value)} rows={2} className="text-sm" /></div>
                        <div><Label className="text-xs">Question (PT)</Label><Textarea value={q.questionPt} onChange={(e) => updateQuestion(qIdx, "questionPt", e.target.value)} rows={2} className="text-sm" /></div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Options (click radio to mark correct)</Label>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input type="radio" name={`q${qIdx}-correct`} checked={opt.isCorrect} onChange={() => updateOption(qIdx, oIdx, "isCorrect", true)} className="flex-shrink-0" />
                            <Input value={opt.en} onChange={(e) => updateOption(qIdx, oIdx, "en", e.target.value)} placeholder={`Option ${oIdx + 1} (EN)`} className="text-sm h-8" />
                            <Input value={opt.pt} onChange={(e) => updateOption(qIdx, oIdx, "pt", e.target.value)} placeholder={`Option ${oIdx + 1} (PT)`} className="text-sm h-8" />
                            {opt.isCorrect && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">Explanation (EN)</Label><Input value={q.explanationEn || ""} onChange={(e) => updateQuestion(qIdx, "explanationEn", e.target.value)} className="text-sm h-8" /></div>
                        <div><Label className="text-xs">Explanation (PT)</Label><Input value={q.explanationPt || ""} onChange={(e) => updateQuestion(qIdx, "explanationPt", e.target.value)} className="text-sm h-8" /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingQuiz ? "Update Quiz" : "Create Quiz"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
