"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon, Upload, Search, Loader2, X, Check, Grid, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface MediaItem {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  imageUrl: string;
  category: string | null;
  createdAt: string;
}

interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string, image?: MediaItem) => void;
  category?: string;
  title?: string;
}

const CATEGORIES = ["all", "general", "hero", "services", "about", "logo", "signature", "social"];

export function ImagePicker({ open, onClose, onSelect, category: defaultCategory, title = "Select Image" }: ImagePickerProps) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(defaultCategory || "all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/image-library?${params}`);
      const data = await res.json();
      setImages(data.images || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (open) {
      fetchImages();
      setSelectedId(null);
    }
  }, [open, fetchImages]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category === "all" ? "general" : category);
      try {
        await fetch("/api/upload", { method: "POST", body: formData });
      } catch {}
    }
    setUploading(false);
    fetchImages();
  };

  const handleConfirm = () => {
    const img = images.find((i) => i.id === selectedId);
    if (img) {
      onSelect(img.imageUrl, img);
      onClose();
    }
  };

  const filtered = images.filter((img) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return img.originalName.toLowerCase().includes(q) || img.category?.toLowerCase().includes(q);
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => document.getElementById("picker-upload")?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload
            </Button>
            <input
              id="picker-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2 py-0.5 text-[11px] rounded-full capitalize transition-colors ${
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-20 mb-2" />
              <p className="text-sm">No images found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => document.getElementById("picker-upload")?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Upload one
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {filtered.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedId(img.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedId === img.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-primary/30"
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {selectedId === img.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <p className="text-white text-[9px] truncate">{img.originalName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {selectedId ? `1 selected` : `${filtered.length} images`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!selectedId} onClick={handleConfirm} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Select
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
