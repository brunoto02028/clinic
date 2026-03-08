"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pencil,
  Save,
  X,
} from "lucide-react";

// ========== Types ==========

interface Finding {
  area: string;
  finding: string;
  severity: "mild" | "moderate" | "severe";
  recommendation: string;
  icon?: "alert" | "warning" | "info" | "check";
  category?: "posture" | "symmetry" | "mobility" | "alignment" | "scoliosis";
  editedByTherapist?: boolean;
}

interface FindingCardsProps {
  findings: Finding[];
  title?: string;
  compact?: boolean;
  editable?: boolean;
  onSaveFindings?: (findings: Finding[]) => void;
  locale?: string;
}

// ========== Helpers ==========

const SEVERITY_CONFIG_I18N: Record<string, Record<string, { label: string }>> = {
  "en-GB": { severe: { label: "Severe" }, moderate: { label: "Moderate" }, mild: { label: "Mild" } },
  "pt-BR": { severe: { label: "Severo" }, moderate: { label: "Moderado" }, mild: { label: "Leve" } },
};

const SEVERITY_CONFIG = {
  severe: {
    color: "#EF4444",
    bg: "bg-red-500/10 border-red-500/25",
    badge: "bg-red-500/15 text-red-500 border-red-500/30",
    label: "Severe",
    icon: AlertTriangle,
  },
  moderate: {
    color: "#F97316",
    bg: "bg-orange-500/10 border-orange-500/25",
    badge: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    label: "Moderate",
    icon: AlertCircle,
  },
  mild: {
    color: "#EAB308",
    bg: "bg-yellow-500/10 border-yellow-500/25",
    badge: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    label: "Mild",
    icon: Info,
  },
};

const CATEGORY_CONFIG_I18N: Record<string, Record<string, string>> = {
  "en-GB": { posture: "Posture", symmetry: "Symmetry", mobility: "Mobility", alignment: "Alignment", scoliosis: "Scoliosis" },
  "pt-BR": { posture: "Postura", symmetry: "Simetria", mobility: "Mobilidade", alignment: "Alinhamento", scoliosis: "Escoliose" },
};

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  posture: { icon: ArrowUpDown, color: "#8B5CF6", label: "Posture" },
  symmetry: { icon: Activity, color: "#06B6D4", label: "Symmetry" },
  mobility: { icon: Zap, color: "#F59E0B", label: "Mobility" },
  alignment: { icon: Bone, color: "#10B981", label: "Alignment" },
  scoliosis: { icon: Eye, color: "#EC4899", label: "Scoliosis" },
};

