"use client";

import { useState, useEffect } from "react";
import {
  Search, Loader2, GraduationCap, MapPin, Globe, Clock, Award, Star,
  ExternalLink, Trash2, BookmarkPlus, CheckCircle, XCircle, Eye,
  Sparkles, Filter, RefreshCw, StickyNote, ChevronDown, ChevronUp,
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

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "shockwave_therapy", label: "Shockwave Therapy" },
  { value: "laser_therapy", label: "Laser Therapy" },
  { value: "sports_rehabilitation", label: "Sports Rehabilitation" },
  { value: "manual_therapy", label: "Manual Therapy" },
  { value: "electrotherapy", label: "Electrotherapy" },
  { value: "biomechanics", label: "Biomechanics" },
  { value: "exercise_therapy", label: "Exercise Therapy" },
  { value: "pain_management", label: "Pain Management" },
  { value: "post_surgical_rehab", label: "Post-Surgical Rehab" },
  { value: "foot_and_gait", label: "Foot & Gait Analysis" },
  { value: "ultrasound_therapy", label: "Ultrasound Therapy" },
  { value: "dry_needling", label: "Dry Needling / Acupuncture" },
  { value: "clinical_pilates", label: "Clinical Pilates" },
  { value: "business_and_leadership", label: "Business & Leadership" },
  { value: "general_cpd", label: "General CPD" },
  { value: "injection_therapy", label: "\u{1F489} Injection Therapy" },
  { value: "prescribing_rights", label: "\u{1F4CB} Prescribing Rights" },
  { value: "diagnostic_ultrasound", label: "\u{1F4F7} Diagnostic Ultrasound" },
  { value: "msk_sonography", label: "\u{1F4F7} MSK Sonography" },
  { value: "advanced_practice", label: "\u{2B50} Advanced Practice" },
  { value: "first_contact_practitioner", label: "\u{1F3E5} First Contact Practitioner" },
  { value: "return_to_sport", label: "\u26BD Return to Sport" },
  { value: "strength_conditioning", label: "\u{1F4AA} Strength & Conditioning" },
  { value: "nutrition_supplementation", label: "\u{1F96C} Nutrition & Supplementation" },
  { value: "mental_health_wellbeing", label: "\u{1F9E0} Mental Health" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "new", label: "New" },
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "online", label: "Online" },
  { value: "in_person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
];

interface Course {
  id: string;
  title: string;
  provider: string;
  url: string | null;
  description: string;
  aiSummary: string | null;
  category: string;
  type: string;
  location: string | null;
  postcode: string | null;
  distance: string | null;
  cost: string | null;
  duration: string | null;
  startDate: string | null;
  accreditation: string | null;
  relevanceScore: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  interested: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  applied: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  dismissed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const typeIcons: Record<string, React.ReactNode> = {
  online: <Globe className="h-3.5 w-3.5" />,
  in_person: <MapPin className="h-3.5 w-3.5" />,
  hybrid: <><Globe className="h-3 w-3" /><MapPin className="h-3 w-3" /></>,
};

function RelevanceBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : score >= 40 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium">{score}%</span>
    </div>
  );
}

