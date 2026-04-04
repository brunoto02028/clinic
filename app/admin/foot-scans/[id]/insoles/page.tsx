"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2, Printer, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InsoleSpec {
  archSupportHeight: number;
  heelCupDepth: number;
  heelWedgeAngle: number;
  lateralSupport: number;
  metatarsalPad: boolean;
  metatarsalPadHeight: number;
}

export default function InsolesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scan, setScan] = useState<any>(null);
  const [leftInsoleUrl, setLeftInsoleUrl] = useState<string | null>(null);
  const [rightInsoleUrl, setRightInsoleUrl] = useState<string | null>(null);
  const [insoleSpecs, setInsoleSpecs] = useState<InsoleSpec | null>(null);

  useEffect(() => {
    fetchScan();
  }, [params.id]);

  const fetchScan = async () => {
    try {
      const res = await fetch(`/api/foot-scans/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch scan");
      const data = await res.json();
      setScan(data);

      // Parse recommendations
      if (data.aiRecommendation) {
        const recs = JSON.parse(data.aiRecommendation);
        setInsoleSpecs({
          archSupportHeight: recs.recommendations?.archSupportHeight || 6,
          heelCupDepth: recs.recommendations?.heelCupDepth || 15,
          heelWedgeAngle: data.calcanealAlignment ? Math.abs(data.calcanealAlignment) * 0.3 : 0,
          lateralSupport: data.pronation === "Overpronation" ? 4 : data.pronation === "Supination" ? 3 : 0,
          metatarsalPad: recs.recommendations?.metatarsalPad || false,
          metatarsalPadHeight: recs.recommendations?.metatarsalPad ? 3 : 0,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsoles = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/foot-scans/${params.id}/generate-insoles`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate insoles");

      const data = await res.json();
      setLeftInsoleUrl(data.leftInsoleUrl);
      setRightInsoleUrl(data.rightInsoleUrl);

      toast({
        title: "Success",
        description: "Insoles generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate insoles",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Custom Insole Generation</h1>
            <p className="text-sm text-muted-foreground">
              {scan.patient.firstName} {scan.patient.lastName} - Scan #{scan.scanNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Insole Specifications */}
      {insoleSpecs && (
        <Card>
          <CardHeader>
            <CardTitle>Insole Specifications</CardTitle>
            <CardDescription>Based on AI biomechanical analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Support Features</h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-3 bg-accent/50 rounded-lg">
                    <span>Arch Support Height</span>
                    <span className="font-semibold">{insoleSpecs.archSupportHeight} mm</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg">
                    <span>Heel Cup Depth</span>
                    <span className="font-semibold">{insoleSpecs.heelCupDepth} mm</span>
                  </div>
                  <div className="flex justify-between p-3 bg-accent/50 rounded-lg">
                    <span>Heel Wedge Angle</span>
                    <span className="font-semibold">{insoleSpecs.heelWedgeAngle.toFixed(1)}°</span>
                  </div>
                  {insoleSpecs.lateralSupport > 0 && (
                    <div className="flex justify-between p-3 rounded-lg">
                      <span>Lateral Support</span>
                      <span className="font-semibold">{insoleSpecs.lateralSupport} mm</span>
                    </div>
                  )}
                  <div className="flex justify-between p-3 bg-accent/50 rounded-lg">
                    <span>Metatarsal Pad</span>
                    <span className="font-semibold">
                      {insoleSpecs.metatarsalPad ? `Yes (${insoleSpecs.metatarsalPadHeight}mm)` : "No"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Correction Strategy</h3>
                <div className="space-y-2 text-sm">
                  {scan.pronation === "Overpronation" && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="font-semibold text-orange-900">Overpronation Correction</p>
                      <ul className="list-disc list-inside mt-2 text-orange-800 space-y-1">
                        <li>Medial arch support to reduce inward roll</li>
                        <li>Lateral heel wedge for alignment</li>
                        <li>Firm heel cup for stability</li>
                      </ul>
                    </div>
                  )}
                  {scan.pronation === "Supination" && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-semibold text-red-900">Supination Correction</p>
                      <ul className="list-disc list-inside mt-2 text-red-800 space-y-1">
                        <li>Lateral support to reduce outward roll</li>
                        <li>Medial heel wedge for alignment</li>
                        <li>Cushioned lateral edge</li>
                      </ul>
                    </div>
                  )}
                  {scan.pronation === "Neutral" && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-900">Neutral Support</p>
                      <ul className="list-disc list-inside mt-2 text-green-800 space-y-1">
                        <li>Balanced arch support</li>
                        <li>Even pressure distribution</li>
                        <li>Comfort-focused design</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      {!leftInsoleUrl && !rightInsoleUrl && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-teal-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Generate Insoles</h3>
            <p className="text-muted-foreground mb-6">
              3D models will be created based on the biomechanical analysis
            </p>
            <Button onClick={handleGenerateInsoles} disabled={generating} size="lg" className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating 3D Models...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Insole Models
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Download Section */}
      {(leftInsoleUrl || rightInsoleUrl) && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left Insole */}
          <Card>
            <CardHeader>
              <CardTitle>Left Insole</CardTitle>
              <CardDescription>Ready for 3D printing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-teal-200">
                <div className="text-center">
                  <Printer className="h-12 w-12 mx-auto text-teal-600 mb-2" />
                  <p className="text-sm font-semibold text-teal-900">3D Model Ready</p>
                  <p className="text-xs text-teal-700 mt-1">STL Format</p>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handleDownload(leftInsoleUrl!, `left-insole-${scan.scanNumber}.stl`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Left Insole STL
              </Button>
            </CardContent>
          </Card>

          {/* Right Insole */}
          <Card>
            <CardHeader>
              <CardTitle>Right Insole</CardTitle>
              <CardDescription>Ready for 3D printing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-teal-200">
                <div className="text-center">
                  <Printer className="h-12 w-12 mx-auto text-teal-600 mb-2" />
                  <p className="text-sm font-semibold text-teal-900">3D Model Ready</p>
                  <p className="text-xs text-teal-700 mt-1">STL Format</p>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => handleDownload(rightInsoleUrl!, `right-insole-${scan.scanNumber}.stl`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Right Insole STL
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Print Settings */}
      {(leftInsoleUrl || rightInsoleUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Bambu Lab P1S Print Settings</CardTitle>
            <CardDescription>Recommended settings for optimal results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm mb-3">Material Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-accent/50 rounded">
                    <span>Material</span>
                    <span className="font-semibold">TPU 95A (Flexible)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded">
                    <span>Nozzle Temperature</span>
                    <span className="font-semibold">230°C</span>
                  </div>
                  <div className="flex justify-between p-2 bg-accent/50 rounded">
                    <span>Bed Temperature</span>
                    <span className="font-semibold">60°C</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm mb-3">Print Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-accent/50 rounded">
                    <span>Layer Height</span>
                    <span className="font-semibold">0.2 mm</span>
                  </div>
                  <div className="flex justify-between p-2 rounded">
                    <span>Infill</span>
                    <span className="font-semibold">20% (Gyroid)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-accent/50 rounded">
                    <span>Print Speed</span>
                    <span className="font-semibold">30 mm/s</span>
                  </div>
                  <div className="flex justify-between p-2 rounded">
                    <span>Supports</span>
                    <span className="font-semibold">None</span>
                  </div>
                  <div className="flex justify-between p-2 bg-accent/50 rounded">
                    <span>Brim</span>
                    <span className="font-semibold">Yes (5mm)</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Estimated Print Time & Cost</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-teal-50 rounded-lg">
                    <p className="text-2xl font-bold text-teal-600">~3h</p>
                    <p className="text-xs text-muted-foreground mt-1">Per insole</p>
                  </div>
                  <div className="text-center p-3 bg-teal-50 rounded-lg">
                    <p className="text-2xl font-bold text-teal-600">~50g</p>
                    <p className="text-xs text-muted-foreground mt-1">Material used</p>
                  </div>
                  <div className="text-center p-3 bg-teal-50 rounded-lg">
                    <p className="text-2xl font-bold text-teal-600">£2.50</p>
                    <p className="text-xs text-muted-foreground mt-1">Material cost</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Both Button */}
      {leftInsoleUrl && rightInsoleUrl && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => {
              handleDownload(leftInsoleUrl, `left-insole-${scan.scanNumber}.stl`);
              setTimeout(() => {
                handleDownload(rightInsoleUrl!, `right-insole-${scan.scanNumber}.stl`);
              }, 500);
            }}
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            Download Both Insoles
          </Button>
        </div>
      )}
    </div>
  );
}
