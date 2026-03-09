"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo, Component } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  RotateCcw,
  Camera,
  ChevronRight,
  Loader2,
  Info,
  X,
  AlertTriangle,
  Activity,
  FileText,
  ClipboardList,
  Flame,
  Snowflake,
  ArrowRight,
} from "lucide-react";
import { STATUS_COLORS } from "./anatomy-mapping";
import {
  getSegmentIntegration,
  getAllSegmentsSorted,
  getAssessmentSummary,
  type SegmentIntegration,
} from "./integration-utils";

// ========== Error Boundary ==========
class Viewer3DErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <p className="text-sm">3D viewer failed to load</p>
            <p className="text-xs opacity-60">{this.state.error?.message}</p>
            <button
              className="text-xs text-primary underline mt-2"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// ========== Types ==========

interface SegmentScore {
  score: number;
  status: "good" | "fair" | "poor";
  keyIssue: string;
}

interface SegmentScoresData {
  head?: SegmentScore;
  shoulders?: SegmentScore;
  spine?: SegmentScore;
  hips?: SegmentScore;
  knees?: SegmentScore;
  ankles?: SegmentScore;
}

interface Finding {
  area: string;
  finding: string;
  severity: "mild" | "moderate" | "severe";
  recommendation: string;
}

interface BodyViewer3DProps {
  segmentScores?: SegmentScoresData | null;
  aiFindings?: Finding[] | null;
  locale?: string;
  modelUid?: string;
  patientGender?: "male" | "female" | null;
  muscleHypotheses?: any[] | null;
  postureAnalysis?: any | null;
  assessmentId?: string | null;
  patientName?: string | null;
  assessmentDate?: string | null;
}

// ========== Constants ==========

const MODEL_UIDS = {
  male: "ab11ebff89224f03bd75efede1164cf6",    // Male Full Body Ecorche — Diego Luján García (CC BY)
  female: "9a596b6c24b344bfbe6bb5246290df0e",  // Female Body Muscular System — Ruslan Gadzhiev (CC BY)
};
const DEFAULT_MODEL_UID = MODEL_UIDS.male;

const SEGMENT_META: Record<string, { en: string; pt: string; icon: string }> = {
  head: { en: "Head & Neck", pt: "Cabeça e Pescoço", icon: "🧠" },
  shoulders: { en: "Shoulders", pt: "Ombros", icon: "💪" },
  spine: { en: "Spine & Trunk", pt: "Coluna e Tronco", icon: "🦴" },
  hips: { en: "Hips & Pelvis", pt: "Quadril e Pelve", icon: "🫁" },
  knees: { en: "Knees & Thighs", pt: "Joelhos e Coxas", icon: "🦵" },
  ankles: { en: "Lower Legs & Feet", pt: "Pernas e Pés", icon: "🦶" },
};

const SEGMENT_KEYWORDS: Record<string, string[]> = {
  head: ["head", "skull", "cranium", "jaw", "mandible", "cervical", "neck", "face", "cranio", "cabeca", "pescoco", "brain", "eye", "nose", "ear", "teeth", "tongue"],
  shoulders: ["shoulder", "scapula", "clavicle", "deltoid", "trapezius", "ombro", "escapula", "clavicula", "acromion", "rotator"],
  spine: ["spine", "thoracic", "lumbar", "rib", "sternum", "vertebra", "torso", "trunk", "chest", "abdomen", "pectoral", "rectus", "oblique", "coluna", "costela", "tronco", "peito", "intercostal", "serratus", "latissimus", "erector"],
  hips: ["hip", "pelvis", "iliac", "sacrum", "sacral", "gluteus", "glute", "quadril", "pelve", "gluteo", "ilium", "ischium", "pubis", "psoas"],
  knees: ["knee", "femur", "thigh", "quadricep", "patella", "hamstring", "joelho", "coxa", "femoral", "adductor", "sartorius", "vastus", "rectus_fem"],
  ankles: ["ankle", "tibia", "fibula", "foot", "feet", "calf", "calcaneus", "metatarsal", "toe", "shin", "gastrocnemius", "soleus", "tornozelo", "pe", "panturrilha", "canela", "achilles", "plantar", "phalanx", "tarsal"],
};

const CAMERA_PRESETS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  anterior: { position: [0, 1.2, 2.8], target: [0, 0.8, 0] },
  posterior: { position: [0, 1.2, -2.8], target: [0, 0.8, 0] },
  left: { position: [-2.8, 1.2, 0], target: [0, 0.8, 0] },
  right: { position: [2.8, 1.2, 0], target: [0, 0.8, 0] },
};

function getColor(score: number): THREE.Color {
  if (score >= 80) return new THREE.Color(0.0, 1.0, 0.4);   // Vibrant green
  if (score >= 70) return new THREE.Color(1.0, 0.75, 0.0);  // Vibrant amber
  if (score >= 60) return new THREE.Color(1.0, 0.4, 0.0);   // Vibrant orange
  return new THREE.Color(1.0, 0.0, 0.0);                     // Vibrant red
}

function getColorHex(score: number): string {
  if (score >= 80) return "#00FF66";  // Vibrant green
  if (score >= 70) return "#FFBB00";  // Vibrant amber
  if (score >= 60) return "#FF6600";  // Vibrant orange
  return "#FF0033";                    // Vibrant red
}

function getGrade(score: number, isPt: boolean): string {
  if (score >= 80) return isPt ? "Bom" : "Good";
  if (score >= 70) return isPt ? "Moderado" : "Moderate";
  if (score >= 60) return isPt ? "Atenção" : "Attention";
  return isPt ? "Crítico" : "Critical";
}

function matchSegment(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [segment, keywords] of Object.entries(SEGMENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return segment;
  }
  return null;
}

