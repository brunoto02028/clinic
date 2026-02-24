"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Trash2, GripVertical, Eye, EyeOff, Pencil, ExternalLink, Loader2, ArrowLeft, Settings,
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ICON_MAP: Record<string, any> = {
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone,
};

interface ServicePageItem {
  id: string;
  slug: string;
  icon: string | null;
  color: string | null;
  titleEn: string;
  titlePt: string;
  descriptionEn: string | null;
  published: boolean;
  showInMenu: boolean;
  sortOrder: number;
}

export default function ServicePagesListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pages, setPages] = useState<ServicePageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/admin/service-pages");
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const createPage = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/service-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleEn: "New Service",
          titlePt: "Novo Serviço",
        }),
      });
      if (res.ok) {
        const page = await res.json();
        router.push(`/admin/service-pages/${page.id}`);
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create service page", variant: "destructive" });
    }
    setCreating(false);
  };

  const deletePage = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/service-pages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPages(pages.filter((p) => p.id !== id));
        toast({ title: "Deleted", description: "Service page deleted successfully" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const togglePublished = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/service-pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !current }),
      });
      if (res.ok) {
        setPages(pages.map((p) => p.id === id ? { ...p, published: !current } : p));
      }
    } catch {}
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= pages.length) return;

    const newPages = [...pages];
    [newPages[idx], newPages[newIdx]] = [newPages[newIdx], newPages[idx]];
    // Update sortOrder
    const updates = newPages.map((p, i) => ({ ...p, sortOrder: i }));
    setPages(updates);

    // Persist both changes
    await Promise.all([
      fetch(`/api/admin/service-pages/${updates[idx].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: idx }),
      }),
      fetch(`/api/admin/service-pages/${updates[newIdx].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: newIdx }),
      }),
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Service Pages</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage the detail pages for each service/specialisation shown on the website
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/settings">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Site Settings
            </Button>
          </Link>
          <Button onClick={createPage} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Service Page
          </Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No service pages yet. Create your first one!</p>
            <Button onClick={createPage} disabled={creating} className="gap-2">
              <Plus className="h-4 w-4" /> Create Service Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pages.map((page, idx) => {
            const IconComp = ICON_MAP[page.icon || ""] || Zap;
            return (
              <Card key={page.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveItem(page.id, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-muted disabled:opacity-20"
                      >
                        <GripVertical className="h-3 w-3 rotate-90 scale-x-[-1]" />
                      </button>
                      <button
                        onClick={() => moveItem(page.id, "down")}
                        disabled={idx === pages.length - 1}
                        className="p-1 rounded hover:bg-muted disabled:opacity-20"
                      >
                        <GripVertical className="h-3 w-3 rotate-90" />
                      </button>
                    </div>

                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${page.color || "bg-primary/10 text-primary"}`}>
                      <IconComp className="h-5 w-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{page.titleEn}</h3>
                        {!page.published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                        {page.showInMenu && <Badge variant="outline" className="text-[10px]">In Menu</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        /services/{page.slug} &middot; {page.titlePt}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={`/services/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => togglePublished(page.id, page.published)}
                        title={page.published ? "Unpublish" : "Publish"}
                      >
                        {page.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Link href={`/admin/service-pages/${page.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &quot;{page.titleEn}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this service page and remove it from the website navigation.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePage(page.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
