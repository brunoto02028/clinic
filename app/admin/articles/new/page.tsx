"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Sparkles, Loader2, Mic, MicOff, Languages, Upload, ImageIcon, X, Trash2, Send, Check, Eye, Pencil, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { AIFieldHelper } from "@/components/admin/ai-field-helper";
import { AIImageGenerator } from "@/components/admin/ai-image-generator";

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), {
  ssr: false,
  loading: () => <div className="h-[350px] bg-muted rounded-md animate-pulse" />,
});

export default function NewArticlePage() {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // AI Chat
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  // Voice recording (Web Speech API — free, no rate limits)
  const [recording, setRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("ai_voice_lang") || "pt-BR";
    return "pt-BR";
  });
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef("");
  // Output language for the generated article (independent of voice/chat language)
  const [articleLang, setArticleLang] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("ai_article_lang") || "en-GB";
    return "en-GB";
  });
  // ── Bilingual editing ──
  // title/excerpt/content above hold the CURRENTLY-edited language. `stash` keeps the inactive one.
  const [editLang, setEditLang] = useState<"en" | "pt">("en");
  const [publishLanguage, setPublishLanguage] = useState<"en" | "pt">("en");
  const [stash, setStash] = useState<{ en?: { title: string; excerpt: string; content: string }; pt?: { title: string; excerpt: string; content: string } }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Switch the editor between EN and PT, preserving each language's content.
  const switchLang = (newLang: "en" | "pt") => {
    if (newLang === editLang) return;
    setStash((s) => ({ ...s, [editLang]: { title, excerpt, content } }));
    const other = stash[newLang] || { title: "", excerpt: "", content: "" };
    setTitle(other.title);
    setExcerpt(other.excerpt);
    setContent(other.content);
    setShowPreview(false);
    setEditLang(newLang);
    // Keep the AI generation language aligned with the language being edited
    if (newLang === "en" && articleLang.startsWith("pt")) {
      setArticleLang("en-GB");
      if (typeof window !== "undefined") localStorage.setItem("ai_article_lang", "en-GB");
    } else if (newLang === "pt" && articleLang.startsWith("en")) {
      setArticleLang("pt-BR");
      if (typeof window !== "undefined") localStorage.setItem("ai_article_lang", "pt-BR");
    }
  };

  // Translate the currently-edited content into the OTHER language, store it, and switch to it.
  const handleTranslate = async (targetLang: "en" | "pt") => {
    if (targetLang === editLang) {
      toast({ title: "Already editing this language", description: `Switch to the other language first, then translate.` });
      return;
    }
    if (!title && !content) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/admin/articles/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, excerpt, content, targetLang }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      // Stash the current language, load the translated target language into the editor
      setStash((s) => ({ ...s, [editLang]: { title, excerpt, content } }));
      setTitle(data.title);
      setExcerpt(data.excerpt);
      setContent(data.content);
      setShowPreview(false);
      setEditLang(targetLang);
      toast({ title: targetLang === "pt" ? "Traduzido para Português!" : "Translated to English!", description: "Review and correct the translation as needed." });
    } catch (err: any) {
      toast({ title: "Translation failed", description: err.message, variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  // Auto-scroll chat to bottom — scroll ONLY the chat container, never the page
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatLoading]);

  const sendChatMessage = async (msg?: string) => {
    const text = msg || chatInput.trim();
    if (!text) return;
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user", content: text }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/articles/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, language: articleLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
      // If AI returned a structured article, offer to apply it
      if (data.article) {
        // Store article data for the "Apply" button
        setPendingArticle(data.article);
      }
    } catch (err: any) {
      toast({ title: "AI Chat Error", description: err.message, variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

  const [pendingArticle, setPendingArticle] = useState<{title?: string; excerpt?: string; content?: string} | null>(null);

  const applyArticle = (article: {title?: string; excerpt?: string; content?: string}) => {
    // The article was generated in `articleLang` — place it in that language's slot.
    const genLang: "en" | "pt" = articleLang.startsWith("pt") ? "pt" : "en";
    if (genLang !== editLang) {
      // Stash whatever is in the current slot, then switch to the generated language
      setStash((s) => ({ ...s, [editLang]: { title, excerpt, content } }));
      setEditLang(genLang);
    }
    setTitle(article.title || "");
    setExcerpt(article.excerpt || "");
    setContent(article.content || "");
    setPublishLanguage(genLang);
    setPendingArticle(null);
    toast({ title: "Article applied!", description: `Filled the ${genLang === "pt" ? "Portuguese" : "English"} version. Review it, then use the translate button to create the other language.` });
  };

  // --- Image Upload ---
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "articles");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.image.imageUrl);
      toast({ title: "Image uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // --- Voice Recording (Web Speech API) ---
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Speech recognition is not supported in this browser. Please use Chrome or Edge.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = voiceLang;
    fullTranscriptRef.current = "";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscriptRef.current += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onend = () => {
      setRecording(false);
      const transcript = fullTranscriptRef.current.trim();
      if (transcript) {
        toast({ title: "Voice transcribed!", description: `"${transcript.slice(0, 100)}${transcript.length > 100 ? '...' : ''}"` });
        sendChatMessage(transcript);
      } else {
        toast({ title: "No speech detected", description: "Please try again and speak clearly.", variant: "destructive" });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setRecording(false);
      if (event.error === "not-allowed") {
        toast({ title: "Microphone blocked", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
      } else {
        toast({ title: "Voice error", description: `Speech recognition error: ${event.error}`, variant: "destructive" });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    toast({ title: "Listening...", description: "Speak your article topic. Click Stop when done." });
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !excerpt || !content) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    // Gather both language slots (current editing slot + stash)
    const current = { title, excerpt, content };
    const en = editLang === "en" ? current : (stash.en || { title: "", excerpt: "", content: "" });
    const pt = editLang === "pt" ? current : (stash.pt || { title: "", excerpt: "", content: "" });
    const primary = publishLanguage === "pt" ? pt : en;
    if (!primary.title || !primary.content) {
      toast({ title: `Missing ${publishLanguage === "pt" ? "Portuguese" : "English"} content`, description: `You chose to publish in ${publishLanguage === "pt" ? "Portuguese" : "English"} but that version is empty. Fill it in or change the publish language.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: primary.title, excerpt: primary.excerpt, content: primary.content,
          titleEn: en.title || null, excerptEn: en.excerpt || null, contentEn: en.content || null,
          titlePt: pt.title || null, excerptPt: pt.excerpt || null, contentPt: pt.content || null,
          publishLanguage,
          imageUrl, published, authorName: authorName || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Article created", description: published ? "Your article has been published." : "Your article has been saved as a draft." });
        router.push("/admin/articles");
      } else { throw new Error("Failed to create"); }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create article. Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  /** Strip JSON code blocks from AI reply for display */
  const formatChatReply = (text: string) => {
    return text.replace(/```json\s*[\s\S]*?```/g, "").trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Article</h1>
            <p className="text-muted-foreground">Create a new blog post</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => handleTranslate("pt")} disabled={translating} className="gap-1.5">
            {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
            → PT-BR
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleTranslate("en")} disabled={translating} className="gap-1.5">
            {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
            → EN
          </Button>
        </div>
      </div>

      {/* AI Chat Panel */}
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 shadow-lg shadow-teal-500/5">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setChatOpen(!chatOpen)}>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-500 animate-pulse" />
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent font-black">
                AI Article Assistant
              </span>
            </span>
            <span className="text-xs font-normal text-muted-foreground">{chatOpen ? "Click to collapse" : "Click to expand"}</span>
          </CardTitle>
        </CardHeader>
        {chatOpen && (
          <CardContent className="space-y-3">
            {/* Chat Messages */}
            <div ref={chatScrollRef} className="border border-teal-500/20 rounded-lg bg-background max-h-[350px] overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Start a conversation with the AI. Describe the article topic, ask questions, request changes — the AI will help you craft the perfect article.
                </p>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md"
                      : "bg-muted text-foreground border border-teal-500/10"
                  }`}>
                    <div className="whitespace-pre-wrap">{m.role === "assistant" ? formatChatReply(m.content) : m.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Pending article to apply */}
            {pendingArticle && (
              <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm">
                  <strong className="text-green-800">Article ready!</strong>
                  <span className="text-green-700 ml-1">"{pendingArticle.title?.slice(0, 60)}..."</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => applyArticle(pendingArticle)} className="gap-1.5 bg-green-600 hover:bg-green-700">
                    <Check className="h-3.5 w-3.5" /> Apply to Form
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingArticle(null)} className="text-muted-foreground">
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Article output language selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-foreground">Write article in:</span>
              {([
                { code: "en-GB", label: "English (UK)" },
                { code: "en-US", label: "English (US)" },
                { code: "pt-BR", label: "Português (BR)" },
                { code: "pt-PT", label: "Português (PT)" },
              ] as const).map(({ code, label }) => (
                <button key={code} type="button"
                  onClick={() => { setArticleLang(code); if (typeof window !== "undefined") localStorage.setItem("ai_article_lang", code); }}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    articleLang === code ? "bg-teal-600 text-white border-teal-600" : "bg-muted text-muted-foreground border-border hover:border-teal-400"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Tell the AI what article to write, or ask for changes..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChatMessage())}
                disabled={chatLoading}
                className="flex-1"
              />
              <Button onClick={() => sendChatMessage()} disabled={chatLoading || !chatInput.trim()} size="icon" className="bg-purple-600 hover:bg-purple-700">
                <Send className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={recording ? "destructive" : "outline"}
                size="icon"
                onClick={recording ? stopRecording : startRecording}
                disabled={chatLoading}
                title={recording ? `Stop recording (${voiceLang})` : `Voice input (${voiceLang})`}
              >
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            {/* Voice language selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Voice lang:</span>
              {(["pt-BR", "pt-PT", "en-GB", "en-US"] as const).map(lang => (
                <button key={lang} type="button"
                  onClick={() => { setVoiceLang(lang); if (typeof window !== "undefined") localStorage.setItem("ai_voice_lang", lang); }}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    voiceLang === lang ? "bg-blue-600 text-white border-blue-600" : "bg-muted text-muted-foreground border-border hover:border-blue-400"
                  }`}>
                  {lang}
                </button>
              ))}
              {recording && <span className="ml-2 text-xs text-red-600 animate-pulse">● Recording... click Stop when done</span>}
            </div>
          </CardContent>
        )}
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>Article Details</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Editing language:</span>
                <div className="flex border border-border rounded-md overflow-hidden">
                  <button type="button" onClick={() => switchLang("en")}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${editLang === "en" ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    🇬🇧 English
                  </button>
                  <button type="button" onClick={() => switchLang("pt")}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${editLang === "pt" ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    🇧🇷 Português
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You are editing the <strong>{editLang === "en" ? "English" : "Portuguese"}</strong> version. Use the <Languages className="h-3 w-3 inline" /> buttons above to auto-translate into the other language, then correct it.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Title *</Label>
                  <AIFieldHelper fieldName="title" fieldLabel="Article Title" currentValue={title} context="Blog article title for a physical rehabilitation clinic" onApply={(t) => setTitle(t)} />
                </div>
                <Input id="title" placeholder="Enter article title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="authorName">Author</Label>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input id="authorName" placeholder="Author name (leave empty to use your account name)" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="excerpt">Excerpt *</Label>
                <AIFieldHelper fieldName="excerpt" fieldLabel="Article Excerpt" currentValue={excerpt} context="Brief summary for article preview cards (1-2 sentences)" onApply={(t) => setExcerpt(t)} />
              </div>
              <Textarea id="excerpt" placeholder="Brief summary of the article (shown in previews)" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} required />
            </div>

            {/* Cover Image — Upload / AI / URL */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              {imageUrl ? (
                <div className="relative group">
                  <div className="relative w-full max-w-lg aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                    <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setImageUrl("")} className="gap-1.5 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" /> Replace
                    </Button>
                    <AIImageGenerator
                      section="Article Cover"
                      defaultPrompt={title ? `Professional physical rehabilitation blog cover image for: ${title}` : ""}
                      aspectRatio="16:9"
                      onApply={(url) => setImageUrl(url)}
                      onInsertInBody={(url) => setContent(prev => prev + `\n<figure class="my-6"><img src="${url}" alt="${title}" class="rounded-xl shadow-md w-full" /><figcaption class="text-sm text-center text-gray-500 mt-2">AI-generated illustration</figcaption></figure>\n`)}
                      articleContext={{ title, excerpt, content }}
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3">
                  <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Upload an image, generate with AI, or paste a URL</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                    <AIImageGenerator
                      section="Article Cover"
                      defaultPrompt={title ? `Professional physical rehabilitation blog cover image for: ${title}` : ""}
                      aspectRatio="16:9"
                      onApply={(url) => setImageUrl(url)}
                      onInsertInBody={(url) => setContent(prev => prev + `\n<figure class="my-6"><img src="${url}" alt="${title}" class="rounded-xl shadow-md w-full" /><figcaption class="text-sm text-center text-gray-500 mt-2">AI-generated illustration</figcaption></figure>\n`)}
                      articleContext={{ title, excerpt, content }}
                    />
                  </div>
                  <div className="pt-2">
                    <Input placeholder="Or paste image URL..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="max-w-md mx-auto text-sm" />
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
            </div>

            {/* Content with Preview Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Content *</Label>
                  <div className="flex border rounded-md overflow-hidden ml-3">
                    <button type="button" onClick={() => setShowPreview(false)} className={`px-3 py-1 text-xs font-medium transition-colors ${!showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      <Pencil className="h-3 w-3 inline mr-1" />Edit
                    </button>
                    <button type="button" onClick={() => setShowPreview(true)} className={`px-3 py-1 text-xs font-medium transition-colors ${showPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      <Eye className="h-3 w-3 inline mr-1" />Preview
                    </button>
                  </div>
                </div>
                <AIFieldHelper fieldName="content" fieldLabel="Article Content" currentValue={content} context="Full blog article content for a physical rehabilitation clinic website" onApply={(t) => setContent(t)} />
              </div>
              {showPreview ? (
                <div className="border rounded-lg p-6 min-h-[350px] bg-white">
                  <div
                    className="article-preview max-w-none"
                    dangerouslySetInnerHTML={{ __html: content || "<p style='color:#9ca3af;font-style:italic'>No content yet. Switch to Edit mode to start writing.</p>" }}
                  />
                  <style jsx global>{`
                    /* Match the Quill editor spacing exactly so preview == edit */
                    .article-preview { color: #1f2937; font-size: 0.95rem; line-height: 1.6; }
                    .article-preview p { margin: 0 0 0.75em; }
                    .article-preview h1, .article-preview h2, .article-preview h3 { color: #111827; font-weight: 700; margin: 1em 0 0.5em; line-height: 1.3; }
                    .article-preview h1 { font-size: 1.6em; }
                    .article-preview h2 { font-size: 1.35em; }
                    .article-preview h3 { font-size: 1.15em; }
                    .article-preview ul, .article-preview ol { margin: 0 0 0.75em; padding-left: 1.5em; }
                    .article-preview ul { list-style: disc; }
                    .article-preview ol { list-style: decimal; }
                    .article-preview li { margin-bottom: 0.25em; }
                    .article-preview a { color: #0d9488; text-decoration: underline; }
                    .article-preview strong { font-weight: 700; color: #111827; }
                    .article-preview em { font-style: italic; }
                    .article-preview blockquote { border-left: 3px solid #14b8a6; padding-left: 1em; margin: 0 0 0.75em; color: #4b5563; font-style: italic; }
                    .article-preview img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1em 0; }
                    /* Collapse Quill's empty paragraphs so they don't create big white gaps */
                    .article-preview p:empty { display: none; margin: 0; }
                  `}</style>
                </div>
              ) : (
                <RichTextEditor value={content} onChange={setContent} placeholder="Write your article content here..." />
              )}
            </div>

            {/* Primary publish language */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <Label className="text-sm font-semibold">Primary publish language</Label>
              <p className="text-xs text-muted-foreground">The default language shown on the public site. Visitors can switch using the site's language toggle if the other version exists.</p>
              <div className="flex gap-2 pt-1">
                {(["en", "pt"] as const).map((lang) => (
                  <button key={lang} type="button" onClick={() => setPublishLanguage(lang)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md border transition-colors ${publishLanguage === lang ? "bg-teal-600 text-white border-teal-600" : "bg-background text-muted-foreground border-border hover:border-teal-400"}`}>
                    {lang === "en" ? "🇬🇧 English" : "🇧🇷 Português"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="published" checked={published} onCheckedChange={(checked) => setPublished(checked as boolean)} />
              <Label htmlFor="published" className="cursor-pointer">Publish immediately</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/admin/articles"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Article"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
