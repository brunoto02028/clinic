"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Instagram, Sparkles, Image as ImageIcon, Video, FileText,
  Upload, Send, Save, Copy, Check, Loader2, RefreshCw, X, Plus,
  Mic, MicOff, ChevronDown, ChevronUp, Zap, Droplets, AlignLeft, AlignCenter, AlignRight,
  Clock, Hash, Eye, CheckCircle, AlertCircle, Film, Camera, TrendingUp, Flame, Facebook,
  Type, Bold, Trash2, Move, Calendar, FolderOpen, RotateCcw, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVoiceInput } from "@/hooks/use-voice-input";

const SERVICE_CHIPS = [
  "MLS Laser", "Custom Insoles", "Biomechanics", "Thermography",
  "Sports Recovery", "Exercise Therapy", "Chronic Pain", "Foot Scan",
  "Posture", "Shockwave", "Pregnancy Care", "Elderly Rehab",
];
const TONES = [
  { value: "educational", label: "Educational", icon: "📚" },
  { value: "motivational", label: "Motivational", icon: "💪" },
  { value: "testimonial", label: "Testimonial", icon: "⭐" },
  { value: "promotional", label: "Promotional", icon: "🎯" },
  { value: "behind_scenes", label: "Behind Scenes", icon: "🎬" },
  { value: "tips", label: "Quick Tips", icon: "💡" },
];
const DURATIONS = [15, 30, 60, 90];
const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "center", label: "Center" },
];

type StudioTab = "image" | "video" | "caption" | "viral" | "music" | "calendar" | "intelligence" | "facebook";

