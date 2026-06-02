"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, Users, DollarSign, Target, Phone, Mail, Plus,
  Loader2, MoreVertical, ArrowRight, Clock, AlertCircle,
  CheckCircle2, XCircle, Calendar, MessageSquare, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  stage: string;
  priority: string;
  interestedIn?: string;
  estimatedValue?: number;
  actualValue?: number;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  followUpCount: number;
  notes?: string;
  lostReason?: string;
  convertedAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  booked: number;
  attended: number;
  converted: number;
  lost: number;
  totalPipelineValue: number;
  totalRevenue: number;
  conversionRate: number;
  overdueFollowUps: number;
}

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "consultation_booked", label: "Booked", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "attended", label: "Attended", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "converted", label: "Converted", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
];

const SOURCES = [
  { value: "website", label: "Website" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "ads", label: "Ads" },
  { value: "organic", label: "Organic" },
];

const SERVICES = [
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "sports_rehab", label: "Sports Rehabilitation" },
  { value: "foot_scan", label: "Foot Scan / Insoles" },
  { value: "dry_needling", label: "Dry Needling" },
  { value: "shockwave", label: "Shockwave Therapy" },
  { value: "laser_therapy", label: "Laser Therapy" },
  { value: "biomechanics", label: "Biomechanical Assessment" },
  { value: "membership", label: "Membership Plan" },
];

export default function SalesPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStage, setFilterStage] = useState("all");
  const [view, setView] = useState<"pipeline" | "list">("pipeline");

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", source: "website",
    interestedIn: "", estimatedValue: "", notes: "", priority: "medium",
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStage !== "all") params.set("stage", filterStage);
      const res = await fetch(`/api/admin/sales?${params}`);
      const data = await res.json();
      if (res.ok) { setLeads(data.leads); setStats(data.stats); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [filterStage]);

  const createLead = async () => {
    if (!formData.name || !formData.source) {
      toast({ title: "Name and source are required", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast({ title: "Lead created!" });
        setShowForm(false);
        setFormData({ name: "", email: "", phone: "", source: "website", interestedIn: "", estimatedValue: "", notes: "", priority: "medium" });
        fetchLeads();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateStage = async (id: string, newStage: string) => {
    try {
      await fetch(`/api/admin/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const getStageLeads = (stage: string) => leads.filter((l) => l.stage === stage);

  const isOverdue = (lead: Lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date() && !["converted", "lost"].includes(lead.stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7 text-emerald-600" />
            Sales Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track leads, conversions, and revenue</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
              <p className="text-xl font-bold">£{stats.totalPipelineValue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Pipeline Value</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-green-600 mb-1" />
              <p className="text-xl font-bold">£{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-4 w-4 mx-auto text-purple-600 mb-1" />
              <p className="text-xl font-bold">{stats.conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Conversion</p>
            </CardContent>
          </Card>
          <Card className={stats.overdueFollowUps > 0 ? "border-red-300 dark:border-red-700" : ""}>
            <CardContent className="p-3 text-center">
              <AlertCircle className={`h-4 w-4 mx-auto mb-1 ${stats.overdueFollowUps > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              <p className={`text-xl font-bold ${stats.overdueFollowUps > 0 ? "text-red-600" : ""}`}>{stats.overdueFollowUps}</p>
              <p className="text-[10px] text-muted-foreground">Overdue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pipeline View */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES.filter((s) => !["converted", "lost"].includes(s.value)).map((stage) => (
            <div key={stage.value} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Badge className={stage.color}>{stage.label}</Badge>
                <span className="text-xs text-muted-foreground">{getStageLeads(stage.value).length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30 border border-dashed">
                {getStageLeads(stage.value).map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isOverdue={!!isOverdue(lead)}
                    onAdvance={(nextStage) => updateStage(lead.id, nextStage)}
                  />
                ))}
                {getStageLeads(stage.value).length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-8">No leads</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Converted & Lost (collapsed) */}
      {(stats?.converted || 0) > 0 || (stats?.lost || 0) > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Converted ({stats?.converted || 0})
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {getStageLeads("converted").map((lead) => (
                <LeadCard key={lead.id} lead={lead} isOverdue={false} onAdvance={() => {}} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" /> Lost ({stats?.lost || 0})
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {getStageLeads("lost").map((lead) => (
                <LeadCard key={lead.id} lead={lead} isOverdue={false} onAdvance={() => {}} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Add Lead Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" /> Add New Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+44..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Source *</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Interested In</Label>
                <Select value={formData.interestedIn} onValueChange={(v) => setFormData({ ...formData, interestedIn: v })}>
                  <SelectTrigger><SelectValue placeholder="Service..." /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estimated Value (£)</Label>
                <Input type="number" value={formData.estimatedValue} onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })} placeholder="e.g. 300" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Context about this lead..." />
            </div>
            <Button onClick={createLead} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Add Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Lead Card Component ───
function LeadCard({ lead, isOverdue, onAdvance }: { lead: Lead; isOverdue: boolean; onAdvance: (stage: string) => void }) {
  const nextStage: Record<string, string> = {
    new: "contacted",
    contacted: "consultation_booked",
    consultation_booked: "attended",
    attended: "converted",
  };

  const priorityColor: Record<string, string> = {
    urgent: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-blue-500",
    low: "border-l-slate-400",
  };

  return (
    <Card className={`border-l-4 ${priorityColor[lead.priority] || "border-l-slate-400"} ${isOverdue ? "ring-1 ring-red-400" : ""}`}>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          {lead.estimatedValue && (
            <span className="text-xs font-bold text-emerald-600">£{lead.estimatedValue}</span>
          )}
        </div>

        {lead.interestedIn && (
          <p className="text-[10px] text-muted-foreground">{lead.interestedIn.replace(/_/g, " ")}</p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.email && <Mail className="h-3 w-3 text-muted-foreground" />}
          {lead.phone && <Phone className="h-3 w-3 text-muted-foreground" />}
          <Badge variant="outline" className="text-[9px] h-4 px-1">{lead.source}</Badge>
          {isOverdue && <Badge variant="destructive" className="text-[9px] h-4 px-1">Overdue</Badge>}
        </div>

        {lead.stage !== "converted" && lead.stage !== "lost" && nextStage[lead.stage] && (
          <div className="flex gap-1 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => onAdvance(nextStage[lead.stage])}
            >
              <ArrowRight className="h-3 w-3" /> {STAGES.find((s) => s.value === nextStage[lead.stage])?.label}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2 text-red-600"
              onClick={() => onAdvance("lost")}
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