export default function CPDCoursesPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Search form
  const [postcode, setPostcode] = useState("TW9 1DN");
  const [radius, setRadius] = useState("50");
  const [searchType, setSearchType] = useState("all");
  const [searchMode, setSearchMode] = useState("all");
  const [searchInterests, setSearchInterests] = useState("");

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterType !== "all") params.set("type", filterType);

      const res = await fetch(`/api/admin/cpd-courses?${params}`);
      const data = await res.json();
      if (res.ok) setCourses(data.courses || []);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, [filterStatus, filterCategory, filterType]);

  const searchCourses = async () => {
    if (!postcode.trim()) {
      toast({ title: "Postcode required", description: "Enter your postcode to search for courses", variant: "destructive" });
      return;
    }
    setSearching(true);
    try {
      const interests = searchInterests.trim()
        ? searchInterests.split(",").map(s => s.trim())
        : [];

      const res = await fetch("/api/admin/cpd-courses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode: postcode.trim(),
          radius: parseInt(radius),
          type: searchType,
          searchMode,
          interests,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Search complete!",
        description: `Found ${data.found} courses, saved ${data.saved} to your list.`,
      });
      fetchCourses();
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/cpd-courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCourses(prev => prev.map(c => c.id === id ? { ...c, status } : c));
        toast({ title: "Status updated" });
      }
    } catch (err: any) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const saveNotes = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cpd-courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });
      if (res.ok) {
        setCourses(prev => prev.map(c => c.id === id ? { ...c, notes: notesText } : c));
        setEditingNotes(null);
        toast({ title: "Notes saved" });
      }
    } catch (err: any) {
      toast({ title: "Failed to save notes", variant: "destructive" });
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cpd-courses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== id));
        toast({ title: "Course removed" });
      }
    } catch (err: any) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const categoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-teal-600" />
            Courses & Licences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered search for courses, certifications, licences, and professional requirements
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {courses.length} courses found
        </Badge>
      </div>

      {/* Search Panel */}
      <Card className="border-teal-400/30 dark:border-teal-400/30 bg-teal-50 dark:bg-teal-900/30">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-teal-500 dark:text-teal-400 animate-pulse" />
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">AI Course Agent</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-800 dark:text-white">Your Postcode</Label>
              <Input
                placeholder="e.g. TW9 1DN"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-800 dark:text-white">Search Mode</Label>
              <Select value={searchMode} onValueChange={setSearchMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everything</SelectItem>
                  <SelectItem value="cpd">CPD Only</SelectItem>
                  <SelectItem value="licence">Licences & Qualifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-800 dark:text-white">Radius (miles)</Label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="100">100 miles</SelectItem>
                  <SelectItem value="200">Nationwide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-800 dark:text-white">Course Type</Label>
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="online">Online Only</SelectItem>
                  <SelectItem value="in_person">In-Person Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-800 dark:text-white">Specific Interests</Label>
              <Input
                placeholder="e.g. injection, prescribing (optional)"
                value={searchInterests}
                onChange={(e) => setSearchInterests(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={searchCourses}
            disabled={searching}
            className="w-full sm:w-auto gap-2 bg-teal-600 hover:bg-teal-700"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching for courses... (this may take 15-30s)
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search for CPD Courses
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={fetchCourses} className="gap-1 text-xs">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : courses.length === 0 ? (
        <Card className="py-16 text-center">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-medium text-lg mb-2">No courses found yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Use the AI Course Agent above to search for CPD opportunities
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const isExpanded = expandedId === course.id;
            return (
              <Card
                key={course.id}
                className={`overflow-hidden transition-all ${course.status === "dismissed" ? "opacity-50" : ""}`}
              >
                <CardContent className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={statusColors[course.status] || statusColors.new} variant="secondary">
                          {course.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          {typeIcons[course.type]}
                          {course.type === "in_person" ? "In-Person" : course.type === "hybrid" ? "Hybrid" : "Online"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{categoryLabel(course.category)}</Badge>
                      </div>
                      <h3 className="font-semibold text-base leading-tight">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">{course.provider}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <RelevanceBar score={course.relevanceScore} />
                      {course.cost && (
                        <span className="text-sm font-semibold text-teal-600">{course.cost}</span>
                      )}
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {course.duration && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course.duration}</span>
                    )}
                    {course.startDate && (
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {course.startDate}</span>
                    )}
                    {course.location && course.type !== "online" && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {course.location} {course.distance ? `(${course.distance})` : ""}</span>
                    )}
                    {course.accreditation && (
                      <span className="flex items-center gap-1"><Award className="h-3 w-3" /> {course.accreditation}</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm mt-2 text-foreground/80 line-clamp-2">{course.description}</p>

                  {/* Expand / Actions */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : course.id)}
                      className="gap-1 text-xs"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? "Less" : "More details"}
                    </Button>
                    <div className="flex items-center gap-1">
                      {course.status !== "interested" && course.status !== "applied" && course.status !== "completed" && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => updateStatus(course.id, "interested")}>
                          <BookmarkPlus className="h-3 w-3" /> Interested
                        </Button>
                      )}
                      {course.status === "interested" && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs h-7 text-purple-600" onClick={() => updateStatus(course.id, "applied")}>
                          <CheckCircle className="h-3 w-3" /> Applied
                        </Button>
                      )}
                      {course.status === "applied" && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs h-7 text-green-600" onClick={() => updateStatus(course.id, "completed")}>
                          <CheckCircle className="h-3 w-3" /> Completed
                        </Button>
                      )}
                      {course.status !== "dismissed" && course.status !== "completed" && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-muted-foreground" onClick={() => updateStatus(course.id, "dismissed")}>
                          <XCircle className="h-3 w-3" /> Dismiss
                        </Button>
                      )}
                      {course.url && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs h-7" asChild>
                          <a href={course.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" /> Visit
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCourse(course.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      {course.aiSummary && (
                        <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-lg p-3">
                          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> AI Relevance Analysis
                          </p>
                          <p className="text-sm">{course.aiSummary}</p>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold flex items-center gap-1">
                            <StickyNote className="h-3 w-3" /> Personal Notes
                          </p>
                          {editingNotes !== course.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6"
                              onClick={() => { setEditingNotes(course.id); setNotesText(course.notes || ""); }}
                            >
                              {course.notes ? "Edit" : "Add notes"}
                            </Button>
                          )}
                        </div>
                        {editingNotes === course.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              placeholder="Add your notes about this course..."
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="text-xs h-7" onClick={() => saveNotes(course.id)}>Save</Button>
                              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditingNotes(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : course.notes ? (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{course.notes}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No notes yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
