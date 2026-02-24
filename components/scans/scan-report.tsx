"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  Footprints,
  Activity,
  Ruler,
  AlertTriangle,
  CheckCircle,
  Info,
  Shirt,
  ShoppingBag,
} from "lucide-react";
import { getProductRecommendation } from "@/lib/product-catalog";

interface ScanReportProps {
  report: any;
  onClose?: () => void;
}

// Pressure bar component
function PressureBar({ label, value, max = 1, color }: { label: string; value: number | null; max?: number; color?: string }) {
  if (value == null) return null;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold">{typeof value === 'number' ? value.toFixed(1) : value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color || '#607d7d' }}
        />
      </div>
    </div>
  );
}

// Risk indicator
function RiskIndicator({ level }: { level: "low" | "medium" | "high" }) {
  const config = {
    low: { color: "bg-green-100 text-green-800", label: "Low Risk" },
    medium: { color: "bg-amber-100 text-amber-800", label: "Medium Risk" },
    high: { color: "bg-red-100 text-red-800", label: "High Risk" },
  };
  const c = config[level];
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${c.color}`}>{c.label}</span>;
}

export default function ScanReport({ report, onClose }: ScanReportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Use browser print to PDF
    window.print();
  };

  if (!report) return null;

  const m = report.measurements || {};
  const ind = report.indicators || {};
  const dyn = report.dynamics || {};
  const rec = report.aiRecommendation;
  const bio = report.biomechanicData;

  // Determine risk levels
  const calcanealRisk = ind.calcanealAlignment != null
    ? Math.abs(ind.calcanealAlignment) > 8 ? "high" : Math.abs(ind.calcanealAlignment) > 4 ? "medium" : "low"
    : null;
  const halluxRisk = ind.halluxValgusAngle != null
    ? ind.halluxValgusAngle > 25 ? "high" : ind.halluxValgusAngle > 15 ? "medium" : "low"
    : null;

  return (
    <div className="space-y-4">
      {/* Action buttons — not printed */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} className="gap-2" variant="outline">
          <Printer className="h-4 w-4" /> Print Report
        </Button>
        <Button onClick={handleExportPDF} className="gap-2">
          <Download className="h-4 w-4" /> Export PDF
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="ghost" className="ml-auto">Close</Button>
        )}
      </div>

      {/* Printable Report */}
      <div
        ref={printRef}
        className="bg-white p-6 rounded-lg border print:border-0 print:p-0 print:shadow-none space-y-6 text-sm"
        style={{ maxWidth: '210mm' }}
      >
        {/* ═══ HEADER ═══ */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Footprints className="h-6 w-6 text-[#607d7d]" />
              Biomechanical Foot Scan Report
            </h1>
            <p className="text-xs text-slate-500 mt-1">{report.clinic?.name}</p>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">{report.reportId}</p>
            <p>Generated: {new Date(report.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p>Scan: {report.scan?.number}</p>
            <p>Date: {new Date(report.scan?.date).toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* ═══ CAPTURED IMAGES ═══ */}
        {(report.scan?.leftFootImages?.length > 0 || report.scan?.rightFootImages?.length > 0) && (
          <div className="break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Footprints className="h-4 w-4 text-[#607d7d]" /> Captured Images
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {report.scan.leftFootImages?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase mb-2">Left Foot ({report.scan.leftFootImages.length} images)</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(report.scan.leftFootImages as string[]).slice(0, 6).map((url: string, i: number) => (
                      <div key={i} className="aspect-square rounded overflow-hidden border bg-slate-50">
                        <img src={url} alt={`Left ${i+1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.scan.rightFootImages?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-2">Right Foot ({report.scan.rightFootImages.length} images)</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(report.scan.rightFootImages as string[]).slice(0, 6).map((url: string, i: number) => (
                      <div key={i} className="aspect-square rounded overflow-hidden border bg-slate-50">
                        <img src={url} alt={`Right ${i+1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ PATIENT INFO ═══ */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-3">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-medium">Patient</p>
            <p className="font-semibold">{report.patient?.name}</p>
            <p className="text-xs text-slate-600">{report.patient?.email}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-medium">Clinic</p>
            <p className="font-semibold">{report.clinic?.name}</p>
            <p className="text-xs text-slate-600">{report.clinic?.address || report.clinic?.email}</p>
          </div>
        </div>

        {/* ═══ PRIMARY INDICATORS ═══ */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#607d7d]" /> Primary Biomechanical Indicators
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="border rounded-lg p-3 text-center">
              <p className="text-[9px] text-slate-500 uppercase font-medium">Arch Type</p>
              <p className="text-lg font-bold text-[#607d7d] mt-1">{ind.archType || 'N/A'}</p>
              {ind.archIndex != null && <p className="text-[9px] text-slate-400">Index: {ind.archIndex.toFixed(2)}</p>}
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-[9px] text-slate-500 uppercase font-medium">Pronation</p>
              <p className="text-lg font-bold text-[#607d7d] mt-1">{ind.pronation || 'N/A'}</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-[9px] text-slate-500 uppercase font-medium">Calcaneal Align.</p>
              <p className={`text-lg font-bold mt-1 ${calcanealRisk === 'high' ? 'text-red-600' : calcanealRisk === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>
                {ind.calcanealAlignment != null ? `${ind.calcanealAlignment}°` : 'N/A'}
              </p>
              {calcanealRisk && <RiskIndicator level={calcanealRisk} />}
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-[9px] text-slate-500 uppercase font-medium">Hallux Valgus</p>
              <p className={`text-lg font-bold mt-1 ${halluxRisk === 'high' ? 'text-red-600' : halluxRisk === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>
                {ind.halluxValgusAngle != null ? `${ind.halluxValgusAngle}°` : 'N/A'}
              </p>
              {halluxRisk && <RiskIndicator level={halluxRisk} />}
            </div>
          </div>
        </div>

        {/* ═══ MEASUREMENTS ═══ */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-[#607d7d]" /> Standard Measurements
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Left Foot */}
            <div className="border rounded-lg p-3">
              <p className="text-[10px] font-semibold text-blue-600 uppercase mb-2">Left Foot</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Length</span>
                  <span className="font-semibold">{m.leftFootLength ? `${m.leftFootLength} mm` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Width</span>
                  <span className="font-semibold">{m.leftFootWidth ? `${m.leftFootWidth} mm` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Arch Height</span>
                  <span className="font-semibold">{m.leftArchHeight ? `${m.leftArchHeight} mm` : 'N/A'}</span>
                </div>
              </div>
            </div>
            {/* Right Foot */}
            <div className="border rounded-lg p-3">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-2">Right Foot</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Length</span>
                  <span className="font-semibold">{m.rightFootLength ? `${m.rightFootLength} mm` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Width</span>
                  <span className="font-semibold">{m.rightFootWidth ? `${m.rightFootWidth} mm` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Arch Height</span>
                  <span className="font-semibold">{m.rightArchHeight ? `${m.rightArchHeight} mm` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Asymmetry alert */}
          {(m.lengthDifference != null && m.lengthDifference > 3) && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 flex gap-2">
              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>Length asymmetry of {m.lengthDifference.toFixed(1)}mm detected between left and right foot.</span>
            </div>
          )}

          {/* Additional indicators */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="border rounded p-2 text-center">
              <p className="text-[9px] text-slate-500">Navicular Height</p>
              <p className="font-semibold text-sm">{ind.navicularHeight ? `${ind.navicularHeight}mm` : 'N/A'}</p>
            </div>
            <div className="border rounded p-2 text-center">
              <p className="text-[9px] text-slate-500">Metatarsal Spread</p>
              <p className="font-semibold text-sm">{ind.metatarsalSpread ? `${ind.metatarsalSpread}mm` : 'N/A'}</p>
            </div>
            <div className="border rounded p-2 text-center">
              <p className="text-[9px] text-slate-500">Stride Length</p>
              <p className="font-semibold text-sm">{dyn.strideLength ? `${dyn.strideLength}mm` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* ═══ PRESSURE MAP VISUALIZATION ═══ */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Estimated Pressure Distribution</h2>
          <div className="grid grid-cols-2 gap-4">
            {['Left', 'Right'].map((side) => (
              <div key={side} className="border rounded-lg p-3">
                <p className={`text-[10px] font-semibold ${side === 'Left' ? 'text-blue-600' : 'text-emerald-600'} uppercase mb-3`}>
                  {side} Foot
                </p>
                {/* Simplified pressure zones */}
                <div className="relative w-full aspect-[1/2] max-w-[120px] mx-auto">
                  {/* Foot outline */}
                  <svg viewBox="0 0 100 200" className="w-full h-full">
                    {/* Foot shape */}
                    <path
                      d={side === 'Left'
                        ? "M50 10 C65 10 75 20 75 35 L78 70 C80 90 78 110 75 130 C73 145 70 160 65 175 C60 190 55 195 45 195 C35 195 30 190 25 180 C20 170 18 155 22 130 C25 110 20 90 22 70 L25 35 C25 20 35 10 50 10Z"
                        : "M50 10 C35 10 25 20 25 35 L22 70 C20 90 22 110 25 130 C27 145 30 160 35 175 C40 190 45 195 55 195 C65 195 70 190 75 180 C80 170 82 155 78 130 C75 110 80 90 78 70 L75 35 C75 20 65 10 50 10Z"
                      }
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                    {/* Pressure zones — dynamic based on arch type & pronation */}
                    {(() => {
                      const isFlat = ind.archType === 'Flat';
                      const isHigh = ind.archType === 'High';
                      const isOverpronation = ind.pronation === 'Overpronation';
                      const isSupination = ind.pronation === 'Supination';
                      const isLeft = side === 'Left';
                      // Heel pressure
                      const heelColor = isOverpronation ? '#ef4444' : isSupination ? '#f97316' : '#f97316';
                      const heelOpacity = isOverpronation ? 0.5 : 0.35;
                      const heelCx = isOverpronation ? (isLeft ? 55 : 45) : isSupination ? (isLeft ? 42 : 58) : 50;
                      // Midfoot pressure (flat = more, high = less)
                      const midColor = isFlat ? '#f97316' : '#22c55e';
                      const midOpacity = isFlat ? 0.4 : isHigh ? 0.15 : 0.25;
                      const midRx = isFlat ? 20 : isHigh ? 10 : 15;
                      // Ball of foot
                      const ballColor = isOverpronation ? '#ef4444' : '#f97316';
                      const ballCx = isOverpronation ? (isLeft ? 55 : 45) : 50;
                      const ballOpacity = isOverpronation ? 0.5 : 0.4;
                      // Toes
                      const toeCx = ind.halluxValgusAngle && ind.halluxValgusAngle > 15 ? (isLeft ? 55 : 45) : 50;
                      return (
                        <>
                          <ellipse cx={heelCx} cy="170" rx="18" ry="15" fill={heelColor} opacity={heelOpacity} />
                          <ellipse cx="50" cy="110" rx={midRx} ry="25" fill={midColor} opacity={midOpacity} />
                          <ellipse cx={ballCx} cy="55" rx="20" ry="15" fill={ballColor} opacity={ballOpacity} />
                          <ellipse cx={toeCx} cy="25" rx="15" ry="10" fill="#eab308" opacity="0.35" />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-500 justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500 rounded opacity-40" /> Low</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-yellow-500 rounded opacity-40" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-500 rounded opacity-40" /> High</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-500 rounded opacity-40" /> Peak</span>
          </div>
        </div>

        {/* ═══ GAIT ANALYSIS ═══ */}
        {dyn.gaitAnalysis && (
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Gait Analysis</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded p-3 text-center">
                <p className="text-[9px] text-slate-500 uppercase">Pattern</p>
                <p className="font-semibold text-sm mt-1">{dyn.gaitAnalysis.pattern || 'N/A'}</p>
              </div>
              <div className="border rounded p-3 text-center">
                <p className="text-[9px] text-slate-500 uppercase">Symmetry</p>
                <p className="font-semibold text-sm mt-1">{dyn.gaitAnalysis.symmetry || 'N/A'}</p>
              </div>
              <div className="border rounded p-3 text-center">
                <p className="text-[9px] text-slate-500 uppercase">Cadence</p>
                <p className="font-semibold text-sm mt-1">{dyn.cadence ? `${dyn.cadence} steps/min` : 'N/A'}</p>
              </div>
            </div>
            {dyn.gaitAnalysis.concerns?.length > 0 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
                <p className="font-semibold mb-1">Gait Concerns:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  {dyn.gaitAnalysis.concerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ═══ SHOE WEAR ANALYSIS ═══ */}
        {(rec?.shoeWearAnalysis || bio?.shoeWearAnalysis) && (() => {
          const swa = rec?.shoeWearAnalysis || bio?.shoeWearAnalysis;
          if (!swa) return null;
          const wearColorMap: Record<string, string> = {
            medial: 'text-red-600', lateral: 'text-amber-600', central: 'text-blue-600',
            even: 'text-green-600', 'not visible': 'text-slate-400',
          };
          const levelColorMap: Record<string, string> = {
            minimal: 'bg-green-100 text-green-800', moderate: 'bg-amber-100 text-amber-800', severe: 'bg-red-100 text-red-800',
          };
          return (
            <div className="break-inside-avoid">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Shirt className="h-4 w-4 text-[#607d7d]" /> Shoe Wear Analysis
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {['leftShoe', 'rightShoe'].map((key) => {
                  const shoe = (swa as any)[key];
                  if (!shoe) return null;
                  const isLeft = key === 'leftShoe';
                  return (
                    <div key={key} className="border rounded-lg p-3">
                      <p className={`text-[10px] font-semibold ${isLeft ? 'text-blue-600' : 'text-emerald-600'} uppercase mb-2`}>
                        {isLeft ? 'Left' : 'Right'} Shoe
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Heel Wear:</span>
                          <span className={`font-semibold capitalize ${wearColorMap[shoe.heelWear] || ''}`}>{shoe.heelWear}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Forefoot Wear:</span>
                          <span className={`font-semibold capitalize ${wearColorMap[shoe.forefootWear] || ''}`}>{shoe.forefootWear}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Overall Level:</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${levelColorMap[shoe.overallWearLevel] || ''}`}>{shoe.overallWearLevel}</span>
                        </div>
                        {shoe.wearDescription && <p className="text-[10px] text-slate-600 mt-1 pt-1 border-t">{shoe.wearDescription}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {swa.gaitImplication && (
                <div className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-slate-700">
                  <span className="font-semibold">Gait Implication: </span>{swa.gaitImplication}
                </div>
              )}
              {swa.symmetry && (
                <div className="mt-1 flex gap-2 text-[9px]">
                  <span className="text-slate-500">Symmetry:</span>
                  <span className={`font-semibold ${swa.symmetry === 'symmetric' ? 'text-green-600' : 'text-amber-600'}`}>{swa.symmetry}</span>
                  {swa.shoeTypeObserved && <><span className="text-slate-300">|</span><span className="text-slate-500">Shoe type: {swa.shoeTypeObserved}</span></>}
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ AI RECOMMENDATIONS ═══ */}
        {rec && (
          <div className="break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-[#607d7d]" /> AI Clinical Assessment
            </h2>

            {rec.clinicalSummary && (
              <div className="bg-slate-50 rounded-lg p-3 mb-3 text-xs text-slate-700">
                <p className="font-medium text-[10px] text-slate-500 uppercase mb-1">Clinical Summary</p>
                {rec.clinicalSummary}
              </div>
            )}

            {rec.recommendations && (
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-[#607d7d] uppercase mb-2">Insole Recommendation</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Type:</span>
                      <span className="font-semibold">{rec.recommendations.insoleType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Support:</span>
                      <span className="font-semibold">{rec.recommendations.supportLevel}</span>
                    </div>
                  </div>
                  {rec.recommendations.additionalSupport?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[9px] text-slate-500">Additional support:</p>
                      <ul className="text-[10px] list-disc ml-3 text-slate-600">
                        {rec.recommendations.additionalSupport.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-[#607d7d] uppercase mb-2">Recommended Exercises</p>
                  {rec.recommendations.exercises?.length > 0 ? (
                    <ul className="text-[10px] list-disc ml-3 text-slate-600 space-y-0.5">
                      {rec.recommendations.exercises.map((ex: string, i: number) => <li key={i}>{ex}</li>)}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-slate-400">None specified</p>
                  )}
                  {rec.recommendations.footwearAdvice && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-[9px] text-slate-500">Footwear advice:</p>
                      <p className="text-[10px] text-slate-600">{rec.recommendations.footwearAdvice}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rec.patientSummary && (
              <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-800 border border-blue-200">
                <p className="font-medium text-[10px] text-blue-600 uppercase mb-1">Patient Summary</p>
                {rec.patientSummary}
              </div>
            )}
          </div>
        )}

        {/* ═══ INSOLE PRODUCTION SPECS ═══ */}
        {(report.insole?.type || report.insole?.size) && (
          <div className="break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Insole Production Specifications</h2>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[9px] text-slate-500">Type</p>
                  <p className="font-semibold">{report.insole.type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500">Size</p>
                  <p className="font-semibold">{report.insole.size || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500">Status</p>
                  <Badge variant="outline" className="text-[9px]">{report.scan?.status}</Badge>
                </div>
              </div>
              {report.insole.productionNotes && (
                <div className="pt-2 border-t text-xs text-slate-600">
                  <p className="text-[9px] text-slate-500 mb-1">Production Notes:</p>
                  {report.insole.productionNotes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ PRODUCT RECOMMENDATION ═══ */}
        {ind.archType && (() => {
          const recommendation = getProductRecommendation(
            ind.archType, ind.pronation, ind.halluxValgusAngle, ind.calcanealAlignment,
            rec?.recommendations?.insoleType, rec?.recommendations?.supportLevel,
          );
          const p = recommendation.primary;
          const urgencyColor = {
            'routine': 'bg-green-100 text-green-800',
            'recommended': 'bg-blue-100 text-blue-800',
            'strongly recommended': 'bg-red-100 text-red-800',
          }[recommendation.urgency];
          return (
            <div className="break-inside-avoid">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#607d7d]" /> Recommended Product
              </h2>
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{p.sku} &middot; {p.type}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${urgencyColor}`}>
                    {recommendation.urgency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600">{p.description}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded p-1.5">
                    <p className="text-[8px] text-slate-500">GBP</p>
                    <p className="font-bold text-sm">£{p.priceGBP}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-1.5">
                    <p className="text-[8px] text-slate-500">EUR</p>
                    <p className="font-bold text-sm">€{p.priceEUR}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-1.5">
                    <p className="text-[8px] text-slate-500">BRL</p>
                    <p className="font-bold text-sm">R${p.priceBRL}</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600">
                  <p className="font-medium text-[9px] text-slate-500 uppercase mb-1">Features</p>
                  <div className="grid grid-cols-2 gap-1">
                    {p.features.map((f: string, i: number) => (
                      <div key={i} className="flex gap-1 items-start">
                        <CheckCircle className="h-2.5 w-2.5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t text-[10px] text-slate-600">
                  <p className="font-medium text-[9px] text-slate-500 uppercase mb-1">Clinical Reasoning</p>
                  {recommendation.reasoning}
                </div>
                {recommendation.alternatives.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="font-medium text-[9px] text-slate-500 uppercase mb-1">Alternative Options</p>
                    <div className="space-y-1">
                      {recommendation.alternatives.map((alt, i) => (
                        <div key={i} className="flex justify-between text-[10px]">
                          <span className="text-slate-600">{alt.name} <span className="text-slate-400">({alt.type})</span></span>
                          <span className="font-semibold">£{alt.priceGBP}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ═══ CLINICIAN NOTES ═══ */}
        {report.clinicianNotes && (
          <div className="break-inside-avoid">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Clinician Notes</h2>
            <div className="border rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap">
              {report.clinicianNotes}
            </div>
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="border-t pt-3 text-[9px] text-slate-400 flex justify-between mt-6">
          <span>{report.clinic?.name} — Confidential Clinical Report</span>
          <span>{report.reportId} — Page 1</span>
        </div>
      </div>
    </div>
  );
}
