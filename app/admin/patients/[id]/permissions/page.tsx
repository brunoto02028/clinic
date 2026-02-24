"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, Lock, Unlock, Loader2, ArrowLeft, Key, Users, Crown,
  CheckCircle, XCircle, AlertTriangle, ToggleLeft, ToggleRight,
  RefreshCw, Copy, Eye, EyeOff, User, Calendar, Mail, Phone,
  FileText, Heart, Settings, ChevronDown, ChevronUp, Save, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type OverrideVal = true | false | null; // true=grant, false=revoke, null=use plan default

interface ModuleItem {
  key: string;
  label: string;
  labelPt: string;
  description: string;
  category: string;
  href: string;
  alwaysVisible: boolean;
  grantedByPlan: boolean;
  adminOverride: boolean | null;
  effectiveAccess: boolean;
}

interface PermItem {
  key: string;
  label: string;
  labelPt: string;
  description: string;
  category: string;
  relatedModule?: string;
  grantedByPlan: boolean;
  adminOverride: boolean | null;
  effectiveAccess: boolean;
}

const MODULE_CATEGORIES = [
  { key: "core", label: "Principal (Sempre Visível)", color: "bg-slate-100 text-slate-700" },
  { key: "clinical", label: "Clínico", color: "bg-blue-100 text-blue-700" },
  { key: "wellness", label: "Bem-Estar & Autocuidado", color: "bg-emerald-100 text-emerald-700" },
  { key: "content", label: "Conteúdo & Educação", color: "bg-violet-100 text-violet-700" },
];

const PERM_CATEGORIES = [
  { key: "booking", label: "Agendamentos" },
  { key: "content", label: "Acesso a Conteúdo" },
  { key: "communication", label: "Comunicação" },
  { key: "clinical", label: "Clínico" },
  { key: "advanced", label: "Recursos Avançados" },
];

