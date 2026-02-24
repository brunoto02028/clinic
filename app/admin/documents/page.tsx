"use client";

import { useState, useRef, useCallback } from "react";
import {
  FileText, Upload, Loader2, CheckCircle, AlertCircle,
  FileType, Table2, Brain, ScanText, Download, Copy,
  ChevronDown, X, FileImage, FileSpreadsheet, Presentation,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Action = "convert" | "extract" | "analyze" | "ocr";
type SubType = string;

const ACTIONS: { value: Action; label: string; icon: any; description: string }[] = [
  { value: "convert", label: "Convert", icon: FileType, description: "Convert to Markdown, JSON, HTML or Text" },
  { value: "extract", label: "Extract", icon: Table2, description: "Extract text, tables, metadata, structure" },
  { value: "analyze", label: "Analyze", icon: Brain, description: "Summary, keywords, entities" },
  { value: "ocr", label: "OCR", icon: ScanText, description: "Optical character recognition for images/scans" },
];

const SUB_OPTIONS: Record<Action, { value: string; label: string }[]> = {
  convert: [
    { value: "markdown", label: "Markdown" },
    { value: "json", label: "JSON" },
    { value: "html", label: "HTML" },
    { value: "text", label: "Plain Text" },
  ],
  extract: [
    { value: "text", label: "Text" },
    { value: "tables", label: "Tables" },
    { value: "metadata", label: "Metadata" },
    { value: "structure", label: "Structure" },
  ],
  analyze: [
    { value: "summary", label: "Summary" },
    { value: "keywords", label: "Keywords" },
    { value: "entities", label: "Entities" },
  ],
  ocr: [],
};

const FILE_ICONS: Record<string, any> = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
  jpg: FileImage, jpeg: FileImage, png: FileImage, tiff: FileImage, bmp: FileImage,
};

export default function DocumentsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [file, setFile] = useState<File | null>(null);
  const [action, setAction] = useState<Action>("convert");
  const [subType, setSubType] = useState<SubType>("markdown");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ext = file?.name.split(".").pop()?.toLowerCase() || "";
  const FileIcon = FILE_ICONS[ext] || FileText;
  const activeAction = ACTIONS.find(a => a.value === action) || ACTIONS[0];
  const ActiveActionIcon = activeAction.icon;

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      let endpoint: string;
      if (action === "convert") {
        formData.append("format", subType);
        endpoint = "/api/admin/documents/convert";
      } else if (action === "extract") {
        formData.append("type", subType);
        endpoint = "/api/admin/documents/extract";
      } else if (action === "analyze") {
        formData.append("type", subType);
        endpoint = "/api/admin/documents/analyze";
      } else {
        endpoint = "/api/admin/documents/ocr";
      }

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Failed: ${res.status}`);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const copyResult = () => {
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const renderResult = () => {
    if (!result) return null;

    const content = result?.data?.content || result?.data?.markdown || result?.data?.text || result?.data;
    const displayText = typeof content === "string" ? content : JSON.stringify(content, null, 2);

    return (
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" /> Result
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={copyResult}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const blob = new Blob([displayText], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${file?.name || "document"}_result.${action === "convert" && subType === "json" ? "json" : action === "convert" && subType === "html" ? "html" : "md"}`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
          {result?.data?.processing_time && (
            <p className="text-xs text-muted-foreground">Processed in {result.data.processing_time}s</p>
          )}
          {result?.data?.pages && (
            <p className="text-xs text-muted-foreground">{result.data.pages} pages processed</p>
          )}
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-50 border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
            {displayText}
          </pre>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> {T("admin.documentsTitle")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Convert, extract, analyze and OCR documents using Docling AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload + Action */}
        <div className="lg:col-span-1 space-y-4">
          {/* File Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Upload Document</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx,.xlsx,.html,.csv,.jpg,.jpeg,.png,.tiff,.bmp,.md"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/40"
                }`}
              >
                <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, PPTX, XLSX, HTML, CSV, Images
                </p>
              </div>

              {file && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                  <FileIcon className="h-8 w-8 text-primary/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setFile(null); setResult(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Processing Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.value}
                      onClick={() => { setAction(a.value); setSubType(SUB_OPTIONS[a.value]?.[0]?.value || ""); setResult(null); }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        action === a.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${action === a.value ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-xs font-semibold">{a.label}</p>
                    </button>
                  );
                })}
              </div>

              {SUB_OPTIONS[action]?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Output Format</p>
                  <Select value={subType} onValueChange={setSubType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_OPTIONS[action].map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                className="w-full gap-2"
                onClick={process}
                disabled={!file || processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ActiveActionIcon className="h-4 w-4" />}
                {processing ? "Processing..." : `${activeAction.label} Document`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Result */}
        <div className="lg:col-span-2">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Processing Failed</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!result && !error && !processing && (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center space-y-3 py-0">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <div>
                  <p className="font-medium text-slate-600">Upload a document to get started</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PDF, DOCX, PPTX, XLSX, HTML, CSV, and image files
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                  {["Convert to Markdown", "Extract Tables", "AI Summary", "OCR Scans"].map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {processing && (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center space-y-3 py-0">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="font-medium">Processing document...</p>
                <p className="text-xs text-muted-foreground">This may take a moment depending on file size</p>
              </CardContent>
            </Card>
          )}

          {renderResult()}
        </div>
      </div>
    </div>
  );
}
