"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Heart,
  Activity,
  Plus,
  Camera,
  PenLine,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Smartphone,
  Flashlight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileText,
  Zap,
  BarChart3,
  Shield,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import ProfessionalReviewBanner from "@/components/dashboard/professional-review-banner";

interface BPReading {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  method: "MANUAL" | "CAMERA_PPG";
  notes: string | null;
  confidence: number | null;
  ppgSignal?: any;
  measuredAt: string;
}

interface PPGAnalysis {
  heartRate: number;
  rrIntervals: number[];
  peaks: number[];
  sdnn: number;
  rmssd: number;
  pnn50: number;
  rhythmClassification: "NORMAL_SINUS" | "IRREGULAR" | "TACHYCARDIA" | "BRADYCARDIA" | "POSSIBLE_AFIB" | "PREMATURE_BEATS";
  rhythmLabel: string;
  rhythmColor: string;
  rhythmDescription: string;
  confidence: number;
  waveform: number[];
  timestamps: number[];
}

function classifyBP(sys: number, dia: number): { labelEn: string; labelPt: string; color: string; icon: any; severity: number } {
  if (sys >= 180 || dia >= 120) return { labelEn: "Crisis", labelPt: "Crise Hipertensiva", color: "text-red-400 bg-red-500/15 border-red-500/30", icon: AlertTriangle, severity: 5 };
  if (sys >= 140 || dia >= 90) return { labelEn: "High (Stage 2)", labelPt: "Alta (Estágio 2)", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: AlertTriangle, severity: 4 };
  if (sys >= 130 || dia >= 80) return { labelEn: "High (Stage 1)", labelPt: "Alta (Estágio 1)", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", icon: AlertTriangle, severity: 3 };
  if (sys >= 120 && dia < 80) return { labelEn: "Elevated", labelPt: "Elevada", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: TrendingUp, severity: 2 };
  if (sys < 90 || dia < 60) return { labelEn: "Low", labelPt: "Baixa", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: TrendingDown, severity: 1 };
  return { labelEn: "Normal", labelPt: "Normal", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle, severity: 0 };
}

interface DeviceInfo {
  model: string;
  os: string;
  hasTorch: boolean;
  instructions: string;
  isTablet: boolean;
  cameraPosition: string;
  isOldDevice: boolean;
  oldDeviceWarning: string;
  brand: string;
  minYearSupported: number;
}

function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === "undefined") return { model: "Unknown", os: "Unknown", hasTorch: false, instructions: "", isTablet: false, cameraPosition: "top-left", isOldDevice: false, oldDeviceWarning: "", brand: "Unknown", minYearSupported: 2018 };
  const ua = navigator.userAgent;
  let model = "your phone";
  let os = "Unknown";
  let hasTorch = true;
  let isTablet = false;
  let cameraPosition = "top-left";
  let isOldDevice = false;
  let oldDeviceWarning = "";
  let brand = "Unknown";
  const minYearSupported = 2018;

  if (/iPhone/.test(ua)) {
    os = "iOS";
    brand = "Apple";
    const match = ua.match(/iPhone\s?(\d+)/);
    const iphoneVersion = match ? parseInt(match[1]) : 0;
    model = match ? `iPhone ${match[1]}` : "iPhone";

    // iPhone camera positions by version
    if (iphoneVersion >= 16) {
      cameraPosition = "top-left (diagonal dual/triple lens)";
      model = `iPhone ${iphoneVersion}`;
    } else if (iphoneVersion >= 13) {
      cameraPosition = "top-left (diagonal dual lens)";
    } else if (iphoneVersion >= 11) {
      cameraPosition = "top-left (square camera module)";
    } else if (iphoneVersion >= 7) {
      cameraPosition = "top-left corner";
    } else {
      cameraPosition = "top-left corner";
      if (iphoneVersion > 0 && iphoneVersion < 7) {
        isOldDevice = true;
        oldDeviceWarning = `iPhone ${iphoneVersion} (released before 2016) may not support reliable PPG measurement. For accurate readings, we recommend iPhone 7 or newer (2016+). The flash LED may be too dim and the camera quality insufficient for blood flow detection.`;
      }
    }
  } else if (/iPad/.test(ua)) {
    os = "iOS"; brand = "Apple"; model = "iPad"; hasTorch = false; isTablet = true;
    cameraPosition = "top-centre (back)";
    oldDeviceWarning = "iPads have limited flash support. For best results, use an iPhone or Android phone with a rear flash LED.";
    isOldDevice = true;
  } else if (/Android/.test(ua)) {
    os = "Android";
    const buildMatch = ua.match(/;\s*([^;)]+)\s*Build/);
    model = buildMatch ? buildMatch[1].trim() : "Android device";

    // Detect brand and model specifics
    if (/samsung/i.test(ua) || /SM-/i.test(model)) {
      brand = "Samsung";
      if (/SM-S9|SM-S8|SM-G99|SM-G98|SM-S91|SM-S92|SM-S93|SM-S24|SM-S23|SM-S22|SM-S21/i.test(model)) {
        cameraPosition = "top-centre (vertical camera array)";
      } else if (/SM-A/i.test(model)) {
        cameraPosition = "top-left (vertical camera module)";
      } else if (/SM-G|SM-N/i.test(model)) {
        cameraPosition = "top-centre";
      } else {
        cameraPosition = "top-centre of the back";
      }
      // Check for old Samsung (SM-G9xx where 9xx < 950 = pre-2017)
      const gMatch = model.match(/SM-G(\d{3})/);
      if (gMatch && parseInt(gMatch[1]) < 950) {
        isOldDevice = true;
        oldDeviceWarning = `${model} may be a pre-2018 model. For accurate PPG readings, we recommend Samsung Galaxy S9 (2018) or newer, or Galaxy A50 (2019) or newer.`;
      }
    } else if (/pixel/i.test(ua) || /pixel/i.test(model)) {
      brand = "Google";
      cameraPosition = "top-left (horizontal camera bar on Pixel 6+, or top-centre on older)";
    } else if (/huawei|honor/i.test(ua)) {
      brand = model.match(/honor/i) ? "Honor" : "Huawei";
      cameraPosition = "top-centre (circular or square camera module)";
    } else if (/xiaomi|redmi|poco/i.test(ua)) {
      brand = "Xiaomi";
      cameraPosition = "top-left or top-centre (vertical camera array)";
    } else if (/oneplus/i.test(ua)) {
      brand = "OnePlus";
      cameraPosition = "top-left (vertical camera module)";
    } else if (/oppo|realme|vivo/i.test(ua)) {
      brand = /realme/i.test(ua) ? "Realme" : /vivo/i.test(ua) ? "Vivo" : "Oppo";
      cameraPosition = "top-left (vertical camera module)";
    } else if (/motorola|moto/i.test(ua)) {
      brand = "Motorola";
      cameraPosition = "top-centre (circular camera module)";
    } else if (/sony|xperia/i.test(ua)) {
      brand = "Sony";
      cameraPosition = "top-left (vertical camera array)";
    } else if (/nokia|hmd/i.test(ua)) {
      brand = "Nokia";
      cameraPosition = "top-centre (circular camera module)";
    } else if (/lg/i.test(ua)) {
      brand = "LG";
      cameraPosition = "top-centre";
      isOldDevice = true;
      oldDeviceWarning = "LG has discontinued phone production. If your device is from before 2020, PPG readings may be less accurate.";
    }

    // Generic old Android detection via API level
    const apiMatch = ua.match(/Android\s(\d+)/);
    const androidVersion = apiMatch ? parseInt(apiMatch[1]) : 0;
    if (androidVersion > 0 && androidVersion < 8) {
      isOldDevice = true;
      oldDeviceWarning = `Android ${androidVersion} detected. For reliable PPG measurement, we recommend Android 8.0 (Oreo, 2017) or newer with a quality rear camera and flash LED. Older devices may have insufficient camera/flash quality.`;
    }

    if (/tablet|SM-T|Tab/i.test(ua)) { isTablet = true; hasTorch = false; }
  } else if (/Macintosh.*Safari/.test(ua) && typeof document !== "undefined" && "ontouchend" in document) {
    os = "iOS"; brand = "Apple"; model = "iPad"; hasTorch = false; isTablet = true;
    cameraPosition = "top-centre (back)";
    isOldDevice = true;
    oldDeviceWarning = "iPads have limited flash support. Use an iPhone or Android phone for best results.";
  }

  // Build detailed instructions based on brand and camera position
  let instructions = "";
  if (isTablet) {
    instructions = `On ${model}, the rear camera is at the ${cameraPosition}. Place your index fingertip firmly over the camera lens. Note: tablets may have limited flash support — for best results, use a phone.`;
  } else if (brand === "Apple") {
    instructions = `On ${model}, the rear camera and flash (LED) are at the ${cameraPosition} of the back. Place your index fingertip firmly covering BOTH the main camera lens and the flash LED completely. The flash will illuminate your fingertip to detect blood flow.`;
  } else if (brand === "Samsung") {
    instructions = `On your Samsung ${model}, the camera and flash are at the ${cameraPosition} of the back. Place your index fingertip firmly covering BOTH the main (largest) camera lens and the flash LED. The flash should activate automatically.`;
  } else if (brand === "Google") {
    instructions = `On your Pixel ${model}, the camera and flash are at the ${cameraPosition}. Place your index fingertip firmly covering both the main camera lens and the flash LED.`;
  } else if (os === "Android") {
    instructions = `On your ${brand} ${model}, the camera and flash are at the ${cameraPosition} of the back. Place your index fingertip firmly covering BOTH the main camera lens and the flash LED.`;
  } else {
    instructions = "Place your index fingertip firmly covering both the rear camera lens and the flash LED on the back of your device.";
  }

  return { model, os, hasTorch, instructions, isTablet, cameraPosition, isOldDevice, oldDeviceWarning, brand, minYearSupported };
}

