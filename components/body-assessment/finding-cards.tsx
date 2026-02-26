"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Bone,
  Eye,
  Footprints,
  ArrowUpDown,
  Zap,
} from "lucide-react";

// ========== Types ==========

interface Finding {
  area: string;
  finding: string;
  severity: "mild" | "moderate" | "severe";
  recommendation: string;
  icon?: "alert" | "warning" | "info" | "check";
  category?: "posture" | "symmetry" | "mobility" | "alignment" | "scoliosis";
}

interface FindingCardsProps {
  findings: Finding[];
  title?: string;
  compact?: boolean;
}

// ========== Helpers ==========

const SEVERITY_CONFIG = {
  severe: {
    color: "#EF4444",
    bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
    badge: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/30",
    label: "Severe",
    icon: AlertTriangle,
  },
  moderate: {
    color: "#F97316",
    bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20",
    badge: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30",
    label: "Moderate",
    icon: AlertCircle,
  },
  mild: {
    color: "#EAB308",
    bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20",
    badge: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30",
    label: "Mild",
    icon: Info,
  },
};

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  posture: { icon: ArrowUpDown, color: "#8B5CF6", label: "Posture" },
  symmetry: { icon: Activity, color: "#06B6D4", label: "Symmetry" },
  mobility: { icon: Zap, color: "#F59E0B", label: "Mobility" },
  alignment: { icon: Bone, color: "#10B981", label: "Alignment" },
  scoliosis: { icon: Eye, color: "#EC4899", label: "Scoliosis" },
};

function getSeverityOrder(severity: string): number {
  switch (severity) {
    case "severe": return 0;
    case "moderate": return 1;
    case "mild": return 2;
    default: return 3;
  }
}

// ========== Individual Finding Card ==========

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const severity = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.mild;
  const SeverityIcon = severity.icon;
  const category = finding.category ? CATEGORY_CONFIG[finding.category] : null;
  const CategoryIcon = category?.icon || Activity;

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${severity.bg} ${
        expanded ? "ring-1 ring-primary/20" : ""
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        {/* Severity icon */}
        <div
          className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: `${severity.color}20` }}
        >
          <SeverityIcon className="w-3.5 h-3.5" style={{ color: severity.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{finding.area}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${severity.badge}`}>
              {severity.label}
            </Badge>
            {category && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-white/10"
                style={{ color: category.color }}
              >
                <CategoryIcon className="w-2.5 h-2.5 mr-0.5" />
                {category.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{finding.finding}</p>
        </div>

        {/* Expand toggle */}
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded recommendation */}
      {expanded && finding.recommendation && (
        <div className="px-3 pb-3 pt-0 ml-10">
          <div className="rounded-md bg-muted/50 border border-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide">
                Recommendation
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{finding.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Main Component ==========

export function FindingCards({ findings, title, compact = false }: FindingCardsProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort by severity
  const sorted = [...findings].sort(
    (a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity)
  );

  const displayList = compact && !showAll ? sorted.slice(0, 4) : sorted;

  const severityCounts = {
    severe: findings.filter((f) => f.severity === "severe").length,
    moderate: findings.filter((f) => f.severity === "moderate").length,
    mild: findings.filter((f) => f.severity === "mild").length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            {title || "Clinical Findings"}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {severityCounts.severe > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                {severityCounts.severe} severe
              </Badge>
            )}
            {severityCounts.moderate > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30">
                {severityCounts.moderate} moderate
              </Badge>
            )}
            {severityCounts.mild > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {severityCounts.mild} mild
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayList.map((finding, i) => (
            <FindingCard key={i} finding={finding} index={i} />
          ))}
        </div>

        {compact && sorted.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 w-full text-center text-xs text-primary hover:text-primary/80 transition-colors py-1.5"
          >
            {showAll ? "Show less" : `Show all ${sorted.length} findings`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default FindingCards;
