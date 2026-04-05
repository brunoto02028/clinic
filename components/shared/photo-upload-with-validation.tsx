"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

interface PhotoUpload {
  file: File;
  preview: string;
  angle: string;
  quality?: "good" | "warning" | "poor";
  issues?: string[];
}

interface PhotoUploadWithValidationProps {
  title: string;
  description: string;
  angle: string;
  onPhotoChange: (photo: PhotoUpload | null) => void;
  currentPhoto?: PhotoUpload | null;
}

export function PhotoUploadWithValidation({
  title,
  description,
  angle,
  onPhotoChange,
  currentPhoto,
}: PhotoUploadWithValidationProps) {
  const [photo, setPhoto] = useState<PhotoUpload | null>(currentPhoto || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validatePhoto = (file: File): { quality: "good" | "warning" | "poor"; issues: string[] } => {
    const issues: string[] = [];
    let quality: "good" | "warning" | "poor" = "good";

    // Check file size (should be between 500KB and 10MB)
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB < 0.5) {
      issues.push("Imagem muito pequena - pode estar com baixa qualidade");
      quality = "warning";
    } else if (sizeInMB > 10) {
      issues.push("Imagem muito grande - pode demorar para carregar");
      quality = "warning";
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      issues.push("Arquivo não é uma imagem válida");
      quality = "poor";
    }

    // Additional checks could be done with image dimensions after loading
    // For now, we'll do basic validation

    return { quality, issues };
  };

  const handleFileSelect = (file: File) => {
    const validation = validatePhoto(file);
    const preview = URL.createObjectURL(file);
    
    const newPhoto: PhotoUpload = {
      file,
      preview,
      angle,
      quality: validation.quality,
      issues: validation.issues,
    };

    setPhoto(newPhoto);
    onPhotoChange(newPhoto);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhoto(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getQualityBadge = () => {
    if (!photo?.quality) return null;

    const badges = {
      good: { text: "Ótima qualidade", color: "bg-green-100 text-green-700 border-green-200" },
      warning: { text: "Atenção", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      poor: { text: "Qualidade ruim", color: "bg-red-100 text-red-700 border-red-200" },
    };

    const badge = badges[photo.quality];
    const Icon = photo.quality === "good" ? CheckCircle2 : AlertCircle;

    return (
      <Badge variant="outline" className={`${badge.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {badge.text}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {photo && getQualityBadge()}
        </div>

        {!photo ? (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Arraste uma foto aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou WEBP (máx. 10MB)
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Trigger camera on mobile devices
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.capture = "environment";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file);
                    };
                    input.click();
                  }}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Tirar Foto
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative group rounded-lg overflow-hidden border">
              <div className="relative aspect-video bg-muted">
                <Image
                  src={photo.preview}
                  alt={title}
                  fill
                  className="object-contain"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {photo.issues && photo.issues.length > 0 && (
              <div className="space-y-2">
                {photo.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{issue}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{photo.file.name}</span>
              <span>{(photo.file.size / 1024).toFixed(0)} KB</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              Substituir Foto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
