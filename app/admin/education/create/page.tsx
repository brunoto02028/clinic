"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Save, Loader2, GraduationCap, PlayCircle,
  FileText, Dumbbell, Image as ImageIcon, AlertCircle,
  CheckCircle, X, Eye, EyeOff, Star, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface Category { id: string; name: string; }

function CreateContentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("article");
  const [categoryId, setCategoryId] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProvider, setVideoProvider] = useState("youtube");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [equipment, setEquipment] = useState("");
  const [bodyParts, setBodyParts] = useState("");
  const [instructions, setInstructions] = useState("");
  const [repetitions, setRepetitions] = useState("");
  const [precautions, setPrecautions] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (editId) loadContent(editId);
  }, [editId]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/education/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {}
  };

  const loadContent = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/education/content/${id}`);
      const data = await res.json();
      if (data.content) {
        const c = data.content;
        setTitle(c.title);
        setDescription(c.description || "");
        setContentType(c.contentType);
        setCategoryId(c.categoryId || "");
        setBody(c.body || "");
        setVideoUrl(c.videoUrl || "");
        setVideoProvider(c.videoProvider || "youtube");
        setThumbnailUrl(c.thumbnailUrl || "");
        setDuration(c.duration?.toString() || "");
        setDifficulty(c.difficulty || "beginner");
        setEquipment(c.equipment || "");
        setBodyParts(c.bodyParts?.join(", ") || "");
        setInstructions(c.instructions || "");
        setRepetitions(c.repetitions || "");
        setPrecautions(c.precautions || "");
        setTags(c.tags?.join(", ") || "");
        setIsPublished(c.isPublished);
        setIsFeatured(c.isFeatured);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        description: description || null,
        contentType,
        categoryId: categoryId || null,
        body: body || null,
        videoUrl: videoUrl || null,
        videoProvider: videoUrl ? videoProvider : null,
        thumbnailUrl: thumbnailUrl || null,
        imageUrls: [],
        duration: duration || null,
        difficulty,
        equipment: equipment || null,
        bodyParts: bodyParts ? bodyParts.split(",").map(s => s.trim()).filter(Boolean) : [],
        instructions: instructions || null,
        repetitions: repetitions || null,
        precautions: precautions || null,
        tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [],
        isPublished: publish,
        isFeatured,
      };

      const url = editId ? `/api/admin/education/content/${editId}` : "/api/admin/education/content";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) { setError(data.error); }
      else {
        setSuccess(publish ? "Content published!" : "Content saved as draft!");
        setTimeout(() => router.push("/admin/education"), 1500);
      }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/education">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{editId ? "Edit Content" : "Create Educational Content"}</h1>
          <p className="text-sm text-muted-foreground">Add articles, videos, or exercises for patients</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main - Left 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          {/* Content Type Selector */}
          <div className="flex gap-2">
            {[
              { type: "article", icon: FileText, label: "Article" },
              { type: "video", icon: PlayCircle, label: "Video" },
              { type: "exercise", icon: Dumbbell, label: "Exercise" },
              { type: "infographic", icon: ImageIcon, label: "Infographic" },
            ].map(t => (
              <button
                key={t.type}
                onClick={() => setContentType(t.type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  contentType === t.type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="e.g. Plantar Fasciitis Stretching Guide" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Textarea placeholder="Brief description for listing cards..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          {/* Video URL (video type) */}
          {contentType === "video" && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <Label className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-red-500" /> Video Settings</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Input placeholder="YouTube or Vimeo URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                  </div>
                  <Select value={videoProvider} onValueChange={setVideoProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="upload">Uploaded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {videoUrl && videoUrl.includes("youtube") && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoUrl.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}`}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Exercise-specific fields */}
          {contentType === "exercise" && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <Label className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-green-600" /> Exercise Details</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Repetitions / Sets</Label>
                    <Input placeholder="e.g. 3 sets of 10" value={repetitions} onChange={e => setRepetitions(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Equipment</Label>
                    <Input placeholder="e.g. Resistance band" value={equipment} onChange={e => setEquipment(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target Body Parts (comma-separated)</Label>
                  <Input placeholder="foot, ankle, calf" value={bodyParts} onChange={e => setBodyParts(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Step-by-Step Instructions</Label>
                  <Textarea placeholder={"1. Stand with feet shoulder-width apart\n2. Slowly raise onto toes\n3. Hold for 5 seconds\n4. Lower back down"} value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Safety Precautions</Label>
                  <Textarea placeholder="Stop if you feel sharp pain..." value={precautions} onChange={e => setPrecautions(e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Body / Rich Content */}
          <div className="space-y-2">
            <Label>{contentType === "exercise" ? "Additional Notes" : "Content Body"}</Label>
            <Textarea
              placeholder={contentType === "article" ? "Write your article content here..." : "Additional information..."}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={contentType === "article" ? 12 : 5}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Settings */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Category</Label>
                <Select value={categoryId || "none"} onValueChange={v => setCategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Duration (minutes)</Label>
                <Input type="number" placeholder="15" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Thumbnail URL</Label>
                <Input placeholder="https://..." value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input placeholder="stretching, foot, beginner" value={tags} onChange={e => setTags(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Visibility */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Featured
                </Label>
                <button
                  onClick={() => setIsFeatured(!isFeatured)}
                  className={`w-9 h-5 rounded-full transition-colors ${isFeatured ? "bg-amber-500" : "bg-slate-200"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full gap-2" onClick={() => handleSave(true)} disabled={saving || !title}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Publish
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => handleSave(false)} disabled={saving || !title}>
              <Save className="h-4 w-4" /> Save Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateContentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <CreateContentForm />
    </Suspense>
  );
}
