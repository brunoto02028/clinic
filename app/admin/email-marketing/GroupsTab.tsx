"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Check, X } from "lucide-react";

export interface EmailGroup {
  id: string; name: string; description?: string; _count: { members: number };
}

interface Props {
  groups: EmailGroup[];
  onRefresh: () => void;
}

export default function GroupsTab({ groups, onRefresh }: Props) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const addGroup = async () => {
    if (!form.name) return;
    const r = await fetch("/api/admin/email-groups", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (r.ok) {
      toast({ title: "Group created" });
      setForm({ name: "", description: "" });
      setShowAdd(false);
      onRefresh();
    } else {
      const d = await r.json();
      toast({ title: "Error", description: d.error, variant: "destructive" });
    }
  };

  const deleteGroup = async (id: string) => {
    await fetch("/api/admin/email-groups", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    onRefresh();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{groups.length} group(s)</p>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1.5" />New Group
        </Button>
      </div>

      {showAdd && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">New Group</p>
            <Input
              placeholder="Group name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addGroup} disabled={!form.name}>
                <Check className="h-4 w-4 mr-1" />Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4 mr-1" />Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No groups yet. Create a group to segment your contacts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(g => (
            <Card key={g.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{g.name}</p>
                    {g.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{g.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{g._count.members} member{g._count.members !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive shrink-0"
                    onClick={() => deleteGroup(g.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
