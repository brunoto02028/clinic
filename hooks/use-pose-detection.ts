"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// MediaPipe BlazePose landmark names (33 landmarks)
export const POSE_LANDMARKS = [
  "nose", "left_eye_inner", "left_eye", "left_eye_outer",
  "right_eye_inner", "right_eye", "right_eye_outer",
  "left_ear", "right_ear",
  "mouth_left", "mouth_right",
  "left_shoulder", "right_shoulder",
  "left_elbow", "right_elbow",
  "left_wrist", "right_wrist",
  "left_pinky", "right_pinky",
  "left_index", "right_index",
  "left_thumb", "right_thumb",
  "left_hip", "right_hip",
  "left_knee", "right_knee",
  "left_ankle", "right_ankle",
  "left_heel", "right_heel",
  "left_foot_index", "right_foot_index",
];

// Skeleton connections for drawing
export const POSE_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
  [27, 29], [29, 31], // left foot
  [28, 30], [30, 32], // right foot
  [15, 17], [15, 19], [15, 21], // left hand
  [16, 18], [16, 20], [16, 22], // right hand
];

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
  name: string;
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[];
  timestamp: number;
  confidence: number;
}

interface UsePoseDetectionOptions {
  onResult?: (result: PoseDetectionResult) => void;
  minConfidence?: number;
}

export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const { onResult, minConfidence = 0.5 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const poseLandmarkerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<PoseLandmark[] | null>(null);
  const isRunningRef = useRef(false);

  const initPoseDetection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { PoseLandmarker, FilesetResolver, DrawingUtils } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: minConfidence,
        minPosePresenceConfidence: minConfidence,
        minTrackingConfidence: minConfidence,
      });

      poseLandmarkerRef.current = poseLandmarker;
      setIsReady(true);
      setIsLoading(false);

      return { poseLandmarker, DrawingUtils };
    } catch (err: any) {
      console.error("Failed to init pose detection:", err);
      setError(err.message || "Failed to initialize pose detection");
      setIsLoading(false);
      return null;
    }
  }, [minConfidence]);

  const drawLandmarks = useCallback(
    (landmarks: PoseLandmark[], canvas: HTMLCanvasElement, videoWidth: number, videoHeight: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections (skeleton lines)
      ctx.strokeStyle = "#00FF88";
      ctx.lineWidth = 3;
      for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end && start.visibility > minConfidence && end.visibility > minConfidence) {
          ctx.beginPath();
          ctx.moveTo(start.x * videoWidth, start.y * videoHeight);
          ctx.lineTo(end.x * videoWidth, end.y * videoHeight);
          ctx.stroke();
        }
      }

      // Draw landmarks (points)
      for (const lm of landmarks) {
        if (lm.visibility < minConfidence) continue;
        const x = lm.x * videoWidth;
        const y = lm.y * videoHeight;
        const radius = lm.visibility > 0.8 ? 6 : 4;

        // Color based on confidence
        ctx.fillStyle =
          lm.visibility > 0.8 ? "#00FF88" : lm.visibility > 0.5 ? "#FFD700" : "#FF4444";

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // White border
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    [minConfidence]
  );

  const detectPose = useCallback(
    (video: HTMLVideoElement): PoseDetectionResult | null => {
      if (!poseLandmarkerRef.current || !video.videoWidth) return null;

      try {
        const result = poseLandmarkerRef.current.detectForVideo(video, performance.now());
        if (result.landmarks && result.landmarks.length > 0) {
          const rawLandmarks = result.landmarks[0];
          const landmarks: PoseLandmark[] = rawLandmarks.map((lm: any, i: number) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility ?? 1,
            name: POSE_LANDMARKS[i] || `landmark_${i}`,
          }));

          const avgConfidence =
            landmarks.reduce((sum, lm) => sum + lm.visibility, 0) / landmarks.length;

          const detectionResult: PoseDetectionResult = {
            landmarks,
            timestamp: Date.now(),
            confidence: avgConfidence,
          };

          setCurrentLandmarks(landmarks);
          onResult?.(detectionResult);

          return detectionResult;
        }
      } catch (err) {
        // Silently handle detection errors (common during initialization)
      }
      return null;
    },
    [onResult]
  );

  const startDetection = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
      videoRef.current = video;
      canvasRef.current = canvas;
      isRunningRef.current = true;

      const loop = () => {
        if (!isRunningRef.current) return;
        if (video.readyState >= 2) {
          const result = detectPose(video);
          if (result) {
            drawLandmarks(result.landmarks, canvas, video.videoWidth, video.videoHeight);
          }
        }
        animFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    },
    [detectPose, drawLandmarks]
  );

  const stopDetection = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  const captureFrame = useCallback((): {
    imageData: string;
    landmarks: PoseLandmark[];
  } | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    // Capture the raw video frame
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const imageData = captureCanvas.toDataURL("image/jpeg", 0.9);

    return {
      imageData,
      landmarks: currentLandmarks || [],
    };
  }, [currentLandmarks]);

  const cleanup = useCallback(() => {
    stopDetection();
    if (poseLandmarkerRef.current) {
      poseLandmarkerRef.current.close();
      poseLandmarkerRef.current = null;
    }
    setIsReady(false);
  }, [stopDetection]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    initPoseDetection,
    startDetection,
    stopDetection,
    detectPose,
    captureFrame,
    drawLandmarks,
    cleanup,
    isLoading,
    isReady,
    error,
    currentLandmarks,
  };
}
