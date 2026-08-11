"use client";

import { useState } from "react";
import { Mail, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function MyAccountPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // Password change
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  async function handleEmailChange() {
    setEmailError("");
    setEmailSuccess("");
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError(isPt ? "Digite um email válido." : "Enter a valid email address.");
      return;
    }
    if (!emailPassword) {
      setEmailError(isPt ? "Digite sua senha atual pra confirmar." : "Enter your current password to confirm.");
      return;
    }
    setEmailSaving(true);
    try {
      const res = await fetch("/api/patient/change-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, currentPassword: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || (isPt ? "Erro ao solicitar troca de email." : "Failed to request email change."));
      } else {
        setEmailSuccess(
          isPt
            ? `Enviamos um link de confirmação para ${newEmail}. Clique nele para concluir a troca.`
            : `We sent a confirmation link to ${newEmail}. Click it to complete the change.`
        );
        setNewEmail("");
        setEmailPassword("");
      }
    } catch {
      setEmailError(isPt ? "Erro de conexão." : "Connection error.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPwError("");
    setPwSuccess(false);
    if (newPw.length < 6) {
      setPwError(isPt ? "A senha deve ter no mínimo 6 caracteres." : "Password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(isPt ? "As senhas não coincidem." : "Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/patient/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || (isPt ? "Erro ao alterar senha." : "Failed to change password."));
      } else {
        setPwSuccess(true);
        setNewPw("");
        setConfirmPw("");
        setTimeout(() => setPwSuccess(false), 3000);
      }
    } catch {
      setPwError(isPt ? "Erro de conexão." : "Connection error.");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <UserCog className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{isPt ? "Minha Conta" : "My Account"}</h1>
          <p className="text-sm text-muted-foreground">
            {isPt ? "Gerencie seu email e senha de acesso" : "Manage your login email and password"}
          </p>
        </div>
      </div>

      {/* Change Email */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-400" />
            <h2 className="font-semibold text-sm">{isPt ? "Alterar Email" : "Change Email"}</h2>
          </div>

          {emailError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {emailError}
            </div>
          )}
          {emailSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {emailSuccess}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{isPt ? "Novo email" : "New email"}</Label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@clinic.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{isPt ? "Senha atual (pra confirmar)" : "Current password (to confirm)"}</Label>
            <Input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <p className="text-xs text-muted-foreground">
            {isPt
              ? "Vamos enviar um link de confirmação pro email novo — sua conta só muda depois que você clicar nele."
              : "We'll send a confirmation link to the new address — your account only changes once you click it."}
          </p>
          <Button onClick={handleEmailChange} disabled={emailSaving || !newEmail || !emailPassword} className="w-full">
            {emailSaving ? (isPt ? "Enviando..." : "Sending...") : isPt ? "Enviar Confirmação" : "Send Confirmation"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <h2 className="font-semibold text-sm">{isPt ? "Alterar Senha" : "Change Password"}</h2>
          </div>

          {pwError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {isPt ? "Senha alterada com sucesso!" : "Password changed successfully!"}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{isPt ? "Nova senha" : "New password"}</Label>
            <div className="relative">
              <Input
                type={showNewPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder={isPt ? "Mín. 6 caracteres" : "Min. 6 characters"}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{isPt ? "Confirmar nova senha" : "Confirm new password"}</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
          </div>
          {newPw && confirmPw && newPw === confirmPw && (
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {isPt ? "Senhas coincidem" : "Passwords match"}
            </p>
          )}
          <Button onClick={handlePasswordChange} disabled={pwSaving || !newPw || !confirmPw} className="w-full">
            {pwSaving ? (isPt ? "Salvando..." : "Saving...") : isPt ? "Alterar Senha" : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
