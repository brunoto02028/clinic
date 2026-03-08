"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Users, Upload, Loader2, ImagePlus } from "lucide-react";

// ─── Types ───
export interface MuscleHighlight {
  muscle: string;
  side?: "left" | "right" | "bilateral";
  status: "hypertonic" | "hypotonic" | "trigger_point" | "normal" | "weak" | "tight";
  severity?: string;
  notes?: string;
}

interface AnatomicalAvatarProps {
  sex?: "male" | "female";
  view?: "front" | "back";
  highlights?: MuscleHighlight[];
  motorPoints?: Array<{ name: string; x: number; y: number; status: string; severity: number; notes?: string }>;
  width?: number;
  height?: number;
  showControls?: boolean;
  showLegend?: boolean;
  darkBg?: boolean;
  className?: string;
  allowUpload?: boolean;
  onUploadComplete?: () => void;
}

// ─── Status → Color mapping ───
const STATUS_COLORS: Record<string, { fill: string; glow: string; label: string }> = {
  hypertonic:    { fill: "rgba(239,68,68,0.45)",  glow: "rgba(239,68,68,0.7)",  label: "Hypertonic" },
  hypotonic:     { fill: "rgba(59,130,246,0.45)",  glow: "rgba(59,130,246,0.7)",  label: "Hypotonic" },
  trigger_point: { fill: "rgba(245,158,11,0.55)",  glow: "rgba(245,158,11,0.8)",  label: "Trigger Point" },
  tight:         { fill: "rgba(220,53,69,0.40)",   glow: "rgba(220,53,69,0.7)",   label: "Tight" },
  weak:          { fill: "rgba(99,102,241,0.40)",  glow: "rgba(99,102,241,0.7)",  label: "Weak" },
  normal:        { fill: "rgba(34,197,94,0.25)",   glow: "rgba(34,197,94,0.5)",   label: "Normal" },
};

// ─── Muscle region coordinates (% of image) ───
// Each region: { x, y, w, h } as percentages (0-100) of the avatar image
// Separate mappings for front and back views
type MuscleRegion = { x: number; y: number; w: number; h: number; label: string };

const MUSCLE_REGIONS_FRONT: Record<string, MuscleRegion> = {
  // Head & Neck
  "sternocleidomastoid": { x: 42, y: 12, w: 16, h: 5, label: "SCM" },
  "scalenes":            { x: 43, y: 13, w: 14, h: 4, label: "Scalenes" },
  // Shoulders
  "anterior_deltoid_l":  { x: 26, y: 17, w: 10, h: 6, label: "Ant Deltoid L" },
  "anterior_deltoid_r":  { x: 64, y: 17, w: 10, h: 6, label: "Ant Deltoid R" },
  "deltoid_l":           { x: 24, y: 17, w: 12, h: 7, label: "Deltoid L" },
  "deltoid_r":           { x: 64, y: 17, w: 12, h: 7, label: "Deltoid R" },
  // Chest
  "pectoralis_major_l":  { x: 35, y: 19, w: 14, h: 8, label: "Pec Major L" },
  "pectoralis_major_r":  { x: 51, y: 19, w: 14, h: 8, label: "Pec Major R" },
  "pectoralis_minor_l":  { x: 37, y: 21, w: 10, h: 5, label: "Pec Minor L" },
  "pectoralis_minor_r":  { x: 53, y: 21, w: 10, h: 5, label: "Pec Minor R" },
  "serratus_anterior_l": { x: 30, y: 25, w: 8, h: 8, label: "Serratus L" },
  "serratus_anterior_r": { x: 62, y: 25, w: 8, h: 8, label: "Serratus R" },
  // Arms
  "biceps_l":            { x: 22, y: 25, w: 8, h: 10, label: "Biceps L" },
  "biceps_r":            { x: 70, y: 25, w: 8, h: 10, label: "Biceps R" },
  "forearm_flexors_l":   { x: 18, y: 36, w: 7, h: 10, label: "Forearm L" },
  "forearm_flexors_r":   { x: 75, y: 36, w: 7, h: 10, label: "Forearm R" },
  // Core
  "rectus_abdominis":    { x: 42, y: 28, w: 16, h: 16, label: "Rectus Abd" },
  "external_obliques_l": { x: 34, y: 30, w: 10, h: 12, label: "Obliques L" },
  "external_obliques_r": { x: 56, y: 30, w: 10, h: 12, label: "Obliques R" },
  // Hip
  "hip_flexors_l":       { x: 37, y: 44, w: 10, h: 6, label: "Hip Flexor L" },
  "hip_flexors_r":       { x: 53, y: 44, w: 10, h: 6, label: "Hip Flexor R" },
  "iliopsoas_l":         { x: 38, y: 43, w: 8, h: 7, label: "Iliopsoas L" },
  "iliopsoas_r":         { x: 54, y: 43, w: 8, h: 7, label: "Iliopsoas R" },
  // Upper leg
  "quadriceps_l":        { x: 34, y: 50, w: 12, h: 18, label: "Quads L" },
  "quadriceps_r":        { x: 54, y: 50, w: 12, h: 18, label: "Quads R" },
  "rectus_femoris_l":    { x: 37, y: 50, w: 8, h: 16, label: "Rec Fem L" },
  "rectus_femoris_r":    { x: 55, y: 50, w: 8, h: 16, label: "Rec Fem R" },
  "vastus_lateralis_l":  { x: 32, y: 52, w: 7, h: 14, label: "V Lat L" },
  "vastus_lateralis_r":  { x: 61, y: 52, w: 7, h: 14, label: "V Lat R" },
  "vastus_medialis_l":   { x: 40, y: 58, w: 6, h: 10, label: "VMO L" },
  "vastus_medialis_r":   { x: 54, y: 58, w: 6, h: 10, label: "VMO R" },
  "adductors_l":         { x: 41, y: 52, w: 7, h: 14, label: "Adductors L" },
  "adductors_r":         { x: 52, y: 52, w: 7, h: 14, label: "Adductors R" },
  "tfl_l":               { x: 30, y: 48, w: 6, h: 8, label: "TFL L" },
  "tfl_r":               { x: 64, y: 48, w: 6, h: 8, label: "TFL R" },
  // Lower leg
  "tibialis_anterior_l": { x: 36, y: 70, w: 6, h: 12, label: "Tib Ant L" },
  "tibialis_anterior_r": { x: 58, y: 70, w: 6, h: 12, label: "Tib Ant R" },
  "peroneus_l":          { x: 32, y: 72, w: 5, h: 10, label: "Peroneus L" },
  "peroneus_r":          { x: 63, y: 72, w: 5, h: 10, label: "Peroneus R" },
};

