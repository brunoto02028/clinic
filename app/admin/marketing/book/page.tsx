"use client";

import { useState, useEffect } from "react";
import { BookOpen, Mail, MailCheck, Unlock, CalendarCheck, Loader2, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface BookConfig {
  id: string;
  status: "PRE_LAUNCH" | "WAITLIST" | "ON_SALE";
  title: string;
  subtitle: string;
  titlePt: string | null;
  subtitlePt: string | null;
  authorName: string | null;
  authorBio: string | null;
  authorPhoto: string | null;
  coverImage: string | null;
  coverImagePt: string | null;
  buyLinkAmazon: string | null;
  buyLinkDirect: string | null;
  priceDisplay: string | null;
}

interface Funnel { captured: number; confirmed: number; unlocked: number; booked: number }

const FUNNEL_CARDS = [
  { key: "captured", label: "Captured", icon: Mail, color: "text-amber-600" },
  { key: "confirmed", label: "Confirmed", icon: MailCheck, color: "text-blue-600" },
  { key: "unlocked", label: "Read Chapter 1", icon: Unlock, color: "text-indigo-600" },
  { key: "booked", label: "Booked", icon: CalendarCheck, color: "text-green-600" },
] as const;

export default function BookAdminPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<BookConfig | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/book-config");
      const data = await res.json();
      setConfig(data.config);
      setFunnel(data.funnel);
    } catch {
      toast({ title: "Error loading book settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File, field: "coverImage" | "coverImagePt" | "authorPhoto") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", field === "authorPhoto" ? "about" : "hero");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const fullUrl = data.url.startsWith("http") ? data.url : `${window.location.origin}${data.url}`;
      setConfig((prev) => (prev ? { ...prev, [field]: fullUrl } : prev));
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/book-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Book settings saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />Beyond Pain — Book
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Launch switch, copy and the mailing-list funnel for the book (bpr.rehab/beyond-pain)</p>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FUNNEL_CARDS.map((f) => (
          <Card key={f.key}>
            <CardContent className="p-4 flex items-center gap-3">
              <f.icon className={`h-5 w-5 shrink-0 ${f.color}`} />
              <div>
                <p className="text-lg font-bold leading-none">{funnel?.[f.key] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Launch switch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launch switch</CardTitle>
          <CardDescription>Flip the page's CTA without a code deploy — PRE_LAUNCH (join the list) → WAITLIST → ON_SALE (buy links).</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background w-full sm:w-64"
            value={config.status}
            onChange={(e) => setConfig({ ...config, status: e.target.value as BookConfig["status"] })}
          >
            <option value="PRE_LAUNCH">Pre-launch (join the list)</option>
            <option value="WAITLIST">Waitlist (launch-day pricing)</option>
            <option value="ON_SALE">On sale (buy links)</option>
          </select>
        </CardContent>
      </Card>

      {/* Copy */}
      <Card>
        <CardHeader><CardTitle className="text-base">Book identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Title (English)</Label>
              <Input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle (English)</Label>
              <Input value={config.subtitle} onChange={(e) => setConfig({ ...config, subtitle: e.target.value })} />
            </div>
            <div>
              <Label>Title (Português)</Label>
              <Input placeholder={config.title} value={config.titlePt || ""} onChange={(e) => setConfig({ ...config, titlePt: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle (Português)</Label>
              <Input placeholder={config.subtitle} value={config.subtitlePt || ""} onChange={(e) => setConfig({ ...config, subtitlePt: e.target.value })} />
            </div>
          </div>

          {/* Cover images — English + Portuguese */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Book cover (English)</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {config.coverImage ? (
                  <div className="relative w-20 h-28 rounded-lg overflow-hidden border shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={config.coverImage} alt="Cover" className="object-cover w-full h-full" />
                    <button type="button" onClick={() => setConfig({ ...config, coverImage: null })} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <div className="w-20 h-28 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground shrink-0">
                    <BookOpen className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => document.getElementById("cover-upload")?.click()}>
                    <Upload className="h-3.5 w-3.5" />Upload cover
                  </Button>
                  <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "coverImage"); e.target.value = ""; }} />
                </div>
              </div>
            </div>
            <div>
              <Label>Book cover (Português)</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Falls back to the English cover if left empty.</p>
              <div className="flex items-center gap-3">
                {config.coverImagePt ? (
                  <div className="relative w-20 h-28 rounded-lg overflow-hidden border shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={config.coverImagePt} alt="Capa (PT)" className="object-cover w-full h-full" />
                    <button type="button" onClick={() => setConfig({ ...config, coverImagePt: null })} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <div className="w-20 h-28 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground shrink-0">
                    <BookOpen className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => document.getElementById("cover-upload-pt")?.click()}>
                    <Upload className="h-3.5 w-3.5" />Upload capa
                  </Button>
                  <input id="cover-upload-pt" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "coverImagePt"); e.target.value = ""; }} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Author name</Label>
            <Input value={config.authorName || ""} onChange={(e) => setConfig({ ...config, authorName: e.target.value })} />
          </div>

          {/* Author photo */}
          <div>
            <Label>Author photo</Label>
            <div className="flex items-center gap-3 mt-1.5">
              {config.authorPhoto ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={config.authorPhoto} alt="Author" className="object-cover w-full h-full" />
                  <button type="button" onClick={() => setConfig({ ...config, authorPhoto: null })} className="absolute top-0 right-0 bg-black/60 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border border-dashed flex items-center justify-center text-muted-foreground shrink-0 text-lg font-bold">
                  {(config.authorName || "B").charAt(0)}
                </div>
              )}
              <div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => document.getElementById("author-upload")?.click()}>
                  <Upload className="h-3.5 w-3.5" />Upload photo
                </Button>
                <input id="author-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "authorPhoto"); e.target.value = ""; }} />
              </div>
            </div>
          </div>

          <div>
            <Label>Author bio</Label>
            <Textarea rows={4} value={config.authorBio || ""} onChange={(e) => setConfig({ ...config, authorBio: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Buy links — only shown/used once status = ON_SALE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buy links</CardTitle>
          <CardDescription>Used on the public page once status is set to ON_SALE.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Direct sale link (bpr.rehab)</Label>
              <Input value={config.buyLinkDirect || ""} onChange={(e) => setConfig({ ...config, buyLinkDirect: e.target.value })} />
            </div>
            <div>
              <Label>Amazon KDP link</Label>
              <Input value={config.buyLinkAmazon || ""} onChange={(e) => setConfig({ ...config, buyLinkAmazon: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Price (display only)</Label>
            <Input className="w-40" value={config.priceDisplay || ""} onChange={(e) => setConfig({ ...config, priceDisplay: e.target.value })} placeholder="£9.99" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </Button>
    </div>
  );
}
