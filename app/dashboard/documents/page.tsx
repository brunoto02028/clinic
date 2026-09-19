"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileUp,
  Camera,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Loader2,
  Calendar,
  User,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { validatePatientFile, DOCUMENT_MAX_BYTES } from "@/lib/patient-documents-shared";

const DOC_TYPES = [
  { value: "MEDICAL_REFERRAL", labelEn: "Medical Referral", labelPt: "Encaminhamento Médico" },
  { value: "MEDICAL_REPORT", labelEn: "Medical Report", labelPt: "Laudo Médico" },
  { value: "PRESCRIPTION", labelEn: "Prescription", labelPt: "Prescrição" },
  { value: "IMAGING", labelEn: "Imaging (X-ray, MRI)", labelPt: "Exames de Imagem (Raio-X, RM)" },
  { value: "INSURANCE", labelEn: "Insurance", labelPt: "Seguro" },
  { value: "PREVIOUS_TREATMENT", labelEn: "Previous Treatment", labelPt: "Tratamento Anterior" },
  { value: "OTHER", labelEn: "Other", labelPt: "Outro" },
];

// Only 4 semantic tokens exist in the brand palette (ok/warn/bad/health) for
// 6 document types that need to stay visually tell-apart-able — two pairs
// share a color rather than collapsing further, since no real semantic match
// exists for most of these categories.
const DOC_TYPE_COLORS: Record<string, string> = {
  MEDICAL_REFERRAL: "bg-ba1-health/15 text-ba1-health",
  MEDICAL_REPORT: "bg-ba1-warn/15 text-ba1-warn",
  PRESCRIPTION: "bg-ba1-ok/15 text-ba1-ok",
  IMAGING: "bg-ba1-bad/15 text-ba1-bad",
  INSURANCE: "bg-ba1-health/15 text-ba1-health",
  CONSENT_FORM: "bg-muted text-foreground",
  PREVIOUS_TREATMENT: "bg-ba1-warn/15 text-ba1-warn",
  OTHER: "bg-muted text-muted-foreground",
};

