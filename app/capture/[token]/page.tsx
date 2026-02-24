"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BodyCapture, BodyCaptureResult } from "@/components/body-assessment/body-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, Camera, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AssessmentInfo {
  id: string;
  assessmentNumber: string;
  status: string;
  captureTokenExpiry: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  leftImageUrl: string | null;
  rightImageUrl: string | null;
  patient: { firstName: string; lastName: string };
  clinic: { name: string; logoUrl: string | null };
}

export default function CapturePage() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();

  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, [token]);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`/api/body-assessments/capture/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid or expired link");
        return;
      }
      const data = await res.json();
      setAssessment(data);

      // Check if already complete
      if (data.frontImageUrl && data.backImageUrl && data.leftImageUrl && data.rightImageUrl) {
        setIsComplete(true);
      }
    } catch {
      setError("Failed to load assessment. Please check your link.");
    } finally {
      setLoading(false);
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleCaptureComplete = async (result: BodyCaptureResult) => {
    setIsUploading(true);
    setIsCapturing(false);

    try {
      // Upload photos
      const photoEntries = Object.entries(result.photos);
      for (let i = 0; i < photoEntries.length; i++) {
        const [view, data] = photoEntries[i];
        if (!data) continue;
        setUploadProgress(`Uploading photo ${i + 1}/${photoEntries.length}...`);

        const res = await fetch(`/api/body-assessments/capture/${token}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            view,
            imageData: data.imageData,
            landmarks: data.landmarks,
            captureMetadata: {
              device: navigator.userAgent,
              timestamp: data.timestamp,
              screen: { width: screen.width, height: screen.height },
            },
          }),
        });

        if (!res.ok) throw new Error(`Failed to upload ${view} view`);
      }

      // Upload videos
      if (result.videos && result.videos.length > 0) {
        for (let i = 0; i < result.videos.length; i++) {
          const vid = result.videos[i];
          setUploadProgress(`Uploading video ${i + 1}/${result.videos.length} (${vid.label})...`);

          // Convert blob to data URL for transfer
          const videoDataUrl = await blobToDataUrl(vid.blob);

          const res = await fetch(`/api/body-assessments/capture/${token}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movementVideo: {
                testType: vid.testType,
                label: vid.label,
                duration: vid.duration,
                videoDataUrl,
              },
            }),
          });

          if (!res.ok) throw new Error(`Failed to upload ${vid.label} video`);
        }
      }

      // Mark as pending analysis
      setUploadProgress("Finalizing...");
      await fetch(`/api/body-assessments/capture/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_ANALYSIS" }),
      });

      setIsComplete(true);
      toast({
        title: "Capture Complete!",
        description: "Your images and videos have been uploaded. Your therapist will review them soon.",
      });
    } catch (err: any) {
      toast({
        title: "Upload Error",
        description: err.message || "Failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Link Invalid</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium">Uploading...</p>
          <p className="text-sm text-muted-foreground">{uploadProgress || "Please wait while we process your captures"}</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-semibold">Assessment Complete!</h2>
            <p className="text-muted-foreground">
              Your body assessment images and videos have been submitted successfully.
              Your therapist will review them and provide your results.
            </p>
            <Badge variant="outline" className="text-sm">
              {assessment?.assessmentNumber}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Capture mode
  if (isCapturing) {
    return (
      <div className="h-screen">
        <BodyCapture
          onComplete={handleCaptureComplete}
          onCancel={() => setIsCapturing(false)}
        />
      </div>
    );
  }

  // Welcome / start screen
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        {/* Clinic branding */}
        <div className="text-center space-y-2">
          {assessment?.clinic.logoUrl && (
            <img
              src={assessment.clinic.logoUrl}
              alt={assessment.clinic.name}
              className="h-12 mx-auto"
            />
          )}
          <h1 className="text-xl font-bold">{assessment?.clinic.name}</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Body Assessment</CardTitle>
            <CardDescription>
              Hi {assessment?.patient.firstName}, we need to capture photos and movement
              videos for your biomechanical assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assessment info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assessment #</span>
                <span className="font-medium">{assessment?.assessmentNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">
                  {assessment?.patient.firstName} {assessment?.patient.lastName}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">How it works:</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <span>Stand in a well-lit area with your <strong>full body visible</strong></span>
                </div>
                <div className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <span><strong>4 photos</strong>: front, back, left side, right side</span>
                </div>
                <div className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <span><strong>Movement videos</strong>: squat, gait, lunge, balance tests</span>
                </div>
                <div className="flex gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">4</span>
                  <span>Review each capture and submit when done</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                <strong>Tips:</strong> Wear tight-fitting clothes. Use a plain background.
                Ask someone to hold the camera or prop your phone ~2m away.
              </p>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => setIsCapturing(true)}
            >
              <Camera className="h-5 w-5 mr-2" />
              Start Capture
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