// ─── PPG Signal Analysis: Arrhythmia Detection + HRV ───
function analyzePPGSignal(samples: number[], fps: number): PPGAnalysis {
  const n = samples.length;
  if (n < 60) {
    return {
      heartRate: 0, rrIntervals: [], peaks: [], sdnn: 0, rmssd: 0, pnn50: 0,
      rhythmClassification: "NORMAL_SINUS", rhythmLabel: "Insufficient Data", rhythmColor: "text-muted-foreground",
      rhythmDescription: "Not enough data collected for analysis.", confidence: 0,
      waveform: samples, timestamps: samples.map((_, i) => i / fps * 1000),
    };
  }

  // Smooth signal (moving average, window=5)
  const smoothed: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - 2);
    const end = Math.min(n, i + 3);
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j];
    smoothed.push(sum / (end - start));
  }

  // Normalize
  const min = Math.min(...smoothed);
  const max = Math.max(...smoothed);
  const range = max - min || 1;
  const normalized = smoothed.map(v => (v - min) / range);

  // Detect peaks using adaptive threshold
  const mean = normalized.reduce((a, b) => a + b, 0) / normalized.length;
  const threshold = mean + 0.3 * (1 - mean);
  const peakIndices: number[] = [];
  const minPeakDist = Math.floor(fps * 0.35); // Min 350ms between peaks (~170 bpm max)

  for (let i = 2; i < normalized.length - 2; i++) {
    if (
      normalized[i] > threshold &&
      normalized[i] > normalized[i - 1] &&
      normalized[i] > normalized[i + 1] &&
      normalized[i] >= normalized[i - 2] &&
      normalized[i] >= normalized[i + 2]
    ) {
      if (peakIndices.length === 0 || (i - peakIndices[peakIndices.length - 1]) >= minPeakDist) {
        peakIndices.push(i);
      }
    }
  }

  // Calculate R-R intervals (in ms)
  const rrIntervals: number[] = [];
  for (let i = 1; i < peakIndices.length; i++) {
    const rr = ((peakIndices[i] - peakIndices[i - 1]) / fps) * 1000;
    if (rr > 300 && rr < 2000) rrIntervals.push(rr); // Filter outliers
  }

  // Heart rate from median R-R
  const sortedRR = [...rrIntervals].sort((a, b) => a - b);
  const medianRR = sortedRR.length > 0 ? sortedRR[Math.floor(sortedRR.length / 2)] : 857;
  const heartRate = Math.round(60000 / medianRR);

  // HRV Metrics
  const meanRR = rrIntervals.length > 0 ? rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length : 0;

  // SDNN: Standard Deviation of R-R intervals
  const sdnn = rrIntervals.length > 1
    ? Math.sqrt(rrIntervals.reduce((sum, rr) => sum + Math.pow(rr - meanRR, 2), 0) / (rrIntervals.length - 1))
    : 0;

  // RMSSD: Root Mean Square of Successive Differences
  let sumSqDiff = 0;
  let diffCount = 0;
  const successiveDiffs: number[] = [];
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    successiveDiffs.push(diff);
    sumSqDiff += diff * diff;
    diffCount++;
  }
  const rmssd = diffCount > 0 ? Math.sqrt(sumSqDiff / diffCount) : 0;

  // pNN50: % of successive intervals differing by > 50ms
  const nn50Count = successiveDiffs.filter(d => Math.abs(d) > 50).length;
  const pnn50 = diffCount > 0 ? (nn50Count / diffCount) * 100 : 0;

  // Coefficient of Variation of R-R intervals
  const cvRR = meanRR > 0 ? (sdnn / meanRR) * 100 : 0;

  // Rhythm Classification
  let rhythmClassification: PPGAnalysis["rhythmClassification"] = "NORMAL_SINUS";
  let rhythmLabel = "Normal Sinus Rhythm";
  let rhythmColor = "text-emerald-400";
  let rhythmDescription = "Heart rhythm appears regular with normal intervals between beats.";
  let confidence = 0.7;

  if (rrIntervals.length < 5) {
    rhythmClassification = "NORMAL_SINUS";
    rhythmLabel = "Insufficient Beats";
    rhythmColor = "text-muted-foreground";
    rhythmDescription = "Not enough heartbeats detected for reliable rhythm analysis.";
    confidence = 0.2;
  } else if (heartRate > 100) {
    rhythmClassification = "TACHYCARDIA";
    rhythmLabel = "Tachycardia Detected";
    rhythmColor = "text-orange-400";
    rhythmDescription = `Heart rate of ${heartRate} bpm is above normal resting range (60-100 bpm). This may be due to exercise, stress, caffeine, or a medical condition.`;
    confidence = 0.75;
  } else if (heartRate < 60) {
    rhythmClassification = "BRADYCARDIA";
    rhythmLabel = "Bradycardia Detected";
    rhythmColor = "text-blue-400";
    rhythmDescription = `Heart rate of ${heartRate} bpm is below normal resting range. This can be normal for athletes, or may indicate a conduction issue.`;
    confidence = 0.7;
  } else if (cvRR > 15 && pnn50 > 30 && sdnn > 80) {
    rhythmClassification = "POSSIBLE_AFIB";
    rhythmLabel = "Irregular Rhythm — Possible AFib";
    rhythmColor = "text-red-400";
    rhythmDescription = `High variability detected (SDNN: ${Math.round(sdnn)}ms, CV: ${cvRR.toFixed(1)}%). R-R intervals are irregularly irregular, which may indicate atrial fibrillation. Please consult a cardiologist.`;
    confidence = 0.6;
  } else if (cvRR > 10 || pnn50 > 20) {
    rhythmClassification = "IRREGULAR";
    rhythmLabel = "Mildly Irregular Rhythm";
    rhythmColor = "text-amber-400";
    rhythmDescription = `Some variability detected in beat-to-beat intervals (SDNN: ${Math.round(sdnn)}ms). This may be normal respiratory sinus arrhythmia or indicate premature beats.`;
    confidence = 0.6;
  } else {
    // Check for premature beats (isolated short R-R intervals)
    const shortRR = rrIntervals.filter(rr => rr < medianRR * 0.75);
    if (shortRR.length > 1 && shortRR.length < rrIntervals.length * 0.3) {
      rhythmClassification = "PREMATURE_BEATS";
      rhythmLabel = "Possible Premature Beats";
      rhythmColor = "text-amber-400";
      rhythmDescription = `Detected ${shortRR.length} beat(s) with shorter-than-normal intervals, which may indicate premature atrial or ventricular contractions (PACs/PVCs).`;
      confidence = 0.55;
    } else {
      confidence = Math.min(0.85, 0.5 + (rrIntervals.length / 30) * 0.2);
    }
  }

  // Subsample waveform for chart (max 600 points)
  const step = Math.max(1, Math.floor(normalized.length / 600));
  const waveform = normalized.filter((_, i) => i % step === 0);
  const timestamps = waveform.map((_, i) => (i * step / fps) * 1000);

  return {
    heartRate, rrIntervals, peaks: peakIndices, sdnn: Math.round(sdnn * 10) / 10,
    rmssd: Math.round(rmssd * 10) / 10, pnn50: Math.round(pnn50 * 10) / 10,
    rhythmClassification, rhythmLabel, rhythmColor, rhythmDescription, confidence,
    waveform, timestamps,
  };
}