const MUSCLE_REGIONS_BACK: Record<string, MuscleRegion> = {
  // Neck & Upper back
  "upper_trapezius_l":   { x: 36, y: 13, w: 12, h: 6, label: "Trap Sup L" },
  "upper_trapezius_r":   { x: 52, y: 13, w: 12, h: 6, label: "Trap Sup R" },
  "middle_trapezius_l":  { x: 34, y: 20, w: 14, h: 5, label: "Trap Med L" },
  "middle_trapezius_r":  { x: 52, y: 20, w: 14, h: 5, label: "Trap Med R" },
  "lower_trapezius_l":   { x: 38, y: 25, w: 10, h: 6, label: "Trap Inf L" },
  "lower_trapezius_r":   { x: 52, y: 25, w: 10, h: 6, label: "Trap Inf R" },
  "levator_scapulae_l":  { x: 34, y: 12, w: 6, h: 6, label: "Lev Scap L" },
  "levator_scapulae_r":  { x: 60, y: 12, w: 6, h: 6, label: "Lev Scap R" },
  // Shoulders
  "posterior_deltoid_l":  { x: 24, y: 17, w: 10, h: 6, label: "Post Delt L" },
  "posterior_deltoid_r":  { x: 66, y: 17, w: 10, h: 6, label: "Post Delt R" },
  "infraspinatus_l":     { x: 32, y: 21, w: 10, h: 7, label: "Infrasp L" },
  "infraspinatus_r":     { x: 58, y: 21, w: 10, h: 7, label: "Infrasp R" },
  "teres_major_l":       { x: 30, y: 26, w: 8, h: 5, label: "Teres Maj L" },
  "teres_major_r":       { x: 62, y: 26, w: 8, h: 5, label: "Teres Maj R" },
  "rhomboids_l":         { x: 38, y: 22, w: 8, h: 7, label: "Rhomboids L" },
  "rhomboids_r":         { x: 54, y: 22, w: 8, h: 7, label: "Rhomboids R" },
  // Back
  "latissimus_dorsi_l":  { x: 30, y: 28, w: 16, h: 12, label: "Lat Dorsi L" },
  "latissimus_dorsi_r":  { x: 54, y: 28, w: 16, h: 12, label: "Lat Dorsi R" },
  "erector_spinae_l":    { x: 42, y: 24, w: 7, h: 20, label: "Erector Sp L" },
  "erector_spinae_r":    { x: 51, y: 24, w: 7, h: 20, label: "Erector Sp R" },
  "quadratus_lumborum_l":{ x: 38, y: 38, w: 8, h: 7, label: "QL L" },
  "quadratus_lumborum_r":{ x: 54, y: 38, w: 8, h: 7, label: "QL R" },
  // Arms
  "triceps_l":           { x: 20, y: 25, w: 8, h: 10, label: "Triceps L" },
  "triceps_r":           { x: 72, y: 25, w: 8, h: 10, label: "Triceps R" },
  "forearm_extensors_l": { x: 16, y: 36, w: 7, h: 10, label: "Forearm Ext L" },
  "forearm_extensors_r": { x: 77, y: 36, w: 7, h: 10, label: "Forearm Ext R" },
  // Glutes
  "gluteus_maximus_l":   { x: 34, y: 44, w: 14, h: 10, label: "Glut Max L" },
  "gluteus_maximus_r":   { x: 52, y: 44, w: 14, h: 10, label: "Glut Max R" },
  "gluteus_medius_l":    { x: 32, y: 42, w: 10, h: 7, label: "Glut Med L" },
  "gluteus_medius_r":    { x: 58, y: 42, w: 10, h: 7, label: "Glut Med R" },
  "piriformis_l":        { x: 36, y: 48, w: 10, h: 5, label: "Piriformis L" },
  "piriformis_r":        { x: 54, y: 48, w: 10, h: 5, label: "Piriformis R" },
  // Upper leg
  "hamstrings_l":        { x: 34, y: 54, w: 12, h: 16, label: "Hamstrings L" },
  "hamstrings_r":        { x: 54, y: 54, w: 12, h: 16, label: "Hamstrings R" },
  "biceps_femoris_l":    { x: 32, y: 56, w: 8, h: 14, label: "Bic Fem L" },
  "biceps_femoris_r":    { x: 60, y: 56, w: 8, h: 14, label: "Bic Fem R" },
  // Lower leg
  "gastrocnemius_l":     { x: 35, y: 72, w: 8, h: 10, label: "Gastroc L" },
  "gastrocnemius_r":     { x: 57, y: 72, w: 8, h: 10, label: "Gastroc R" },
  "soleus_l":            { x: 36, y: 78, w: 6, h: 8, label: "Soleus L" },
  "soleus_r":            { x: 58, y: 78, w: 6, h: 8, label: "Soleus R" },
};

