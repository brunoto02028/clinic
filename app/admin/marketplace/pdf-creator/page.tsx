"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Sparkles, Loader2, Check, Eye, Download,
  ImageIcon, BookOpen, DollarSign, Save, ChevronRight, Tag,
  RefreshCw, Globe, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "digital_program", label: "Health Guide" },
  { value: "exercise_guide", label: "Exercise Programme" },
  { value: "nutrition_guide", label: "Nutrition Guide" },
  { value: "rehab_protocol", label: "Rehab Protocol" },
  { value: "wellness_ebook", label: "Wellness eBook" },
  { value: "pain_management", label: "Pain Management" },
];

const AUDIENCES = [
  "Adults seeking pain relief and better mobility",
  "Athletes recovering from sports injuries",
  "Office workers with postural problems",
  "Post-surgery rehabilitation patients",
  "Seniors maintaining mobility and independence",
  "Active adults wanting injury prevention",
];

interface Section {
  title: string;
  content: string;
  keyTakeaways: string[];
}

interface PdfContent {
  title: string;
  subtitle: string;
  description: string;
  shortDescription: string;
  tableOfContents: string[];
  sections: Section[];
  references: string[];
  coverImagePrompt: string;
  tags: string[];
  suggestedPrice: number;
  difficulty: string;
}

