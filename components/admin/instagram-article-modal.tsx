"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Instagram, X, Wand2, Send, Clock, Loader2, CheckCircle,
  AlertCircle, MessageSquare, Image as ImageIcon, Type,
  Download, RefreshCw, Sparkles, ChevronDown, ChevronUp, Film,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import InstagramKenBurns from "./instagram-ken-burns";

interface Article {
  id: string; title: string; slug: string; excerpt: string;
  imageUrl?: string; published: boolean; createdAt: string;
  author: { firstName: string; lastName: string };
}
interface ChatMessage { role: "user" | "assistant"; content: string; }
interface TextOverlay {
  text: string; font: string; size: number; color: string;
  x: number; y: number; bold: boolean; italic: boolean; shadow: boolean;
  align: "left" | "center" | "right";
}

const FONTS = [
  { label: "Sans Serif", value: "Arial, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Bold Block", value: "Impact, sans-serif" },
  { label: "Modern", value: "'Helvetica Neue', sans-serif" },
  { label: "Mono", value: "'Courier New', monospace" },
];

export default function InstagramArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [caption, setCaption] = useState("");
  const [igLocale, setIgLocale] = useState<"en-GB" | "pt-BR">("en-GB");
  const [igGenerating, setIgGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>(article.imageUrl || "");
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [overlay, setOverlay] = useState<TextOverlay>({
    text: "", font: "Arial, sans-serif", size: 36, color: "#ffffff",
    x: 50, y: 80, bold: true, italic: false, shadow: true, align: "center",
  });
  const [composedImage, setComposedImage] = useState<string>("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: `Hi! I've read the full article "${article.title}". Ask me to improve the caption, suggest hashtags, change tone, or anything else!` },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [imageTab, setImageTab] = useState<"photo" | "animation">("photo");
  const [igMode, setIgMode] = useState<"now" | "schedule">("now");
  const [igScheduledAt, setIgScheduledAt] = useState("");
  const [igPublishing, setIgPublishing] = useState(false);
  const [igResult, setIgResult] = useState<{ success?: boolean; error?: string; permalink?: string } | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = 1080; canvas.height = 1080;
      ctx.drawImage(img, 0, 0, 1080, 1080);
      const drawText = () => {
        if (overlay.text) {
          ctx.font = `${overlay.italic ? "italic " : ""}${overlay.bold ? "bold " : ""}${overlay.size}px ${overlay.font}`;
          ctx.textAlign = overlay.align;
          ctx.fillStyle = overlay.color;
          if (overlay.shadow) { ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; }
          const xPx = (overlay.x / 100) * 1080;
          let yPx = (overlay.y / 100) * 1080;
          const words = overlay.text.split(" "); let line = "";
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            if (ctx.measureText(testLine).width > 900 && n > 0) { ctx.fillText(line.trim(), xPx, yPx); line = words[n] + " "; yPx += overlay.size * 1.3; }
            else line = testLine;
          }
          ctx.fillText(line.trim(), xPx, yPx);
          ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
        }
        setComposedImage(canvas.toDataURL("image/jpeg", 0.92));
      };
      const logo = new window.Image();
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const lw = 160; const lh = (logo.height / logo.width) * lw;
        ctx.globalAlpha = 0.85; ctx.drawImage(logo, 1080 - lw - 20, 1080 - lh - 20, lw, lh); ctx.globalAlpha = 1;
        drawText();
      };
      logo.onerror = drawText;
      logo.src = "/logo.png";
    };
    img.onerror = () => setComposedImage("");
    img.src = currentImage;
  }, [currentImage, overlay]);

  useEffect(() => { if (showImageEditor) drawCanvas(); }, [showImageEditor, drawCanvas]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const generateCaption = async () => {
    setIgGenerating(true);
    try {
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_caption", articleId: article.id, language: igLocale }),
      });
      const data = await res.json();
      if (data.caption) { setCaption(data.caption); toast({ title: "Caption generated from full article!" }); }
      else toast({ title: "Error", description: data.error || "Failed", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to generate caption", variant: "destructive" }); }
    finally { setIgGenerating(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_chat", articleId: article.id, messages: newMessages }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't respond.";
      setChatMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Error connecting to AI." }]); }
    finally { setChatLoading(false); }
  };

  const applyLastChatAsCaption = () => {
    const last = [...chatMessages].reverse().find(m => m.role === "assistant" && m.content.length > 80);
    if (last) { setCaption(last.content); toast({ title: "Caption applied from chat!" }); }
  };

  const generateAiImage = async () => {
    setAiImageGenerating(true);
    try {
      const res = await fetch("/api/admin/settings/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Professional physiotherapy clinic Instagram post for: "${article.title}". Clean, modern, medical setting.`, aspectRatio: "1:1", section: "instagram-article" }),
      });
      const data = await res.json();
      if (data.imageUrl) { setCurrentImage(data.imageUrl); toast({ title: "AI image generated!" }); }
      else toast({ title: "Error", description: data.error || "Unavailable", variant: "destructive" });
    } catch { toast({ title: "Error", description: "AI image generation failed", variant: "destructive" }); }
    finally { setAiImageGenerating(false); }
  };

  const publishToInstagram = async () => {
    if (!caption.trim()) { toast({ title: "Caption required", variant: "destructive" }); return; }
    setIgPublishing(true); setIgResult(null);
    try {
      const imageToUse = composedImage || currentImage || "";
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: igMode === "now" ? "publish" : "schedule", articleId: article.id, caption, imageUrls: imageToUse ? [imageToUse] : [], scheduledAt: igMode === "schedule" ? igScheduledAt : undefined }),
      });
      const data = await res.json();
      if (data.success) { setIgResult({ success: true, permalink: data.permalink }); toast({ title: igMode === "now" ? "Published! 🎉" : "Scheduled! ✅" }); }
      else setIgResult({ error: data.error || "Failed" });
    } catch { setIgResult({ error: "Failed to publish" }); }
    finally { setIgPublishing(false); }
  };

  const previewImage = composedImage || currentImage;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-4 pb-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl mx-4 my-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Post to Instagram</h2>
              <p className="text-xs text-muted-foreground line-clamp-1">{article.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {igResult?.success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">{igMode === "now" ? "Published! 🎉" : "Scheduled! ✅"}</p>
                {igResult.permalink && <a href={igResult.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 underline">View on Instagram →</a>}
              </div>
            </div>
          )}
          {igResult?.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{igResult.error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT: Image */}
            <div className="space-y-3">
              {/* Image / Animation tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-xl">
                <button
                  onClick={() => setImageTab("photo")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    imageTab === "photo" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Photo / Image
                </button>
                <button
                  onClick={() => setImageTab("animation")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    imageTab === "animation" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Film className="h-3.5 w-3.5" /> Ken Burns Video
                </button>
              </div>

              {imageTab === "animation" && (
                <InstagramKenBurns
                  imageUrl={composedImage || currentImage}
                  overlay={overlay}
                  logoUrl="/logo.png"
                />
              )}

              {imageTab === "photo" && (<>
              <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="flex items-center gap-2 p-3 border-b">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f09433] to-[#bc1888] flex items-center justify-center">
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">brunophysicalrehab</span>
                </div>
                {previewImage ? (
                  <img src={previewImage} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-slate-100 flex flex-col items-center justify-center gap-2">
                    <ImageIcon className="h-14 w-14 text-slate-300" />
                    <p className="text-xs text-slate-400">No image selected</p>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-[11px] text-slate-700 line-clamp-3 whitespace-pre-wrap">{caption || "Caption will appear here..."}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors font-medium">
                  <ImageIcon className="h-3.5 w-3.5" /> Upload
                </button>
                <button onClick={generateAiImage} disabled={aiImageGenerating} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors font-medium">
                  {aiImageGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI Image
                </button>
                <button onClick={() => { setShowImageEditor(!showImageEditor); if (!showImageEditor && currentImage) setTimeout(drawCanvas, 100); }} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors font-medium ${showImageEditor ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "hover:bg-muted"}`}>
                  <Type className="h-3.5 w-3.5" /> Add Text {showImageEditor ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {composedImage && (
                  <button onClick={() => { const a = document.createElement("a"); a.href = composedImage; a.download = `ig-${article.slug}.jpg`; a.click(); }} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors font-medium">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCurrentImage(URL.createObjectURL(f)); e.target.value = ""; } }} />

              {showImageEditor && (
                <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                  <p className="text-xs font-semibold flex items-center gap-1.5"><Type className="h-3.5 w-3.5" /> Text Overlay + Logo Watermark</p>
                  <input type="text" value={overlay.text} onChange={e => setOverlay(o => ({ ...o, text: e.target.value }))} placeholder="e.g. Book Your Assessment Today" className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Font</label>
                      <select value={overlay.font} onChange={e => setOverlay(o => ({ ...o, font: e.target.value }))} className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background">
                        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Size: {overlay.size}px</label>
                      <input type="range" min="16" max="120" value={overlay.size} onChange={e => setOverlay(o => ({ ...o, size: parseInt(e.target.value) }))} className="w-full mt-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Colour</label>
                      <input type="color" value={overlay.color} onChange={e => setOverlay(o => ({ ...o, color: e.target.value }))} className="w-full mt-1 h-9 rounded-lg border cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">X: {overlay.x}%</label>
                      <input type="range" min="5" max="95" value={overlay.x} onChange={e => setOverlay(o => ({ ...o, x: parseInt(e.target.value) }))} className="w-full mt-2" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Y: {overlay.y}%</label>
                      <input type="range" min="5" max="95" value={overlay.y} onChange={e => setOverlay(o => ({ ...o, y: parseInt(e.target.value) }))} className="w-full mt-2" />
                    </div>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {[["bold", "Bold", "font-bold"], ["italic", "Italic", "italic"], ["shadow", "Shadow", ""]].map(([key, label, cls]) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={(overlay as any)[key]} onChange={e => setOverlay(o => ({ ...o, [key]: e.target.checked }))} className="rounded" />
                        <span className={cls}>{label}</span>
                      </label>
                    ))}
                    <div className="flex gap-1 ml-auto">
                      {(["left", "center", "right"] as const).map(a => (
                        <button key={a} onClick={() => setOverlay(o => ({ ...o, align: a }))} className={`text-[10px] px-2 py-1 rounded border font-medium ${overlay.align === a ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "border-gray-200"}`}>{a[0].toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={drawCanvas} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#5dc9c0 0%,#1a6b6b 100%)" }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Apply to Image
                  </button>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
              </>)}
            </div>

            {/* RIGHT: Caption + Chat + Publish */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Caption</label>
                  <div className="flex gap-1">
                    {(["en-GB", "pt-BR"] as const).map(lang => (
                      <button key={lang} onClick={() => setIgLocale(lang)} className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-all ${igLocale === lang ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "border-gray-200 text-muted-foreground"}`}>
                        {lang === "en-GB" ? "🇬🇧 EN" : "🇧🇷 PT"}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={generateCaption} disabled={igGenerating} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors">
                  {igGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {igGenerating ? "Reading full article & generating..." : "AI Generate Caption"}
                </button>
                <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={8} placeholder="Write or generate a caption..." className="text-xs resize-none" />
                <p className="text-[10px] text-muted-foreground text-right">{caption.length}/2200</p>
              </div>

              {/* AI Chat */}
              <div className="border rounded-xl overflow-hidden">
                <button onClick={() => setChatOpen(!chatOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 hover:from-violet-100 hover:to-purple-100 transition-colors">
                  <span className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-300">
                    <MessageSquare className="h-4 w-4" /> AI Chat Assistant
                    <span className="text-[10px] font-normal text-violet-500">refine your caption</span>
                  </span>
                  {chatOpen ? <ChevronUp className="h-4 w-4 text-violet-600" /> : <ChevronDown className="h-4 w-4 text-violet-600" />}
                </button>
                {chatOpen && (
                  <div>
                    <div className="h-48 overflow-y-auto p-3 space-y-2 bg-muted/10">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-[#5dc9c0] text-white" : "bg-white dark:bg-muted border text-foreground"}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white dark:bg-muted border rounded-xl px-3 py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-2 border-t flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendChat()}
                        placeholder="Ask AI to improve caption, add hashtags..."
                        className="flex-1 px-3 py-1.5 text-xs border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                      />
                      <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50 hover:opacity-90" style={{ background: "linear-gradient(135deg,#5dc9c0 0%,#1a6b6b 100%)" }}>
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="px-3 pb-2">
                      <button onClick={applyLastChatAsCaption} className="text-[10px] text-[#1a6b6b] underline hover:no-underline">Use last AI response as caption</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Publish mode */}
              <div className="flex gap-2">
                <button onClick={() => setIgMode("now")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all ${igMode === "now" ? "border-[#e1306c] bg-[#e1306c]/5 text-[#e1306c]" : "border-gray-200 text-muted-foreground hover:border-gray-300"}`}>
                  <Send className="h-3.5 w-3.5" /> Publish Now
                </button>
                <button onClick={() => setIgMode("schedule")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all ${igMode === "schedule" ? "border-[#5dc9c0] bg-[#5dc9c0]/5 text-[#1a6b6b]" : "border-gray-200 text-muted-foreground hover:border-gray-300"}`}>
                  <Clock className="h-3.5 w-3.5" /> Schedule
                </button>
              </div>
              {igMode === "schedule" && (
                <input type="datetime-local" value={igScheduledAt} onChange={e => setIgScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              )}

              <button onClick={publishToInstagram} disabled={igPublishing || !caption.trim()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
                {igPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : igMode === "now" ? <Send className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {igPublishing ? "Publishing..." : igMode === "now" ? "Publish to Instagram" : "Schedule Post"}
              </button>
              <p className="text-[10px] text-muted-foreground text-center">Requires Instagram Business account in Admin → API & AI Settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
