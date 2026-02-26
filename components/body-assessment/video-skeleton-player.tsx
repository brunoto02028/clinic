"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Eye,
  EyeOff,
  Video,
  Maximize2,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { POSE_CONNECTIONS } from "@/hooks/use-pose-detection";

// ========== Types ==========

interface VideoData {
  videoUrl: string;
  testType: string;
  label: string;
  duration?: number;
}

interface VideoSkeletonPlayerProps {
  videos: VideoData[];
  title?: string;
}

// ========== Constants ==========

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2];

const TEST_TYPE_INFO: Record<string, { emoji: string; color: string }> = {
  squat: { emoji: "🏋️", color: "#06B6D4" },
  gait: { emoji: "🚶", color: "#10B981" },
  overhead_squat: { emoji: "🙆", color: "#8B5CF6" },
  single_leg_l: { emoji: "🦩", color: "#F59E0B" },
  single_leg_r: { emoji: "🦩", color: "#F59E0B" },
  lunge: { emoji: "🦵", color: "#EC4899" },
  hip_hinge: { emoji: "🔄", color: "#3B82F6" },
};

// ========== Component ==========

export function VideoSkeletonPlayer({ videos, title }: VideoSkeletonPlayerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const poseLandmarkerRef = useRef<any>(null);
  const isDetectingRef = useRef(false);

  const currentVideo = videos[selectedIndex];

  // Initialize MediaPipe pose detection for video
  const initPoseForVideo = useCallback(async () => {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { PoseLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      poseLandmarkerRef.current = poseLandmarker;
    } catch (err) {
      console.error("Failed to init pose detection for video:", err);
    }
  }, []);

  useEffect(() => {
    if (showSkeleton) {
      initPoseForVideo();
    }
    return () => {
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, [showSkeleton, initPoseForVideo]);

  // Draw skeleton on canvas
  const drawSkeletonFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !poseLandmarkerRef.current || !showSkeleton) return;
    if (video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const result = poseLandmarkerRef.current.detectForVideo(video, performance.now());
      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        const w = video.videoWidth;
        const h = video.videoHeight;

        // Draw connections
        ctx.strokeStyle = "#00FF88";
        ctx.lineWidth = Math.max(2, w * 0.004);
        ctx.globalAlpha = 0.75;
        for (const [s, e] of POSE_CONNECTIONS) {
          const start = landmarks[s];
          const end = landmarks[e];
          if (start && end && (start.visibility ?? 1) > 0.4 && (end.visibility ?? 1) > 0.4) {
            ctx.beginPath();
            ctx.moveTo(start.x * w, start.y * h);
            ctx.lineTo(end.x * w, end.y * h);
            ctx.stroke();
          }
        }

        // Draw points
        ctx.globalAlpha = 1;
        for (const lm of landmarks) {
          if ((lm.visibility ?? 1) < 0.4) continue;
          const x = lm.x * w;
          const y = lm.y * h;
          const r = Math.max(3, w * 0.005);

          ctx.fillStyle = (lm.visibility ?? 1) > 0.7 ? "#00FF88" : "#FFD700";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    } catch {
      // Silently handle detection errors
    }
  }, [showSkeleton]);

  // Animation loop for skeleton overlay during playback
  const startSkeletonLoop = useCallback(() => {
    isDetectingRef.current = true;
    const loop = () => {
      if (!isDetectingRef.current) return;
      drawSkeletonFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [drawSkeletonFrame]);

  const stopSkeletonLoop = useCallback(() => {
    isDetectingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  // Video events
  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      stopSkeletonLoop();
    } else {
      video.play();
      if (showSkeleton) startSkeletonLoop();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      // Draw skeleton on current frame when paused
      if (!isPlaying && showSkeleton) {
        setTimeout(() => drawSkeletonFrame(), 100);
      }
    }
  };

  const handleSpeedChange = () => {
    const currentIdx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIdx = (currentIdx + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIdx];
    setPlaybackSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const stepFrame = (direction: 1 | -1) => {
    if (videoRef.current) {
      videoRef.current.currentTime += direction * (1 / 30);
      setCurrentTime(videoRef.current.currentTime);
      if (showSkeleton) {
        setTimeout(() => drawSkeletonFrame(), 100);
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    stopSkeletonLoop();
  };

  // Reset when video changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    stopSkeletonLoop();
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [selectedIndex, stopSkeletonLoop, playbackSpeed]);

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 10);
    return `${mins}:${String(secs).padStart(2, "0")}.${ms}`;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Video className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No movement videos recorded.</p>
        </CardContent>
      </Card>
    );
  }

  const info = currentVideo ? TEST_TYPE_INFO[currentVideo.testType] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            {title || "Movement Analysis"}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground">
            {videos.length} videos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Video selector */}
        {videos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {videos.map((v, i) => {
              const vInfo = TEST_TYPE_INFO[v.testType];
              return (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap flex-shrink-0 ${
                    i === selectedIndex
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{vInfo?.emoji || "📹"}</span>
                  {v.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Video player */}
        <div ref={containerRef} className="relative rounded-xl overflow-hidden bg-black/60 border border-white/5">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              src={currentVideo?.videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleVideoEnd}
              playsInline
              preload="metadata"
            />
            {/* Skeleton canvas overlay */}
            {showSkeleton && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}

            {/* Speed badge */}
            {playbackSpeed !== 1 && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-black/60 text-white border-white/20 text-xs">
                  {playbackSpeed}x
                </Badge>
              </div>
            )}

            {/* Test type badge */}
            {currentVideo && (
              <div className="absolute top-3 right-3">
                <Badge
                  className="text-xs border"
                  style={{
                    background: `${info?.color || "#64748B"}20`,
                    borderColor: `${info?.color || "#64748B"}40`,
                    color: info?.color || "#64748B",
                  }}
                >
                  {info?.emoji} {currentVideo.label}
                </Badge>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="bg-[#0F172A]/90 backdrop-blur px-3 py-2 space-y-2">
            {/* Seek bar */}
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={0.01}
              onValueChange={handleSeek}
              className="w-full"
            />

            <div className="flex items-center justify-between gap-2">
              {/* Left controls */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/60 hover:text-white" onClick={() => stepFrame(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:text-cyan-400" onClick={handlePlay}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/60 hover:text-white" onClick={() => stepFrame(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Time display */}
              <span className="text-[10px] text-white/40 font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Right controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSpeedChange}
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white/60 hover:text-white bg-white/5 border border-white/10 transition-all"
                >
                  {playbackSpeed}x
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 transition-all ${showSkeleton ? "text-emerald-400" : "text-white/30"}`}
                  onClick={() => setShowSkeleton(!showSkeleton)}
                >
                  {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40 hover:text-white" onClick={toggleFullscreen}>
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Frame-by-frame hint */}
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Use ◀ ▶ for frame-by-frame analysis • Click speed button to change playback rate
        </p>
      </CardContent>
    </Card>
  );
}

export default VideoSkeletonPlayer;
