"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles, Send, Clock, Save, Image as ImageIcon, Loader2,
  ArrowLeft, Instagram, Hash, Wand2, RefreshCw, Upload,
  CalendarDays, ChevronDown, X, AlertCircle, CheckCircle,
  Mic, MicOff, Globe, ImagePlus, BookOpen, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  profilePicUrl: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string;
  published: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

function CreatePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [postType, setPostType] = useState("IMAGE");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [accountId, setAccountId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Data
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiHashtagsGenerating, setAiHashtagsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // AI prompt
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("professional yet friendly");
  const [aiLang, setAiLang] = useState("en-GB");
  const [aiImageGenerating, setAiImageGenerating] = useState(false);

  // Blog import
  const [blogArticles, setBlogArticles] = useState<BlogArticle[]>([]);
  const [blogOpen, setBlogOpen] = useState(false);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogImporting, setBlogImporting] = useState<string | null>(null);

  // Voice-to-text
  const [isListening, setIsListening] = useState(false);
  const [voiceField, setVoiceField] = useState<"topic" | "caption" | "hashtags">("topic");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchAccountsAndCampaigns();
    if (editId) loadPost(editId);
    return () => { recognitionRef.current?.stop(); };
  }, [editId]);

  const startVoice = (field: "topic" | "caption" | "hashtags") => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Voice recognition not supported in this browser');
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = aiLang === 'pt-BR' ? 'pt-BR' : 'en-GB';
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      if (field === 'topic') setAiTopic(transcript);
      else if (field === 'caption') setCaption(transcript);
      else setHashtags(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceField(field);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const generateAiImage = async () => {
    const prompt = aiTopic || caption.slice(0, 200);
    if (!prompt) { setError('Enter a topic or caption first'); return; }
    setAiImageGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Instagram post image for a physiotherapy clinic: ${prompt}`, aspectRatio: '1:1', section: 'social-post' }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setMediaPreviews(prev => [...prev, data.imageUrl]);
        setMediaUrls(prev => [...prev, data.imageUrl]);
      } else {
        setError(data.error || 'Image generation unavailable');
      }
    } catch {
      setError('AI image generation failed');
    } finally {
      setAiImageGenerating(false);
    }
  };

  const fetchBlogArticles = async () => {
    try {
      const res = await fetch("/api/articles");
      if (res.ok) {
        const data = await res.json();
        setBlogArticles((Array.isArray(data) ? data : []).filter((a: BlogArticle) => a.published));
      }
    } catch {}
  };

  const importFromBlog = async (article: BlogArticle) => {
    setBlogImporting(article.id);
    try {
      // Generate caption via AI
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_caption", articleId: article.id }),
      });
      const data = await res.json();
      if (data.caption) {
        // Split hashtags from caption if present
        const parts = data.caption.split(/\n\n(?=#)/);
        if (parts.length > 1) {
          setCaption(parts.slice(0, -1).join("\n\n"));
          setHashtags(parts[parts.length - 1].replace(/#/g, "").split(/\s+/).filter(Boolean).join(", "));
        } else {
          setCaption(data.caption);
        }
      } else {
        setCaption(`${article.title}\n\n${article.excerpt || ""}`);
      }
      // Set image
      if (article.imageUrl) {
        const absUrl = article.imageUrl.startsWith("http")
          ? article.imageUrl
          : `${window.location.origin}${article.imageUrl}`;
        setMediaUrls([absUrl]);
        setMediaPreviews([absUrl]);
      }
      setAiTopic(article.title);
      setBlogOpen(false);
      setSuccess(`Imported from: "${article.title}"`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to import article");
    } finally {
      setBlogImporting(null);
    }
  };

  const fetchAccountsAndCampaigns = async () => {
    try {
      const [accRes, campRes] = await Promise.all([
        fetch("/api/admin/social/accounts"),
        fetch("/api/admin/social/campaigns"),
      ]);
      const accData = await accRes.json();
      const campData = await campRes.json();
      setAccounts(accData.accounts || []);
      setCampaigns(campData.campaigns || []);

      // Auto-select first account
      if (accData.accounts?.length > 0 && !accountId) {
        setAccountId(accData.accounts[0].id);
      }
    } catch {}
  };

  const loadPost = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/social/posts/${id}`);
      const data = await res.json();
      if (data.post) {
        setCaption(data.post.caption);
        setHashtags(data.post.hashtags || "");
        setPostType(data.post.postType);
        setMediaUrls(data.post.mediaUrls || []);
        setMediaPreviews(data.post.mediaUrls || []);
        setAccountId(data.post.accountId || "");
        setCampaignId(data.post.campaignId || "");
        if (data.post.scheduledAt) {
          setScheduledAt(new Date(data.post.scheduledAt).toISOString().slice(0, 16));
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  // ─── AI Generation ───
  const generateCaption = async () => {
    if (!aiTopic.trim()) {
      setError("Please enter a topic for AI generation");
      return;
    }
    setAiGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "caption",
          topic: aiTopic,
          tone: aiTone,
          language: aiLang,
          clinicName: "Bruno Physical Rehabilitation",
          services: ["Foot Scans", "Custom Insoles", "Physical Therapy", "Biomechanical Assessment"],
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCaption(data.caption || "");
        if (data.hashtags?.length) {
          setHashtags(data.hashtags.map((h: string) => h.replace(/^#/, "")).join(", "));
        }
      }
    } catch {
      setError("AI generation failed. Check your Gemini API key.");
    } finally {
      setAiGenerating(false);
    }
  };

  const generateHashtags = async () => {
    const topic = aiTopic || caption.slice(0, 100);
    if (!topic) {
      setError("Write a caption or enter a topic first");
      return;
    }
    setAiHashtagsGenerating(true);
    try {
      const res = await fetch("/api/admin/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hashtags",
          topic,
          count: 20,
          niche: "physical therapy rehabilitation foot care",
        }),
      });
      const data = await res.json();
      if (data.hashtags) {
        setHashtags(data.hashtags.map((h: string) => h.replace(/^#/, "")).join(", "));
      }
    } catch {
      setError("Hashtag generation failed");
    } finally {
      setAiHashtagsGenerating(false);
    }
  };

  const improveCaption = async () => {
    if (!caption) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/admin/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improve",
          caption,
          instruction: "Make it more engaging for Instagram, add relevant emojis, keep it concise",
        }),
      });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
    } catch {
      setError("Caption improvement failed");
    } finally {
      setAiGenerating(false);
    }
  };

  // ─── Image Upload ───
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setMediaPreviews(prev => [...prev, url]);
      // In production, upload to S3 and get URL
      // For now, store preview URL
      setMediaUrls(prev => [...prev, url]);
    });
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setMediaPreviews(prev => prev.filter((_, i) => i !== idx));
    setMediaUrls(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Save / Publish ───
  const savePost = async (status: "DRAFT" | "SCHEDULED") => {
    if (!caption.trim()) {
      setError("Caption is required");
      return;
    }
    if (status === "SCHEDULED" && !scheduledAt) {
      setError("Please set a schedule date and time");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        caption,
        hashtags: hashtags || null,
        postType,
        mediaUrls,
        mediaPaths: [],
        accountId: accountId || null,
        campaignId: campaignId || null,
        scheduledAt: scheduledAt || null,
        status,
        aiGenerated: aiTopic.length > 0,
        aiPrompt: aiTopic || null,
      };

      const url = editId ? `/api/admin/social/posts/${editId}` : "/api/admin/social/posts";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(status === "SCHEDULED" ? "Post scheduled!" : "Post saved as draft!");
        setTimeout(() => router.push("/admin/social"), 1500);
      }
    } catch {
      setError("Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (!caption.trim()) { setError("Caption is required"); return; }
    if (!accountId) { setError("Please select a social account first"); return; }

    setPublishing(true);
    setError(null);
    try {
      // Save first
      const body = {
        caption,
        hashtags: hashtags || null,
        postType,
        mediaUrls,
        mediaPaths: [],
        accountId,
        campaignId: campaignId || null,
        status: "DRAFT",
        aiGenerated: aiTopic.length > 0,
        aiPrompt: aiTopic || null,
      };

      const saveUrl = editId ? `/api/admin/social/posts/${editId}` : "/api/admin/social/posts";
      const saveMethod = editId ? "PUT" : "POST";

      const saveRes = await fetch(saveUrl, {
        method: saveMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const saveData = await saveRes.json();
      const postId = editId || saveData.post?.id;

      if (!postId) { setError("Failed to save post before publishing"); setPublishing(false); return; }

      // Then publish
      const pubRes = await fetch(`/api/admin/social/posts/${postId}/publish`, { method: "POST" });
      const pubData = await pubRes.json();

      if (pubData.success) {
        setSuccess("Post published to Instagram!");
        setTimeout(() => router.push("/admin/social"), 2000);
      } else {
        setError(pubData.error || "Publishing failed");
      }
    } catch {
      setError("Publishing error");
    } finally {
      setPublishing(false);
    }
  };

  // Caption preview with hashtags
  const fullPreview = hashtags
    ? `${caption}\n\n${hashtags.split(",").map(h => `#${h.trim().replace(/^#/, "")}`).join(" ")}`
    : caption;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/social">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{editId ? "Edit Post" : "Create Post"}</h1>
          <p className="text-sm text-muted-foreground">Compose and schedule Instagram content</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI Assistant */}
          <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                AI Content Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Speak or type your topic... e.g. Benefits of custom insoles for runners"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    className="bg-white dark:bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => isListening && voiceField === "topic" ? stopVoice() : startVoice("topic")}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${isListening && voiceField === "topic" ? "bg-red-100 text-red-600 animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                    title={isListening && voiceField === "topic" ? "Stop recording" : "Speak your topic"}
                  >
                    {isListening && voiceField === "topic" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger className="w-[130px] bg-white dark:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional yet friendly">Professional</SelectItem>
                    <SelectItem value="casual and fun">Casual</SelectItem>
                    <SelectItem value="educational and informative">Educational</SelectItem>
                    <SelectItem value="inspiring and motivational">Inspirational</SelectItem>
                    <SelectItem value="urgent promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={aiLang} onValueChange={setAiLang}>
                  <SelectTrigger className="w-[100px] bg-white dark:bg-background">
                    <Globe className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-GB">English</SelectItem>
                    <SelectItem value="pt-BR">Português</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={generateCaption} disabled={aiGenerating} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                  {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Generate Caption
                </Button>
                <Button variant="outline" onClick={generateHashtags} disabled={aiHashtagsGenerating} className="gap-2">
                  {aiHashtagsGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                  Hashtags
                </Button>
                <Button variant="outline" onClick={generateAiImage} disabled={aiImageGenerating} className="gap-2">
                  {aiImageGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  AI Image
                </Button>
                {caption && (
                  <Button variant="outline" onClick={improveCaption} disabled={aiGenerating} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Improve
                  </Button>
                )}
              </div>

              {/* Import from Blog */}
              <div className="border-t pt-3">
                <button
                  onClick={() => { setBlogOpen(!blogOpen); if (!blogOpen && blogArticles.length === 0) fetchBlogArticles(); }}
                  className="flex items-center gap-2 text-sm font-medium text-[#1a6b6b] hover:text-[#5dc9c0] transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Import from Blog Article
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${blogOpen ? "rotate-180" : ""}`} />
                </button>

                {blogOpen && (
                  <div className="mt-3 border rounded-xl overflow-hidden bg-white dark:bg-background">
                    <div className="p-3 border-b bg-muted/30">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search published articles..."
                          value={blogSearch}
                          onChange={(e) => setBlogSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y">
                      {blogArticles
                        .filter((a) => !blogSearch || a.title.toLowerCase().includes(blogSearch.toLowerCase()))
                        .map((article) => (
                          <div key={article.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                            {article.imageUrl ? (
                              <img src={article.imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">{article.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{article.excerpt}</p>
                            </div>
                            <button
                              onClick={() => importFromBlog(article)}
                              disabled={blogImporting === article.id}
                              className="shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                              style={{ background: "linear-gradient(135deg,#5dc9c0 0%,#1a6b6b 100%)" }}
                            >
                              {blogImporting === article.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="h-3 w-3" />
                              )}
                              Use
                            </button>
                          </div>
                        ))}
                      {blogArticles.filter((a) => !blogSearch || a.title.toLowerCase().includes(blogSearch.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          {blogArticles.length === 0 ? "No published articles found" : "No articles match your search"}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="caption" className="text-sm font-medium">Caption</Label>
              <button
                type="button"
                onClick={() => isListening && voiceField === "caption" ? stopVoice() : startVoice("caption")}
                className={`p-1.5 rounded-full transition-colors ${isListening && voiceField === "caption" ? "bg-red-100 text-red-600 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                title={isListening && voiceField === "caption" ? "Stop" : "Dictate caption"}
              >
                {isListening && voiceField === "caption" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
            <Textarea
              id="caption"
              placeholder="Write or dictate your Instagram caption..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{caption.length} characters</p>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label htmlFor="hashtags" className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" /> Hashtags
            </Label>
            <Textarea
              id="hashtags"
              placeholder="footcare, physiotherapy, insoles, rehabilitation..."
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. {hashtags ? hashtags.split(",").filter(h => h.trim()).length : 0} hashtags
            </p>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Images
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <div className="flex gap-2 flex-wrap">
              {mediaPreviews.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:border-primary/50 transition-colors"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-[10px] text-slate-400 mt-1">Upload</span>
              </button>
              <button
                onClick={generateAiImage}
                disabled={aiImageGenerating}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-violet-300 flex flex-col items-center justify-center hover:border-violet-500 transition-colors bg-violet-50/50 dark:bg-violet-950/20"
              >
                {aiImageGenerating ? <Loader2 className="h-5 w-5 text-violet-400 animate-spin" /> : <ImagePlus className="h-5 w-5 text-violet-400" />}
                <span className="text-[10px] text-violet-400 mt-1">AI Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Right col */}
        <div className="space-y-5">
          {/* Account & Campaign */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <span className="flex items-center gap-2">
                          <Instagram className="h-3 w-3" /> @{acc.accountName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Campaign (optional)</Label>
                <Select value={campaignId || "none"} onValueChange={v => setCampaignId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No campaign</SelectItem>
                    {campaigns.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Post Type</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMAGE">Single Image</SelectItem>
                    <SelectItem value="CAROUSEL">Carousel</SelectItem>
                    <SelectItem value="REEL">Reel</SelectItem>
                    <SelectItem value="STORY">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <Label className="text-xs font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Schedule
              </Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-[10px] text-muted-foreground">Leave empty to save as draft or publish now</p>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                {/* IG Header */}
                <div className="flex items-center gap-2 p-2 border-b">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Instagram className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold">
                    {accounts.find(a => a.id === accountId)?.accountName || "your_account"}
                  </span>
                </div>
                {/* Image */}
                {mediaPreviews[0] ? (
                  <img src={mediaPreviews[0]} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-slate-100 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-slate-300" />
                  </div>
                )}
                {/* Caption preview */}
                <div className="p-2">
                  <p className="text-[11px] whitespace-pre-wrap line-clamp-4">{fullPreview || "Your caption will appear here..."}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full gap-2"
              onClick={publishNow}
              disabled={publishing || !caption || !accountId}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish Now
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => savePost("SCHEDULED")}
              disabled={saving || !caption}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Schedule
            </Button>
            <Button
              variant="ghost"
              className="w-full gap-2"
              onClick={() => savePost("DRAFT")}
              disabled={saving || !caption}
            >
              <Save className="h-4 w-4" /> Save Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <CreatePostContent />
    </Suspense>
  );
}