const LABELS_I18N: Record<string, Record<string, string>> = {
  "en-GB": {
    clinicalFindings: "Clinical Findings",
    recommendation: "Recommendation",
    showAll: "Show all",
    findings: "findings",
    showLess: "Show less",
    edited: "Edited",
    ai: "AI",
    editFinding: "Edit finding",
    save: "Save",
    cancel: "Cancel",
    area: "Area",
    description: "Description",
    severity: "Severity",
    recommendationLabel: "Recommendation",
    category: "Category",
  },
  "pt-BR": {
    clinicalFindings: "Achados Clínicos",
    recommendation: "Recomendação",
    showAll: "Mostrar todos",
    findings: "achados",
    showLess: "Mostrar menos",
    edited: "Editado",
    ai: "IA",
    editFinding: "Editar achado",
    save: "Salvar",
    cancel: "Cancelar",
    area: "Área",
    description: "Descrição",
    severity: "Severidade",
    recommendationLabel: "Recomendação",
    category: "Categoria",
  },
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

function FindingCard({ finding, index, editable, onEdit, locale }: { finding: Finding; index: number; editable?: boolean; onEdit?: (index: number, updated: Finding) => void; locale?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Finding>({ ...finding });
  const severity = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.mild;
  const SeverityIcon = severity.icon;
  const category = finding.category ? CATEGORY_CONFIG[finding.category] : null;
  const CategoryIcon = category?.icon || Activity;
  const L = LABELS_I18N[locale || "en-GB"] || LABELS_I18N["en-GB"];
  const sevI18n = SEVERITY_CONFIG_I18N[locale || "en-GB"] || SEVERITY_CONFIG_I18N["en-GB"];
  const catI18n = CATEGORY_CONFIG_I18N[locale || "en-GB"] || CATEGORY_CONFIG_I18N["en-GB"];

  const handleSave = () => {
    onEdit?.(index, { ...editData, editedByTherapist: true });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={`rounded-lg border p-3 space-y-3 ${severity.bg} ring-2 ring-primary/30`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary">{L.editFinding}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5 mr-1" /> {L.cancel}
            </Button>
            <Button size="sm" className="h-7 px-2" onClick={handleSave}>
              <Save className="w-3.5 h-3.5 mr-1" /> {L.save}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">{L.area}</label>
            <Input className="h-8 text-xs" value={editData.area} onChange={(e) => setEditData({ ...editData, area: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">{L.severity}</label>
              <Select value={editData.severity} onValueChange={(v) => setEditData({ ...editData, severity: v as any })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">{sevI18n.mild?.label}</SelectItem>
                  <SelectItem value="moderate">{sevI18n.moderate?.label}</SelectItem>
                  <SelectItem value="severe">{sevI18n.severe?.label}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">{L.category}</label>
              <Select value={editData.category || ""} onValueChange={(v) => setEditData({ ...editData, category: v as any })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(catI18n).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">{L.description}</label>
          <Textarea className="text-xs min-h-[60px]" value={editData.finding} onChange={(e) => setEditData({ ...editData, finding: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">{L.recommendationLabel}</label>
          <Textarea className="text-xs min-h-[60px]" value={editData.recommendation} onChange={(e) => setEditData({ ...editData, recommendation: e.target.value })} />
        </div>
      </div>
    );
  }

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
              {sevI18n[finding.severity]?.label || severity.label}
            </Badge>
            {category && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-white/10"
                style={{ color: category.color }}
              >
                <CategoryIcon className="w-2.5 h-2.5 mr-0.5" />
                {catI18n[finding.category!] || category.label}
              </Badge>
            )}
            {finding.editedByTherapist && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Pencil className="w-2 h-2 mr-0.5" /> {L.edited}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{finding.finding}</p>
        </div>

        {/* Edit + Expand toggle */}
        <div className="flex-shrink-0 mt-1 flex items-center gap-1">
          {editable && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditData({ ...finding }); setEditing(true); }}
              className="p-1 rounded hover:bg-muted/50 transition-colors"
              title={L.editFinding}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
            </button>
          )}
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
                {L.recommendation}
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

export function FindingCards({ findings, title, compact = false, editable = false, onSaveFindings, locale }: FindingCardsProps) {
  const [showAll, setShowAll] = useState(false);
  const [localFindings, setLocalFindings] = useState<Finding[]>(findings);
  const L = LABELS_I18N[locale || "en-GB"] || LABELS_I18N["en-GB"];
  const sevI18n = SEVERITY_CONFIG_I18N[locale || "en-GB"] || SEVERITY_CONFIG_I18N["en-GB"];

  // Sort by severity
  const sorted = [...localFindings].sort(
    (a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity)
  );

  const displayList = compact && !showAll ? sorted.slice(0, 4) : sorted;

  const severityCounts = {
    severe: localFindings.filter((f) => f.severity === "severe").length,
    moderate: localFindings.filter((f) => f.severity === "moderate").length,
    mild: localFindings.filter((f) => f.severity === "mild").length,
  };

  const handleEditFinding = (index: number, updated: Finding) => {
    const newFindings = [...localFindings];
    // Find the actual index in localFindings (since displayList is sorted)
    const sortedItem = sorted[index];
    const realIndex = localFindings.findIndex((f) => f === sortedItem);
    if (realIndex >= 0) {
      newFindings[realIndex] = updated;
    }
    setLocalFindings(newFindings);
    onSaveFindings?.(newFindings);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            {title || L.clinicalFindings}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {severityCounts.severe > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                {severityCounts.severe} {sevI18n.severe?.label?.toLowerCase()}
              </Badge>
            )}
            {severityCounts.moderate > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/20 text-orange-400 border-orange-500/30">
                {severityCounts.moderate} {sevI18n.moderate?.label?.toLowerCase()}
              </Badge>
            )}
            {severityCounts.mild > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {severityCounts.mild} {sevI18n.mild?.label?.toLowerCase()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayList.map((finding, i) => (
            <FindingCard key={i} finding={finding} index={i} editable={editable} onEdit={handleEditFinding} locale={locale} />
          ))}
        </div>

        {compact && sorted.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 w-full text-center text-xs text-primary hover:text-primary/80 transition-colors py-1.5"
          >
            {showAll ? L.showLess : `${L.showAll} ${sorted.length} ${L.findings}`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default FindingCards;
