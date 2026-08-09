"use client";

import { useState, useRef, useEffect } from "react";
import {
  Instagram, X, Wand2, Send, Clock, Loader2, CheckCircle,
  AlertCircle, MessageSquare, Image as ImageIcon, Type,
  Download, Sparkles, ChevronDown, ChevronUp, Film, ExternalLink, Facebook, ZoomIn,
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
  { label: "Poppins Bold", value: "'Poppins', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Sans Serif", value: "Arial, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Bold Block", value: "Impact, sans-serif" },
  { label: "Modern", value: "'Helvetica Neue', sans-serif" },
  { label: "Mono", value: "'Courier New', monospace" },
];

type ImageFormat = "square" | "portrait" | "story";
const FORMAT_DIMS: Record<ImageFormat, [number, number]> = {
  square: [1080, 1080],   // Feed 1:1
  portrait: [1080, 1350], // Feed 4:5 — Instagram's recommended, taller feed format
  story: [1080, 1920],    // Stories/Reels 9:16
};
const FORMAT_ASPECT: Record<ImageFormat, string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  story: "aspect-[9/16]",
};

// Renders `src` into the target format, cover-cropped (fills the frame,
// centred overflow trimmed — no letterboxing), with the clinic logo
// watermark (unless disabled) and any text overlay baked in. Self-contained
// (creates its own offscreen canvas) so it can be called for a different
// format than whatever the live preview is showing — e.g. Stories always
// render at 9:16 even if the visible preview is set to Square.
async function renderComposedImage(
  fmt: ImageFormat,
  src: string,
  ov: TextOverlay,
  withLogo: boolean,
  logoPos: { x: number; y: number } = { x: 90, y: 90 },
  zoom: number = 1,
  pan: { x: number; y: number } = { x: 50, y: 50 }
): Promise<string> {
  const [W, H] = FORMAT_DIMS[fmt];
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Cover-fit crop: fill the target frame, then let zoom/pan pick which
      // part of the source shows through. pan 50/50 + zoom 1 reproduces the
      // old always-centred behaviour exactly.
      const srcRatio = img.width / img.height;
      const dstRatio = W / H;
      let baseSw = img.width, baseSh = img.height;
      if (srcRatio > dstRatio) baseSw = img.height * dstRatio;
      else baseSh = img.width / dstRatio;
      const z = Math.max(1, zoom);
      const sw = baseSw / z, sh = baseSh / z;
      const maxX = img.width - sw, maxY = img.height - sh;
      const sx = maxX * (pan.x / 100);
      const sy = maxY * (pan.y / 100);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

      const finish = () => {
        if (ov.text) {
          ctx.font = `${ov.italic ? "italic " : ""}${ov.bold ? "bold " : ""}${ov.size}px ${ov.font}`;
          ctx.textAlign = ov.align;
          ctx.fillStyle = ov.color;
          if (ov.shadow) { ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 10; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; }
          const xPx = (ov.x / 100) * W;
          const centreY = (ov.y / 100) * H;
          const maxWidth = W * 0.85;
          const words = ov.text.split(" ");
          const lines: string[] = [];
          let line = "";
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            if (ctx.measureText(testLine).width > maxWidth && n > 0) { lines.push(line.trim()); line = words[n] + " "; }
            else line = testLine;
          }
          lines.push(line.trim());
          const lineHeight = ov.size * 1.3;
          const startY = centreY - ((lines.length - 1) * lineHeight) / 2;
          lines.forEach((l, i) => ctx.fillText(l, xPx, startY + i * lineHeight));
          ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
        }
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };

      if (withLogo) {
        const logo = new window.Image();
        logo.crossOrigin = "anonymous";
        logo.onload = () => {
          const lw = W * 0.15;
          const lh = (logo.height / logo.width) * lw;
          const lx = (logoPos.x / 100) * W - lw / 2;
          const ly = (logoPos.y / 100) * H - lh / 2;
          ctx.globalAlpha = 0.85;
          ctx.drawImage(logo, lx, ly, lw, lh);
          ctx.globalAlpha = 1;
          finish();
        };
        logo.onerror = finish;
        logo.src = "/logo.png";
      } else {
        finish();
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export default function InstagramArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [caption, setCaption] = useState("");
  const [igLocale, setIgLocale] = useState<"en-GB" | "pt-BR">("en-GB");
  const [igGenerating, setIgGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>(article.imageUrl || "");
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [overlay, setOverlay] = useState<TextOverlay>({
    text: "", font: "'Poppins', sans-serif", size: 40, color: "#ffffff",
    x: 50, y: 80, bold: true, italic: false, shadow: true, align: "center",
  });
  const [composedImage, setComposedImage] = useState<string>("");
  const [format, setFormat] = useState<ImageFormat>("portrait");
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [logoPos, setLogoPos] = useState({ x: 90, y: 90 });
  const [zoom, setZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 50, y: 50 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [dragTarget, setDragTarget] = useState<"text" | "logo" | "image" | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
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
  const [igResult, setIgResult] = useState<{ success?: boolean; error?: string; permalink?: string; facebook_post_id?: string; facebook_error?: string } | null>(null);
  const [publishFacebook, setPublishFacebook] = useState(true);
  const [reelBlob, setReelBlob] = useState<Blob | null>(null);
  const [reelPublishing, setReelPublishing] = useState(false);
  const [reelResult, setReelResult] = useState<{ success?: boolean; error?: string; permalink?: string } | null>(null);
  const [storyPublishing, setStoryPublishing] = useState(false);
  const [storyResult, setStoryResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [igUsername, setIgUsername] = useState<string>("your_instagram");
  const [linkCopied, setLinkCopied] = useState(false);
  const articleUrl = typeof window !== "undefined" ? `${window.location.origin}/articles/${article.slug}` : `/articles/${article.slug}`;

  useEffect(() => {
    fetch("/api/admin/social/accounts")
      .then(res => res.json())
      .then(data => {
        const ig = (data.accounts || []).find((a: any) => a.platform === "INSTAGRAM");
        if (ig?.accountName) setIgUsername(ig.accountName);
      })
      .catch(() => {});
  }, []);

  // Uploads a data:/blob: URL (canvas output, local file picker) to the
  // server and returns a real hosted URL. Without this, sending a
  // composedImage (from "Add Text") or a locally-picked file straight to
  // the publish endpoint sent Instagram an unfetchable data:/blob: URL —
  // the post/story would either fail or silently fall back to no image.
  async function uploadDataUrl(dataUrl: string, filename: string): Promise<string> {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: mime });
    const form = new FormData();
    form.append("file", blob, filename);
    form.append("category", "article");
    const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
    const uploadData = await uploadRes.json();
    const uploaded = uploadData.image?.imageUrl || uploadData.url;
    if (!uploaded) throw new Error("Failed to upload image");
    return uploaded.startsWith("http") ? uploaded : `${window.location.origin}${uploaded}`;
  }

  async function ensureHostedUrl(url: string, filenamePrefix: string): Promise<string> {
    if (!url) return url;
    if (url.startsWith("data:")) return uploadDataUrl(url, `${filenamePrefix}-${Date.now()}.jpg`);
    if (url.startsWith("blob:")) {
      const blobData = await fetch(url).then(r => r.blob());
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blobData);
      });
      return uploadDataUrl(dataUrl, `${filenamePrefix}-${Date.now()}.jpg`);
    }
    return url.startsWith("http") ? url : `${window.location.origin}${url}`;
  }

  // Load the display fonts once (canvas text needs the font actually loaded
  // before it can render it — a plain <link> in <head> isn't enough timing-
  // wise for a canvas draw that can happen immediately on mount).
  useEffect(() => {
    if (document.getElementById("ig-composer-fonts")) return;
    const link = document.createElement("link");
    link.id = "ig-composer-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Playfair+Display:wght@700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Recompose whenever the image, chosen format, text overlay, watermark
  // toggle, or the photo's own zoom/pan change — the logo watermark is
  // always baked in (unless turned off), not just when the "Add Text"
  // panel happens to be open.
  useEffect(() => {
    if (!currentImage) { setComposedImage(""); return; }
    let cancelled = false;
    document.fonts?.load?.(`700 40px ${overlay.font}`).catch(() => {}).finally(() => {
      renderComposedImage(format, currentImage, overlay, logoEnabled, logoPos, zoom, imagePan)
        .then((url) => { if (!cancelled) setComposedImage(url); })
        .catch(() => { if (!cancelled) setComposedImage(""); });
    });
    return () => { cancelled = true; };
  }, [currentImage, format, overlay, logoEnabled, logoPos, zoom, imagePan]);

  // Track the raw photo's natural pixel size (needed to convert on-screen
  // drag distance into an accurate pan offset) whenever the source photo
  // changes — also reset zoom/pan back to centred defaults for the new photo.
  useEffect(() => {
    setZoom(1);
    setImagePan({ x: 50, y: 50 });
    if (!currentImage) { setNaturalSize(null); return; }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => { if (!cancelled) setNaturalSize({ w: img.width, h: img.height }); };
    img.src = currentImage;
    return () => { cancelled = true; };
  }, [currentImage]);

  // ── Drag-to-position for the text overlay and logo watermark ──
  // While dragging, the interactive HTML layer (rendered in the preview
  // below) moves instantly; the canvas-composed preview above catches up
  // via the effect once overlay/logoPos settle.
  useEffect(() => {
    if (!dragTarget) return;
    const box = previewBoxRef.current;
    if (!box) return;

    const move = (clientX: number, clientY: number) => {
      const rect = box.getBoundingClientRect();
      if (dragTarget === "image") {
        if (!dragStartRef.current || !naturalSize) return;
        // Convert screen-pixel drag distance into a pan-percent delta using
        // the same cover-fit math as renderComposedImage, so 1px of drag
        // moves the photo by exactly 1 displayed pixel.
        const [Wf, Hf] = FORMAT_DIMS[format];
        const dstRatio = Wf / Hf;
        const srcRatio = naturalSize.w / naturalSize.h;
        let baseSw = naturalSize.w, baseSh = naturalSize.h;
        if (srcRatio > dstRatio) baseSw = naturalSize.h * dstRatio;
        else baseSh = naturalSize.w / dstRatio;
        const z = Math.max(1, zoom);
        const sw = baseSw / z, sh = baseSh / z;
        const maxX = naturalSize.w - sw, maxY = naturalSize.h - sh;
        const dxSourcePx = (clientX - dragStartRef.current.x) * (sw / rect.width);
        const dySourcePx = (clientY - dragStartRef.current.y) * (sh / rect.height);
        const dxPct = maxX > 0 ? (dxSourcePx / maxX) * 100 : 0;
        const dyPct = maxY > 0 ? (dySourcePx / maxY) * 100 : 0;
        const newX = Math.min(100, Math.max(0, dragStartRef.current.panX - dxPct));
        const newY = Math.min(100, Math.max(0, dragStartRef.current.panY - dyPct));
        setImagePan({ x: newX, y: newY });
        return;
      }
      const xPct = Math.min(97, Math.max(3, ((clientX - rect.left) / rect.width) * 100));
      const yPct = Math.min(97, Math.max(3, ((clientY - rect.top) / rect.height) * 100));
      if (dragTarget === "text") setOverlay(o => ({ ...o, x: xPct, y: yPct }));
      else setLogoPos({ x: xPct, y: yPct });
    };
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY); };
    const stop = () => setDragTarget(null);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };
  }, [dragTarget]);

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
        body: JSON.stringify({
          prompt: `Professional physiotherapy clinic Instagram post about "${article.title}". Context: ${article.excerpt || "physical rehabilitation and recovery"}. Photorealistic, clean, modern medical/wellness setting relevant to this specific topic, no text overlay.`,
          aspectRatio: "1:1",
          section: "instagram-article",
        }),
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
      const imageToUse = await ensureHostedUrl(composedImage || currentImage || "", "ig-post");
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: igMode === "now" ? "publish" : "schedule", articleId: article.id, caption, imageUrls: imageToUse ? [imageToUse] : [], scheduledAt: igMode === "schedule" ? igScheduledAt : undefined, publishToFacebook: publishFacebook }),
      });
      const data = await res.json();
      if (data.success) {
        setIgResult({ success: true, permalink: data.permalink, facebook_post_id: data.facebook_post_id, facebook_error: data.facebook_error });
        toast({ title: data.facebook_post_id ? "Published to Instagram + Facebook! 🎉" : igMode === "now" ? "Published to Instagram! 🎉" : "Scheduled! ✅" });
      } else setIgResult({ error: data.error || "Failed" });
    } catch { setIgResult({ error: "Failed to publish" }); }
    finally { setIgPublishing(false); }
  };

  const publishAsStory = async () => {
    if (!currentImage) { toast({ title: "Select an image first", variant: "destructive" }); return; }
    setStoryPublishing(true); setStoryResult(null);
    try {
      // Always render at true 9:16 from the source image — regardless of
      // whichever format is currently selected for the feed preview — with
      // the same text/logo overlay settings baked in, then upload. Sending
      // the raw square image let Instagram auto-crop it, and a data:/blob:
      // URL was never fetchable by Instagram at all.
      const storyCanvasDataUrl = await renderComposedImage("story", currentImage, overlay, logoEnabled, logoPos, zoom, imagePan);
      const hostedStoryUrl = await uploadDataUrl(storyCanvasDataUrl, "ig-story");
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", articleId: article.id, postType: "STORY", imageUrls: [hostedStoryUrl] }),
      });
      const data = await res.json();
      if (data.success) { setStoryResult({ success: true }); toast({ title: "Published to Instagram Stories! 🎉" }); }
      else setStoryResult({ error: data.error || "Failed" });
    } catch (e: any) { setStoryResult({ error: e?.message || "Failed to publish Story" }); }
    finally { setStoryPublishing(false); }
  };

  const publishAsReel = async () => {
    if (!reelBlob) { toast({ title: "Export the video first", variant: "destructive" }); return; }
    if (!caption.trim()) { toast({ title: "Caption required", variant: "destructive" }); return; }
    setReelPublishing(true); setReelResult(null);
    try {
      const fd = new FormData();
      fd.append("video", reelBlob, "reel.webm");
      fd.append("caption", caption);
      const res = await fetch("/api/admin/social/publish-reel", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setReelResult({ success: true, permalink: data.permalink });
        toast({ title: "Published as Reel! 🎬" });
      } else setReelResult({ error: data.error || "Failed" });
    } catch { setReelResult({ error: "Failed to publish Reel" }); }
    finally { setReelPublishing(false); }
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
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-400">
                  {igResult.facebook_post_id ? 'Published to Instagram + Facebook! 🎉' : igMode === "now" ? "Published to Instagram! 🎉" : "Scheduled! ✅"}
                </p>
                {igResult.permalink && <a href={igResult.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 underline block">View on Instagram →</a>}
                {igResult.facebook_post_id && <p className="text-xs text-blue-400">✓ Also posted to Facebook Page</p>}
                {igResult.facebook_error && <p className="text-xs text-amber-400">⚠ Facebook: {igResult.facebook_error}</p>}
              </div>
            </div>
          )}
          {igResult?.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{igResult.error}</p>
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
                    imageTab === "photo" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Photo / Image
                </button>
                <button
                  onClick={() => setImageTab("animation")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    imageTab === "animation" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Film className="h-3.5 w-3.5" /> Ken Burns Video
                </button>
              </div>

              {imageTab === "animation" && (
                <div className="space-y-3">
                  <InstagramKenBurns
                    imageUrl={composedImage || currentImage}
                    overlay={overlay}
                    logoUrl="/logo.png"
                    onVideoReady={(_url, blob) => { setReelBlob(blob); setReelResult(null); }}
                  />
                  {reelBlob && (
                    <div className="space-y-2 pt-2 border-t">
                      <button
                        onClick={publishAsReel}
                        disabled={reelPublishing || !caption.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                        style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}
                      >
                        {reelPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                        {reelPublishing ? "Converting & publishing…" : "Publish as Reel"}
                      </button>
                      {!caption.trim() && <p className="text-[11px] text-muted-foreground text-center">Write a caption below first.</p>}
                      {reelResult?.success && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5 justify-center">
                          <CheckCircle className="h-3.5 w-3.5" /> Published!{" "}
                          {reelResult.permalink && <a href={reelResult.permalink} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">View <ExternalLink className="h-3 w-3" /></a>}
                        </p>
                      )}
                      {reelResult?.error && (
                        <p className="text-xs text-red-600 flex items-center gap-1.5 justify-center"><AlertCircle className="h-3.5 w-3.5" /> {reelResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {imageTab === "photo" && (<>
              {/* Format picker — the image is cropped to fill whichever frame is picked, no letterboxing */}
              <div className="flex gap-1.5">
                {([
                  { key: "square", label: "Square 1:1" },
                  { key: "portrait", label: "Portrait 4:5" },
                  { key: "story", label: "Story 9:16" },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setFormat(f.key)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${format === f.key ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "border-border text-muted-foreground hover:border-[#5dc9c0]/40"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="border rounded-2xl overflow-hidden bg-neutral-900 shadow-sm">
                <div className="flex items-center gap-2 p-3 border-b border-neutral-800">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f09433] to-[#bc1888] flex items-center justify-center">
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-white">{igUsername}</span>
                </div>
                <div ref={previewBoxRef} className="relative select-none">
                  {previewImage ? (
                    <img
                      src={previewImage} alt=""
                      className={`w-full ${FORMAT_ASPECT[format]} object-cover ${naturalSize ? (dragTarget === "image" ? "cursor-grabbing" : "cursor-grab") : ""}`}
                      draggable={false}
                      onMouseDown={e => { dragStartRef.current = { x: e.clientX, y: e.clientY, panX: imagePan.x, panY: imagePan.y }; setDragTarget("image"); }}
                      onTouchStart={e => { const t = e.touches[0]; if (!t) return; dragStartRef.current = { x: t.clientX, y: t.clientY, panX: imagePan.x, panY: imagePan.y }; setDragTarget("image"); }}
                      title="Drag to reposition the photo"
                    />
                  ) : (
                    <div className={`w-full ${FORMAT_ASPECT[format]} bg-neutral-800 flex flex-col items-center justify-center gap-2`}>
                      <ImageIcon className="h-14 w-14 text-neutral-600" />
                      <p className="text-xs text-neutral-500">No image selected</p>
                    </div>
                  )}
                  {showImageEditor && previewImage && overlay.text && (
                    <div
                      onMouseDown={e => { e.stopPropagation(); setDragTarget("text"); }}
                      onTouchStart={e => { e.stopPropagation(); setDragTarget("text"); }}
                      className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-[#5dc9c0] border-2 border-white shadow-lg flex items-center justify-center touch-none ${dragTarget === "text" ? "cursor-grabbing scale-110" : "cursor-grab"} transition-transform`}
                      style={{ left: `${overlay.x}%`, top: `${overlay.y}%` }}
                      title="Drag to move the text"
                    >
                      <Type className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {showImageEditor && previewImage && logoEnabled && (
                    <div
                      onMouseDown={e => { e.stopPropagation(); setDragTarget("logo"); }}
                      onTouchStart={e => { e.stopPropagation(); setDragTarget("logo"); }}
                      className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center touch-none ${dragTarget === "logo" ? "cursor-grabbing scale-110" : "cursor-grab"} transition-transform`}
                      style={{ left: `${logoPos.x}%`, top: `${logoPos.y}%` }}
                      title="Drag to move the logo"
                    >
                      <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-3 bg-neutral-900">
                  <p className="text-[11px] text-neutral-300 line-clamp-3 whitespace-pre-wrap">{caption || "Caption will appear here..."}</p>
                </div>
              </div>

              {previewImage && (
                <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-muted/20">
                  <ZoomIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-full" />
                  <span className="text-[10px] text-muted-foreground w-9 text-right shrink-0">{Math.round(zoom * 100)}%</span>
                  {(zoom !== 1 || imagePan.x !== 50 || imagePan.y !== 50) && (
                    <button onClick={() => { setZoom(1); setImagePan({ x: 50, y: 50 }); }} className="text-[10px] px-2 py-1 rounded border hover:bg-muted transition-colors font-medium shrink-0">
                      Reset
                    </button>
                  )}
                </div>
              )}
              {previewImage && (
                <p className="text-[10px] text-muted-foreground text-center">🖐️ Drag the photo itself to reposition it, or use the zoom slider — this only changes the crop, not the original file.</p>
              )}
              {showImageEditor && (overlay.text || logoEnabled) && (
                <p className="text-[10px] text-muted-foreground text-center">🖱️ Drag the teal (text) and amber (logo) handles on the image to reposition them.</p>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors font-medium">
                  <ImageIcon className="h-3.5 w-3.5" /> Upload
                </button>
                <button onClick={generateAiImage} disabled={aiImageGenerating} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-violet-500/30 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-50 transition-colors font-medium">
                  {aiImageGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI Image
                </button>
                <button onClick={() => { const opening = !showImageEditor; setShowImageEditor(opening); if (opening && !overlay.text) setOverlay(o => ({ ...o, text: article.title })); }} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors font-medium ${showImageEditor ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "hover:bg-muted"}`}>
                  <Type className="h-3.5 w-3.5" /> Add Text {showImageEditor ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <button onClick={() => setLogoEnabled(!logoEnabled)} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors font-medium ${logoEnabled ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "hover:bg-muted text-muted-foreground"}`}>
                  {logoEnabled ? "✓" : ""} Logo Watermark
                </button>
                {composedImage && (
                  <button onClick={() => { const a = document.createElement("a"); a.href = composedImage; a.download = `ig-${article.slug}.jpg`; a.click(); }} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors font-medium">
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
                        <button key={a} onClick={() => setOverlay(o => ({ ...o, align: a }))} className={`text-[10px] px-2 py-1 rounded border font-medium ${overlay.align === a ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "border-border"}`}>{a[0].toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Updates live as you type.</p>
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
                      <button key={lang} onClick={() => setIgLocale(lang)} className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-all ${igLocale === lang ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" : "border-border text-muted-foreground"}`}>
                        {lang === "en-GB" ? "🇬🇧 EN" : "🇧🇷 PT"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 border border-border rounded-lg px-2.5 py-1.5">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-foreground hover:underline flex-1" title={articleUrl}>{articleUrl}</a>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(articleUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                    className="shrink-0 px-1.5 py-0.5 rounded border border-border hover:bg-muted font-medium text-foreground"
                  >
                    {linkCopied ? "Copied!" : "Copy link"}
                  </button>
                </div>
                <button onClick={generateCaption} disabled={igGenerating} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-50 transition-colors">
                  {igGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {igGenerating ? "Reading full article & generating..." : "AI Generate Caption"}
                </button>
                <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={8} placeholder="Write or generate a caption..." className="text-xs resize-none" />
                <p className="text-[10px] text-muted-foreground text-right">{caption.length}/2200</p>
              </div>

              {/* AI Chat */}
              <div className="border rounded-xl overflow-hidden">
                <button onClick={() => setChatOpen(!chatOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20 transition-colors">
                  <span className="flex items-center gap-2 text-sm font-semibold text-violet-400">
                    <MessageSquare className="h-4 w-4" /> AI Chat Assistant
                    <span className="text-[10px] font-normal text-violet-400/70">refine your caption</span>
                  </span>
                  {chatOpen ? <ChevronUp className="h-4 w-4 text-violet-400" /> : <ChevronDown className="h-4 w-4 text-violet-400" />}
                </button>
                {chatOpen && (
                  <div>
                    <div className="h-48 overflow-y-auto p-3 space-y-2 bg-muted/10">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-[#5dc9c0] text-white" : "bg-muted border border-border text-foreground"}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted border border-border rounded-xl px-3 py-2">
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
                <button onClick={() => setIgMode("now")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all ${igMode === "now" ? "border-[#e1306c] bg-[#e1306c]/5 text-[#e1306c]" : "border-border text-muted-foreground hover:border-border/60"}`}>
                  <Send className="h-3.5 w-3.5" /> Publish Now
                </button>
                <button onClick={() => setIgMode("schedule")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all ${igMode === "schedule" ? "border-[#5dc9c0] bg-[#5dc9c0]/5 text-[#1a6b6b]" : "border-border text-muted-foreground hover:border-border/60"}`}>
                  <Clock className="h-3.5 w-3.5" /> Schedule
                </button>
              </div>
              {igMode === "schedule" && (
                <input type="datetime-local" value={igScheduledAt} onChange={e => setIgScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              )}

              {/* Facebook toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div onClick={() => setPublishFacebook(!publishFacebook)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${publishFacebook ? 'bg-blue-600' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${publishFacebook ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <Facebook className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Also publish to Facebook Page</span>
              </label>

              <button onClick={publishToInstagram} disabled={igPublishing || !caption.trim()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
                {igPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : igMode === "now" ? <Send className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {igPublishing ? "Publishing..." : igMode === "now" ? `Publish${publishFacebook ? ' to Instagram + Facebook' : ' to Instagram'}` : "Schedule Post"}
              </button>

              {/* Story publish (immediate only — no captions on Stories) */}
              <button onClick={publishAsStory} disabled={storyPublishing || !(composedImage || currentImage)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-purple-400/40 text-purple-500 hover:bg-purple-500/10 disabled:opacity-50 transition-colors">
                {storyPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                {storyPublishing ? "Publishing Story..." : "Publish as Instagram Story"}
              </button>
              {storyResult?.success && <p className="text-xs text-emerald-400 flex items-center gap-1.5 justify-center"><CheckCircle className="h-3.5 w-3.5" /> Story published!</p>}
              {storyResult?.error && <p className="text-xs text-red-600 flex items-center gap-1.5 justify-center"><AlertCircle className="h-3.5 w-3.5" /> {storyResult.error}</p>}
              <p className="text-[10px] text-muted-foreground text-center">💡 Want text on the Story? Use "Add Text" above first — it carries over automatically.</p>

              {/* Open in Studio button */}
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    topic: article.title,
                    excerpt: article.excerpt || '',
                    from: 'article',
                    image: composedImage || currentImage || '',
                    caption: caption || '',
                  });
                  window.location.href = `/admin/marketing/instagram-studio?${params.toString()}`;
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> Abrir no Studio (Imagem + Música + Calendário)
              </button>
              <p className="text-[10px] text-muted-foreground text-center">Requires Instagram Business account in Admin → API &amp; AI Settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
