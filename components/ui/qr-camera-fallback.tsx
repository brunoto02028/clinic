"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Camera, QrCode, AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCameraFallbackProps {
  url?: string;
  locale?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  errorMessage?: string;
  featureName?: { en: string; pt: string };
}

export function QRCameraFallback({
  url,
  locale = "en-GB",
  onRetry,
  onCancel,
  errorMessage,
  featureName = { en: "this feature", pt: "esta funcionalidade" },
}: QRCameraFallbackProps) {
  const pt = locale === "pt-BR";
  const [currentUrl, setCurrentUrl] = useState(url || "");

  useEffect(() => {
    if (!url && typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, [url]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-black text-white p-6">
      {/* Error indicator */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-6 w-6 text-amber-400" />
        <p className="text-lg font-semibold">
          {pt ? "Câmera não disponível" : "Camera not available"}
        </p>
      </div>

      {errorMessage && (
        <p className="text-sm text-gray-400 text-center max-w-md mb-6">{errorMessage}</p>
      )}

      {/* QR Code Card */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-xl">
        <QRCodeSVG
          value={currentUrl}
          size={200}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* Instructions */}
      <div className="max-w-sm text-center space-y-4 mb-6">
        <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
          <Smartphone className="h-5 w-5 text-teal-400" />
          {pt ? "Continue pelo celular" : "Continue on your phone"}
        </h3>

        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold shrink-0">1</span>
            <p className="text-sm text-gray-300">
              {pt
                ? "Abra a câmera do seu celular ou um leitor de QR Code."
                : "Open your phone's camera or a QR code reader."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold shrink-0">2</span>
            <p className="text-sm text-gray-300">
              {pt
                ? "Aponte para o QR Code acima e acesse o link."
                : "Point at the QR code above and open the link."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold shrink-0">3</span>
            <p className="text-sm text-gray-300">
              {pt
                ? `Faça login na sua conta e continue ${featureName.pt} diretamente do celular.`
                : `Log in to your account and continue ${featureName.en} directly from your phone.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <Camera className="h-4 w-4 text-teal-400 shrink-0" />
          <p className="text-xs text-teal-300">
            {pt
              ? "A câmera do celular é ideal para capturar fotos e vídeos com melhor qualidade."
              : "Your phone's camera is ideal for capturing photos and videos with better quality."}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="text-white border-white/30 hover:bg-white/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            {pt ? "Tentar Novamente" : "Try Again"}
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="outline" className="text-white border-white/30 hover:bg-white/10">
            <X className="h-4 w-4 mr-2" />
            {pt ? "Cancelar" : "Cancel"}
          </Button>
        )}
      </div>
    </div>
  );
}
