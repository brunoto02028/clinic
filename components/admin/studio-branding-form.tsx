"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, Check } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface Branding {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

// The studio's own brand (activity 52, T-3): what its students see on the
// studio login, the invite page and their portal. Edits only the caller's
// tenant — see /api/admin/studio-branding.
export default function StudioBrandingForm() {
  const { update } = useSession();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const fileRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<Branding | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/studio-branding")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed");
        setBranding(data.branding);
      })
      .catch(() => setLoadError(true));
    // Loads once: re-running on a locale switch would discard unsaved edits.
  }, []);

  if (loadError) return <p className="text-sm text-destructive">{isPt ? "Não foi possível carregar a marca." : "Could not load your branding."}</p>;
  if (!branding) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  // Raw values: clearing the field to retype must not snap back to the default.
  const primary = branding.primaryColor ?? "#4F7361";
  const secondary = branding.secondaryColor ?? "#3D5A4D";
  const set = (patch: Partial<Branding>) => {
    setBranding({ ...branding, ...patch });
    setMessage(null);
  };

  const setColour = (key: "primaryColor" | "secondaryColor", value: string) =>
    set({ [key]: value } as Partial<Branding>);

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "logo");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data?.image?.imageUrl) throw new Error(data?.error || "Upload failed");
      set({ logoUrl: data.image.imageUrl });
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || (isPt ? "Falha no envio." : "Upload failed.") });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!HEX.test(primary) || !HEX.test(secondary)) {
      setMessage({ ok: false, text: isPt ? "Use cores no formato #RRGGBB." : "Use colours like #RRGGBB." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/studio-branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branding.name,
          logoUrl: branding.logoUrl,
          primaryColor: primary,
          secondaryColor: secondary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setBranding(data.branding);
      await update(); // refresh the session so the new name/logo/colour show now
      setMessage({ ok: true, text: isPt ? "Marca salva." : "Branding saved." });
    } catch (e: any) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const colourField = (key: "primaryColor" | "secondaryColor", value: string, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={HEX.test(value) ? value : "#000000"}
          onChange={(e) => setColour(key, e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border bg-transparent"
        />
        <Input id={key} value={value} onChange={(e) => setColour(key, e.target.value)} className="w-32 font-mono" />
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isPt ? "Marca do estúdio" : "Studio branding"}</CardTitle>
          <CardDescription>
            {isPt
              ? "Nome, logo e cores que seus alunos veem no login, no convite e na área deles."
              : "The name, logo and colours your students see on the login, the invite and their portal."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="studio-name">{isPt ? "Nome do estúdio" : "Studio name"}</Label>
            <Input id="studio-name" value={branding.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>{isPt ? "Logo" : "Logo"}</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-white">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-2">{isPt ? "Enviar logo" : "Upload logo"}</span>
              </Button>
              {branding.logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set({ logoUrl: null })}>
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">{isPt ? "Remover" : "Remove"}</span>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG {isPt ? "ou" : "or"} WebP · max 10MB</p>
          </div>

          <div className="flex flex-wrap gap-6">
            {colourField("primaryColor", primary, isPt ? "Cor principal" : "Main colour")}
            {colourField("secondaryColor", secondary, isPt ? "Cor secundária" : "Secondary colour")}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={save} disabled={saving || uploading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="ml-2">{isPt ? "Salvar" : "Save"}</span>
            </Button>
            {message && (
              <p role="status" className={`text-sm ${message.ok ? "text-primary" : "text-destructive"}`}>
                {message.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isPt ? "Pré-visualização" : "Preview"}</CardTitle>
          <CardDescription>/studio/{branding.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-[#F5F4F1] p-8 text-center text-[#1f2937]">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="h-14 max-w-[160px] object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-xl" style={{ backgroundColor: primary }} />
            )}
            <p className="text-lg font-semibold">
              {isPt ? "Entrar em" : "Sign in to"} {branding.name}
            </p>
            <div className="w-full max-w-xs rounded-lg px-4 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: primary }}>
              {isPt ? "Entrar" : "Sign In"}
            </div>
            <p className="text-xs" style={{ color: secondary }}>
              {branding.name} · Powered by BPR
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