// Y-position based segment assignment (normalized 0-1 from feet to head)
function segmentFromY(normalizedY: number): string {
  if (normalizedY > 0.85) return "head";
  if (normalizedY > 0.68) return "shoulders";
  if (normalizedY > 0.45) return "spine";
  if (normalizedY > 0.35) return "hips";
  if (normalizedY > 0.15) return "knees";
  return "ankles";
}

// ========== 3D Scene Sub-Components ==========

function CameraController({
  preset,
  onReady,
}: {
  preset: string;
  onReady?: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetRef = useRef(preset);

  useEffect(() => {
    targetRef.current = preset;
    const p = CAMERA_PRESETS[preset];
    if (!p) return;

    // Animate camera
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...p.position);
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut

      camera.position.lerpVectors(startPos, endPos, ease);
      camera.lookAt(p.target[0], p.target[1], p.target[2]);

      if (controlsRef.current) {
        controlsRef.current.target.set(...p.target);
        controlsRef.current.update();
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [preset, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1}
      maxDistance={6}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI - 0.2}
      dampingFactor={0.08}
      enableDamping={true}
    />
  );
}

function BodyModel({
  modelUrl,
  segmentScores,
  onMeshClick,
  hoveredSegment,
  onMeshHover,
}: {
  modelUrl: string;
  segmentScores: SegmentScoresData | null;
  onMeshClick: (segment: string | null) => void;
  hoveredSegment: string | null;
  onMeshHover: (segment: string | null) => void;
}) {
  const { scene } = useGLTF(modelUrl);
  const modelRef = useRef<THREE.Group>(null);

  // Clone the scene, center, scale, and assign segments
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // Auto-center and scale the model
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.0 / maxDim;

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    return clone;
  }, [scene]);

  // Apply colors based on scores using Y-position mapping
  useEffect(() => {
    if (!segmentScores || !clonedScene) return;

    // First pass: compute model bounds in world space
    clonedScene.updateWorldMatrix(true, true);
    const modelBox = new THREE.Box3().setFromObject(clonedScene);
    const modelMinY = modelBox.min.y;
    const modelMaxY = modelBox.max.y;
    const modelHeight = modelMaxY - modelMinY || 1;

    clonedScene.traverse((child: THREE.Object3D) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const name = mesh.name || "";
      const materialName = (mesh.material as THREE.Material)?.name || "";

      // Try keyword match first, then Y-position fallback
      let segment = matchSegment(name) || matchSegment(materialName);

      if (!segment) {
        // Compute mesh center Y in world space
        const meshBox = new THREE.Box3().setFromObject(mesh);
        const meshCenterY = (meshBox.min.y + meshBox.max.y) / 2;
        const normalizedY = (meshCenterY - modelMinY) / modelHeight;
        segment = segmentFromY(normalizedY);
      }

      const segData = (segmentScores as any)[segment] as SegmentScore | undefined;
      if (!segData) return;

      const scoreColor = getColor(segData.score);
      mesh.userData.segment = segment;

      // Apply tinted color preserving texture detail
      const applyTint = (mat: THREE.Material): THREE.Material => {
        const cloned = mat.clone();
        if (cloned instanceof THREE.MeshStandardMaterial || cloned instanceof THREE.MeshPhysicalMaterial) {
          // Preserve original map (texture) — only tint the color
          const origColor = cloned.color.clone();
          cloned.color.lerpColors(origColor, scoreColor, 0.55);
          cloned.emissive = scoreColor.clone().multiplyScalar(0.12);
          cloned.emissiveIntensity = 1.0;
          cloned.roughness = Math.min(cloned.roughness, 0.7);
          cloned.metalness = Math.max(cloned.metalness, 0.05);
        } else {
          // For basic materials, replace entirely
          const basic = new THREE.MeshStandardMaterial({
            color: scoreColor,
            emissive: scoreColor.clone().multiplyScalar(0.12),
            roughness: 0.6,
            metalness: 0.05,
          });
          return basic;
        }
        return cloned;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(applyTint);
      } else if (mesh.material) {
        mesh.material = applyTint(mesh.material);
      }
    });
  }, [clonedScene, segmentScores]);

  // Hover highlight — segment-specific colored glow (NOT white)
  useEffect(() => {
    if (!clonedScene) return;
    clonedScene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const seg = mesh.userData.segment;
        if (!seg) return;

        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            const segData = (segmentScores as any)?.[seg];
            const segColor = segData?.score != null ? getColor(segData.score) : new THREE.Color(0.5, 0.5, 0.5);

            if (seg === hoveredSegment) {
              // Highlight ONLY this segment with its score color (brighter)
              mat.emissive = segColor.clone();
              mat.emissiveIntensity = 2.5;
              mat.color.lerpColors(mat.color, new THREE.Color(1, 1, 1), 0.15);
            } else {
              // Restore: dim other segments back to subtle tint
              mat.emissive = segColor.clone().multiplyScalar(0.12);
              mat.emissiveIntensity = hoveredSegment ? 0.3 : 1.0; // Dim others when something is hovered
            }
          }
        });
      }
    });
  }, [hoveredSegment, clonedScene, segmentScores]);

  const handlePointerOver = useCallback(
    (e: any) => {
      e.stopPropagation();
      const seg = e.object?.userData?.segment;
      if (seg) {
        onMeshHover(seg);
        document.body.style.cursor = "pointer";
      }
    },
    [onMeshHover]
  );

  const handlePointerOut = useCallback(
    (e: any) => {
      e.stopPropagation();
      onMeshHover(null);
      document.body.style.cursor = "auto";
    },
    [onMeshHover]
  );

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      const seg = e.object?.userData?.segment;
      if (seg) onMeshClick(seg);
    },
    [onMeshClick]
  );

  return (
    <primitive
      ref={modelRef}
      object={clonedScene}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}

// ========== Floating Clinical Annotations ==========

