"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Save, Loader2, GraduationCap, PlayCircle,
  FileText, Dumbbell, Image as ImageIcon, AlertCircle,
  CheckCircle, X, Eye, EyeOff, Star, Upload, Mic, MicOff,
  Sparkles, Send, Users, User, Filter, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";

interface Category { id: string; name: string; }

function CreateContentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("article");
  const [categoryId, setCategoryId] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProvider, setVideoProvider] = useState("youtube");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [equipment, setEquipment] = useState("");
  const [bodyParts, setBodyParts] = useState("");
  const [instructions, setInstructions] = useState("");
  const [repetitions, setRepetitions] = useState("");
  const [precautions, setPrecautions] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  // AI Assistant
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechLang, setSpeechLang] = useState<"en" | "pt">("en");
  const recognitionRef = useRef<any>(null);

  // Send to patients
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendMode, setSendMode] = useState<"all" | "condition" | "specific">("all");
  const [sendTags, setSendTags] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  useEffect(() => {
    fetchCategories();
    if (editId) loadContent(editId);
  }, [editId]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/education/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {}
  };

  const loadContent = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/education/content/${id}`);
      const data = await res.json();
      if (data.content) {
        const c = data.content;
        setTitle(c.title);
        setDescription(c.description || "");
        setContentType(c.contentType);
        setCategoryId(c.categoryId || "");
        setBody(c.body || "");
        setVideoUrl(c.videoUrl || "");
        setVideoProvider(c.videoProvider || "youtube");
        setThumbnailUrl(c.thumbnailUrl || "");
        setDuration(c.duration?.toString() || "");
        setDifficulty(c.difficulty || "beginner");
        setEquipment(c.equipment || "");
        setBodyParts(c.bodyParts?.join(", ") || "");
        setInstructions(c.instructions || "");
        setRepetitions(c.repetitions || "");
        setPrecautions(c.precautions || "");
        setTags(c.tags?.join(", ") || "");
        setIsPublished(c.isPublished);
        setIsFeatured(c.isFeatured);
        setSavedContentId(c.id);
      }
    } catch {} finally { setLoading(false); }
  };

  // ─── Voice Recording (Web Speech API) ───
  const startRecording = useCallback(() => {
    // Stop any previous instance first
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang === "pt" ? "pt-BR" : "en-US";

      let finalTranscript = "";

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t + " ";
          } else {
            interim = t;
          }
        }
        setTranscript(finalTranscript + interim);
        setAiInput(finalTranscript + interim);
      };

      recognition.onerror = (event: any) => {
        console.error("[speech] Error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone access denied. Please allow microphone permissions in your browser settings.");
        } else if (event.error === "no-speech") {
          // Ignore no-speech, just stop
        } else {
          setError(`Speech error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript("");
    } catch (err: any) {
      setError(`Could not start speech recognition: ${err.message}`);
      setIsRecording(false);
    }
  }, [speechLang]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      setIsRecording(false);
    }
  }, []);

  // ─── AI Generate ───
  const generateWithAI = async () => {
    const input = aiInput.trim();
    if (!input) return;

    setAiGenerating(true);
    setAiPreview(null);
    try {
      const res = await fetch("/api/admin/education/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: input,
          contentType,
          language: "en",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAiPreview(data.generated);
      if (data.categories) setCategories(data.categories);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const acceptAIContent = () => {
    if (!aiPreview) return;

    setTitle(aiPreview.title || "");
    setDescription(aiPreview.description || "");
    setBody(aiPreview.body || "");
    setDifficulty(aiPreview.difficulty || "beginner");
    setDuration(aiPreview.duration?.toString() || "");
    setTags(Array.isArray(aiPreview.tags) ? aiPreview.tags.join(", ") : "");
    setBodyParts(Array.isArray(aiPreview.bodyParts) ? aiPreview.bodyParts.join(", ") : "");
    if (aiPreview.categoryId) setCategoryId(aiPreview.categoryId);
    if (aiPreview.contentType) setContentType(aiPreview.contentType);
    if (aiPreview.equipment) setEquipment(aiPreview.equipment);
    if (aiPreview.instructions) setInstructions(aiPreview.instructions);
    if (aiPreview.repetitions) setRepetitions(aiPreview.repetitions);
    if (aiPreview.precautions) setPrecautions(aiPreview.precautions);

    setAiPreview(null);
    setShowAI(false);
    setAiInput("");
    setTranscript("");
  };

  // ─── Save ───
  const handleSave = async (publish: boolean) => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        description: description || null,
        contentType,
        categoryId: categoryId || null,
        body: body || null,
        videoUrl: videoUrl || null,
        videoProvider: videoUrl ? videoProvider : null,
        thumbnailUrl: thumbnailUrl || null,
        imageUrls: [],
        duration: duration || null,
        difficulty,
        equipment: equipment || null,
        bodyParts: bodyParts ? bodyParts.split(",").map(s => s.trim()).filter(Boolean) : [],
        instructions: instructions || null,
        repetitions: repetitions || null,
        precautions: precautions || null,
        tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
        isPublished: publish,
        isFeatured,
      };

      const url = editId ? `/api/admin/education/content/${editId}` : "/api/admin/education/content";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) { setError(data.error); }
      else {
        const contentId = data.content?.id || editId;
        setSavedContentId(contentId);
        setSuccess(publish ? "Content published!" : "Content saved as draft!");
        if (publish && contentId) {
          setSendTags(tags);
          setShowSendDialog(true);
        } else {
          setTimeout(() => router.push("/admin/education"), 1500);
        }
      }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  // ─── Send to Patients ───
  const handleSend = async () => {
    if (!savedContentId) return;
    setSending(true);
    setSendResult(null);
    try {
      const payload: any = { contentId: savedContentId, sendTo: sendMode };
      if (sendMode === "condition") {
        payload.conditionTags = sendTags.split(",").map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch("/api/admin/education/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSendResult(data);
    } catch (err: any) {
      setSendResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/education">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{editId ? "Edit Content" : "Create Educational Content"}</h1>
            <p className="text-sm text-muted-foreground">Add articles, videos, or exercises for patients</p>
          </div>
        </div>
        <Button
          variant={showAI ? "default" : "outline"}
          className="gap-2"
          onClick={() => setShowAI(!showAI)}
        >
          <Sparkles className="h-4 w-4" /> AI Assistant
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
        </div>
      )}
      {success && !showSendDialog && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      {/* AI Assistant Panel */}
      {showAI && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Content Assistant
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Speak or type what you want to create. The AI will generate all fields automatically.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Speak in:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSpeechLang("en")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    speechLang === "en"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  EN English
                </button>
                <button
                  onClick={() => setSpeechLang("pt")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    speechLang === "pt"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  PT Portugu\u00eas
                </button>
              </div>
              <span className="text-xs text-muted-foreground ml-2">Content will be generated in English</span>
            </div>

            {/* Voice + Text Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  placeholder={isRecording ? "Listening..." : "Describe the content you want to create... Or click the microphone to speak."}
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  rows={3}
                  className={`pr-12 text-sm ${isRecording ? "border-red-400 bg-red-50/50" : ""}`}
                />
                {isRecording && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-red-600 font-medium">REC</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="h-10 w-10"
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  className="h-10 w-10"
                  onClick={generateWithAI}
                  disabled={aiGenerating || !aiInput.trim()}
                  title="Generate with AI"
                >
                  {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* AI Preview */}
            {aiPreview && (
              <div className="border rounded-lg p-4 space-y-3 bg-background">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> AI Generated Content
                  </h4>
                  <Badge variant="outline" className="text-xs">{aiPreview.contentType || contentType}</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div><span className="font-medium text-muted-foreground">Title:</span> {aiPreview.title}</div>
                  <div><span className="font-medium text-muted-foreground">Description:</span> {aiPreview.description}</div>
                  <div><span className="font-medium text-muted-foreground">Difficulty:</span> <Badge variant="outline" className="text-xs">{aiPreview.difficulty}</Badge></div>
                  <div><span className="font-medium text-muted-foreground">Duration:</span> {aiPreview.duration} min</div>
                  {aiPreview.tags?.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-muted-foreground">Tags:</span>
                      {aiPreview.tags.map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                  {aiPreview.suggestedCategory && (
                    <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                      Suggested new category: <strong>{aiPreview.suggestedCategory}</strong>
                    </div>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-muted-foreground">Preview content body...</summary>
                    <div className="mt-2 p-3 bg-muted/30 rounded max-h-48 overflow-auto whitespace-pre-wrap">{aiPreview.body}</div>
                  </details>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="gap-1.5 flex-1" onClick={acceptAIContent}>
                    <CheckCircle className="h-4 w-4" /> Accept & Fill Fields
                  </Button>
                  <Button variant="outline" onClick={() => setAiPreview(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main - Left 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          {/* Content Type Selector */}
          <div className="flex gap-2">
            {[
              { type: "article", icon: FileText, label: "Article" },
              { type: "video", icon: PlayCircle, label: "Video" },
              { type: "exercise", icon: Dumbbell, label: "Exercise" },
              { type: "infographic", icon: ImageIcon, label: "Infographic" },
            ].map(t => (
              <button
                key={t.type}
                onClick={() => setContentType(t.type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  contentType === t.type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="e.g. Plantar Fasciitis Stretching Guide" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Textarea placeholder="Brief description for listing cards..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          {/* Video URL (video type) */}
          {contentType === "video" && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <Label className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-red-500" /> Video Settings</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Input placeholder="YouTube or Vimeo URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                  </div>
                  <Select value={videoProvider} onValueChange={setVideoProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="upload">Uploaded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {videoUrl && videoUrl.includes("youtube") && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoUrl.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}`}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Exercise-specific fields */}
          {contentType === "exercise" && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <Label className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-green-600" /> Exercise Details</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Repetitions / Sets</Label>
                    <Input placeholder="e.g. 3 sets of 10" value={repetitions} onChange={e => setRepetitions(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Equipment</Label>
                    <Input placeholder="e.g. Resistance band" value={equipment} onChange={e => setEquipment(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target Body Parts (comma-separated)</Label>
                  <Input placeholder="foot, ankle, calf" value={bodyParts} onChange={e => setBodyParts(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Step-by-Step Instructions</Label>
                  <Textarea placeholder={"1. Stand with feet shoulder-width apart\n2. Slowly raise onto toes\n3. Hold for 5 seconds\n4. Lower back down"} value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Safety Precautions</Label>
                  <Textarea placeholder="Stop if you feel sharp pain..." value={precautions} onChange={e => setPrecautions(e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Body / Rich Content */}
          <div className="space-y-2">
            <Label>{contentType === "exercise" ? "Additional Notes" : "Content Body"}</Label>
            <Textarea
              placeholder={contentType === "article" ? "Write your article content here..." : "Additional information..."}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={contentType === "article" ? 12 : 5}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Settings */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Category</Label>
                <Select value={categoryId || "none"} onValueChange={v => setCategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Duration (minutes)</Label>
                <Input type="number" placeholder="15" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Thumbnail URL</Label>
                <Input placeholder="https://..." value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input placeholder="stretching, foot, beginner" value={tags} onChange={e => setTags(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Featured
                </Label>
                <button
                  onClick={() => setIsFeatured(!isFeatured)}
                  className={`w-9 h-5 rounded-full transition-colors ${isFeatured ? "bg-amber-500" : "bg-slate-200"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full gap-2" onClick={() => handleSave(true)} disabled={saving || !title}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Publish
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => handleSave(false)} disabled={saving || !title}>
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            {savedContentId && (
              <Button variant="outline" className="w-full gap-2 text-primary border-primary/30" onClick={() => { setSendTags(tags); setShowSendDialog(true); }}>
                <Send className="h-4 w-4" /> Send to Patients
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Send to Patients Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Send to Patients
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose who should receive this content:
            </p>

            {/* Send mode */}
            <div className="space-y-2">
              {[
                { mode: "all" as const, icon: Users, label: "All Patients", desc: "Send to every active patient" },
                { mode: "condition" as const, icon: Filter, label: "By Condition / Tag", desc: "Patients with matching diagnosis or protocol" },
              ].map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => setSendMode(opt.mode)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    sendMode === opt.mode
                      ? "bg-primary/5 border-primary/40"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <opt.icon className={`h-5 w-5 mt-0.5 ${sendMode === opt.mode ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Condition tags input */}
            {sendMode === "condition" && (
              <div className="space-y-2">
                <Label className="text-xs">Condition / Body Part Tags</Label>
                <Input
                  placeholder="e.g. shoulder, knee, lower back"
                  value={sendTags}
                  onChange={e => setSendTags(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Patients with diagnoses or protocols matching these tags will receive this content.
                </p>
              </div>
            )}

            {/* Result */}
            {sendResult && (
              <div className={`p-3 rounded-lg text-sm ${
                sendResult.error
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}>
                {sendResult.error ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {sendResult.error}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Sent to {sendResult.sentCount} patient{sendResult.sentCount !== 1 ? "s" : ""}
                    </div>
                    {sendResult.alreadyAssigned > 0 && (
                      <p className="text-xs">{sendResult.alreadyAssigned} already had this content assigned.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowSendDialog(false); router.push("/admin/education"); }}>
              {sendResult?.success ? "Done" : "Skip"}
            </Button>
            {!sendResult?.success && (
              <Button className="gap-1.5" onClick={handleSend} disabled={sending || (sendMode === "condition" && !sendTags.trim())}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CreateContentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <CreateContentForm />
    </Suspense>
  );
}
