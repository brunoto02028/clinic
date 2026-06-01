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
import { PageLoading } from '@/components/ui/loading-spinner';
import { ErrorState, NotFoundError } from '@/components/ui/error-state';

export default function PatientScanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScan();
  }, [params.id]);

  const fetchScan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/foot-scans/${params.id}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('not_found');
        } else if (res.status === 403) {
          setError('permission_denied');
        } else {
          setError('unknown');
        }
        return;
      }
      
      const data = await res.json();
      setScan(data);
    } catch (error) {
      console.error('Error fetching scan:', error);
      setError('network');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading text="Carregando suas palmilhas..." />;
  }

  if (error === 'not_found') {
    return <NotFoundError resourceName="scan" />;
  }

  if (error === 'permission_denied') {
    return (
      <ErrorState
        title="Acesso Negado"
        message="Você não tem permissão para visualizar este scan."
        showHomeButton
        fullScreen
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Erro ao Carregar"
        message="Não foi possível carregar os dados do scan."
        onRetry={fetchScan}
        showHomeButton
        fullScreen
      />
    );
  }

  if (!scan) {
    return <NotFoundError resourceName="scan" />;
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