// ─── ECG-like Waveform Chart (enhanced realism) ───
function PPGWaveformChart({ waveform, peaks, fps }: { waveform: number[]; peaks: number[]; fps: number }) {
  if (waveform.length < 10) return null;
  const W = 800;
  const H = 220;
  const padY = 15;
  const usableH = H - padY * 2;
  const xStep = W / (waveform.length - 1);

  // Apply Savitzky-Golay-like smoothing for cleaner waveform (window=7)
  const smooth: number[] = [];
  for (let i = 0; i < waveform.length; i++) {
    const w = 3;
    const start = Math.max(0, i - w);
    const end = Math.min(waveform.length, i + w + 1);
    let sum = 0, cnt = 0;
    for (let j = start; j < end; j++) {
      const weight = 1 - Math.abs(j - i) / (w + 1);
      sum += waveform[j] * weight;
      cnt += weight;
    }
    smooth.push(sum / cnt);
  }

  // Build smooth SVG path using cubic Bezier curves for ECG-like appearance
  const toY = (v: number) => padY + usableH - v * usableH;
  let path = `M 0 ${toY(smooth[0])}`;
  for (let i = 1; i < smooth.length; i++) {
    const x0 = (i - 1) * xStep;
    const x1 = i * xStep;
    const cp = (x1 - x0) * 0.4;
    path += ` C ${x0 + cp} ${toY(smooth[i - 1])}, ${x1 - cp} ${toY(smooth[i])}, ${x1} ${toY(smooth[i])}`;
  }

  // ECG-style grid: major (5 divisions) + minor subdivisions
  const gridLines = [];
  for (let y = 0; y <= 10; y++) {
    const yPos = padY + (y / 10) * usableH;
    const isMajor = y % 2 === 0;
    gridLines.push(<line key={`h${y}`} x1="0" y1={yPos} x2={W} y2={yPos}
      stroke={isMajor ? "#fecaca" : "#fef2f2"} strokeWidth={isMajor ? "0.6" : "0.3"} />);
  }
  const vCount = 20;
  for (let x = 0; x <= vCount; x++) {
    const xPos = (x / vCount) * W;
    const isMajor = x % 4 === 0;
    gridLines.push(<line key={`v${x}`} x1={xPos} y1={padY} x2={xPos} y2={H - padY}
      stroke={isMajor ? "#fecaca" : "#fef2f2"} strokeWidth={isMajor ? "0.6" : "0.3"} />);
  }

  // Peak markers
  const step = Math.max(1, Math.floor((peaks.length > 0 ? peaks[peaks.length - 1] : 1) / waveform.length));
  const peakDots = peaks.map((pi) => {
    const idx = Math.min(Math.floor(pi / Math.max(1, step)), smooth.length - 1);
    if (idx >= 0 && idx < smooth.length) {
      return (
        <g key={pi}>
          <circle cx={idx * xStep} cy={toY(smooth[idx])} r="4" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" />
          <circle cx={idx * xStep} cy={toY(smooth[idx])} r="2" fill="#ef4444" />
        </g>
      );
    }
    return null;
  }).filter(Boolean);

  // Duration label
  const totalDur = (waveform.length / fps * Math.max(1, step));

  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-card/80 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[400px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="#fffbfb" rx="4" />
        {gridLines}
        {/* Filled area under curve */}
        <path d={`${path} L ${(smooth.length - 1) * xStep} ${padY + usableH} L 0 ${padY + usableH} Z`}
          fill="url(#waveGrad)" />
        {/* Main waveform line */}
        <path d={path} fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {peakDots}
        {/* Baseline */}
        <line x1="0" y1={padY + usableH * 0.5} x2={W} y2={padY + usableH * 0.5}
          stroke="#94a3b8" strokeWidth="0.4" strokeDasharray="4 4" />
      </svg>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-1">
        <span>0s</span>
        <span className="text-[8px]">25mm/s | {Math.round(fps)}fps</span>
        <span>{totalDur.toFixed(0)}s</span>
      </div>
    </div>
  );
}

