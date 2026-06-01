"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { FootScan3DViewer } from '@/components/foot-scan/3d-viewer';
import { ProductionTimeline } from '@/components/insoles/production-timeline';
import { UsageInstructions } from '@/components/insoles/usage-instructions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PatientScanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScan();
  }, [params.id]);

  const fetchScan = async () => {
    try {
      const res = await fetch(`/api/foot-scans/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setScan(data);
      }
    } catch (error) {
      console.error('Error fetching scan:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!scan) {
    return <div className="p-6">Scan não encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Suas Palmilhas</h1>
            <p className="text-sm text-gray-600">Scan #{scan.scanNumber}</p>
          </div>
        </div>

        <Tabs defaultValue="3d" className="space-y-6">
          <TabsList>
            <TabsTrigger value="3d">Visualização 3D</TabsTrigger>
            <TabsTrigger value="timeline">Produção</TabsTrigger>
            <TabsTrigger value="instructions">Como Usar</TabsTrigger>
          </TabsList>

          <TabsContent value="3d" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Suas Palmilhas em 3D</CardTitle>
                <CardDescription>Visualize suas palmilhas personalizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px]">
                  <FootScan3DViewer
                    leftInsoleUrl={scan.leftInsoleSTL}
                    rightInsoleUrl={scan.rightInsoleSTL}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Status da Produção</CardTitle>
                <CardDescription>Acompanhe o progresso das suas palmilhas</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductionTimeline
                  workflowStatus={scan.workflowStatus}
                  createdAt={new Date(scan.createdAt)}
                  reviewedAt={scan.reviewedAt ? new Date(scan.reviewedAt) : null}
                  approvedAt={scan.approvedAt ? new Date(scan.approvedAt) : null}
                  manufacturingReadyAt={scan.manufacturingReadyAt ? new Date(scan.manufacturingReadyAt) : null}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructions">
            <Card>
              <CardHeader>
                <CardTitle>Instruções de Uso</CardTitle>
                <CardDescription>Como usar e cuidar das suas palmilhas</CardDescription>
              </CardHeader>
              <CardContent>
                <UsageInstructions />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
