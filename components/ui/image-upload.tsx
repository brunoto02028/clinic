"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string, cloudStoragePath: string) => void;
  onImageDeleted?: () => void;
  label?: string;
  isPublic?: boolean;
  aspectRatio?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageDeleted,
  label = "Upload Image",
  isPublic = true,
  aspectRatio = "aspect-video"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Step 1: Get presigned URL
      const presignedResponse = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic
        })
      });

      if (!presignedResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

      // Step 2: Upload file to S3
      const uploadHeaders: HeadersInit = {
        "Content-Type": file.type
      };

      // Check if Content-Disposition is required
      if (uploadUrl.includes("content-disposition") && isPublic) {
        uploadHeaders["Content-Disposition"] = "attachment";
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Complete upload and get file URL
      const completeResponse = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloud_storage_path,
          isPublic
        })
      });

      if (!completeResponse.ok) {
        throw new Error("Failed to complete upload");
      }

      const { fileUrl } = await completeResponse.json();

      // Update preview and notify parent
      setPreviewUrl(fileUrl);
      onImageUploaded(fileUrl, cloud_storage_path);

      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!previewUrl || !onImageDeleted) return;

    setDeleting(true);

    try {
      // Call parent's delete handler
      onImageDeleted();
      setPreviewUrl(undefined);

      toast({
        title: "Success",
        description: "Image removed successfully"
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative group">
          <div className={`relative ${aspectRatio} bg-muted rounded-lg overflow-hidden border-2 border-muted-foreground/20`}>
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          {onImageDeleted && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className={`relative ${aspectRatio} bg-muted rounded-lg border-2 border-dashed border-muted-foreground/40 hover:border-muted-foreground/60 transition-colors`}>
          <label
            htmlFor="image-upload"
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-xs text-muted-foreground mt-1">Max 10MB</span>
              </>
            )}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
}