export default function PatientPermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const patientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [overrides, setOverrides] = useState<Record<string, OverrideVal>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Password reset
  const [fullAccess, setFullAccess] = useState(false);
  const [togglingFullAccess, setTogglingFullAccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  // Sections
  const [showModules, setShowModules] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setOverrides(json.overrides || {});
        setFullAccess(json.fullAccessOverride || false);
        setHasChanges(false);
      } else {
        toast({ title: "Erro", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [patientId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleOverride = (key: string, currentPlanGrant: boolean, currentOverride: boolean | null) => {
    const newOverrides = { ...overrides };
    if (currentOverride === null) {
      // No override → set opposite of plan
      newOverrides[key] = !currentPlanGrant;
    } else if (currentOverride === !currentPlanGrant) {
      // Already overriding → remove override (back to plan default)
      delete newOverrides[key];
    } else {
      // Toggle the other direction
      newOverrides[key] = !currentOverride;
    }
    setOverrides(newOverrides);
    setHasChanges(true);
  };

  const saveOverrides = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateOverrides", overrides }),
      });
      if (res.ok) {
        toast({ title: "Salvo", description: "Permissões atualizadas com sucesso" });
        fetchData();
      } else {
        const json = await res.json();
        toast({ title: "Erro", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const applyToAll = async () => {
    if (!confirm("Aplicar estas permissões a TODOS os pacientes desta clínica? Isso substituirá as configurações atuais.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "applyToAll", overrides }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Aplicado", description: `Permissões aplicadas a ${json.updated} pacientes` });
      } else {
        toast({ title: "Erro", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao aplicar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setResettingPw(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPassword", newPassword }),
      });
      if (res.ok) {
        toast({ title: "Senha Redefinida", description: "Nova senha foi definida" });
        setNewPassword("");
      } else {
        const json = await res.json();
        toast({ title: "Erro", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao redefinir senha", variant: "destructive" });
    } finally {
      setResettingPw(false);
    }
  };

  const toggleFullAccess = async () => {
    setTogglingFullAccess(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleFullAccess" }),
      });
      const json = await res.json();
      if (res.ok) {
        setFullAccess(json.fullAccessOverride);
        // When turning OFF, overrides were cleared on server — clear local state too
        if (!json.fullAccessOverride) {
          setOverrides({});
        }
        toast({
          title: json.fullAccessOverride ? "Acesso Total Ativado" : "Acesso Total Desativado",
          description: json.fullAccessOverride
            ? `${data?.patient?.firstName} agora tem acesso completo a todos os módulos`
            : `${data?.patient?.firstName} voltou ao fluxo normal de permissões`,
        });
        // Refetch to sync all data
        fetchData();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao alterar acesso total", variant: "destructive" });
    } finally {
      setTogglingFullAccess(false);
    }
  };

  const toggleActive = async () => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleActive" }),
      });
      if (res.ok) {
        toast({ title: "Atualizado", description: `Conta ${data.patient.isActive ? "desativada" : "ativada"}` });
        fetchData();
      }
    } catch {}
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pw);
    setShowPassword(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Paciente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/patients")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Pacientes
        </Button>
      </div>
    );
  }

  const { patient, onboarding, membership, modules, permissions } = data;

  const getEffectiveAccess = (key: string, planGrant: boolean) => {
    if (fullAccess) return true;
    if (overrides[key] === true) return true;
    if (overrides[key] === false) return false;
    return planGrant;
  };

  const renderModuleRow = (m: ModuleItem) => {
    const overrideVal = overrides[m.key] !== undefined ? overrides[m.key] : null;
    const effective = m.alwaysVisible || fullAccess ? true : getEffectiveAccess(m.key, m.grantedByPlan);
    const isOverridden = overrideVal !== null && overrideVal !== undefined;

    return (
      <div
        key={m.key}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
          effective ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-70"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{m.labelPt || m.label}</span>
            {m.alwaysVisible && (
              <Badge className="bg-slate-100 text-slate-500 text-[9px]">Sempre Ativo</Badge>
            )}
            {isOverridden && (
              <Badge className="bg-amber-100 text-amber-700 text-[9px]">Sobrescrito pelo Admin</Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
          <div className="flex items-center gap-2 mt-1">
            {m.grantedByPlan ? (
              <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                <CheckCircle className="h-2.5 w-2.5" /> Incluído no plano
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <XCircle className="h-2.5 w-2.5" /> Não incluído no plano
              </span>
            )}
            <span className="text-[10px] text-slate-300">·</span>
            <code className="text-[9px] text-slate-300 font-mono">{m.href}</code>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {effective ? (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
              <Unlock className="h-2.5 w-2.5 mr-0.5" /> Acesso
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-600 text-[10px]">
              <Lock className="h-2.5 w-2.5 mr-0.5" /> Bloqueado
            </Badge>
          )}
          {!m.alwaysVisible && (
            <button
              onClick={() => toggleOverride(m.key, m.grantedByPlan, overrideVal as boolean | null)}
              disabled={fullAccess}
              className={`w-[52px] h-[28px] rounded-full transition-all duration-200 relative ${
                effective ? "bg-emerald-500" : "bg-slate-300"
              } ${fullAccess ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`block w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all duration-200 absolute top-[3px] ${
                  effective ? "left-[27px]" : "left-[3px]"
                }`}
              />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPermRow = (p: PermItem) => {
    const overrideVal = overrides[p.key] !== undefined ? overrides[p.key] : null;
    const effective = getEffectiveAccess(p.key, p.grantedByPlan);
    const isOverridden = overrideVal !== null && overrideVal !== undefined;

    return (
      <div
        key={p.key}
        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
          effective ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-70"
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">{p.labelPt || p.label}</span>
            {isOverridden && (
              <Badge className="bg-amber-100 text-amber-700 text-[9px]">Override</Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-400">{p.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {effective ? (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
              <Unlock className="h-2.5 w-2.5 mr-0.5" /> Acesso
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-600 text-[10px]">
              <Lock className="h-2.5 w-2.5 mr-0.5" /> Bloqueado
            </Badge>
          )}
          <button
            onClick={() => toggleOverride(p.key, p.grantedByPlan, overrideVal as boolean | null)}
            disabled={fullAccess}
            className={`w-[52px] h-[28px] rounded-full transition-all duration-200 relative ${
              effective ? "bg-emerald-500" : "bg-slate-300"
            } ${fullAccess ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`block w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all duration-200 absolute top-[3px] ${
                effective ? "left-[27px]" : "left-[3px]"
              }`}
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/admin/patients" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Voltar para Pacientes
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Permissões do Paciente
          </h1>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setOverrides(data.overrides || {}); setHasChanges(false); }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Descartar
            </Button>
            <Button size="sm" onClick={saveOverrides} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-800">
                {patient.firstName} {patient.lastName}
                {!patient.isActive && <Badge variant="outline" className="ml-2 text-[10px]">Inativo</Badge>}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {patient.email}</span>
                {patient.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Desde {new Date(patient.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
            <Button
              variant={patient.isActive ? "outline" : "default"}
              size="sm"
              onClick={toggleActive}
              className="shrink-0"
            >
              {patient.isActive ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Desativar</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Ativar</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Access Override */}
      <Card className={`border-2 transition-colors ${
        fullAccess ? "border-amber-400 bg-gradient-to-r from-amber-50 via-white to-amber-50" : "border-slate-200"
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              fullAccess ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-slate-100"
            }`}>
              <Zap className={`h-6 w-6 ${fullAccess ? "text-white" : "text-slate-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">Acesso Total</h3>
                {fullAccess && <Badge className="bg-amber-100 text-amber-700 text-[10px]">VIP</Badge>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {fullAccess
                  ? "Este paciente tem acesso completo a todos os módulos, independente de plano ou pagamento."
                  : "Ative para liberar todos os módulos sem necessidade de plano ou pagamento."}
              </p>
            </div>
            <button
              onClick={toggleFullAccess}
              disabled={togglingFullAccess}
              className={`w-[52px] h-[28px] rounded-full transition-all duration-200 relative shrink-0 ${
                fullAccess ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              {togglingFullAccess ? (
                <Loader2 className="h-4 w-4 animate-spin text-white absolute top-1.5 left-[18px]" />
              ) : (
                <span className={`block w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all duration-200 absolute top-[3px] ${
                  fullAccess ? "left-[27px]" : "left-[3px]"
                }`} />
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${onboarding.consentAccepted ? "bg-emerald-100" : "bg-red-100"}`}>
              <FileText className={`h-4 w-4 ${onboarding.consentAccepted ? "text-emerald-600" : "text-red-600"}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Termos</p>
              <p className={`text-[10px] ${onboarding.consentAccepted ? "text-emerald-600" : "text-red-600"}`}>
                {onboarding.consentAccepted ? "Aceito" : "Não aceito"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${onboarding.screeningComplete ? "bg-emerald-100" : "bg-amber-100"}`}>
              <Shield className={`h-4 w-4 ${onboarding.screeningComplete ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Triagem</p>
              <p className={`text-[10px] ${onboarding.screeningComplete ? "text-emerald-600" : "text-amber-600"}`}>
                {onboarding.screeningComplete ? "Completa" : "Incompleta"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${membership.hasActiveSubscription ? "bg-violet-100" : "bg-slate-100"}`}>
              <Crown className={`h-4 w-4 ${membership.hasActiveSubscription ? "text-violet-600" : "text-slate-400"}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Plano</p>
              <p className={`text-[10px] ${membership.hasActiveSubscription ? "text-violet-600" : "text-slate-400"}`}>
                {membership.hasActiveSubscription ? membership.plans[0]?.name || "Ativo" : "Sem plano"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${membership.hasActiveTreatment ? "bg-blue-100" : "bg-slate-100"}`}>
              <Heart className={`h-4 w-4 ${membership.hasActiveTreatment ? "text-blue-600" : "text-slate-400"}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Tratamento</p>
              <p className={`text-[10px] ${membership.hasActiveTreatment ? "text-blue-600" : "text-slate-400"}`}>
                {membership.hasActiveTreatment ? "Pacote ativo" : "Sem pacote"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-500" /> Redefinir Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={generatePassword} className="shrink-0 gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Gerar
            </Button>
            <Button
              size="sm"
              onClick={resetPassword}
              disabled={resettingPw || !newPassword || newPassword.length < 6}
              className="shrink-0 gap-1"
            >
              {resettingPw ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              Reset
            </Button>
            {newPassword && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => { navigator.clipboard.writeText(newPassword); toast({ title: "Copiado!" }); }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Module Permissions */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowModules(!showModules)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> Acesso aos Módulos
              <Badge variant="outline" className="text-[10px] ml-1">
                {(modules as ModuleItem[]).filter((m: ModuleItem) => getEffectiveAccess(m.key, m.grantedByPlan) || m.alwaysVisible).length}/{(modules as ModuleItem[]).length}
              </Badge>
            </CardTitle>
            {showModules ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </CardHeader>
        {showModules && (
          <CardContent className="pt-0 space-y-4">
            {MODULE_CATEGORIES.map(cat => {
              const catModules = (modules as ModuleItem[]).filter((m: ModuleItem) => m.category === cat.key);
              if (catModules.length === 0) return null;
              return (
                <div key={cat.key}>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Badge className={`${cat.color} text-[9px]`}>{cat.label}</Badge>
                  </h4>
                  <div className="space-y-2">
                    {catModules.map(renderModuleRow)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      {/* Granular Permissions */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowPermissions(!showPermissions)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="h-4 w-4 text-violet-500" /> Permissões Detalhadas
              <Badge variant="outline" className="text-[10px] ml-1">
                {(permissions as PermItem[]).filter((p: PermItem) => getEffectiveAccess(p.key, p.grantedByPlan)).length}/{(permissions as PermItem[]).length}
              </Badge>
            </CardTitle>
            {showPermissions ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </CardHeader>
        {showPermissions && (
          <CardContent className="pt-0 space-y-4">
            {PERM_CATEGORIES.map(cat => {
              const catPerms = (permissions as PermItem[]).filter((p: PermItem) => p.category === cat.key);
              if (catPerms.length === 0) return null;
              return (
                <div key={cat.key}>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{cat.label}</h4>
                  <div className="space-y-1.5">
                    {catPerms.map(renderPermRow)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-2 pb-8">
        {hasChanges && (
          <Button onClick={saveOverrides} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações para {patient.firstName}
          </Button>
        )}
        <Button variant="outline" onClick={applyToAll} disabled={saving} className="gap-1">
          <Users className="h-4 w-4" /> Aplicar a Todos os Pacientes
        </Button>
      </div>
    </div>
  );
}
