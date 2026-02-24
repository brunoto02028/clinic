"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap, PlayCircle, FileText, Dumbbell, Image as ImageIcon,
  Clock, Star, CheckCircle, Loader2, ChevronRight, User,
  BookOpen, BarChart3, ArrowLeft, X, ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/hooks/use-locale";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  thumbnailUrl: string | null;
  videoUrl?: string | null;
  duration: number | null;
  difficulty: string | null;
  bodyParts?: string[];
  tags: string[];
  isFeatured?: boolean;
  viewCount?: number;
  category: { id: string; name: string; color: string | null } | null;
}

interface Assignment {
  id: string;
  note: string | null;
  dueDate: string | null;
  frequency: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  content: ContentItem;
  assignedBy: { firstName: string; lastName: string } | null;
}

interface Progress {
  status: string;
  completedAt: string | null;
  rating: number | null;
}

const TYPE_ICON: Record<string, any> = {
  article: FileText,
  video: PlayCircle,
  exercise: Dumbbell,
  infographic: ImageIcon,
};

export default function PatientEducationPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [published, setPublished] = useState<ContentItem[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("assigned");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/education");
      const data = await res.json();
      setAssignments(data.assignments || []);
      setPublished(data.published || []);
      setProgress(data.progress || {});
      setCategories(data.categories || []);
    } catch {}
    finally { setLoading(false); }
  };

  const markProgress = async (contentId: string, status: string) => {
    setSubmitting(true);
    try {
      await fetch("/api/education/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, status, rating: rating || null, feedback: feedback || null }),
      });
      setProgress(prev => ({ ...prev, [contentId]: { status, completedAt: status === "completed" ? new Date().toISOString() : null, rating } }));
      if (status === "completed") {
        setAssignments(prev => prev.map(a => a.content.id === contentId ? { ...a, isCompleted: true } : a));
      }
    } catch {}
    finally { setSubmitting(false); }
  };

  const openContent = (content: ContentItem, assignment?: Assignment) => {
    setSelectedContent(content);
    setViewingAssignment(assignment || null);
    setRating(0);
    setFeedback("");
    // Mark as in_progress
    if (!progress[content.id] || progress[content.id].status === "not_started") {
      markProgress(content.id, "in_progress");
    }
  };

  const pendingAssignments = assignments.filter(a => !a.isCompleted);
  const completedAssignments = assignments.filter(a => a.isCompleted);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  // Content viewer
  if (selectedContent) {
    const Icon = TYPE_ICON[selectedContent.contentType] || FileText;
    const prog = progress[selectedContent.id];
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Button variant="ghost" className="gap-2" onClick={() => setSelectedContent(null)}>
          <ArrowLeft className="h-4 w-4" /> {isPt ? "Voltar" : "Back to Education"}
        </Button>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize text-xs gap-1"><Icon className="h-3 w-3" />{selectedContent.contentType}</Badge>
            {selectedContent.category && <Badge variant="outline" className="text-xs">{selectedContent.category.name}</Badge>}
            {selectedContent.difficulty && <Badge variant="outline" className="text-xs capitalize">{selectedContent.difficulty}</Badge>}
            {selectedContent.duration && <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" />{selectedContent.duration} min</Badge>}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">{selectedContent.title}</h1>
          {selectedContent.description && <p className="text-muted-foreground mt-1">{selectedContent.description}</p>}
          {viewingAssignment?.note && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-medium text-blue-800 flex items-center gap-1"><User className="h-3.5 w-3.5" /> {isPt ? `Nota de ${viewingAssignment.assignedBy?.firstName}:` : `Note from ${viewingAssignment.assignedBy?.firstName}:`}</p>
              <p className="text-blue-700 mt-1">{viewingAssignment.note}</p>
            </div>
          )}
        </div>

        {/* Video embed */}
        {selectedContent.contentType === "video" && selectedContent.videoUrl && (
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            {selectedContent.videoUrl.includes("youtube") ? (
              <iframe
                src={`https://www.youtube.com/embed/${selectedContent.videoUrl.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}`}
                className="w-full h-full"
                allowFullScreen
              />
            ) : (
              <video src={selectedContent.videoUrl} controls className="w-full h-full" />
            )}
          </div>
        )}

        {/* Thumbnail for non-video */}
        {selectedContent.contentType !== "video" && selectedContent.thumbnailUrl && (
          <img src={selectedContent.thumbnailUrl} alt="" className="w-full rounded-xl" />
        )}

        {/* Completion + Feedback */}
        {(!prog || prog.status !== "completed") && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <h3 className="font-semibold text-sm">{isPt ? "Marcar como Concluído" : "Mark as Complete"}</h3>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{isPt ? "Avalie este conteúdo (opcional)" : "Rate this content (optional)"}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-colors ${
                        rating >= n ? "bg-amber-400 text-white border-amber-400" : "border-slate-200 text-slate-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder={isPt ? "O que achou? Algum feedback... (opcional)" : "How did you find this? Any feedback... (optional)"}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={2}
              />
              <Button
                className="w-full gap-2"
                onClick={() => markProgress(selectedContent.id, "completed")}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isPt ? "Marcar como Concluído" : "Mark as Completed"}
              </Button>
            </CardContent>
          </Card>
        )}

        {prog?.status === "completed" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
            <p className="font-semibold text-green-800 mt-2">{isPt ? "Concluído!" : "Completed!"}</p>
            <p className="text-sm text-green-700">{isPt ? "Ótimo trabalho acompanhando seu plano de tratamento." : "Great job keeping up with your treatment plan."}</p>
          </div>
        )}
      </div>
    );
  }

  // Main listing
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> {isPt ? "Minha Educação" : "My Education"}
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">{isPt ? "Sua biblioteca personalizada de aprendizado e exercícios" : "Your personalised learning and exercise library"}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-2xl font-bold text-primary">{pendingAssignments.length}</p>
            <p className="text-[10px] text-muted-foreground">{isPt ? "Atribuídos" : "Assigned"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-2xl font-bold text-green-600">{completedAssignments.length}</p>
            <p className="text-[10px] text-muted-foreground">{isPt ? "Concluídos" : "Completed"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-2xl font-bold text-blue-600">{published.length}</p>
            <p className="text-[10px] text-muted-foreground">{isPt ? "Disponíveis" : "Available"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="assigned" className="text-xs sm:text-sm">{isPt ? "Atribuídos" : "Assigned"} ({pendingAssignments.length})</TabsTrigger>
          <TabsTrigger value="browse" className="text-xs sm:text-sm">{isPt ? "Explorar Tudo" : "Browse All"}</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">{isPt ? "Concluídos" : "Completed"} ({completedAssignments.length})</TabsTrigger>
        </TabsList>

        {/* Assigned content */}
        <TabsContent value="assigned" className="mt-4">
          {pendingAssignments.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary/40" />
              </div>
              <p className="text-muted-foreground font-medium">{isPt ? "Nenhuma atribuição pendente" : "No pending assignments"}</p>
              <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">{isPt ? "Seu terapeuta irá atribuir conteúdo educativo após suas sessões." : "Your therapist will assign educational content after your sessions."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAssignments.map(a => {
                const Icon = TYPE_ICON[a.content.contentType] || FileText;
                return (
                  <button
                    key={a.id}
                    onClick={() => openContent(a.content, a)}
                    className="w-full text-left"
                  >
                    <Card className="hover:border-primary/30 transition-colors">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {a.content.thumbnailUrl ? (
                              <img src={a.content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Icon className="h-6 w-6 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm truncate">{a.content.title}</p>
                              {a.isRequired && <Badge className="text-[10px] bg-red-100 text-red-700">{isPt ? "Obrigatório" : "Required"}</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] capitalize">{a.content.contentType}</Badge>
                              {a.content.duration && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{a.content.duration} min</span>}
                              {a.dueDate && (
                                <span>{isPt ? "Prazo" : "Due"} {new Date(a.dueDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "numeric", month: "short" })}</span>
                              )}
                            </div>
                            {a.note && <p className="text-[11px] text-muted-foreground italic truncate mt-0.5">{a.note}</p>}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Browse all */}
        <TabsContent value="browse" className="mt-4">
          {published.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">{isPt ? "Nenhum conteúdo disponível ainda" : "No content available yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {published.map(item => {
                const Icon = TYPE_ICON[item.contentType] || FileText;
                const prog = progress[item.id];
                return (
                  <button key={item.id} onClick={() => openContent(item)} className="text-left">
                    <Card className="hover:border-primary/30 transition-colors h-full">
                      <CardContent className="pt-0 pb-3">
                        <div className="aspect-video bg-slate-100 rounded-t-lg -mx-6 -mt-0 mb-3 overflow-hidden relative">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="h-10 w-10 text-slate-300" />
                            </div>
                          )}
                          {item.contentType === "video" && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center">
                                <PlayCircle className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                          {prog?.status === "completed" && (
                            <div className="absolute top-2 right-2">
                              <Badge className="text-[10px] bg-green-500 text-white"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />{isPt ? "Feito" : "Done"}</Badge>
                            </div>
                          )}
                          {item.isFeatured && (
                            <div className="absolute top-2 left-2">
                              <Badge className="text-[10px] bg-amber-100 text-amber-700"><Star className="h-2.5 w-2.5 mr-0.5" />{isPt ? "Destaque" : "Featured"}</Badge>
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                        {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] capitalize">{item.contentType}</Badge>
                          {item.difficulty && <Badge variant="outline" className="text-[10px] capitalize">{item.difficulty}</Badge>}
                          {item.duration && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{item.duration} min</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Completed */}
        <TabsContent value="completed" className="mt-4">
          {completedAssignments.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">{isPt ? "Nenhum conteúdo concluído ainda" : "No completed content yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedAssignments.map(a => {
                const Icon = TYPE_ICON[a.content.contentType] || FileText;
                return (
                  <Card key={a.id} className="opacity-80">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a.content.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{a.content.contentType}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
