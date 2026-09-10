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

const REDIRECT_URI = "https://bpr.clinic/api/admin/social/callback";

export default function InstagramConnectPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<SetupStep>("check-app");
  const [manualToken, setManualToken] = useState("");
  const [connectingManual, setConnectingManual] = useState(false);

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

  async function connectManual() {
    if (!manualToken.trim()) return;
    setConnectingManual(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/connect-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: manualToken.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Instagram @${data.username} connected successfully!`);
        setManualToken("");
        fetchAccounts();
      } else {
        setError(data.error || "Manual connection failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setConnectingManual(false);
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
    { id: "check-app", label: "1. Prerequisites", desc: "Business account + Facebook Page" },
    { id: "create-app", label: "2. Create Meta App", desc: "developers.facebook.com" },
    { id: "configure-app", label: "3. Configure App", desc: "Business type + permissions" },
    { id: "add-product", label: "4. Configuration", desc: "FB Login for Business + config_id" },
    { id: "set-redirect", label: "5. Redirect URI", desc: "Callback URL in the app" },
    { id: "set-env", label: "6. .env Variables", desc: "App ID, Secret and Config ID" },
    { id: "connect", label: "7. Connect", desc: "OAuth in 1 click" },
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
            Instagram — Meta API Connection
          </h1>
          <p className="text-sm text-muted-foreground">Step-by-step guide to publish posts directly to Instagram</p>
        </div>
        {hasConnectedAccount && (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
            <Wifi className="h-3 w-3" /> Connected
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

      {/* Manual Token Connection */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">Quick Connection via Token</span>
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">Recommended</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste the token generated in the Meta Developer Console → Use cases → API setup with Instagram login → Generate token
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              placeholder="IGAAgVsbCUai..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <Button
              onClick={connectManual}
              disabled={!manualToken.trim() || connectingManual}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0"
            >
              {connectingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {connectingManual ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              label="CONFIG_ID"
              ok={envStatus?.hasConfigId ?? false}
              loading={!envStatus}
            />
            <StatusItem
              label="Instagram Account"
              ok={hasConnectedAccount}
              loading={loading}
            />
            <StatusItem
              label="Ready to publish"
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
              <CheckCircle className="h-4 w-4" /> Connected Account(s)
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
                      <p className="text-xs text-muted-foreground">{acc._count.posts} posts published</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {days !== null && (
                      <Badge variant="outline" className={`text-[10px] gap-1 ${days < 10 ? "border-red-500/40 text-red-400" : days < 30 ? "border-amber-500/40 text-amber-400" : "border-emerald-500/40 text-emerald-400"}`}>
                        <Clock className="h-2.5 w-2.5" />
                        {days > 0 ? `Token: ${days}d` : "Token expired!"}
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={connectInstagram}>
                      <RefreshCw className="h-3 w-3" /> Renew token
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => disconnectAccount(acc.id)}>
                      Disconnect
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {steps.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveStep(s.id)}
            className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
              activeStep === s.id
                ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="font-semibold">{s.label}</div>
            <div className="opacity-70 mt-0.5 truncate">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* ─── STEP CONTENT ─── */}

      {activeStep === "check-app" && (
        <StepCard title="Required prerequisites" icon={<Shield className="h-5 w-5 text-amber-500" />}>
          <p className="text-sm text-muted-foreground mb-4">Before creating the Meta app, make sure you have:</p>
          <div className="space-y-3">
            <Req
              title="Instagram Business or Creator account"
              desc="A personal profile will NOT work. Go to Instagram → Settings → Account → Switch to professional account → Business."
            />
            <Req
              title="Facebook Page linked to Instagram"
              desc="Go to Facebook.com → create a Page (if you don't have one) → then on Instagram → Settings → Account → Linked Facebook account → select your Page."
            />
            <Req
              title="Meta Developer account"
              desc="Go to developers.facebook.com and sign in with your Facebook account. Accept the developer terms."
            />
          </div>
          <div className="flex gap-2 mt-4">
            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> developers.facebook.com
              </Button>
            </a>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("create-app")}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "create-app" && (
        <StepCard title="Create an App on Meta for Developers" icon={<Globe className="h-5 w-5 text-blue-500" />}>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1} text="Go to" link={{ href: "https://developers.facebook.com/apps/create", label: "developers.facebook.com/apps/create" }} />
            <Step n={2} text='Click "Create App"' />
            <Step n={3} text='In "What do you want your app to do?" select → Other → click Next' />
            <Step n={4} text='In "Select an app type" select → Business → click Next' />
            <Step n={5} text="Give the app a name (e.g. BPR Instagram), select your Business Account → Create App" />
            <Step n={6} text='Copy the "App ID" shown on the Dashboard (blue line at the top)' />
          </ol>
          <InfoBox text="⚠️ If you don't see 'Business' as an option, make sure you have accepted the developer terms and have a Meta Business Account." />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("check-app")}>Back</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("configure-app")}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "configure-app" && (
        <StepCard title="Configure App permissions" icon={<Key className="h-5 w-5 text-purple-500" />}>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1} text="In the App panel, click App Settings → Basic in the left-hand side menu" />
            <Step n={2} text='Fill in the "Privacy Policy URL": https://bpr.clinic/privacy' />
            <Step n={3} text='Under "App Domains" add: bpr.clinic' />
            <Step n={4} text="Note down the App ID and App Secret (click 'Show' on the App Secret field)" />
            <Step n={5} text='Click App Review → Permissions and Features and check that you have: instagram_basic, instagram_content_publish' />
          </ol>
          <InfoBox text='ℹ️ In Development Mode, only you (the app admin) can complete OAuth. To publish with any account you need to submit the app for App Review — but for your personal use, Development Mode is enough.' />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("create-app")}>Back</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("add-product")}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "add-product" && (
        <StepCard title="Create Configuration (Facebook Login for Business)" icon={<Instagram className="h-5 w-5 text-pink-500" />}>
          <p className="text-sm text-muted-foreground mb-3">
            Your app uses <strong className="text-foreground">Facebook Login for Business</strong>, which requires a <strong className="text-foreground">Configuration</strong> with the Instagram permissions.
          </p>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <Step n={1} text='In the app side menu, click "Facebook Login for Business" → "Configurations"' />
            <Step n={2} text='Click "Get Started" or "Create Configuration"' />
            <Step n={3} text='Give it a name (e.g. "BPR Instagram Access")' />
            <Step n={4} text='Under "Permissions", add ALL of these:' />
          </ol>
          <div className="bg-background border border-border rounded-xl p-3 mt-2 mb-3 space-y-1">
            <code className="block text-xs text-cyan-400 font-mono">instagram_basic</code>
            <code className="block text-xs text-cyan-400 font-mono">instagram_content_publish</code>
            <code className="block text-xs text-cyan-400 font-mono">instagram_manage_insights</code>
            <code className="block text-xs text-cyan-400 font-mono">pages_show_list</code>
            <code className="block text-xs text-cyan-400 font-mono">pages_read_engagement</code>
          </div>
          <ol className="space-y-3 text-sm text-muted-foreground" start={5}>
            <Step n={5} text='Save the Configuration. Copy the "Configuration ID" (long number) — you will need it in step 6.' />
          </ol>
          <InfoBox text='⚠️ IMPORTANT: Without the config_id, Facebook rejects the scopes with an "Invalid Scopes" error. The config_id replaces the scope parameter in the OAuth URL.' />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("configure-app")}>Back</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("set-redirect")}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "set-redirect" && (
        <StepCard title="Set the Redirect URI (callback)" icon={<Globe className="h-5 w-5 text-cyan-500" />}>
          <p className="text-sm text-muted-foreground mb-3">
            Meta needs to know where to redirect after login. Copy this exact URL:
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
            <Step n={1} text='In the App panel → Instagram → Settings (or Basic Display → OAuth Settings)' />
            <Step n={2} text='Under "Valid OAuth Redirect URIs" paste the URL above' />
            <Step n={3} text="Click Save Changes" />
            <Step n={4} text='Also go to Facebook Login → Settings → "Valid OAuth redirect URIs" and add the same URL' />
          </ol>
          <InfoBox text="⚠️ The URL must be EXACTLY the same — no trailing slash, no http (https only). A single character difference causes an error." />
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("add-product")}>Back</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => setActiveStep("set-env")}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "set-env" && (
        <StepCard title="Configure environment variables on the server" icon={<Key className="h-5 w-5 text-amber-500" />}>
          <p className="text-sm text-muted-foreground mb-4">
            Add these variables to the <code className="text-amber-400">/root/clinic/.env</code> file on the VPS:
          </p>

          <div className="space-y-3">
            <EnvVar
              name="FACEBOOK_APP_ID"
              placeholder="94530663455902"
              desc="The App ID you copied from the Meta App Dashboard"
              status={envStatus?.hasFbAppId}
              onCopy={() => copyText("FACEBOOK_APP_ID=", "appid")}
              copied={copied === "appid"}
            />
            <EnvVar
              name="FACEBOOK_APP_SECRET"
              placeholder="5e704f16a726e0b6c7cd..."
              desc='The App Secret (click Show in the Meta Dashboard → App Settings → Basic)'
              status={envStatus?.hasFbAppSecret}
              onCopy={() => copyText("FACEBOOK_APP_SECRET=", "appsecret")}
              copied={copied === "appsecret"}
            />
            <EnvVar
              name="FACEBOOK_LOGIN_CONFIG_ID"
              placeholder="1234567890123456"
              desc='The Configuration ID from step 4 (Facebook Login for Business → Configurations)'
              status={envStatus?.hasConfigId}
              onCopy={() => copyText("FACEBOOK_LOGIN_CONFIG_ID=", "configid")}
              copied={copied === "configid"}
            />
          </div>

          <div className="bg-slate-900 border border-border rounded-xl p-4 mt-4 font-mono text-xs text-muted-foreground space-y-1">
            <p className="text-emerald-400"># On the VPS via SSH:</p>
            <p>ssh clinic-vps</p>
            <p>nano /root/clinic/.env</p>
            <p className="text-amber-300 mt-2"># Add these lines:</p>
            <p>FACEBOOK_APP_ID=<span className="text-cyan-400">YOUR_APP_ID</span></p>
            <p>FACEBOOK_APP_SECRET=<span className="text-cyan-400">YOUR_APP_SECRET</span></p>
            <p>FACEBOOK_LOGIN_CONFIG_ID=<span className="text-cyan-400">YOUR_CONFIG_ID</span></p>
            <p className="text-emerald-400 mt-2"># Save (Ctrl+X → Y → Enter) and restart:</p>
            <p>pm2 restart clinic</p>
          </div>

          <InfoBox text="✅ After saving the .env and restarting the server, the 'Connect' button below will become active." />

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveStep("set-redirect")}>Back</Button>
            <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700" onClick={async () => { await checkEnvStatus(); setActiveStep("connect"); }}>
              Verify and Continue <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </StepCard>
      )}

      {activeStep === "connect" && (
        <StepCard title="Connect Instagram with OAuth" icon={<Zap className="h-5 w-5 text-emerald-500" />}>
          <div className="space-y-4">
            {/* Final checklist */}
            <div className="space-y-2">
              <FinalCheck ok={envStatus?.hasFbAppId ?? false} label="FACEBOOK_APP_ID configured" />
              <FinalCheck ok={envStatus?.hasFbAppSecret ?? false} label="FACEBOOK_APP_SECRET configured" />
              <FinalCheck ok={envStatus?.hasConfigId ?? false} label="FACEBOOK_LOGIN_CONFIG_ID configured" />
              <FinalCheck ok={true} label={`Redirect URI set: ${REDIRECT_URI}`} />
              <FinalCheck ok={!hasConnectedAccount} label="Ready to run OAuth" invert />
              {hasConnectedAccount && (
                <FinalCheck ok={true} label={`Account @${accounts[0]?.accountName} already connected ✓`} />
              )}
            </div>

            {isFullyConfigured ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Click the button below. You will be redirected to Facebook to log in and authorise the BPR app to access your Instagram. The Configuration sets the permissions automatically.
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
                  {connecting ? "Redirecting to Meta..." : "Connect Instagram"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  The generated token is valid for 60 days — the system warns you when it is about to expire.
                </p>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Configure FACEBOOK_APP_ID, FACEBOOK_APP_SECRET and FACEBOOK_LOGIN_CONFIG_ID on the server first (step 6).
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveStep("set-env")}>
                  Go to step 6
                </Button>
              </div>
            )}

            {/* After connection */}
            {hasConnectedAccount && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-400">✓ Connected! What you can do now:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Go to <Link href="/admin/marketing/instagram" className="text-purple-400 hover:underline">Instagram → Create</Link> and generate posts with AI</li>
                  <li>• Publish directly from the "Publish Now" button after generating</li>
                  <li>• Posts are saved in <Link href="/admin/marketing/instagram?tab=posts" className="text-purple-400 hover:underline">Posts & Drafts</Link></li>
                  <li>• Renew the token here before it expires (roughly every 55 days)</li>
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
            <Zap className="h-4 w-4 text-amber-500" /> AI Map — What each AI does in this system
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
          <WifiOff className="h-3.5 w-3.5" /> Missing
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
              ? <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400">Configured ✓</Badge>
              : <Badge className="text-[9px] bg-red-500/15 text-red-400">Missing</Badge>
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
    what: "Generates viral captions, strategic hashtags, callouts and CTAs. Specialised in physiotherapy.",
    api: "ANTHROPIC_API_KEY → lib/claude.ts → claudeGenerate()",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
  {
    name: "Gemini 2.0 Flash",
    tool: "Instagram / PDF — images",
    what: "Generates high-quality images for posts and PDF covers. Google's fastest image model.",
    api: "GEMINI_API_KEY → lib/ai-provider.ts → generateImage()",
    badgeClass: "bg-cyan-500/15 text-cyan-400",
  },
  {
    name: "Claude 3.5 Sonnet",
    tool: "SEO Articles",
    what: "Writes SEO-optimised blog articles, with title, meta description, H2/H3 headers and CTAs.",
    api: "ANTHROPIC_API_KEY → claudeGenerate() → /api/admin/marketing/generate-article",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
  {
    name: "Claude 3.5 Sonnet",
    tool: "PDF Creator — content",
    what: "3 passes: (1) metadata+outline, (2) individual sections of 400-600 words each, (3) real PubMed/NHS references.",
    api: "ANTHROPIC_API_KEY → /api/admin/marketplace/generate-pdf → 3x claudeGenerate()",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
  {
    name: "Gemini 2.0 Flash",
    tool: "PDF Creator — cover",
    what: "Generates a professional cover with a medical/wellness aesthetic. Prompt generated by Claude, image by Gemini.",
    api: "GEMINI_API_KEY → generateImage() → /api/admin/marketplace/generate-pdf (action: generate-cover)",
    badgeClass: "bg-cyan-500/15 text-cyan-400",
  },
  {
    name: "Claude 3.5 Sonnet",
    tool: "Content Intelligence",
    what: "Viral hooks, trending ideas, content calendar, marketplace intel, improve content — trend analysis.",
    api: "ANTHROPIC_API_KEY → /api/admin/marketing/content-intelligence → claudeGenerate()",
    badgeClass: "bg-violet-500/15 text-violet-400",
  },
];