export default function PatientDocumentsPage() {
  const { locale } = useLocale();
  const { relabel } = useVocab();
  const T = (key: string) => relabel(i18nT(key, locale));
  const isPt = locale === "pt-BR";
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  // Quick capture (top-bar "Take Photo") uploads the single shot right
  // away. Started from inside the upload form instead, a capture is just
  // another selected file — added to the same batch as picked files, camera
  // stays open so a multi-page document can be scanned page by page, and
  // nothing sends until "Send" is pressed.
  const [cameraForForm, setCameraForForm] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadType, setUploadType] = useState("OTHER");
  const [uploadDoctor, setUploadDoctor] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // Each file is its own request — one being too large or the wrong type
  // must not lose the others. A file only leaves `selectedFiles` once it has
  // actually been saved, so a failed batch can be retried without
  // re-sending (and duplicating) whatever already went through.
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError("");
    const failed: { name: string; message: string }[] = [];
    const stillPending: File[] = [];

    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", uploadTitle || file.name);
        formData.append("description", uploadDesc);
        formData.append("documentType", uploadType);
        formData.append("doctorName", uploadDoctor);
        formData.append("source", "PATIENT_UPLOAD");
        if (uploadDate) formData.append("documentDate", uploadDate);

        const res = await fetch("/api/patient/documents", { method: "POST", body: formData });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          failed.push({ name: file.name, message: d.error || (isPt ? "Falha ao enviar" : "Upload failed") });
          stillPending.push(file);
        }
      } catch {
        failed.push({ name: file.name, message: isPt ? "Erro de conexão" : "Connection error" });
        stillPending.push(file);
      }
    }

    setUploading(false);
    fetchDocs(); // whatever succeeded shows up right away, even if others failed

    if (failed.length === 0) {
      resetForm();
    } else {
      setSelectedFiles(stillPending); // only the ones that didn't make it — retry won't duplicate the rest
      setError(
        isPt
          ? `${failed.length} de ${selectedFiles.length} arquivo(s) não enviado(s): ${failed.map(f => `${f.name} (${f.message})`).join("; ")}`
          : `${failed.length} of ${selectedFiles.length} file(s) not sent: ${failed.map(f => `${f.name} (${f.message})`).join("; ")}`
      );
    }
  };

  const startCamera = async (forForm = false) => {
    setCameraForForm(forForm);
    setCapturedCount(0);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError(isPt ? "Não foi possível acessar a câmera. Verifique as permissões." : "Could not access camera. Check your permissions.");
      setShowCamera(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });

      // From inside the upload form: add this page to the batch and keep
      // the camera open for the next one — nothing uploads until Send.
      if (cameraForForm) {
        const invalid = validatePatientFile(file);
        if (invalid) { setError(invalid); return; }
        setSelectedFiles((prev) => [...prev, file]);
        setCapturedCount((n) => n + 1);
        return;
      }

      // Quick capture (top bar): single shot, uploads immediately.
      stopCamera();
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", uploadTitle || (isPt ? "Foto da Câmera" : "Camera Photo"));
        formData.append("description", uploadDesc);
        formData.append("documentType", uploadType);
        formData.append("doctorName", uploadDoctor);
        formData.append("source", "PATIENT_CAMERA");
        if (uploadDate) formData.append("documentDate", uploadDate);

        const res = await fetch("/api/patient/documents", { method: "POST", body: formData });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        resetForm();
        fetchDocs();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    }, "image/jpeg", 0.9);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const resetForm = () => {
    setShowUpload(false);
    setUploadTitle("");
    setUploadDesc("");
    setUploadType("OTHER");
    setUploadDoctor("");
    setUploadDate("");
    setSelectedFiles([]);
    setCapturedCount(0);
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
        <span className="ml-2 text-sm text-muted-foreground">{T("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {T("documents.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {T("documents.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => startCamera()} className="flex-1 sm:flex-none">
            <Camera className="h-4 w-4 mr-1.5" /> {T("documents.takePhoto")}
          </Button>
          <Button size="sm" onClick={() => setShowUpload(true)} className="flex-1 sm:flex-none">
            <FileUp className="h-4 w-4 mr-1.5" /> {T("documents.upload")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setError("")}><X className="h-3 w-3" /></Button>
        </div>
      )}

      {/* Camera */}
      {showCamera && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full max-h-[50vh] object-contain" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {cameraForForm && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {capturedCount === 0
                  ? (isPt ? "Posicione o documento e capture — pode tirar várias páginas antes de concluir." : "Position the document and capture — you can scan several pages before finishing.")
                  : (isPt ? `${capturedCount} página(s) capturada(s). Continue ou toque em Concluir.` : `${capturedCount} page(s) captured. Keep going or tap Done.`)}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-2 mt-3">
              {!cameraForForm && (
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="h-10 sm:h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{isPt ? t.labelPt : t.labelEn}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <Button onClick={capturePhoto} disabled={uploading} className="flex-1">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Camera className="h-4 w-4 mr-1.5" /> {T("documents.capture")}</>}
                </Button>
                <Button variant="outline" onClick={stopCamera} className="flex-1">
                  {cameraForForm && capturedCount > 0 ? (isPt ? "Concluir" : "Done") : T("common.cancel")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      {showUpload && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base"><FileUp className="h-4 w-4 inline mr-1.5" /> {isPt ? "Enviar Documento" : "Upload Document"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isPt ? "Tipo de Documento" : "Document Type"}</Label>
                <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{isPt ? t.labelPt : t.labelEn}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Título" : "Title"}</Label>
                <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder={isPt ? "ex. Carta de Encaminhamento" : "e.g. GP Referral Letter"} />
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Nome do Médico / Clínica" : "Doctor / Clinic Name"}</Label>
                <Input value={uploadDoctor} onChange={(e) => setUploadDoctor(e.target.value)} placeholder={isPt ? "(opcional)" : "(optional)"} />
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Data do Documento" : "Document Date"}</Label>
                <Input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Observações" : "Notes"}</Label>
              <Textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} placeholder={isPt ? "Informações adicionais..." : "Any additional information..."} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Arquivos (fotos, PDF, Word…)" : "Files (photos, PDF, Word…)"}</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                  multiple
                  className="flex-1"
                  onChange={(e) => {
                  if (!e.target.files) return;
                  const picked = Array.from(e.target.files);
                  // Caught here, before anything is sent — a big scanned PDF
                  // over a weak connection otherwise uploads in full only to
                  // be rejected afterwards, which is slow and confusing.
                  const tooLarge = picked.filter((f) => validatePatientFile(f));
                  const ok = picked.filter((f) => !validatePatientFile(f));
                  setSelectedFiles((prev) => [...prev, ...ok]);
                  if (tooLarge.length > 0) {
                    setError(
                      isPt
                        ? `${tooLarge.length} arquivo(s) não aceito(s) (máx. 25MB ou tipo não suportado): ${tooLarge.map(f => f.name).join(", ")}`
                        : `${tooLarge.length} file(s) not accepted (max 25MB or unsupported type): ${tooLarge.map(f => f.name).join(", ")}`
                    );
                  }
                  e.target.value = ""; // lets picking the exact same file again re-trigger onChange
                  }}
                />
                <Button type="button" variant="outline" onClick={() => startCamera(true)} className="sm:w-auto">
                  <Camera className="h-4 w-4 mr-1.5" /> {isPt ? "Tirar Foto / Escanear" : "Take Photo / Scan"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isPt
                  ? `Máx. ${DOCUMENT_MAX_BYTES / 1024 / 1024}MB por arquivo. Se o PDF for muito grande (ex.: digitalização em alta resolução), use "Tirar Foto / Escanear" — dá pra capturar várias páginas antes de enviar.`
                  : `Max ${DOCUMENT_MAX_BYTES / 1024 / 1024}MB per file. If a PDF is too large (e.g. a high-resolution scan), use "Take Photo / Scan" — you can capture several pages before sending.`}
              </p>
              {selectedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedFiles.length} {isPt ? "arquivo(s)" : "file(s)"}: {selectedFiles.map(f => f.name).join(", ")}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> {T("common.loading")}</> : <><FileUp className="h-4 w-4 mr-1.5" /> {T("documents.upload")}</>}
              </Button>
              <Button variant="outline" onClick={resetForm}>{T("common.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">{T("documents.noDocuments")}</p>
            <p className="text-sm mt-1">{T("documents.noDocumentsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div
                  className="w-full h-36 rounded-lg bg-muted/50 flex items-center justify-center mb-2.5 cursor-pointer overflow-hidden"
                  onClick={() => setPreviewDoc(doc)}
                >
                  {doc.fileType?.startsWith("image/") ? (
                    <img src={doc.fileUrl} alt={doc.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-1" />
                      <span className="text-[10px] text-muted-foreground">PDF</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={`text-[9px] ${DOC_TYPE_COLORS[doc.documentType] || ""}`}>
                      {isPt ? DOC_TYPES.find(t => t.value === doc.documentType)?.labelPt : DOC_TYPES.find(t => t.value === doc.documentType)?.labelEn || doc.documentType}
                    </Badge>
                    {doc.isVerified && <Badge className="text-[9px] bg-ba1-ok/15 text-ba1-ok"><CheckCircle2 className="h-2 w-2 mr-0.5" /> {isPt ? "Verificado" : "Verified"}</Badge>}
                  </div>
                  <h3 className="font-medium text-sm truncate">{doc.title || doc.fileName}</h3>
                  {doc.doctorName && <p className="text-[10px] text-muted-foreground">Dr. {doc.doctorName}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPreviewDoc(doc)}>
                    <Eye className="h-3 w-3 mr-0.5" /> {isPt ? "Ver" : "View"}
                  </Button>
                  <a href={doc.fileUrl} download={doc.fileName} className="inline-flex items-center h-6 px-1.5 text-[10px] rounded hover:bg-muted">
                    <Download className="h-3 w-3 mr-0.5" /> {isPt ? "Baixar" : "Download"}
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="absolute -top-10 right-0 text-white" onClick={() => setPreviewDoc(null)}>
              <X className="h-5 w-5" /> {isPt ? "Fechar" : "Close"}
            </Button>
            {previewDoc.fileType?.startsWith("image/") ? (
              <img src={previewDoc.fileUrl} alt={previewDoc.title} className="w-full max-h-[85vh] object-contain rounded-lg" />
            ) : (
              <iframe src={previewDoc.fileUrl} className="w-full h-[85vh] rounded-lg bg-card" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