export default function InstagramStudioPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<StudioTab>("image");
  const [topic, setTopic] = useState("");
  const [service, setService] = useState("");
  const [tone, setTone] = useState("educational");
  const [language, setLanguage] = useState<"en" | "pt" | "both">("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Image Tab ──
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishingFb, setPublishingFb] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; platforms: string[]; igUrl?: string; fbUrl?: string; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishToStories, setPublishToStories] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState("");
  // ── Image Library ──
  const [imageLibrary, setImageLibrary] = useState<{ id: string; url: string; topic: string; savedAt: string }[]>([]);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const IMAGE_LIB_KEY = "bpr_image_library";

  // ── Watermark ──
  const [logoUrl, setLogoUrl] = useState("");
  const [wmPosition, setWmPosition] = useState("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(0.85);
  const [wmScale, setWmScale] = useState(0.22);
  const [watermarking, setWatermarking] = useState(false);
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  // Auto-logo: persisted logo that applies to every generated image
  const [autoLogoEnabled, setAutoLogoEnabled] = useState(false);
  const [logoTintColor, setLogoTintColor] = useState("#ffffff"); // white by default
  const [logoTintEnabled, setLogoTintEnabled] = useState(false);
  // Canvas-based live logo overlay
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoPos, setLogoPos] = useState({ x: 0.78, y: 0.78 }); // fraction of image size
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; lx: number; ly: number } | null>(null);
  const dragTextId = useRef<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Custom Image Prompt ──
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const imgPromptVoice = useVoiceInput({
    language: "pt-BR",
    continuous: false,
    onTranscript: (text) => setCustomImagePrompt(prev => (prev + " " + text).trim()),
  });

  // ── Text Overlay ──
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [textLayers, setTextLayers] = useState<{
    id: string; text: string; font: string; size: number; color: string;
    bold: boolean; align: "left" | "center" | "right";
    x: number; y: number;
    shadow: boolean; shadowColor: string; shadowBlur?: number;
    bgEnabled?: boolean; bgColor?: string; bgOpacity?: number; bgBlur?: number;
  }[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const TEXT_FONTS = [
    { label: "Montserrat Bold", value: "bold 1em Montserrat, sans-serif", css: "Montserrat" },
    { label: "Impact", value: "1em Impact, sans-serif", css: "Impact" },
    { label: "Bebas Neue", value: "1em 'Bebas Neue', Impact, sans-serif", css: "Impact" },
    { label: "Georgia Serif", value: "1em Georgia, serif", css: "Georgia" },
    { label: "Arial Clean", value: "1em Arial, sans-serif", css: "Arial" },
  ];

  // ── Video Tab ──
  const [videoDuration, setVideoDuration] = useState(30);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoScript, setVideoScript] = useState<any>(null);
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);

  // ── Viral Scout ──
  const [viralLoading, setViralLoading] = useState(false);
  const [viralIdeas, setViralIdeas] = useState<any[]>([]);
  const [viralNiche, setViralNiche] = useState("physiotherapy");
  const [viralQuery, setViralQuery] = useState("");
  const [viralSavingAll, setViralSavingAll] = useState(false);
  const [viralSavedIds, setViralSavedIds] = useState<Set<number>>(new Set());
  const [viralSavedDraftIds, setViralSavedDraftIds] = useState<Record<number,string>>({});
  const viralVoice = useVoiceInput({
    language: "pt-BR",
    continuous: false,
    onTranscript: (text) => setViralQuery(prev => (prev + " " + text).trim()),
  });

  // ── Facebook Branding ──
  const [fbLoading, setFbLoading] = useState(false);
  const [fbImage, setFbImage] = useState<string | null>(null);
  const [fbFormat, setFbFormat] = useState<"cover" | "post" | "profile">("cover");
  const [fbTopic, setFbTopic] = useState("");

  // ── Calendar ──
  const [calPosts, setCalPosts] = useState<any[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calPostsPerWeek, setCalPostsPerWeek] = useState<3|5|7>(5);
  const [calLanguage, setCalLanguage] = useState<"en"|"pt"|"both">("en");
  const [calStartDate, setCalStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [calIncludeMarketplace, setCalIncludeMarketplace] = useState(true);
  const [calIncludeArticles, setCalIncludeArticles] = useState(true);
  const [calExpanded, setCalExpanded] = useState<number|null>(null);
  const [calSaving, setCalSaving] = useState<number|null>(null);
  const [calSavingAll, setCalSavingAll] = useState(false);

  // ── Account Intelligence ──
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelData, setIntelData] = useState<any>(null);
  const [intelFocus, setIntelFocus] = useState("");
  const intelVoice = useVoiceInput({
    language: "pt-BR",
    continuous: false,
    onTranscript: (text) => setIntelFocus(prev => (prev + " " + text).trim()),
  });

  // ── Drafts ──
  const [showDraftsPanel, setShowDraftsPanel] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [restoreSession, setRestoreSession] = useState<any>(null);
  const AUTO_SAVE_KEY = "bpr_studio_autosave";

  // ── Suno Music ──
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicResult, setMusicResult] = useState<any>(null);
  const [musicPollId, setMusicPollId] = useState<string | null>(null);
  const musicPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicPollAttemptsRef = useRef(0);
  const [musicDuration, setMusicDuration] = useState<15|30|60|90>(30);
  const [musicType, setMusicType] = useState<"instrumental"|"vocal"|"spoken">("instrumental");
  const [musicStyle, setMusicStyle] = useState("motivational upbeat");
  const [musicLyrics, setMusicLyrics] = useState("");
  // Music library
  const [musicLibrary, setMusicLibrary] = useState<any[]>([]);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [musicSaving, setMusicSaving] = useState(false);
  const [musicLibLoading, setMusicLibLoading] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; title: string; audioUrl: string } | null>(null);
  const [musicUploadLoading, setMusicUploadLoading] = useState(false);
  const musicFileRef = useRef<HTMLInputElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // ── AI Text Suggestions ──
  const [aiTextLoading, setAiTextLoading] = useState(false);
  const [aiTextSuggestions, setAiTextSuggestions] = useState<{
    headline: string; subline?: string; font: string;
    size: number; color: string; y: number; style: string;
  }[]>([]);

  // ── Voice ──
  // Voice recognition always in PT-BR (user speaks Portuguese)
  // AI output language is controlled separately by the language selector
  const voice = useVoiceInput({
    language: "pt-BR",
    continuous: true,
    onTranscript: (text) => setTopic(prev => (prev + " " + text).trim()),
  });

  // ── Upload ──
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Canvas: draw base image + logo overlay (with optional tint) ──
  const drawCanvas = useCallback((img: string | null, onDone?: () => void) => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !img) return;
    const size = container?.clientWidth || 400;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const base = new window.Image();
    base.crossOrigin = "anonymous";
    base.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(base, 0, 0, size, size);
      if (logoImgRef.current && logoLoaded) {
        const lw = size * wmScale;
        const lh = (logoImgRef.current.naturalHeight / logoImgRef.current.naturalWidth) * lw;
        const lx = logoPos.x * size - lw / 2;
        const ly = logoPos.y * size - lh / 2;
        if (logoTintEnabled) {
          // Draw tinted logo via off-screen canvas
          const off = document.createElement("canvas");
          off.width = logoImgRef.current.naturalWidth;
          off.height = logoImgRef.current.naturalHeight;
          const offCtx = off.getContext("2d")!;
          offCtx.drawImage(logoImgRef.current, 0, 0);
          offCtx.globalCompositeOperation = "source-in";
          offCtx.fillStyle = logoTintColor;
          offCtx.fillRect(0, 0, off.width, off.height);
          ctx.globalAlpha = wmOpacity;
          ctx.drawImage(off, lx, ly, lw, lh);
        } else {
          ctx.globalAlpha = wmOpacity;
          ctx.drawImage(logoImgRef.current, lx, ly, lw, lh);
        }
        ctx.globalAlpha = 1;
      }
      // Draw text layers
      if (textLayers.length > 0) {
        textLayers.forEach(layer => {
          const fontSize = Math.round(size * (layer.size / 100));
          const fontWeight = layer.bold ? "bold" : "normal";
          ctx.font = `${fontWeight} ${fontSize}px ${layer.font}`;
          ctx.textAlign = layer.align;
          ctx.textBaseline = "middle";
          // Word wrap
          const maxWidth = size * 0.85;
          const words = layer.text.split(" ");
          const lines: string[] = [];
          let line = "";
          words.forEach(word => {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width > maxWidth && line) {
              lines.push(line); line = word;
            } else { line = test; }
          });
          if (line) lines.push(line);
          const lineH = fontSize * 1.25;
          const totalH = lines.length * lineH;
          const px = layer.x * size;
          const textW = Math.max(...lines.map(l => ctx.measureText(l).width));
          const padX = fontSize * 0.5;
          const padY = fontSize * 0.35;
          const bgTop = layer.y * size - totalH / 2 - padY;
          const bgHeight = totalH + padY * 2;
          const bgLeft = layer.align === "center" ? px - textW / 2 - padX
            : layer.align === "right" ? px - textW - padX : px - padX;
          const bgWidth = textW + padX * 2;

          // Draw background (blur + solid rect)
          if (layer.bgEnabled) {
            const blurPx = layer.bgBlur ?? 0;
            const opacity = (layer.bgOpacity ?? 60) / 100;
            const bgCol = layer.bgColor ?? "#000000";
            ctx.save();
            if (blurPx > 0) {
              // Blur the area behind text by drawing the source region blurred
              ctx.filter = `blur(${blurPx}px)`;
              ctx.drawImage(canvas, bgLeft, bgTop, bgWidth, bgHeight, bgLeft, bgTop, bgWidth, bgHeight);
              ctx.filter = "none";
            }
            // Solid tinted rect on top of blur
            ctx.globalAlpha = opacity;
            ctx.fillStyle = bgCol;
            // Rounded rect
            const r = fontSize * 0.2;
            ctx.beginPath();
            ctx.moveTo(bgLeft + r, bgTop);
            ctx.lineTo(bgLeft + bgWidth - r, bgTop);
            ctx.quadraticCurveTo(bgLeft + bgWidth, bgTop, bgLeft + bgWidth, bgTop + r);
            ctx.lineTo(bgLeft + bgWidth, bgTop + bgHeight - r);
            ctx.quadraticCurveTo(bgLeft + bgWidth, bgTop + bgHeight, bgLeft + bgWidth - r, bgTop + bgHeight);
            ctx.lineTo(bgLeft + r, bgTop + bgHeight);
            ctx.quadraticCurveTo(bgLeft, bgTop + bgHeight, bgLeft, bgTop + bgHeight - r);
            ctx.lineTo(bgLeft, bgTop + r);
            ctx.quadraticCurveTo(bgLeft, bgTop, bgLeft + r, bgTop);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          lines.forEach((ln, li) => {
            const py = layer.y * size - totalH / 2 + li * lineH + lineH / 2;
            if (layer.shadow) {
              ctx.shadowColor = layer.shadowColor;
              ctx.shadowBlur = layer.shadowBlur ?? fontSize * 0.3;
              ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
            }
            ctx.fillStyle = layer.color;
            ctx.fillText(ln, px, py);
            ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          });
        });
      }
      onDone?.();
    };
    base.src = img;
  }, [logoLoaded, logoPos, wmOpacity, wmScale, logoTintEnabled, logoTintColor, textLayers]);

  // Persist logo URL to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("bpr_studio_logo");
    if (saved) setLogoUrl(saved);
    const savedAuto = localStorage.getItem("bpr_studio_auto_logo");
    if (savedAuto === "true") setAutoLogoEnabled(true);
    const savedTint = localStorage.getItem("bpr_studio_logo_tint");
    if (savedTint) setLogoTintColor(savedTint);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && logoUrl) {
      localStorage.setItem("bpr_studio_logo", logoUrl);
    }
  }, [logoUrl]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bpr_studio_auto_logo", String(autoLogoEnabled));
    }
  }, [autoLogoEnabled]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bpr_studio_logo_tint", logoTintColor);
    }
  }, [logoTintColor]);

  // ── Auto-save session to localStorage ──
  const getSessionSnapshot = useCallback(() => ({
    topic, service, tone, language, caption, hashtags,
    generatedImage, watermarkedImage, uploadedImages,
    textLayers, customImagePrompt,
    savedAt: new Date().toISOString(),
  }), [topic, service, tone, language, caption, hashtags, generatedImage, watermarkedImage, uploadedImages, textLayers, customImagePrompt]);

  // Auto-save every 20s when there's content
  useEffect(() => {
    if (!topic && !caption && !generatedImage) return;
    const interval = setInterval(() => {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(getSessionSnapshot()));
    }, 20000);
    return () => clearInterval(interval);
  }, [getSessionSnapshot, topic, caption, generatedImage, AUTO_SAVE_KEY]);

  // Save on page unload
  useEffect(() => {
    const handler = () => {
      if (topic || caption || generatedImage) {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(getSessionSnapshot()));
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [getSessionSnapshot, topic, caption, generatedImage, AUTO_SAVE_KEY]);

  // Detect previous session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const snap = JSON.parse(saved);
        // Only offer restore if it has meaningful content and is less than 7 days old
        const age = Date.now() - new Date(snap.savedAt).getTime();
        if ((snap.topic || snap.caption) && age < 7 * 24 * 3600 * 1000) {
          setRestoreSession(snap);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRestore(snap: any) {
    if (snap.topic) setTopic(snap.topic);
    if (snap.service) setService(snap.service);
    if (snap.tone) setTone(snap.tone);
    if (snap.language) setLanguage(snap.language);
    if (snap.caption) setCaption(snap.caption);
    if (snap.hashtags) setHashtags(snap.hashtags);
    if (snap.generatedImage) setGeneratedImage(snap.generatedImage);
    if (snap.watermarkedImage) setWatermarkedImage(snap.watermarkedImage);
    if (snap.uploadedImages?.length) setUploadedImages(snap.uploadedImages);
    if (snap.textLayers?.length) setTextLayers(snap.textLayers);
    if (snap.customImagePrompt) setCustomImagePrompt(snap.customImagePrompt);
    setRestoreSession(null);
    localStorage.removeItem(AUTO_SAVE_KEY);
  }

  // ── Draft list (DB) ──
  async function loadDrafts() {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/admin/social/posts?status=DRAFT&limit=30");
      const data = await res.json();
      setDrafts(data.posts || []);
    } catch {} finally { setDraftsLoading(false); }
  }

  async function loadScheduled() {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/admin/social/posts?status=SCHEDULED&limit=30");
      const data = await res.json();
      setDrafts(prev => {
        const ids = new Set(prev.map((d: any) => d.id));
        return [...prev, ...data.posts.filter((p: any) => !ids.has(p.id))];
      });
    } catch {} finally { setDraftsLoading(false); }
  }

  function applyDraft(draft: any) {
    if (draft.aiPrompt) {
      try {
        const meta = JSON.parse(draft.aiPrompt);
        if (meta.topic) setTopic(meta.topic);
        if (meta.service) setService(meta.service);
        if (meta.tone) setTone(meta.tone);
        if (meta.language) setLanguage(meta.language);
        if (meta.textLayers) setTextLayers(meta.textLayers);
        if (meta.customImagePrompt) setCustomImagePrompt(meta.customImagePrompt);
      } catch {
        setTopic(draft.aiPrompt);
      }
    }
    if (draft.caption) setCaption(draft.caption);
    if (draft.hashtags) setHashtags(draft.hashtags);
    if (draft.mediaUrls?.[0]) {
      setGeneratedImage(draft.mediaUrls[0]);
      setWatermarkedImage(null);
    }
    setShowDraftsPanel(false);
    setTab("image");
    setSuccess("Draft carregado!");
    setTimeout(() => setSuccess(null), 3000);
  }

  async function deleteDraft(id: string) {
    try {
      await fetch(`/api/admin/social/posts/${id}`, { method: "DELETE" });
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch (e: any) { setError(e.message); }
  }

  // ── Reset / New Post ──
  function resetPost() {
    setTopic(""); setService(""); setCaption(""); setHashtags("");
    setGeneratedImage(null); setWatermarkedImage(null); setUploadedImages([]);
    setTextLayers([]); setActiveTextId(null); setCustomImagePrompt("");
    setShowCustomPrompt(false); setShowWatermarkPanel(false); setShowTextPanel(false);
    setScheduleDate(""); setScheduleTime("");
    setPublishResult(null); setError(null); setSuccess(null);
    setViralIdeas([]); setViralSavedIds(new Set()); setViralSavedDraftIds({});
    setAiTextSuggestions([]);
    localStorage.removeItem(AUTO_SAVE_KEY);
    setTab("image");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Music Library (DB-backed) ──
  async function loadMusicLibrary() {
    setMusicLibLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/music-library');
      const data = await res.json();
      if (data.tracks) setMusicLibrary(data.tracks);
    } catch {}
    finally { setMusicLibLoading(false); }
  }

  async function saveToMusicLibrary(track: any) {
    if (!track?.audioUrl) return;
    setMusicSaving(true);
    try {
      const res = await fetch('/api/admin/marketing/music-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: track.title || `${topic || service || 'BPR'} · ${musicStyle}`,
          audioUrl: track.audioUrl || track.streamUrl,
          duration: track.duration || musicDuration,
          type: musicType,
          style: musicStyle,
          topic: topic || service || '',
          lyrics: musicResult?.lyrics || null,
          source: 'suno',
        }),
      });
      const data = await res.json();
      if (data.track) {
        setMusicLibrary(prev => [data.track, ...prev]);
        setSuccess('Música guardada na biblioteca!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (e: any) { setError(e.message); }
    finally { setMusicSaving(false); }
  }

  async function deleteFromLibrary(id: string) {
    await fetch(`/api/admin/marketing/music-library?id=${id}`, { method: 'DELETE' });
    setMusicLibrary(prev => prev.filter(t => t.id !== id));
    if (selectedMusic?.id === id) setSelectedMusic(null);
  }

  async function uploadMusicFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMusicUploadLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/admin/marketing/music-library/upload', { method: 'POST', body: form });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) throw new Error(uploadData.error || 'Upload falhou');
      // Save to library
      const res = await fetch('/api/admin/marketing/music-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^.]+$/, ''),
          audioUrl: uploadData.url,
          source: 'upload',
          type: 'upload',
        }),
      });
      const data = await res.json();
      if (data.track) {
        setMusicLibrary(prev => [data.track, ...prev]);
        setSuccess('Música carregada e guardada!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (e: any) { setError(e.message); }
    finally { setMusicUploadLoading(false); e.target.value = ''; }
  }

  function togglePlay(id: string, url: string) {
    const existing = audioRefs.current[id];
    if (playingId === id) {
      existing?.pause();
      setPlayingId(null);
    } else {
      // Pause any currently playing
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId]?.pause();
      }
      if (!existing) {
        const a = new Audio(url);
        a.onended = () => setPlayingId(null);
        audioRefs.current[id] = a;
        a.play();
      } else {
        existing.play();
      }
      setPlayingId(id);
    }
  }

  // ── Image Library ──
  function loadImageLibrary() {
    try {
      const raw = localStorage.getItem(IMAGE_LIB_KEY);
      if (raw) setImageLibrary(JSON.parse(raw));
    } catch {}
  }

  function saveToImageLibrary(url: string) {
    const entry = { id: `img-${Date.now()}`, url, topic: topic || service || "BPR", savedAt: new Date().toISOString() };
    const updated = [entry, ...imageLibrary.filter(i => i.url !== url)].slice(0, 30);
    setImageLibrary(updated);
    localStorage.setItem(IMAGE_LIB_KEY, JSON.stringify(updated));
    setSuccess("Imagem guardada na biblioteca!");
    setTimeout(() => setSuccess(null), 3000);
  }

  function deleteFromImageLibrary(id: string) {
    const updated = imageLibrary.filter(i => i.id !== id);
    setImageLibrary(updated);
    localStorage.setItem(IMAGE_LIB_KEY, JSON.stringify(updated));
  }

  function useImageFromLibrary(url: string) {
    setGeneratedImage(url);
    setWatermarkedImage(null);
    setShowImageLibrary(false);
    setTab("image");
  }

  // Load libraries on mount
  useEffect(() => { loadMusicLibrary(); loadImageLibrary(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Reload logo when URL changes
  useEffect(() => {
    if (!logoUrl) return;
    setLogoLoaded(false);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { logoImgRef.current = img; setLogoLoaded(true); };
    img.onerror = () => setLogoLoaded(false);
    img.src = logoUrl;
  }, [logoUrl]);

  // Get canvas from dataURL for server-side apply
  function getCanvasDataUrl() {
    return canvasRef.current?.toDataURL("image/jpeg", 0.92) || null;
  }

  // Drag handlers — supports both logo and individual text layers
  function onCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const canvas = canvasRef.current;
    const scaleX = canvas.width / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleX;
    const size = canvas.width;
    const ctx = canvas.getContext("2d");
    // Check text layers first (in reverse so topmost is hit first)
    if (showTextPanel && ctx) {
      for (let i = textLayers.length - 1; i >= 0; i--) {
        const layer = textLayers[i];
        const fontSize = Math.round(size * (layer.size / 100));
        ctx.font = `${layer.bold ? "bold" : "normal"} ${fontSize}px ${layer.font}`;
        const words = layer.text.split(" ");
        const maxWidth = size * 0.85;
        const lines: string[] = [];
        let line = "";
        words.forEach(word => {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
          else { line = test; }
        });
        if (line) lines.push(line);
        const lineH = fontSize * 1.25;
        const totalH = lines.length * lineH;
        const textW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const cx = layer.x * size;
        const cy = layer.y * size - totalH / 2;
        const hitX = layer.align === "center" ? cx - textW / 2 : cx;
        if (clickX >= hitX - 10 && clickX <= hitX + textW + 10 &&
            clickY >= cy - 10 && clickY <= cy + totalH + 10) {
          dragTextId.current = layer.id;
          setActiveTextId(layer.id);
          dragStart.current = { mx: e.clientX, my: e.clientY, lx: layer.x, ly: layer.y };
          setDragging(true);
          return;
        }
      }
    }
    // Fall back to logo drag
    if (logoLoaded && showWatermarkPanel) {
      dragTextId.current = null;
      dragStart.current = { mx: e.clientX, my: e.clientY, lx: logoPos.x, ly: logoPos.y };
      setDragging(true);
    }
  }
  function onCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging || !dragStart.current || !canvasRef.current) return;
    const size = canvasRef.current.width;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const dx = (e.clientX - dragStart.current.mx) * scaleX / size;
    const dy = (e.clientY - dragStart.current.my) * scaleX / size;
    const nx = Math.min(1, Math.max(0, dragStart.current.lx + dx));
    const ny = Math.min(1, Math.max(0, dragStart.current.ly + dy));
    if (dragTextId.current) {
      setTextLayers(prev => prev.map(l =>
        l.id === dragTextId.current ? { ...l, x: nx, y: ny } : l
      ));
    } else {
      setLogoPos({ x: nx, y: ny });
    }
  }
  function onCanvasMouseUp() { setDragging(false); dragStart.current = null; dragTextId.current = null; }

  // ── Auto-load from article cross-promotion (URL query params) ──
  useEffect(() => {
    const articleTopic = searchParams.get('topic');
    const articleExcerpt = searchParams.get('excerpt');
    const articleImage = searchParams.get('image');
    const articleCaption = searchParams.get('caption');
    const from = searchParams.get('from');
    if (from === 'article' && articleTopic) {
      setTopic(articleTopic + (articleExcerpt ? '. ' + articleExcerpt.slice(0, 120) : ''));
      setFbTopic(articleTopic);
      if (articleImage) {
        setGeneratedImage(articleImage);
        setWatermarkedImage(null);
      }
      if (articleCaption) {
        setCaption(articleCaption);
      }
      setSuccess('Artigo carregado no Studio! Imagem e legenda prontas — adiciona texto, logo e música.');
      setTimeout(() => setSuccess(null), 5000);
    }
  }, [searchParams]);

  async function generatePost() {
    if (!topic && !service) { setError("Add a topic or pick a service"); return; }
    setGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setWatermarkedImage(null);
    setCaption("");
    setHashtags("");
    try {
      const res = await fetch("/api/admin/marketing/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, service, tone, language, generateImageFlag: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCaption(data.post.caption || "");
      setHashtags(data.post.hashtags?.join(", ") || "");
      if (data.post.image_url) {
        setGeneratedImage(data.post.image_url);
        setWatermarkedImage(null);
        if (autoLogoEnabled && logoLoaded) { setShowWatermarkPanel(true); setTab("image"); }
      }
    } catch (e: any) {
      setError(e.message);
    } finally { setGenerating(false); }
  }

  async function generateImageOnly() {
    if (!topic && !service) { setError("Add a topic first"); return; }
    setImageLoading(true);
    setError(null);
    try {
      // Use custom prompt if provided, else build safe visual prompt from topic
      const safePrompt = customImagePrompt.trim()
        ? [
            customImagePrompt.trim().slice(0, 400),
            "ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS in any language",
            "photorealistic, square 1:1 format, professional photography",
            "teal and navy colour palette, BPR physiotherapy clinic aesthetic",
          ].join(". ")
        : [
            "Professional physiotherapy clinic scene related to:",
            (service || topic || "").slice(0, 120),
            "pure photographic scene, no text, no words, no letters in any language",
            "modern clinical setting, teal and navy colours, high quality photography",
          ].join(" ");
      const res = await fetch("/api/admin/marketing/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: safePrompt, service }),
      });
      const data = await res.json();
      if (data.image_url) {
        setGeneratedImage(data.image_url);
        setWatermarkedImage(null);
        if (autoLogoEnabled && logoLoaded) setShowWatermarkPanel(true);
      } else throw new Error(data.error || "No image generated");
    } catch (e: any) { setError(e.message); }
    finally { setImageLoading(false); }
  }

  async function generateCaptionOnly() {
    if (!topic && !service) { setError("Add a topic first"); return; }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, service, tone, language, generateImageFlag: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCaption(data.post.caption || "");
      setHashtags(data.post.hashtags?.join(", ") || "");
    } catch (e: any) { setError(e.message); }
    finally { setGenerating(false); }
  }

  async function applyWatermark() {
    const imgUrl = generatedImage || uploadedImages[0];
    if (!imgUrl) { setError("No image to watermark"); return; }
    setWatermarking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imgUrl,
          logoUrl: logoUrl || undefined,
          position: wmPosition,
          opacity: wmOpacity,
          scale: wmScale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWatermarkedImage(data.url);
      setSuccess("Logo applied!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setWatermarking(false); }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      const url = data.url || data.imageUrl || data.image?.imageUrl;
      if (url) { setLogoUrl(url); setSuccess("Logo uploaded!"); setTimeout(() => setSuccess(null), 2000); }
    } catch {}
    e.target.value = "";
  }

  async function generateViralIdeas() {
    setViralLoading(true);
    setError(null);
    setViralIdeas([]);
    try {
      const res = await fetch("/api/admin/marketing/viral-scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: viralQuery || viralNiche, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setViralIdeas(data.ideas || []);
    } catch (e: any) { setError(e.message); }
    finally { setViralLoading(false); }
  }

  function useViralIdea(idea: any) {
    // Sanitise: only use plain text strings, never objects or JSON
    const safeStr = (v: any): string => {
      if (!v) return "";
      if (typeof v === "string") return v;
      if (typeof v === "object") return ""; // never JSON.stringify an object into a text field
      return String(v);
    };
    const topicText = safeStr(idea.bpr_adaptation) || safeStr(idea.format) || safeStr(idea.topic) || safeStr(viralQuery);
    const captionText = safeStr(idea.caption) || safeStr(idea.hook) || "";
    const tagsText = Array.isArray(idea.hashtags)
      ? idea.hashtags.map((h: any) => safeStr(h)).filter(Boolean).join(", ")
      : "";
    setTopic(topicText);
    setCaption(captionText);
    setHashtags(tagsText);
    setTab("image");
    setSuccess("Ideia carregada! Agora gera o conteúdo.");
    setTimeout(() => setSuccess(null), 3000);
  }

  async function generateMusic() {
    setMusicLoading(true);
    setError(null);
    setMusicResult(null);
    try {
      const res = await fetch("/api/admin/marketing/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || service,
          caption,
          duration: musicDuration,
          type: musicType,
          style: musicStyle,
          lyrics: musicLyrics,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMusicResult(data);
      // Auto-poll if still pending — ref-based, survives tab switches
      if (data.status === "pending" && data.id) {
        startMusicPolling(data.id);
      }
    } catch (e: any) { setError(e.message); }
    finally { setMusicLoading(false); }
  }

  // Ref-based polling — survives tab switches, never loses state
  function startMusicPolling(id: string) {
    if (musicPollRef.current) clearTimeout(musicPollRef.current);
    musicPollAttemptsRef.current = 0;
    setMusicPollId(id);
    scheduleMusicPoll(id, 8000);
  }

  function scheduleMusicPoll(id: string, delay: number) {
    musicPollRef.current = setTimeout(async () => {
      if (musicPollAttemptsRef.current > 40) {
        setMusicPollId(null);
        setError("Música demorou demasiado — tenta novamente.");
        return;
      }
      musicPollAttemptsRef.current += 1;
      try {
        const res = await fetch(`/api/admin/marketing/generate-music?id=${id}`);
        const data = await res.json();
        if (data.status === "complete" && data.audioUrl) {
          setMusicResult((prev: any) => ({ ...prev, ...data, status: "complete" }));
          setMusicPollId(null);
        } else if (data.status === "error") {
          setMusicPollId(null);
          setError("Erro na geração de música: " + (data.error || "Suno falhou"));
        } else {
          // still pending — keep polling
          scheduleMusicPoll(id, 8000);
        }
      } catch {
        scheduleMusicPoll(id, 12000);
      }
    }, delay);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (musicPollRef.current) clearTimeout(musicPollRef.current); };
  }, []);

  // ── Viral Batch Save ──
  async function saveAllViralIdeas() {
    if (viralIdeas.length === 0) return;
    setViralSavingAll(true);
    const savedIds = new Set<number>();
    const savedMap: Record<number, string> = {};
    for (let i = 0; i < viralIdeas.length; i++) {
      const idea = viralIdeas[i];
      if (viralSavedIds.has(i)) continue; // skip already saved
      const safeStr = (v: any): string => {
        if (!v) return ""; if (typeof v === "string") return v;
        if (typeof v === "object") return ""; return String(v);
      };
      const topicText = safeStr(idea.bpr_adaptation) || safeStr(idea.format) || safeStr(viralQuery);
      const captionText = safeStr(idea.caption) || safeStr(idea.hook) || "";
      const tagsText = Array.isArray(idea.hashtags)
        ? idea.hashtags.map((h: any) => safeStr(h)).filter(Boolean).join(", ")
        : "";
      try {
        const res = await fetch("/api/admin/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: captionText || topicText,
            hashtags: tagsText || null,
            postType: "IMAGE",
            mediaUrls: [],
            status: "DRAFT",
            aiGenerated: true,
            aiPrompt: JSON.stringify({ topic: topicText, service: "", tone: "educational", language, viralIdea: { format: idea.format, hook: idea.hook, viral_score: idea.viral_score, content_type: idea.content_type } }),
          }),
        });
        if (res.ok) {
          const d = await res.json();
          savedIds.add(i);
          if (d.post?.id) savedMap[i] = d.post.id;
        }
      } catch {}
    }
    setViralSavedIds(prev => new Set([...prev, ...savedIds]));
    setViralSavedDraftIds(prev => ({ ...prev, ...savedMap }));
    setViralSavingAll(false);
    setSuccess(`${savedIds.size} ideias guardadas como drafts!`);
    setTimeout(() => setSuccess(null), 4000);
  }

  async function deleteViralDraft(index: number) {
    const id = viralSavedDraftIds[index];
    if (id) {
      try { await fetch(`/api/admin/social/posts/${id}`, { method: "DELETE" }); } catch {}
    }
    setViralSavedIds(prev => { const n = new Set(prev); n.delete(index); return n; });
    setViralSavedDraftIds(prev => { const n = { ...prev }; delete n[index]; return n; });
  }

  // ── AI Text Suggestions for cover ──
  async function generateAiTextSuggestions() {
    setAiTextLoading(true);
    setAiTextSuggestions([]);
    try {
      const context = [caption, topic, service, videoScript?.hook].filter(Boolean).join(" | ").slice(0, 600);
      const res = await fetch("/api/admin/marketing/cover-text-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, language }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setAiTextSuggestions(data.suggestions.slice(0, 5));
      }
    } catch {}
    finally { setAiTextLoading(false); }
  }

  async function generateFbImage() {
    const prompt = fbTopic || topic || service;
    if (!prompt) { setError('Add a topic first'); return; }
    setFbLoading(true);
    setError(null);
    setFbImage(null);
    const dimensions = fbFormat === 'cover' ? '1200x628 pixels, landscape 16:9 ratio'
      : fbFormat === 'post' ? 'square 1:1, 1080x1080 pixels'
      : '180x180 pixels, circular crop safe, clean minimal design';
    try {
      const res = await fetch('/api/admin/marketing/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: [
            prompt,
            fbFormat === 'cover' ? 'Facebook Page cover photo, wide banner format' : fbFormat === 'profile' ? 'Facebook profile photo, logo centred, circular safe' : 'Facebook post image',
            dimensions,
            'BPR Bruno Physical Rehabilitation branding, teal and navy color palette',
            'professional physiotherapy clinic, modern clean design',
            'ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY',
          ].join('. '),
          service,
        }),
      });
      const data = await res.json();
      if (data.image_url) setFbImage(data.image_url);
      else throw new Error(data.error || 'No image generated');
    } catch (e: any) { setError(e.message); }
    finally { setFbLoading(false); }
  }

  async function generateCalendar() {
    setCalLoading(true);
    setError(null);
    setCalPosts([]);
    try {
      const res = await fetch("/api/admin/marketing/content-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: calStartDate,
          postsPerWeek: calPostsPerWeek,
          language: calLanguage,
          themes: service ? [service] : [],
          includeMarketplace: calIncludeMarketplace,
          includeArticles: calIncludeArticles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCalPosts(data.posts || []);
      setSuccess(`${data.posts?.length || 0} posts gerados!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setCalLoading(false); }
  }

  async function saveCalendarPost(post: any, idx: number, action: "draft" | "schedule") {
    setCalSaving(idx);
    try {
      const schedDate = new Date(`${post.date}T${post.post_time || "07:30"}:00`);
      const res = await fetch("/api/admin/marketing/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: post.topic,
          service: post.service,
          tone: post.tone,
          language: calLanguage,
          generateImageFlag: false,
          scheduledAt: action === "schedule" ? schedDate.toISOString() : null,
          status: action === "draft" ? "DRAFT" : "SCHEDULED",
          caption: post.caption,
          hashtags: post.hashtags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCalPosts(prev => prev.map((p, i) => i === idx ? { ...p, _saved: action } : p));
    } catch (e: any) { setError(e.message); }
    finally { setCalSaving(null); }
  }

  async function saveAllCalendarPosts() {
    setCalSavingAll(true);
    let saved = 0;
    for (let i = 0; i < calPosts.length; i++) {
      if (calPosts[i]._saved) continue;
      try {
        const post = calPosts[i];
        const schedDate = new Date(`${post.date}T${post.post_time || "07:30"}:00`);
        await fetch("/api/admin/marketing/generate-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: post.topic,
            service: post.service,
            tone: post.tone,
            language: calLanguage,
            generateImageFlag: false,
            scheduledAt: schedDate.toISOString(),
            status: "SCHEDULED",
            caption: post.caption,
            hashtags: post.hashtags,
          }),
        });
        saved++;
        setCalPosts(prev => prev.map((p, idx) => idx === i ? { ...p, _saved: "schedule" } : p));
      } catch {}
    }
    setSuccess(`${saved} posts agendados com sucesso!`);
    setTimeout(() => setSuccess(null), 4000);
    setCalSavingAll(false);
  }

  async function generateIntelligence() {
    setIntelLoading(true);
    setError(null);
    setIntelData(null);
    try {
      const res = await fetch("/api/admin/marketing/content-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trending-ideas", focus: intelFocus || topic || service, count: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIntelData(data);
    } catch (e: any) { setError(e.message); }
    finally { setIntelLoading(false); }
  }

  async function publishNow() {
    // Auto-bake canvas (text + logo overlays) before publishing
    const activeImage = watermarkedImage || generatedImage || uploadedImages[0];
    if (textLayers.length > 0 && activeImage && canvasRef.current) {
      await new Promise<void>(resolve => drawCanvas(activeImage, () => resolve()));
    }
    let imgUrl = canvasRef.current && textLayers.length > 0
      ? (canvasRef.current.toDataURL("image/jpeg", 0.92))
      : (watermarkedImage || generatedImage || uploadedImages[0]);
    if (!caption) { setError("Caption obrigatória para publicar"); return; }
    if (!imgUrl) { setError("Imagem obrigatória para publicar"); return; }
    setPublishing(true);
    setError(null);
    try {
      // If image is a data: URL (canvas output) or blob:, upload it to server first
      if (imgUrl.startsWith("data:") || imgUrl.startsWith("blob:")) {
        let blob: Blob;
        if (imgUrl.startsWith("data:")) {
          const arr = imgUrl.split(",");
          const mime = arr[0].match(/:(.*?);/)![1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          blob = new Blob([u8arr], { type: mime });
        } else {
          blob = await fetch(imgUrl).then(r => r.blob());
        }
        const form = new FormData();
        form.append("file", blob, `ig-post-${Date.now()}.jpg`);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        const uploadData = await uploadRes.json();
        const uploaded = uploadData.url || uploadData.imageUrl || uploadData.image?.imageUrl;
        if (!uploaded) throw new Error("Falha ao fazer upload da imagem");
        imgUrl = uploaded.startsWith("http") ? uploaded : `https://bpr.rehab${uploaded}`;
      } else if (imgUrl.startsWith("/")) {
        imgUrl = `https://bpr.rehab${imgUrl}`;
      }

      const res = await fetch("/api/admin/marketing/publish-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          imageUrl: imgUrl,
          hashtags: hashtags.split(",").map(h => `#${h.trim().replace(/^#/, "")}`).filter(Boolean),
          publishToStories,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const platforms = ["Instagram"];
      if (data.facebook_post_id) platforms.push("Facebook");
      if (data.story_id) platforms.push("Stories");
      setPublishResult({ ok: true, platforms, igUrl: data.instagram_post_id ? `https://instagram.com/p/${data.instagram_post_id}` : undefined });
    } catch (e: any) {
      setPublishResult({ ok: false, platforms: [], error: e.message });
    }
    finally { setPublishing(false); }
  }

  async function publishFacebook() {
    const imgUrl = fbImage || watermarkedImage || generatedImage || uploadedImages[0];
    if (!imgUrl) { setError("Imagem obrigatória para publicar no Facebook"); return; }
    setPublishingFb(true);
    setError(null);
    try {
      let publicUrl = imgUrl;
      if (publicUrl.startsWith("data:") || publicUrl.startsWith("blob:")) {
        let blob: Blob;
        if (publicUrl.startsWith("data:")) {
          const arr = publicUrl.split(",");
          const mime = arr[0].match(/:(.*?);/)![1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          blob = new Blob([u8arr], { type: mime });
        } else {
          blob = await fetch(publicUrl).then(r => r.blob());
        }
        const form = new FormData();
        form.append("file", blob, `fb-post-${Date.now()}.jpg`);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        const uploadData = await uploadRes.json();
        const uploaded = uploadData.url || uploadData.imageUrl || uploadData.image?.imageUrl;
        if (!uploaded) throw new Error("Falha ao fazer upload da imagem");
        publicUrl = uploaded.startsWith("http") ? uploaded : `https://bpr.rehab${uploaded}`;
      } else if (publicUrl.startsWith("/")) {
        publicUrl = `https://bpr.rehab${publicUrl}`;
      }
      const res = await fetch("/api/admin/marketing/publish-facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: publicUrl, caption: caption || fbTopic || topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublishResult({ ok: true, platforms: ["Facebook"], fbUrl: data.post_id ? `https://facebook.com/${data.post_id}` : undefined });
    } catch (e: any) {
      setPublishResult({ ok: false, platforms: [], error: e.message });
    }
    finally { setPublishingFb(false); }
  }

  async function saveDraft(asScheduled = false) {
    if (!caption && !topic) { setError("Adiciona um tópico ou legenda primeiro"); return; }
    setSaving(true);
    try {
      const allImages = [
        ...(watermarkedImage ? [watermarkedImage] : generatedImage ? [generatedImage] : []),
        ...uploadedImages,
      ];
      const scheduledAt = asScheduled && scheduleDate
        ? new Date(`${scheduleDate}T${scheduleTime || "09:00"}:00`).toISOString()
        : null;
      const meta = JSON.stringify({
        topic, service, tone, language,
        textLayers: textLayers.length > 0 ? textLayers : undefined,
        customImagePrompt: customImagePrompt || undefined,
      });
      const res = await fetch("/api/admin/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption || `Draft: ${topic || service}`,
          hashtags: hashtags || null,
          postType: allImages.length > 1 ? "CAROUSEL" : "IMAGE",
          mediaUrls: allImages,
          mediaPaths: [],
          accountId: null,
          scheduledAt,
          status: scheduledAt ? "SCHEDULED" : "DRAFT",
          aiGenerated: true,
          aiPrompt: meta,
          musicUrl: selectedMusic?.audioUrl || null,
          musicTitle: selectedMusic?.title || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      // Clear autosave after explicit save
      localStorage.removeItem(AUTO_SAVE_KEY);
      setRestoreSession(null);
      setSuccess(scheduledAt ? `Agendado para ${new Date(scheduledAt).toLocaleString("pt-PT")}!` : "Draft guardado!");
      setTimeout(() => setSuccess(null), 4000);
      // Refresh draft list if open
      if (showDraftsPanel) loadDrafts();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function generateVideoScript() {
    if (!topic && !service) { setError("Add a topic first"); return; }
    setVideoLoading(true);
    setError(null);
    setVideoScript(null);
    try {
      const res = await fetch("/api/admin/marketing/generate-video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, service, tone, duration: videoDuration, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoScript(data.script);
      setCaption(data.script.caption || "");
      setHashtags(data.script.hashtags?.join(", ") || "");
    } catch (e: any) { setError(e.message); }
    finally { setVideoLoading(false); }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(f => setUploadedImages(prev => [...prev, URL.createObjectURL(f)]));
    e.target.value = "";
  }

  function copyCaption() {
    const full = `${caption}\n\n${hashtags.split(",").map(h => `#${h.trim().replace(/^#/, "")}`).join(" ")}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeImage = watermarkedImage || generatedImage || uploadedImages[0] || null;

  // Redraw canvas when image/logo/text settings change, or when returning to image tab
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === "image" && activeImage && (showWatermarkPanel || showTextPanel)) {
      // Delay to ensure canvas is mounted after tab switch
      const t = setTimeout(() => drawCanvas(activeImage), 50);
      return () => clearTimeout(t);
    }
  }, [activeImage, showWatermarkPanel, showTextPanel, logoLoaded, logoPos, wmOpacity, wmScale, textLayers, tab]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Restore Session Banner ── */}
      {restoreSession && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <RotateCcw className="h-4 w-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Sessão anterior encontrada</p>
            <p className="text-xs text-muted-foreground truncate">
              {restoreSession.topic || restoreSession.service || "Rascunho sem título"} —
              {" "}{new Date(restoreSession.savedAt).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <Button size="sm" onClick={() => applyRestore(restoreSession)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0 h-7 text-xs">
            Restaurar
          </Button>
          <button onClick={() => { setRestoreSession(null); localStorage.removeItem(AUTO_SAVE_KEY); }}
            className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Floating Music Indicator (shows on ANY tab while polling) ── */}
      {musicPollId && musicResult?.status === "pending" && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-violet-900/95 border border-violet-500/40 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-sm">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-full bg-violet-500/20 flex items-center justify-center">
              <span className="text-lg">🎵</span>
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-violet-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-violet-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-300">A gerar música…</p>
            <p className="text-[10px] text-muted-foreground">{musicResult?.title || "Suno AI"} · pode demorar 2-3 min</p>
          </div>
          <button onClick={() => setTab("music")}
            className="text-[10px] bg-violet-600 hover:bg-violet-500 text-white px-2.5 py-1 rounded-lg ml-1 shrink-0">
            Ver
          </button>
        </div>
      )}

      {/* ── Publish Result Modal ── */}
      {publishResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPublishResult(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {publishResult.ok ? (
              <>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Publicado com sucesso! 🎉</h3>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {publishResult.platforms.map(p => (
                      <Badge key={p} className={p === "Instagram"
                        ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }>
                        {p === "Instagram" ? "📸" : "📘"} {p}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">O teu post foi publicado e já está visível para os teus seguidores.</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => setPublishResult(null)} variant="outline" className="flex-1">
                    Continuar
                  </Button>
                  <Button onClick={resetPost} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold gap-1">
                    <Plus className="h-4 w-4" /> Novo Post
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="h-7 w-7 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Erro ao publicar</h3>
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{publishResult.error}</p>
                </div>
                <Button onClick={() => setPublishResult(null)} variant="outline" className="w-full mt-4">
                  Fechar
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/marketing/instagram-dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            Instagram Studio
          </h1>
          <p className="text-sm text-muted-foreground">AI para texto · imagem · vídeo · marca d'água · publicar</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-xs gap-1"><Sparkles className="h-3 w-3" /> Claude</Badge>
          <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-xs gap-1"><ImageIcon className="h-3 w-3" /> Gemini</Badge>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Config Panel */}
        <div className="space-y-4">
          {/* Topic */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tópico</label>
                {voice.isSupported && (
                  <button
                    type="button"
                    onClick={voice.status === "listening" ? voice.stop : voice.start}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      voice.status === "listening"
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {voice.status === "listening" ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {voice.status === "listening" ? "Parar" : "Falar"}
                  </button>
                )}
              </div>
              {voice.status === "listening" && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  A ouvir... {voice.interimTranscript && <span className="text-foreground italic">{voice.interimTranscript}</span>}
                </div>
              )}
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Escreve ou clica em 'Falar' para descrever o que queres criar..."
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none placeholder:text-muted-foreground/50"
              />
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_CHIPS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setService(s === service ? "" : s); if (!topic) setTopic(s); }}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${service === s ? "border-pink-500 bg-pink-500/10 text-pink-400" : "border-border text-muted-foreground hover:border-pink-500/40"}`}
                  >{s}</button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tone + Language */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tom</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => setTone(t.value)}
                    className={`text-xs px-2 py-1.5 rounded-lg border transition-all text-left ${tone === t.value ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Idioma do Post</label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Mic className="h-3 w-3" /> Voz sempre em PT
                </span>
              </div>
              <div className="flex gap-1.5">
                {(["en", "pt", "both"] as const).map(l => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${language === l ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                    {l === "en" ? "🇬🇧 EN" : l === "pt" ? "🇧🇷 PT" : "🇬🇧+🇧🇷"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Fala sempre em português — a IA gera o post no idioma seleccionado acima
              </p>
            </CardContent>
          </Card>

          {/* AI Action Buttons */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gerar com IA</label>
              <Button onClick={generatePost} disabled={generating} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white justify-start">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Texto + Imagem (Tudo)
              </Button>
              <Button onClick={generateCaptionOnly} disabled={generating} variant="outline" className="w-full justify-start">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlignLeft className="h-4 w-4 mr-2" />}
                Só Legenda / Texto
              </Button>
              <Button onClick={generateImageOnly} disabled={imageLoading} variant="outline" className="w-full justify-start">
                {imageLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Só Imagem (Gemini)
              </Button>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Film className="h-3.5 w-3.5" /> Script de Vídeo / Reel</p>
                <div className="flex gap-1.5 mb-2">
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setVideoDuration(d)}
                      className={`flex-1 text-xs py-1 rounded-lg border transition-all ${videoDuration === d ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                      {d}s
                    </button>
                  ))}
                </div>
                <Button onClick={() => { setTab("video"); generateVideoScript(); }} disabled={videoLoading} variant="outline" className="w-full justify-start border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                  {videoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
                  Gerar Script de Vídeo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload image */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ou faz Upload de Imagem</label>
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all flex items-center gap-2">
                <Upload className="h-4 w-4" /> Clica para fazer upload
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              {uploadedImages.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} className="h-12 w-12 rounded object-cover" alt="" />
                      <button onClick={() => setUploadedImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Preview + Output (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab Switcher */}
          <div className="flex bg-muted/40 rounded-xl p-1 gap-1">
            {([
              { id: "image" as StudioTab, icon: <ImageIcon className="h-3.5 w-3.5" />, label: "Imagem" },
              { id: "video" as StudioTab, icon: <Video className="h-3.5 w-3.5" />, label: "Script Vídeo" },
              { id: "caption" as StudioTab, icon: <FileText className="h-3.5 w-3.5" />, label: "Legenda" },
              { id: "viral" as StudioTab, icon: <Flame className="h-3.5 w-3.5" />, label: "Viral Scout" },
              { id: "music" as StudioTab, icon: <span className="text-xs">🎵</span>, label: "Música" },
              { id: "calendar" as StudioTab, icon: <Clock className="h-3.5 w-3.5" />, label: "Calendário" },
              { id: "intelligence" as StudioTab, icon: <Zap className="h-3.5 w-3.5" />, label: "Inteligência" },
              { id: "facebook" as StudioTab, icon: <Facebook className="h-3.5 w-3.5" />, label: "Facebook" },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  tab === t.id
                    ? t.id === "viral" ? "bg-orange-500/20 text-orange-400 shadow" : "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── IMAGE TAB ── */}
          {tab === "image" && (
            <div className="space-y-4">
              {/* Image Preview — 1:1 Instagram square */}
              <Card>
                <CardContent className="p-4">
                  {activeImage ? (
                    <div className="space-y-3">
                      {/* Canvas with live logo/text overlay */}
                      <div ref={canvasContainerRef} className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "1/1", background: "#111" }}>
                        {/* Always render canvas — shown when watermark or text panel open */}
                        <canvas
                          ref={canvasRef}
                          className="w-full h-full rounded-xl"
                          style={{
                            cursor: (showTextPanel && textLayers.length > 0) || (logoLoaded && showWatermarkPanel) ? (dragging ? "grabbing" : "grab") : "default",
                            display: (showWatermarkPanel || showTextPanel) ? "block" : "none",
                            position: (showWatermarkPanel || showTextPanel) ? "relative" : "absolute",
                          }}
                          onMouseDown={onCanvasMouseDown}
                          onMouseMove={onCanvasMouseMove}
                          onMouseUp={onCanvasMouseUp}
                          onMouseLeave={onCanvasMouseUp}
                        />
                        {!(showWatermarkPanel || showTextPanel) && (
                          <img src={activeImage} alt="Post" className="absolute inset-0 w-full h-full rounded-xl object-cover" />
                        )}
                        {(watermarkedImage || (showWatermarkPanel && logoLoaded)) && (
                          <div className="absolute top-2 left-2 pointer-events-none">
                            <Badge className="bg-emerald-500/80 text-white border-0 text-[10px] gap-1 backdrop-blur-sm">
                              <CheckCircle className="h-2.5 w-2.5" /> Logo
                            </Badge>
                          </div>
                        )}
                        {showTextPanel && textLayers.length > 0 && (
                          <div className="absolute bottom-2 left-2 pointer-events-none">
                            <span className="text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">🔀 Arrasta os textos na imagem</span>
                          </div>
                        )}
                        {showWatermarkPanel && logoLoaded && !showTextPanel && (
                          <div className="absolute bottom-2 left-2 pointer-events-none">
                            <span className="text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">🔀 Arrasta o logo</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 pointer-events-none bg-black/50 rounded text-[9px] text-white px-1.5 py-0.5 backdrop-blur-sm">1:1 · Instagram</div>
                      </div>
                      {/* Custom prompt row */}
                      <div className="space-y-2">
                        <button onClick={() => setShowCustomPrompt(v => !v)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                          <Sparkles className="h-3 w-3" />
                          {showCustomPrompt ? "Ocultar prompt personalizado" : "Escrever prompt para nova imagem"}
                        </button>
                        {showCustomPrompt && (
                          <div className="flex gap-2">
                            <input
                              value={customImagePrompt}
                              onChange={e => setCustomImagePrompt(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && generateImageOnly()}
                              placeholder="Descreve a imagem que queres gerar... (em inglês de preferência)"
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                            />
                            <button
                              type="button"
                              onClick={imgPromptVoice.status === "listening" ? imgPromptVoice.stop : imgPromptVoice.start}
                              className={`px-2.5 rounded-lg border transition-all shrink-0 ${
                                imgPromptVoice.status === "listening"
                                  ? "bg-red-500 border-red-500 text-white animate-pulse"
                                  : "bg-card border-border text-muted-foreground hover:text-foreground"
                              }`}>
                              {imgPromptVoice.status === "listening" ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={generateImageOnly} disabled={imageLoading} className="flex-1">
                          {imageLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                          {customImagePrompt.trim() ? "Gerar com Prompt" : "Nova Imagem"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowTextPanel(v => !v); if (!showWatermarkPanel && !showTextPanel) drawCanvas(activeImage); }}
                          className="flex-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
                          <Type className="h-3.5 w-3.5 mr-1" />
                          {showTextPanel ? "Fechar Texto" : "Texto"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowWatermarkPanel(v => !v); if (!showWatermarkPanel) drawCanvas(activeImage); }}
                          className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                          <Droplets className="h-3.5 w-3.5 mr-1" />
                          Logo
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => saveToImageLibrary(watermarkedImage || generatedImage || uploadedImages[0])}
                          title="Guardar imagem na biblioteca"
                          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 px-2.5">
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-56 text-muted-foreground gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                      <p className="text-sm text-center">Gera uma imagem com IA ou faz upload</p>
                      <Button size="sm" onClick={generateImageOnly} disabled={imageLoading || (!topic && !service)} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                        {imageLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                        Gerar Imagem
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Image Library Panel ── */}
              <Card className="border-border">
                <CardContent className="p-4 space-y-3">
                  <button
                    onClick={() => setShowImageLibrary(v => !v)}
                    className="w-full flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-cyan-400" />
                      Biblioteca de Imagens
                      {imageLibrary.length > 0 && (
                        <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px]">{imageLibrary.length}</Badge>
                      )}
                    </span>
                    {showImageLibrary ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {showImageLibrary && (
                    <div className="space-y-2">
                      {imageLibrary.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhuma imagem guardada ainda. Clica no ícone 💾 para guardar a imagem actual.
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        {imageLibrary.map(img => (
                          <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square border border-border hover:border-cyan-500/40 transition-all">
                            <img src={img.url} alt={img.topic} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                              <button
                                onClick={() => useImageFromLibrary(img.url)}
                                className="text-[10px] text-white bg-cyan-500/80 hover:bg-cyan-500 px-2 py-1 rounded font-medium w-full text-center">
                                Usar
                              </button>
                              <button
                                onClick={() => deleteFromImageLibrary(img.id)}
                                className="text-[10px] text-red-400 hover:text-red-300 w-full text-center">
                                Apagar
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 pointer-events-none">
                              <p className="text-[9px] text-white truncate">{img.topic}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Text Overlay Panel ── */}
              {showTextPanel && (
                <Card className="border-violet-500/30 bg-violet-500/5">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm text-violet-400 flex items-center justify-between">
                      <span className="flex items-center gap-2"><Type className="h-4 w-4" /> Texto sobre a Imagem</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1 text-amber-400 hover:text-amber-300"
                          onClick={generateAiTextSuggestions} disabled={aiTextLoading}>
                          {aiTextLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          IA Sugere
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1 text-violet-400"
                          onClick={() => {
                            const id = `txt-${Date.now()}`;
                            setTextLayers(prev => [...prev, {
                              id, text: "BPR", font: "Montserrat", size: 8,
                              color: "#ffffff", bold: true, align: "center",
                              x: 0.5, y: 0.5, shadow: true, shadowColor: "#000000",
                            }]);
                            setActiveTextId(id);
                            if (!showWatermarkPanel) drawCanvas(activeImage);
                          }}>
                          <Plus className="h-3 w-3" /> Adicionar
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* AI Suggestions */}
                    {aiTextSuggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Sugestões de capa geradas por IA — clica para aplicar
                        </p>
                        {aiTextSuggestions.map((sug, si) => (
                          <button key={si}
                            onClick={() => {
                              const layers: typeof textLayers = [];
                              const headId = `txt-${Date.now()}-h`;
                              layers.push({
                                id: headId, text: sug.headline,
                                font: sug.font, size: sug.size,
                                color: sug.color, bold: true,
                                align: "center",
                                x: 0.5, y: sug.y,
                                shadow: true, shadowColor: "#000000",
                              });
                              if (sug.subline) {
                                layers.push({
                                  id: `txt-${Date.now()}-s`, text: sug.subline,
                                  font: sug.font, size: Math.max(4, sug.size - 3),
                                  color: "#f0d080", bold: false,
                                  align: "center",
                                  x: 0.5, y: Math.min(0.92, sug.y + 0.13),
                                  shadow: true, shadowColor: "#000000",
                                });
                              }
                              // REPLACE all existing layers
                              setTextLayers(layers);
                              setActiveTextId(headId);
                            }}
                            className="w-full text-left p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs font-bold text-foreground">{sug.headline}</span>
                              <Badge className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/30 shrink-0">{sug.style}</Badge>
                            </div>
                            {sug.subline && <p className="text-[10px] text-muted-foreground">{sug.subline}</p>}
                            <p className="text-[9px] text-muted-foreground/60 mt-0.5">{sug.font} · {sug.color}</p>
                          </button>
                        ))}
                        <button onClick={() => setAiTextSuggestions([])}
                          className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center py-1">
                          Fechar sugestões
                        </button>
                      </div>
                    )}
                    {/* Cinema Poster Templates */}
                    {aiTextSuggestions.length === 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide font-semibold flex items-center gap-1">
                          🎬 Pôsteres Cinematográficos
                        </p>
                        <div className="space-y-1.5">
                          {[
                            {
                              label: "Cinema Clássico",
                              desc: "Título grande no centro · tagline em baixo · créditos",
                              preview: "bg-gradient-to-b from-black/0 via-black/20 to-black/80",
                              getLayers: (t: string) => [
                                { text: "BRUNO PHYSICAL", font: "Montserrat", size: 5, color: "#14b8a6", bold: true, align: "center" as const, x: 0.5, y: 0.08, shadow: false, shadowColor: "#000000" },
                                { text: "REHABILITATION", font: "Montserrat", size: 5, color: "#14b8a6", bold: true, align: "center" as const, x: 0.5, y: 0.13, shadow: false, shadowColor: "#000000" },
                                { text: t ? t.toUpperCase().slice(0, 22) : "FISIOTERAPIA & SAÚDE", font: "Oswald", size: 13, color: "#ffffff", bold: true, align: "center" as const, x: 0.5, y: 0.46, shadow: true, shadowColor: "#000000" },
                                { text: t ? `Descobre como tratamos ${t.toLowerCase().slice(0, 30)}` : "A tua recuperação começa aqui", font: "Georgia", size: 5, color: "#f0d080", bold: false, align: "center" as const, x: 0.5, y: 0.60, shadow: true, shadowColor: "#000000" },
                                { text: "BPR · BRUNO PHYSICAL REHABILITATION · bpr.rehab", font: "Montserrat", size: 3, color: "#aaaaaa", bold: false, align: "center" as const, x: 0.5, y: 0.93, shadow: false, shadowColor: "#000000" },
                              ]
                            },
                            {
                              label: "Pôster Épico",
                              desc: "Título topo · imagem · subtítulo base elegante",
                              preview: "bg-gradient-to-b from-black/70 via-transparent to-black/70",
                              getLayers: (t: string) => [
                                { text: "BPR PRESENTS", font: "Montserrat", size: 4, color: "#f0d080", bold: true, align: "center" as const, x: 0.5, y: 0.07, shadow: true, shadowColor: "#000000" },
                                { text: t ? t.toUpperCase().slice(0, 20) : "RECUPERAÇÃO TOTAL", font: "Impact", size: 12, color: "#ffffff", bold: true, align: "center" as const, x: 0.5, y: 0.18, shadow: true, shadowColor: "#000000" },
                                { text: "——————————", font: "Montserrat", size: 4, color: "#14b8a6", bold: false, align: "center" as const, x: 0.5, y: 0.25, shadow: false, shadowColor: "#000000" },
                                { text: t ? `A solução para ${t.toLowerCase().slice(0, 28)} está aqui` : "A história da tua recuperação começa aqui", font: "Georgia", size: 5, color: "#e8e8e8", bold: false, align: "center" as const, x: 0.5, y: 0.82, shadow: true, shadowColor: "#000000" },
                                { text: "bpr.rehab", font: "Montserrat", size: 4, color: "#14b8a6", bold: true, align: "center" as const, x: 0.5, y: 0.90, shadow: false, shadowColor: "#000000" },
                              ]
                            },
                            {
                              label: "Editorial Luxury",
                              desc: "Estilo Vogue/magazine · fonte serifada · minimalista",
                              preview: "bg-gradient-to-br from-amber-900/20 to-black/40",
                              getLayers: (t: string) => [
                                { text: "B R U N O  P H Y S I C A L", font: "Montserrat", size: 3.5, color: "#c9a84c", bold: true, align: "center" as const, x: 0.5, y: 0.06, shadow: false, shadowColor: "#000000" },
                                { text: "REHABILITATION", font: "Playfair Display", size: 7, color: "#ffffff", bold: true, align: "center" as const, x: 0.5, y: 0.13, shadow: true, shadowColor: "#000000" },
                                { text: "——", font: "Montserrat", size: 6, color: "#c9a84c", bold: false, align: "center" as const, x: 0.5, y: 0.50, shadow: false, shadowColor: "#000000" },
                                { text: t ? t.toUpperCase().slice(0, 18) : "EXCELÊNCIA EM SAÚDE", font: "Playfair Display", size: 9, color: "#ffffff", bold: true, align: "center" as const, x: 0.5, y: 0.62, shadow: true, shadowColor: "#111111" },
                                { text: t ? `Especialistas em ${t.toLowerCase().slice(0, 26)}` : "A sua frase de impacto aqui", font: "Georgia", size: 4.5, color: "#d4d4d4", bold: false, align: "center" as const, x: 0.5, y: 0.72, shadow: false, shadowColor: "#000000" },
                                { text: "bpr.rehab  ·  UK", font: "Montserrat", size: 3, color: "#c9a84c", bold: false, align: "center" as const, x: 0.5, y: 0.95, shadow: false, shadowColor: "#000000" },
                              ]
                            },
                            {
                              label: "Breaking News",
                              desc: "Urgência · destaque em cor · faixa inferior",
                              preview: "bg-gradient-to-t from-red-900/50 to-transparent",
                              getLayers: (t: string) => [
                                { text: "BREAKING", font: "Impact", size: 7, color: "#ff3333", bold: true, align: "center" as const, x: 0.5, y: 0.06, shadow: true, shadowColor: "#000000" },
                                { text: t ? t.toUpperCase().slice(0, 20) : "NOVA ABORDAGEM", font: "Impact", size: 11, color: "#ffffff", bold: true, align: "center" as const, x: 0.5, y: 0.45, shadow: true, shadowColor: "#000000" },
                                { text: t ? `Tudo o que precisas saber sobre ${t.toLowerCase().slice(0, 22)}` : "Descobre o que está a mudar", font: "Montserrat", size: 4.5, color: "#ffee88", bold: false, align: "center" as const, x: 0.5, y: 0.57, shadow: true, shadowColor: "#000000" },
                                { text: "BPR PHYSIOTHERAPY  ·  bpr.rehab", font: "Montserrat", size: 3.5, color: "#ffffff", bold: true, align: "center" as const, x: 0.5, y: 0.93, shadow: false, shadowColor: "#000000" },
                              ]
                            },
                            {
                              label: "Documentary",
                              desc: "Estilo Netflix/HBO · texto lateral · data base",
                              preview: "bg-gradient-to-r from-black/60 to-transparent",
                              getLayers: (t: string) => [
                                { text: "BPR", font: "Montserrat", size: 5, color: "#14b8a6", bold: true, align: "left" as const, x: 0.07, y: 0.08, shadow: false, shadowColor: "#000000" },
                                { text: "DOCUMENTARY", font: "Montserrat", size: 3.5, color: "#aaaaaa", bold: false, align: "left" as const, x: 0.07, y: 0.14, shadow: false, shadowColor: "#000000" },
                                { text: t ? t.toUpperCase().slice(0, 16) : "SAÚDE & MOVIMENTO", font: "Oswald", size: 13, color: "#ffffff", bold: true, align: "left" as const, x: 0.07, y: 0.50, shadow: true, shadowColor: "#000000" },
                                { text: t ? `A verdade sobre ${t.toLowerCase().slice(0, 28)}` : "Uma história de superação", font: "Georgia", size: 4.5, color: "#cccccc", bold: false, align: "left" as const, x: 0.07, y: 0.62, shadow: true, shadowColor: "#000000" },
                                { text: "bpr.rehab  ·  2026", font: "Montserrat", size: 3, color: "#14b8a6", bold: false, align: "left" as const, x: 0.07, y: 0.93, shadow: false, shadowColor: "#000000" },
                              ]
                            },
                            {
                              label: "Motivacional",
                              desc: "Frase de impacto · grande · sombra densa",
                              preview: "bg-gradient-to-b from-transparent to-black/50",
                              getLayers: (t: string) => [
                                { text: t ? `"${t.toUpperCase().slice(0, 14)}` : '"A FRASE MAIS', font: "Playfair Display", size: 10, color: "#ffffff", bold: true, align: "center" as const, x: 0.5, y: 0.32, shadow: true, shadowColor: "#000000" },
                                { text: t ? `${t.toUpperCase().slice(14, 28)}"` : 'IMPACTANTE"', font: "Playfair Display", size: 10, color: "#f0d080", bold: true, align: "center" as const, x: 0.5, y: 0.44, shadow: true, shadowColor: "#000000" },
                                { text: "— Bruno Physical Rehabilitation", font: "Georgia", size: 4, color: "#cccccc", bold: false, align: "center" as const, x: 0.5, y: 0.58, shadow: true, shadowColor: "#000000" },
                                { text: "bpr.rehab", font: "Montserrat", size: 3.5, color: "#14b8a6", bold: true, align: "center" as const, x: 0.5, y: 0.92, shadow: false, shadowColor: "#000000" },
                              ]
                            },
                          ].map((tpl, ti) => (
                            <button key={ti}
                              onClick={() => {
                                setTextLayers([]);
                                setTimeout(() => {
                                  const t = topic || service || "";
                                  const newLayers = tpl.getLayers(t).map((l, li) => ({ ...l, id: `txt-${Date.now()}-${ti}-${li}` }));
                                  setTextLayers(newLayers);
                                  setActiveTextId(newLayers[0].id);
                                }, 10);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-xl border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-foreground">{tpl.label}</span>
                                <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{tpl.getLayers("").length} layers</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">{tpl.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {textLayers.length === 0 && aiTextSuggestions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        Clica num padrão acima, em <span className="text-amber-400">✦ IA Sugere</span> ou em <span className="text-violet-400">+ Adicionar</span>
                      </p>
                    )}
                    {textLayers.map((layer) => (
                      <div key={layer.id}
                        className={`space-y-2 p-3 rounded-lg border transition-all cursor-pointer ${activeTextId === layer.id ? "border-violet-500/60 bg-violet-500/10" : "border-border hover:border-violet-500/30"}`}
                        onClick={() => setActiveTextId(layer.id)}>
                        <div className="flex gap-2 items-center">
                          <input
                            value={layer.text}
                            onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: e.target.value } : l))}
                            onClick={e => e.stopPropagation()}
                            placeholder="Escreve aqui..."
                            className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground outline-none focus:border-violet-500/50"
                          />
                          <button onClick={e => { e.stopPropagation(); setTextLayers(prev => prev.filter(l => l.id !== layer.id)); }}
                            className="text-muted-foreground hover:text-red-400 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        {activeTextId === layer.id && (
                          <div className="space-y-2 pt-1">
                            {/* Font selector */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Fonte</label>
                                <select value={layer.font}
                                  onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, font: e.target.value } : l))}
                                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground outline-none">
                                  {["Montserrat","Impact","Georgia","Arial","Oswald","Roboto","Playfair Display"].map(f => (
                                    <option key={f} value={f}>{f}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Tamanho: {layer.size}%</label>
                                <input type="range" min={3} max={20} value={layer.size}
                                  onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, size: Number(e.target.value) } : l))}
                                  className="w-full accent-violet-500" />
                              </div>
                            </div>
                            {/* Colour + align + bold */}
                            <div className="flex items-center gap-3">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Cor</label>
                                <div className="flex gap-1 flex-wrap">
                                  {["#ffffff","#000000","#14b8a6","#0ea5e9","#f59e0b","#ef4444","#a855f7"].map(c => (
                                    <button key={c} onClick={() => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, color: c } : l))}
                                      className={`w-5 h-5 rounded-full border-2 transition-all ${layer.color === c ? "border-violet-400 scale-110" : "border-transparent"}`}
                                      style={{ background: c }} />
                                  ))}
                                  <input type="color" value={layer.color}
                                    onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, color: e.target.value } : l))}
                                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0" />
                                </div>
                              </div>
                              <div className="flex gap-1 ml-auto">
                                {(["left","center","right"] as const).map(a => (
                                  <button key={a} onClick={() => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, align: a } : l))}
                                    className={`p-1 rounded border transition-all ${layer.align === a ? "border-violet-500 bg-violet-500/20 text-violet-400" : "border-border text-muted-foreground"}`}>
                                    {a === "left" ? <AlignLeft className="h-3 w-3" /> : a === "center" ? <AlignCenter className="h-3 w-3" /> : <AlignRight className="h-3 w-3" />}
                                  </button>
                                ))}
                                <button onClick={() => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, bold: !l.bold } : l))}
                                  className={`p-1 rounded border transition-all ${layer.bold ? "border-violet-500 bg-violet-500/20 text-violet-400" : "border-border text-muted-foreground"}`}>
                                  <Bold className="h-3 w-3" />
                                </button>
                                <button onClick={() => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, shadow: !l.shadow } : l))}
                                  className={`px-2 py-1 rounded border text-[10px] transition-all ${layer.shadow ? "border-violet-500 bg-violet-500/20 text-violet-400" : "border-border text-muted-foreground"}`}>
                                  Sombra
                                </button>
                              </div>
                            </div>
                            {/* Shadow strength */}
                            {layer.shadow && (
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Intensidade sombra: {layer.shadowBlur ?? 8}px</label>
                                <input type="range" min={2} max={60} value={layer.shadowBlur ?? 8}
                                  onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, shadowBlur: Number(e.target.value) } : l))}
                                  className="w-full accent-violet-500" />
                              </div>
                            )}

                            {/* Background / Backdrop */}
                            <div className="space-y-1.5 pt-1 border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Fundo atrás do texto</label>
                                <button
                                  onClick={() => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, bgEnabled: !l.bgEnabled } : l))}
                                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${layer.bgEnabled ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-border text-muted-foreground"}`}>
                                  {layer.bgEnabled ? "Activo" : "Off"}
                                </button>
                              </div>
                              {layer.bgEnabled && (
                                <div className="space-y-1.5">
                                  {/* Bg colour presets + picker */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground w-10 shrink-0">Cor</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {["#000000","#111111","#1e293b","#ffffff","#14b8a6","#7c3aed","#dc2626"].map(c => (
                                        <button key={c}
                                          onClick={() => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, bgColor: c } : l))}
                                          className={`w-4 h-4 rounded-sm border-2 transition-all ${(layer.bgColor ?? "#000000") === c ? "border-violet-400 scale-110" : "border-transparent"}`}
                                          style={{ background: c }} />
                                      ))}
                                      <input type="color" value={layer.bgColor ?? "#000000"}
                                        onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, bgColor: e.target.value } : l))}
                                        className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0" />
                                    </div>
                                  </div>
                                  {/* Opacity */}
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">Opacidade: {layer.bgOpacity ?? 60}%</label>
                                    <input type="range" min={5} max={95} value={layer.bgOpacity ?? 60}
                                      onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, bgOpacity: Number(e.target.value) } : l))}
                                      className="w-full accent-violet-500" />
                                  </div>
                                  {/* Blur */}
                                  <div>
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">Blur de fundo: {layer.bgBlur ?? 0}px {(layer.bgBlur ?? 0) === 0 ? "(desligado)" : "(frosted glass)"}</label>
                                    <input type="range" min={0} max={20} value={layer.bgBlur ?? 0}
                                      onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, bgBlur: Number(e.target.value) } : l))}
                                      className="w-full accent-cyan-500" />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Position */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Posição X: {Math.round(layer.x * 100)}%</label>
                                <input type="range" min={5} max={95} value={Math.round(layer.x * 100)}
                                  onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, x: Number(e.target.value) / 100 } : l))}
                                  className="w-full accent-violet-500" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block mb-1">Posição Y: {Math.round(layer.y * 100)}%</label>
                                <input type="range" min={5} max={95} value={Math.round(layer.y * 100)}
                                  onChange={e => setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, y: Number(e.target.value) / 100 } : l))}
                                  className="w-full accent-violet-500" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {textLayers.length > 0 && (
                      <Button
                        onClick={() => {
                          if (activeImage) {
                            drawCanvas(activeImage, () => {
                              const dataUrl = getCanvasDataUrl();
                              if (dataUrl) {
                                setWatermarkedImage(dataUrl);
                                setSuccess("Texto aplicado! Imagem pronta para publicar.");
                                setTimeout(() => setSuccess(null), 3000);
                              }
                            });
                          }
                        }}
                        disabled={!activeImage}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold">
                        <CheckCircle className="h-4 w-4 mr-2" /> Confirmar Texto na Imagem
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Watermark Panel */}
              {showWatermarkPanel && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                      <Droplets className="h-4 w-4" /> Marca d'Água / Logo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Logo upload row */}
                    <div className="flex gap-2">
                      {logoLoaded ? (
                        <div className="flex items-center gap-2 flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs text-emerald-400 truncate flex-1">Logo carregado</span>
                          <button onClick={() => { setLogoUrl(""); setLogoLoaded(false); localStorage.removeItem("bpr_studio_logo"); }}
                            className="text-muted-foreground hover:text-red-400 shrink-0"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                          placeholder="URL do logo ou faz upload"
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-amber-500/50 placeholder:text-muted-foreground/50" />
                      )}
                      <Button size="sm" variant="outline" onClick={() => logoFileRef.current?.click()} className="text-xs shrink-0">
                        <Upload className="h-3.5 w-3.5 mr-1" /> {logoLoaded ? "Trocar" : "Upload"}
                      </Button>
                      <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                    </div>

                    {/* Auto-logo toggle */}
                    <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Logo automático</p>
                        <p className="text-[10px] text-muted-foreground">Aplica o logo em todas as imagens geradas</p>
                      </div>
                      <button
                        onClick={() => setAutoLogoEnabled(v => !v)}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                          autoLogoEnabled ? "bg-amber-500" : "bg-muted"
                        }`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          autoLogoEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>

                    {/* Colour tint */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Cor do logo</label>
                        <button onClick={() => setLogoTintEnabled(v => !v)}
                          className="text-[10px] text-amber-400 hover:text-amber-300">
                          {logoTintEnabled ? "Usar original" : "Aplicar cor"}
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        {["#ffffff", "#000000", "#0ea5e9", "#14b8a6", "#a855f7", "#f97316", "#ef4444"].map(c => (
                          <button key={c} onClick={() => { setLogoTintColor(c); setLogoTintEnabled(true); }}
                            title={c}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              logoTintEnabled && logoTintColor === c ? "border-amber-400 scale-110" : "border-transparent hover:border-muted-foreground"
                            }`}
                            style={{ background: c }} />
                        ))}
                        <input type="color" value={logoTintColor}
                          onChange={e => { setLogoTintColor(e.target.value); setLogoTintEnabled(true); }}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                          title="Cor personalizada" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Tamanho: {Math.round(wmScale * 100)}%</label>
                        <input type="range" min={10} max={50} value={Math.round(wmScale * 100)}
                          onChange={e => setWmScale(Number(e.target.value) / 100)}
                          className="w-full accent-amber-500" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Opacidade: {Math.round(wmOpacity * 100)}%</label>
                        <input type="range" min={20} max={100} value={Math.round(wmOpacity * 100)}
                          onChange={e => setWmOpacity(Number(e.target.value) / 100)}
                          className="w-full accent-amber-500" />
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const dataUrl = getCanvasDataUrl();
                        if (dataUrl) {
                          setWatermarkedImage(dataUrl);
                          setSuccess("Logo aplicado! A imagem está pronta para publicar.");
                          setTimeout(() => setSuccess(null), 3000);
                        } else {
                          setError("Carrega um logo primeiro");
                        }
                      }}
                      disabled={!logoLoaded || !activeImage}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Logo na Imagem
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── VIDEO TAB ── */}
          {tab === "video" && (
            <div className="space-y-3">
              {videoLoading && (
                <Card>
                  <CardContent className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">A criar script de vídeo com Claude AI...</span>
                  </CardContent>
                </Card>
              )}
              {videoScript && !videoLoading && (
                <>
                  {/* Hook */}
                  <Card className="border-pink-500/30 bg-pink-500/5">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-pink-400 mb-1.5 uppercase tracking-wide">🎣 Hook (0-3s) — Para o Scroll</p>
                      <p className="text-sm font-semibold text-foreground">"{videoScript.hook}"</p>
                    </CardContent>
                  </Card>

                  {/* Script segments */}
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm">Script Completo ({videoDuration}s)</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {videoScript.script?.map((seg: any, i: number) => (
                        <div key={i} className="border border-border rounded-lg overflow-hidden">
                          <button onClick={() => setExpandedSegment(expandedSegment === i ? null : i)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left">
                            <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px] shrink-0">{seg.time}</Badge>
                            <span className="text-xs text-foreground flex-1 line-clamp-1">{seg.audio}</span>
                            {expandedSegment === i ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          </button>
                          {expandedSegment === i && (
                            <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/10 space-y-2 text-xs">
                              <p><span className="text-muted-foreground">🎙️ Fala:</span> <span className="text-foreground">{seg.audio}</span></p>
                              <p><span className="text-muted-foreground">📹 Visual:</span> <span className="text-foreground">{seg.visual}</span></p>
                              {seg.text_overlay && <p><span className="text-muted-foreground">📝 Texto no ecrã:</span> <span className="text-foreground">{seg.text_overlay}</span></p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* CTA + Tips */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                      <CardContent className="p-3">
                        <p className="text-xs font-semibold text-emerald-400 mb-1">📢 CTA Final</p>
                        <p className="text-xs text-foreground">{videoScript.cta}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-500/30 bg-blue-500/5">
                      <CardContent className="p-3">
                        <p className="text-xs font-semibold text-blue-400 mb-1">🎵 Música</p>
                        <p className="text-xs text-foreground capitalize">{videoScript.music_mood}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {videoScript.filming_tips?.length > 0 && (
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">📷 Dicas de Filmagem</p>
                        <ul className="space-y-1">
                          {videoScript.filming_tips.map((tip: string, i: number) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">✓</span>{tip}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Button variant="outline" onClick={generateVideoScript} disabled={videoLoading} className="w-full">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerar Script
                  </Button>
                </>
              )}
              {!videoScript && !videoLoading && (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Film className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Escolhe um tópico e clica em "Gerar Script de Vídeo"</p>
                    <Button onClick={generateVideoScript} disabled={!topic && !service}
                      className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                      <Video className="h-4 w-4 mr-2" /> Gerar Script {videoDuration}s
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── CAPTION TAB ── */}
          {tab === "caption" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legenda</label>
                  <Button size="sm" variant="ghost" onClick={generateCaptionOnly} disabled={generating} className="text-xs h-6 px-2">
                    {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Regenerar
                  </Button>
                </div>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={8}
                  placeholder="A legenda do post..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none placeholder:text-muted-foreground/50" />
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> Hashtags</label>
                <input value={hashtags} onChange={e => setHashtags(e.target.value)}
                  placeholder="physiotherapy, rehabilitation, BPR, London..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50" />
              </CardContent>
            </Card>
          )}

          {/* ── VIRAL SCOUT TAB ── */}
          {tab === "viral" && (
            <div className="space-y-4">
              {/* Controls */}
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-semibold text-orange-400">Viral Scout</span>
                    <span className="text-xs text-muted-foreground">— descreve qualquer tema e a IA encontra conteúdo viral para recriar</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={viralQuery}
                      onChange={e => setViralQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && generateViralIdeas()}
                      placeholder="ex: palmilhas para corredores, dor no joelho, postura no trabalho, MLS laser..."
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500/50 placeholder:text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={viralVoice.status === "listening" ? viralVoice.stop : viralVoice.start}
                      className={`px-3 rounded-lg border transition-all shrink-0 ${
                        viralVoice.status === "listening"
                          ? "bg-red-500 border-red-500 text-white animate-pulse"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                      title="Falar"
                    >
                      {viralVoice.status === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <Button
                      onClick={generateViralIdeas}
                      disabled={viralLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shrink-0"
                    >
                      {viralLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    </Button>
                  </div>
                  {viralVoice.status === "listening" && (
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      A ouvir... {viralVoice.interimTranscript}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {["Fisioterapia", "Lesões Desportivas", "Dor Crónica", "Postura", "Pé & Ortóticos", "Recuperação", "Bem-estar", "Laser MLS", "Site BPR", "Marketplace", "Artigos do Blog"].map(chip => (
                      <button key={chip} onClick={() => setViralQuery(chip)}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-orange-500/30 text-orange-300/70 hover:text-orange-300 hover:border-orange-500/60 transition-all">
                        {chip}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Loading */}
              {viralLoading && (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                      <span className="text-sm">A analisar tendências virais em fisioterapia...</span>
                    </div>
                    <p className="text-xs text-center max-w-xs">Claude está a pesquisar padrões de conteúdo viral no nicho de saúde e reabilitação</p>
                  </CardContent>
                </Card>
              )}

              {/* Ideas Grid */}
              {!viralLoading && viralIdeas.length > 0 && (
                <div className="space-y-3">
                  {/* Batch save bar */}
                  <div className="flex items-center justify-between gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-orange-400">{viralIdeas.length} ideias geradas</p>
                      <p className="text-[10px] text-muted-foreground">
                        {viralSavedIds.size > 0 ? `${viralSavedIds.size} guardadas como draft` : "Guarda todas de uma vez ou usa uma individualmente"}
                      </p>
                    </div>
                    <Button size="sm" onClick={saveAllViralIdeas} disabled={viralSavingAll || viralSavedIds.size === viralIdeas.length}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs shrink-0 gap-1">
                      {viralSavingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {viralSavedIds.size === viralIdeas.length ? "Todas guardadas ✓" : "Guardar Todas"}
                    </Button>
                  </div>

                  {viralIdeas.map((idea, i) => (
                    <Card key={i} className={`border-border hover:border-orange-500/40 transition-colors ${viralSavedIds.has(i) ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-foreground">{idea.format}</span>
                              <Badge className={`text-[10px] shrink-0 ${
                                idea.content_type === "REEL"
                                  ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                  : idea.content_type === "CAROUSEL"
                                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              }`}>{idea.content_type}</Badge>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, j) => (
                                  <span key={j} className={`text-[10px] ${j < Math.round((idea.viral_score || 7) / 2) ? "text-orange-400" : "text-muted"}`}>★</span>
                                ))}
                                <span className="text-[10px] text-muted-foreground ml-0.5">{idea.viral_score}/10</span>
                              </div>
                              {viralSavedIds.has(i) && (
                                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0">
                                  <CheckCircle className="h-2.5 w-2.5 mr-1" /> Draft guardado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{idea.trending_reference}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {viralSavedIds.has(i) && (
                              <button onClick={() => deleteViralDraft(i)}
                                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => useViralIdea(idea)}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                            >
                              <Zap className="h-3.5 w-3.5 mr-1" /> Usar
                            </Button>
                          </div>
                        </div>

                        {/* Hook */}
                        <div className="bg-muted/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-orange-400 font-semibold mb-0.5">🎣 HOOK</p>
                          <p className="text-xs text-foreground font-medium">"{idea.hook}"</p>
                        </div>

                        {/* BPR adaptation */}
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold mb-0.5 uppercase tracking-wide">Adaptação para BPR</p>
                          <p className="text-xs text-foreground">{idea.bpr_adaptation}</p>
                        </div>

                        {/* Viral reason */}
                        <div className="flex items-start gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">{idea.viral_reason}</p>
                        </div>

                        {/* BPR Connection */}
                        {idea.bpr_connection && (
                          <div className="flex items-start gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                            <span className="text-blue-400 text-xs shrink-0">🔗</span>
                            <p className="text-xs text-blue-300">{idea.bpr_connection}</p>
                          </div>
                        )}
                        {/* Visual + Time + Hashtags */}
                        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                          {idea.visual_direction && (
                            <span className="flex-1 bg-muted/30 rounded px-2 py-1 line-clamp-1 min-w-0">📹 {idea.visual_direction}</span>
                          )}
                          {idea.best_time && (
                            <span className="bg-emerald-500/10 text-emerald-400 rounded px-2 py-1 shrink-0">🕐 {idea.best_time}</span>
                          )}
                          <span className="bg-muted/30 rounded px-2 py-1 shrink-0">{idea.hashtags?.length || 0} #tags</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!viralLoading && viralIdeas.length === 0 && (
                <Card>
                  <CardContent className="p-10 flex flex-col items-center gap-3 text-muted-foreground">
                    <Flame className="h-12 w-12 opacity-20" />
                    <p className="text-sm font-medium">Descobre conteúdo viral</p>
                    <p className="text-xs text-center max-w-xs">Selecciona um nicho e clica "Buscar Virais" — Claude analisa padrões de conteúdo viral e sugere ideias adaptadas para o BPR</p>
                    <Button onClick={generateViralIdeas} disabled={viralLoading}
                      className="bg-orange-500 hover:bg-orange-600 text-white">
                      <TrendingUp className="h-4 w-4 mr-2" /> Buscar Virais Agora
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── MUSIC TAB ── */}
          {tab === "music" && (
            <div className="space-y-4">
              <Card className="border-violet-500/30 bg-violet-500/5">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎵</span>
                    <span className="text-sm font-semibold text-violet-400">Música para o Reel</span>
                    <span className="text-xs text-muted-foreground">— Suno AI gera música personalizada para o teu post</span>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Duração</label>
                    <div className="flex gap-2">
                      {([15, 30, 60, 90] as const).map(d => (
                        <button key={d} onClick={() => setMusicDuration(d)}
                          className={`flex-1 py-1.5 rounded-lg border text-sm transition-all ${musicDuration === d ? "border-violet-500 bg-violet-500/10 text-foreground font-semibold" : "border-border text-muted-foreground"}`}>
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Tipo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "instrumental", label: "Instrumental", icon: "🎹", desc: "Só música" },
                        { value: "vocal", label: "Com Voz", icon: "🎤", desc: "Cantado" },
                        { value: "spoken", label: "Falado", icon: "🗣️", desc: "Narrado" },
                      ].map(t => (
                        <button key={t.value} onClick={() => setMusicType(t.value as any)}
                          className={`flex flex-col items-center py-2.5 px-2 rounded-lg border text-center transition-all ${
                            musicType === t.value ? "border-violet-500 bg-violet-500/10 text-foreground" : "border-border text-muted-foreground hover:border-violet-500/40"
                          }`}>
                          <span className="text-lg mb-0.5">{t.icon}</span>
                          <span className="text-xs font-medium">{t.label}</span>
                          <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Estilo Musical</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "motivational upbeat", "calm relaxing", "energetic", "corporate professional",
                        "emotional cinematic", "electronic", "acoustic guitar", "piano ambient"
                      ].map(s => (
                        <button key={s} onClick={() => setMusicStyle(s)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            musicStyle === s ? "border-violet-500 bg-violet-500/10 text-foreground" : "border-border text-muted-foreground hover:border-violet-500/40"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lyrics (only for vocal) */}
                  {musicType === "vocal" && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                        Letra (opcional — deixa vazio para gerar automaticamente)
                      </label>
                      <textarea
                        value={musicLyrics}
                        onChange={e => setMusicLyrics(e.target.value)}
                        placeholder="Escreve a letra ou deixa em branco para a IA criar com base no tópico..."
                        rows={3}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-violet-500/50 resize-none placeholder:text-muted-foreground/50"
                      />
                    </div>
                  )}

                  <Button
                    onClick={generateMusic}
                    disabled={musicLoading || (!topic && !service)}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                  >
                    {musicLoading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A gerar música com Suno AI...</>
                      : <><span className="mr-2">🎵</span> Gerar Música ({musicDuration}s · {musicType})</>
                    }
                  </Button>
                </CardContent>
              </Card>

              {/* ── Current Result ── */}
              {musicResult && (
                <Card className="border-violet-500/30 bg-violet-500/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {musicResult.status !== "complete"
                          ? <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                          : <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
                        <span className="text-sm font-semibold text-foreground truncate">
                          {musicResult.title || `${topic || service || "BPR"} · ${musicStyle}`}
                        </span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">{musicDuration}s</Badge>
                        <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">{musicType}</Badge>
                      </div>
                    </div>

                    {/* Pending state */}
                    {musicResult.status !== "complete" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                          <div>
                            <p className="font-medium">A gerar com Suno AI…</p>
                            <p className="text-amber-300/70">Pode demorar 1-3 minutos. Podes continuar a trabalhar — a música aparece automaticamente quando ficar pronta.</p>
                          </div>
                        </div>
                        <div className="w-full bg-violet-500/10 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 bg-violet-500 rounded-full animate-pulse" style={{ width: `${Math.min(90, (musicPollAttemptsRef.current / 40) * 100)}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Show generated lyrics if any */}
                    {musicResult.lyrics && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] text-violet-400 font-semibold mb-1">🎤 LETRA GERADA</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{musicResult.lyrics}</p>
                      </div>
                    )}

                    {/* Both tracks */}
                    {musicResult.status === "complete" && musicResult.tracks && musicResult.tracks.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                          🎵 Suno gerou {musicResult.tracks.length} versões — escolhe a que preferes:
                        </p>
                        {musicResult.tracks.map((track: any, i: number) => (
                          <div key={track.id} className="space-y-2 border border-violet-500/20 rounded-xl p-3 bg-violet-500/5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-violet-300">Versão {i + 1}</span>
                              {track.duration && <span className="text-[10px] text-muted-foreground">{Math.round(track.duration)}s</span>}
                            </div>
                            <audio
                              controls
                              className="w-full h-9"
                              src={track.audioUrl || track.streamUrl}
                              style={{ filter: "hue-rotate(260deg)" }}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveToMusicLibrary({ ...musicResult, ...track })}
                                disabled={musicSaving}
                                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-1 h-7 text-xs">
                                {musicSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                Guardar V{i + 1}
                              </Button>
                              <a href={track.audioUrl || track.streamUrl}
                                download={`${track.title || "bpr-music"}-v${i + 1}.mp3`}
                                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-lg px-3 h-7">
                                ⬇️ MP3
                              </a>
                            </div>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" onClick={() => setMusicResult(null)}
                          className="w-full h-8 text-xs gap-1.5">
                          <RefreshCw className="h-3 w-3" /> Gerar novas versões
                        </Button>
                      </div>
                    )}

                    {/* Fallback single player (if tracks array not present) */}
                    {musicResult.status === "complete" && !musicResult.tracks && (musicResult.audioUrl || musicResult.streamUrl) && (
                      <div className="space-y-2">
                        <audio
                          controls
                          className="w-full h-9"
                          src={musicResult.audioUrl || musicResult.streamUrl}
                          style={{ filter: "hue-rotate(260deg)" }}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveToMusicLibrary(musicResult)}
                            disabled={musicSaving}
                            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-1 h-8 text-xs">
                            {musicSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Guardar na Biblioteca
                          </Button>
                          <a href={musicResult.audioUrl || musicResult.streamUrl}
                            download={`${musicResult.title || "bpr-music"}.mp3`}
                            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-lg px-3 h-8">
                            ⬇️ MP3
                          </a>
                          <Button size="sm" variant="outline" onClick={() => setMusicResult(null)}
                            className="h-8 w-8 p-0 shrink-0">
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── Music Library ── */}
              <Card className="border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => { setShowMusicLibrary(v => !v); if (!showMusicLibrary && musicLibrary.length === 0) loadMusicLibrary(); }}
                      className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        🎼 Biblioteca de Músicas
                        {musicLibrary.length > 0 && (
                          <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px]">{musicLibrary.length}</Badge>
                        )}
                      </span>
                      {showMusicLibrary ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <Button size="sm" variant="outline" onClick={() => musicFileRef.current?.click()}
                      disabled={musicUploadLoading}
                      className="shrink-0 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10 gap-1 h-7">
                      {musicUploadLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      Upload
                    </Button>
                    <input ref={musicFileRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" className="hidden" onChange={uploadMusicFile} />
                  </div>

                  {/* Selected music indicator */}
                  {selectedMusic && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-emerald-400 flex-1 truncate">📎 {selectedMusic.title} — vai com o post</span>
                      <button onClick={() => setSelectedMusic(null)} className="text-muted-foreground hover:text-red-400 shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {showMusicLibrary && (
                    <div className="space-y-2">
                      {musicLibLoading && (
                        <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">A carregar biblioteca...</span>
                        </div>
                      )}
                      {!musicLibLoading && musicLibrary.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhuma música ainda. Gera com Suno AI ou faz upload de um ficheiro MP3.
                        </p>
                      )}
                      {musicLibrary.map(track => (
                        <div key={track.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedMusic?.id === track.id
                              ? 'border-emerald-500/60 bg-emerald-500/5'
                              : 'border-border hover:border-violet-500/30'
                          }`}
                          onClick={() => setSelectedMusic(selectedMusic?.id === track.id ? null : { id: track.id, title: track.title, audioUrl: track.audioUrl })}>
                          <button
                            onClick={e => { e.stopPropagation(); togglePlay(track.id, track.audioUrl); }}
                            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              playingId === track.id
                                ? 'bg-violet-500 text-white'
                                : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                            }`}>
                            {playingId === track.id
                              ? <span className="text-xs font-bold">■</span>
                              : <span className="text-xs font-bold">▶</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {track.source === 'upload' ? '📁 Upload' : '🤖 Suno'}
                              {track.style ? ` · ${track.style}` : ''}
                              {track.duration ? ` · ${track.duration}s` : ''}
                              {track.type && track.source !== 'upload' ? ` · ${track.type}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectedMusic?.id === track.id && (
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                            )}
                            <a href={track.audioUrl} download={`${track.title || 'bpr-music'}.mp3`}
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 text-muted-foreground hover:text-violet-400 transition-colors" title="Download">
                              <span className="text-xs">⬇️</span>
                            </a>
                            <button onClick={e => { e.stopPropagation(); deleteFromLibrary(track.id); }}
                              className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Empty state */}
              {!musicResult && !musicLoading && (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center gap-3 text-muted-foreground">
                    <span className="text-5xl opacity-30">🎵</span>
                    <p className="text-sm font-medium">Gera música personalizada</p>
                    <p className="text-xs text-center max-w-xs">Configura o estilo, tipo e duração. Suno AI cria uma música única baseada no tema do teu post.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── CALENDAR TAB ── */}
          {tab === "calendar" && (
            <div className="space-y-4">
              {/* Config */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">Calendário de Conteúdo</span>
                    <span className="text-xs text-muted-foreground">— Gera 1 mês de posts no Studio</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Data início</label>
                      <input type="date" value={calStartDate} onChange={e => setCalStartDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/50" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Posts/semana</label>
                      <div className="flex gap-1.5">
                        {([3,5,7] as const).map(n => (
                          <button key={n} onClick={() => setCalPostsPerWeek(n)}
                            className={`flex-1 py-2 rounded-lg border text-sm transition-all ${calPostsPerWeek === n ? "border-blue-500 bg-blue-500/10 text-foreground font-semibold" : "border-border text-muted-foreground"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Idioma</label>
                    <div className="flex gap-1.5">
                      {(["en","pt","both"] as const).map(l => (
                        <button key={l} onClick={() => setCalLanguage(l)}
                          className={`flex-1 py-1.5 rounded-lg border text-xs transition-all ${calLanguage === l ? "border-blue-500 bg-blue-500/10 text-foreground font-semibold" : "border-border text-muted-foreground"}`}>
                          {l === "en" ? "🇬🇧 EN" : l === "pt" ? "🇧🇷 PT" : "🌐 EN+PT"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={calIncludeMarketplace} onChange={e => setCalIncludeMarketplace(e.target.checked)} className="accent-blue-500" />
                      Incluir Marketplace
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={calIncludeArticles} onChange={e => setCalIncludeArticles(e.target.checked)} className="accent-blue-500" />
                      Incluir Artigos
                    </label>
                  </div>
                  <Button onClick={generateCalendar} disabled={calLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    {calLoading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A gerar posts (por batches)...</>
                      : <><Sparkles className="h-4 w-4 mr-2" /> Gerar {calPostsPerWeek * 4} Posts para 1 Mês</>
                    }
                  </Button>
                </CardContent>
              </Card>

              {/* Posts list */}
              {calPosts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground font-semibold">{calPosts.length} posts gerados</span>
                    <Button size="sm" onClick={saveAllCalendarPosts} disabled={calSavingAll}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3">
                      {calSavingAll ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> A guardar...</> : <><CheckCircle className="h-3 w-3 mr-1" /> Agendar Todos</>}
                    </Button>
                  </div>
                  {calPosts.map((post, idx) => (
                    <Card key={idx} className={`border transition-all ${post._saved === "schedule" ? "border-emerald-500/40 bg-emerald-500/5" : post._saved === "draft" ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={`text-[10px] border-0 ${post.content_type === "REEL" ? "bg-pink-500/20 text-pink-400" : post.content_type === "CAROUSEL" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                                {post.content_type}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{post.date} {post.post_time}</span>
                              <span className="text-[10px] text-muted-foreground">{post.day_of_week}</span>
                              {post._saved && (
                                <Badge className={`text-[10px] border-0 ${post._saved === "schedule" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                                  {post._saved === "schedule" ? "✓ Agendado" : "✓ Draft"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate">{post.hook || post.topic}</p>
                          </div>
                          <button onClick={() => setCalExpanded(calExpanded === idx ? null : idx)} className="text-muted-foreground hover:text-foreground shrink-0">
                            {calExpanded === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>

                        {calExpanded === idx && (
                          <div className="mt-3 space-y-2 border-t border-border pt-3">
                            <p className="text-xs text-muted-foreground line-clamp-3">{post.caption}</p>
                            {post.bpr_connection && (
                              <p className="text-[10px] text-blue-400">🔗 {post.bpr_connection}</p>
                            )}
                            <div className="flex gap-1.5 flex-wrap">
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                                onClick={() => { setTopic(post.topic); setCaption(post.caption); setHashtags(post.hashtags?.join(", ") || ""); setTab("image"); }}>
                                <Camera className="h-2.5 w-2.5 mr-1" /> Criar no Studio
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                                onClick={() => { navigator.clipboard.writeText(`${post.caption}\n\n${post.hashtags?.join(" ") || ""}`); }}>
                                <Copy className="h-2.5 w-2.5 mr-1" /> Copiar
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-amber-500/30 text-amber-400"
                                onClick={() => saveCalendarPost(post, idx, "draft")} disabled={calSaving === idx || !!post._saved}>
                                {calSaving === idx ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5 mr-1" />} Draft
                              </Button>
                              <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => saveCalendarPost(post, idx, "schedule")} disabled={calSaving === idx || !!post._saved}>
                                {calSaving === idx ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Clock className="h-2.5 w-2.5 mr-1" />} Agendar
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {calPosts.length === 0 && !calLoading && (
                <Card>
                  <CardContent className="p-10 flex flex-col items-center gap-3 text-muted-foreground">
                    <Clock className="h-12 w-12 opacity-20" />
                    <p className="text-sm font-medium">Configura e gera o teu mês de posts</p>
                    <p className="text-xs text-center max-w-xs">Define a data de início, posts por semana e idioma. Claude AI gera captions, hooks, hashtags e horários para cada dia.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── INTELLIGENCE TAB ── */}
          {tab === "intelligence" && (
            <div className="space-y-4">
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-400">Inteligência de Conteúdo</span>
                    <span className="text-xs text-muted-foreground">— Claude analisa tendências e sugere ideias virais</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={intelFocus}
                      onChange={e => setIntelFocus(e.target.value)}
                      placeholder="Foca num tema (ex: knee pain, MLS laser, posture) — ou deixa vazio para análise geral..."
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-yellow-500/50 placeholder:text-muted-foreground/50"
                    />
                    <button
                      onClick={() => intelVoice.status === "listening" ? intelVoice.stop() : intelVoice.start()}
                      className={`px-3 rounded-lg border transition-all ${intelVoice.status === "listening" ? "border-red-500 bg-red-500/10 text-red-400 animate-pulse" : "border-border text-muted-foreground hover:border-yellow-500/40"}`}>
                      {intelVoice.status === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={generateIntelligence} disabled={intelLoading}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold">
                    {intelLoading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Claude a analisar tendências...</>
                      : <><Zap className="h-4 w-4 mr-2" /> Analisar e Gerar Ideias Virais</>
                    }
                  </Button>
                </CardContent>
              </Card>

              {intelData && (
                <div className="space-y-3">
                  {intelData.trendingSummary && (
                    <Card className="border-yellow-500/20">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">{intelData.trendingSummary}</p>
                        {intelData.seasonalNote && (
                          <p className="text-xs text-yellow-400 mt-2">🗓️ {intelData.seasonalNote}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  {(intelData.ideas || []).map((idea: any, idx: number) => (
                    <Card key={idx} className="border-border hover:border-yellow-500/30 transition-all">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <Badge className="bg-yellow-500/15 text-yellow-400 border-0 text-[10px]">{idea.contentType}</Badge>
                              <Badge className={`border-0 text-[10px] ${idea.urgency === "high" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"}`}>{idea.urgency}</Badge>
                              {idea.estimatedEngagement === "high" && <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">🔥 alto engagement</Badge>}
                            </div>
                            <p className="text-xs font-semibold text-foreground">{idea.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 italic">"{idea.hook}"</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{idea.whyViral}</p>
                        {idea.monetization && (
                          <p className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-1">💰 {idea.monetization}</p>
                        )}
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                            onClick={() => { setTopic(idea.title); setCaption(idea.hook); setTab("image"); }}>
                            <Sparkles className="h-2.5 w-2.5 mr-1" /> Criar Post
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                            onClick={() => { navigator.clipboard.writeText(idea.hook); }}>
                            <Copy className="h-2.5 w-2.5 mr-1" /> Copiar Hook
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!intelData && !intelLoading && (
                <Card>
                  <CardContent className="p-10 flex flex-col items-center gap-3 text-muted-foreground">
                    <Zap className="h-12 w-12 opacity-20" />
                    <p className="text-sm font-medium">Análise de Tendências</p>
                    <p className="text-xs text-center max-w-xs">Claude analisa o que está viral na fisioterapia agora e sugere 8 ideias de conteúdo com potencial de engagement alto, monetização e links para BPR.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* \u2500\u2500 FACEBOOK TAB \u2500\u2500 */}
          {tab === "facebook" && (
            <div className="space-y-4">
              <Card className="border-blue-600/30 bg-blue-600/5">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-blue-400">Imagens para Facebook</span>
                    <span className="text-xs text-muted-foreground">\u2014 Gera capa, post e imagem de perfil com branding BPR</span>
                  </div>

                  {/* Format selector */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Formato</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "cover", label: "Capa", icon: "\ud83d\uddbc\ufe0f", desc: "1200\xd7628px", ratio: "16:9" },
                        { value: "post", label: "Post", icon: "\ud83d\udcf7", desc: "1080\xd71080px", ratio: "1:1" },
                        { value: "profile", label: "Perfil", icon: "\ud83d\udc64", desc: "180\xd7180px", ratio: "circular" },
                      ].map(f => (
                        <button key={f.value} onClick={() => setFbFormat(f.value as any)}
                          className={`flex flex-col items-center py-3 px-2 rounded-lg border text-center transition-all ${
                            fbFormat === f.value ? "border-blue-500 bg-blue-500/10 text-foreground" : "border-border text-muted-foreground hover:border-blue-500/40"
                          }`}>
                          <span className="text-xl mb-1">{f.icon}</span>
                          <span className="text-xs font-semibold">{f.label}</span>
                          <span className="text-[10px] text-muted-foreground">{f.desc}</span>
                          <span className="text-[9px] text-muted-foreground">{f.ratio}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">T\u00f3pico / Descri\u00e7\u00e3o (opcional)</label>
                    <input
                      value={fbTopic}
                      onChange={e => setFbTopic(e.target.value)}
                      placeholder="Ex: MLS Laser therapy, summer sports recovery, clinic opening... (deixa vazio para usar o t\u00f3pico principal)"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/50 placeholder:text-muted-foreground/50"
                    />
                  </div>

                  <Button onClick={generateFbImage} disabled={fbLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    {fbLoading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A gerar imagem para Facebook...</>
                      : <><Facebook className="h-4 w-4 mr-2" /> Gerar {fbFormat === "cover" ? "Capa (1200\xd7628)" : fbFormat === "post" ? "Post (1080\xd71080)" : "Foto de Perfil"}</>
                    }
                  </Button>
                </CardContent>
              </Card>

              {/* Result */}
              {fbImage && (
                <Card className="border-blue-600/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-semibold">Imagem gerada!</span>
                        <Badge className="bg-blue-500/15 text-blue-400 border-0 text-xs">{fbFormat === "cover" ? "Facebook Cover" : fbFormat === "post" ? "Facebook Post" : "Profile Photo"}</Badge>
                      </div>
                      <a href={fbImage} download={`bpr-facebook-${fbFormat}-${Date.now()}.jpg`}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        \u2b07\ufe0f Download
                      </a>
                    </div>
                    {/* Preview with correct aspect ratio */}
                    <div className={`relative w-full overflow-hidden rounded-xl bg-muted ${fbFormat === "cover" ? "aspect-[1200/628]" : "aspect-square"}`}>
                      <img src={fbImage} alt="Facebook image" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute bottom-2 right-2 bg-black/50 rounded text-[9px] text-white px-1.5 py-0.5 backdrop-blur-sm">
                        {fbFormat === "cover" ? "1200\xd7628 \u00b7 Cover" : fbFormat === "post" ? "1080\xd71080 \u00b7 Post" : "180\xd7180 \u00b7 Perfil"}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={generateFbImage} disabled={fbLoading} className="flex-1">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Nova Imagem
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => { setGeneratedImage(fbImage!); setTab("image"); }}>
                        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Usar no Studio IG
                      </Button>
                      <Button size="sm" onClick={publishFacebook} disabled={publishingFb}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                        {publishingFb
                          ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> A publicar no Facebook...</>
                          : <><Facebook className="h-3.5 w-3.5 mr-1" /> Publicar no Facebook</>
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty state */}
              {!fbImage && !fbLoading && (
                <Card>
                  <CardContent className="p-10 flex flex-col items-center gap-3 text-muted-foreground">
                    <Facebook className="h-12 w-12 opacity-20" />
                    <p className="text-sm font-medium">Imagens com branding BPR para o Facebook</p>
                    <p className="text-xs text-center max-w-xs">Gera capa (1200\xd7628), posts quadrados ou foto de perfil com o visual da cl\u00ednica.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Caption + Hashtags (always visible below, except on viral/music/calendar/intelligence/facebook tabs) */}
          {tab !== "caption" && tab !== "viral" && tab !== "music" && tab !== "calendar" && tab !== "intelligence" && tab !== "facebook" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legenda</label>
                  <Button size="sm" variant="ghost" onClick={generateCaptionOnly} disabled={generating} className="text-xs h-6 px-2">
                    {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Regenerar
                  </Button>
                </div>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={5}
                  placeholder="A legenda aparece aqui depois de gerar..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none placeholder:text-muted-foreground/50" />
                <input value={hashtags} onChange={e => setHashtags(e.target.value)}
                  placeholder="hashtags separadas por vírgula..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50" />
              </CardContent>
            </Card>
          )}

          {/* Schedule row */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Data (opcional)
                </label>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Hora
                </label>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          {/* Stories + Tags */}
          <div className="space-y-2 border border-border/50 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPublishToStories(v => !v)}
                  className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${publishToStories ? "bg-pink-500" : "bg-muted-foreground/30"}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${publishToStories ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <label className="text-[11px] text-muted-foreground cursor-pointer" onClick={() => setPublishToStories(v => !v)}>
                  📖 Publicar também nos <span className={publishToStories ? "text-pink-400 font-semibold" : ""}>Stories</span>
                </label>
              </div>
              {publishToStories && (
                <Badge className="bg-pink-500/15 text-pink-400 border-pink-500/30 text-[9px]">Feed + Stories</Badge>
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">
                🏷️ Marcar pessoas (usernames, separados por vírgula)
              </label>
              <input
                value={taggedUsers}
                onChange={e => setTaggedUsers(e.target.value)}
                placeholder="@brunophysicalrehab, @username2..."
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-pink-500/50 placeholder:text-muted-foreground/40"
              />
              {taggedUsers && (
                <p className="text-[9px] text-muted-foreground mt-0.5">⚠ Tags incluídas na legenda. Marcar pessoas via API requer permissão adicional no Meta.</p>
              )}
            </div>
          </div>

          {/* Selected music indicator near publish */}
          {selectedMusic && (
            <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-xl px-3 py-2">
              <span className="text-sm">🎵</span>
              <span className="text-xs text-violet-400 flex-1 truncate font-medium">{selectedMusic.title}</span>
              <button onClick={() => setSelectedMusic(null)} className="text-muted-foreground hover:text-red-400 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={copyCaption} variant="outline" size="sm" className="flex-1">
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
            <Button onClick={() => saveDraft(false)} disabled={saving} variant="outline" size="sm" className="flex-1">
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Draft
            </Button>
            {scheduleDate && (
              <Button onClick={() => saveDraft(true)} disabled={saving} variant="outline" size="sm"
                className="flex-1 border-blue-500/40 text-blue-400 hover:bg-blue-500/10">
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Bell className="h-3.5 w-3.5 mr-1" />}
                Agendar
              </Button>
            )}
            <Button onClick={publishNow} disabled={publishing || !caption} size="sm"
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold">
              {publishing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              {publishing ? "A publicar..." : publishToStories ? "Publicar + Stories" : "Publicar"}
            </Button>
          </div>
          <Button variant="ghost" size="sm"
            onClick={() => { setShowDraftsPanel(v => !v); if (!showDraftsPanel) { loadDrafts(); loadScheduled(); } }}
            className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            {showDraftsPanel ? "Fechar Drafts" : "Ver Drafts & Agendados"}
          </Button>
          {(generatedImage || watermarkedImage || caption) && (
            <Button variant="outline" size="sm" onClick={resetPost}
              className="w-full text-xs gap-1.5 border-pink-500/30 text-pink-400 hover:bg-pink-500/10">
              <Plus className="h-3.5 w-3.5" /> Novo Post
            </Button>
          )}
        </div>
      </div>

      {/* ── DRAFTS PANEL ── */}
      {showDraftsPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowDraftsPanel(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" /> Drafts & Agendados
              </h2>
              <button onClick={() => setShowDraftsPanel(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {draftsLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!draftsLoading && drafts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum draft guardado ainda</p>
                </div>
              )}
              {drafts.map((draft: any) => {
                let meta: any = {};
                try { meta = JSON.parse(draft.aiPrompt || "{}"); } catch {}
                const isScheduled = draft.status === "SCHEDULED";
                return (
                  <div key={draft.id} className={`p-4 rounded-xl border transition-all ${isScheduled ? "border-blue-500/30 bg-blue-500/5" : "border-border hover:border-primary/30"}`}>
                    <div className="flex items-start gap-3">
                      {draft.mediaUrls?.[0] && (
                        <img src={draft.mediaUrls[0]} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[10px] ${isScheduled ? "border-blue-500/40 text-blue-400" : ""}`}>
                            {isScheduled ? <><Bell className="h-2.5 w-2.5 mr-1" />Agendado</> : "Draft"}
                          </Badge>
                          {isScheduled && draft.scheduledAt && (
                            <span className="text-[10px] text-blue-400">
                              {new Date(draft.scheduledAt).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(draft.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                        {(meta.topic || meta.service) && (
                          <p className="text-xs font-medium text-foreground truncate">{meta.topic || meta.service}</p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{draft.caption}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                        onClick={() => applyDraft(draft)}>
                        <RotateCcw className="h-3 w-3" /> Carregar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => deleteDraft(draft.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
