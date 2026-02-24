"use client";

import { useState, useEffect } from "react";
import {
  LayoutTemplate, Plus, Loader2, Copy, Trash2, Hash,
  Megaphone, BookOpen, Heart, Star, AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  captionTemplate: string;
  hashtagSets: string | null;
  createdAt: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; colour: string }> = {
  promotion: { label: "Promotion", icon: Megaphone, colour: "bg-orange-100 text-orange-700" },
  tip: { label: "Health Tip", icon: BookOpen, colour: "bg-blue-100 text-blue-700" },
  testimonial: { label: "Testimonial", icon: Heart, colour: "bg-pink-100 text-pink-700" },
  announcement: { label: "Announcement", icon: Star, colour: "bg-amber-100 text-amber-700" },
};

const DEFAULT_TEMPLATES = [
  {
    name: "Service Promotion",
    category: "promotion",
    captionTemplate: "Looking for {{service}}? At {{clinic}}, we offer personalised {{service}} to help you {{benefit}}.\n\nBook your appointment today and take the first step towards better health!",
    hashtagSets: "physiotherapy, rehabilitation, footcare, health, wellness, physio",
  },
  {
    name: "Health Tip of the Week",
    category: "tip",
    captionTemplate: "Did you know? {{tip}}\n\nSmall changes in your daily routine can make a big difference to your foot health.\n\nWant to learn more? Visit us at {{clinic}} for a comprehensive assessment.",
    hashtagSets: "healthtip, foothealth, physiotherapy, wellness, selfcare, prevention",
  },
  {
    name: "Patient Success Story",
    category: "testimonial",
    captionTemplate: "Another happy patient! {{quote}}\n\nAt {{clinic}}, we're committed to helping you achieve your health goals. Every success story motivates us to do more.\n\nStart your journey today!",
    hashtagSets: "patientstory, success, rehabilitation, physio, recovery, testimonial",
  },
  {
    name: "New Service Announcement",
    category: "announcement",
    captionTemplate: "Exciting news! We're now offering {{service}} at {{clinic}}.\n\n{{description}}\n\nLimited introductory slots available. Book now to secure your place!",
    hashtagSets: "newservice, announcement, physiotherapy, clinic, healthcare, booknow",
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("promotion");
  const [captionTemplate, setCaptionTemplate] = useState("");
  const [hashtagSets, setHashtagSets] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!name.trim() || !captionTemplate.trim()) {
      setError("Name and caption template are required");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, captionTemplate, hashtagSets }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDialogOpen(false);
        setName(""); setDescription(""); setCaptionTemplate(""); setHashtagSets("");
        fetchTemplates();
      }
    } catch {
      setError("Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      for (const t of DEFAULT_TEMPLATES) {
        await fetch("/api/admin/social/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
      }
      fetchTemplates();
    } catch {
      setError("Failed to seed templates");
    } finally {
      setSeeding(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/admin/social/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch {}
  };

  const useTemplate = (t: Template) => {
    const params = new URLSearchParams();
    params.set("template", t.id);
    params.set("caption", t.captionTemplate);
    if (t.hashtagSets) params.set("hashtags", t.hashtagSets);
    window.location.href = `/admin/social/create?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-primary" />
            Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Reusable caption formats for quick posting</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="outline" className="gap-2" onClick={seedDefaults} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              Load Defaults
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="e.g. Weekly Tip" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="tip">Health Tip</SelectItem>
                        <SelectItem value="testimonial">Testimonial</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Brief description" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Caption Template</Label>
                  <Textarea
                    placeholder={"Use {{placeholders}} for dynamic content.\nE.g. At {{clinic}}, we offer {{service}}..."}
                    value={captionTemplate}
                    onChange={e => setCaptionTemplate(e.target.value)}
                    rows={5}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Available placeholders: {"{{clinic}}, {{service}}, {{benefit}}, {{tip}}, {{quote}}, {{description}}"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Default Hashtags</Label>
                  <Input
                    placeholder="footcare, physiotherapy, wellness..."
                    value={hashtagSets}
                    onChange={e => setHashtagSets(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" onClick={createTemplate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">Templates help you create consistent content quickly</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" className="gap-2" onClick={seedDefaults} disabled={seeding}>
                <Star className="h-4 w-4" /> Load Default Templates
              </Button>
              <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Create Custom
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => {
            const catMeta = CATEGORY_META[t.category || "promotion"] || CATEGORY_META.promotion;
            const CatIcon = catMeta.icon;
            return (
              <Card key={t.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${catMeta.colour}`}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{t.name}</h3>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{catMeta.label}</Badge>
                      </div>
                    </div>
                  </div>

                  {t.description && (
                    <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                  )}

                  <div className="p-2 bg-slate-50 rounded border text-xs text-muted-foreground line-clamp-3 mb-3 font-mono">
                    {t.captionTemplate}
                  </div>

                  {t.hashtagSets && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-600 mb-3">
                      <Hash className="h-3 w-3" />
                      <span className="line-clamp-1">{t.hashtagSets}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => useTemplate(t)}>
                      <Copy className="h-3 w-3" /> Use
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs gap-1 text-red-500" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
