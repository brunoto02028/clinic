"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoUpload {
  file: File;
  preview: string;
  angle: string;
}

export default function NewFootScanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Form data
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // 3D Scans
  const [leftFootScan, setLeftFootScan] = useState<File | null>(null);
  const [rightFootScan, setRightFootScan] = useState<File | null>(null);

  // Photos - Left Foot
  const [leftFrontal, setLeftFrontal] = useState<PhotoUpload[]>([]);
  const [leftLateral, setLeftLateral] = useState<PhotoUpload[]>([]);
  const [leftPosterior, setLeftPosterior] = useState<PhotoUpload[]>([]);

  // Photos - Right Foot
  const [rightFrontal, setRightFrontal] = useState<PhotoUpload[]>([]);
  const [rightLateral, setRightLateral] = useState<PhotoUpload[]>([]);
  const [rightPosterior, setRightPosterior] = useState<PhotoUpload[]>([]);

  const handleFileUpload = (
    file: File,
    setter: React.Dispatch<React.SetStateAction<PhotoUpload[]>>,
    angle: string
  ) => {
    const preview = URL.createObjectURL(file);
    setter((prev) => [...prev, { file, preview, angle }]);
  };

  const removePhoto = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<PhotoUpload[]>>
  ) => {
    setter((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const handleSaveDraft = async () => {
    if (!patientId) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("patientId", patientId);
      formData.append("date", date);
      formData.append("status", "pending");

      if (leftFootScan) formData.append("leftFootScan", leftFootScan);
      if (rightFootScan) formData.append("rightFootScan", rightFootScan);

      // Add all photos
      leftFrontal.forEach((photo, i) => formData.append(`leftFrontal${i}`, photo.file));
      leftLateral.forEach((photo, i) => formData.append(`leftLateral${i}`, photo.file));
      leftPosterior.forEach((photo, i) => formData.append(`leftPosterior${i}`, photo.file));
      rightFrontal.forEach((photo, i) => formData.append(`rightFrontal${i}`, photo.file));
      rightLateral.forEach((photo, i) => formData.append(`rightLateral${i}`, photo.file));
      rightPosterior.forEach((photo, i) => formData.append(`rightPosterior${i}`, photo.file));

      const res = await fetch("/api/foot-scans", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save draft");

      const data = await res.json();

      toast({
        title: "Success",
        description: "Draft saved successfully",
      });

      router.push(`/admin/foot-scans/${data.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!patientId) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    if (!leftFootScan || !rightFootScan) {
      toast({
        title: "Error",
        description: "Please upload both foot scans",
        variant: "destructive",
      });
      return;
    }

    const totalPhotos =
      leftFrontal.length +
      leftLateral.length +
      leftPosterior.length +
      rightFrontal.length +
      rightLateral.length +
      rightPosterior.length;

    if (totalPhotos < 12) {
      toast({
        title: "Warning",
        description: "Minimum 12 photos recommended for accurate analysis (6 per foot)",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("patientId", patientId);
      formData.append("date", date);
      formData.append("status", "analyzing");

      if (leftFootScan) formData.append("leftFootScan", leftFootScan);
      if (rightFootScan) formData.append("rightFootScan", rightFootScan);

      // Add all photos
      leftFrontal.forEach((photo, i) => formData.append(`leftFrontal${i}`, photo.file));
      leftLateral.forEach((photo, i) => formData.append(`leftLateral${i}`, photo.file));
      leftPosterior.forEach((photo, i) => formData.append(`leftPosterior${i}`, photo.file));
      rightFrontal.forEach((photo, i) => formData.append(`rightFrontal${i}`, photo.file));
      rightLateral.forEach((photo, i) => formData.append(`rightLateral${i}`, photo.file));
      rightPosterior.forEach((photo, i) => formData.append(`rightPosterior${i}`, photo.file));

      const res = await fetch("/api/foot-scans", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create assessment");

      const data = await res.json();

      // Start analysis
      const analyzeRes = await fetch(`/api/foot-scans/${data.id}/analyze`, {
        method: "POST",
      });

      if (!analyzeRes.ok) throw new Error("Failed to analyze");

      toast({
        title: "Success",
        description: "Analysis completed successfully",
      });

      router.push(`/admin/foot-scans/${data.id}/analysis`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze assessment",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const PhotoUploadSection = ({
    title,
    photos,
    setter,
    maxPhotos,
    angles,
  }: {
    title: string;
    photos: PhotoUpload[];
    setter: React.Dispatch<React.SetStateAction<PhotoUpload[]>>;
    maxPhotos: number;
    angles: string[];
  }) => (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img
              src={photo.preview}
              alt={`${title} ${index + 1}`}
              className="w-full h-24 object-cover rounded-lg border"
            />
            <div className="absolute top-1 right-1">
              <Button
                size="sm"
                variant="destructive"
                className="h-6 w-6 p-0"
                onClick={() => removePhoto(index, setter)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
              {photo.angle}
            </div>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">
              {angles[photos.length] || "Upload"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file, setter, angles[photos.length] || `Photo ${photos.length + 1}`);
                }
              }}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {photos.length}/{maxPhotos} photos uploaded
      </p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Foot Scan Assessment</h1>
          <p className="text-sm text-muted-foreground">
            Upload 3D scans and photos for AI-powered gait analysis
          </p>
        </div>
      </div>

      {/* Step 1: Patient Information */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Patient Information</CardTitle>
          <CardDescription>Select patient and assessment date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient1">John Smith</SelectItem>
                  <SelectItem value="patient2">Mary Johnson</SelectItem>
                  <SelectItem value="patient3">Peter Brown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Assessment Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: 3D Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload 3D Scans *</CardTitle>
          <CardDescription>
            Upload STL files from 3D scan app (e.g., Polycam, 3D Scanner App)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Left Foot STL</Label>
              {leftFootScan ? (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm truncate">{leftFootScan.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLeftFootScan(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click or drag STL file
                  </span>
                  <input
                    type="file"
                    accept=".stl"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setLeftFootScan(file);
                    }}
                  />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <Label>Right Foot STL</Label>
              {rightFootScan ? (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm truncate">{rightFootScan.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRightFootScan(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click or drag STL file
                  </span>
                  <input
                    type="file"
                    accept=".stl"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setRightFootScan(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Photos - Left Foot */}
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Upload Photos - Left Foot *</CardTitle>
          <CardDescription>
            Minimum 6 photos recommended: 3 frontal, 2 lateral, 3 posterior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoUploadSection
            title="Frontal Views (3 angles)"
            photos={leftFrontal}
            setter={setLeftFrontal}
            maxPhotos={3}
            angles={["Center 0°", "Left -15°", "Right +15°"]}
          />
          <PhotoUploadSection
            title="Lateral Views (2 angles)"
            photos={leftLateral}
            setter={setLeftLateral}
            maxPhotos={2}
            angles={["Inner side", "Outer side"]}
          />
          <PhotoUploadSection
            title="Posterior Views (3 angles) - MOST IMPORTANT"
            photos={leftPosterior}
            setter={setLeftPosterior}
            maxPhotos={3}
            angles={["Center 0°", "Left -15°", "Right +15°"]}
          />
        </CardContent>
      </Card>

      {/* Step 4: Photos - Right Foot */}
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Upload Photos - Right Foot *</CardTitle>
          <CardDescription>
            Minimum 6 photos recommended: 3 frontal, 2 lateral, 3 posterior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoUploadSection
            title="Frontal Views (3 angles)"
            photos={rightFrontal}
            setter={setRightFrontal}
            maxPhotos={3}
            angles={["Center 0°", "Left -15°", "Right +15°"]}
          />
          <PhotoUploadSection
            title="Lateral Views (2 angles)"
            photos={rightLateral}
            setter={setRightLateral}
            maxPhotos={2}
            angles={["Inner side", "Outer side"]}
          />
          <PhotoUploadSection
            title="Posterior Views (3 angles) - MOST IMPORTANT"
            photos={rightPosterior}
            setter={setRightPosterior}
            maxPhotos={3}
            angles={["Center 0°", "Left -15°", "Right +15°"]}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={loading || analyzing}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Draft
          </Button>
          <Button onClick={handleAnalyze} disabled={loading || analyzing} className="gap-2">
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze with AI
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
