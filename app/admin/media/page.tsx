"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon, Upload, Trash2, Search, Loader2, CheckCircle,
  AlertCircle, X, Copy, Eye, Grid, List, Filter, Calendar, FileImage,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MediaItem {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  imageUrl: string;
  category: string | null;
  altText: string | null;
  createdAt: string;
  uploadedBy?: { firstName: string; lastName: string } | null;
}

const CATEGORIES = ["all", "general", "hero", "services", "about", "logo", "signature", "social"];

export default function MediaLibraryPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [previewImg, setPreviewImg] = useState<MediaItem | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/image-library?${params}`);
      const data = await res.json();
      setImages(data.images || []);
    } catch {
      setError("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    let uploaded = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category === "all" ? "general" : category);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) uploaded++;
        else setError(data.error || "Upload failed");
      } catch {
        setError("Upload failed");
      }
    }
    if (uploaded > 0) {
      setSuccess(`${uploaded} image${uploaded > 1 ? "s" : ""} uploaded`);
      setTimeout(() => setSuccess(""), 3000);
      fetchImages();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image permanently?")) return;
    try {
      const res = await fetch(`/api/image-library/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Image deleted");
        setTimeout(() => setSuccess(""), 2000);
        setPreviewImg(null);
        fetchImages();
      }
    } catch {
      setError("Delete failed");
    }
  };

  const copyUrl = (url: string) => {
    const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setSuccess("URL copied!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const filtered = images.filter((img) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return img.originalName.toLowerCase().includes(q) || img.category?.toLowerCase().includes(q) || img.altText?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            {T("admin.mediaLibraryTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {images.length} images · Upload, manage, and reuse images across the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={uploading}
            onClick={() => document.getElementById("media-upload")?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
          <input
            id="media-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setError("")}><X className="h-3 w-3" /></Button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2 border border-green-200">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
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

      {/* Drop Zone */}
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        onClick={() => document.getElementById("media-upload")?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/10"); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/10"); }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-primary", "bg-primary/10");
          handleUpload(e.dataTransfer.files);
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Drag & drop images here or <span className="text-primary font-medium">click to browse</span></p>
        <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WebP, SVG · Max 10MB</p>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <FileImage className="h-12 w-12 opacity-20 mb-3" />
          <p className="text-sm">No images found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((img) => (
            <div
              key={img.id}
              className="group relative rounded-lg overflow-hidden border bg-muted/20 aspect-square cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setPreviewImg(img)}
            >
              <img
                src={img.imageUrl}
                alt={img.altText || img.originalName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[10px] truncate font-medium">{img.originalName}</p>
                  <p className="text-white/70 text-[9px]">{formatSize(img.fileSize)}</p>
                </div>
              </div>
              {img.category && (
                <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1 py-0 bg-black/50 text-white border-0 capitalize">
                  {img.category}
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.map((img) => (
              <div
                key={img.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setPreviewImg(img)}
              >
                <div className="w-12 h-12 rounded border overflow-hidden shrink-0 bg-muted">
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{img.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(img.fileSize)} · {img.mimeType}</p>
                </div>
                {img.category && <Badge variant="outline" className="text-[10px] capitalize">{img.category}</Badge>}
                <span className="text-xs text-muted-foreground">{formatDate(img.createdAt)}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); copyUrl(img.imageUrl); }} className="p-1 rounded hover:bg-muted" title="Copy URL">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }} className="p-1 rounded hover:bg-destructive/10" title="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {previewImg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-sm truncate">{previewImg.originalName}</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewImg(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-4 flex justify-center bg-muted/20">
              <img
                src={previewImg.imageUrl}
                alt={previewImg.altText || previewImg.originalName}
                className="max-w-full max-h-[50vh] object-contain rounded"
              />
            </div>
            <div className="p-4 space-y-3 border-t">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">File Name</span><p className="font-medium truncate">{previewImg.originalName}</p></div>
                <div><span className="text-muted-foreground text-xs">Size</span><p className="font-medium">{formatSize(previewImg.fileSize)}</p></div>
                <div><span className="text-muted-foreground text-xs">Type</span><p className="font-medium">{previewImg.mimeType}</p></div>
                <div><span className="text-muted-foreground text-xs">Category</span><p className="font-medium capitalize">{previewImg.category || "general"}</p></div>
                <div><span className="text-muted-foreground text-xs">Uploaded</span><p className="font-medium">{formatDate(previewImg.createdAt)}</p></div>
                <div><span className="text-muted-foreground text-xs">By</span><p className="font-medium">{previewImg.uploadedBy ? `${previewImg.uploadedBy.firstName} ${previewImg.uploadedBy.lastName}` : "—"}</p></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => copyUrl(previewImg.imageUrl)}>
                  <Copy className="h-3.5 w-3.5" /> Copy URL
                </Button>
                <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handleDelete(previewImg.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
