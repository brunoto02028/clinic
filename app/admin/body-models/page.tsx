"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Wand2, Upload, Loader2, RefreshCw, Download, Trash2,
  CheckCircle2, Clock, AlertCircle, Box, User, FileUp,
} from "lucide-react";

interface ModelInfo {
  name: string;
  gender: string;
  path: string;
  size: number;
}

interface GenerationTask {
  taskId: string;
  gender: string;
  status: string;
  progress: number;
  thumbnailUrl?: string;
  modelUrls?: { glb?: string };
}

const DEFAULT_PROMPTS: Record<string, string> = {
  male: "realistic male human body mannequin, anatomical proportions, athletic build, standing in A-pose, neutral skin color, no clothing, smooth clean surface, clinical medical assessment model, full body front view",
  female: "realistic female human body mannequin, anatomical proportions, standing in A-pose, neutral skin color, no clothing, smooth clean surface, clinical medical assessment model, full body front view",
};

export default function AdminBodyModelsPage() {
  const { toast } = useToast();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPTS.male);
  const [generating, setGenerating] = useState(false);
  const [task, setTask] = useState<GenerationTask | null>(null);
  const [polling, setPolling] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/body-models/upload");
      const data = await res.json();
      setModels(data.models || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    setPrompt(DEFAULT_PROMPTS[gender]);
  }, [gender]);

  // ─── AI Generate ───
  const startGeneration = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/body-models/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTask({ taskId: data.taskId, gender, status: "PENDING", progress: 0 });
      toast({ title: "Generation Started", description: "AI is creating your 3D model. This takes 1-3 minutes." });
      pollStatus(data.taskId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const pollStatus = async (taskId: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/body-models/generate?taskId=${taskId}&gender=${gender}`);
        const data = await res.json();

        setTask((prev) => prev ? {
          ...prev,
          status: data.status,
          progress: data.progress || 0,
          thumbnailUrl: data.thumbnailUrl,
          modelUrls: data.modelUrls,
        } : null);

        if (data.status === "SUCCEEDED" || data.status === "FAILED" || data.status === "EXPIRED") {
          clearInterval(interval);
          setPolling(false);

          if (data.status === "SUCCEEDED") {
            toast({ title: "Model Ready!", description: "Your 3D model has been generated. Click 'Save Model' to use it." });
          } else {
            toast({ title: "Generation Failed", description: `Status: ${data.status}`, variant: "destructive" });
          }
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 5000);
  };

  const saveGeneratedModel = async () => {
    if (!task?.taskId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/body-models/generate?taskId=${task.taskId}&download=true&gender=${gender}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Model Saved!", description: data.message });
      setTask(null);
      fetchModels();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // ─── Manual Upload ───
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("gender", gender);

      const res = await fetch("/api/admin/body-models/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Uploaded!", description: data.message });
      fetchModels();
    } catch (err: any) {
      toast({ title: "Upload Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Box className="h-5 w-5" /> Body Assessment — 3D Models
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate AI-powered 3D body models or upload custom GLB files for the body assessment body map.
        </p>
      </div>

      {/* Current Models */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4" /> Installed Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : models.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom models installed. Using default model (human.glb).</p>
          ) : (
            <div className="space-y-2">
              {models.map((m) => (
                <div key={m.name} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                      {m.gender === "female" ? "♀" : "♂"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(m.size)} — {m.gender}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> Active
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gender Selection */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Target Gender:</span>
        <div className="flex gap-1">
          <Button
            variant={gender === "male" ? "default" : "outline"}
            size="sm"
            onClick={() => setGender("male")}
          >
            ♂ Male
          </Button>
          <Button
            variant={gender === "female" ? "default" : "outline"}
            size="sm"
            onClick={() => setGender("female")}
          >
            ♀ Female
          </Button>
        </div>
      </div>

      {/* AI Generation */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> AI Model Generation (Meshy AI)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Generate a realistic 3D body model using AI. Requires a Meshy AI API key (free at meshy.ai — 200 credits/month).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="text-sm"
              placeholder="Describe the 3D body model you want..."
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={startGeneration}
              disabled={generating || polling || !prompt.trim()}
              className="gap-1.5"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? "Starting..." : "Generate 3D Model"}
            </Button>
          </div>

          {/* Generation Progress */}
          {task && (
            <div className="border rounded-lg p-4 space-y-3 bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {task.status === "SUCCEEDED" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : task.status === "FAILED" || task.status === "EXPIRED" ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  <span className="text-sm font-medium">
                    {task.status === "SUCCEEDED" ? "Model Ready!" :
                     task.status === "FAILED" ? "Generation Failed" :
                     task.status === "EXPIRED" ? "Task Expired" :
                     `Generating... ${task.progress}%`}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">{task.status}</Badge>
              </div>

              {task.status !== "SUCCEEDED" && task.status !== "FAILED" && task.status !== "EXPIRED" && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}

              {task.thumbnailUrl && (
                <div className="flex justify-center">
                  <img
                    src={task.thumbnailUrl}
                    alt="Generated model preview"
                    className="rounded-lg border max-h-48 object-contain"
                  />
                </div>
              )}

              {task.status === "SUCCEEDED" && (
                <Button onClick={saveGeneratedModel} disabled={generating} className="gap-1.5 w-full">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Save as {gender === "female" ? "Female" : "Male"} Model
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileUp className="h-4 w-4" /> Manual Upload
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload a custom .glb 3D model file. Max 50MB. The model will replace the current {gender} body model.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">{uploading ? "Uploading..." : "Choose .glb file"}</span>
              </div>
            </label>
            <span className="text-xs text-muted-foreground">
              Will save as human-{gender}.glb
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sources info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Where to find 3D body models</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p>- <strong>Meshy AI</strong> (meshy.ai) — AI-generated from text prompt (integrated above)</p>
          <p>- <strong>ReadyPlayerMe</strong> (readyplayer.me) — Free avatar creation, export as GLB</p>
          <p>- <strong>Sketchfab</strong> (sketchfab.com) — Browse and download free CC0 human models</p>
          <p>- <strong>MakeHuman</strong> (makehumancommunity.org) — Open source tool, fully customizable anatomy</p>
          <p>- <strong>CGTrader</strong> (cgtrader.com) — Free and paid anatomical models in GLTF/GLB format</p>
        </CardContent>
      </Card>
    </div>
  );
}