const SEGMENT_POSITIONS: Record<string, [number, number, number]> = {
  head:      [ 0.55, 1.88, 0.2],
  shoulders: [-0.65, 1.58, 0.2],
  spine:     [ 0.55, 1.20, 0.2],
  hips:      [-0.65, 0.88, 0.2],
  knees:     [ 0.55, 0.48, 0.2],
  ankles:    [-0.65, 0.12, 0.2],
};

function SegmentAnnotations({
  segmentScores,
  aiFindings,
  selectedSegment,
  onSelect,
  showAnnotations,
  isPt,
}: {
  segmentScores: SegmentScoresData;
  aiFindings?: Finding[] | null;
  selectedSegment: string | null;
  onSelect: (seg: string | null) => void;
  showAnnotations: boolean;
  isPt: boolean;
}) {
  if (!showAnnotations) return null;

  const getFindings = (segKey: string): Finding[] => {
    if (!aiFindings) return [];
    const keywords = SEGMENT_KEYWORDS[segKey] || [];
    return aiFindings.filter((f) => {
      const fa = (f.area || "").toLowerCase();
      return keywords.some((kw) => fa.includes(kw));
    });
  };

  return (
    <>
      {Object.entries(segmentScores)
        .filter(([, d]) => d && typeof d === "object" && "score" in d)
        .map(([key, data]) => {
          const seg = data as SegmentScore;
          const pos = SEGMENT_POSITIONS[key];
          if (!pos) return null;
          const meta = SEGMENT_META[key];
          const color = getColorHex(seg.score);
          const isSelected = selectedSegment === key;
          const isCritical = seg.score < 70;
          const findings = getFindings(key);

          return (
            <Html
              key={key}
              position={pos}
              distanceFactor={5}
              style={{ pointerEvents: "auto" }}
              zIndexRange={[10, 0]}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(isSelected ? null : key);
                }}
                className="cursor-pointer select-none group"
                style={{ transform: "translateX(-50%)" }}
              >
                {/* Badge — strong hover: scale 1.25, glow, shadow */}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black whitespace-nowrap border-2 backdrop-blur-md transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-white/60 scale-125"
                      : "hover:scale-125"
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${color}90` : `${color}50`,
                    borderColor: color,
                    color: "#FFFFFF",
                    textShadow: `0 0 6px ${color}`,
                    boxShadow: isSelected
                      ? `0 0 30px ${color}CC, 0 0 60px ${color}66, 0 4px 20px rgba(0,0,0,0.5)`
                      : isCritical
                      ? `0 0 20px ${color}AA, 0 0 40px ${color}55, 0 4px 16px rgba(0,0,0,0.4)`
                      : `0 0 12px ${color}66, 0 2px 10px rgba(0,0,0,0.3)`,
                    animation: isCritical && !isSelected ? "badgePulse 2s ease-in-out infinite" : undefined,
                  }}
                >
                  <span className="text-sm">{meta?.icon}</span>
                  <span>{seg.score}</span>
                  {isCritical && (
                    <AlertTriangle className="h-3 w-3 animate-pulse" />
                  )}
                </div>

                {/* Expanded finding card when selected */}
                {isSelected && (
                  <div
                    className="mt-1 rounded-lg border p-2 text-left backdrop-blur-xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.88)",
                      borderColor: `${color}50`,
                      minWidth: 180,
                      maxWidth: 240,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{meta?.icon}</span>
                      <span className="text-[10px] font-bold text-white">
                        {isPt ? meta?.pt : meta?.en}
                      </span>
                      <span
                        className="ml-auto text-[10px] font-black"
                        style={{ color }}
                      >
                        {seg.score}/100
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${seg.score}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>

                    {/* Key issue */}
                    {seg.keyIssue && (
                      <p className="text-[9px] text-white/90 mb-1 leading-tight">
                        <span className="font-semibold" style={{ color }}>
                          {isPt ? "Achado: " : "Issue: "}
                        </span>
                        {seg.keyIssue}
                      </p>
                    )}

                    {/* Related findings */}
                    {findings.length > 0 && (
                      <div className="space-y-0.5 pt-1 border-t border-white/10">
                        {findings.slice(0, 2).map((f, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-1 text-[8px] text-white/70"
                          >
                            <span
                              className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  f.severity === "severe"
                                    ? "#EF4444"
                                    : f.severity === "moderate"
                                    ? "#F97316"
                                    : "#EAB308",
                              }}
                            />
                            <span className="leading-tight">
                              {f.finding}
                              {f.recommendation && (
                                <span className="text-white/40">
                                  {" → "}{f.recommendation}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-[7px] text-white/30 mt-1 text-right">
                      {isPt ? "Clique para fechar" : "Click to close"}
                    </div>
                  </div>
                )}
              </div>
            </Html>
          );
        })}
    </>
  );
}

function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-white/70">Loading 3D model...</span>
      </div>
    </Html>
  );
}

function ScreenshotHelper({
  onCapture,
}: {
  onCapture: React.MutableRefObject<(() => void) | null>;
}) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    onCapture.current = () => {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `body-assessment-3d-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  }, [gl, scene, camera, onCapture]);

  return null;
}

// ========== Segment Detail Panel (Side Panel) ==========

function SegmentDetailPanel({
  segKey,
  segmentScores,
  postureAnalysis,
  aiFindings,
  isPt,
  onClose,
  overallScore: overallScoreProp,
}: {
  segKey: string;
  segmentScores: Record<string, any>;
  postureAnalysis: any;
  aiFindings: any[] | null;
  isPt: boolean;
  onClose: () => void;
  overallScore?: number | null;
}) {
  // Always get raw data first (guaranteed to exist)
  const rawData = segmentScores[segKey];
  const score = rawData?.score ?? 0;
  const keyIssue = rawData?.keyIssue || rawData?.status || "";
  const color = getColorHex(score);
  const meta = SEGMENT_META[segKey];
  const grade = getGrade(score, isPt);
  const severity = score < 65 ? "high" : score < 75 ? "medium" : "low";

  // Try to get enriched integration data (wrapped in try-catch for bulletproof rendering)
  let seg: SegmentIntegration | null = null;
  try {
    seg = getSegmentIntegration(segKey, segmentScores, postureAnalysis, aiFindings, isPt);
  } catch (err) {
    console.error("[SegmentDetailPanel] getSegmentIntegration error:", err);
  }

  // Priority badge
  const sevBadge = severity === "high"
    ? { bg: "#FF003320", text: "#FF0033", label: isPt ? "Alta Prioridade" : "High Priority" }
    : severity === "medium"
    ? { bg: "#FF660020", text: "#FF6600", label: isPt ? "Média Prioridade" : "Medium Priority" }
    : { bg: "#00FF6620", text: "#00FF66", label: isPt ? "Baixa Prioridade" : "Low Priority" };

  return (
    <div
      className="rounded-xl border-2 shadow-2xl animate-in fade-in slide-in-from-right-3 duration-300"
      style={{
        borderColor: `${color}60`,
        background: "var(--card)",
        boxShadow: `0 0 20px ${color}15, 0 4px 24px rgba(0,0,0,0.15)`,
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: `2px solid ${color}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${color}20` }}>
            {meta?.icon}
          </div>
          <div>
            <h3 className="text-base font-bold">{isPt ? meta?.pt : meta?.en}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black" style={{ color, textShadow: `0 0 8px ${color}40` }}>{score}/100</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sevBadge.bg, color: sevBadge.text }}>
                {sevBadge.label}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── SCORE BAR ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: `${color}15` }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}` }} />
        </div>
        {keyIssue && (
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
            <span className="font-bold" style={{ color }}>⚡ </span>{keyIssue}
          </p>
        )}
      </div>

      {/* ── POSTURAL MEASUREMENTS ── */}
      {seg && seg.posturalMeasurements.length > 0 && (
        <div className="px-4 py-3 border-t">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold flex items-center gap-1.5">
            📏 {isPt ? "Medições Posturais" : "Postural Measurements"}
          </h4>
          {seg.posturalMeasurements.map((m, i) => {
            const pct = m.worsened > 0 ? Math.min((m.current / m.worsened) * 100, 100) : 50;
            return (
              <div key={i} className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">{isPt ? m.labelPt : m.label}</span>
                  <span className="font-black text-sm" style={{ color: "#FF6600" }}>{m.current}{m.unit}</span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500 opacity-25" style={{ width: "100%" }} />
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: "#FF6600", boxShadow: "0 0 8px rgba(255,102,0,0.5)" }} />
                </div>
                <div className="flex justify-between text-[9px] mt-1 font-medium">
                  <span className="text-green-500">✅ {isPt ? "ideal" : "ideal"}: {m.ideal}{m.unit}</span>
                  <span style={{ color: "#FF6600" }}>📍 {isPt ? "atual" : "current"}: {m.current}{m.unit}</span>
                  <span className="text-red-500">⚠️ {isPt ? "sem tto" : "no tx"}: {m.worsened}{m.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MUSCLE IMBALANCES ── */}
      {seg && (seg.hypertonicMuscles.length > 0 || seg.hypotonicMuscles.length > 0) && (
        <div className="px-4 py-3 border-t">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold flex items-center gap-1.5">
            💪 {isPt ? "Desequilíbrios Musculares" : "Muscle Imbalances"}
            <span className="text-[9px] opacity-60">({seg.hypertonicMuscles.length + seg.hypotonicMuscles.length})</span>
          </h4>

          {seg.hypertonicMuscles.length > 0 && (
            <div className="mb-2.5 rounded-lg p-2.5" style={{ backgroundColor: "rgba(255,0,50,0.06)", border: "1px solid rgba(255,0,50,0.15)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Flame className="h-3.5 w-3.5 text-red-500" />
                <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">
                  {isPt ? "Hipertônicos (Tensos → Alongar)" : "Hypertonic (Tight → Stretch)"}
                </span>
              </div>
              {seg.hypertonicMuscles.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-0.5 pl-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" style={{ boxShadow: "0 0 4px rgba(255,0,50,0.5)" }} />
                  <span className="font-medium flex-1">{m.name}</span>
                  <span className="text-[9px] text-muted-foreground">{m.side}</span>
                  <span className="text-[8px] font-bold text-red-400 px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,0,50,0.1)" }}>{m.severity}</span>
                </div>
              ))}
            </div>
          )}

          {seg.hypotonicMuscles.length > 0 && (
            <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider">
                  {isPt ? "Hipotônicos (Fracos → Fortalecer)" : "Hypotonic (Weak → Strengthen)"}
                </span>
              </div>
              {seg.hypotonicMuscles.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-0.5 pl-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" style={{ boxShadow: "0 0 4px rgba(59,130,246,0.5)" }} />
                  <span className="font-medium flex-1">{m.name}</span>
                  <span className="text-[9px] text-muted-foreground">{m.side}</span>
                  <span className="text-[8px] font-bold text-blue-400 px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>{m.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BONES ── */}
      {seg && seg.bones.length > 0 && (
        <div className="px-4 py-3 border-t">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold flex items-center gap-1.5">
            🦴 {isPt ? "Estruturas Ósseas" : "Bone Structures"} <span className="text-[9px] opacity-60">({seg.bones.length})</span>
          </h4>
          <div className="space-y-1">
            {seg.bones.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[b.status] || "#FFBB00" }} />
                <span className="font-medium">{isPt ? b.namePt : b.name}</span>
                <span className="text-muted-foreground ml-auto text-[10px]">{isPt ? b.statusPt : b.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── JOINTS ── */}
      {seg && seg.joints.length > 0 && (
        <div className="px-4 py-3 border-t">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold flex items-center gap-1.5">
            🔗 {isPt ? "Articulações" : "Joints"} <span className="text-[9px] opacity-60">({seg.joints.length})</span>
          </h4>
          <div className="space-y-1">
            {seg.joints.map((j, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[j.status] || "#FF0033" }} />
                <span className="font-medium">{isPt ? j.namePt : j.name}</span>
                <span className="text-muted-foreground ml-auto text-[10px]">{isPt ? j.statusPt : j.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI FINDINGS ── */}
      {seg && seg.findings.length > 0 && (
        <div className="px-4 py-3 border-t">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">
            💡 {isPt ? "Achados da IA" : "AI Findings"}
          </h4>
          {seg.findings.slice(0, 4).map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] mb-1.5">
              <ChevronRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">{f.finding}</span>
                {f.recommendation && (
                  <span className="text-muted-foreground block text-[10px] mt-0.5">→ {f.recommendation}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RECOMMENDATIONS ── */}
      {seg && seg.recommendations.length > 0 && (
        <div className="px-4 py-3 border-t">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">
            🎯 {isPt ? "Recomendações" : "Recommendations"}
          </h4>
          {seg.recommendations.slice(0, 6).map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] mb-1">
              <ArrowRight className="h-3 w-3 flex-shrink-0 text-primary" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── FALLBACK: always show something useful ── */}
      {(!seg || (seg.posturalMeasurements.length === 0 && seg.hypertonicMuscles.length === 0 && seg.hypotonicMuscles.length === 0 && seg.bones.length === 0 && seg.findings.length === 0)) && (
        <div className="px-4 py-3 border-t">
          <div className="rounded-lg p-3 bg-muted/30 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">
              {isPt
                ? "📋 Dados detalhados de músculos, ossos e medições serão exibidos após a análise IA identificar problemas neste segmento."
                : "📋 Detailed muscle, bone, and measurement data will appear after AI analysis identifies issues in this segment."}
            </p>
            <p className="text-[10px] font-medium" style={{ color }}>
              {isPt ? `Score atual: ${score}/100 — ${grade}` : `Current score: ${score}/100 — ${grade}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Main Component ==========

export function BodyViewer3D({
  segmentScores,
  aiFindings,
  locale,
  modelUid,
  patientGender,
  muscleHypotheses,
  postureAnalysis,
  assessmentId,
  patientName,
  assessmentDate,
}: BodyViewer3DProps) {
  const isPt = locale === "pt-BR";
  const [gender, setGender] = useState<"male" | "female">(patientGender || "male");
  const uid = modelUid || MODEL_UIDS[gender];

  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("anterior");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showFindings, setShowFindings] = useState(false);
  const captureRef = useRef<(() => void) | null>(null);

  // Fetch model from our API (which downloads + caches from Sketchfab)
  useEffect(() => {
    let cancelled = false;

    async function loadModel() {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Check if model is already cached via nginx
        const directUrl = `/models/${uid}.glb`;
        const headCheck = await fetch(directUrl, { method: "HEAD" });

        if (headCheck.ok) {
          // Model already cached, use nginx-served path
          if (!cancelled) {
            setModelUrl(directUrl);
            setIsLoading(false);
          }
          return;
        }

        // Step 2: Not cached — trigger download via API
        const res = await fetch(`/api/sketchfab/download-model?uid=${uid}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || data.detail || "Failed to load model");
        }

        // Step 3: Now serve via nginx
        if (!cancelled) {
          setModelUrl(directUrl);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("[BodyViewer3D] Load error:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load 3D model");
          setIsLoading(false);
        }
      }
    }

    loadModel();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const handleCapture = useCallback(() => {
    if (captureRef.current) captureRef.current();
  }, []);

  const getRelatedFindings = useCallback(
    (segKey: string) => {
      if (!aiFindings) return [];
      const keywords = SEGMENT_KEYWORDS[segKey] || [];
      return aiFindings.filter((f) => {
        const fa = f.area?.toLowerCase() || "";
        return keywords.some((kw) => fa.includes(kw));
      });
    },
    [aiFindings]
  );

  const views = [
    { key: "anterior", label: "Anterior" },
    { key: "posterior", label: "Posterior" },
    { key: "left", label: isPt ? "Lateral E" : "Left" },
    { key: "right", label: isPt ? "Lateral D" : "Right" },
  ];

  if (!segmentScores) return null;

  return (
    <Viewer3DErrorBoundary>
    {/* Inject CSS keyframes for badge pulse */}
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes badgePulse {
        0%, 100% { box-shadow: 0 0 15px rgba(255,0,50,0.5), 0 0 30px rgba(255,0,50,0.3); }
        50% { box-shadow: 0 0 30px rgba(255,0,50,0.9), 0 0 60px rgba(255,0,50,0.5), 0 0 90px rgba(255,0,50,0.2); }
      }
    `}} />
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-900/5 to-transparent dark:from-slate-100/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            {isPt ? "Modelo Anatômico 3D" : "3D Anatomical Model"}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {/* Gender toggle */}
            <div className="flex bg-muted/60 rounded-md p-0.5 gap-0.5">
              <button
                onClick={() => { setGender("male"); setModelUrl(null); }}
                className={`px-2 py-0.5 text-[9px] font-semibold rounded transition-all ${
                  gender === "male"
                    ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ♂ {isPt ? "Masc" : "Male"}
              </button>
              <button
                onClick={() => { setGender("female"); setModelUrl(null); }}
                className={`px-2 py-0.5 text-[9px] font-semibold rounded transition-all ${
                  gender === "female"
                    ? "bg-pink-500/20 text-pink-400 ring-1 ring-pink-500/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ♀ {isPt ? "Fem" : "Female"}
              </button>
            </div>
            {modelUrl && (
              <Button
                variant={showAnnotations ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1 text-[10px]"
                onClick={() => setShowAnnotations(!showAnnotations)}
              >
                <Activity className="h-3 w-3" />
                {isPt ? "Anotações" : "Annotations"}
              </Button>
            )}
            <Button
              variant={showFindings ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1 text-[10px]"
              onClick={() => setShowFindings(!showFindings)}
            >
              <ClipboardList className="h-3 w-3" />
              {isPt ? "Resumo" : "Findings"}
            </Button>
            {assessmentId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px]"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = `/api/body-assessments/${assessmentId}/report-pdf`;
                  link.download = `body-assessment-report.pdf`;
                  link.click();
                }}
              >
                <FileText className="h-3 w-3" />
                PDF
              </Button>
            )}
            {modelUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px]"
                onClick={handleCapture}
              >
                <Camera className="h-3 w-3" />
                {isPt ? "Capturar" : "Screenshot"}
              </Button>
            )}
            {modelUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px]"
                onClick={() => setActiveView("anterior")}
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
            <Badge variant="outline" className="text-[10px]">
              {isPt ? "Arraste para rotacionar" : "Drag to rotate"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 3D Viewer */}
          <div className="flex-1 min-w-0">
            {/* View presets */}
            {modelUrl && (
              <div className="flex gap-1 mb-2 bg-muted/60 rounded-lg p-0.5">
                {views.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setActiveView(v.key)}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                      activeView === v.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* Canvas container */}
            <div
              className="relative rounded-xl overflow-hidden border border-muted-foreground/10"
              style={{ aspectRatio: "4/3", background: "linear-gradient(180deg, #0c1220 0%, #162033 50%, #0f172a 100%)" }}
            >
              {/* Loading state */}
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-xs text-white/60">
                    {isPt ? "Baixando modelo 3D do Sketchfab..." : "Downloading 3D model from Sketchfab..."}
                  </p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                  <p className="text-xs text-red-400 mb-2 max-w-[300px] text-center">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      // Re-trigger
                      fetch(`/api/sketchfab/download-model?uid=${uid}`)
                        .then((r) => r.json())
                        .then((d) => {
                          if (d.success) setModelUrl(d.modelUrl);
                          else setError(d.error);
                          setIsLoading(false);
                        })
                        .catch(() => {
                          setError("Retry failed");
                          setIsLoading(false);
                        });
                    }}
                  >
                    {isPt ? "Tentar novamente" : "Try again"}
                  </Button>
                </div>
              )}

              {/* R3F Canvas */}
              {modelUrl && !error && (
                <Canvas
                  camera={{
                    position: CAMERA_PRESETS.anterior.position,
                    fov: 45,
                    near: 0.1,
                    far: 100,
                  }}
                  gl={{ preserveDrawingBuffer: true, antialias: true }}
                  dpr={[1, 2]}
                  style={{ width: "100%", height: "100%" }}
                >
                  {/* Lighting */}
                  <ambientLight intensity={0.4} />
                  <directionalLight position={[5, 8, 5]} intensity={1.0} castShadow color="#ffffff" />
                  <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#a0c4ff" />
                  <directionalLight position={[0, -3, 5]} intensity={0.2} color="#ffd6a5" />
                  <pointLight position={[0, 3, 0]} intensity={0.3} color="#e0e7ff" />

                  {/* Environment for reflections */}
                  <Environment preset="studio" />

                  {/* Contact shadows */}
                  <ContactShadows
                    position={[0, -0.01, 0]}
                    opacity={0.4}
                    scale={5}
                    blur={2.5}
                    far={4}
                    color="#000022"
                  />

                  {/* Camera controls */}
                  <CameraController preset={activeView} />

                  {/* Screenshot helper */}
                  <ScreenshotHelper onCapture={captureRef} />

                  {/* Model */}
                  <Suspense fallback={<SceneLoader />}>
                    <BodyModel
                      modelUrl={modelUrl}
                      segmentScores={segmentScores}
                      onMeshClick={setSelectedSegment}
                      hoveredSegment={hoveredSegment}
                      onMeshHover={setHoveredSegment}
                    />
                  </Suspense>

                  {/* Floating clinical annotations */}
                  <SegmentAnnotations
                    segmentScores={segmentScores}
                    aiFindings={aiFindings}
                    selectedSegment={selectedSegment}
                    onSelect={setSelectedSegment}
                    showAnnotations={showAnnotations}
                    isPt={isPt}
                  />
                </Canvas>
              )}

              {/* Hovered segment tooltip — rich and visual */}
              {hoveredSegment && (segmentScores as any)[hoveredSegment] && (() => {
                const hData = (segmentScores as any)[hoveredSegment] as SegmentScore;
                let hSeg: SegmentIntegration | null = null;
                try { hSeg = getSegmentIntegration(hoveredSegment, segmentScores as any, postureAnalysis, aiFindings || null, isPt); } catch {}
                const hColor = getColorHex(hData.score);
                const hMeta = SEGMENT_META[hoveredSegment];
                return (
                  <div
                    className="absolute top-3 left-3 z-20 pointer-events-none"
                    style={{
                      minWidth: 300,
                      maxWidth: 340,
                      background: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
                      border: `2px solid ${hColor}`,
                      borderRadius: 14,
                      padding: "14px 16px",
                      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 24px ${hColor}40`,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${hColor}30` }}>
                      <span className="text-lg">{hMeta?.icon}</span>
                      <span className="text-sm text-white font-bold flex-1">{isPt ? hMeta?.pt : hMeta?.en}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black" style={{ color: hColor, textShadow: `0 0 10px ${hColor}` }}>{hData.score}</span>
                        <span className="text-[8px] text-white/40">/100</span>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: `${hColor}15` }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${hData.score}%`, backgroundColor: hColor, boxShadow: `0 0 10px ${hColor}` }} />
                    </div>

                    {/* Key issue */}
                    {hData.keyIssue && (
                      <p className="text-[11px] text-white/90 mb-2 leading-snug">
                        <span className="font-bold" style={{ color: hColor }}>⚡ </span>{hData.keyIssue}
                      </p>
                    )}

                    {/* Measurement + muscles from integration */}
                    {hSeg && (
                      <>
                        {hSeg.posturalMeasurements.length > 0 && (
                          <div className="text-[11px] text-white/80 mb-1.5 flex items-center gap-1">
                            <span>📏</span>
                            <span className="font-medium">{isPt ? hSeg.posturalMeasurements[0].labelPt : hSeg.posturalMeasurements[0].label}:</span>
                            <span className="font-black text-[13px]" style={{ color: "#FF6600" }}>{hSeg.posturalMeasurements[0].current}°</span>
                            <span className="text-white/40 text-[9px]">→ {isPt ? "pode chegar a" : "may reach"} {hSeg.posturalMeasurements[0].worsened}°</span>
                          </div>
                        )}
                        {hSeg.hypertonicMuscles.length > 0 && (
                          <div className="text-[11px] mb-0.5 flex items-center gap-1">
                            <span className="text-red-400">🔴</span>
                            <span className="text-red-400 font-semibold">{hSeg.hypertonicMuscles[0].name}</span>
                            <span className="text-white/40 text-[9px]">{isPt ? "Tenso" : "Tight"}</span>
                          </div>
                        )}
                        {hSeg.hypotonicMuscles.length > 0 && (
                          <div className="text-[11px] mb-0.5 flex items-center gap-1">
                            <span className="text-blue-400">🔵</span>
                            <span className="text-blue-400 font-semibold">{hSeg.hypotonicMuscles[0].name}</span>
                            <span className="text-white/40 text-[9px]">{isPt ? "Fraco" : "Weak"}</span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="text-[9px] text-white/30 mt-2 text-center" style={{ borderTop: `1px solid ${hColor}20`, paddingTop: 6 }}>
                      {isPt ? "👆 Clique para detalhes completos" : "👆 Click for full details"}
                    </div>
                  </div>
                );
              })()}
            </div>

            <p className="text-[9px] text-muted-foreground/50 mt-1 text-center">
              {isPt ? "Modelo 3D via Sketchfab — Licença CC BY" : "3D model via Sketchfab — CC BY License"}
            </p>
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {/* ═══ Selected Segment — Fully Integrated Clinical Detail ═══ */}
            {selectedSegment && (segmentScores as any)[selectedSegment] && (
              <SegmentDetailPanel
                segKey={selectedSegment}
                segmentScores={segmentScores as any}
                postureAnalysis={postureAnalysis}
                aiFindings={aiFindings || null}
                isPt={isPt}
                onClose={() => setSelectedSegment(null)}
                overallScore={(segmentScores as any)?.overall?.score ?? null}
              />
            )}

            {/* ═══ Segment Score List ═══ */}
            <div className="rounded-xl border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {isPt ? "Scores por Segmento" : "Segment Scores"}
              </p>
              <div className="space-y-1.5">
                {Object.entries(segmentScores)
                  .filter(([, d]) => d && typeof d === "object" && "score" in d)
                  .sort(([, a], [, b]) => (a as SegmentScore).score - (b as SegmentScore).score)
                  .map(([key, data]) => {
                    const s = data as SegmentScore;
                    const meta = SEGMENT_META[key];
                    const c = getColorHex(s.score);
                    const isActive = selectedSegment === key;
                    const isHov = hoveredSegment === key;
                    let muscleCount = 0;
                    try {
                      const segI = getSegmentIntegration(key, segmentScores as any, postureAnalysis, aiFindings || null, isPt);
                      muscleCount = segI ? segI.hypertonicMuscles.length + segI.hypotonicMuscles.length : 0;
                    } catch {}
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedSegment(isActive ? null : key)}
                        onMouseEnter={() => setHoveredSegment(key)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all duration-200 border ${
                          isActive
                            ? "border-primary/40 bg-primary/10 shadow-md"
                            : isHov
                            ? "border-transparent bg-muted/70 shadow-sm"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                        style={isActive ? { borderColor: `${c}40`, boxShadow: `0 0 12px ${c}15` } : undefined}
                      >
                        <span className="text-sm">{meta?.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium block">{isPt ? meta?.pt : meta?.en}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {muscleCount > 0 && (
                              <span className="text-[8px] text-muted-foreground">{muscleCount} {isPt ? "músculos" : "muscles"}</span>
                            )}
                            <span className="text-[8px] text-primary/60">
                              {isActive ? (isPt ? "▼ aberto" : "▼ open") : (isPt ? "▶ detalhes" : "▶ details")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${c}15` }}>
                            <div className="h-full rounded-full" style={{ width: `${s.score}%`, backgroundColor: c, boxShadow: `0 0 6px ${c}40` }} />
                          </div>
                          <span className="text-xs font-black tabular-nums w-7 text-right" style={{ color: c }}>{s.score}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                {[
                  { color: "#FF0033", label: "<60" },
                  { color: "#FF6600", label: "60-69" },
                  { color: "#FFBB00", label: "70-79" },
                  { color: "#00FF66", label: "≥80" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-[9px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t flex-wrap">
                <div className="flex items-center gap-0.5"><Flame className="h-2.5 w-2.5 text-red-400" /><span className="text-[8px] text-muted-foreground">{isPt ? "Tenso" : "Tight"}</span></div>
                <div className="flex items-center gap-0.5"><Snowflake className="h-2.5 w-2.5 text-blue-400" /><span className="text-[8px] text-muted-foreground">{isPt ? "Fraco" : "Weak"}</span></div>
                <div className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] inline-block" /><span className="text-[8px] text-muted-foreground">{isPt ? "Desalinhado" : "Misaligned"}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ FINDINGS MODAL ═══════════════ */}
        {showFindings && (
          <div className="mt-4 rounded-xl border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300 max-h-[70vh] overflow-y-auto">
            {(() => {
              const allSegs = getAllSegmentsSorted(segmentScores as any, postureAnalysis, aiFindings || null, isPt);
              const summary = getAssessmentSummary(segmentScores as any, postureAnalysis);
              const highPri = allSegs.filter((s) => s.severity === "high");
              const medPri = allSegs.filter((s) => s.severity === "medium");
              const lowPri = allSegs.filter((s) => s.severity === "low");

              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 pb-3 border-b sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="text-sm font-bold">{isPt ? "Resumo Completo da Avaliação" : "Complete Assessment Summary"}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {patientName && <span>👤 {patientName}</span>}
                          {assessmentDate && <span>📅 {new Date(assessmentDate).toLocaleDateString(isPt ? "pt-BR" : "en-US")}</span>}
                          <span>📊 {isPt ? "Score Geral" : "Overall"}: <span className="font-bold" style={{ color: getColorHex(summary.overallScore) }}>{summary.overallScore}/100</span></span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowFindings(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Priority sections */}
                  <div className="p-4 space-y-4">
                    {/* High priority */}
                    {highPri.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          🔴 {isPt ? "Alta Prioridade" : "High Priority"}
                        </p>
                        {highPri.map((s) => (
                          <FindingsSegmentCard key={s.segmentKey} seg={s} isPt={isPt} onSelect={(k) => { setSelectedSegment(k); setShowFindings(false); }} />
                        ))}
                      </div>
                    )}

                    {/* Medium priority */}
                    {medPri.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          🟡 {isPt ? "Média Prioridade" : "Medium Priority"}
                        </p>
                        {medPri.map((s) => (
                          <FindingsSegmentCard key={s.segmentKey} seg={s} isPt={isPt} onSelect={(k) => { setSelectedSegment(k); setShowFindings(false); }} />
                        ))}
                      </div>
                    )}

                    {/* Low priority */}
                    {lowPri.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          🟢 {isPt ? "Baixa Prioridade" : "Low Priority"}
                        </p>
                        {lowPri.map((s) => (
                          <FindingsSegmentCard key={s.segmentKey} seg={s} isPt={isPt} onSelect={(k) => { setSelectedSegment(k); setShowFindings(false); }} />
                        ))}
                      </div>
                    )}

                    {/* Muscle imbalance summary */}
                    {(summary.totalHypertonic > 0 || summary.totalHypotonic > 0) && (
                      <div className="rounded-lg border p-3 bg-muted/20">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2">
                          📊 {isPt ? "Resumo de Desequilíbrio Muscular" : "Muscle Imbalance Summary"}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Flame className="h-3.5 w-3.5 text-red-400" />
                            <span className="text-[11px]">
                              <span className="font-bold text-red-400">{summary.totalHypertonic}</span> {isPt ? "hipertônicos" : "hypertonic"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Snowflake className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-[11px]">
                              <span className="font-bold text-blue-400">{summary.totalHypotonic}</span> {isPt ? "hipotônicos" : "hypotonic"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {assessmentId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] gap-1.5"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = `/api/body-assessments/${assessmentId}/report-pdf`;
                            link.download = `body-assessment-report.pdf`;
                            link.click();
                          }}
                        >
                          <FileText className="h-3 w-3" />
                          {isPt ? "Exportar PDF" : "Export PDF"}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
    </Viewer3DErrorBoundary>
  );
}

// ========== Findings Segment Card (used in modal) ==========

function FindingsSegmentCard({
  seg,
  isPt,
  onSelect,
}: {
  seg: SegmentIntegration;
  isPt: boolean;
  onSelect: (key: string) => void;
}) {
  const color = seg.score < 60 ? "#EF4444" : seg.score < 70 ? "#F97316" : seg.score < 80 ? "#EAB308" : "#22C55E";

  return (
    <button
      onClick={() => onSelect(seg.segmentKey)}
      className="w-full text-left rounded-lg border p-3 mb-2 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{seg.icon}</span>
        <span className="text-xs font-bold">{isPt ? seg.labelPt : seg.label}</span>
        <Badge style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }} className="text-[10px] font-bold border ml-auto">
          {seg.score}/100
        </Badge>
      </div>
      {/* Key measurement */}
      {seg.posturalMeasurements.length > 0 && (
        <div className="text-[10px] mb-1">
          <span className="text-muted-foreground">📏 </span>
          {seg.posturalMeasurements.map((m, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {isPt ? m.labelPt : m.label}: <span className="font-bold text-orange-500">{m.current}{m.unit}</span>
              <span className="text-muted-foreground"> ({isPt ? "pode piorar para" : "may worsen to"} {m.worsened}{m.unit})</span>
            </span>
          ))}
        </div>
      )}
      {/* Muscles */}
      {seg.hypertonicMuscles.length > 0 && (
        <div className="text-[10px] text-red-400">
          <Flame className="h-2.5 w-2.5 inline mr-0.5" />
          {seg.hypertonicMuscles.map((m) => m.name).join(", ")}
        </div>
      )}
      {seg.hypotonicMuscles.length > 0 && (
        <div className="text-[10px] text-blue-400">
          <Snowflake className="h-2.5 w-2.5 inline mr-0.5" />
          {seg.hypotonicMuscles.map((m) => m.name).join(", ")}
        </div>
      )}
      {/* Key issue */}
      {seg.keyIssue && !(seg.posturalMeasurements.length > 0) && (
        <p className="text-[10px] text-muted-foreground">{seg.keyIssue}</p>
      )}
      <div className="text-[8px] text-primary mt-1">{isPt ? "Clique para detalhes completos →" : "Click for full details →"}</div>
    </button>
  );
}

export default BodyViewer3D;
