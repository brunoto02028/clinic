"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Instagram, CheckCircle, AlertCircle, ExternalLink,
  Copy, Check, RefreshCw, Loader2, Zap, Shield, Key, Globe,
  ChevronRight, Info, Wifi, WifiOff, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConnectedAccount {
  id: string;
  accountName: string;
  accountId: string;
  profilePicUrl: string | null;
  tokenExpiresAt: string | null;
  isActive: boolean;
  _count: { posts: number };
}

type SetupStep =
  | "check-app"
  | "create-app"
  | "configure-app"
  | "add-product"
  | "set-redirect"
  | "set-env"
  | "connect";

const REDIRECT_URI = "https://bpr.rehab/api/admin/social/callback";

export default function InstagramConnectPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<SetupStep>("check-app");

  // Env vars status
  const [envStatus, setEnvStatus] = useState<{
    hasFbAppId: boolean;
    hasFbAppSecret: boolean;
    hasConfigId: boolean;
    hasAccessToken: boolean;
    hasBusinessId: boolean;
  } | null>(null);

  useEffect(() => {
    fetchAccounts();
    checkEnvStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      setSuccess(`Instagram @${params.get("account")} connected!`);
    }
    if (params.get("error")) {
      setError(decodeURIComponent(params.get("error") || "Connection failed"));
    }
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social/accounts");
      const data = await res.json();
      setAccounts(data.accounts?.filter((a: any) => a.platform === "INSTAGRAM") || []);
    } catch {} finally { setLoading(false); }
  }

  async function checkEnvStatus() {
    try {
      const res = await fetch("/api/admin/marketing/instagram-status");
      if (res.ok) {
        const data = await res.json();
        setEnvStatus(data);
      }
    } catch {}
  }

  async function connectInstagram() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "INSTAGRAM" }),
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError(data.error || "Failed to get auth URL. Make sure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are set.");
        setConnecting(false);
      }
    } catch {
      setError("Connection error — check console");
      setConnecting(false);
    }
  }

  async function disconnectAccount(id: string) {
    if (!confirm("Disconnect this Instagram account?")) return;
    try {
      await fetch(`/api/admin/social/accounts/${id}`, { method: "DELETE" });
      fetchAccounts();
    } catch {}
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function tokenDaysLeft(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  const steps: { id: SetupStep; label: string; desc: string }[] = [
    { id: "check-app", label: "1. Pré-requisitos", desc: "Conta Business + Facebook Page" },
    { id: "create-app", label: "2. Criar App Meta", desc: "developers.facebook.com" },
    { id: "configure-app", label: "3. Configurar App", desc: "Business type + permissões" },
    { id: "add-product", label: "4. Configuration", desc: "FB Login for Business + config_id" },
    { id: "set-redirect", label: "5. Redirect URI", desc: "URL de callback no app" },
    { id: "set-env", label: "6. Variáveis .env", desc: "App ID, Secret e Config ID" },
    { id: "connect", label: "7. Conectar", desc: "OAuth com 1 clique" },
  ];

  const isFullyConfigured = envStatus?.hasFbAppId && envStatus?.hasFbAppSecret && envStatus?.hasConfigId;
  const hasConnectedAccount = accounts.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/marketing/instagram" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            Instagram — Conexão Meta API
          </h1>
          <p className="text-sm text-muted-foreground">Passo a passo para publicar posts diretamente no Instagram</p>
        </div>
        {hasConnectedAccount && (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
            <Wifi className="h-3 w-3" /> Conectado
          </Badge>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Status bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatusItem
              label="FACEBOOK_APP_ID"
              ok={envStatus?.hasFbAppId ?? false}
              loading={!envStatus}
            />
            <StatusItem
              label="FACEBOOK_APP_SECRET"
              ok={envStatus?.hasFbAppSecret ?? false}
              loading={!envStatus}
            />
            <StatusItem
              label="Conta Instagram"
              ok={hasConnectedAccount}
              loading={loading}
            />
            <StatusItem
              label="Pronto para publicar"
              ok={isFullyConfigured === true && hasConnectedAccount}
              loading={loading || !envStatus}
            />
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts */}
      {hasConnectedAccount && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Conta(s) Conectada(s)
            </h3>
            {accounts.map(acc => {
              const days = tokenDaysLeft(acc.tokenExpiresAt);
              return (
                <div key={acc.id} className="flex items-center justify-between gap-3 bg-background rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    {acc.profilePicUrl ? (
                      <img src={acc.profilePicUrl} alt={acc.accountName} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <Instagram className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm">@{acc.accountName}</p>
                      <p className="text-xs text-muted-foreground">{acc._count.posts} posts publicados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {days !== null && (
                      <Badge variant="outline" className={`text-[10px] gap-1 ${days < 10 ? "border-red-500/40 text-red-400" : days < 30 ? "border-amber-500/40 text-amber-400" : "border-emerald-500/40 text-emerald-400"}`}>
                        <Clock className="h-2.5 w-2.5" />
                        {days > 0 ? `Token: ${days}d` : "Token expirado!"}
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={connectInstagram}>
                      <RefreshCw className="h-3 w-3" /> Renovar token
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => disconnectAccount(acc.id)}>
                      Desconectar
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveStep(s.id)}
            className={`flex-shrink-0 text-left px-3 py-2 rounded-xl border text-xs transition-all ${
              activeStep === s.id
                ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="font-semibold">{s.label}</div>
            <div className="opacity-70 mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* ─── STEP CONTENT ─── */}

      {activeStep === "check-app" && (
        <StepCard title="Pré-requisitos obrigatórios" icon={<Shield className="h-5 w-5 text-amber-500" />}>
          <p className="text-sm text-muted-foreground mb-4">Antes de criar o app Meta, confirma que tens:</p>
          <div className="space-y-3">
            <Req
              title="Conta Instagram Business ou Creator"
              desc="Perfil pessoal NÃO funciona. Vai ao Instagram → Definições → Conta → Mudar para conta profissional → Business."
            />
            <Req
              title="Facebook Page ligada ao Instagram"
              desc="Vai a Facebook.com → criar Page (se não tiveres) → depois no Instagram → Definições → Conta → Conta do Facebook vinculada → seleciona a tua Page."
            />
            <Req
              title="Conta de Programador Meta"
              desc="Vai a developers.facebook.com e faz login com a tua conta Facebook. Aceita os termos de programador."
            />
          </div>
          <div className="flex gap-2 mt-4">
            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> developers.facebook.com
              </Button>
            </a>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("create-app")}>
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "create-app" && (
        <StepCard title="Criar App no Meta for Developers" icon={<Globe className="h-5 w-5 text-blue-500" />}>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1} text="Vai a" link={{ href: "https://developers.facebook.com/apps/create", label: "developers.facebook.com/apps/create" }} />
            <Step n={2} text='Clica "Create App"' />
            <Step n={3} text='Em "What do you want your app to do?" seleciona → Other → clica Next' />
            <Step n={4} text='Em "Select an app type" seleciona → Business → clica Next' />
            <Step n={5} text="Dá um nome ao app (ex: BPR Instagram), seleciona a tua Business Account → Create App" />
            <Step n={6} text='Copia o "App ID" que aparece no Dashboard (linha azul no topo)' />
          </ol>
          <InfoBox text="⚠️ Se não vires 'Business' como opção, confirma que aceitas os termos de programador e que tens uma Meta Business Account." />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("check-app")}>Voltar</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("configure-app")}>
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "configure-app" && (
        <StepCard title="Configurar permissões do App" icon={<Key className="h-5 w-5 text-purple-500" />}>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1} text="No painel do App, clica em App Settings → Basic no menu lateral esquerdo" />
            <Step n={2} text='Preenche o "Privacy Policy URL": https://bpr.rehab/privacy' />
            <Step n={3} text='Em "App Domains" adiciona: bpr.rehab' />
            <Step n={4} text="Anota o App ID e o App Secret (clica 'Show' no campo App Secret)" />
            <Step n={5} text='Clica em App Review → Permissions and Features e verifica que tens: instagram_basic, instagram_content_publish' />
          </ol>
          <InfoBox text='ℹ️ Em Development Mode, só tu (o admin da app) consegues fazer OAuth. Para publicar com qualquer conta precisas de submeter a app para App Review — mas para teu uso pessoal, Development Mode chega.' />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("create-app")}>Voltar</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("add-product")}>
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "add-product" && (
        <StepCard title="Criar Configuration (Facebook Login for Business)" icon={<Instagram className="h-5 w-5 text-pink-500" />}>
          <p className="text-sm text-muted-foreground mb-3">
            O teu app usa <strong className="text-foreground">Facebook Login for Business</strong>, que requer uma <strong className="text-foreground">Configuration</strong> com as permissões do Instagram.
          </p>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1} text='No menu lateral do app, clica em "Facebook Login for Business" → "Configurations"' />
            <Step n={2} text='Clica "Get Started" ou "Create Configuration"' />
            <Step n={3} text='Dá um nome (ex: "BPR Instagram Access")' />
            <Step n={4} text='Em "Permissions", adiciona TODAS estas:' />
          </ol>
          <div className="bg-background border border-border rounded-xl p-3 mt-2 mb-3 space-y-1">
            <code className="block text-xs text-cyan-400 font-mono">instagram_basic</code>
            <code className="block text-xs text-cyan-400 font-mono">instagram_content_publish</code>
            <code className="block text-xs text-cyan-400 font-mono">instagram_manage_insights</code>
            <code className="block text-xs text-cyan-400 font-mono">pages_show_list</code>
            <code className="block text-xs text-cyan-400 font-mono">pages_read_engagement</code>
          </div>
          <ol className="space-y-3 text-sm text-muted-foreground" start={5}>
            <Step n={5} text='Guarda a Configuration. Copia o "Configuration ID" (número longo) — vais precisar dele no passo 6.' />
          </ol>
          <InfoBox text='⚠️ IMPORTANTE: Sem o config_id, o Facebook rejeita os scopes com erro "Invalid Scopes". O config_id substitui o parâmetro scope no OAuth URL.' />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("configure-app")}>Voltar</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("set-redirect")}>
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "set-redirect" && (
        <StepCard title="Definir Redirect URI (callback)" icon={<Globe className="h-5 w-5 text-cyan-500" />}>
          <p className="text-sm text-muted-foreground mb-3">
            O Meta precisa saber para onde redirecionar após o login. Copia este URL exacto:
          </p>
          <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between gap-2 mb-4">
            <code className="text-sm text-cyan-400 font-mono break-all">{REDIRECT_URI}</code>
            <button
              onClick={() => copyText(REDIRECT_URI, "redirect")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {copied === "redirect" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1} text='No painel do App → Instagram → Settings (ou Basic Display → OAuth Settings)' />
            <Step n={2} text='Em "Valid OAuth Redirect URIs" cola o URL acima' />
            <Step n={3} text="Clica Save Changes" />
            <Step n={4} text='Vai também a Facebook Login → Settings → "Valid OAuth redirect URIs" e adiciona o mesmo URL' />
          </ol>
          <InfoBox text="⚠️ O URL tem que ser EXACTAMENTE igual — sem barra no final, sem http (só https). Diferença de um caracter causa erro." />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("add-product")}>Voltar</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("set-env")}>
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "set-env" && (
        <StepCard title="Configurar variáveis de ambiente no servidor" icon={<Key className="h-5 w-5 text-amber-500" />}>
          <p className="text-sm text-muted-foreground mb-4">
            Adiciona estas variáveis ao ficheiro <code className="text-amber-400">/root/clinic/.env</code> no VPS:
          </p>

          <div className="space-y-3">
            <EnvVar
              name="FACEBOOK_APP_ID"
              placeholder="94530663455902"
              desc="O App ID que copiaste do Meta App Dashboard"
              status={envStatus?.hasFbAppId}
              onCopy={() => copyText("FACEBOOK_APP_ID=", "appid")}
              copied={copied === "appid"}
            />
            <EnvVar
              name="FACEBOOK_APP_SECRET"
              placeholder="5e704f16a726e0b6c7cd..."
              desc='O App Secret (clica Show no Meta Dashboard → App Settings → Basic)'
              status={envStatus?.hasFbAppSecret}
              onCopy={() => copyText("FACEBOOK_APP_SECRET=", "appsecret")}
              copied={copied === "appsecret"}
            />
            <EnvVar
              name="FACEBOOK_LOGIN_CONFIG_ID"
              placeholder="1234567890123456"
              desc='O Configuration ID do passo 4 (Facebook Login for Business → Configurations)'
              status={envStatus?.hasConfigId}
              onCopy={() => copyText("FACEBOOK_LOGIN_CONFIG_ID=", "configid")}
              copied={copied === "configid"}
            />
          </div>

          <div className="bg-slate-900 border border-border rounded-xl p-4 mt-4 font-mono text-xs text-muted-foreground space-y-1">
            <p className="text-emerald-400"># No VPS via SSH:</p>
            <p>ssh clinic-vps</p>
            <p>nano /root/clinic/.env</p>
            <p className="text-amber-300 mt-2"># Adiciona estas linhas:</p>
            <p>FACEBOOK_APP_ID=<span className="text-cyan-400">SEU_APP_ID</span></p>
            <p>FACEBOOK_APP_SECRET=<span className="text-cyan-400">SEU_APP_SECRET</span></p>
            <p>FACEBOOK_LOGIN_CONFIG_ID=<span className="text-cyan-400">SEU_CONFIG_ID</span></p>
            <p className="text-emerald-400 mt-2"># Guarda (Ctrl+X → Y → Enter) e reinicia:</p>
            <p>pm2 restart clinic</p>
          </div>

          <InfoBox text="✅ Depois de guardar o .env e reiniciar o servidor, o botão 'Conectar' abaixo ficará activo." />

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("set-redirect")}>Voltar</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={async () => { await checkEnvStatus(); setActiveStep("connect"); }}>
              Verificar e Continuar <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "connect" && (
        <StepCard title="Conectar Instagram com OAuth" icon={<Zap className="h-5 w-5 text-emerald-500" />}>
          <div className="space-y-4">
            {/* Final checklist */}
            <div className="space-y-2">
              <FinalCheck ok={envStatus?.hasFbAppId ?? false} label="FACEBOOK_APP_ID configurado" />
              <FinalCheck ok={envStatus?.hasFbAppSecret ?? false} label="FACEBOOK_APP_SECRET configurado" />
              <FinalCheck ok={envStatus?.hasConfigId ?? false} label="FACEBOOK_LOGIN_CONFIG_ID configurado" />
              <FinalCheck ok={true} label={`Redirect URI definido: ${REDIRECT_URI}`} />
              <FinalCheck ok={!hasConnectedAccount} label="Pronto para fazer OAuth" invert />
              {hasConnectedAccount && (
                <FinalCheck ok={true} label={`Conta @${accounts[0]?.accountName} já conectada ✓`} />
              )}
            </div>

            {isFullyConfigured ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Clica o botão abaixo. Vais ser redirecionado para o Facebook para fazeres login e autorizares a app BPR a aceder ao teu Instagram. A Configuration define as permissões automaticamente.
                </p>
                <Button
                  onClick={connectInstagram}
                  disabled={connecting}
                  className="w-full gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 h-12 text-base"
                >
                  {connecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Instagram className="h-5 w-5" />
                  )}
                  {connecting ? "A redirecionar para Meta..." : "Conectar Instagram"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O token gerado é válido por 60 dias — o sistema avisa quando estiver a expirar.
                </p>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Configura o FACEBOOK_APP_ID, FACEBOOK_APP_SECRET e FACEBOOK_LOGIN_CONFIG_ID no servidor primeiro (passo 6).
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveStep("set-env")}>
                  Ir para passo 6
                </Button>
              </div>
            )}

            {/* After connection */}
            {hasConnectedAccount && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-400">✓ Conectado! O que podes fazer agora:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ir para <Link href="/admin/marketing/instagram" className="text-purple-400 hover:underline">Instagram → Create</Link> e gerar posts com IA</li>
                  <li>• Publicar directamente do botão "Publish Now" depois de gerar</li>
                  <li>• Os posts ficam guardados em <Link href="/admin/marketing/instagram?tab=posts" className="text-purple-400 hover:underline">Posts & Drafts</Link></li>
                  <li>• Renovar o token aqui antes de expirar (a cada ~55 dias)</li>
                </ul>
              </div>
            )}
          </div>
        </StepCard>
      )}

      {/* ─── AI Map ─── */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Mapa de IAs — O que cada IA faz neste sistema
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {AI_MAP.map(ai => (
              <div key={ai.tool} className="bg-background border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge className={`text-[10px] ${ai.badgeClass}`}>{ai.name}</Badge>
                  <span className="text-xs font-semibold text-foreground">{ai.tool}</span>
                </div>
                <p className="text-xs text-muted-foreground">{ai.what}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">{ai.api}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───

function StatusItem({ label, ok, loading }: { label: string; ok: boolean; loading: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : ok ? (
        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
          <CheckCircle className="h-3.5 w-3.5" /> OK
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
          <WifiOff className="h-3.5 w-3.5" /> Em falta
        </span>
      )}
    </div>
  );
}

function StepCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="font-bold text-base flex items-center gap-2">
          {icon} {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

function Step({ n, text, link }: { n: number; text: string; link?: { href: string; label: string } }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
      <span>
        {text}{" "}
        {link && (
          <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline inline-flex items-center gap-0.5">
            {link.label} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </span>
    </li>
  );
}

function Req({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3 bg-background border border-border rounded-xl p-3">
      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-300 mt-3">
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {text}
    </div>
  );
}

function EnvVar({ name, placeholder, desc, status, onCopy, copied }: {
  name: string; placeholder: string; desc: string;
  status?: boolean; onCopy: () => void; copied: boolean;
}) {
  return (
    <div className="bg-background border border-border rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <code className="text-sm font-mono text-amber-400">{name}</code>
        <div className="flex items-center gap-2">
          {status !== undefined && (
            status
              ? <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400">Configurado ✓</Badge>
              : <Badge className="text-[9px] bg-red-500/15 text-red-400">Em falta</Badge>
          )}
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <code className="text-[10px] text-muted-foreground/50 font-mono">ex: {placeholder}</code>
    </div>
  );
}

function FinalCheck({ ok, label, invert }: { ok: boolean; label: string; invert?: boolean }) {
  const isGood = invert ? !ok : ok;
  return (
    <div className={`flex items-center gap-2 text-sm ${isGood ? "text-emerald-400" : "text-muted-foreground"}`}>
      {isGood
        ? <CheckCircle className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
      }
      {label}
    </div>
  );
}

const AI_MAP = [
  {
    name: "Claude 3.5 Sonnet",
    tool: "Instagram — caption + hashtags",
    what: "Gera captions virais, hashtags estratégicos, callouts, CTAs. Especializado em fisioterapia.",
    api: "ANTHROPIC_API_KEY → lib/claude.ts → claudeGenerate()",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
  {
    name: "Gemini 2.0 Flash",
    tool: "Instagram / PDF — imagens",
    what: "Gera imagens de alta qualidade para posts e covers de PDF. Modelo de imagem mais rápido da Google.",
    api: "GEMINI_API_KEY → lib/ai-provider.ts → generateImage()",
    badgeClass: "bg-cyan-500/15 text-cyan-400",
  },
  {
    name: "Claude 3.5 Sonnet",
    tool: "SEO Articles",
    what: "Escreve artigos de blog optimizados para SEO, com título, meta description, headers H2/H3 e CTAs.",
    api: "ANTHROPIC_API_KEY → claudeGenerate() → /api/admin/marketing/generate-article",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
  {
    name: "Claude 3.5 Sonnet",
    tool: "PDF Creator — conteúdo",
    what: "3 passes: (1) metadata+outline, (2) secções individuais 400-600 palavras cada, (3) referências reais PubMed/NHS.",
    api: "ANTHROPIC_API_KEY → /api/admin/marketplace/generate-pdf → 3x claudeGenerate()",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
  {
    name: "Gemini 2.0 Flash",
    tool: "PDF Creator — cover",
    what: "Gera capa profissional com estética médica/wellness. Prompt gerado pelo Claude, imagem pelo Gemini.",
    api: "GEMINI_API_KEY → generateImage() → /api/admin/marketplace/generate-pdf (action: generate-cover)",
    badgeClass: "bg-cyan-500/15 text-cyan-400",
  },
  {
    name: "Claude 3.5 Sonnet",
    tool: "Content Intelligence",
    what: "Viral hooks, trending ideas, content calendar, marketplace intel, improve content — análise de tendências.",
    api: "ANTHROPIC_API_KEY → /api/admin/marketing/content-intelligence → claudeGenerate()",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
];
