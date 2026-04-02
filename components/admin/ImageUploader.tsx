"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  onUpload: (imageUrl: string) => void;
  currentImages?: string[];
  maxImages?: number;
  category?: string;
}

export function ImageUploader({ 
  onUpload, 
  currentImages = [], 
  maxImages = 5,
  category = "products" 
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(currentImages);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed");
          continue;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError("File too large (max 10MB)");
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        const imageUrl = data.image.imageUrl;
        setUploadedImages(prev => [...prev, imageUrl]);
        onUpload(imageUrl);
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || uploadedImages.length >= maxImages}
          className="w-full gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Images ({uploadedImages.length}/{maxImages})
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          Max {maxImages} images, 10MB each. Your images will have copyright protection.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Image Preview Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {uploadedImages.map((url, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-muted">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeImage(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {index === 0 && (
                <div className="absolute top-1 left-1 px-2 py-0.5 rounded bg-teal-500 text-white text-[10px] font-bold">
                  Main
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {uploadedImages.length === 0 && !uploading && (
        <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No images uploaded yet</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Click the button above to upload</p>
        </div>
      )}
    </div>
  );
}
