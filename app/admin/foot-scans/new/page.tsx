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
import { PhotoInstructions } from "@/components/foot-scans/photo-instructions";

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
  const [showInstructions, setShowInstructions] = useState(true);

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

  // Videos
  const [leftFootVideo, setLeftFootVideo] = useState<File | null>(null);
  const [rightFootVideo, setRightFootVideo] = useState<File | null>(null);
  const [walkingVideo, setWalkingVideo] = useState<File | null>(null);

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

      // Add videos if present
      if (leftFootVideo) formData.append("leftFootVideo", leftFootVideo);
      if (rightFootVideo) formData.append("rightFootVideo", rightFootVideo);
      if (walkingVideo) formData.append("walkingVideo", walkingVideo);

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

    // Check if at least SOMETHING is uploaded
    const hasLeftScan = !!leftFootScan;
    const hasRightScan = !!rightFootScan;
    const totalPhotos =
      leftFrontal.length +
      leftLateral.length +
      leftPosterior.length +
      rightFrontal.length +
      rightLateral.length +
      rightPosterior.length;

    if (!hasLeftScan && !hasRightScan && totalPhotos === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one STL file or photo to analyze",
        variant: "destructive",
      });
      return;
    }

    // Show informative warnings but allow to proceed
    const warnings = [];
    if (!hasLeftScan && !hasRightScan) {
      warnings.push("No STL files - analysis based on photos only");
    } else if (!hasLeftScan) {
      warnings.push("Right foot only");
    } else if (!hasRightScan) {
      warnings.push("Left foot only");
    }

    if (totalPhotos === 0) {
      warnings.push("No photos - 3D scans only");
    } else if (totalPhotos < 12) {
      warnings.push(`${totalPhotos} photos (12 recommended)`);
    }

    if (warnings.length > 0) {
      toast({
        title: "🧪 Test Mode",
        description: warnings.join(" • "),
        duration: 5000,
      });
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

      // Add videos if present
      if (leftFootVideo) formData.append("leftFootVideo", leftFootVideo);
      if (rightFootVideo) formData.append("rightFootVideo", rightFootVideo);
      if (walkingVideo) formData.append("walkingVideo", walkingVideo);

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
    description,
  }: {
    title: string;
    photos: PhotoUpload[];
    setter: React.Dispatch<React.SetStateAction<PhotoUpload[]>>;
    description: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>{title}</Label>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <label className="cursor-pointer">
          <Button type="button" variant="outline" size="sm" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Add Photos
            </span>
          </Button>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file, i) => {
                handleFileUpload(file, setter, `Photo ${photos.length + i + 1}`);
              });
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo.preview}
                alt={`${title} ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg border"
              />
              <div className="absolute top-1 right-1">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(index, setter)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded
      </p>
    </div>
  );

  // Show instructions first
  if (showInstructions) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Foot Scan Assessment</h1>
            <p className="text-sm text-muted-foreground">
              Antes de começar, leia as instruções para garantir fotos de qualidade
            </p>
          </div>
        </div>
        <PhotoInstructions 
          onComplete={() => setShowInstructions(false)}
          type="both"
        />
      </div>
    );
  }

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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowInstructions(true)}
          className="ml-auto"
        >
          Ver Instruções Novamente
        </Button>
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
          <CardTitle>Step 2: Upload 3D Scans (Optional)</CardTitle>
          <CardDescription>
            Upload 1 or 2 STL files for testing - You can analyze just one foot or both
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
          <CardTitle>Step 3: Upload Photos - Left Foot (Optional)</CardTitle>
          <CardDescription>
            Upload 1 or more photos for testing - Recommended: 3 frontal, 2 lateral, 3 posterior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoUploadSection
            title="Frontal Views"
            photos={leftFrontal}
            setter={setLeftFrontal}
            description="Front view of foot - multiple angles recommended"
          />
          <PhotoUploadSection
            title="Lateral Views"
            photos={leftLateral}
            setter={setLeftLateral}
            description="Side views - inner and outer sides"
          />
          <PhotoUploadSection
            title="Posterior Views - MOST IMPORTANT"
            photos={leftPosterior}
            setter={setLeftPosterior}
            description="Back view of heel - critical for pronation/supination analysis"
          />
        </CardContent>
      </Card>

      {/* Step 4: Photos - Right Foot */}
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Upload Photos - Right Foot (Optional)</CardTitle>
          <CardDescription>
            Upload 1 or more photos for testing - Recommended: 3 frontal, 2 lateral, 3 posterior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoUploadSection
            title="Frontal Views"
            photos={rightFrontal}
            setter={setRightFrontal}
            description="Front view of foot - multiple angles recommended"
          />
          <PhotoUploadSection
            title="Lateral Views"
            photos={rightLateral}
            setter={setRightLateral}
            description="Side views - inner and outer sides"
          />
          <PhotoUploadSection
            title="Posterior Views - MOST IMPORTANT"
            photos={rightPosterior}
            setter={setRightPosterior}
            description="Back view of heel - critical for pronation/supination analysis"
          />
        </CardContent>
      </Card>

      {/* Step 5: Videos (Optional but Recommended) */}
      <Card>
        <CardHeader>
          <CardTitle>Step 5: Upload Videos (Optional but Recommended)</CardTitle>
          <CardDescription>
            Videos provide dynamic analysis of gait and foot movement - more accurate than static photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Left Foot Video */}
            <div className="space-y-2">
              <Label>Left Foot Video</Label>
              <p className="text-xs text-muted-foreground mb-2">
                360° rotation around left foot
              </p>
              {leftFootVideo ? (
                <div className="space-y-2">
                  <video
                    src={URL.createObjectURL(leftFootVideo)}
                    className="w-full h-32 object-cover rounded-lg border"
                    controls
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setLeftFootVideo(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload video</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setLeftFootVideo(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Right Foot Video */}
            <div className="space-y-2">
              <Label>Right Foot Video</Label>
              <p className="text-xs text-muted-foreground mb-2">
                360° rotation around right foot
              </p>
              {rightFootVideo ? (
                <div className="space-y-2">
                  <video
                    src={URL.createObjectURL(rightFootVideo)}
                    className="w-full h-32 object-cover rounded-lg border"
                    controls
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setRightFootVideo(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload video</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setRightFootVideo(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Walking Video */}
            <div className="space-y-2">
              <Label>Walking Video</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Patient walking 5-10 steps
              </p>
              {walkingVideo ? (
                <div className="space-y-2">
                  <video
                    src={URL.createObjectURL(walkingVideo)}
                    className="w-full h-32 object-cover rounded-lg border"
                    controls
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setWalkingVideo(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload video</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setWalkingVideo(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Videos provide much better analysis than photos alone. The AI can analyze dynamic movement, weight distribution, and gait patterns more accurately.
            </p>
          </div>
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
