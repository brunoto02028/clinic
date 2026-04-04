"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, FileText, Footprints, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FootScan {
  id: string;
  scanNumber: string;
  status: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  leftFootLength?: number;
  rightFootLength?: number;
  leftFootWidth?: number;
  rightFootWidth?: number;
  leftArchHeight?: number;
  rightArchHeight?: number;
  archType?: string;
  pronation?: string;
  calcanealAlignment?: number;
  halluxValgusAngle?: number;
  gaitAnalysis?: any;
  biomechanicData?: any;
  aiRecommendation?: string;
  leftFootImages?: string[];
  rightFootImages?: string[];
  scanUrl?: string;
  previewUrl?: string;
}

export default function FootScanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [scan, setScan] = useState<FootScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchScan();
  }, [params.id]);

  const fetchScan = async () => {
    try {
      const res = await fetch(`/api/foot-scans/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch scan");
      const data = await res.json();
      setScan(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load foot scan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/foot-scans/${params.id}/analyze`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Analysis failed");

      toast({
        title: "Success",
        description: "Analysis completed successfully",
      });

      fetchScan();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze scan",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "PENDING_REVIEW":
        return "bg-green-500";
      case "PROCESSING":
        return "bg-blue-500";
      case "SCANNING":
      case "PENDING_UPLOAD":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPronationColor = (pronation?: string) => {
    switch (pronation) {
      case "Neutral":
        return "text-green-600";
      case "Overpronation":
        return "text-orange-600";
      case "Supination":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Scan not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const recommendations = scan.aiRecommendation ? JSON.parse(scan.aiRecommendation) : null;
  const hasAnalysis = scan.archType || scan.pronation;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {scan.patient.firstName} {scan.patient.lastName}
              </h1>
              <Badge className={getStatusColor(scan.status)}>{scan.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Scan #{scan.scanNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasAnalysis && (
            <Button onClick={handleAnalyze} disabled={analyzing} className="gap-2">
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze with AI
                </>
              )}
            </Button>
          )}
          {hasAnalysis && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/foot-scans/${params.id}/insoles`)}
              >
                <Footprints className="h-4 w-4 mr-2" />
                Generate Insoles
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/api/foot-scans/${params.id}/report`, "_blank")}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </>
          )}
        </div>
      </div>

      {!hasAnalysis ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analysis Pending</h3>
            <p className="text-muted-foreground mb-4">
              Click "Analyze with AI" to process this scan
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="analysis" className="space-y-4">
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left Foot */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Footprints className="h-5 w-5 text-teal-600" />
                    Left Foot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Length</span>
                      <span className="font-semibold">{scan.leftFootLength?.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Width</span>
                      <span className="font-semibold">{scan.leftFootWidth?.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Arch Height</span>
                      <span className="font-semibold">{scan.leftArchHeight?.toFixed(1)} mm</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Foot */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Footprints className="h-5 w-5 text-teal-600" />
                    Right Foot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Length</span>
                      <span className="font-semibold">{scan.rightFootLength?.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Width</span>
                      <span className="font-semibold">{scan.rightFootWidth?.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Arch Height</span>
                      <span className="font-semibold">{scan.rightArchHeight?.toFixed(1)} mm</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Biomechanical Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Biomechanical Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Arch Type</p>
                    <p className="text-lg font-semibold">{scan.archType || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pronation</p>
                    <p className={`text-lg font-semibold ${getPronationColor(scan.pronation)}`}>
                      {scan.pronation || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Calcaneal Alignment</p>
                    <p className="text-lg font-semibold">
                      {scan.calcanealAlignment?.toFixed(1)}°
                    </p>
                  </div>
                </div>

                {scan.halluxValgusAngle && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Hallux Valgus Angle</p>
                    <p className="text-lg font-semibold">{scan.halluxValgusAngle.toFixed(1)}°</p>
                  </div>
                )}

                {scan.gaitAnalysis && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold mb-2">Gait Analysis</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Pattern:</span>{" "}
                        {scan.gaitAnalysis.pattern}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Symmetry:</span>{" "}
                        {scan.gaitAnalysis.symmetry}
                      </p>
                      {scan.gaitAnalysis.concerns?.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Concerns:</span>
                          <ul className="list-disc list-inside ml-4 mt-1">
                            {scan.gaitAnalysis.concerns.map((concern: string, i: number) => (
                              <li key={i}>{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Measurements Tab */}
          <TabsContent value="measurements">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Measurements</CardTitle>
                <CardDescription>All measurements in millimeters (mm)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Left Foot</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-accent/50 rounded">
                          <span>Length</span>
                          <span className="font-mono">{scan.leftFootLength?.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between p-2 rounded">
                          <span>Width</span>
                          <span className="font-mono">{scan.leftFootWidth?.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between p-2 bg-accent/50 rounded">
                          <span>Arch Height</span>
                          <span className="font-mono">{scan.leftArchHeight?.toFixed(1)} mm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Right Foot</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-accent/50 rounded">
                          <span>Length</span>
                          <span className="font-mono">{scan.rightFootLength?.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between p-2 rounded">
                          <span>Width</span>
                          <span className="font-mono">{scan.rightFootWidth?.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between p-2 bg-accent/50 rounded">
                          <span>Arch Height</span>
                          <span className="font-mono">{scan.rightArchHeight?.toFixed(1)} mm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Asymmetry Analysis</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 bg-accent/50 rounded">
                        <span>Length Difference</span>
                        <span className="font-mono">
                          {Math.abs((scan.leftFootLength || 0) - (scan.rightFootLength || 0)).toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded">
                        <span>Width Difference</span>
                        <span className="font-mono">
                          {Math.abs((scan.leftFootWidth || 0) - (scan.rightFootWidth || 0)).toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between p-2 bg-accent/50 rounded">
                        <span>Arch Height Difference</span>
                        <span className="font-mono">
                          {Math.abs((scan.leftArchHeight || 0) - (scan.rightArchHeight || 0)).toFixed(1)} mm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Left Foot Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {scan.leftFootImages?.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Left foot ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Right Foot Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {scan.rightFootImages?.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Right foot ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {recommendations?.clinicalSummary && (
                  <div>
                    <h3 className="font-semibold mb-2">Clinical Summary</h3>
                    <p className="text-sm text-muted-foreground">{recommendations.clinicalSummary}</p>
                  </div>
                )}

                {recommendations?.patientSummary && (
                  <div>
                    <h3 className="font-semibold mb-2">Patient Summary</h3>
                    <p className="text-sm text-muted-foreground">{recommendations.patientSummary}</p>
                  </div>
                )}

                {recommendations?.recommendations && (
                  <div>
                    <h3 className="font-semibold mb-2">Insole Specifications</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-accent/50 rounded">
                          <span>Type</span>
                          <span className="font-semibold">{recommendations.recommendations.insoleType}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded">
                          <span>Support Level</span>
                          <span className="font-semibold">{recommendations.recommendations.supportLevel}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-accent/50 rounded">
                          <span>Arch Support Height</span>
                          <span className="font-semibold">{recommendations.recommendations.archSupportHeight} mm</span>
                        </div>
                        <div className="flex justify-between p-2 rounded">
                          <span>Heel Cup Depth</span>
                          <span className="font-semibold">{recommendations.recommendations.heelCupDepth} mm</span>
                        </div>
                        <div className="flex justify-between p-2 bg-accent/50 rounded">
                          <span>Metatarsal Pad</span>
                          <span className="font-semibold">
                            {recommendations.recommendations.metatarsalPad ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {recommendations.recommendations.exercises?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Recommended Exercises</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {recommendations.recommendations.exercises.map((ex: string, i: number) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendations.recommendations.footwearAdvice && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Footwear Advice</h4>
                        <p className="text-sm text-muted-foreground">
                          {recommendations.recommendations.footwearAdvice}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
