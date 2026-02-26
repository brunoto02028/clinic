"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bone,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpDown,
  Eye,
} from "lucide-react";

// ========== Types ==========

interface ScoliosisScreening {
  shoulderHeightDiff: string;
  scapularProminence: string;
  waistlineAsymmetry: string;
  trunkShift: string;
  estimatedCobbAngle: number;
  classification: "none" | "functional" | "structural";
  severity: "none" | "mild" | "moderate" | "severe";
  adamsTestPrediction: string;
  notes: string;
}

interface ScoliosisPanelProps {
  screening: ScoliosisScreening;
}

// ========== Helpers ==========

const SEVERITY_CONFIG = {
  none: { color: "#22C55E", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", label: "No Scoliosis Detected", icon: CheckCircle2 },
  mild: { color: "#EAB308", bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20", label: "Mild Scoliosis Signs", icon: Info },
  moderate: { color: "#F97316", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20", label: "Moderate Scoliosis Signs", icon: AlertTriangle },
  severe: { color: "#EF4444", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20", label: "Significant Scoliosis Signs", icon: AlertTriangle },
};

const CLASS_CONFIG = {
  none: { label: "None", color: "#22C55E" },
  functional: { label: "Functional", color: "#EAB308" },
  structural: { label: "Structural", color: "#EF4444" },
};

function CobbAngleGauge({ angle }: { angle: number }) {
  const maxAngle = 50;
  const normalized = Math.min(1, Math.abs(angle) / maxAngle);
  const color = angle === 0 ? "#22C55E" : angle <= 10 ? "#EAB308" : angle <= 25 ? "#F97316" : "#EF4444";
  const label = angle === 0 ? "Normal" : angle <= 10 ? "Mild" : angle <= 25 ? "Moderate" : "Severe";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          <circle
            cx="50" cy="50" r="42"
            fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${normalized * 264} 264`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{angle}°</span>
          <span className="text-[9px] text-muted-foreground">Cobb</span>
        </div>
      </div>
      <Badge variant="outline" className="text-[10px]" style={{ borderColor: color, color }}>
        {label}
      </Badge>
    </div>
  );
}

// ========== Spine Illustration ==========

function SpineIllustration({ severity, cobbAngle }: { severity: string; cobbAngle: number }) {
  const curvature = Math.min(20, cobbAngle * 0.5);
  const color = severity === "none" ? "#22C55E" : severity === "mild" ? "#EAB308" : severity === "moderate" ? "#F97316" : "#EF4444";

  return (
    <svg viewBox="0 0 60 160" className="w-12 h-32">
      {/* Normal spine reference (dashed) */}
      <line x1="30" y1="10" x2="30" y2="150" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />

      {/* Curved spine */}
      <path
        d={`M30,10 C${30 + curvature},50 ${30 - curvature},100 30,150`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Vertebrae dots */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = i / 7;
        const baseY = 10 + t * 140;
        const offset = Math.sin(t * Math.PI) * curvature * (t < 0.5 ? 1 : -1);
        return (
          <circle
            key={i}
            cx={30 + offset}
            cy={baseY}
            r={2.5}
            fill={color}
            fillOpacity={0.8}
          />
        );
      })}

      {/* Shoulder markers */}
      <line x1="15" y1="25" x2="45" y2={25 + (cobbAngle > 0 ? 3 : 0)} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Hip markers */}
      <line x1="18" y1="120" x2="42" y2={120 + (cobbAngle > 0 ? 2 : 0)} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ========== Main Component ==========

export function ScoliosisPanel({ screening }: ScoliosisPanelProps) {
  const sevConfig = SEVERITY_CONFIG[screening.severity] || SEVERITY_CONFIG.none;
  const classConfig = CLASS_CONFIG[screening.classification] || CLASS_CONFIG.none;
  const SevIcon = sevConfig.icon;

  const checkpoints = [
    { label: "Shoulder Height", value: screening.shoulderHeightDiff, icon: "⬆️" },
    { label: "Scapular Prominence", value: screening.scapularProminence, icon: "🦴" },
    { label: "Waistline Asymmetry", value: screening.waistlineAsymmetry, icon: "📐" },
    { label: "Trunk Shift", value: screening.trunkShift, icon: "↔️" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bone className="w-4 h-4 text-violet-500" />
            Scoliosis Screening
          </CardTitle>
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${sevConfig.bg}`} style={{ color: sevConfig.color }}>
            <SevIcon className="w-3 h-3 mr-1" />
            {sevConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top section: Spine + Cobb angle */}
        <div className="flex items-center gap-6">
          <SpineIllustration severity={screening.severity} cobbAngle={screening.estimatedCobbAngle} />
          <CobbAngleGauge angle={screening.estimatedCobbAngle} />
          <div className="flex-1 space-y-2">
            <div className="rounded-lg bg-muted/50 border p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Classification</p>
              <p className="text-sm font-semibold" style={{ color: classConfig.color }}>
                {classConfig.label}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 border p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Adams Test Prediction</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{screening.adamsTestPrediction || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Checkpoints */}
        <div className="grid grid-cols-2 gap-2">
          {checkpoints.map((cp, i) => (
            <div key={i} className="rounded-lg bg-muted/50 border p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{cp.icon}</span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{cp.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{cp.value || "Not assessed"}</p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {screening.notes && (
          <div className="rounded-lg bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/10 p-3 flex items-start gap-2">
            <Eye className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">Clinical Notes</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{screening.notes}</p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400/70 leading-relaxed">
            This AI screening is for preliminary assessment only. A definitive scoliosis diagnosis requires standing full-spine radiography (X-ray) with proper Cobb angle measurement. Please refer to a specialist if moderate/severe signs are detected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScoliosisPanel;