// ─── Mapping from common AI finding muscle names to region keys ───
const MUSCLE_NAME_MAP: Record<string, { front?: string[]; back?: string[] }> = {
  "upper trapezius":       { back: ["upper_trapezius"] },
  "trapezius":             { back: ["upper_trapezius", "middle_trapezius", "lower_trapezius"] },
  "levator scapulae":      { back: ["levator_scapulae"] },
  "scm":                   { front: ["sternocleidomastoid"] },
  "sternocleidomastoid":   { front: ["sternocleidomastoid"] },
  "scalenes":              { front: ["scalenes"] },
  "pectoralis":            { front: ["pectoralis_major"] },
  "pectoralis major":      { front: ["pectoralis_major"] },
  "pectoralis minor":      { front: ["pectoralis_minor"] },
  "serratus anterior":     { front: ["serratus_anterior"] },
  "deltoid":               { front: ["deltoid"], back: ["posterior_deltoid"] },
  "anterior deltoid":      { front: ["anterior_deltoid"] },
  "posterior deltoid":      { back: ["posterior_deltoid"] },
  "biceps":                { front: ["biceps"] },
  "biceps brachii":        { front: ["biceps"] },
  "triceps":               { back: ["triceps"] },
  "triceps brachii":       { back: ["triceps"] },
  "forearm flexors":       { front: ["forearm_flexors"] },
  "forearm extensors":     { back: ["forearm_extensors"] },
  "rectus abdominis":      { front: ["rectus_abdominis"] },
  "abdominals":            { front: ["rectus_abdominis", "external_obliques"] },
  "external obliques":     { front: ["external_obliques"] },
  "obliques":              { front: ["external_obliques"] },
  "rhomboids":             { back: ["rhomboids"] },
  "latissimus dorsi":      { back: ["latissimus_dorsi"] },
  "lats":                  { back: ["latissimus_dorsi"] },
  "erector spinae":        { back: ["erector_spinae"] },
  "quadratus lumborum":    { back: ["quadratus_lumborum"] },
  "infraspinatus":         { back: ["infraspinatus"] },
  "teres major":           { back: ["teres_major"] },
  "hip flexors":           { front: ["hip_flexors", "iliopsoas"] },
  "iliopsoas":             { front: ["iliopsoas"] },
  "quadriceps":            { front: ["quadriceps"] },
  "rectus femoris":        { front: ["rectus_femoris"] },
  "vastus lateralis":      { front: ["vastus_lateralis"] },
  "vastus medialis":       { front: ["vastus_medialis"] },
  "vmo":                   { front: ["vastus_medialis"] },
  "adductors":             { front: ["adductors"] },
  "tfl":                   { front: ["tfl"] },
  "tensor fasciae latae":  { front: ["tfl"] },
  "itb":                   { front: ["tfl"] },
  "gluteus maximus":       { back: ["gluteus_maximus"] },
  "gluteus medius":        { back: ["gluteus_medius"] },
  "glutes":                { back: ["gluteus_maximus", "gluteus_medius"] },
  "piriformis":            { back: ["piriformis"] },
  "hamstrings":            { back: ["hamstrings"] },
  "biceps femoris":        { back: ["biceps_femoris"] },
  "gastrocnemius":         { back: ["gastrocnemius"] },
  "soleus":                { back: ["soleus"] },
  "calves":                { back: ["gastrocnemius", "soleus"] },
  "calf":                  { back: ["gastrocnemius", "soleus"] },
  "tibialis anterior":     { front: ["tibialis_anterior"] },
  "peroneus":              { front: ["peroneus"] },
};

