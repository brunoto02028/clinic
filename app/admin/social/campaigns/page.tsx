"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange, Plus, Loader2, Sparkles, Target, Clock,
  CheckCircle, FileText, AlertCircle, X, ChevronRight,
  Wand2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  postsCount: number;
  publishedCount: number;
  scheduledCount: number;
  draftCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New campaign form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // AI campaign generation
  const [aiGoal, setAiGoal] = useState("");
  const [aiDuration, setAiDuration] = useState<"week" | "2weeks" | "month">("week");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [savingAi, setSavingAi] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      setError("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          goal: goal || null,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDialogOpen(false);
        setName(""); setDescription(""); setGoal(""); setStartDate(""); setEndDate("");
        fetchCampaigns();
      }
    } catch {
      setError("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const generateAiCampaign = async () => {
    if (!aiGoal.trim()) { setError("Please enter a campaign goal"); return; }
    setAiGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "campaign",
          goal: aiGoal,
          duration: aiDuration,
          clinicName: "Bruno Physical Rehabilitation",
          services: ["Foot Scans", "Custom Insoles", "Physical Therapy", "Biomechanical Assessment"],
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAiResult(data);
      }
    } catch {
      setError("AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  const saveAiCampaign = async () => {
    if (!aiResult) return;
    setSavingAi(true);
    try {
      // Create campaign
      const campRes = await fetch("/api/admin/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: aiResult.name,
          description: aiResult.description,
          goal: aiGoal,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + (aiDuration === "week" ? 7 : aiDuration === "2weeks" ? 14 : 30) * 86400000).toISOString(),
        }),
      });
      const campData = await campRes.json();
      if (!campData.campaign?.id) { setError("Failed to create campaign"); setSavingAi(false); return; }

      // Create posts
      for (const post of aiResult.posts || []) {
        const scheduledAt = new Date(Date.now() + post.dayOffset * 86400000);
        const [hours, minutes] = (post.suggestedTime || "10:00").split(":");
        scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0);

        await fetch("/api/admin/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: post.caption,
            hashtags: post.hashtags?.join(", ") || "",
            campaignId: campData.campaign.id,
            scheduledAt: scheduledAt.toISOString(),
            status: "SCHEDULED",
            aiGenerated: true,
            aiPrompt: post.topic,
          }),
        });
      }

      setAiDialogOpen(false);
      setAiResult(null);
      setAiGoal("");
      fetchCampaigns();
    } catch {
      setError("Failed to save AI campaign");
    } finally {
      setSavingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" />
            Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Plan and schedule content campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="h-4 w-4" /> AI Campaign
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Summer Foot Care Tips" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Goal</Label>
                  <Input placeholder="e.g. Promote foot scan services" value={goal} onChange={e => setGoal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Campaign details..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="w-full" onClick={createCampaign} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Campaign Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={v => { setAiDialogOpen(v); if (!v) setAiResult(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" /> AI Campaign Generator
            </DialogTitle>
          </DialogHeader>

          {!aiResult ? (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Campaign Goal</Label>
                <Input
                  placeholder="e.g. Attract new patients interested in custom insoles"
                  value={aiGoal}
                  onChange={e => setAiGoal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={aiDuration} onValueChange={(v: any) => setAiDuration(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">1 Week (5 posts)</SelectItem>
                    <SelectItem value="2weeks">2 Weeks (10 posts)</SelectItem>
                    <SelectItem value="month">1 Month (20 posts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full gap-2 bg-violet-600 hover:bg-violet-700" onClick={generateAiCampaign} disabled={aiGenerating}>
                {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Generate Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="p-3 bg-violet-50 rounded-lg">
                <p className="font-semibold text-sm">{aiResult.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{aiResult.description}</p>
              </div>
              <p className="text-sm font-medium">{aiResult.posts?.length} posts generated:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {aiResult.posts?.map((post: any, i: number) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-lg border text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">Day {post.dayOffset + 1}</Badge>
                      <Badge variant="outline" className="text-[10px]">{post.suggestedTime}</Badge>
                      <span className="text-xs text-muted-foreground">{post.topic}</span>
                    </div>
                    <p className="text-xs line-clamp-2">{post.caption}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAiResult(null)}>
                  Regenerate
                </Button>
                <Button className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700" onClick={saveAiCampaign} disabled={savingAi}>
                  {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Save Campaign & Posts
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <CalendarRange className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground">Create a campaign to organise your social media content</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" className="gap-2" onClick={() => setAiDialogOpen(true)}>
                <Sparkles className="h-4 w-4" /> AI Campaign
              </Button>
              <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Manual Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map(c => (
            <Card key={c.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{c.name}</h3>
                    {c.goal && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Target className="h-3 w-3" /> {c.goal}
                      </p>
                    )}
                  </div>
                  <Badge className={c.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                    {c.isActive ? "Active" : "Ended"}
                  </Badge>
                </div>

                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                )}

                {(c.startDate || c.endDate) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Calendar className="h-3 w-3" />
                    {c.startDate && new Date(c.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {c.startDate && c.endDate && " — "}
                    {c.endDate && new Date(c.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                )}

                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <FileText className="h-3 w-3" /> {c.postsCount} posts
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" /> {c.publishedCount} published
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <Clock className="h-3 w-3" /> {c.scheduledCount} scheduled
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t flex justify-end">
                  <Link href={`/admin/social?campaignId=${c.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      View Posts <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
