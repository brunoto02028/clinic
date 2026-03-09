"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  QrCode,
  CheckCircle2,
  Clock,
  Camera,
  Loader2,
  ExternalLink,
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Image as ImageIcon,
  Video,
  Send,
  MessageCircle,
  Mail,
} from "lucide-react";

interface RemoteCaptureSessionProps {
  assessmentId: string;
  captureToken: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  locale?: string;
  onClose: () => void;
  onPhotosReceived?: () => void;
}

interface CaptureStatus {
  frontImageUrl: string | null;
  backImageUrl: string | null;
  leftImageUrl: string | null;
  rightImageUrl: string | null;
  movementVideos: any[] | null;
  status: string;
}

const VIEWS = [
  { key: "front", label: "Frontal", labelPt: "Frontal", icon: "👤" },
  { key: "back", label: "Posterior", labelPt: "Posterior", icon: "🔙" },
  { key: "left", label: "Left Side", labelPt: "Lado Esquerdo", icon: "◀️" },
  { key: "right", label: "Right Side", labelPt: "Lado Direito", icon: "▶️" },
];

export function RemoteCaptureSession({
  assessmentId,
  captureToken,
  patientName,
  patientEmail,
  patientPhone,
  locale = "en-GB",
  onClose,
  onPhotosReceived,
}: RemoteCaptureSessionProps) {
  const isPt = locale === "pt-BR";
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus | null>(null);
  const [polling, setPolling] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhotosRef = useRef(0);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const captureUrl = `${baseUrl}/capture/${captureToken}`;

  // Poll for capture status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/body-assessments/capture/${captureToken}`);
      if (res.ok) {
        const data = await res.json();
        setCaptureStatus(data);
        setLastUpdate(new Date());

        // Count captured photos
        const photoCount = [data.frontImageUrl, data.backImageUrl, data.leftImageUrl, data.rightImageUrl].filter(Boolean).length;

        // Notify parent if new photos arrived
        if (photoCount > prevPhotosRef.current && onPhotosReceived) {
          onPhotosReceived();
        }
        prevPhotosRef.current = photoCount;

        // Stop polling if all 4 views captured
        if (photoCount >= 4 && data.status !== "PENDING_CAPTURE") {
          setPolling(false);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [captureToken, onPhotosReceived]);

  useEffect(() => {
    fetchStatus();
    if (polling) {
      pollingRef.current = setInterval(fetchStatus, 3000); // Poll every 3 seconds
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [polling, fetchStatus]);

  const capturedPhotos = captureStatus
    ? [captureStatus.frontImageUrl, captureStatus.backImageUrl, captureStatus.leftImageUrl, captureStatus.rightImageUrl].filter(Boolean).length
    : 0;

  const videoCount = Array.isArray(captureStatus?.movementVideos) ? captureStatus!.movementVideos!.length : 0;

  const copyLink = () => {
    navigator.clipboard.writeText(captureUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const sendViaWhatsApp = () => {
    const phone = patientPhone?.replace(/\D/g, "");
    const message = isPt
      ? `Olá ${patientName.split(" ")[0]}! 📸\n\nPrecisamos que tire as fotos da sua avaliação postural. Abra o link abaixo no seu celular:\n\n${captureUrl}\n\nInstruções:\n1. Use roupa justa\n2. Local bem iluminado\n3. Corpo inteiro visível\n4. Tire as 4 fotos (frente, costas, esquerda, direita)\n\nObrigado! 🏥`
      : `Hi ${patientName.split(" ")[0]}! 📸\n\nWe need you to take photos for your postural assessment. Open this link on your phone:\n\n${captureUrl}\n\nInstructions:\n1. Wear tight-fitting clothes\n2. Well-lit area\n3. Full body visible\n4. Take all 4 photos (front, back, left, right)\n\nThank you! 🏥`;

    const encoded = encodeURIComponent(message);
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  const sendViaEmail = async () => {
    if (!patientEmail) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/body-assessments/${assessmentId}/send-capture-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: locale }),
      });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 5000);
      }
    } catch {}
    setSendingEmail(false);
  };

  const getViewStatus = (key: string) => {
    if (!captureStatus) return "waiting";
    const urlKey = `${key}ImageUrl` as keyof CaptureStatus;
    return captureStatus[urlKey] ? "captured" : "waiting";
  };

  const allCaptured = capturedPhotos >= 4;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {isPt ? "Captura Remota" : "Remote Capture"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isPt ? `Paciente: ${patientName}` : `Patient: ${patientName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {polling ? (
            <Badge variant="outline" className="text-green-600 border-green-300 animate-pulse gap-1">
              <Wifi className="h-3 w-3" />
              {isPt ? "Monitorando..." : "Monitoring..."}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <WifiOff className="h-3 w-3" />
              {isPt ? "Pausado" : "Paused"}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content: QR + Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LEFT: QR Code + Actions */}
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-5 space-y-4">
            <div className="text-center space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isPt ? "Escaneie com o celular do paciente" : "Scan with patient's phone"}
              </p>

              {/* QR Code */}
              <div className="inline-block p-4 bg-white rounded-2xl border shadow-sm">
                <QRCodeSVG
                  value={captureUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <p className="text-[10px] text-muted-foreground max-w-[240px] mx-auto">
                {isPt
                  ? "O paciente escaneia o QR code → câmera abre → tira as 4 fotos → fotos aparecem aqui automaticamente"
                  : "Patient scans QR → camera opens → takes 4 photos → photos appear here automatically"}
              </p>
            </div>

            {/* Link + Copy */}
            <div className="flex items-center gap-2">
              <div className="flex-1 text-[10px] bg-muted/50 rounded-lg px-3 py-2 truncate font-mono">
                {captureUrl}
              </div>
              <Button size="sm" variant={linkCopied ? "default" : "outline"} onClick={copyLink} className="shrink-0">
                {linkCopied ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {linkCopied ? (isPt ? "Copiado!" : "Copied!") : (isPt ? "Copiar" : "Copy")}
              </Button>
            </div>

            {/* Send actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={sendViaWhatsApp}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                WhatsApp
              </Button>

              {patientEmail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sendViaEmail}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : emailSent ? <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> : <Mail className="h-3.5 w-3.5 mr-1.5" />}
                  {emailSent ? (isPt ? "Enviado!" : "Sent!") : "Email"}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(captureUrl, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {isPt ? "Abrir Link" : "Open Link"}
              </Button>

              {!polling && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setPolling(true); fetchStatus(); }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  {isPt ? "Retomar" : "Resume"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Live capture status */}
        <div className="space-y-3">
          {/* Photo status */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {isPt ? "Fotos" : "Photos"} ({capturedPhotos}/4)
                </p>
                {allCaptured && (
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {isPt ? "Completo!" : "Complete!"}
                  </Badge>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(capturedPhotos / 4) * 100}%`,
                    backgroundColor: allCaptured ? "#22c55e" : "#3b82f6",
                    boxShadow: allCaptured ? "0 0 8px #22c55e" : "0 0 8px #3b82f680",
                  }}
                />
              </div>

              {/* Individual view status */}
              <div className="grid grid-cols-2 gap-2">
                {VIEWS.map((v) => {
                  const status = getViewStatus(v.key);
                  const captured = status === "captured";
                  const imgUrl = captureStatus
                    ? (captureStatus as any)[`${v.key}ImageUrl`]
                    : null;

                  return (
                    <div
                      key={v.key}
                      className={`relative rounded-lg border p-2.5 flex items-center gap-2.5 transition-all ${
                        captured
                          ? "border-green-300 bg-green-50/50"
                          : "border-dashed border-muted-foreground/30"
                      }`}
                    >
                      {/* Thumbnail or placeholder */}
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 overflow-hidden ${
                        captured ? "bg-green-100" : "bg-muted/50"
                      }`}>
                        {captured && imgUrl ? (
                          <img src={imgUrl} alt={v.key} className="w-full h-full object-cover rounded-md" />
                        ) : captured ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-lg">{v.icon}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate">
                          {isPt ? v.labelPt : v.label}
                        </p>
                        <p className={`text-[9px] ${captured ? "text-green-600" : "text-muted-foreground"}`}>
                          {captured
                            ? (isPt ? "✓ Recebida" : "✓ Received")
                            : (isPt ? "⏳ Aguardando..." : "⏳ Waiting...")}
                        </p>
                      </div>

                      {/* Pulse indicator for waiting */}
                      {!captured && polling && (
                        <div className="absolute top-1.5 right-1.5">
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Video status */}
          {videoCount > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  {isPt ? "Vídeos" : "Videos"}: {videoCount}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Last update */}
          {lastUpdate && (
            <p className="text-[9px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {isPt ? "Última atualização" : "Last update"}: {lastUpdate.toLocaleTimeString()}
            </p>
          )}

          {/* All done message */}
          {allCaptured && (
            <Card className="border-green-300 bg-green-50/30">
              <CardContent className="p-4 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                <p className="text-sm font-semibold text-green-700">
                  {isPt ? "Todas as fotos recebidas!" : "All photos received!"}
                </p>
                <p className="text-xs text-green-600">
                  {isPt
                    ? "Pode fechar esta sessão e executar a Análise IA."
                    : "You can close this session and run AI Analysis."}
                </p>
                <Button size="sm" onClick={onClose} className="mt-2">
                  {isPt ? "Fechar & Continuar" : "Close & Continue"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