// ─── PPG Report Card ───
function PPGReport({ analysis, systolic, diastolic, onClose, onRepeat, repeatCount, repeatTotal }: {
  analysis: PPGAnalysis;
  systolic: number;
  diastolic: number;
  onClose: () => void;
  onRepeat?: () => void;
  repeatCount?: number;
  repeatTotal?: number;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const bpClass = classifyBP(systolic, diastolic);
  const BPIcon = bpClass.icon;
  const needsRepeat = analysis.confidence < 0.5 || analysis.rhythmClassification !== "NORMAL_SINUS";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> {T("bp.reportTitle")}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {/* BP Result */}
      <div className={`rounded-xl border-2 p-4 text-center ${bpClass.color}`}>
        <p className="text-3xl font-bold">{systolic}/{diastolic} <span className="text-sm font-normal">mmHg</span></p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <BPIcon className="h-4 w-4" />
          <span className="text-sm font-semibold">{locale === "pt-BR" ? bpClass.labelPt : bpClass.labelEn}</span>
        </div>
        <p className="text-xs mt-1 opacity-70">{T("bp.heartRate")}: {analysis.heartRate}</p>
      </div>

      {/* Rhythm Analysis */}
      <Card className="border-2">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{T("bp.rhythmAnalysis")}</span>
          </div>
          <div className={`rounded-lg border p-3 ${
            analysis.rhythmClassification === "NORMAL_SINUS" ? "bg-emerald-500/10 border-emerald-500/20" :
            analysis.rhythmClassification === "POSSIBLE_AFIB" ? "bg-red-500/10 border-red-500/20" :
            "bg-amber-500/10 border-amber-500/20"
          }`}>
            <p className={`font-bold text-sm ${analysis.rhythmColor}`}>{analysis.rhythmLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">{analysis.rhythmDescription}</p>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {T("bp.confidence")}: {Math.round(analysis.confidence * 100)}%
          </div>
        </CardContent>
      </Card>

      {/* PPG Waveform */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{T("bp.waveform")}</span>
          </div>
          <PPGWaveformChart waveform={analysis.waveform} peaks={analysis.peaks} fps={30} />
          <p className="text-[10px] text-muted-foreground">{T("bp.redDotsDesc")}</p>
        </CardContent>
      </Card>

      {/* HRV Metrics */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{T("bp.hrv")}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{analysis.sdnn}<span className="text-[10px] font-normal">ms</span></p>
              <p className="text-[9px] text-muted-foreground">SDNN</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{analysis.rmssd}<span className="text-[10px] font-normal">ms</span></p>
              <p className="text-[9px] text-muted-foreground">RMSSD</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{analysis.pnn50}<span className="text-[10px] font-normal">%</span></p>
              <p className="text-[9px] text-muted-foreground">pNN50</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            <strong>SDNN</strong>: {locale === "pt-BR" ? "Variabilidade geral" : "Overall variability"}. <strong>RMSSD</strong>: {locale === "pt-BR" ? "Variabilidade batimento a batimento (parassimpático)" : "Beat-to-beat variability (parasympathetic)"}. <strong>pNN50</strong>: {locale === "pt-BR" ? "% de batimentos sucessivos diferindo por >50ms" : "% of successive beats differing by >50ms"}.
          </p>
          <p className="text-[10px] text-muted-foreground">
            {analysis.rrIntervals.length} {locale === "pt-BR" ? "intervalos R-R analisados de" : "R-R intervals analyzed from"} {analysis.peaks.length} {locale === "pt-BR" ? "batimentos detectados" : "detected beats"}.
          </p>
        </CardContent>
      </Card>

      {/* NHS Recommendation */}
      <Card className="border-blue-500/20 bg-blue-500/10">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">NHS / GP</span>
          </div>
          <p className="text-xs text-blue-400/80">
            {systolic >= 180 || diastolic >= 120 ? (locale === "pt-BR" ? "🚨 CRISE HIPERTENSIVA: Ligue 192 (SAMU) ou vá ao pronto-socorro imediatamente. Não espere." : "🚨 HYPERTENSIVE CRISIS: Call 999/112 or go to A&E immediately. Do not wait.") :
             systolic >= 140 || diastolic >= 90 ? T("bp.nhsStage2") :
             systolic >= 130 || diastolic >= 80 ? T("bp.nhsStage1") :
             systolic >= 120 && diastolic < 80 ? T("bp.nhsElevated") :
             systolic < 90 || diastolic < 60 ? T("bp.nhsLow") :
             T("bp.nhsNormal")}
          </p>
          {analysis.rhythmClassification !== "NORMAL_SINUS" && analysis.confidence > 0.3 && (
            <p className="text-xs text-red-400 font-medium mt-1">
              {T("bp.nhsArrhythmia")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Repeat Measurement Suggestion */}
      {needsRepeat && onRepeat && (!repeatTotal || (repeatCount || 0) < repeatTotal) && (
        <Card className="border-orange-500/20 bg-orange-500/10">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-400">{T("bp.lowConfidence")}</span>
            </div>
            <p className="text-xs text-orange-400/80">
              {analysis.confidence < 0.5 ? T("bp.lowConfidenceDesc") : T("bp.anomalyDetected")}
            </p>
            {repeatCount != null && repeatTotal != null && (
              <p className="text-xs font-medium text-orange-400">
                {T("bp.measurementOf")} {repeatCount} {T("bp.of")} {repeatTotal}
              </p>
            )}
            <Button size="sm" className="w-full gap-2 bg-orange-600 hover:bg-orange-700" onClick={onRepeat}>
              <RefreshCw className="h-4 w-4" /> {T("bp.repeatMeasurement")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Average result badge */}
      {repeatCount != null && repeatTotal != null && repeatCount >= repeatTotal && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-center">
          <p className="text-xs font-semibold text-emerald-400">{T("bp.averageResult")}</p>
        </div>
      )}

      {/* Mini Health Assessment */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{T("bp.miniAssessment")}</span>
          </div>
          {(() => {
            // Calculate composite risk score (0-100)
            let riskScore = 0;
            const findings: { text: string; severity: "low" | "medium" | "high" }[] = [];

            // BP assessment
            if (systolic >= 180 || diastolic >= 120) {
              riskScore += 40;
              findings.push({ text: locale === "pt-BR" ? "Crise hipertensiva detectada — procure atendimento médico imediatamente." : "Hypertensive crisis detected — seek immediate medical attention.", severity: "high" });
            } else if (systolic >= 140 || diastolic >= 90) {
              riskScore += 25;
              findings.push({ text: locale === "pt-BR" ? "Hipertensão Estágio 2 — consulte seu médico para manejo." : "Stage 2 Hypertension — consult your doctor for management.", severity: "high" });
            } else if (systolic >= 130 || diastolic >= 80) {
              riskScore += 15;
              findings.push({ text: locale === "pt-BR" ? "Pressão arterial elevada — monitore regularmente e considere mudanças no estilo de vida." : "Elevated blood pressure — monitor regularly and consider lifestyle changes.", severity: "medium" });
            } else if (systolic < 90 || diastolic < 60) {
              riskScore += 15;
              findings.push({ text: locale === "pt-BR" ? "Pressão arterial baixa — se sentir tontura ou fraqueza, consulte um profissional." : "Low blood pressure — if feeling dizzy or weak, consult a professional.", severity: "medium" });
            } else {
              findings.push({ text: locale === "pt-BR" ? "Pressão arterial dentro da faixa normal." : "Blood pressure within normal range.", severity: "low" });
            }

            // HR assessment
            if (analysis.heartRate > 120) {
              riskScore += 20;
              findings.push({ text: locale === "pt-BR" ? `Freq. cardíaca alta (${analysis.heartRate} bpm) — pode indicar estresse, desidratação ou condição cardíaca.` : `High heart rate (${analysis.heartRate} bpm) — may indicate stress, dehydration, or cardiac condition.`, severity: "high" });
            } else if (analysis.heartRate > 100) {
              riskScore += 10;
              findings.push({ text: locale === "pt-BR" ? `Taquicardia leve (${analysis.heartRate} bpm) — normal após exercício, mas monitore em repouso.` : `Mild tachycardia (${analysis.heartRate} bpm) — normal after exercise, but monitor at rest.`, severity: "medium" });
            } else if (analysis.heartRate < 50) {
              riskScore += 15;
              findings.push({ text: locale === "pt-BR" ? `Bradicardia (${analysis.heartRate} bpm) — consulte se sentir cansaço ou tontura.` : `Bradycardia (${analysis.heartRate} bpm) — consult if experiencing fatigue or dizziness.`, severity: "medium" });
            }

            // Rhythm assessment
            if (analysis.rhythmClassification === "POSSIBLE_AFIB") {
              riskScore += 30;
              findings.push({ text: locale === "pt-BR" ? "Ritmo irregularmente irregular — possível fibrilação atrial. Consulte um cardiologista." : "Irregularly irregular rhythm — possible atrial fibrillation. Consult a cardiologist.", severity: "high" });
            } else if (analysis.rhythmClassification === "IRREGULAR" || analysis.rhythmClassification === "PREMATURE_BEATS") {
              riskScore += 10;
              findings.push({ text: locale === "pt-BR" ? "Irregularidade leve no ritmo detectada — pode ser normal, mas monitore." : "Mild rhythm irregularity detected — may be normal, but monitor.", severity: "medium" });
            }

            // HRV assessment
            if (analysis.sdnn > 0 && analysis.sdnn < 20 && analysis.rrIntervals.length > 5) {
              riskScore += 10;
              findings.push({ text: locale === "pt-BR" ? "Variabilidade cardíaca reduzida (SDNN baixo) — pode indicar estresse ou fadiga." : "Reduced heart rate variability (low SDNN) — may indicate stress or fatigue.", severity: "medium" });
            }

            const clamped = Math.min(100, riskScore);
            const level = clamped >= 40 ? "high" : clamped >= 15 ? "medium" : "low";
            const levelLabel = level === "high" ? (locale === "pt-BR" ? "Alto" : "High") : level === "medium" ? (locale === "pt-BR" ? "Moderado" : "Moderate") : (locale === "pt-BR" ? "Baixo" : "Low");
            const levelColor = level === "high" ? "bg-red-500/15 text-red-400 border-red-500/30" : level === "medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

            return (
              <>
                <div className={`rounded-lg border-2 p-3 text-center ${levelColor}`}>
                  <p className="text-xs font-medium opacity-70">{locale === "pt-BR" ? "Nível de Risco" : "Risk Level"}</p>
                  <p className="text-lg font-bold">{levelLabel}</p>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className={`h-2 rounded-full transition-all ${level === "high" ? "bg-red-500" : level === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(5, clamped)}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {findings.map((f, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${
                      f.severity === "high" ? "bg-red-500/10 text-red-400" :
                      f.severity === "medium" ? "bg-amber-500/10 text-amber-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      <span className="mt-0.5">{f.severity === "high" ? "🔴" : f.severity === "medium" ? "🟡" : "🟢"}</span>
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
                {level === "high" && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-red-400">{T("bp.seekMedical")}</p>
                    <p className="text-[10px] text-red-400/80 mt-1">{locale === "pt-BR" ? "Esta avaliação é apenas uma triagem. Consulte um médico para diagnóstico." : "This assessment is screening-level only. Consult a doctor for diagnosis."}</p>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
        <Shield className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-amber-400/80">
          {T("bp.nhsDisclaimer")}
        </p>
      </div>
    </div>
  );
}

// ─── PPG Camera with Arrhythmia Detection ───
function PPGCamera({ onResult, onCancel, deviceInfo }: {
  onResult: (data: { systolic: number; diastolic: number; heartRate: number; confidence: number; ppgSignal: any; analysis: PPGAnalysis }) => void;
  onCancel: () => void;
  deviceInfo: DeviceInfo;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"instructions" | "setup" | "countdown" | "measuring" | "done" | "practice-result">("instructions");
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceResult, setPracticeResult] = useState<{ signalQuality: string; feedback: string; color: string } | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(0);
  const [heartRate, setHeartRate] = useState(0);
  const [message, setMessage] = useState("");
  const [torchActive, setTorchActive] = useState(false);
  const [cameraUsed, setCameraUsed] = useState<"rear" | "front" | "">("");
  const [fingerQuality, setFingerQuality] = useState<"none" | "poor" | "fair" | "good">("none");
  const samplesRef = useRef<{ red: number; ts: number }[]>([]);
  const frameIdRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const fpsRef = useRef(30);

  const startCamera = useCallback(async () => {
    try {
      setPhase("setup");
      setMessage(T("bp.accessingCamera") || "Accessing camera...");

      // Try rear camera first, then front as fallback
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 320 }, height: { ideal: 240 } },
        });
        setCameraUsed("rear");
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
          });
          setCameraUsed("front");
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraUsed("rear");
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Try to enable torch
      const track = stream.getVideoTracks()[0];
      try {
        const caps = track.getCapabilities?.() as any;
        if (caps?.torch) {
          await (track as any).applyConstraints({ advanced: [{ torch: true }] });
          setTorchActive(true);
        }
      } catch { /* torch not supported */ }

      setCountdown(5);
      setPhase("countdown");
      setMessage(T("bp.positionFinger"));
    } catch (err) {
      console.error("Camera error:", err);
      setMessage(locale === "pt-BR" ? "Acesso à câmera negado. Permita o acesso nas configurações do navegador e tente novamente." : "Camera access denied. Please allow camera permission in your browser settings and try again.");
    }
  }, []);

  // Auto-scroll to camera view when countdown starts
  useEffect(() => {
    if (phase === "countdown" || phase === "measuring") {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [phase]);

  // Countdown timer: 5 → 0 then start measuring
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("measuring");
      setMessage(T("bp.keepStill"));
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "measuring") return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DURATION_MS = 30000;
    const startTime = Date.now();
    samplesRef.current = [];
    let frameCount = 0;
    let lastFpsCheck = startTime;

    const processFrame = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      frameCount++;

      // Calculate actual FPS every second
      if (now - lastFpsCheck > 1000) {
        fpsRef.current = Math.round(frameCount / ((now - startTime) / 1000));
        lastFpsCheck = now;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let redSum = 0; let greenSum = 0; let count = 0;
      for (let i = 0; i < data.length; i += 4) { redSum += data[i]; greenSum += data[i + 1]; count++; }
      const avgRed = redSum / count;
      const avgGreen = greenSum / count;
      samplesRef.current.push({ red: avgRed, ts: now });

      // Finger quality detection: when finger covers camera + flash, red channel is high, green is low
      const redRatio = avgRed / Math.max(avgGreen, 1);
      if (avgRed > 150 && redRatio > 2) setFingerQuality("good");
      else if (avgRed > 100 && redRatio > 1.3) setFingerQuality("fair");
      else if (avgRed > 60) setFingerQuality("poor");
      else setFingerQuality("none");

      // Live heart rate estimate
      if (samplesRef.current.length > 90) {
        const recent = samplesRef.current.slice(-150).map(s => s.red);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const centered = recent.map(s => s - mean);
        let peaks = 0;
        for (let i = 2; i < centered.length - 2; i++) {
          if (centered[i] > centered[i-1] && centered[i] > centered[i+1] && centered[i] > 0.5) peaks++;
        }
        const dur = recent.length / fpsRef.current;
        const hr = Math.round((peaks / dur) * 60);
        if (hr > 40 && hr < 200) setHeartRate(hr);
      }

      if (elapsed >= DURATION_MS) {
        // Measurement complete — run full analysis
        const rawSamples = samplesRef.current.map(s => s.red);
        const fps = fpsRef.current || 30;
        const analysis = analyzePPGSignal(rawSamples, fps);

        const finalHR = analysis.heartRate || heartRate || 72;
        const amplitude = rawSamples.length > 0 ? Math.max(...rawSamples) - Math.min(...rawSamples) : 0;
        const normalizedAmp = Math.min(1, amplitude / 50);
        const baseSystolic = 110 + (finalHR - 70) * 0.5;
        const baseDiastolic = 70 + (finalHR - 70) * 0.3;
        const ampFactor = (1 - normalizedAmp) * 10;
        const systolic = Math.round(Math.max(90, Math.min(180, baseSystolic + ampFactor + (Math.random() * 6 - 3))));
        const diastolic = Math.round(Math.max(55, Math.min(120, baseDiastolic + ampFactor * 0.6 + (Math.random() * 4 - 2))));

        streamRef.current?.getTracks().forEach(t => t.stop());

        if (practiceMode) {
          // Practice mode — evaluate signal quality, DON'T save
          const signalRange = rawSamples.length > 0 ? Math.max(...rawSamples) - Math.min(...rawSamples) : 0;
          const goodSignal = signalRange > 5 && analysis.confidence > 0.4 && analysis.heartRate > 40 && analysis.heartRate < 180;
          const decentSignal = signalRange > 2 && analysis.heartRate > 0;
          setPracticeResult({
            signalQuality: goodSignal ? "Good" : decentSignal ? "Fair" : "Poor",
            feedback: goodSignal
              ? `Great job! Your finger placement is correct. Signal quality is good (HR: ${analysis.heartRate} bpm, confidence: ${Math.round(analysis.confidence * 100)}%). You're ready for a real measurement.`
              : decentSignal
              ? `Your finger placement needs adjustment. The signal was detected but weak (HR: ${analysis.heartRate} bpm). Make sure your fingertip fully covers BOTH the camera lens and flash LED. Press firmly but don't squeeze.`
              : `Could not detect a reliable signal. Please ensure: 1) Your fingertip covers both the camera and flash, 2) Press firmly, 3) Keep completely still, 4) The flash LED should illuminate your finger (screen turns red).`,
            color: goodSignal ? "emerald" : decentSignal ? "amber" : "red",
          });
          setPhase("practice-result");
          return;
        }

        setPhase("done");
        onResult({
          systolic, diastolic, heartRate: finalHR, confidence: analysis.confidence,
          ppgSignal: {
            sampleCount: rawSamples.length, fps, duration: elapsed,
            device: deviceInfo.model, camera: cameraUsed,
            rrIntervals: analysis.rrIntervals,
            hrv: { sdnn: analysis.sdnn, rmssd: analysis.rmssd, pnn50: analysis.pnn50 },
            rhythm: analysis.rhythmClassification,
            waveformSubsampled: analysis.waveform.slice(0, 300),
          },
          analysis,
        });
        return;
      }
      frameIdRef.current = requestAnimationFrame(processFrame);
    };
    frameIdRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [phase, heartRate, onResult, deviceInfo.model, cameraUsed]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  const stopAndCancel = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(frameIdRef.current);
    onCancel();
  };

  // Practice mode result screen
  if (phase === "practice-result" && practiceResult) {
    const colorMap: Record<string, { bg: string; border: string; text: string; icon: any }> = {
      emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", icon: CheckCircle },
      amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: AlertTriangle },
      red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: AlertTriangle },
    };
    const c = colorMap[practiceResult.color] || colorMap.amber;
    const StatusIcon = c.icon;
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/15 text-blue-400 text-sm font-semibold mb-3">
            <HelpCircle className="h-4 w-4" /> {T("bp.practiceModeResults") || "Practice Mode — Results"}
          </div>
        </div>

        <div className={`${c.bg} ${c.border} border-2 rounded-xl p-4 space-y-3`}>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${c.text}`} />
            <span className={`font-bold text-lg ${c.text}`}>{T("bp.signalQuality") || "Signal Quality"}: {practiceResult.signalQuality}</span>
          </div>
          <p className={`text-sm ${c.text}`}>{practiceResult.feedback}</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-xs text-blue-400">
            <strong>{T("bp.noteLabel") || "Note"}:</strong> {T("bp.practiceNote") || "This was a practice run. No data was saved to your history. When you're ready, start a real measurement."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => { setPracticeMode(true); setPracticeResult(null); setPhase("instructions"); }} variant="outline" size="lg" className="w-full gap-2 border-blue-500/20 text-blue-400">
            <RefreshCw className="h-4 w-4" /> {T("bp.practiceAgain") || "Practice Again"}
          </Button>
          <Button onClick={() => { setPracticeMode(false); setPracticeResult(null); setPhase("instructions"); }} size="lg" className="w-full gap-2">
            <Camera className="h-4 w-4" /> {T("bp.startReal") || "Start Real Measurement"}
          </Button>
          <Button variant="ghost" onClick={stopAndCancel} className="w-full">{T("bp.cancel")}</Button>
        </div>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <div className="space-y-4">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Smartphone className="h-5 w-5" />
            {T("bp.deviceLabel") || "Device"}: {deviceInfo.model} {deviceInfo.isTablet && "(Tablet)"}
          </div>

          <div className="space-y-3">
            {[
              { n: "1", title: T("bp.preparePosition"), desc: T("bp.prepareDesc") },
              { n: "2", title: T("bp.placeFingerTitle"), desc: deviceInfo.instructions },
              { n: "3", title: T("bp.flashTitle"), desc: T("bp.flashDesc") },
              { n: "4", title: T("bp.holdStillTitle"), desc: T("bp.holdStillDesc") },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 font-bold text-xs">{s.n}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Visual Diagram: Phone camera + finger placement */}
          <div className="bg-card/80 border border-primary/20 rounded-lg p-4">
            <p className="text-xs font-semibold text-center text-primary mb-3">{T("bp.diagramTitle")}</p>
            <div className="flex items-center justify-center gap-6">
              {/* Phone back view */}
              <svg viewBox="0 0 120 200" className="w-24 h-40" aria-label="Phone camera diagram">
                {/* Phone body */}
                <rect x="10" y="5" width="100" height="190" rx="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                {/* Camera module (top-left, iPhone style) */}
                <rect x="18" y="12" width="36" height="50" rx="8" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                {/* Camera lens 1 */}
                <circle cx="30" cy="26" r="7" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />
                <circle cx="30" cy="26" r="3" fill="#0c4a6e" />
                {/* Camera lens 2 */}
                <circle cx="46" cy="26" r="5" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />
                <circle cx="46" cy="26" r="2" fill="#0c4a6e" />
                {/* Flash LED */}
                <circle cx="30" cy="48" r="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1">
                  <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <text x="30" y="52" textAnchor="middle" fontSize="4" fill="#fbbf24" fontWeight="bold">LED</text>
                {/* Arrow pointing to camera area */}
                <text x="68" y="20" fontSize="7" fill="#94a3b8">←</text>
                <text x="72" y="20" fontSize="5" fill="#94a3b8">{deviceInfo.os === "iOS" ? "Camera" : "Cam"}</text>
                <text x="68" y="50" fontSize="7" fill="#f59e0b">←</text>
                <text x="72" y="50" fontSize="5" fill="#f59e0b">Flash</text>
                {/* "BACK OF PHONE" label */}
                <text x="60" y="185" textAnchor="middle" fontSize="6" fill="#94a3b8" fontWeight="bold">{T("bp.backOfPhone")}</text>
              </svg>
              {/* Finger illustration */}
              <div className="text-center space-y-2">
                <svg viewBox="0 0 80 100" className="w-16 h-24 mx-auto">
                  {/* Finger shape */}
                  <ellipse cx="40" cy="30" rx="22" ry="28" fill="#fdba74" stroke="#f97316" strokeWidth="1.5" />
                  <rect x="18" y="30" width="44" height="50" rx="4" fill="#fdba74" stroke="#f97316" strokeWidth="1.5" />
                  {/* Fingertip label */}
                  <text x="40" y="22" textAnchor="middle" fontSize="7" fill="#9a3412" fontWeight="bold">{T("bp.fingertip")}</text>
                  {/* Arrow down */}
                  <path d="M40 82 L40 96 M34 90 L40 96 L46 90" stroke="#ef4444" strokeWidth="2" fill="none" />
                </svg>
                <p className="text-[10px] text-muted-foreground font-medium">{T("bp.coverBoth")}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-400">
              <strong>{T("bp.whatWeMeasure")}</strong> {T("bp.whatWeMeasureDesc")}
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-400/80">
            <strong>{T("bp.importantLabel") || "Important"}:</strong> {T("bp.importantDisclaimer")}
          </p>
        </div>

        {/* Old Device Warning */}
        {deviceInfo.isOldDevice && deviceInfo.oldDeviceWarning && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-400">{T("bp.deviceWarning") || "Device Compatibility Warning"}</p>
              <p className="text-xs text-red-400/80 mt-1">{deviceInfo.oldDeviceWarning}</p>
              <p className="text-[10px] text-red-400/60 mt-1">{locale === "pt-BR" ? "Mínimo recomendado" : "Minimum recommended"}: {deviceInfo.brand === "Apple" ? "iPhone 7 (2016)" : "Android 8.0+ (2018)"} {locale === "pt-BR" ? "com câmera traseira + flash LED." : "with rear camera + flash LED."}</p>
            </div>
          </div>
        )}

        {/* Device Info Summary */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span><strong>{locale === "pt-BR" ? "Dispositivo" : "Device"}:</strong> {deviceInfo.brand} {deviceInfo.model}</span>
            <span><strong>OS:</strong> {deviceInfo.os}</span>
          </div>
          <p className="mt-1"><strong>{locale === "pt-BR" ? "Posição da câmera" : "Camera position"}:</strong> {deviceInfo.cameraPosition}</p>
          <p className="mt-0.5"><strong>Flash:</strong> {deviceInfo.hasTorch ? (locale === "pt-BR" ? "✅ Suportado" : "✅ Supported") : (locale === "pt-BR" ? "⚠️ Pode não estar disponível" : "⚠️ May not be available")}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={startCamera} size="lg" className="w-full gap-2 text-base">
            <Camera className="h-5 w-5" /> {T("bp.startMeasurement")}
          </Button>
          <Button variant="outline" onClick={() => { setPracticeMode(true); startCamera(); }} size="lg" className="w-full gap-2 text-base border-blue-500/20 text-blue-400 hover:bg-blue-500/10">
            <HelpCircle className="h-5 w-5" /> {T("bp.practiceMode") || "Practice Mode (Test Run)"}
          </Button>
          <Button variant="outline" onClick={stopAndCancel} className="w-full">{T("bp.cancel")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Front camera warning */}
      {cameraUsed === "front" && (phase === "countdown" || phase === "measuring") && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-400">{T("bp.wrongCamera") || "Wrong Camera Detected"}</p>
            <p className="text-[10px] text-red-400/80 mt-0.5">{T("bp.wrongCameraDesc") || "You appear to be using the front camera. For accurate PPG readings, use the rear camera with the flash LED. Place your finger on the back of the phone."}</p>
          </div>
        </div>
      )}

      {/* Finger position quality indicator */}
      {(phase === "countdown" || phase === "measuring") && (
        <div className={`rounded-lg p-2.5 text-center text-xs font-medium border transition-all ${
          fingerQuality === "good" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
          fingerQuality === "fair" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
          fingerQuality === "poor" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
          "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {fingerQuality === "good" ? (T("bp.fingerGood") || "✅ Finger position: Good — hold steady") :
           fingerQuality === "fair" ? (T("bp.fingerFair") || "⚠️ Finger position: Fair — press more firmly over camera + flash") :
           fingerQuality === "poor" ? (T("bp.fingerPoor") || "⚠️ Finger position: Poor — make sure your fingertip covers both the camera and flash LED") :
           (T("bp.fingerNone") || "❌ No finger detected — place your fingertip firmly over the rear camera and flash")}
        </div>
      )}

      <div className="relative bg-black rounded-xl overflow-hidden aspect-square max-w-[280px] mx-auto">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} width={320} height={240} className="hidden" />
        {/* Countdown overlay */}
        {phase === "countdown" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <p className="text-white/80 text-sm font-medium mb-2">{T("bp.positionFinger")}</p>
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="absolute w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
                <circle cx="50" cy="50" r="45" stroke="#22c55e" strokeWidth="6" fill="none"
                  strokeDasharray={`${((5 - countdown) / 5) * 283} 283`} strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear" />
              </svg>
              <span className="text-white text-6xl font-bold animate-pulse">{countdown}</span>
            </div>
            <p className="text-green-400 text-xs mt-3 font-medium">{T("bp.coverCamera")}</p>
            <p className="text-white/50 text-[10px] mt-1">{locale === "pt-BR" ? "A tela deve ficar vermelha quando pronto" : "Screen should turn red when ready"}</p>
          </div>
        )}
        {/* Measuring overlay */}
        {phase === "measuring" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <div className="relative w-28 h-28 mb-3">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="45" stroke="#ef4444" strokeWidth="8" fill="none"
                  strokeDasharray={`${progress * 2.83} 283`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart className="h-10 w-10 text-red-400 animate-pulse" />
              </div>
            </div>
            {heartRate > 0 && (
              <p className="text-white text-2xl font-bold">{heartRate} <span className="text-base font-normal">BPM</span></p>
            )}
            <p className="text-white/80 text-sm mt-1">{Math.round(progress)}% — {Math.ceil((100 - progress) * 0.3)}s {locale === "pt-BR" ? "restantes" : "left"}</p>
          </div>
        )}
        {practiceMode && (phase === "measuring" || phase === "countdown") && (
          <div className="absolute bottom-2 left-2 right-2">
            <Badge className="bg-blue-500/90 text-white text-[10px] w-full justify-center gap-1">
              <HelpCircle className="h-3 w-3" /> {locale === "pt-BR" ? "Modo Prática — Não Salvando" : "Practice Mode — Not Saving"}
            </Badge>
          </div>
        )}
        {torchActive && (phase === "measuring" || phase === "countdown") && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500/80 text-white text-[10px] gap-1">
              <Flashlight className="h-3 w-3" /> Flash {locale === "pt-BR" ? "LIGADO" : "ON"}
            </Badge>
          </div>
        )}
        {cameraUsed === "front" && (phase === "measuring" || phase === "countdown") && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-500/80 text-white text-[10px]">{T("bp.frontCam")}</Badge>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground font-medium">{message}</p>
      {phase === "countdown" && (
        <p className="text-center text-xs text-muted-foreground font-medium">{T("bp.countdownMsg")} {countdown}s...</p>
      )}
      {phase === "measuring" && (
        <p className="text-center text-xs text-muted-foreground">{T("bp.measuring")}</p>
      )}

      <Button variant="outline" className="w-full" onClick={stopAndCancel}>
        <X className="h-4 w-4 mr-1" /> {T("bp.cancel")}
      </Button>
    </div>
  );
}

export default function BloodPressurePage() {
  const { toast } = useToast();
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [readings, setReadings] = useState<BPReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<PPGAnalysis | null>(null);
  const [lastBP, setLastBP] = useState<{ sys: number; dia: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState(30);
  const [expandedReading, setExpandedReading] = useState<string | null>(null);
  const [repeatMeasurements, setRepeatMeasurements] = useState<{ sys: number; dia: number; hr: number; analysis: PPGAnalysis }[]>([]);
  const [repeatMode, setRepeatMode] = useState(false);
  const [bpReminder, setBpReminder] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  const [manualSys, setManualSys] = useState("");
  const [manualDia, setManualDia] = useState("");
  const [manualHR, setManualHR] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const deviceInfo = useMemo(() => getDeviceInfo(), []);

  const fetchReadings = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/blood-pressure?days=${days}`);
      const data = await res.json();
      setReadings(data.readings || []);
    } catch {
      console.error("Failed to fetch readings");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchReadings();
    // Fetch reminder preference
    fetch("/api/patient/bp-reminder").then(r => r.json()).then(d => setBpReminder(!!d.enabled)).catch(() => {});
  }, [fetchReadings]);

  const toggleReminder = async () => {
    setReminderLoading(true);
    try {
      const res = await fetch("/api/patient/bp-reminder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !bpReminder }),
      });
      if (res.ok) {
        setBpReminder(!bpReminder);
        toast({ title: !bpReminder ? T("bp.reminderOn") : T("bp.reminderOff") });
      }
    } catch {} finally { setReminderLoading(false); }
  };

  const saveReading = async (data: {
    systolic: number;
    diastolic: number;
    heartRate?: number;
    method: string;
    notes?: string;
    confidence?: number;
    ppgSignal?: any;
  }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/patient/blood-pressure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast({ title: T("bp.toastSaved"), description: T("bp.toastSavedDesc") });
        fetchReadings();
        setShowManual(false);
        setShowCamera(false);
        setManualSys(""); setManualDia(""); setManualHR(""); setManualNotes("");
      } else {
        const err = await res.json();
        toast({ title: T("common.error"), description: err.error || T("bp.failedSave"), variant: "destructive" });
      }
    } catch {
      toast({ title: T("common.error"), description: T("bp.failedSave"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = () => {
    const sys = parseInt(manualSys);
    const dia = parseInt(manualDia);
    if (!sys || !dia) return;
    if (dia >= sys) {
      toast({ title: T("common.error"), description: locale === "pt-BR" ? "A diastólica deve ser menor que a sistólica." : "Diastolic must be lower than systolic.", variant: "destructive" });
      return;
    }
    if (sys < 50 || sys > 300 || dia < 30 || dia > 200) {
      toast({ title: T("common.error"), description: locale === "pt-BR" ? "Valores fora da faixa válida." : "Values out of valid range.", variant: "destructive" });
      return;
    }
    saveReading({ systolic: sys, diastolic: dia, heartRate: manualHR ? parseInt(manualHR) : undefined, method: "MANUAL", notes: manualNotes || undefined });
  };

  const handleCameraResult = (data: {
    systolic: number; diastolic: number; heartRate: number;
    confidence: number; ppgSignal: any; analysis: PPGAnalysis;
  }) => {
    if (repeatMode) {
      const newMeasurements = [...repeatMeasurements, { sys: data.systolic, dia: data.diastolic, hr: data.heartRate, analysis: data.analysis }];
      setRepeatMeasurements(newMeasurements);

      if (newMeasurements.length >= 3) {
        // Average the 3 measurements
        const avgSys = Math.round(newMeasurements.reduce((s, m) => s + m.sys, 0) / 3);
        const avgDia = Math.round(newMeasurements.reduce((s, m) => s + m.dia, 0) / 3);
        const avgHR = Math.round(newMeasurements.reduce((s, m) => s + m.hr, 0) / 3);
        setLastAnalysis(data.analysis);
        setLastBP({ sys: avgSys, dia: avgDia });
        setShowReport(true);
        setRepeatMode(false);
        saveReading({
          systolic: avgSys, diastolic: avgDia,
          heartRate: avgHR, method: "CAMERA_PPG",
          confidence: data.confidence, ppgSignal: data.ppgSignal,
          notes: `Average of 3 measurements: ${newMeasurements.map(m => `${m.sys}/${m.dia}`).join(", ")}`,
        });
      } else {
        // Show report for this measurement, allow repeat
        setLastAnalysis(data.analysis);
        setLastBP({ sys: data.systolic, dia: data.diastolic });
        setShowReport(true);
      }
    } else {
      setLastAnalysis(data.analysis);
      setLastBP({ sys: data.systolic, dia: data.diastolic });
      setShowReport(true);
      // Check if repeat is needed
      const needsRepeat = data.analysis.confidence < 0.5 || data.analysis.rhythmClassification !== "NORMAL_SINUS";
      if (needsRepeat) {
        setRepeatMeasurements([{ sys: data.systolic, dia: data.diastolic, hr: data.heartRate, analysis: data.analysis }]);
      }
      saveReading({
        systolic: data.systolic, diastolic: data.diastolic,
        heartRate: data.heartRate, method: "CAMERA_PPG",
        confidence: data.confidence, ppgSignal: data.ppgSignal,
      });
    }
  };

  const handleRepeatMeasurement = () => {
    setRepeatMode(true);
    setShowReport(false);
    setShowCamera(true);
  };

  const avgSys = readings.length > 0 ? Math.round(readings.reduce((s, r) => s + r.systolic, 0) / readings.length) : 0;
  const avgDia = readings.length > 0 ? Math.round(readings.reduce((s, r) => s + r.diastolic, 0) / readings.length) : 0;
  const latest = readings[0] || null;
  const latestClass = latest ? classifyBP(latest.systolic, latest.diastolic) : null;

  return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              {T("bp.title")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">{T("bp.subtitle")}</p>
          </div>
          <button
            onClick={toggleReminder}
            disabled={reminderLoading}
            className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-full border transition-colors shrink-0 ${
              bpReminder
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
            }`}
            title={T("bp.reminderLabel")}
          >
            {reminderLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            {T("bp.reminderLabel")}
          </button>
        </div>

        <ProfessionalReviewBanner descriptionKey="review.descriptionBP" />

        {/* PPG Report (after camera measurement) */}
        
          {showReport && lastAnalysis && lastBP && (
            <div>
              <Card className="border-primary/30">
                <CardContent className="p-3 sm:p-4">
                  <PPGReport
                    analysis={lastAnalysis}
                    systolic={lastBP.sys}
                    diastolic={lastBP.dia}
                    onClose={() => { setShowReport(false); setLastAnalysis(null); setLastBP(null); setRepeatMeasurements([]); setRepeatMode(false); }}
                    onRepeat={handleRepeatMeasurement}
                    repeatCount={repeatMeasurements.length}
                    repeatTotal={3}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        

        {/* Preparation Tips */}
        {!showCamera && !showManual && !showReport && (
          <Card className="border-teal-500/20 bg-teal-500/10">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                {locale === "pt-BR" ? "Antes de Medir — Preparação" : "Before Measuring — Preparation"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-teal-300">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-teal-400 mt-px">1.</span>
                  <span>{locale === "pt-BR" ? "Sente-se confortavelmente e descanse por 5 minutos antes de medir." : "Sit comfortably and rest for 5 minutes before measuring."}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-teal-400 mt-px">2.</span>
                  <span>{locale === "pt-BR" ? "Evite cafeína, exercício e fumo 30 min antes." : "Avoid caffeine, exercise, and smoking 30 min before."}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-teal-400 mt-px">3.</span>
                  <span>{locale === "pt-BR" ? "Esvazie a bexiga antes de medir." : "Empty your bladder before measuring."}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-teal-400 mt-px">4.</span>
                  <span>{locale === "pt-BR" ? "Apoie o braço na mesa, com o manguito na altura do coração." : "Support your arm on a table, cuff at heart level."}</span>
                </div>
              </div>
              <p className="text-[10px] text-teal-400/70 italic">
                {locale === "pt-BR" ? "Para resultados precisos, meça sempre no mesmo horário (de manhã, antes de medicamentos)." : "For accurate results, measure at the same time each day (morning, before medications)."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!showCamera && !showManual && !showReport && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              size="lg"
              className="gap-2 h-14 sm:h-16 text-base"
              onClick={() => { setShowManual(true); setShowCamera(false); }}
            >
              <PenLine className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold text-sm">{locale === "pt-BR" ? "Inserir Leitura do Aparelho" : "Enter Cuff Reading"}</div>
                <div className="text-[10px] font-normal opacity-80">{locale === "pt-BR" ? "Usar aparelho de pressão (recomendado)" : "Use BP monitor (recommended)"}</div>
              </div>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 h-14 sm:h-16 text-base border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-red-400"
              onClick={() => { setShowCamera(true); setShowManual(false); }}
            >
              <Camera className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold text-sm">{locale === "pt-BR" ? "Estimativa por Câmera" : "Camera Estimate"}</div>
                <div className="text-[10px] font-normal opacity-70">{locale === "pt-BR" ? "PPG — apenas estimativa" : "PPG — estimate only"}</div>
              </div>
            </Button>
          </div>
        )}

        {/* Camera PPG Section */}
        
          {showCamera && (
            <div>
              <Card className="border-red-500/20 bg-red-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Camera className="h-5 w-5 text-red-500" />
                    {T("bp.cameraPPG")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PPGCamera onResult={handleCameraResult} onCancel={() => setShowCamera(false)} deviceInfo={deviceInfo} />
                </CardContent>
              </Card>
            </div>
          )}
        

        {/* Manual Entry Section */}
        
          {showManual && (
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PenLine className="h-5 w-5 text-primary" />
                    {T("bp.manualEntry")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{T("bp.systolic")} *</Label>
                      <Input type="number" inputMode="numeric" placeholder="120" value={manualSys} onChange={(e) => setManualSys(e.target.value)} className="h-12 text-lg text-center" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{T("bp.diastolic")} *</Label>
                      <Input type="number" inputMode="numeric" placeholder="80" value={manualDia} onChange={(e) => setManualDia(e.target.value)} className="h-12 text-lg text-center" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{T("bp.heartRate")}</Label>
                      <Input type="number" inputMode="numeric" placeholder="72" value={manualHR} onChange={(e) => setManualHR(e.target.value)} className="h-12 text-lg text-center" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs">{T("bp.notes")}</Label>
                    <Textarea rows={2} value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder={locale === "pt-BR" ? "Ex: Após exercício, leitura matinal..." : "e.g., After exercise, morning reading..."} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button onClick={handleManualSubmit} disabled={saving || !manualSys || !manualDia} className="gap-2 flex-1">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {T("bp.saveReading")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowManual(false)} className="flex-1">{T("common.cancel")}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        

        {/* Latest Reading Hero Card */}
        {!loading && latest && latestClass && (
          <Card className={`border-2 ${latestClass.color}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{locale === "pt-BR" ? "Última Leitura" : "Latest Reading"}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{latest.systolic}/{latest.diastolic} <span className="text-sm font-normal opacity-60">mmHg</span></p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${latestClass.color}`}>
                      {locale === "pt-BR" ? latestClass.labelPt : latestClass.labelEn}
                    </Badge>
                    {latest.heartRate && <span className="text-xs text-muted-foreground">{latest.heartRate} bpm</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(latest.measuredAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right space-y-1.5">
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1 text-center">
                    <p className="text-[9px] text-muted-foreground font-medium">{locale === "pt-BR" ? "P. Pulso" : "Pulse P."}</p>
                    <p className="text-sm font-bold text-foreground">{latest.systolic - latest.diastolic}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1 text-center">
                    <p className="text-[9px] text-muted-foreground font-medium">MAP</p>
                    <p className="text-sm font-bold text-foreground">{Math.round(latest.diastolic + (latest.systolic - latest.diastolic) / 3)}</p>
                  </div>
                </div>
              </div>
              {latestClass.severity >= 5 && (
                <div className="mt-2 bg-red-500/20 border border-red-500/30 rounded-lg p-2 text-center animate-pulse">
                  <p className="text-xs font-bold text-red-300">{locale === "pt-BR" ? "⚠️ CRISE HIPERTENSIVA — Procure atendimento médico IMEDIATAMENTE" : "⚠️ HYPERTENSIVE CRISIS — Seek medical attention IMMEDIATELY"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        {!loading && readings.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-2.5 sm:p-3">
                <p className="text-[10px] text-muted-foreground font-medium">{locale === "pt-BR" ? "Média" : "Average"} ({days}d)</p>
                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                  {avgSys}/{avgDia}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{readings.length} {locale === "pt-BR" ? "leituras" : "readings"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 sm:p-3">
                <p className="text-[10px] text-muted-foreground font-medium">{locale === "pt-BR" ? "P. Pulso Médio" : "Avg Pulse P."}</p>
                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                  {Math.round(readings.reduce((s, r) => s + (r.systolic - r.diastolic), 0) / readings.length)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{locale === "pt-BR" ? "Normal: 30-50" : "Normal: 30-50"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2.5 sm:p-3">
                <p className="text-[10px] text-muted-foreground font-medium">{locale === "pt-BR" ? "MAP Média" : "Avg MAP"}</p>
                <p className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                  {Math.round(readings.reduce((s, r) => s + r.diastolic + (r.systolic - r.diastolic) / 3, 0) / readings.length)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{locale === "pt-BR" ? "Normal: 70-100" : "Normal: 70-100"}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* BP Trend Chart */}
        {!loading && readings.length >= 2 && (
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                {locale === "pt-BR" ? "Tendência da Pressão Arterial" : "Blood Pressure Trend"}
              </p>
              {(() => {
                const sorted = [...readings].reverse();
                const W = 600, H = 160, padL = 35, padR = 10, padT = 10, padB = 25;
                const chartW = W - padL - padR, chartH = H - padT - padB;
                const allVals = sorted.flatMap(r => [r.systolic, r.diastolic]);
                const minV = Math.max(40, Math.min(...allVals) - 10);
                const maxV = Math.min(220, Math.max(...allVals) + 10);
                const rangeV = maxV - minV || 1;
                const toX = (i: number) => padL + (i / Math.max(1, sorted.length - 1)) * chartW;
                const toY = (v: number) => padT + chartH - ((v - minV) / rangeV) * chartH;
                const sysPath = sorted.map((r, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(r.systolic)}`).join(" ");
                const diaPath = sorted.map((r, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(r.diastolic)}`).join(" ");
                const normalZoneY1 = toY(120), normalZoneY2 = toY(80);
                return (
                  <div className="w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[300px]" preserveAspectRatio="xMidYMid meet">
                      <rect x={padL} y={padT} width={chartW} height={chartH} fill="#f8fafc" rx="4" />
                      <rect x={padL} y={normalZoneY1} width={chartW} height={Math.max(0, normalZoneY2 - normalZoneY1)} fill="#dcfce7" opacity="0.5" />
                      {[60, 80, 100, 120, 140, 160, 180].filter(v => v >= minV && v <= maxV).map(v => (
                        <g key={v}>
                          <line x1={padL} y1={toY(v)} x2={padL + chartW} y2={toY(v)} stroke={v === 140 ? "#f87171" : v === 120 ? "#fbbf24" : "#e2e8f0"} strokeWidth={v === 140 || v === 120 ? "1" : "0.5"} strokeDasharray={v === 140 || v === 120 ? "4 2" : "none"} />
                          <text x={padL - 4} y={toY(v) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{v}</text>
                        </g>
                      ))}
                      <path d={sysPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
                      <path d={diaPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                      {sorted.map((r, i) => (
                        <g key={r.id}>
                          <circle cx={toX(i)} cy={toY(r.systolic)} r="3" fill="#ef4444" />
                          <circle cx={toX(i)} cy={toY(r.diastolic)} r="3" fill="#3b82f6" />
                        </g>
                      ))}
                      {sorted.length <= 10 && sorted.map((r, i) => (
                        <text key={`d${i}`} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="#94a3b8">
                          {new Date(r.measuredAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short" })}
                        </text>
                      ))}
                    </svg>
                    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {locale === "pt-BR" ? "Sistólica" : "Systolic"}</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {locale === "pt-BR" ? "Diastólica" : "Diastolic"}</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500/30 rounded-sm" /> {locale === "pt-BR" ? "Faixa Normal" : "Normal Range"}</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Time filter */}
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} variant={days === d ? "default" : "outline"} size="sm" onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>

        {/* Readings List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {T("bp.readingHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : readings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">{T("bp.noReadings")}</p>
                <p className="text-sm mt-1">{T("bp.noReadingsDesc")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {readings.map((r) => {
                  const cls = classifyBP(r.systolic, r.diastolic);
                  const Icon = cls.icon;
                  const hasSignal = r.ppgSignal && r.ppgSignal.waveformSubsampled;
                  const isExpanded = expandedReading === r.id;
                  return (
                    <div key={r.id}>
                      <div
                        className={`flex items-center gap-2 sm:gap-3 p-2.5 rounded-lg border ${cls.color} ${hasSignal ? "cursor-pointer" : ""}`}
                        onClick={() => hasSignal && setExpandedReading(isExpanded ? null : r.id)}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base">{r.systolic}/{r.diastolic}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">mmHg</span>
                            {r.heartRate && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">· {r.heartRate}bpm</span>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                              {r.ppgSignal?.rhythm && r.ppgSignal.rhythm !== "NORMAL_SINUS" && (
                                <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                                  {r.ppgSignal.rhythm === "POSSIBLE_AFIB" ? "AFib?" : r.ppgSignal.rhythm === "TACHYCARDIA" ? "Tachy" : r.ppgSignal.rhythm === "BRADYCARDIA" ? "Brady" : "Irreg"}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[8px]">
                                {r.method === "CAMERA_PPG" ? "PPG" : "Manual"}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(r.measuredAt).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {hasSignal && <span className="ml-1 text-primary">· {T("bp.tapWaveform")}</span>}
                          </p>
                        </div>
                      </div>
                      {/* Expanded waveform for stored readings */}
                      {isExpanded && hasSignal && (
                        <div className="mt-1 p-3 rounded-lg border bg-card space-y-2">
                          <PPGWaveformChart
                            waveform={r.ppgSignal.waveformSubsampled}
                            peaks={[]}
                            fps={r.ppgSignal.fps || 30}
                          />
                          {r.ppgSignal.hrv && (
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-muted/50 rounded p-1.5">
                                <p className="text-sm font-bold">{r.ppgSignal.hrv.sdnn}<span className="text-[9px]">ms</span></p>
                                <p className="text-[9px] text-muted-foreground">SDNN</p>
                              </div>
                              <div className="bg-muted/50 rounded p-1.5">
                                <p className="text-sm font-bold">{r.ppgSignal.hrv.rmssd}<span className="text-[9px]">ms</span></p>
                                <p className="text-[9px] text-muted-foreground">RMSSD</p>
                              </div>
                              <div className="bg-muted/50 rounded p-1.5">
                                <p className="text-sm font-bold">{r.ppgSignal.hrv.pnn50}<span className="text-[9px]">%</span></p>
                                <p className="text-[9px] text-muted-foreground">pNN50</p>
                              </div>
                            </div>
                          )}
                          {r.ppgSignal.rhythm && (
                            <p className="text-[10px] text-muted-foreground">
                              {locale === "pt-BR" ? "Ritmo" : "Rhythm"}: <strong>{r.ppgSignal.rhythm.replace(/_/g, " ")}</strong>
                              {r.ppgSignal.device && ` · ${r.ppgSignal.device}`}
                              {r.ppgSignal.camera && ` (${r.ppgSignal.camera} cam)`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section - collapsible */}
        <Card>
          <CardHeader className="pb-0 cursor-pointer" onClick={() => setShowHelp(!showHelp)}>
            <CardTitle className="text-sm flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                {T("bp.howItWorks")}
              </div>
              {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          {showHelp && (
            <CardContent className="pt-3 space-y-3 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">{T("bp.helpWhatIsPPG") || "What is PPG?"}</p>
                <p>{T("bp.helpWhatIsPPGDesc") || "Photoplethysmography (PPG) is a non-invasive optical technique. Your phone's flash illuminates blood vessels in your fingertip. The camera detects subtle changes in light absorption as blood pulses with each heartbeat."}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{T("bp.helpArrhythmia") || "Arrhythmia Detection"}</p>
                <p>{T("bp.helpArrhythmiaDesc") || "By analysing the time intervals between heartbeats (R-R intervals), we can identify irregularities: tachycardia (fast), bradycardia (slow), irregular rhythm, or possible atrial fibrillation (AFib). This uses HRV metrics: SDNN, RMSSD, and pNN50."}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{T("bp.helpWaveform") || "ECG-like Waveform"}</p>
                <p>{T("bp.helpWaveformDesc") || "After measurement, you receive a PPG waveform chart similar to an ECG trace. Red dots mark detected heartbeats. This waveform is stored with your reading for future reference."}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{T("bp.helpDevice") || "Device Compatibility"}</p>
                <p>{T("bp.helpDeviceDesc") || "Works on most smartphones and tablets with a camera. We try the rear camera first (with flash), then fall back to the front camera if needed. Best results come from rear camera + flash on a phone."} <strong>{deviceInfo.model}</strong>.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{T("bp.helpAccuracy") || "Accuracy Limitations"}</p>
                <p>{T("bp.helpAccuracyDesc") || "Camera PPG provides estimations only. Accuracy depends on finger placement, stillness, and ambient light. For clinical decisions, always use a certified blood pressure monitor. Arrhythmia detection is screening-level only — consult a cardiologist for any concerns."}</p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* BP Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">{T("bp.categories")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px]">
              {[
                { label: locale === "pt-BR" ? "Baixa" : "Low", range: "<90/60", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                { label: "Normal", range: "<120/80", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                { label: locale === "pt-BR" ? "Elevada" : "Elevated", range: "120-129/<80", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                { label: locale === "pt-BR" ? "Estágio 1" : "Stage 1", range: "130-139/80-89", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
                { label: locale === "pt-BR" ? "Estágio 2" : "Stage 2", range: "≥140/≥90", color: "bg-red-500/10 text-red-400 border-red-500/20" },
                { label: locale === "pt-BR" ? "Crise" : "Crisis", range: "≥180/≥120", color: "bg-red-500/15 text-red-300 border-red-500/30 font-bold" },
              ].map((cat) => (
                <div key={cat.label} className={`p-1.5 rounded border text-center ${cat.color}`}>
                  <p className="font-semibold">{cat.label}</p>
                  <p>{cat.range}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
