"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  Trash2,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageItem {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  imageUrl: string;
  cloud_storage_path: string;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  category?: string | null;
  createdAt: string;
}

interface ImageGalleryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrl: string, cloud_storage_path: string) => void;
  selectedImageUrl?: string;
  category?: string;
}

export function ImageGalleryPicker({
  open,
  onOpenChange,
  onSelect,
  selectedImageUrl,
  category,
}: ImageGalleryPickerProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>(category || "all");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchImages();
      if (selectedImageUrl) {
        setSelectedImage(selectedImageUrl);
      }
    }
  }, [open, selectedImageUrl]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const url =
        filterCategory && filterCategory !== "all"
          ? `/api/image-library?category=${filterCategory}`
          : "/api/image-library";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Direct upload via FormData (local storage)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", filterCategory !== "all" ? filterCategory : "general");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload image");
      }

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });

      // Refresh images list
      await fetchImages();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleDelete = async (imageId: string, cloud_storage_path: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const res = await fetch(`/api/image-library/${imageId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast({
        title: "Deleted",
        description: "Image deleted successfully",
      });

      // If deleted image was selected, clear selection
      const deletedImage = images.find(img => img.id === imageId);
      if (selectedImage === deletedImage?.imageUrl) {
        setSelectedImage(null);
      }

      // Refresh images list
      await fetchImages();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleSelect = () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please select an image",
        variant: "destructive",
      });
      return;
    }

    const image = images.find((img) => img.imageUrl === selectedImage);
    if (image) {
      onSelect(image.imageUrl, image.cloud_storage_path);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Image Library</DialogTitle>
          <DialogDescription>
            Select an image from the library or upload a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Upload and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="upload-image" className="sr-only">
                Upload Image
              </Label>
              <div className="relative">
                <Input
                  id="upload-image"
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <Select
              value={filterCategory}
              onValueChange={(value) => {
                setFilterCategory(value);
                setTimeout(() => fetchImages(), 100);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Images</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="hero">Hero</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="about">About</SelectItem>
                <SelectItem value="articles">Articles</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Images Grid */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No images found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an image to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={cn(
                      "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                      selectedImage === image.imageUrl
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-transparent hover:border-muted-foreground/20"
                    )}
                    onClick={() => setSelectedImage(image.imageUrl)}
                  >
                    <div className="relative aspect-square bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageUrl}
                        alt={image.altText || image.fileName}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      {selectedImage === image.imageUrl && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(image.id, image.cloud_storage_path);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {image.originalName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedImage}>
            Select Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
