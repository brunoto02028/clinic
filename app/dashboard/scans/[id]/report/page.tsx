"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Footprints,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Ruler,
  Brain,
  Download,
  TrendingUp,
  Info,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";

interface ScanReport {
  id: string;
  scanNumber: string;
  status: string;
  archType: string | null;
  pronation: string | null;
  leftFootLength: number | null;
  rightFootLength: number | null;
  leftFootWidth: number | null;
  rightFootWidth: number | null;
  leftArchHeight: number | null;
  rightArchHeight: number | null;
  calcanealAlignment: number | null;
  halluxValgusAngle: number | null;
  aiRecommendation: string | null;
  gaitAnalysis: any;
  biomechanicData: any;
  insoleType: string | null;
  createdAt: string;
}

export default function PatientScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const id = params?.id as string;

  const [scan, setScan] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/foot-scans/${id}`)
      .then((r) => r.json())
      .then((data) => setScan(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
        <p className="text-muted-foreground">
          {isPt ? "Relatório não encontrado." : "Report not found."}
        </p>
      </div>
    );
  }

  const recommendation = scan.aiRecommendation
    ? (() => { try { return JSON.parse(scan.aiRecommendation); } catch { return null; } })()
    : null;

  const archTypeColors: Record<string, string> = {
    Normal: "text-green-500",
    Flat: "text-orange-500",
    High: "text-blue-500",
  };

  const pronationColors: Record<string, string> = {
    Neutral: "text-green-500",
    Overpronation: "text-orange-500",
    Supination: "text-blue-500",
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/scans">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Footprints className="h-6 w-6 text-primary" />
            {isPt ? "Relatório do Scan" : "Scan Report"} — {scan.scanNumber}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(scan.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge
          variant="outline"
          className={scan.status === "APPROVED" ? "bg-green-500/15 text-green-500" : "bg-yellow-500/15 text-yellow-500"}
        >
          {scan.status === "APPROVED"
            ? isPt ? "Aprovado" : "Approved"
            : scan.status === "PENDING_REVIEW"
              ? isPt ? "Em Revisão" : "Under Review"
              : scan.status}
        </Badge>
      </div>

      {/* Key Findings */}
      {(scan.archType || scan.pronation) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              {isPt ? "Resultados Principais" : "Key Findings"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {scan.archType && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {isPt ? "Tipo de Arco" : "Arch Type"}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${archTypeColors[scan.archType] || ""}`}>
                    {scan.archType}
                  </p>
                </div>
              )}
              {scan.pronation && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {isPt ? "Pronação" : "Pronation"}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${pronationColors[scan.pronation] || ""}`}>
                    {scan.pronation}
                  </p>
                </div>
              )}
              {scan.calcanealAlignment !== null && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {isPt ? "Alinhamento Calcâneo" : "Calcaneal Alignment"}
                  </p>
                  <p className="text-xl font-bold mt-1">{scan.calcanealAlignment}°</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurements */}
      {(scan.leftFootLength || scan.rightFootLength) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-500" />
              {isPt ? "Medições" : "Measurements"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Left Foot */}
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  {isPt ? "Pé Esquerdo" : "Left Foot"}
                </h4>
                <div className="space-y-1 text-sm">
                  {scan.leftFootLength && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Comprimento" : "Length"}</span>
                      <span className="font-medium">{scan.leftFootLength} mm</span>
                    </div>
                  )}
                  {scan.leftFootWidth && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Largura" : "Width"}</span>
                      <span className="font-medium">{scan.leftFootWidth} mm</span>
                    </div>
                  )}
                  {scan.leftArchHeight && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Altura Arco" : "Arch Height"}</span>
                      <span className="font-medium">{scan.leftArchHeight} mm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Foot */}
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  {isPt ? "Pé Direito" : "Right Foot"}
                </h4>
                <div className="space-y-1 text-sm">
                  {scan.rightFootLength && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Comprimento" : "Length"}</span>
                      <span className="font-medium">{scan.rightFootLength} mm</span>
                    </div>
                  )}
                  {scan.rightFootWidth && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Largura" : "Width"}</span>
                      <span className="font-medium">{scan.rightFootWidth} mm</span>
                    </div>
                  )}
                  {scan.rightArchHeight && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Altura Arco" : "Arch Height"}</span>
                      <span className="font-medium">{scan.rightArchHeight} mm</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendation */}
      {scan.aiRecommendation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {isPt ? "Recomendações" : "Recommendations"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendation ? (
              <div className="space-y-3">
                {recommendation.summary && (
                  <p className="text-sm">{recommendation.summary}</p>
                )}
                {recommendation.recommendations && Array.isArray(recommendation.recommendations) && (
                  <ul className="space-y-2">
                    {recommendation.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {scan.aiRecommendation}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insole Recommendation */}
      {scan.insoleType && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Footprints className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {isPt ? "Palmilha Recomendada" : "Recommended Insole"}: {scan.insoleType}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isPt
                  ? "O seu terapeuta irá discutir as opções de palmilhas personalizadas consigo na próxima consulta."
                  : "Your therapist will discuss custom insole options with you at your next appointment."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {isPt ? "Próximos Passos" : "Next Steps"}
          </h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-between" asChild>
              <Link href="/dashboard/body-assessments">
                {isPt ? "Ver Avaliação Postural" : "View Posture Assessment"}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-between" asChild>
              <Link href="/dashboard/exercises">
                {isPt ? "Ver Exercícios Prescritos" : "View Prescribed Exercises"}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-between" asChild>
              <Link href="/dashboard/appointments">
                {isPt ? "Marcar Consulta de Follow-up" : "Book Follow-up Appointment"}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {isPt
              ? "Este relatório é gerado por IA e revisto por profissionais qualificados. Não substitui um diagnóstico médico. Todas as recomendações devem ser discutidas com o seu terapeuta."
              : "This report is AI-generated and reviewed by qualified professionals. It does not replace a medical diagnosis. All recommendations should be discussed with your therapist."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
