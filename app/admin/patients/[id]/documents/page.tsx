"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileUp,
  Camera,
  RefreshCw,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Loader2,
  Shield,
  Calendar,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DOC_TYPES = [
  { value: "MEDICAL_REFERRAL", label: "Medical Referral" },
  { value: "MEDICAL_REPORT", label: "Medical Report" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "IMAGING", label: "Imaging (X-ray, MRI)" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "PREVIOUS_TREATMENT", label: "Previous Treatment" },
  { value: "OTHER", label: "Other" },
];

const DOC_TYPE_COLORS: Record<string, string> = {
  MEDICAL_REFERRAL: "bg-blue-100 text-blue-700",
  MEDICAL_REPORT: "bg-purple-100 text-purple-700",
  PRESCRIPTION: "bg-green-100 text-green-700",
  IMAGING: "bg-amber-100 text-amber-700",
  INSURANCE: "bg-teal-100 text-teal-700",
  CONSENT_FORM: "bg-slate-100 text-slate-700",
  PREVIOUS_TREATMENT: "bg-orange-100 text-orange-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default function PatientDocumentsPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();

  const [patientName, setPatientName] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadType, setUploadType] = useState("OTHER");
  const [uploadDoctor, setUploadDoctor] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, patientRes] = await Promise.all([
        fetch(`/api/admin/patients/${patientId}/documents`),
        fetch(`/api/admin/patients/${patientId}`),
      ]);
      const docsData = await docsRes.json();
      if (!docsRes.ok) throw new Error(docsData.error);
      setDocuments(docsData.documents || []);
      if (patientRes.ok) {
        const pd = await patientRes.json();
        if (pd.patient) setPatientName(`${pd.patient.firstName || ''} ${pd.patient.lastName || ''}`.trim());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", uploadTitle || file.name);
        formData.append("description", uploadDesc);
        formData.append("documentType", uploadType);
        formData.append("doctorName", uploadDoctor);
        formData.append("source", "ADMIN_UPLOAD");
        if (uploadDate) formData.append("documentDate", uploadDate);

        const res = await fetch(`/api/admin/patients/${patientId}/documents`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
      }
      resetForm();
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();

      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      setUploading(true);
      setError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", uploadTitle || "Camera Capture");
        formData.append("description", uploadDesc);
        formData.append("documentType", uploadType);
        formData.append("doctorName", uploadDoctor);
        formData.append("source", "ADMIN_CAMERA");
        if (uploadDate) formData.append("documentDate", uploadDate);

        const res = await fetch(`/api/admin/patients/${patientId}/documents`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        resetForm();
        fetchDocuments();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    }, "image/jpeg", 0.9);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const handleVerify = async (docId: string, verified: boolean) => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, isVerified: verified }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/documents?documentId=${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setShowUploadForm(false);
    setUploadTitle("");
    setUploadDesc("");
    setUploadType("OTHER");
    setUploadDoctor("");
    setUploadDate("");
    setSelectedFiles([]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/patients/${patientId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {patientName ? `${patientName} — Documents` : 'Patient Documents'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Referrals, reports, prescriptions and medical images
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={startCamera}>
            <Camera className="h-4 w-4 mr-2" /> Take Photo
          </Button>
          <Button onClick={() => setShowUploadForm(true)}>
            <FileUp className="h-4 w-4 mr-2" /> Upload Document
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setError("")}><X className="h-3 w-3" /></Button>
        </div>
      )}

      {/* Camera View */}
      {showCamera && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full max-h-[60vh] object-contain" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex items-center justify-center gap-3 mt-4">
              {/* Quick metadata before capture */}
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <Input
                placeholder="Document title (optional)"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="max-w-[200px]"
              />
              <Button size="lg" onClick={capturePhoto} disabled={uploading}>
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5 mr-2" />}
                Capture
              </Button>
              <Button variant="outline" onClick={stopCamera}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileUp className="h-4 w-4" /> Upload Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g. Dr. Smith Referral Letter" />
              </div>
              <div className="space-y-2">
                <Label>Referring Doctor</Label>
                <Input value={uploadDoctor} onChange={(e) => setUploadDoctor(e.target.value)} placeholder="Doctor name (optional)" />
              </div>
              <div className="space-y-2">
                <Label>Document Date</Label>
                <Input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} placeholder="Additional notes about this document..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Files (PDF, JPEG, PNG)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" multiple onChange={handleFileSelect} />
              {selectedFiles.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(", ")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><FileUp className="h-4 w-4 mr-2" /> Upload</>}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p>No documents uploaded yet.</p>
            <p className="text-sm mt-1">Upload referral letters, medical reports, or take photos of documents.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Preview */}
                <div
                  className="w-full h-40 rounded-lg bg-muted/50 flex items-center justify-center mb-3 cursor-pointer overflow-hidden"
                  onClick={() => setPreviewDoc(doc)}
                >
                  {doc.fileType?.startsWith("image/") ? (
                    <img src={doc.fileUrl} alt={doc.title || doc.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">PDF Document</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${DOC_TYPE_COLORS[doc.documentType] || ""}`}>
                      {DOC_TYPES.find(t => t.value === doc.documentType)?.label || doc.documentType}
                    </Badge>
                    {doc.isVerified && (
                      <Badge className="text-[10px] bg-green-100 text-green-700">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Verified
                      </Badge>
                    )}
                    {doc.source?.includes("CAMERA") && (
                      <Badge variant="outline" className="text-[10px]">
                        <Camera className="h-2.5 w-2.5 mr-0.5" /> Photo
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-medium text-sm truncate">{doc.title || doc.fileName}</h3>
                  {doc.doctorName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Dr. {doc.doctorName}
                    </p>
                  )}
                  {doc.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{doc.fileSize ? formatSize(doc.fileSize) : ""} · {doc.fileType?.split("/").pop()?.toUpperCase()}</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Uploaded by {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName} ({doc.uploadedBy?.role})
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPreviewDoc(doc)}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  <a href={doc.fileUrl} download={doc.fileName} className="inline-flex items-center h-7 px-2 text-xs rounded-md hover:bg-muted">
                    <Download className="h-3 w-3 mr-1" /> Download
                  </a>
                  {!doc.isVerified ? (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => handleVerify(doc.id, true)}>
                      <Shield className="h-3 w-3 mr-1" /> Verify
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600" onClick={() => handleVerify(doc.id, false)}>
                      <Shield className="h-3 w-3 mr-1" /> Unverify
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive ml-auto" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 text-white hover:text-white/80"
              onClick={() => setPreviewDoc(null)}
            >
              <X className="h-5 w-5" /> Close
            </Button>
            {previewDoc.fileType?.startsWith("image/") ? (
              <img src={previewDoc.fileUrl} alt={previewDoc.title || previewDoc.fileName} className="w-full max-h-[85vh] object-contain rounded-lg" />
            ) : (
              <iframe src={previewDoc.fileUrl} className="w-full h-[85vh] rounded-lg bg-white" />
            )}
            <div className="mt-2 text-white text-sm text-center">
              {previewDoc.title || previewDoc.fileName}
              {previewDoc.doctorName && <span> · Dr. {previewDoc.doctorName}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