function resolveHighlights(highlights: MuscleHighlight[], view: "front" | "back"): Map<string, MuscleHighlight> {
  const map = new Map<string, MuscleHighlight>();
  for (const h of highlights) {
    const muscleLower = h.muscle.toLowerCase().trim();
    const mapping = MUSCLE_NAME_MAP[muscleLower];
    if (!mapping) continue;
    const regionKeys = view === "front" ? (mapping.front || []) : (mapping.back || []);
    for (const key of regionKeys) {
      const sides = h.side === "bilateral" || !h.side ? ["_l", "_r"] : h.side === "left" ? ["_l"] : ["_r"];
      // Check if this region has sided variants
      const regions = view === "front" ? MUSCLE_REGIONS_FRONT : MUSCLE_REGIONS_BACK;
      if (regions[key]) {
        map.set(key, h);
      } else {
        for (const s of sides) {
          if (regions[key + s]) {
            map.set(key + s, h);
          }
        }
      }
    }
  }
  return map;
}

// ─── Main Component ───
export function AnatomicalAvatar({
  sex = "male",
  view: initialView = "front",
  highlights = [],
  motorPoints = [],
  width = 400,
  height = 600,
  showControls = true,
  showLegend = true,
  darkBg = true,
  className = "",
  allowUpload = false,
  onUploadComplete,
}: AnatomicalAvatarProps) {
  const [view, setView] = useState<"front" | "back">(initialView);
  const [currentSex, setCurrentSex] = useState<"male" | "female">(sex);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>({});
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAvatars = () => {
    fetch("/api/admin/body-assessments/generate-avatars")
      .then(r => r.ok ? r.json() : {})
      .then(data => setAvatarUrls(data))
      .catch(() => {});
  };

  useEffect(() => { fetchAvatars(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const key = `${currentSex}-${view}`;
      const formData = new FormData();
      formData.append("key", key);
      formData.append("file", file);
      const res = await fetch("/api/admin/body-assessments/generate-avatars", { method: "PUT", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrls(prev => ({ ...prev, [key]: data.url }));
        onUploadComplete?.();
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const avatarKey = `${currentSex}-${view}`;
  const avatarUrl = avatarUrls[avatarKey];
  const regions = view === "front" ? MUSCLE_REGIONS_FRONT : MUSCLE_REGIONS_BACK;
  const highlightMap = resolveHighlights(highlights, view);

  // Also map motorPoints to highlights
  const motorHighlights = new Map<string, { status: string; severity: number; name: string }>();
  for (const mp of motorPoints) {
    if (mp.status !== "normal") {
      motorHighlights.set(mp.name, { status: mp.status, severity: mp.severity, name: mp.name });
    }
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Controls */}
      {showControls && (
        <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button
              variant={view === "front" ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => setView("front")}
            >
              {view === "front" ? "●" : "○"} Front
            </Button>
            <Button
              variant={view === "back" ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => setView("back")}
            >
              {view === "back" ? "●" : "○"} Back
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              variant={currentSex === "male" ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => setCurrentSex("male")}
            >
              <User className="h-3 w-3 mr-0.5" /> M
            </Button>
            <Button
              variant={currentSex === "female" ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => setCurrentSex("female")}
            >
              <Users className="h-3 w-3 mr-0.5" /> F
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input for upload */}
      {allowUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      )}

      {/* Avatar Image or Fallback */}
      <div
        className={`w-full h-full rounded-xl overflow-hidden relative ${darkBg ? "bg-[#0a0e1a]" : "bg-muted"}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${currentSex} ${view} muscular anatomy`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <FallbackSVG sex={currentSex} view={view} width={width} height={height} />
        )}

        {/* Upload overlay for admin */}
        {allowUpload && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-end pb-12 opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-16"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 border border-white/20">
              {uploading ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4 text-white" />
              )}
              <span className="text-white text-xs font-medium">
                {uploading ? "Uploading..." : `Upload ${currentSex === "male" ? "♂" : "♀"} ${view}`}
              </span>
            </div>
          </div>
        )}

        {/* Color-coded muscle overlays */}
        {Array.from(highlightMap.entries()).map(([regionKey, highlight]) => {
          const region = regions[regionKey];
          if (!region) return null;
          const colors = STATUS_COLORS[highlight.status] || STATUS_COLORS.normal;
          const isHovered = hoveredMuscle === regionKey;
          return (
            <div
              key={regionKey}
              className="absolute transition-all duration-200 cursor-pointer rounded-sm"
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.w}%`,
                height: `${region.h}%`,
                background: colors.fill,
                boxShadow: isHovered ? `0 0 12px 4px ${colors.glow}` : `0 0 6px 2px ${colors.glow}`,
                border: `1px solid ${colors.glow}`,
                opacity: isHovered ? 1 : 0.8,
                zIndex: isHovered ? 15 : 10,
              }}
              onMouseEnter={() => setHoveredMuscle(regionKey)}
              onMouseLeave={() => setHoveredMuscle(null)}
            >
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/90 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-30 pointer-events-none">
                  <div className="font-bold">{highlight.muscle} ({highlight.side || "bilateral"})</div>
                  <div>{highlight.status} {highlight.severity && `— ${highlight.severity}`}</div>
                  {highlight.notes && <div className="text-gray-300">{highlight.notes}</div>}
                </div>
              )}
            </div>
          );
        })}

        {/* Motor point dots (from original system) */}
        {motorPoints.filter(p => p.status !== "normal").map((mp, i) => {
          const colors = STATUS_COLORS[mp.status] || STATUS_COLORS.normal;
          return (
            <div
              key={`mp-${i}`}
              className="absolute z-10 rounded-full"
              style={{
                left: `${mp.x * 100}%`,
                top: `${mp.y * 100}%`,
                width: 8,
                height: 8,
                transform: "translate(-50%, -50%)",
                background: colors.glow,
                boxShadow: `0 0 8px 3px ${colors.glow}`,
                border: "1.5px solid white",
              }}
              title={`${mp.name}: ${mp.status} (${mp.severity}/10)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && highlights.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 z-20 flex flex-wrap gap-1.5 justify-center">
          {Object.entries(STATUS_COLORS)
            .filter(([key]) => highlights.some(h => h.status === key) || key === "hypertonic" || key === "hypotonic")
            .slice(0, 4)
            .map(([key, val]) => (
              <Badge
                key={key}
                variant="outline"
                className="text-[8px] h-4 px-1.5 bg-black/60 border-white/20 text-white"
              >
                <span className="w-2 h-2 rounded-full mr-1 inline-block" style={{ background: val.glow }} />
                {val.label}
              </Badge>
            ))}
        </div>
      )}

      {/* Hovered muscle label */}
      {hoveredMuscle && !highlightMap.has(hoveredMuscle) && regions[hoveredMuscle] && (
        <div
          className="absolute z-30 bg-black/80 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none"
          style={{
            left: `${regions[hoveredMuscle].x + regions[hoveredMuscle].w / 2}%`,
            top: `${regions[hoveredMuscle].y}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {regions[hoveredMuscle].label}
        </div>
      )}
    </div>
  );
}

// ─── Fallback SVG (used when AI images haven't been generated yet) ───
function FallbackSVG({ sex, view, width, height }: { sex: string; view: string; width: number; height: number }) {
  const isFront = view === "front";
  const isFemale = sex === "female";

  // Muscle red/pink color scheme to match reference images
  const muscleBase = "#B04050";
  const muscleMid = "#C05060";
  const muscleLight = "#D06070";
  const tendon = "#E8D8C8";
  const bone = "#F0E8E0";

  return (
    <svg viewBox="0 0 200 300" className="w-full h-full" style={{ maxWidth: width, maxHeight: height }}>
      <defs>
        <linearGradient id="muscle-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={muscleLight} />
          <stop offset="50%" stopColor={muscleMid} />
          <stop offset="100%" stopColor={muscleBase} />
        </linearGradient>
        <linearGradient id="muscle-grad-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={muscleLight} />
          <stop offset="100%" stopColor={muscleBase} />
        </linearGradient>
        <filter id="muscle-shadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
          <feOffset dy="0.5" />
          <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Head */}
      <ellipse cx="100" cy="22" rx="16" ry="20" fill={muscleBase} filter="url(#muscle-shadow)" />
      <ellipse cx="100" cy="18" rx="14" ry="16" fill={muscleMid} />
      {/* Skull top */}
      <ellipse cx="100" cy="10" rx="13" ry="10" fill={bone} opacity="0.4" />

      {/* Neck */}
      <rect x="90" y="38" width="20" height="10" rx="3" fill={muscleMid} />
      {isFront && <>
        {/* SCM muscles */}
        <path d="M92,38 L86,50 L90,50 L95,40 Z" fill={muscleLight} opacity="0.8" />
        <path d="M108,38 L114,50 L110,50 L105,40 Z" fill={muscleLight} opacity="0.8" />
      </>}

      {isFront ? (
        <>
          {/* ── FRONT VIEW ── */}
          {/* Deltoids */}
          <path d="M72,50 C65,52 58,58 56,66 L68,64 L74,54 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />
          <path d="M128,50 C135,52 142,58 144,66 L132,64 L126,54 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />

          {/* Pectorals */}
          <path d={`M74,54 C78,50 90,48 100,${isFemale ? "56" : "52"} C110,48 122,50 126,54 L126,66 C120,72 110,${isFemale ? "74" : "70"} 100,${isFemale ? "72" : "68"} C90,${isFemale ? "74" : "70"} 80,72 74,66 Z`}
            fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          {/* Pec fiber lines */}
          <path d="M78,56 Q90,58 100,55" stroke={muscleBase} strokeWidth="0.3" fill="none" opacity="0.5" />
          <path d="M122,56 Q110,58 100,55" stroke={muscleBase} strokeWidth="0.3" fill="none" opacity="0.5" />

          {isFemale && <>
            <ellipse cx="88" cy="62" rx="8" ry="7" fill="#D4A060" opacity="0.6" />
            <ellipse cx="112" cy="62" rx="8" ry="7" fill="#D4A060" opacity="0.6" />
          </>}

          {/* Serratus */}
          <path d="M72,66 L68,64 L66,78 L74,76 Z" fill={muscleMid} opacity="0.7" />
          <path d="M128,66 L132,64 L134,78 L126,76 Z" fill={muscleMid} opacity="0.7" />

          {/* Biceps */}
          <path d="M56,66 C54,72 52,80 54,90 L62,90 C64,80 64,72 62,66 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />
          <path d="M144,66 C146,72 148,80 146,90 L138,90 C136,80 136,72 138,66 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />

          {/* Forearms */}
          <path d="M54,90 C52,100 50,110 48,120 L56,120 C58,110 60,100 62,90 Z" fill={muscleMid} />
          <path d="M146,90 C148,100 150,110 152,120 L144,120 C142,110 140,100 138,90 Z" fill={muscleMid} />
          {/* Hands / bones */}
          <ellipse cx="52" cy="124" rx="5" ry="6" fill={bone} opacity="0.5" />
          <ellipse cx="148" cy="124" rx="5" ry="6" fill={bone} opacity="0.5" />

          {/* Rectus Abdominis */}
          <rect x="90" y="70" width="20" height="40" rx="2" fill={muscleMid} opacity="0.9" />
          {/* Ab segments */}
          {[74, 80, 86, 92, 98].map(yy => (
            <line key={yy} x1="91" y1={yy} x2="109" y2={yy} stroke={tendon} strokeWidth="0.5" opacity="0.6" />
          ))}
          <line x1="100" y1="70" x2="100" y2="110" stroke={tendon} strokeWidth="0.5" opacity="0.4" />

          {/* External Obliques */}
          <path d="M74,66 L72,80 L80,106 L90,104 L88,72 Z" fill={muscleBase} opacity="0.7" />
          <path d="M126,66 L128,80 L120,106 L110,104 L112,72 Z" fill={muscleBase} opacity="0.7" />

          {/* Pelvis / Hip area */}
          <path d={`M80,106 L74,118 L82,120 L90,112 Z`} fill={muscleMid} opacity="0.6" />
          <path d={`M120,106 L126,118 L118,120 L110,112 Z`} fill={muscleMid} opacity="0.6" />

          {/* Quadriceps */}
          <path d="M78,120 C76,140 76,160 78,180 L92,180 C94,160 94,140 92,120 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          <path d="M108,120 C106,140 106,160 108,180 L122,180 C124,160 124,140 122,120 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          {/* Quad separations */}
          <line x1="85" y1="125" x2="85" y2="175" stroke={tendon} strokeWidth="0.3" opacity="0.4" />
          <line x1="115" y1="125" x2="115" y2="175" stroke={tendon} strokeWidth="0.3" opacity="0.4" />

          {/* Knee caps */}
          <ellipse cx="85" cy="182" rx="5" ry="4" fill={bone} opacity="0.4" />
          <ellipse cx="115" cy="182" rx="5" ry="4" fill={bone} opacity="0.4" />

          {/* Adductors */}
          <path d="M92,120 L96,170 L100,170 L100,118 Z" fill={muscleBase} opacity="0.5" />
          <path d="M108,120 L104,170 L100,170 L100,118 Z" fill={muscleBase} opacity="0.5" />

          {/* Tibialis / Lower leg front */}
          <path d="M78,186 C76,210 76,230 78,250 L88,250 C90,230 90,210 88,186 Z" fill={muscleMid} />
          <path d="M112,186 C110,210 110,230 112,250 L122,250 C124,230 124,210 122,186 Z" fill={muscleMid} />

          {/* Ankles/Feet bones */}
          <ellipse cx="83" cy="254" rx="7" ry="4" fill={bone} opacity="0.4" />
          <ellipse cx="117" cy="254" rx="7" ry="4" fill={bone} opacity="0.4" />
          <path d="M76,258 L90,258 L92,264 L74,264 Z" fill={muscleBase} opacity="0.5" />
          <path d="M110,258 L124,258 L126,264 L108,264 Z" fill={muscleBase} opacity="0.5" />
        </>
      ) : (
        <>
          {/* ── BACK VIEW ── */}
          {/* Trapezius */}
          <path d="M84,44 L100,38 L116,44 L120,60 L100,68 L80,60 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />
          {/* Trap fiber lines */}
          <path d="M100,40 L88,48" stroke={tendon} strokeWidth="0.3" fill="none" opacity="0.4" />
          <path d="M100,40 L112,48" stroke={tendon} strokeWidth="0.3" fill="none" opacity="0.4" />
          <path d="M100,48 L86,56" stroke={tendon} strokeWidth="0.3" fill="none" opacity="0.4" />
          <path d="M100,48 L114,56" stroke={tendon} strokeWidth="0.3" fill="none" opacity="0.4" />

          {/* Posterior Deltoids */}
          <path d="M72,50 C65,54 58,60 56,68 L68,66 L76,56 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />
          <path d="M128,50 C135,54 142,60 144,68 L132,66 L124,56 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />

          {/* Infraspinatus */}
          <path d="M76,56 L68,66 L74,76 L86,70 L84,58 Z" fill={muscleMid} opacity="0.8" />
          <path d="M124,56 L132,66 L126,76 L114,70 L116,58 Z" fill={muscleMid} opacity="0.8" />

          {/* Rhomboids (under trap) */}
          <path d="M90,50 L96,48 L98,64 L90,66 Z" fill={muscleBase} opacity="0.6" />
          <path d="M110,50 L104,48 L102,64 L110,66 Z" fill={muscleBase} opacity="0.6" />

          {/* Latissimus Dorsi */}
          <path d="M74,68 L70,82 L78,106 L96,100 L92,72 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          <path d="M126,68 L130,82 L122,106 L104,100 L108,72 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          {/* Lat fiber lines */}
          <path d="M76,72 L90,92" stroke={muscleBase} strokeWidth="0.3" fill="none" opacity="0.4" />
          <path d="M124,72 L110,92" stroke={muscleBase} strokeWidth="0.3" fill="none" opacity="0.4" />

          {/* Erector Spinae / Spine */}
          <rect x="95" y="46" width="10" height="60" rx="2" fill={muscleMid} opacity="0.7" />
          {/* Spine bumps */}
          {[50, 56, 62, 68, 74, 80, 86, 92, 98].map(yy => (
            <circle key={yy} cx="100" cy={yy} r="1" fill={bone} opacity="0.4" />
          ))}

          {/* Triceps */}
          <path d="M56,68 C54,76 52,84 54,94 L62,94 C64,84 64,76 62,68 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />
          <path d="M144,68 C146,76 148,84 146,94 L138,94 C136,84 136,76 138,68 Z" fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />

          {/* Forearms */}
          <path d="M54,94 C52,104 50,114 48,124 L56,124 C58,114 60,104 62,94 Z" fill={muscleMid} />
          <path d="M146,94 C148,104 150,114 152,124 L144,124 C142,114 140,104 138,94 Z" fill={muscleMid} />
          <ellipse cx="52" cy="128" rx="5" ry="6" fill={bone} opacity="0.5" />
          <ellipse cx="148" cy="128" rx="5" ry="6" fill={bone} opacity="0.5" />

          {/* Sacrum */}
          <path d="M94,106 L100,114 L106,106 Z" fill={bone} opacity="0.4" />

          {/* Glutes */}
          <path d={`M78,106 C74,114 72,122 76,130 L96,130 C98,122 96,114 92,108 Z`} fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />
          <path d={`M122,106 C126,114 128,122 124,130 L104,130 C102,122 104,114 108,108 Z`} fill="url(#muscle-grad)" filter="url(#muscle-shadow)" />
          {/* Gluteal fold */}
          <path d="M78,130 Q100,136 122,130" stroke={muscleBase} strokeWidth="0.5" fill="none" opacity="0.5" />

          {/* Hamstrings */}
          <path d="M78,132 C76,150 76,168 78,184 L92,184 C94,168 94,150 92,132 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          <path d="M108,132 C106,150 106,168 108,184 L122,184 C124,168 124,150 122,132 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          {/* Hamstring separations */}
          <line x1="85" y1="136" x2="85" y2="180" stroke={tendon} strokeWidth="0.3" opacity="0.4" />
          <line x1="115" y1="136" x2="115" y2="180" stroke={tendon} strokeWidth="0.3" opacity="0.4" />

          {/* Knee back */}
          <path d="M78,184 Q85,188 92,184" stroke={tendon} strokeWidth="0.5" fill="none" opacity="0.5" />
          <path d="M108,184 Q115,188 122,184" stroke={tendon} strokeWidth="0.5" fill="none" opacity="0.5" />

          {/* Gastrocnemius / Calves */}
          <path d="M78,188 C76,200 76,216 80,230 L90,230 C94,216 94,200 92,188 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          <path d="M108,188 C106,200 106,216 110,230 L120,230 C124,216 124,200 122,188 Z" fill="url(#muscle-grad-v)" filter="url(#muscle-shadow)" />
          {/* Calf separation */}
          <line x1="85" y1="190" x2="85" y2="226" stroke={tendon} strokeWidth="0.3" opacity="0.3" />
          <line x1="115" y1="190" x2="115" y2="226" stroke={tendon} strokeWidth="0.3" opacity="0.3" />

          {/* Achilles */}
          <line x1="85" y1="230" x2="85" y2="250" stroke={tendon} strokeWidth="1.5" opacity="0.6" />
          <line x1="115" y1="230" x2="115" y2="250" stroke={tendon} strokeWidth="1.5" opacity="0.6" />

          {/* Feet */}
          <ellipse cx="85" cy="254" rx="7" ry="4" fill={bone} opacity="0.4" />
          <ellipse cx="115" cy="254" rx="7" ry="4" fill={bone} opacity="0.4" />
          <path d="M78,258 L92,258 L94,264 L76,264 Z" fill={muscleBase} opacity="0.5" />
          <path d="M108,258 L122,258 L124,264 L106,264 Z" fill={muscleBase} opacity="0.5" />
        </>
      )}
    </svg>
  );
}

export default AnatomicalAvatar;
