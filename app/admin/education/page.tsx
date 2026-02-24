"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap, Plus, Loader2, Search, Filter, PlayCircle,
  FileText, Image as ImageIcon, Dumbbell, Eye, Users, Trash2,
  PenSquare, CheckCircle, Clock, Star, BarChart3,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EduContent {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  duration: number | null;
  difficulty: string | null;
  viewCount: number;
  tags: string[];
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  createdBy: { firstName: string; lastName: string } | null;
  _count: { assignments: number; progress: number };
  createdAt: string;
}

const TYPE_META: Record<string, { label: string; icon: any; colour: string }> = {
  article: { label: "Article", icon: FileText, colour: "bg-blue-100 text-blue-700" },
  video: { label: "Video", icon: PlayCircle, colour: "bg-red-100 text-red-700" },
  exercise: { label: "Exercise", icon: Dumbbell, colour: "bg-green-100 text-green-700" },
  infographic: { label: "Infographic", icon: ImageIcon, colour: "bg-purple-100 text-purple-700" },
};

export default function EducationPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [content, setContent] = useState<EduContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchContent(); }, [tab]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("type", tab);
      const res = await fetch(`/api/admin/education/content?${params}`);
      const data = await res.json();
      setContent(data.content || []);
    } catch { setError("Failed to load content"); }
    finally { setLoading(false); }
  };

  const deleteContent = async (id: string) => {
    if (!confirm("Delete this content?")) return;
    try {
      await fetch(`/api/admin/education/content/${id}`, { method: "DELETE" });
      fetchContent();
    } catch { setError("Delete failed"); }
  };

  const filtered = content.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: content.length,
    published: content.filter(c => c.isPublished).length,
    videos: content.filter(c => c.contentType === "video").length,
    exercises: content.filter(c => c.contentType === "exercise").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {T("admin.educationTitle")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Educational content for patient home treatment
          </p>
        </div>
        <Link href="/admin/education/create">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Create Content</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Content", value: stats.total, icon: GraduationCap, colour: "text-slate-600" },
          { label: "Published", value: stats.published, icon: CheckCircle, colour: "text-green-600" },
          { label: "Videos", value: stats.videos, icon: PlayCircle, colour: "text-red-600" },
          { label: "Exercises", value: stats.exercises, icon: Dumbbell, colour: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.colour}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Tabs */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="article">Articles</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="exercise">Exercises</TabsTrigger>
              <TabsTrigger value="infographic">Infographics</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground">No content yet</p>
                  <Link href="/admin/education/create">
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Create First Content
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(item => {
                    const typeMeta = TYPE_META[item.contentType] || TYPE_META.article;
                    const TypeIcon = typeMeta.icon;
                    return (
                      <div key={item.id} className="rounded-lg border hover:border-primary/30 transition-colors overflow-hidden">
                        {/* Thumbnail */}
                        <div className="aspect-video bg-slate-100 relative">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <TypeIcon className="h-12 w-12 text-slate-300" />
                            </div>
                          )}
                          {item.contentType === "video" && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                                <PlayCircle className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1">
                            <Badge className={`text-[10px] ${typeMeta.colour}`}>{typeMeta.label}</Badge>
                            {item.isFeatured && (
                              <Badge className="text-[10px] bg-amber-100 text-amber-700"><Star className="h-2.5 w-2.5 mr-0.5" /> Featured</Badge>
                            )}
                          </div>
                          {!item.isPublished && (
                            <Badge className="absolute top-2 right-2 text-[10px] bg-slate-200 text-slate-600">Draft</Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3">
                          <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {item.category && (
                              <Badge variant="outline" className="text-[10px]">{item.category.name}</Badge>
                            )}
                            {item.difficulty && (
                              <Badge variant="outline" className="text-[10px] capitalize">{item.difficulty}</Badge>
                            )}
                            {item.duration && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {item.duration} min
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t">
                            <div className="flex gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{item.viewCount}</span>
                              <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{item._count.assignments}</span>
                            </div>
                            <div className="flex gap-1">
                              <Link href={`/admin/education/create?edit=${item.id}`}>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <PenSquare className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteContent(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
