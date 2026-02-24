"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Calendar,
  Loader2,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

interface ScanComparisonProps {
  scanId: string;
}

interface ComparisonData {
  patient: { name: string };
  current: ScanMetrics;
  previousScans: ScanMetrics[];
  totalScans: number;
  trends: {
    comparedTo: string;
    comparedDate: string;
    changes: Record<string, { current: number; previous: number; delta: number } | null>;
  } | null;
}

interface ScanMetrics {
  id: string;
  scanNumber: string;
  date?: string;
  createdAt?: string;
  status: string;
  archType?: string | null;
  archIndex?: number | null;
  pronation?: string | null;
  calcanealAlignment?: number | null;
  halluxValgusAngle?: number | null;
  metatarsalSpread?: number | null;
  navicularHeight?: number | null;
  leftFootLength?: number | null;
  rightFootLength?: number | null;
  leftFootWidth?: number | null;
  rightFootWidth?: number | null;
  leftArchHeight?: number | null;
  rightArchHeight?: number | null;
  strideLength?: number | null;
  cadence?: number | null;
  leftFootImages?: string[] | null;
  rightFootImages?: string[] | null;
}

function TrendIcon({ delta, inverse = false }: { delta: number; inverse?: boolean }) {
  const improved = inverse ? delta < 0 : delta > 0;
  const worsened = inverse ? delta > 0 : delta < 0;

  if (Math.abs(delta) < 0.5) {
    return <Minus className="h-3 w-3 text-slate-400" />;
  }
  if (improved) {
    return <TrendingUp className="h-3 w-3 text-green-500" />;
  }
  if (worsened) {
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  }
  return <Minus className="h-3 w-3 text-slate-400" />;
}

function DeltaBadge({ delta, unit = "", inverse = false }: { delta: number; unit?: string; inverse?: boolean }) {
  const improved = inverse ? delta < 0 : delta > 0;
  const worsened = inverse ? delta > 0 : delta < 0;
  const color = Math.abs(delta) < 0.5 ? "bg-slate-100 text-slate-600" :
    improved ? "bg-green-100 text-green-700" : worsened ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600";

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}{unit}
    </span>
  );
}

