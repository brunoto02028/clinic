"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  BookOpen,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Image as ImageIcon,
  Instagram,
  X,
  ExternalLink,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import InstagramArticleModal from "@/components/admin/instagram-article-modal";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string;
  published: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

export default function AdminArticlesPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success?: boolean; error?: string; stats?: any } | null>(null);
  // Preview
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  // Instagram
  const [igArticle, setIgArticle] = useState<Article | null>(null);
  // Bulk import
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSiteUrl, setBulkSiteUrl] = useState("https://brunophysicalrehabilitation.co.uk");
  const [bulkDiscovering, setBulkDiscovering] = useState(false);
  const [bulkUrls, setBulkUrls] = useState<string[]>([]);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);
  const [bulkSummary, setBulkSummary] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles");
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (article: Article) => {
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !article.published }),
      });

      if (res.ok) {
        setArticles(
          articles.map((a) =>
            a.id === article.id ? { ...a, published: !a.published } : a
          )
        );
        toast({
          title: article.published ? "Article unpublished" : "Article published",
          description: `"${article.title}" has been ${article.published ? "unpublished" : "published"}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update article.",
        variant: "destructive",
      });
    }
  };

  const deleteArticle = async (article: Article) => {
    if (!confirm(`Are you sure you want to delete "${article.title}"?`)) return;

    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setArticles(articles.filter((a) => a.id !== article.id));
        toast({
          title: "Article deleted",
          description: `"${article.title}" has been deleted.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete article.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/articles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Server error (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ error: data.error || "Import failed" });
        return;
      }
      setImportResult({ success: true, stats: data.stats });
      fetchArticles();
      toast({ title: "Article imported!", description: `"${data.article.title}" saved as draft.` });
    } catch (err: any) {
      setImportResult({ error: err.message || "Import failed" });
    } finally {
      setImporting(false);
    }
  };

  const handleBulkDiscover = async () => {
    if (!bulkSiteUrl.trim()) return;
    setBulkDiscovering(true);
    setBulkUrls([]);
    setBulkSelected(new Set());
    setBulkResults(null);
    try {
      const res = await fetch("/api/admin/articles/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "discover", siteUrl: bulkSiteUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
      setBulkUrls(data.urls || []);
      setBulkSelected(new Set(data.urls || []));
      toast({ title: `${data.count} articles found`, description: "Select which ones to import." });
    } catch (e: any) {
      toast({ title: "Discovery failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkDiscovering(false);
    }
  };

  const handleBulkImport = async () => {
    const toImport = Array.from(bulkSelected);
    if (!toImport.length) return;
    setBulkImporting(true);
    setBulkResults(null);
    try {
      const res = await fetch("/api/admin/articles/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", urls: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setBulkResults(data.results || []);
      setBulkSummary(data.summary);
      fetchArticles();
      toast({ title: `${data.summary?.imported} articles imported!`, description: `${data.summary?.errors} errors.` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkImporting(false);
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.excerpt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{T("admin.articlesTitle")}</h1>
          <p className="text-muted-foreground mt-1">
            {T("admin.articlesDesc")}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportUrl(""); setImportResult(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Globe className="h-4 w-4 mr-2" />
                Import from URL
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Import Article from URL
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste the URL of an article from your other website. The system will extract the title, content, and images automatically.
                </p>
                <Input
                  placeholder="https://yoursite.com/blog/article-name"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImport()}
                  disabled={importing}
                />
                <Button
                  onClick={handleImport}
                  disabled={importing || !importUrl.trim()}
                  className="w-full"
                >
                  {importing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Globe className="h-4 w-4 mr-2" />Import Article</>
                  )}
                </Button>
                {importResult?.success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Article imported successfully!
                    </p>
                    <p className="text-xs text-green-600">
                      {importResult.stats?.imagesDownloaded || 0} images downloaded • 
                      {importResult.stats?.hasFeaturedImage ? " Featured image saved" : " No featured image"}
                    </p>
                    <p className="text-xs text-muted-foreground">The article was saved as a draft. You can edit and publish it.</p>
                  </div>
                )}
                {importResult?.error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-1.5">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {importResult.error}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          {/* Bulk Import Dialog */}
          <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) { setBulkUrls([]); setBulkSelected(new Set()); setBulkResults(null); setBulkSummary(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-violet-500/40 text-violet-400 hover:bg-violet-500/10">
                <Download className="h-4 w-4" /> Import All from Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-violet-500" /> Bulk Import from Website
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Descobrir automaticamente todos os artigos de um site e importá-los como rascunhos.</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="https://brunophysicalrehabilitation.co.uk"
                    value={bulkSiteUrl}
                    onChange={e => setBulkSiteUrl(e.target.value)}
                    disabled={bulkDiscovering || bulkImporting}
                  />
                  <Button onClick={handleBulkDiscover} disabled={bulkDiscovering || bulkImporting || !bulkSiteUrl.trim()} variant="outline" className="gap-1.5">
                    {bulkDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Discover
                  </Button>
                </div>

                {bulkUrls.length > 0 && !bulkResults && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{bulkUrls.length} artigos encontrados — {bulkSelected.size} selecionados</span>
                      <div className="flex gap-2">
                        <button className="text-xs text-primary hover:underline" onClick={() => setBulkSelected(new Set(bulkUrls))}>Todos</button>
                        <button className="text-xs text-muted-foreground hover:underline" onClick={() => setBulkSelected(new Set())}>Nenhum</button>
                      </div>
                    </div>
                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto text-xs">
                      {bulkUrls.map(url => (
                        <label key={url} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                          <input type="checkbox" className="rounded" checked={bulkSelected.has(url)}
                            onChange={e => {
                              const next = new Set(bulkSelected);
                              e.target.checked ? next.add(url) : next.delete(url);
                              setBulkSelected(next);
                            }} />
                          <span className="truncate text-muted-foreground">{url}</span>
                        </label>
                      ))}
                    </div>
                    <Button onClick={handleBulkImport} disabled={bulkImporting || bulkSelected.size === 0} className="w-full gap-2">
                      {bulkImporting ? <><Loader2 className="h-4 w-4 animate-spin" /> A importar... (pode demorar vários minutos)</> : <><Download className="h-4 w-4" /> Importar {bulkSelected.size} artigos selecionados</>}
                    </Button>
                  </div>
                )}

                {bulkResults && bulkSummary && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <span className="text-emerald-600">✅ {bulkSummary.imported} importados</span>
                      {bulkSummary.errors > 0 && <span className="text-red-500">❌ {bulkSummary.errors} erros</span>}
                    </div>
                    <div className="border rounded-lg divide-y max-h-56 overflow-y-auto text-xs">
                      {bulkResults.map((r, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 ${r.status === 'error' ? 'bg-red-500/5' : ''}`}>
                          <span>{r.status === 'ok' ? '✅' : '❌'}</span>
                          <span className="truncate text-muted-foreground flex-1">{r.title || r.url}</span>
                          {r.error && <span className="text-red-500 shrink-0">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Link href="/admin/articles/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No articles yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first article to share knowledge with your patients.
            </p>
            <Link href="/admin/articles/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Article
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="card-hover">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {article.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          article.published
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {article.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {article.excerpt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      By {article.author.firstName} {article.author.lastName} •{" "}
                      {new Date(article.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Preview */}
                    <Button variant="outline" size="sm" onClick={() => setPreviewArticle(article)} title="Preview article">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* Post to Instagram */}
                    {article.published && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-[#e1306c]/30 text-[#e1306c] hover:bg-[#e1306c]/5"
                        onClick={() => setIgArticle(article)}
                        title="Post to Instagram"
                      >
                        <Instagram className="h-4 w-4" />
                        <span className="hidden sm:inline">Instagram</span>
                      </Button>
                    )}
                    {/* Publish/Unpublish */}
                    <Button variant="outline" size="sm" onClick={() => togglePublish(article)}>
                      {article.published ? (
                        <><EyeOff className="h-4 w-4 mr-1" />Unpublish</>
                      ) : (
                        <><Eye className="h-4 w-4 mr-1" />Publish</>
                      )}
                    </Button>
                    <Link href={`/admin/articles/${article.id}`}>
                      <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteArticle(article)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* ── Article Preview Modal ── */}
      {previewArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-8 overflow-y-auto" onClick={() => setPreviewArticle(null)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl mx-4 mb-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-semibold line-clamp-1">{previewArticle.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By {previewArticle.author.firstName} {previewArticle.author.lastName} · {new Date(previewArticle.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/articles/${previewArticle.slug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </Button>
                </a>
                <Button variant="ghost" size="sm" onClick={() => setPreviewArticle(null)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            {previewArticle.imageUrl && (
              <img src={previewArticle.imageUrl} alt={previewArticle.title} className="w-full h-56 object-cover" />
            )}
            <div className="p-6">
              <p className="text-muted-foreground text-sm leading-relaxed">{previewArticle.excerpt}</p>
              <div className="mt-4 flex gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  previewArticle.published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>{previewArticle.published ? "Published" : "Draft"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Instagram Post Modal ── */}
      {igArticle && (
        <InstagramArticleModal article={igArticle} onClose={() => setIgArticle(null)} />
      )}
    </div>
  );
}
