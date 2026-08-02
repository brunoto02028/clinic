"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Images, Search, Loader2, Check } from "lucide-react";

interface LibraryImage {
  id: string;
  originalName: string;
  imageUrl: string;
  category: string | null;
  altText: string | null;
  fileSize: number;
  createdAt: string;
}

const CATEGORIES = ["all", "articles", "general", "hero", "services", "about", "social"];

interface ImageLibraryPickerProps {
  /** Called with the selected image URL (serve URL, persistent) */
  onSelect: (url: string) => void;
  /** Category pre-selected when the dialog opens */
  defaultCategory?: string;
  buttonLabel?: string;
}

/**
 * Dialog to pick an image from the ImageLibrary (DB-backed, persistent).
 * Reusable anywhere an image URL needs to be chosen (article covers, etc.).
 */
export function ImageLibraryPicker({ onSelect, defaultCategory = "articles", buttonLabel = "Choose from Library" }: ImageLibraryPickerProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [selected, setSelected] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/image-library?${params}`);
      const data = await res.json();
      setImages(data.images || []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (open) fetchImages();
  }, [open, fetchImages]);

  const filtered = images.filter((img) => {
    if (!img.imageUrl) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      img.originalName.toLowerCase().includes(q) ||
      (img.altText || "").toLowerCase().includes(q) ||
      (img.category || "").toLowerCase().includes(q)
    );
  });

  const confirm = () => {
    if (selected) {
      onSelect(selected);
      setOpen(false);
      setSelected(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(null); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Images className="h-3.5 w-3.5" /> {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="h-5 w-5 text-primary" /> Image Library
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-full capitalize transition-colors ${
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

        {/* Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm">
              <Images className="h-10 w-10 mb-3 opacity-40" />
              No images found{category !== "all" ? ` in "${category}"` : ""}.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-1">
              {filtered.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelected(img.imageUrl)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all aspect-video bg-muted ${
                    selected === img.imageUrl
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border"
                  }`}
                  title={img.altText || img.originalName}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.altText || img.originalName}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {selected === img.imageUrl && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] truncate">{img.altText || img.originalName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {filtered.length} image{filtered.length !== 1 ? "s" : ""} · manage in{" "}
            <a href="/admin/media" target="_blank" className="text-primary hover:underline">Media Library</a>
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={confirm} disabled={!selected} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Use Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
