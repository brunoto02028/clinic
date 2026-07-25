"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Languages, Loader2, Upload, ImageIcon, Trash2, Mic, MicOff, Send, Check, Eye, Pencil, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { AIFieldHelper } from "@/components/admin/ai-field-helper";
import { AIImageGenerator } from "@/components/admin/ai-image-generator";
import { ImageLibraryPicker } from "@/components/admin/image-library-picker";
import { InstagramPostPanel } from "@/components/admin/instagram-post-panel";

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), {
  ssr: false,
  loading: () => <div className="h-[350px] bg-muted rounded-md animate-pulse" />,
});

export default function EditArticlePage() {
  const params = useParams();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [authorName, setAuthorName] = useState("");
  // SEO fields
  const [metaDescription, setMetaDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [generatedBy, setGeneratedBy] = useState<string | null>(null);
  // ── Bilingual editing ──
  const [editLang, setEditLang] = useState<"en" | "pt">("en");
  const [publishLanguage, setPublishLanguage] = useState<"en" | "pt">("en");
  const [stash, setStash] = useState<{ en?: { title: string; excerpt: string; content: string }; pt?: { title: string; excerpt: string; content: string } }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // AI Chat
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingArticle, setPendingArticle] = useState<{title?: string; excerpt?: string; content?: string} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  // Voice
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchArticle();
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatLoading]);

  const fetchArticle = async () => {
    try {
      const res = await fetch(`/api/articles/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        const pubLang: "en" | "pt" = (data.publishLanguage === "pt" || (!data.publishLanguage && data.language?.startsWith?.("pt"))) ? "pt" : "en";
        // Resolve each language slot, falling back to the legacy primary fields for the article's language
        const isPtPrimary = data.language?.startsWith?.("pt") || pubLang === "pt";
        const enSlot = {
          title: data.titleEn ?? (isPtPrimary ? "" : data.title ?? ""),
          excerpt: data.excerptEn ?? (isPtPrimary ? "" : data.excerpt ?? ""),
          content: data.contentEn ?? (isPtPrimary ? "" : data.content ?? ""),
        };
        const ptSlot = {
          title: data.titlePt ?? (isPtPrimary ? data.title ?? "" : ""),
          excerpt: data.excerptPt ?? (isPtPrimary ? data.excerpt ?? "" : ""),
          content: data.contentPt ?? (isPtPrimary ? data.content ?? "" : ""),
        };
        setStash({ en: enSlot, pt: ptSlot });
        setPublishLanguage(pubLang);
        setEditLang(pubLang);
        const active = pubLang === "pt" ? ptSlot : enSlot;
        setTitle(active.title);
        setExcerpt(active.excerpt);
        setContent(active.content);
        setImageUrl(data.imageUrl || "");
        setPublished(data.published);
        setAuthorName(data.authorName || "");
        setMetaDescription(data.metaDescription || "");
        setTags(data.tags || []);
        setKeyword(data.keyword || "");
        setGeneratedBy(data.generatedBy || null);
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
    } finally {
      setLoading(false);
    }
  };

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
  };

  const handleTranslate = async (targetLang: "en" | "pt") => {
    if (targetLang === editLang) {
      toast({ title: "Already editing this language", description: "Switch to the other language first, then translate." });
      return;
    }
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

  // --- AI Chat ---
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
        body: JSON.stringify({ messages: newMessages, language: editLang === "pt" ? "pt-BR" : "en-GB" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
      if (data.article) setPendingArticle(data.article);
    } catch (err: any) {
      toast({ title: "AI Chat Error", description: err.message, variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

  const applyArticle = (article: {title?: string; excerpt?: string; content?: string}) => {
    // The AI generated in the currently-edited language, so fill the active slot.
    if (article.title) setTitle(article.title);
    if (article.excerpt) setExcerpt(article.excerpt);
    if (article.content) setContent(article.content);
    setPendingArticle(null);
    toast({ title: "Article applied!", description: `Updated the ${editLang === "pt" ? "Portuguese" : "English"} version. Review and save.` });
  };

  const formatChatReply = (text: string) => text.replace(/```json\s*[\s\S]*?```/g, "").trim();

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
    recognition.lang = "pt-BR";
    fullTranscriptRef.current = "";
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) fullTranscriptRef.current += event.results[i][0].transcript + " ";
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
      toast({ title: "Voice error", description: event.error === "not-allowed" ? "Microphone blocked" : `Error: ${event.error}`, variant: "destructive" });
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    toast({ title: "Listening...", description: "Speak your instructions. Click Stop when done." });
  };

  const stopRecording = () => { recognitionRef.current?.stop(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch(`/api/articles/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: primary.title, excerpt: primary.excerpt, content: primary.content,
          titleEn: en.title || null, excerptEn: en.excerpt || null, contentEn: en.content || null,
          titlePt: pt.title || null, excerptPt: pt.excerpt || null, contentPt: pt.content || null,
          publishLanguage,
          imageUrl, published, authorName: authorName || undefined, metaDescription: metaDescription || undefined, tags, keyword: keyword || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Article updated", description: "Your changes have been saved." });
        router.push("/admin/articles");
      } else { throw new Error("Failed to update"); }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update article.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <Card className="animate-pulse">
          <CardContent className="p-6 space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Article</h1>
            <p className="text-muted-foreground">Update your blog post</p>
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
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setChatOpen(!chatOpen)}>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-purple-600" />AI Article Assistant</span>
            <span className="text-xs font-normal text-muted-foreground">{chatOpen ? "Click to collapse" : "Click to expand"}</span>
          </CardTitle>
        </CardHeader>
        {chatOpen && (
          <CardContent className="space-y-3">
            <div ref={chatScrollRef} className="border rounded-lg bg-background max-h-[350px] overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Chat with AI to regenerate or refine the article content.</p>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-purple-600 text-white" : "bg-muted text-foreground"}`}>
                    <div className="whitespace-pre-wrap">{m.role === "assistant" ? formatChatReply(m.content) : m.content}</div>
                  </div>
                </div>
              ))}
              {chatLoading && <div className="flex justify-start"><div className="bg-muted rounded-lg px-3 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Thinking...</div></div>}
              <div ref={chatEndRef} />
            </div>
            {pendingArticle && (
              <div className="border border-green-300 bg-green-50 rounded-lg p-3 flex items-center justify-between">
                <div className="text-sm"><strong className="text-green-800">Article ready!</strong><span className="text-green-700 ml-1">"{pendingArticle.title?.slice(0, 60)}..."</span></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => applyArticle(pendingArticle)} className="gap-1.5 bg-green-600 hover:bg-green-700"><Check className="h-3.5 w-3.5" /> Apply</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingArticle(null)} className="text-muted-foreground">Dismiss</Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="Ask AI to modify or regenerate content..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChatMessage())} disabled={chatLoading} className="flex-1" />
              <Button onClick={() => sendChatMessage()} disabled={chatLoading || !chatInput.trim()} size="icon" className="bg-purple-600 hover:bg-purple-700"><Send className="h-4 w-4" /></Button>
              <Button type="button" variant={recording ? "destructive" : "outline"} size="icon" onClick={recording ? stopRecording : startRecording} disabled={chatLoading} title={recording ? "Stop" : "Voice"}>
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            {recording && <p className="text-xs text-red-600 animate-pulse">Recording... speak, then click Stop</p>}
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
              Editing the <strong>{editLang === "en" ? "English" : "Portuguese"}</strong> version. Use the <Languages className="h-3 w-3 inline" /> buttons above to auto-translate into the other language, then correct it.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Title *</Label>
                  <AIFieldHelper fieldName="title" fieldLabel="Article Title" currentValue={title} context="Blog article title for a physical rehabilitation clinic" onApply={(t) => setTitle(t)} />
                </div>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorName">Author</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input id="authorName" placeholder="Author name (leave empty to use account name)" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="excerpt">Excerpt *</Label>
                <AIFieldHelper fieldName="excerpt" fieldLabel="Article Excerpt" currentValue={excerpt} context="Brief summary for article preview cards (1-2 sentences)" onApply={(t) => setExcerpt(t)} />
              </div>
              <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} required />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              {imageUrl ? (
                <div className="relative group">
                  <div className="relative w-full max-w-lg aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                    <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setImageUrl("")} className="gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Replace
                    </Button>
                    <ImageLibraryPicker onSelect={(url) => setImageUrl(url)} />
                    <AIImageGenerator section="Article Cover" defaultPrompt={title ? `Professional physical rehabilitation blog cover image for: ${title}` : ""} aspectRatio="16:9" onApply={(url) => setImageUrl(url)} onInsertInBody={(url) => setContent(prev => prev + `\n<figure class="my-6"><img src="${url}" alt="${title}" class="rounded-xl shadow-md w-full" /><figcaption class="text-sm text-center text-gray-500 mt-2">AI-generated illustration</figcaption></figure>\n`)} articleContext={{ title, excerpt, content }} />
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
                    <ImageLibraryPicker onSelect={(url) => setImageUrl(url)} />
                    <AIImageGenerator section="Article Cover" defaultPrompt={title ? `Professional physical rehabilitation blog cover image for: ${title}` : ""} aspectRatio="16:9" onApply={(url) => setImageUrl(url)} onInsertInBody={(url) => setContent(prev => prev + `\n<figure class="my-6"><img src="${url}" alt="${title}" class="rounded-xl shadow-md w-full" /><figcaption class="text-sm text-center text-gray-500 mt-2">AI-generated illustration</figcaption></figure>\n`)} articleContext={{ title, excerpt, content }} />
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
                <div className="flex items-center gap-2">
                  <AIImageGenerator
                    section="Article Body Image"
                    defaultPrompt={title ? `Illustration for physical rehabilitation article: ${title}` : ""}
                    aspectRatio="16:9"
                    onApply={(url) => setContent(prev => prev + `\n<figure class="my-6"><img src="${url}" alt="${title}" class="rounded-xl shadow-md w-full" /><figcaption class="text-sm text-center text-gray-500 mt-2">AI-generated illustration</figcaption></figure>\n`)}
                    articleContext={{ title, excerpt, content }}
                    buttonLabel="Add Body Image"
                    buttonVariant="outline"
                  />
                  <AIFieldHelper fieldName="content" fieldLabel="Article Content" currentValue={content} context="Full blog article content for a physical rehabilitation clinic website" onApply={(t) => setContent(t)} />
                </div>
              </div>
              {showPreview ? (
                <div className="border rounded-lg p-6 min-h-[350px] bg-white">
                  <div className="article-content prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground prose-img:rounded-xl prose-img:shadow-md" dangerouslySetInnerHTML={{ __html: content || "<p class='text-muted-foreground italic'>No content yet.</p>" }} />
                </div>
              ) : (
                <RichTextEditor value={content} onChange={setContent} placeholder="Write your article content here..." />
              )}
            </div>

            {/* SEO Fields */}
            {(generatedBy || metaDescription || keyword || tags.length > 0) && (
              <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground">SEO</span>
                  {generatedBy && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Generated by {generatedBy}</span>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta Description</Label>
                  <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO meta description..." rows={2} className="text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Target Keyword</Label>
                    <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. rehabilitation Ipswich" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tags (comma-separated)</Label>
                    <Input value={tags.join(', ')} onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="e.g. rehabilitation, knee pain" className="text-sm" />
                  </div>
                </div>
              </div>
            )}

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
              <Label htmlFor="published" className="cursor-pointer">Published</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/admin/articles"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Instagram Panel */}
      {params?.id && typeof params.id === 'string' && (
        <InstagramPostPanel
          articleId={params.id}
          articleTitle={title}
          articleImageUrl={imageUrl || undefined}
        />
      )}
    </div>
  );
}
