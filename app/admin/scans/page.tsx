'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';
import nextDynamic from 'next/dynamic';

const Foot3DViewer = nextDynamic(() => import('@/components/scans/foot-3d-viewer'), { ssr: false });
const ScanReport = nextDynamic(() => import('@/components/scans/scan-report'), { ssr: false });
const ScanComparison = nextDynamic(() => import('@/components/scans/scan-comparison'), { ssr: false });
import {
  Footprints,
  Search,
  Filter,
  Eye,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  FileText,
  Brain,
  Loader2,
  Plus,
  QrCode,
  Smartphone,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { t as i18nT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FootScan {
  id: string;
  scanNumber: string;
  status: string;
  archType: string | null;
  archIndex: number | null;
  pronation: string | null;
  calcanealAlignment: number | null;
  halluxValgusAngle: number | null;
  metatarsalSpread: number | null;
  navicularHeight: number | null;
  leftFootLength: number | null;
  rightFootLength: number | null;
  leftFootWidth: number | null;
  rightFootWidth: number | null;
  leftArchHeight: number | null;
  rightArchHeight: number | null;
  strideLength: number | null;
  cadence: number | null;
  gaitAnalysis: any;
  biomechanicData: any;
  aiRecommendation: string | null;
  clinicianNotes: string | null;
  insoleType: string | null;
  insoleSize: string | null;
  productionNotes: string | null;
  manufacturingReport: string | null;
  leftFootImages: string[] | null;
  rightFootImages: string[] | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_UPLOAD: { label: 'Pending Upload', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  SCANNING: { label: 'Scanning', color: 'bg-blue-100 text-blue-800', icon: Footprints },
  PROCESSING: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: Brain },
  PENDING_REVIEW: { label: 'Pending Review', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  IN_PRODUCTION: { label: 'In Production', color: 'bg-cyan-100 text-cyan-800', icon: FileText },
  SHIPPED: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-800', icon: FileText },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

const STATUS_OPTIONS = [
  'PENDING_UPLOAD',
  'SCANNING',
  'PROCESSING',
  'PENDING_REVIEW',
  'APPROVED',
  'IN_PRODUCTION',
  'SHIPPED',
  'DELIVERED'
];

export default function AdminScansPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const { data: session } = useSession() || {};
  const { toast } = useToast();

  const [scans, setScans] = useState<FootScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedScan, setSelectedScan] = useState<FootScan | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    status: '',
    clinicianNotes: '',
    insoleType: '',
    insoleSize: '',
    productionNotes: ''
  });

  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // New Scan QR flow
  const [showNewScanDialog, setShowNewScanDialog] = useState(false);
  const [newScanPatientId, setNewScanPatientId] = useState('');
  const [newScanPatientSearch, setNewScanPatientSearch] = useState('');
  const [patients, setPatients] = useState<{id: string; firstName: string; lastName: string; email: string}[]>([]);
  const [scanToken, setScanToken] = useState('');
  const [scanQrUrl, setScanQrUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Real-time progress
  const [createdScanId, setCreatedScanId] = useState('');
  const [scanProgress, setScanProgress] = useState<{
    status: string; leftImageCount: number; rightImageCount: number; totalImages: number;
    leftImages: string[]; rightImages: string[]; captureMode: string | null; lastUpdated: string;
  } | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchScans();
    fetchPatients();
  }, [statusFilter]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data?.patients ?? []);
      }
    } catch (e) {
      console.error('Error fetching patients:', e);
    }
  };

  const [isCreatingScan, setIsCreatingScan] = useState(false);

  const handleStartNewScan = () => {
    setNewScanPatientId('');
    setNewScanPatientSearch('');
    setScanToken('');
    setScanQrUrl('');
    setLinkCopied(false);
    setShowNewScanDialog(true);
  };

  const handleCreateScanSession = async () => {
    if (!newScanPatientId) {
      toast({ title: 'Select a patient', description: 'Please select a patient first.', variant: 'destructive' });
      return;
    }
    setIsCreatingScan(true);
    try {
      const res = await fetch('/api/foot-scans/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: newScanPatientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanToken(data.scanToken);
        setScanQrUrl(data.scanUrl);
        setCreatedScanId(data.footScan.id);
        setScanProgress(null);
        startProgressPolling(data.footScan.id);
        fetchScans();
        toast({ title: 'Scan Session Created', description: `Token: ${data.scanToken.substring(0, 8)}... — share the link with the patient.` });
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to create scan session', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error creating scan session:', error);
      toast({ title: 'Error', description: 'Failed to create scan session', variant: 'destructive' });
    } finally {
      setIsCreatingScan(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scanQrUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: 'Link Copied', description: 'Scan link copied to clipboard.' });
  };

  const startProgressPolling = (scanId: string) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/foot-scans/${scanId}/progress`);
        if (res.ok) {
          const data = await res.json();
          setScanProgress(data);
          // Stop polling when scan moves beyond PENDING_UPLOAD/SCANNING
          if (data.status !== 'PENDING_UPLOAD' && data.status !== 'SCANNING' && data.totalImages > 0) {
            // Keep polling a few more seconds then stop
            setTimeout(() => stopProgressPolling(), 5000);
          }
        }
      } catch {}
    }, 3000);
  };

  const stopProgressPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Cleanup polling on dialog close or unmount
  useEffect(() => {
    if (!showNewScanDialog) stopProgressPolling();
    return () => stopProgressPolling();
  }, [showNewScanDialog]);

  const fetchScans = async () => {
    try {
      setLoading(true);
      let url = '/api/foot-scans';
      if (statusFilter && statusFilter !== 'ALL') {
        url += `?status=${statusFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter scans by search query
  const filteredScans = scans.filter(scan => {
    const searchLower = searchQuery.toLowerCase();
    return (
      scan.scanNumber.toLowerCase().includes(searchLower) ||
      scan.patient.firstName.toLowerCase().includes(searchLower) ||
      scan.patient.lastName.toLowerCase().includes(searchLower) ||
      scan.patient.email.toLowerCase().includes(searchLower)
    );
  });

  // Open detail dialog
  const handleViewScan = (scan: FootScan) => {
    setSelectedScan(scan);
    setEditForm({
      status: scan.status,
      clinicianNotes: scan.clinicianNotes || '',
      insoleType: scan.insoleType || '',
      insoleSize: scan.insoleSize || '',
      productionNotes: scan.productionNotes || ''
    });
    setShowDetailDialog(true);
  };

  // Run AI analysis
  const handleRunAnalysis = async () => {
    if (!selectedScan) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/foot-scans/${selectedScan.id}/analyze`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedScan(data.footScan);
        toast({
          title: 'Analysis Complete',
          description: 'AI biomechanical analysis has been completed.',
        });
        fetchScans();
      } else {
        const error = await res.json();
        toast({
          title: 'Analysis Failed',
          description: error.error || 'Failed to run analysis',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Error',
        description: 'Failed to run analysis',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save scan changes
  const handleSaveScan = async () => {
    if (!selectedScan) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/foot-scans/${selectedScan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        const updatedScan = await res.json();
        setSelectedScan(updatedScan);
        toast({
          title: 'Saved',
          description: 'Scan details have been updated.',
        });
        fetchScans();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save changes',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedScan) return;
    setIsLoadingReport(true);
    try {
      const res = await fetch(`/api/foot-scans/${selectedScan.id}/report`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        setShowReportDialog(true);
      } else {
        toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Report error:', error);
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Parse AI recommendation
  const parseRecommendation = (rec: string | null) => {
    if (!rec) return null;
    try {
      return JSON.parse(rec);
    } catch {
      return null;
    }
  };

  // Stats
  const stats = {
    total: scans.length,
    pendingReview: scans.filter(s => s.status === 'PENDING_REVIEW').length,
    processing: scans.filter(s => s.status === 'PROCESSING').length,
    approved: scans.filter(s => s.status === 'APPROVED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{T("admin.footScansTitle")}</h1>
          <p className="text-muted-foreground mt-1">
            {T("admin.footScansDesc")}
          </p>
        </div>
        <Button onClick={handleStartNewScan} className="gap-2">
          <Plus className="h-4 w-4" />
          New Foot Scan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Scans</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Footprints className="h-8 w-8 text-bruno-turquoise" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pendingReview}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by scan number, patient name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>
                {STATUS_CONFIG[status]?.label || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scans List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bruno-turquoise"></div>
        </div>
      ) : filteredScans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Footprints className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No foot scans found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredScans.map((scan, index) => {
            const statusConfig = STATUS_CONFIG[scan.status] || STATUS_CONFIG.PENDING_UPLOAD;
            const StatusIcon = statusConfig.icon;

            return (
              <div>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewScan(scan)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-bruno-turquoise/10 rounded-lg">
                          <Footprints className="h-5 w-5 text-bruno-turquoise" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{scan.scanNumber}</h3>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {scan.patient.firstName} {scan.patient.lastName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(scan.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {scan.archType && (
                          <span className="text-sm text-muted-foreground">
                            {scan.archType} arch
                          </span>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Scan {selectedScan?.scanNumber}</span>
              {selectedScan && (
                <Badge className={STATUS_CONFIG[selectedScan.status]?.color}>
                  {STATUS_CONFIG[selectedScan.status]?.label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Patient: {selectedScan?.patient.firstName} {selectedScan?.patient.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedScan && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="images3d">Images & 3D</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="comparison">Compare</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
                {/* Professional Indicators Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-bruno-turquoise/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Arch Index</p>
                      <p className="text-xl font-bold text-bruno-turquoise">
                        {selectedScan.archIndex ? selectedScan.archIndex.toFixed(2) : 'N/A'}
                      </p>
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {selectedScan.archType || 'Unknown'}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card className="border-bruno-turquoise/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Calcaneal Alig.</p>
                      <p className={`text-xl font-bold ${selectedScan.calcanealAlignment && (selectedScan.calcanealAlignment > 5 || selectedScan.calcanealAlignment < -5) ? 'text-orange-500' : 'text-green-600'}`}>
                        {selectedScan.calcanealAlignment ? `${selectedScan.calcanealAlignment}°` : 'N/A'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">Valgo/Varo Deviation</p>
                    </CardContent>
                  </Card>
                  <Card className="border-bruno-turquoise/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Hallux Valgus</p>
                      <p className={`text-xl font-bold ${selectedScan.halluxValgusAngle && selectedScan.halluxValgusAngle > 15 ? 'text-red-500' : 'text-bruno-turquoise'}`}>
                        {selectedScan.halluxValgusAngle ? `${selectedScan.halluxValgusAngle}°` : 'N/A'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">Toe Deviation Angle</p>
                    </CardContent>
                  </Card>
                  <Card className="border-bruno-turquoise/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Metatarsal Spread</p>
                      <p className="text-xl font-bold text-bruno-turquoise">
                        {selectedScan.metatarsalSpread ? `${selectedScan.metatarsalSpread}mm` : 'N/A'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">Ball Width Expansion</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Standard Measurements Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="py-3 bg-muted/50">
                      <CardTitle className="text-sm">Static Dimensions</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Left Length:</span>
                        <span className="font-semibold">{selectedScan.leftFootLength ? `${selectedScan.leftFootLength}mm` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Right Length:</span>
                        <span className="font-semibold">{selectedScan.rightFootLength ? `${selectedScan.rightFootLength}mm` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Left Width:</span>
                        <span className="font-semibold">{selectedScan.leftFootWidth ? `${selectedScan.leftFootWidth}mm` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Right Width:</span>
                        <span className="font-semibold">{selectedScan.rightFootWidth ? `${selectedScan.rightFootWidth}mm` : 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3 bg-muted/50">
                      <CardTitle className="text-sm">Arches & Posture</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Navicular Height:</span>
                        <span className="font-semibold">{selectedScan.navicularHeight ? `${selectedScan.navicularHeight}mm` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pronation:</span>
                        <span className="font-semibold">{selectedScan.pronation || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Left Arch Height:</span>
                        <span className="font-semibold">{selectedScan.leftArchHeight ? `${selectedScan.leftArchHeight}mm` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Right Arch Height:</span>
                        <span className="font-semibold">{selectedScan.rightArchHeight ? `${selectedScan.rightArchHeight}mm` : 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3 bg-muted/50">
                      <CardTitle className="text-sm">Dynamic Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stride Length:</span>
                        <span className="font-semibold">{selectedScan.strideLength ? `${selectedScan.strideLength}mm` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cadence:</span>
                        <span className="font-semibold">{selectedScan.cadence ? `${selectedScan.cadence} steps/min` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gait Pattern:</span>
                        <span className="font-semibold">{selectedScan.gaitAnalysis?.pattern || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="images3d" className="space-y-6 mt-4">
                {/* Captured Images */}
                {((selectedScan.leftFootImages as string[] | null)?.length || (selectedScan.rightFootImages as string[] | null)?.length) ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Captured Images</h3>
                    {(selectedScan.leftFootImages as string[] | null)?.length ? (
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-2">Left Foot ({(selectedScan.leftFootImages as string[]).length} images)</p>
                        <div className="grid grid-cols-5 gap-2">
                          {(selectedScan.leftFootImages as string[]).map((url: string, i: number) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-slate-100">
                              <img src={url} alt={`Left foot ${i+1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {(selectedScan.rightFootImages as string[] | null)?.length ? (
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-2">Right Foot ({(selectedScan.rightFootImages as string[]).length} images)</p>
                        <div className="grid grid-cols-5 gap-2">
                          {(selectedScan.rightFootImages as string[]).map((url: string, i: number) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-slate-100">
                              <img src={url} alt={`Right foot ${i+1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Footprints className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No images captured yet.</p>
                    </CardContent>
                  </Card>
                )}

                {/* 3D Viewer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">3D Foot Model</h3>
                      <p className="text-xs text-muted-foreground">
                        Interactive 3D model generated from scan measurements.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm" variant="outline" className="text-xs h-7 gap-1"
                        onClick={() => window.open(`/api/foot-scans/${selectedScan.id}/export-stl?side=left`, '_blank')}
                      >
                        <Footprints className="h-3 w-3" /> STL Left
                      </Button>
                      <Button
                        size="sm" variant="outline" className="text-xs h-7 gap-1"
                        onClick={() => window.open(`/api/foot-scans/${selectedScan.id}/export-stl?side=right`, '_blank')}
                      >
                        <Footprints className="h-3 w-3" /> STL Right
                      </Button>
                    </div>
                  </div>
                  <Foot3DViewer
                    measurements={{
                      leftFootLength: selectedScan.leftFootLength,
                      rightFootLength: selectedScan.rightFootLength,
                      leftFootWidth: selectedScan.leftFootWidth,
                      rightFootWidth: selectedScan.rightFootWidth,
                      leftArchHeight: selectedScan.leftArchHeight,
                      rightArchHeight: selectedScan.rightArchHeight,
                      archType: selectedScan.archType,
                      pronation: selectedScan.pronation,
                      navicularHeight: selectedScan.navicularHeight,
                      calcanealAlignment: selectedScan.calcanealAlignment,
                      halluxValgusAngle: selectedScan.halluxValgusAngle,
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="comparison" className="mt-4">
                <ScanComparison scanId={selectedScan.id} />
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                {/* Run Analysis Button */}
                {(selectedScan.status === 'SCANNING' || selectedScan.status === 'PENDING_UPLOAD') && (
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing}
                    className="w-full bg-bruno-turquoise hover:bg-bruno-turquoise-dark"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running Analysis...</>
                    ) : (
                      <><Brain className="h-4 w-4 mr-2" /> Run AI Analysis</>
                    )}
                  </Button>
                )}

                {/* Biomechanic Data */}
                {selectedScan.biomechanicData && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Biomechanic Findings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {selectedScan.biomechanicData.pressureDistribution && (
                        <div>
                          <strong>Pressure Distribution:</strong>
                          <p className="text-muted-foreground">{selectedScan.biomechanicData.pressureDistribution}</p>
                        </div>
                      )}
                      {selectedScan.biomechanicData.alignmentIssues?.length > 0 && (
                        <div>
                          <strong>Alignment Issues:</strong>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {selectedScan.biomechanicData.alignmentIssues.map((issue: string, i: number) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedScan.biomechanicData.riskFactors?.length > 0 && (
                        <div>
                          <strong>Risk Factors:</strong>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {selectedScan.biomechanicData.riskFactors.map((risk: string, i: number) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Gait Analysis */}
                {selectedScan.gaitAnalysis && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Gait Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <strong>Pattern:</strong> {selectedScan.gaitAnalysis.pattern || 'N/A'}
                      </div>
                      <div>
                        <strong>Symmetry:</strong> {selectedScan.gaitAnalysis.symmetry || 'N/A'}
                      </div>
                      {selectedScan.gaitAnalysis.concerns?.length > 0 && (
                        <div>
                          <strong>Concerns:</strong>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {selectedScan.gaitAnalysis.concerns.map((concern: string, i: number) => (
                              <li key={i}>{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4 mt-4">
                {(() => {
                  const rec = parseRecommendation(selectedScan.aiRecommendation);
                  if (!rec) return <p className="text-muted-foreground py-8 text-center">No AI recommendations available yet. Run analysis first.</p>;

                  return (
                    <>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Clinical Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{rec.clinicalSummary}</p>
                        </CardContent>
                      </Card>

                      {rec.recommendations && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Insole Recommendations</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div><strong>Type:</strong> {rec.recommendations.insoleType}</div>
                            <div><strong>Support Level:</strong> {rec.recommendations.supportLevel}</div>
                            {rec.recommendations.additionalSupport?.length > 0 && (
                              <div>
                                <strong>Additional Support:</strong>
                                <ul className="list-disc list-inside text-muted-foreground">
                                  {rec.recommendations.additionalSupport.map((s: string, i: number) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {rec.recommendations.exercises?.length > 0 && (
                              <div>
                                <strong>Recommended Exercises:</strong>
                                <ul className="list-disc list-inside text-muted-foreground">
                                  {rec.recommendations.exercises.map((ex: string, i: number) => (
                                    <li key={i}>{ex}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div><strong>Footwear Advice:</strong> {rec.recommendations.footwearAdvice}</div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Update Scan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-bruno-turquoise/10 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-bruno-turquoise flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" /> Relatório de Fabricação
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">Variáveis otimizadas para laboratório de palmilhas.</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-bruno-turquoise text-bruno-turquoise hover:bg-bruno-turquoise hover:text-white gap-1"
                        onClick={handleGenerateReport}
                        disabled={isLoadingReport}
                      >
                        {isLoadingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Gerar Report PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={editForm.status}
                          onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(status => (
                              <SelectItem key={status} value={status}>
                                {STATUS_CONFIG[status]?.label || status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Insole Type</Label>
                        <Select
                          value={editForm.insoleType}
                          onValueChange={(v) => setEditForm({ ...editForm, insoleType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sport">Sport</SelectItem>
                            <SelectItem value="Comfort">Comfort</SelectItem>
                            <SelectItem value="Medical">Medical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Insole Size</Label>
                      <Input
                        placeholder="e.g., EU42, UK8"
                        value={editForm.insoleSize}
                        onChange={(e) => setEditForm({ ...editForm, insoleSize: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Clinician Notes</Label>
                      <Textarea
                        placeholder="Add clinical observations..."
                        value={editForm.clinicianNotes}
                        onChange={(e) => setEditForm({ ...editForm, clinicianNotes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Production Notes</Label>
                      <Textarea
                        placeholder="Add production instructions..."
                        value={editForm.productionNotes}
                        onChange={(e) => setEditForm({ ...editForm, productionNotes: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            <Button
              onClick={handleSaveScan}
              disabled={isSaving}
              className="bg-bruno-turquoise hover:bg-bruno-turquoise-dark"
            >
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ═══ NEW SCAN QR CODE DIALOG ═══ */}
      <Dialog open={showNewScanDialog} onOpenChange={setShowNewScanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              New Foot Scan Session
            </DialogTitle>
            <DialogDescription>
              Generate a QR code for the patient to scan their feet using their mobile device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label>Select Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient..."
                  value={newScanPatientSearch}
                  onChange={(e) => setNewScanPatientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={newScanPatientId} onValueChange={setNewScanPatientId}>
                <SelectTrigger><SelectValue placeholder="Choose patient" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {patients.filter(p => {
                    if (!newScanPatientSearch) return true;
                    const s = newScanPatientSearch.toLowerCase();
                    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) || p.email.toLowerCase().includes(s);
                  }).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!scanQrUrl ? (
              <Button
                className="w-full gap-2"
                onClick={handleCreateScanSession}
                disabled={!newScanPatientId || isCreatingScan}
              >
                {isCreatingScan ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Generate Scan QR Code
              </Button>
            ) : (
              <>
                {/* QR Code */}
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="p-4 bg-white rounded-xl border-2 border-primary/20 shadow-sm">
                    <QRCodeSVG
                      value={scanQrUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                      fgColor="#607d7d"
                    />
                  </div>
                  <div className="flex gap-2 w-full">
                    <Input value={scanQrUrl} readOnly className="text-xs" />
                    <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1 flex-shrink-0">
                      {linkCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      {linkCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(scanQrUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4" /> Open Link
                  </Button>
                </div>

                {/* Instructions */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex gap-2 mb-3">
                      <Smartphone className="h-5 w-5 text-primary flex-shrink-0" />
                      <p className="text-sm font-semibold">How to Scan</p>
                    </div>
                    <ol className="text-xs text-muted-foreground space-y-2 ml-7 list-decimal">
                      <li><strong>Show the QR code</strong> to the patient on your screen, or send them the link.</li>
                      <li>The patient opens it on their <strong>phone or tablet</strong>.</li>
                      <li>They follow step-by-step instructions to capture <strong>10 photos</strong> (5 angles per foot).</li>
                      <li>Photos are <strong>securely uploaded</strong> to the system.</li>
                      <li>You can then run <strong>AI biomechanical analysis</strong> on the uploaded images.</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <p className="text-xs text-amber-800">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      <strong>What the patient needs:</strong> A smartphone with a camera. No app required — works in the browser. A4 paper for scale reference. Good lighting. Bare feet.
                    </p>
                  </CardContent>
                </Card>

                {/* ═══ REAL-TIME PROGRESS ═══ */}
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          !scanProgress || scanProgress.totalImages === 0
                            ? 'bg-amber-400 animate-pulse'
                            : scanProgress.status === 'SCANNING'
                              ? 'bg-green-500 animate-pulse'
                              : 'bg-green-500'
                        }`} />
                        {!scanProgress || scanProgress.totalImages === 0
                          ? 'Waiting for patient to connect...'
                          : scanProgress.status === 'SCANNING'
                            ? `Receiving photos — ${scanProgress.totalImages} uploaded`
                            : `${scanProgress.totalImages} photos received`}
                      </p>
                      {scanProgress?.captureMode && (
                        <Badge variant="outline" className="text-[9px]">
                          {scanProgress.captureMode === 'clinician' ? 'Clinician Mode' : 'Self-Scan'}
                        </Badge>
                      )}
                    </div>

                    {scanProgress && scanProgress.totalImages > 0 && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-blue-600 font-medium mb-1">Left Foot ({scanProgress.leftImageCount})</p>
                            <div className="flex gap-0.5">
                              {(scanProgress.leftImages || []).map((url: string, i: number) => (
                                <div key={i} className="w-8 h-8 rounded border overflow-hidden bg-slate-100">
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {scanProgress.leftImageCount === 0 && <p className="text-[9px] text-slate-400">No images yet</p>}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-medium mb-1">Right Foot ({scanProgress.rightImageCount})</p>
                            <div className="flex gap-0.5">
                              {(scanProgress.rightImages || []).map((url: string, i: number) => (
                                <div key={i} className="w-8 h-8 rounded border overflow-hidden bg-slate-100">
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {scanProgress.rightImageCount === 0 && <p className="text-[9px] text-slate-400">No images yet</p>}
                            </div>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground text-right">
                          Last update: {new Date(scanProgress.lastUpdated).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewScanDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ REPORT DIALOG ═══ */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Biomechanical Scan Report
            </DialogTitle>
            <DialogDescription>
              {reportData?.reportId} — {reportData?.patient?.name}
            </DialogDescription>
          </DialogHeader>
          {reportData && (
            <ScanReport
              report={reportData}
              onClose={() => setShowReportDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
