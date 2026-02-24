"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Check, X, ImageIcon } from "lucide-react";
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
  /** Article context for building a smarter image prompt */
  articleContext?: { title?: string; excerpt?: string; content?: string };
}

export function AIImageGenerator({
  section,
  defaultPrompt = "",
  aspectRatio = "16:9",
  onApply,
  articleContext,
}: AIImageGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [generating, setGenerating] = useState(false);
  const [buildingPrompt, setBuildingPrompt] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setPreviewUrl(null);

    try {
      const res = await fetch("/api/admin/settings/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio, section }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Server error (${res.status}). Please try again or upload an image manually.`);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const apply = () => {
    if (previewUrl) {
      onApply(previewUrl);
      setOpen(false);
      setPreviewUrl(null);
      setPrompt(defaultPrompt);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Image Generator — {section}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Describe the image you want, or let AI build the prompt from your article content.
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
              placeholder="e.g. A physiotherapist helping a patient with shoulder exercises in a modern clinic"
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
            {generating ? "Generating image..." : "Generate Image"}
          </Button>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {previewUrl && (
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="AI Generated"
                  className="w-full h-auto max-h-64 object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={apply} className="flex-1 gap-1">
                  <Check className="h-4 w-4" /> Use this image
                </Button>
                <Button variant="outline" onClick={generate} className="gap-1">
                  <Sparkles className="h-4 w-4" /> Regenerate
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPreviewUrl(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
