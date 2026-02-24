"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen, Plus, Loader2, Trash2, PenSquare,
  AlertCircle, GraduationCap,
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

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  _count: { content: number };
}

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/education/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  const createCategory = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/education/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setDialogOpen(false);
        setName(""); setDescription("");
        fetchCategories();
      }
    } catch { setError("Failed to create"); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" /> Categories
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Organize educational content by topic</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g. Foot Care Exercises" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="What this category covers..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" onClick={createCategory} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="font-medium">No categories yet</p>
            <p className="text-sm text-muted-foreground">Categories help organize your educational content</p>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Create First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (cat.color || "#3B82F6") + "20" }}
                  >
                    <GraduationCap className="h-5 w-5" style={{ color: cat.color || "#3B82F6" }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{cat.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{cat._count.content} items</Badge>
                      <Badge className={cat.isActive ? "text-[10px] bg-green-100 text-green-700" : "text-[10px] bg-slate-100 text-slate-600"}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
