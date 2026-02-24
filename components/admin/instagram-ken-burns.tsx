"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Square, Download, Loader2, Film, Settings2, ChevronDown, ChevronUp } from "lucide-react";

interface TextOverlay {
  text: string;
  font: string;
  size: number;
  color: string;
  x: number;
  y: number;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  align: "left" | "center" | "right";
}

interface KenBurnsEffect {
  startScale: number;   // e.g. 1.0
  endScale: number;     // e.g. 1.3
  startX: number;       // 0-1 (center of zoom start, relative)
  startY: number;
  endX: number;
  endY: number;
  duration: number;     // seconds
  fps: number;
}

interface Props {
  imageUrl: string;
  overlay: TextOverlay;
  logoUrl?: string;
  onVideoReady?: (blobUrl: string) => void;
}

const PRESETS: { label: string; effect: KenBurnsEffect }[] = [
  {
    label: "Zoom In — Centre",
    effect: { startScale: 1.0, endScale: 1.3, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5, duration: 6, fps: 30 },
  },
  {
    label: "Zoom In — Top Left",
    effect: { startScale: 1.0, endScale: 1.35, startX: 0.3, startY: 0.3, endX: 0.5, endY: 0.5, duration: 6, fps: 30 },
  },
  {
    label: "Zoom Out — Centre",
    effect: { startScale: 1.35, endScale: 1.0, startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5, duration: 6, fps: 30 },
  },
  {
    label: "Pan Left → Right",
    effect: { startScale: 1.2, endScale: 1.2, startX: 0.3, startY: 0.5, endX: 0.7, endY: 0.5, duration: 6, fps: 30 },
  },
  {
    label: "Pan Right → Left",
    effect: { startScale: 1.2, endScale: 1.2, startX: 0.7, startY: 0.5, endX: 0.3, endY: 0.5, duration: 6, fps: 30 },
  },
  {
    label: "Diagonal Drift",
    effect: { startScale: 1.1, endScale: 1.3, startX: 0.3, startY: 0.3, endX: 0.65, endY: 0.65, duration: 7, fps: 30 },
  },
];

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function InstagramKenBurns({ imageUrl, overlay, logoUrl, onVideoReady }: Props) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [effect, setEffect] = useState<KenBurnsEffect>(PRESETS[0].effect);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.onerror = () => setImgLoaded(false);
    img.src = imageUrl;
  }, [imageUrl]);

  // Load logo
  useEffect(() => {
    const src = logoUrl || "/logo.png";
    const logo = new window.Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => { logoRef.current = logo; };
    logo.src = src;
  }, [logoUrl]);

  const drawFrame = useCallback((canvas: HTMLCanvasElement, progress: number) => {
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    if (!ctx || !img) return;

    const W = canvas.width;
    const H = canvas.height;
    const t = easeInOut(Math.min(Math.max(progress, 0), 1));

    // Interpolate scale and focal point
    const scale = effect.startScale + (effect.endScale - effect.startScale) * t;
    const focalX = effect.startX + (effect.endX - effect.startX) * t;
    const focalY = effect.startY + (effect.endY - effect.startY) * t;

    // Calculate source rect in image coordinates
    const srcW = img.width / scale;
    const srcH = img.height / scale;
    const srcX = focalX * img.width - srcW / 2;
    const srcY = focalY * img.height - srcH / 2;

    // Clamp to image bounds
    const clampedSrcX = Math.max(0, Math.min(srcX, img.width - srcW));
    const clampedSrcY = Math.max(0, Math.min(srcY, img.height - srcH));

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, clampedSrcX, clampedSrcY, srcW, srcH, 0, 0, W, H);

    // Logo watermark
    const logo = logoRef.current;
    if (logo && logo.width > 0) {
      const lw = Math.round(W * 0.15);
      const lh = Math.round((logo.height / logo.width) * lw);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(logo, W - lw - 16, H - lh - 16, lw, lh);
      ctx.globalAlpha = 1;
    }

    // Text overlay
    if (overlay.text) {
      const fontStyle = `${overlay.italic ? "italic " : ""}${overlay.bold ? "bold " : ""}${overlay.size}px ${overlay.font}`;
      ctx.font = fontStyle;
      ctx.textAlign = overlay.align;
      ctx.fillStyle = overlay.color;
      if (overlay.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      const xPx = (overlay.x / 100) * W;
      let yPx = (overlay.y / 100) * H;
      const words = overlay.text.split(" ");
      let line = "";
      const lineH = overlay.size * 1.3;
      for (let n = 0; n < words.length; n++) {
        const test = line + words[n] + " ";
        if (ctx.measureText(test).width > W * 0.85 && n > 0) {
          ctx.fillText(line.trim(), xPx, yPx);
          line = words[n] + " ";
          yPx += lineH;
        } else {
          line = test;
        }
      }
      ctx.fillText(line.trim(), xPx, yPx);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
  }, [effect, overlay]);

  // Preview animation loop
  const startPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !imgLoaded) return;
    setIsPlaying(true);
    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const progress = elapsed / effect.duration;

      if (progress >= 1) {
        // Loop
        startTimeRef.current = now;
        drawFrame(canvas, 0);
      } else {
        drawFrame(canvas, progress);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [imgLoaded, effect, drawFrame]);

  const stopPreview = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
  }, []);

  // Export MP4 via MediaRecorder
  const exportVideo = useCallback(async () => {
    const canvas = recordCanvasRef.current;
    if (!canvas || !imgLoaded) return;

    setIsRecording(true);
    setRecordProgress(0);
    setVideoUrl("");
    chunksRef.current = [];

    // Draw first frame
    drawFrame(canvas, 0);

    // Get stream from canvas
    const stream = canvas.captureStream(effect.fps);

    // Pick best supported codec
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsRecording(false);
      setRecordProgress(100);
      if (onVideoReady) onVideoReady(url);
    };

    recorder.start(100); // collect data every 100ms

    // Render frames manually at target fps
    const totalFrames = Math.ceil(effect.duration * effect.fps);
    const frameDuration = 1000 / effect.fps;

    for (let f = 0; f <= totalFrames; f++) {
      const progress = f / totalFrames;
      drawFrame(canvas, progress);
      setRecordProgress(Math.round((f / totalFrames) * 100));
      await new Promise<void>(resolve => setTimeout(resolve, frameDuration));
    }

    recorder.stop();
  }, [imgLoaded, effect, drawFrame, onVideoReady]);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `instagram-reel.webm`;
    a.click();
  };

  // Init preview canvas on mount
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas && imgLoaded) {
      drawFrame(canvas, 0);
    }
  }, [imgLoaded, drawFrame]);

  // Update preset
  const applyPreset = (idx: number) => {
    setSelectedPreset(idx);
    setEffect(PRESETS[idx].effect);
    if (isPlaying) {
      stopPreview();
      setTimeout(startPreview, 50);
    }
  };

  if (!imageUrl) {
    return (
      <div className="border rounded-xl p-6 text-center text-sm text-muted-foreground bg-muted/20">
        <Film className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>Select or generate an image first to create a Ken Burns animation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview canvas */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-square w-full max-w-xs mx-auto shadow-lg">
        <canvas
          ref={previewCanvasRef}
          width={540}
          height={540}
          className="w-full h-full object-cover"
        />
        {/* Hidden high-res canvas for recording */}
        <canvas
          ref={recordCanvasRef}
          width={1080}
          height={1080}
          className="hidden"
        />
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        {isRecording && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
            <p className="text-white text-sm font-semibold">Rendering… {recordProgress}%</p>
            <div className="w-40 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-200 rounded-full" style={{ width: `${recordProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Preset selector */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Animation Preset</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`text-xs px-2.5 py-2 rounded-lg border font-medium transition-all text-left ${
                selectedPreset === i
                  ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]"
                  : "border-gray-200 text-muted-foreground hover:border-gray-300 hover:bg-muted/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced controls */}
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Advanced Settings</span>
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showAdvanced && (
          <div className="p-3 space-y-3 border-t bg-muted/10">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration (s)</label>
                <input
                  type="range" min="3" max="15" step="1"
                  value={effect.duration}
                  onChange={e => setEffect(ef => ({ ...ef, duration: parseInt(e.target.value) }))}
                  className="w-full mt-1"
                />
                <span className="text-[10px] text-muted-foreground">{effect.duration}s</span>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">FPS</label>
                <select
                  value={effect.fps}
                  onChange={e => setEffect(ef => ({ ...ef, fps: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-2 py-1 text-xs border rounded-lg bg-background"
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Start Zoom: {effect.startScale.toFixed(2)}×</label>
                <input type="range" min="1.0" max="2.0" step="0.05" value={effect.startScale}
                  onChange={e => setEffect(ef => ({ ...ef, startScale: parseFloat(e.target.value) }))}
                  className="w-full mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">End Zoom: {effect.endScale.toFixed(2)}×</label>
                <input type="range" min="1.0" max="2.0" step="0.05" value={effect.endScale}
                  onChange={e => setEffect(ef => ({ ...ef, endScale: parseFloat(e.target.value) }))}
                  className="w-full mt-1" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {!isPlaying ? (
          <button
            onClick={startPreview}
            disabled={!imgLoaded}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 text-green-600" /> Preview
          </button>
        ) : (
          <button
            onClick={stopPreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Square className="h-3.5 w-3.5 text-red-500" /> Stop
          </button>
        )}

        {!isRecording ? (
          <button
            onClick={exportVideo}
            disabled={!imgLoaded || isRecording}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-medium disabled:opacity-50 transition-colors"
          >
            <Film className="h-3.5 w-3.5" /> Export Video
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-700 bg-red-100 text-xs font-medium transition-colors"
          >
            <Square className="h-3.5 w-3.5" /> Cancel
          </button>
        )}

        {videoUrl && (
          <button
            onClick={downloadVideo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        )}
      </div>

      {/* Video preview after export */}
      {videoUrl && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5" /> Video ready!
          </p>
          <video
            src={videoUrl}
            controls
            loop
            className="w-full rounded-xl border shadow-sm"
            style={{ maxHeight: "280px" }}
          />
          <p className="text-[10px] text-muted-foreground">
            Download the .webm file and convert to MP4 if needed (e.g. via <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noopener noreferrer" className="underline text-[#5dc9c0]">CloudConvert</a>), or upload directly to Instagram Reels.
          </p>
        </div>
      )}
    </div>
  );
}
