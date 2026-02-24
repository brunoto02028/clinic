"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Camera, Upload, CheckCircle, Footprints, RotateCcw,
  ChevronRight, ChevronLeft, Smartphone, AlertCircle, Loader2,
  Zap, Scan, Eye, Ruler, Shield, Box, Video,
  Volume2, VolumeX, User, Users, ImageIcon, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CameraCapture from "@/components/scans/camera-capture";
import type { CaptureMode } from "@/components/scans/camera-capture";
import PatientCaptureGuide from "@/components/scans/patient-capture-guide";
import {
  VoiceGuide,
  getScanSteps,
  ANGLE_INFO,
  type ScanMode,
  type ScanStepDef,
  type QualityResult,
} from "@/lib/scan-utils";

// ────────── COMPONENT ──────────

type PageStep = "loading" | "invalid" | "intro" | "mode-select" | "calibration" | "capture" | "review" | "uploading" | "complete";

export default function MobileScanCapturePage() {
  const params = useParams();
  const token = params?.token as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<VoiceGuide | null>(null);

  // Session state
  const [step, setStep] = useState<PageStep>("loading");
  const [scanInfo, setScanInfo] = useState<{
    id: string; scanNumber: string; patientName: string; clinicName: string; clinicLogo: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mode & settings
  const [scanMode, setScanMode] = useState<ScanMode>("self");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("photo");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [useLiveCamera, setUseLiveCamera] = useState(false);

  // Steps derived from mode
  const [scanSteps, setScanSteps] = useState<ScanStepDef[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Capture state
  const [images, setImages] = useState<Record<string, File>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [qualities, setQualities] = useState<Record<string, QualityResult>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  // Device detection
  const [hasLidar, setHasLidar] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // ─── Initialize voice guide ───
  useEffect(() => {
    voiceRef.current = new VoiceGuide("en-GB");
    return () => { voiceRef.current?.stop(); };
  }, []);

  useEffect(() => {
    voiceRef.current?.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  // ─── Validate token on mount ───
  useEffect(() => {
    if (!token) { setStep("invalid"); return; }

    fetch(`/api/foot-scans/session?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Invalid scan link");
          setStep("invalid");
          return;
        }
        const data = await res.json();
        setScanInfo(data);
        setStep("intro");
      })
      .catch(() => {
        setError("Unable to connect. Check your internet connection.");
        setStep("invalid");
      });

    // Detect WebXR / LiDAR
    (async () => {
      try {
        if ("xr" in navigator) {
          const xr = (navigator as any).xr;
          if (xr?.isSessionSupported) {
            const supported = await xr.isSessionSupported("immersive-ar");
            if (supported) {
              const ua = navigator.userAgent;
              setHasLidar(/iPhone/.test(ua) && /OS 1[5-9]|OS 2[0-9]/.test(ua));
            }
          }
        }
      } catch {}
    })();

    // Detect camera API support for live camera
    setUseLiveCamera(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  }, [token]);

  // ─── Update steps when mode changes ───
  useEffect(() => {
    const steps = getScanSteps(scanMode);
    setScanSteps(steps);
    setCurrentStepIndex(0);
  }, [scanMode]);

  // ─── Derived state ───
  const currentScanStep = scanSteps[currentStepIndex];
  const capturedCount = Object.keys(images).length;
  const totalSteps = scanSteps.length;
  const minRequired = scanMode === "clinician" ? 8 : 6;

  const overallProgress = step === "complete" ? 100
    : step === "uploading" ? 90 + Math.round((uploadedCount / Math.max(capturedCount, 1)) * 10)
    : step === "review" ? 85
    : step === "capture" ? Math.round(((currentStepIndex + (images[currentScanStep?.id] ? 1 : 0)) / totalSteps) * 80)
    : 0;

  // ─── Capture handlers ───
  const handlePhotoCapture = useCallback((file: File, preview: string, quality: QualityResult) => {
    if (!currentScanStep) return;

    if (!quality.passed) {
      voiceRef.current?.instructRetake(
        quality.blur.message || quality.brightness.message || quality.contrast.message
      );
      // Still allow capture, but warn
    } else {
      voiceRef.current?.instructCapture();
    }

    setImages(prev => ({ ...prev, [currentScanStep.id]: file }));
    setPreviews(prev => ({ ...prev, [currentScanStep.id]: preview }));
    setQualities(prev => ({ ...prev, [currentScanStep.id]: quality }));
  }, [currentScanStep]);

  const handleVideoFrames = useCallback((frames: { file: File; preview: string }[]) => {
    if (!currentScanStep || frames.length === 0) return;
    // Use the best frame (first one, already sorted by quality)
    const best = frames[0];
    setImages(prev => ({ ...prev, [currentScanStep.id]: best.file }));
    setPreviews(prev => ({ ...prev, [currentScanStep.id]: best.preview }));
    voiceRef.current?.instructCapture();
  }, [currentScanStep]);

  // Fallback file input capture
  const handleFallbackCapture = () => { fileInputRef.current?.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentScanStep) return;
    setImages(prev => ({ ...prev, [currentScanStep.id]: file }));
    const url = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [currentScanStep.id]: url }));
    voiceRef.current?.instructCapture();
    e.target.value = "";
  };

  const goNext = () => {
    if (currentStepIndex < scanSteps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      voiceRef.current?.instructAngle(scanSteps[nextIdx].angle, scanSteps[nextIdx].foot, scanMode);
    } else {
      setStep("review");
      voiceRef.current?.speak("All angles captured. Please review your photos before uploading.");
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
    } else {
      setStep("calibration");
    }
  };

  const retakePhoto = () => {
    if (currentScanStep) {
      setImages(prev => { const c = { ...prev }; delete c[currentScanStep.id]; return c; });
      setPreviews(prev => { const c = { ...prev }; delete c[currentScanStep.id]; return c; });
    }
  };

  const goToStep = (idx: number) => {
    setCurrentStepIndex(idx);
    setStep("capture");
    voiceRef.current?.instructAngle(scanSteps[idx].angle, scanSteps[idx].foot, scanMode);
  };

  // ─── Upload ───
  const handleUploadAll = async () => {
    if (!scanInfo) return;
    setStep("uploading");
    setUploadedCount(0);
    voiceRef.current?.instructComplete();

    const entries = scanSteps.filter(s => images[s.id]);
    let uploaded = 0;

    for (const s of entries) {
      const file = images[s.id];
      if (!file) continue;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("angle", s.angle);
      formData.append("foot", s.foot);
      formData.append("scanToken", token);

      try {
        await fetch(`/api/foot-scans/${scanInfo.id}/upload-local`, { method: "POST", body: formData });
      } catch (err) {
        console.error(`Upload error for ${s.id}:`, err);
      }

      uploaded++;
      setUploadedCount(uploaded);
      setUploadProgress(Math.round((uploaded / entries.length) * 100));
    }

    try {
      await fetch(`/api/foot-scans/${scanInfo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captureMetadata: {
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
            totalImages: uploaded,
            angles: entries.map(s => s.id),
            captureMode: scanMode,
            hasLidar,
            referenceObject: "A4_paper",
          },
          status: "SCANNING",
        }),
      });
    } catch {}

    setStep("complete");
  };

  // ─── Renders ───

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Validating scan session...</p>
        </div>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-red-800">Scan Unavailable</h1>
          <p className="text-sm text-muted-foreground">{error || "This scan link is invalid or has expired."}</p>
          <p className="text-xs text-muted-foreground">Please ask your clinician for a new scan link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-primary" />
            <div>
              <span className="font-bold text-sm block leading-tight">Foot Scan</span>
              {scanInfo && <span className="text-[10px] text-muted-foreground">{scanInfo.scanNumber}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasLidar && <Badge className="bg-violet-600 text-white text-[10px] gap-1"><Zap className="h-3 w-3" />LiDAR</Badge>}
            <Badge variant="outline" className="text-[10px]">
              {scanMode === "clinician" ? "Clinician" : "Self"}
            </Badge>
            <button onClick={() => setShowGuide(!showGuide)} className="p-1" title="Help Guide">
              <HelpCircle className={`h-4 w-4 ${showGuide ? 'text-primary' : 'text-slate-400'}`} />
            </button>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="p-1">
              {voiceEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </button>
            <Badge variant="outline" className="text-xs">{capturedCount}/{totalSteps}</Badge>
          </div>
        </div>
        <Progress value={overallProgress} className="h-1.5 mt-2 max-w-lg mx-auto" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

        {/* ═══ PATIENT GUIDE OVERLAY ═══ */}
        {showGuide && (
          <PatientCaptureGuide
            locale="en-GB"
            onComplete={() => setShowGuide(false)}
            onClose={() => setShowGuide(false)}
            mode="full"
          />
        )}

        {/* ═══ COMPACT GUIDE (during capture) ═══ */}
        {!showGuide && step === "capture" && (
          <div className="mb-4">
            <PatientCaptureGuide locale="en-GB" onClose={() => {}} mode="compact" />
          </div>
        )}

        {/* ═══ INTRO ═══ */}
        {step === "intro" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Footprints className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Foot Scan</h1>
              {scanInfo && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {scanInfo.clinicName} &middot; Patient: <strong>{scanInfo.patientName}</strong>
                </p>
              )}
            </div>

            {hasLidar && (
              <Card className="border-violet-300 bg-violet-50">
                <CardContent className="pt-5 pb-4">
                  <div className="flex gap-3">
                    <Zap className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-violet-800">LiDAR Sensor Detected</p>
                      <p className="text-violet-700 mt-1 text-xs">Enhanced depth scanning available on this device.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Before You Start</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { n: "1", t: "Remove shoes and socks", d: "Bare feet are required for accurate scanning." },
                  { n: "2", t: "Find a well-lit area", d: "Natural light or bright indoor lighting. Avoid shadows." },
                  { n: "3", t: "Get an A4 sheet of paper", d: "Place it on a flat surface — used for scale calibration." },
                ].map((item) => (
                  <div key={item.n} className="flex gap-3">
                    <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xs">{item.n}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.t}</p>
                      <p className="text-muted-foreground text-xs">{item.d}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 h-12" onClick={() => setShowGuide(true)}>
                <HelpCircle className="h-4 w-4" /> Guide
              </Button>
              <Button className="flex-1 gap-2 h-12" onClick={() => { setStep("mode-select"); voiceRef.current?.instructIntro(); }}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ MODE SELECT ═══ */}
        {step === "mode-select" && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold">How are you scanning?</h2>
              <p className="text-muted-foreground mt-1 text-sm">This determines which angles are captured and instructions provided.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Card
                className={`cursor-pointer transition-all ${scanMode === "self" ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-300"}`}
                onClick={() => setScanMode("self")}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Self-Scan (at home)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You&apos;re scanning your own feet. {getScanSteps("self").length} photos.
                        Angles you can capture yourself (no sole photos).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${scanMode === "clinician" ? "border-primary ring-2 ring-primary/20" : "hover:border-slate-300"}`}
                onClick={() => setScanMode("clinician")}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Clinician-Scan (in clinic)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        An assistant is scanning the patient. {getScanSteps("clinician").length} photos
                        including sole and dorsal views.
                      </p>
                      <Badge className="mt-1.5 bg-emerald-100 text-emerald-700 text-[9px]">Recommended for best results</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Capture mode toggle */}
            <Card className="bg-slate-50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs font-medium mb-2">Capture Method:</p>
                <div className="flex gap-2">
                  <Button
                    variant={captureMode === "photo" ? "default" : "outline"}
                    size="sm" className="flex-1 gap-1 text-xs h-8"
                    onClick={() => setCaptureMode("photo")}
                  >
                    <Camera className="h-3 w-3" /> Individual Photos
                  </Button>
                  {useLiveCamera && (
                    <Button
                      variant={captureMode === "video" ? "default" : "outline"}
                      size="sm" className="flex-1 gap-1 text-xs h-8"
                      onClick={() => setCaptureMode("video")}
                    >
                      <Video className="h-3 w-3" /> Video Recording
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {captureMode === "video"
                    ? "Record a video around each angle. System extracts the best frames automatically."
                    : "Take individual photos for each angle. More precise control."}
                </p>
              </CardContent>
            </Card>

            {/* Settings */}
            <div className="flex gap-2">
              <Button
                variant={voiceEnabled ? "default" : "outline"}
                size="sm" className="flex-1 gap-1 text-xs h-8"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
              >
                {voiceEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                Voice Guide {voiceEnabled ? "On" : "Off"}
              </Button>
              <Button
                variant={showOverlay ? "default" : "outline"}
                size="sm" className="flex-1 gap-1 text-xs h-8"
                onClick={() => setShowOverlay(!showOverlay)}
              >
                <ImageIcon className="h-3 w-3" /> AR Guide {showOverlay ? "On" : "Off"}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-1" onClick={() => setStep("intro")}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button className="flex-1 gap-2 h-12" onClick={() => setStep("calibration")}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ CALIBRATION ═══ */}
        {step === "calibration" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Ruler className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Scale Reference Setup</h2>
              <p className="text-muted-foreground mt-1 text-sm">Ensures mm-accurate measurements.</p>
            </div>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-5 space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-24 h-16 border-2 border-blue-400 rounded bg-white flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 text-[10px] font-mono">A4</span>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">Place A4 paper on the floor</p>
                    <p className="text-blue-700 text-xs mt-1">
                      Standard A4 (210×297mm) provides scale reference.
                      Keep paper edges visible in plantar photos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 space-y-3 text-sm">
                <p className="font-medium text-xs">You will capture {totalSteps} angles ({scanMode === "clinician" ? "clinician mode" : "self-scan"}):</p>
                
                {/* Angle explanation cards */}
                {(() => {
                  const uniqueAngles = [...new Set(scanSteps.map(s => s.angle))];
                  return (
                    <div className="space-y-2">
                      {uniqueAngles.map(angle => {
                        const info = ANGLE_INFO[angle];
                        if (!info) return null;
                        return (
                          <div key={angle} className="flex gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center flex-shrink-0 text-lg">
                              {info.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-xs text-slate-900">{info.name}</p>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">{angle}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{info.meaning}</p>
                              <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                <Camera className="h-2.5 w-2.5" /> {info.position}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                  <div>
                    <p className="font-semibold text-xs text-blue-600 mb-1">Left Foot</p>
                    {scanSteps.filter(s => s.foot === "left").map(s => (
                      <p key={s.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCircle className="h-2.5 w-2.5 text-blue-400" />
                        {ANGLE_INFO[s.angle]?.name || s.angle}
                        {s.requiresAssistant && <Users className="h-2.5 w-2.5 text-amber-500" />}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-emerald-600 mb-1">Right Foot</p>
                    {scanSteps.filter(s => s.foot === "right").map(s => (
                      <p key={s.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                        {ANGLE_INFO[s.angle]?.name || s.angle}
                        {s.requiresAssistant && <Users className="h-2.5 w-2.5 text-amber-500" />}
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-1" onClick={() => setStep("mode-select")}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button className="flex-1 gap-2 h-12" onClick={() => {
                setCurrentStepIndex(0);
                setStep("capture");
                voiceRef.current?.instructAngle(scanSteps[0].angle, scanSteps[0].foot, scanMode);
              }}>
                Begin Capture <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ CAPTURE STEPS ═══ */}
        {step === "capture" && currentScanStep && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">Step {currentStepIndex + 1} / {totalSteps}</Badge>
              <div className="flex items-center gap-1.5">
                {currentScanStep.requiresAssistant && (
                  <Badge className="bg-amber-100 text-amber-700 text-[9px] gap-0.5"><Users className="h-2.5 w-2.5" />Assistant</Badge>
                )}
                <Badge className={currentScanStep.foot === "left" ? "bg-blue-600" : "bg-emerald-600"}>
                  {currentScanStep.foot === "left" ? "Left" : "Right"}
                </Badge>
              </div>
            </div>

            <h2 className="text-base font-bold">{currentScanStep.label}</h2>

            {/* What this angle is + where to hold the camera */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex gap-2.5">
                <div className="w-9 h-9 bg-white rounded-lg border border-blue-200 flex items-center justify-center flex-shrink-0 text-lg">
                  {ANGLE_INFO[currentScanStep.angle]?.icon || "🦶"}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900">
                    {ANGLE_INFO[currentScanStep.angle]?.name || currentScanStep.angle}
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-snug">
                    {currentScanStep.plainDescription}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-1.5 pl-0.5">
                <Smartphone className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-600 font-medium">{currentScanStep.cameraPosition}</p>
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{currentScanStep.tip}</p>
            </div>

            {/* Preview or Camera */}
            {previews[currentScanStep.id] ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border-2 border-green-400 bg-black">
                  <img src={previews[currentScanStep.id]} alt={currentScanStep.label} className="w-full h-64 object-contain" />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white text-xs gap-1">
                      <CheckCircle className="h-3 w-3" /> Captured
                    </Badge>
                  </div>
                  {qualities[currentScanStep.id] && !qualities[currentScanStep.id].passed && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <Badge className="bg-amber-500 text-white text-[9px]">
                        {qualities[currentScanStep.id].blur.message || qualities[currentScanStep.id].brightness.message || "Quality warning"}
                      </Badge>
                    </div>
                  )}
                  {images[currentScanStep.id] && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-[10px]">{(images[currentScanStep.id].size / 1024).toFixed(0)} KB</Badge>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={retakePhoto}>
                    <RotateCcw className="h-4 w-4" /> Retake
                  </Button>
                  <Button className="flex-1 gap-2" onClick={goNext}>
                    {currentStepIndex < scanSteps.length - 1 ? <>Next <ChevronRight className="h-4 w-4" /></> : <>Review <CheckCircle className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            ) : useLiveCamera ? (
              <CameraCapture
                angle={currentScanStep.angle}
                foot={currentScanStep.foot}
                label={currentScanStep.label}
                instruction={currentScanStep.instruction}
                showOverlay={showOverlay}
                captureMode={captureMode}
                onCapture={handlePhotoCapture}
                onVideoFrames={handleVideoFrames}
              />
            ) : (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed border-primary/30 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors active:scale-[0.98]"
                  onClick={handleFallbackCapture}
                >
                  <Camera className="h-12 w-12 text-primary/40 mb-3" />
                  <p className="text-sm font-medium text-primary">Tap to Open Camera</p>
                </div>
                <Button className="w-full gap-2 h-12" onClick={handleFallbackCapture}>
                  <Camera className="h-5 w-5" /> Take Photo
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={goPrev} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {previews[currentScanStep.id] && currentStepIndex < scanSteps.length - 1 && (
                <Button variant="ghost" size="sm" onClick={goNext} className="ml-auto gap-1">Skip <ChevronRight className="h-4 w-4" /></Button>
              )}
            </div>

            {/* Step dots */}
            <div className="flex gap-1 pt-1 overflow-x-auto pb-1">
              {scanSteps.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => goToStep(i)}
                  className={`w-7 h-7 flex-shrink-0 rounded border cursor-pointer flex items-center justify-center text-[8px] font-bold transition-colors ${
                    i === currentStepIndex ? "border-primary bg-primary/10 text-primary"
                      : previews[s.id] ? "border-green-400 bg-green-50 text-green-600"
                      : "border-slate-200 text-slate-400"
                  }`}
                >
                  {previews[s.id] ? "✓" : i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ REVIEW ═══ */}
        {step === "review" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Review Your Photos</h2>
            <p className="text-sm text-muted-foreground">Tap any image to retake.</p>

            {["left", "right"].map(foot => {
              const footSteps = scanSteps.filter(s => s.foot === foot);
              if (footSteps.length === 0) return null;
              return (
                <div key={foot}>
                  <p className={`text-xs font-semibold ${foot === "left" ? "text-blue-600" : "text-emerald-600"} mb-2 flex items-center gap-1`}>
                    <span className={`w-4 h-4 rounded-full ${foot === "left" ? "bg-blue-100" : "bg-emerald-100"} flex items-center justify-center text-[8px] font-bold`}>
                      {foot === "left" ? "L" : "R"}
                    </span>
                    {foot === "left" ? "Left" : "Right"} Foot ({footSteps.filter(s => previews[s.id]).length}/{footSteps.length})
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {footSteps.map(s => (
                      <div
                        key={s.id}
                        className={`relative rounded-lg overflow-hidden border-2 cursor-pointer aspect-square ${
                          previews[s.id] ? "border-green-400" : "border-red-300 bg-red-50"
                        }`}
                        onClick={() => goToStep(scanSteps.findIndex(x => x.id === s.id))}
                      >
                        {previews[s.id] ? (
                          <img src={previews[s.id]} alt={s.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Camera className="h-4 w-4 text-red-300" /></div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-0.5 py-px">
                          <p className="text-[6px] text-white truncate text-center">{ANGLE_INFO[s.angle]?.name || s.angle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {capturedCount < minRequired && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{minRequired - capturedCount} more photo(s) needed. Min {minRequired} required.</span>
              </div>
            )}

            <Button className="w-full gap-2 h-12" onClick={handleUploadAll} disabled={capturedCount < minRequired}>
              <Upload className="h-5 w-5" /> Upload {capturedCount} Photos
            </Button>
          </div>
        )}

        {/* ═══ UPLOADING ═══ */}
        {step === "uploading" && (
          <div className="space-y-6 py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div>
              <h2 className="text-lg font-bold">Uploading Photos...</h2>
              <p className="text-sm text-muted-foreground mt-1">{uploadedCount} / {capturedCount}</p>
            </div>
            <Progress value={uploadProgress} className="h-2 max-w-xs mx-auto" />
            <p className="text-xs text-muted-foreground">Please keep this page open.</p>
          </div>
        )}

        {/* ═══ COMPLETE ═══ */}
        {step === "complete" && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-800">Scan Complete!</h2>
              <p className="text-muted-foreground mt-2">{capturedCount} photos uploaded.</p>
            </div>
            <Card className="text-left">
              <CardContent className="pt-5 space-y-3 text-sm">
                <p className="font-semibold">What happens next:</p>
                <div className="space-y-2">
                  {[
                    { icon: Eye, text: "Clinician reviews images" },
                    { icon: Scan, text: "3D foot model generated" },
                    { icon: Zap, text: "AI biomechanical analysis" },
                    { icon: Box, text: "Custom insole design" },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="h-3 w-3 text-green-700" />
                      </div>
                      <p className="text-muted-foreground text-xs">{text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {scanInfo && <p className="text-xs text-muted-foreground">Scan: {scanInfo.scanNumber}<br />You can close this page.</p>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-muted-foreground border-t mt-8">
        {scanInfo?.clinicName || "Bruno Physical Rehabilitation"} &middot; Secure Scan Portal
      </div>
    </div>
  );
}