function MetricRow({
  label,
  current,
  previous,
  unit = "",
  inverse = false,
}: {
  label: string;
  current: number | null | undefined;
  previous: number | null | undefined;
  unit?: string;
  inverse?: boolean;
}) {
  if (current == null && previous == null) return null;
  const delta = current != null && previous != null ? current - previous : null;

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-600 flex-1">{label}</span>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-400 w-16 text-right">
          {previous != null ? `${previous.toFixed(1)}${unit}` : "—"}
        </span>
        <ArrowRight className="h-3 w-3 text-slate-300" />
        <span className="font-semibold w-16 text-right">
          {current != null ? `${current.toFixed(1)}${unit}` : "—"}
        </span>
        {delta != null && (
          <div className="flex items-center gap-1 w-20">
            <TrendIcon delta={delta} inverse={inverse} />
            <DeltaBadge delta={delta} unit={unit} inverse={inverse} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanComparison({ scanId }: ScanComparisonProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrevId, setSelectedPrevId] = useState<string>("");

  useEffect(() => {
    fetchComparison();
  }, [scanId]);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/foot-scans/${scanId}/compare`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to load comparison");
        return;
      }
      const result = await res.json();
      setData(result);
      if (result.previousScans.length > 0) {
        setSelectedPrevId(result.previousScans[0].id);
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {error || "No comparison data available."}
        </CardContent>
      </Card>
    );
  }

  if (data.previousScans.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No Previous Scans</p>
          <p className="text-xs text-muted-foreground mt-1">
            This is {data.patient.name}&apos;s first scan. Comparison will be available after their next scan.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedPrev = data.previousScans.find(s => s.id === selectedPrevId) || data.previousScans[0];
  const current = data.current;
  const prevDate = new Date(selectedPrev.createdAt || selectedPrev.date || "").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const currDate = new Date(current.date || current.createdAt || "").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Scan selector */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Comparing current scan with:</p>
          <Select value={selectedPrevId} onValueChange={setSelectedPrevId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.previousScans.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.scanNumber} — {new Date(s.createdAt || s.date || "").toLocaleDateString("en-GB")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {data.totalScans} total scans
        </Badge>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2 text-[10px] bg-slate-50 rounded-lg p-2">
        <Calendar className="h-3 w-3 text-slate-400" />
        <span className="text-slate-500">{prevDate}</span>
        <div className="flex-1 h-px bg-slate-300 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
        </div>
        <span className="font-semibold text-primary">{currDate}</span>
      </div>

      {/* Overview comparison */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-slate-200">
          <CardHeader className="py-2 px-3 bg-slate-50">
            <CardTitle className="text-[10px] uppercase text-slate-500">Previous ({selectedPrev.scanNumber})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Arch:</span><span className="font-medium">{selectedPrev.archType || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pronation:</span><span className="font-medium">{selectedPrev.pronation || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">L Length:</span><span className="font-medium">{selectedPrev.leftFootLength ? `${selectedPrev.leftFootLength}mm` : "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">R Length:</span><span className="font-medium">{selectedPrev.rightFootLength ? `${selectedPrev.rightFootLength}mm` : "N/A"}</span></div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardHeader className="py-2 px-3 bg-primary/5">
            <CardTitle className="text-[10px] uppercase text-primary">Current ({current.scanNumber})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Arch:</span><span className="font-medium">{current.archType || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pronation:</span><span className="font-medium">{current.pronation || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">L Length:</span><span className="font-medium">{current.leftFootLength ? `${current.leftFootLength}mm` : "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">R Length:</span><span className="font-medium">{current.rightFootLength ? `${current.rightFootLength}mm` : "N/A"}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed metrics comparison */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs">Detailed Measurements Comparison</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="mb-2 flex items-center gap-4 text-[9px] text-slate-400">
            <span className="flex-1" />
            <span className="w-16 text-right">Previous</span>
            <span className="w-4" />
            <span className="w-16 text-right font-semibold text-slate-600">Current</span>
            <span className="w-20">Change</span>
          </div>

          <MetricRow label="Left Foot Length" current={current.leftFootLength} previous={selectedPrev.leftFootLength} unit="mm" />
          <MetricRow label="Right Foot Length" current={current.rightFootLength} previous={selectedPrev.rightFootLength} unit="mm" />
          <MetricRow label="Left Foot Width" current={current.leftFootWidth} previous={selectedPrev.leftFootWidth} unit="mm" />
          <MetricRow label="Right Foot Width" current={current.rightFootWidth} previous={selectedPrev.rightFootWidth} unit="mm" />
          <MetricRow label="Left Arch Height" current={current.leftArchHeight} previous={selectedPrev.leftArchHeight} unit="mm" />
          <MetricRow label="Right Arch Height" current={current.rightArchHeight} previous={selectedPrev.rightArchHeight} unit="mm" />
          <MetricRow label="Arch Index" current={current.archIndex} previous={selectedPrev.archIndex} />
          <MetricRow label="Calcaneal Alignment" current={current.calcanealAlignment} previous={selectedPrev.calcanealAlignment} unit="°" inverse />
          <MetricRow label="Hallux Valgus Angle" current={current.halluxValgusAngle} previous={selectedPrev.halluxValgusAngle} unit="°" inverse />
          <MetricRow label="Metatarsal Spread" current={current.metatarsalSpread} previous={selectedPrev.metatarsalSpread} unit="mm" />
          <MetricRow label="Navicular Height" current={current.navicularHeight} previous={selectedPrev.navicularHeight} unit="mm" />
          <MetricRow label="Stride Length" current={current.strideLength} previous={selectedPrev.strideLength} unit="mm" />
          <MetricRow label="Cadence" current={current.cadence} previous={selectedPrev.cadence} unit=" spm" />
        </CardContent>
      </Card>

      {/* Significant changes alert */}
      {data.trends && (() => {
        const significantChanges: string[] = [];
        const ch = data.trends.changes;
        if (ch.calcanealAlignment && Math.abs(ch.calcanealAlignment.delta) > 2) {
          significantChanges.push(`Calcaneal alignment changed by ${ch.calcanealAlignment.delta > 0 ? "+" : ""}${ch.calcanealAlignment.delta.toFixed(1)}°`);
        }
        if (ch.halluxValgusAngle && Math.abs(ch.halluxValgusAngle.delta) > 3) {
          significantChanges.push(`Hallux valgus angle changed by ${ch.halluxValgusAngle.delta > 0 ? "+" : ""}${ch.halluxValgusAngle.delta.toFixed(1)}°`);
        }
        if (ch.leftArchHeight && Math.abs(ch.leftArchHeight.delta) > 2) {
          significantChanges.push(`Left arch height changed by ${ch.leftArchHeight.delta > 0 ? "+" : ""}${ch.leftArchHeight.delta.toFixed(1)}mm`);
        }
        if (ch.rightArchHeight && Math.abs(ch.rightArchHeight.delta) > 2) {
          significantChanges.push(`Right arch height changed by ${ch.rightArchHeight.delta > 0 ? "+" : ""}${ch.rightArchHeight.delta.toFixed(1)}mm`);
        }

        if (significantChanges.length === 0) return null;

        return (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-3 pb-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-1">Significant Changes Detected</p>
                  <ul className="text-[10px] text-amber-700 space-y-0.5">
                    {significantChanges.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
