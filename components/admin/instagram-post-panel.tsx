"use client";

import { useState, useRef } from "react";
import {
  Instagram, Sparkles, Send, Clock, Image, X, CheckCircle,
  AlertCircle, Loader2, ChevronDown, ChevronUp, Upload, Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  articleId: string;
  articleTitle: string;
  articleImageUrl?: string;
}

export function InstagramPostPanel({ articleId, articleTitle, articleImageUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(articleImageUrl ? [articleImageUrl] : []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; permalink?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const charCount = caption.length;
  const charLimit = 2200;

  async function generateCaption() {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_caption", articleId }),
      });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
      else setResult({ error: data.error || "Failed to generate caption" });
    } catch {
      setResult({ error: "Failed to generate caption" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "article");
      const res = await fetch("/api/uploads/image", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setImageUrls((prev) => [...prev, data.url]);
      }
    } catch {
      setResult({ error: "Image upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish() {
    if (!caption.trim()) { setResult({ error: "Caption is required" }); return; }
    if (imageUrls.length === 0) { setResult({ error: "At least one image is required" }); return; }
    if (mode === "schedule" && !scheduledAt) { setResult({ error: "Please select a date/time to schedule" }); return; }

    setPublishing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/articles/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "now" ? "publish" : "schedule",
          articleId,
          caption,
          imageUrls,
          scheduledAt: mode === "schedule" ? scheduledAt : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, permalink: data.permalink });
      } else {
        setResult({ error: data.error || "Failed to publish" });
      }
    } catch {
      setResult({ error: "Failed to publish" });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Card className="border-[#e1306c]/20">
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            <span>Publish to Instagram</span>
            {imageUrls.length > 0 && caption && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Ready</span>
            )}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4 pt-0">
          {/* Result */}
          {result?.success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  {mode === "now" ? "Published to Instagram! 🎉" : "Post scheduled! ✅"}
                </p>
                {result.permalink && (
                  <a href={result.permalink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-700 underline mt-0.5 block">
                    View on Instagram →
                  </a>
                )}
              </div>
            </div>
          )}
          {result?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
          )}

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Images ({imageUrls.length}/10)
              {imageUrls.length > 1 && <span className="text-[10px] text-muted-foreground font-normal">— carousel</span>}
            </Label>

            {imageUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border" />
                    <button
                      onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Paste image URL..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newImageUrl.trim()) {
                    setImageUrls((prev) => [...prev, newImageUrl.trim()]);
                    setNewImageUrl("");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => {
                  if (newImageUrl.trim()) {
                    setImageUrls((prev) => [...prev, newImageUrl.trim()]);
                    setNewImageUrl("");
                  }
                }}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                Array.from(e.target.files || []).forEach((f) => handleImageUpload(f));
                e.target.value = "";
              }}
            />
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Caption</Label>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] ${charCount > charLimit ? "text-red-500" : "text-muted-foreground"}`}>
                  {charCount}/{charLimit}
                </span>
                <button
                  onClick={generateCaption}
                  disabled={generating}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  AI Generate
                </button>
              </div>
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              placeholder="Write your Instagram caption here, or click AI Generate..."
              className="text-sm resize-y"
            />
          </div>

          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("now")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all ${
                mode === "now"
                  ? "border-[#e1306c] bg-[#e1306c]/5 text-[#e1306c]"
                  : "border-gray-200 text-muted-foreground hover:border-gray-300"
              }`}
            >
              <Send className="h-3.5 w-3.5" /> Publish Now
            </button>
            <button
              onClick={() => setMode("schedule")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all ${
                mode === "schedule"
                  ? "border-[#5dc9c0] bg-[#5dc9c0]/5 text-[#1a6b6b]"
                  : "border-gray-200 text-muted-foreground hover:border-gray-300"
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Schedule
            </button>
          </div>

          {mode === "schedule" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Schedule Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="text-sm"
              />
            </div>
          )}

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={publishing || !caption.trim() || imageUrls.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}
          >
            {publishing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</>
            ) : mode === "now" ? (
              <><Send className="h-4 w-4" /> Publish to Instagram</>
            ) : (
              <><Clock className="h-4 w-4" /> Schedule Post</>
            )}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            Requires Instagram Business account connected in Admin → API & AI Settings
          </p>
        </CardContent>
      )}
    </Card>
  );
}
