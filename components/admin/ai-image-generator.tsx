"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Check, X, ImageIcon, Upload, Trash2, Camera, Download, Plus, Image as ImgIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AIImageGeneratorProps {
  section: string;
  defaultPrompt?: string;
  aspectRatio?: string;
  onApply: (imageUrl: string) => void;
  /** Called when user wants to insert image into article body */
  onInsertInBody?: (imageUrl: string) => void;
  /** Article context for building a smarter image prompt */
  articleContext?: { title?: string; excerpt?: string; content?: string };
  /** Button label override */
  buttonLabel?: string;
  /** Button variant override */
  buttonVariant?: "outline" | "default" | "ghost";
}

export function AIImageGenerator({
  section,
  defaultPrompt = "",
  aspectRatio = "16:9",
  onApply,
  onInsertInBody,
  articleContext,
  buttonLabel,
  buttonVariant = "outline",
}: AIImageGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [buildingPrompt, setBuildingPrompt] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Reference photo state
  const [refImage, setRefImage] = useState<{ base64: string; mime: string; name: string; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildSmartPrompt = async () => {
    if (!articleContext?.title && !articleContext?.excerpt && !articleContext?.content) return;
    setBuildingPrompt(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/articles/generate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: articleContext.title || "",
          excerpt: articleContext.excerpt || "",
          content: articleContext.content || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate prompt");
      setPrompt(data.prompt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBuildingPrompt(false);
    }
  };

  const handleRefImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { setError("Reference image must be under 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        setRefImage({ base64: match[2], mime: match[1], name: file.name, previewUrl: dataUrl });
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleRefImageSelect(file);
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setPreviewUrl(null);
    setElapsed(0);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      const payload: any = { prompt, aspectRatio, section };
      if (refImage) {
        payload.referenceImageBase64 = refImage.base64;
        payload.referenceImageMime = refImage.mime;
      }
      const res = await fetch("/api/admin/settings/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server error (${res.status}): ${text.slice(0, 200) || "No response"}. Try again or upload manually.`);
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.fallback) {
          setError(data.error);
        } else {
          throw new Error(data.error || "Failed to generate image");
        }
        return;
      }
      setPreviewUrl(data.imageUrl);
      setGallery((prev) => [data.imageUrl, ...prev]);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Image generation timed out after 90 seconds. The AI service may be overloaded. Please try again or upload an image manually.");
      } else {
        setError(err.message || "Unknown error generating image. Please try again.");
      }
    } finally {
      clearTimeout(timeout);
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
      setGenerating(false);
    }
  };

  const downloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = url.split("/").pop() || "bpr-image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const apply = (url?: string) => {
    const imgUrl = url || previewUrl;
    if (imgUrl) {
      onApply(imgUrl);
      setOpen(false);
      setPreviewUrl(null);
      setPrompt(defaultPrompt);
      setRefImage(null);
    }
  };

  const insertInBody = (url: string) => {
    if (onInsertInBody) {
      onInsertInBody(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
          <Sparkles className="h-4 w-4" />
          {buttonLabel || "Generate with AI"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Image Generator — {section}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reference Photo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-purple-500" />
              Reference Photo <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Upload your own photo (e.g. equipment, clinic, yourself) and the AI will incorporate it into the generated image.
            </p>

            {refImage ? (
              <div className="flex items-center gap-3 p-2 rounded-lg border border-purple-200 bg-purple-50/30">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img src={refImage.previewUrl} alt="Reference" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{refImage.name}</p>
                  <p className="text-[10px] text-muted-foreground">Reference photo attached</p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => setRefImage(null)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-purple-200 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="h-5 w-5 mx-auto mb-1.5 text-purple-400" />
                <p className="text-xs text-muted-foreground">
                  Click or drag & drop a reference photo
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP — max 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefImageSelect(f); e.target.value = ""; }}
            />
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Prompt</Label>
            <p className="text-xs text-muted-foreground">
              {refImage
                ? "Describe how to use your reference photo in the generated image."
                : "Describe the image you want, or let AI build the prompt from your article content."
              }
            </p>
            {articleContext && (articleContext.title || articleContext.content) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={buildSmartPrompt}
                disabled={buildingPrompt}
                className="w-full gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 mb-1"
              >
                {buildingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {buildingPrompt ? "Analysing article..." : "Auto-generate prompt from article content"}
              </Button>
            )}
            <Input
              placeholder={refImage
                ? "e.g. Use my laser equipment photo to create a professional treatment scene in a modern clinic"
                : "e.g. A physiotherapist helping a patient with shoulder exercises in a modern clinic"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </div>

          <Button
            onClick={generate}
            disabled={generating || !prompt.trim()}
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {generating ? `Generating... ${elapsed}s` : refImage ? "Generate with Reference" : gallery.length > 0 ? "Generate Another" : "Generate Image"}
          </Button>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Latest generated image */}
          {previewUrl && (
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="AI Generated"
                  className="w-full h-auto max-h-64 object-cover"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => apply()} className="flex-1 gap-1">
                  <Check className="h-4 w-4" /> Use as Cover
                </Button>
                {onInsertInBody && (
                  <Button variant="outline" onClick={() => insertInBody(previewUrl)} className="gap-1">
                    <Plus className="h-4 w-4" /> Insert in Body
                  </Button>
                )}
                <Button variant="outline" onClick={() => downloadImage(previewUrl)} className="gap-1" title="Download">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={generate} className="gap-1">
                  <Sparkles className="h-4 w-4" /> Regenerate
                </Button>
              </div>
            </div>
          )}

          {/* Gallery of all generated images in this session */}
          {gallery.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ImgIcon className="h-3.5 w-3.5 text-purple-500" />
                Generated Images ({gallery.length})
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((url, i) => (
                  <div key={i} className={`relative group border rounded-lg overflow-hidden cursor-pointer ${url === previewUrl ? "ring-2 ring-purple-500" : ""}`}>
                    <img src={url} alt={`Generated ${i + 1}`} className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-white hover:bg-white/20 text-[10px]" onClick={() => apply(url)}>
                        <Check className="h-3 w-3 mr-1" /> Cover
                      </Button>
                      {onInsertInBody && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-white hover:bg-white/20 text-[10px]" onClick={() => insertInBody(url)}>
                          <Plus className="h-3 w-3 mr-1" /> Body
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white hover:bg-white/20" onClick={() => downloadImage(url)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info about saved images */}
          {gallery.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">
              All generated images are saved to /uploads/generated/ and can be downloaded.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