export default function PdfCreatorPage() {
  const router = useRouter();

  // Input state
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("digital_program");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [customAudience, setCustomAudience] = useState("");
  const [pageTarget, setPageTarget] = useState(15);
  const [language, setLanguage] = useState("en");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<PdfContent | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "review" | "publish">("input");

  // Price
  const [price, setPrice] = useState("9.99");

  const generateContent = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/marketplace/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-content",
          topic,
          category,
          targetAudience: customAudience || audience,
          pageTarget,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setContent(data.content);
      setPrice(String(data.content.suggestedPrice || 9.99));
      setStep("review");

      // Auto-generate cover image
      if (data.content.coverImagePrompt) {
        generateCoverImage(data.content.coverImagePrompt, data.content.title);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateCoverImage = async (prompt: string, title: string) => {
    setGeneratingCover(true);
    try {
      const res = await fetch("/api/admin/marketplace/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-cover", prompt, title }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setCoverUrl(data.imageUrl);
      }
    } catch {} finally {
      setGeneratingCover(false);
    }
  };

  const regenerateContent = () => {
    setContent(null);
    setCoverUrl(null);
    setStep("input");
  };

  const saveAsProduct = async () => {
    if (!content) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/marketplace/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-product",
          title: content.title,
          subtitle: content.subtitle,
          description: content.description,
          shortDescription: content.shortDescription,
          sections: content.sections,
          references: content.references,
          tags: content.tags,
          price: parseFloat(price),
          imageUrl: coverUrl,
          category,
          difficulty: content.difficulty,
          pageCount: content.sections.length * 2 + 2,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setStep("publish");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const previewPdf = () => {
    if (!content) return;
    // Open the full HTML preview in a new tab
    const html = buildPreviewHtml(content);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/marketplace" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            PDF Creator Pro
          </h1>
          <p className="text-sm text-muted-foreground">Create professional health guides with AI — evidence-based, with references</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {["Create", "Review & Edit", "Publish"].map((s, i) => {
          const stepIndex = i;
          const currentIndex = step === "input" ? 0 : step === "review" ? 1 : 2;
          const isActive = stepIndex === currentIndex;
          const isDone = stepIndex < currentIndex;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                isActive ? "bg-purple-500/20 text-purple-400" : isDone ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="h-3 w-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                {s}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* STEP 1: Input */}
      {step === "input" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Topic / Title *</Label>
                  <Input
                    placeholder="e.g. Complete Guide to Lower Back Pain Relief, Shoulder Recovery Programme..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">Describe the PDF guide you want to create. Be specific for better results.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-semibold">Category</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Language</Label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="en">English (UK)</option>
                      <option value="pt-BR">Portuguese (BR)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Target Audience</Label>
                  <div className="flex flex-wrap gap-2">
                    {AUDIENCES.map((a) => (
                      <button
                        key={a}
                        onClick={() => { setAudience(a); setCustomAudience(""); }}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                          audience === a && !customAudience
                            ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or type a custom audience..."
                    value={customAudience}
                    onChange={(e) => setCustomAudience(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Target Pages: ~{pageTarget}</Label>
                  <input
                    type="range"
                    min={5}
                    max={40}
                    value={pageTarget}
                    onChange={(e) => setPageTarget(parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 pages (quick guide)</span>
                    <span>40 pages (comprehensive)</span>
                  </div>
                </div>

                <Button
                  onClick={generateContent}
                  disabled={generating || !topic.trim()}
                  className="w-full gap-2 bg-purple-600 hover:bg-purple-700 h-12 text-base"
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {generating ? "Generating professional content..." : "Generate PDF Content"}
                </Button>

                {generating && (
                  <p className="text-xs text-muted-foreground text-center animate-pulse">
                    Claude is writing evidence-based content with real references... This may take 30-60 seconds.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" /> What you get
                </h3>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2"><Check className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" /> Professional layout with BPR branding</li>
                  <li className="flex items-start gap-2"><Check className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" /> Evidence-based content with real references</li>
                  <li className="flex items-start gap-2"><Check className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" /> AI-generated cover image</li>
                  <li className="flex items-start gap-2"><Check className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" /> Auto-created Stripe product for sales</li>
                  <li className="flex items-start gap-2"><Check className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" /> Preview version with watermark</li>
                  <li className="flex items-start gap-2"><Check className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" /> Ready for Marketplace + Instagram</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Pricing tip
                </h3>
                <p className="text-xs text-muted-foreground">
                  Quick guides (5-10 pages): £4.99-£7.99<br />
                  Standard guides (10-20 pages): £9.99-£14.99<br />
                  Comprehensive (20+ pages): £14.99-£29.99
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 2: Review & Edit */}
      {step === "review" && content && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Title & Description */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-foreground">{content.title}</h2>
                  <Badge className="bg-purple-500/15 text-purple-400">{content.difficulty}</Badge>
                </div>
                {content.subtitle && <p className="text-sm text-muted-foreground italic">{content.subtitle}</p>}
                <p className="text-sm text-foreground/80">{content.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {content.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      <Tag className="h-2.5 w-2.5 mr-1" />{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Table of Contents */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-500" /> Table of Contents ({content.sections?.length} sections)
                </h3>
                <ol className="space-y-1 list-decimal list-inside">
                  {content.sections?.map((s, i) => (
                    <li key={i} className="text-sm text-foreground/80">{s.title}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Sections Preview */}
            {content.sections?.map((section, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <h3 className="font-bold text-base text-foreground mb-2">{i + 1}. {section.title}</h3>
                  <div
                    className="text-sm text-foreground/80 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                  {section.keyTakeaways?.length > 0 && (
                    <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase mb-1">Key Takeaways</h4>
                      <ul className="space-y-0.5">
                        {section.keyTakeaways.map((t, j) => (
                          <li key={j} className="text-xs text-foreground/70 flex items-start gap-1.5">
                            <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" /> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* References */}
            {content.references?.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" /> References ({content.references.length})
                  </h3>
                  <ol className="space-y-1 list-decimal list-inside">
                    {content.references.map((ref, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{ref}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Cover + Price + Actions */}
          <div className="space-y-4">
            {/* Cover Image */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Cover Image</h3>
                {generatingCover ? (
                  <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Generating cover...</p>
                    </div>
                  </div>
                ) : coverUrl ? (
                  <div className="space-y-2">
                    <img src={coverUrl} alt="Cover" className="w-full rounded-lg border" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1 text-xs"
                      onClick={() => generateCoverImage(content.coverImagePrompt, content.title)}
                    >
                      <RefreshCw className="h-3 w-3" /> Regenerate Cover
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateCoverImage(content.coverImagePrompt, content.title)}
                      >
                        Generate Cover
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Price
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="text-lg font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  AI suggested: £{content.suggestedPrice?.toFixed(2) || "9.99"} — You keep 100% minus Stripe fees (~2.9%)
                </p>
              </CardContent>
            </Card>

            {/* Language */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" /> Language
                </h3>
                <Badge variant="outline" className="text-xs uppercase">{language === "pt-BR" ? "Portuguese (BR)" : "English (UK)"}</Badge>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button onClick={previewPdf} variant="outline" className="w-full gap-2">
                <Eye className="h-4 w-4" /> Preview Full PDF
              </Button>

              <Button
                onClick={saveAsProduct}
                disabled={saving}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save as Marketplace Product"}
              </Button>

              <Button onClick={regenerateContent} variant="ghost" className="w-full gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4" /> Start Over
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Published */}
      {step === "publish" && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">PDF Guide Saved!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your guide <strong>&quot;{content?.title}&quot;</strong> has been saved as a draft product in the Marketplace.
              Go to the Marketplace admin to review, activate, and start selling.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button onClick={() => router.push("/admin/marketplace")} className="gap-2">
                <FileText className="h-4 w-4" /> Go to Marketplace Admin
              </Button>
              <Button variant="outline" onClick={regenerateContent} className="gap-2">
                <Sparkles className="h-4 w-4" /> Create Another PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Client-side preview HTML builder (simplified version)
function buildPreviewHtml(content: PdfContent): string {
  const sectionsHtml = content.sections.map((s, i) => `
    <div style="page-break-before: ${i > 0 ? 'always' : 'auto'}; padding: 2rem 2.5rem; max-width: 700px; margin: 0 auto;">
      <h2 style="font-family: 'Georgia', serif; font-size: 1.4rem; color: #3a9e96; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #5dc9c0;">${s.title}</h2>
      <div style="color: #555; line-height: 1.7;">${s.content}</div>
      ${s.keyTakeaways?.length ? `
        <div style="background: #f0faf9; border: 1px solid #5dc9c0; border-radius: 12px; padding: 1.2rem; margin-top: 1.5rem;">
          <h4 style="color: #3a9e96; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem;">Key Takeaways</h4>
          <ul style="list-style: none; padding: 0;">${s.keyTakeaways.map(t => `<li style="padding: 0.3rem 0; padding-left: 1.5rem; position: relative; font-weight: 500;">✓ ${t}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `).join('');

  const refsHtml = content.references?.length ? `
    <div style="page-break-before: always; padding: 2rem 2.5rem; max-width: 700px; margin: 0 auto;">
      <h2 style="font-family: 'Georgia', serif; font-size: 1.4rem; color: #3a9e96; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #5dc9c0;">References</h2>
      <ol style="font-size: 0.85rem; color: #555; line-height: 1.6;">${content.references.map(r => `<li style="margin-bottom: 0.5rem;">${r}</li>`).join('')}</ol>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${content.title} — Preview</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Inter', sans-serif; color: #1a1a1a; line-height: 1.7; margin: 0; }
  h3 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
  p { margin-bottom: 0.8rem; }
  ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  li { margin-bottom: 0.3rem; }
  blockquote { border-left: 3px solid #5dc9c0; padding: 0.8rem 1rem; margin: 1rem 0; background: #f0faf9; border-radius: 0 8px 8px 0; font-style: italic; }
  strong { color: #1a1a1a; }
</style></head><body>
<div style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #0a2e2c, #134e4a 40%, #1a6b65 70%, #5dc9c0 100%); color: white; padding: 3rem;">
  <div style="font-size: 2.5rem; font-weight: 800; letter-spacing: 0.1em;">BPR</div>
  <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.7; margin-bottom: 3rem;">Bruno Physical Rehabilitation</div>
  <h1 style="font-family: 'Merriweather', serif; font-size: 2.2rem; max-width: 600px; line-height: 1.3;">${content.title}</h1>
  ${content.subtitle ? `<p style="font-size: 1.1rem; opacity: 0.85; max-width: 500px; margin-top: 1rem;">${content.subtitle}</p>` : ''}
</div>
<div style="padding: 2rem 2.5rem; max-width: 700px; margin: 0 auto; page-break-after: always;">
  <h2 style="font-family: 'Merriweather', serif; font-size: 1.5rem; color: #3a9e96; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #5dc9c0;">Table of Contents</h2>
  <ol>${content.sections.map(s => `<li style="padding: 0.4rem 0; border-bottom: 1px dotted #e0e0e0;">${s.title}</li>`).join('')}</ol>
</div>
${sectionsHtml}
${refsHtml}
<div style="text-align: center; padding: 2rem; font-size: 0.75rem; color: #555; border-top: 1px solid #e0e0e0; margin-top: 2rem;">
  <p>© ${new Date().getFullYear()} Bruno Physical Rehabilitation (BPR) — bpr.rehab</p>
</div>
</body></html>`;
}
