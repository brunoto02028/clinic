"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Search, RefreshCw, Users, Check, X, Loader2 } from "lucide-react";

export interface EmailContact {
  id: string; email: string; firstName?: string; lastName?: string;
  subscribed: boolean; source?: string; createdAt: string;
}
export interface EmailGroup { id: string; name: string; _count: { members: number }; }

interface Props {
  contacts: EmailContact[];
  total: number;
  groups: EmailGroup[];
  loading: boolean;
  onRefresh: (search?: string) => void;
}

export default function ContactsTab({ contacts, total, groups, loading, onRefresh }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ email: "", firstName: "", lastName: "", phone: "" });
  const [csvText, setCsvText] = useState("");
  const [csvGroupId, setCsvGroupId] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addContact = async () => {
    if (!newContact.email) return;
    const r = await fetch("/api/admin/email-contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newContact, source: "manual" }),
    });
    if (r.ok) {
      toast({ title: "Contact added" });
      setNewContact({ email: "", firstName: "", lastName: "", phone: "" });
      setShowAdd(false);
      onRefresh(search);
    } else {
      const d = await r.json();
      toast({ title: "Error", description: d.error, variant: "destructive" });
    }
  };

  const deleteContact = async (id: string) => {
    await fetch("/api/admin/email-contacts", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    onRefresh(search);
  };

  const importCSV = async () => {
    if (!csvText.trim()) return;
    setCsvImporting(true);
    const lines = csvText.trim().split("\n").map(l => l.trim()).filter(Boolean);
    const cd = lines
      .map(line => {
        const p = line.split(",").map(x => x.trim().replace(/^"|"$/g, ""));
        return { email: p[0], firstName: p[1] || "", lastName: p[2] || "" };
      })
      .filter(c => c.email.includes("@"));
    const r = await fetch("/api/admin/email-contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, contacts: cd, groupId: csvGroupId || undefined, source: "csv" }),
    });
    if (r.ok) {
      const d = await r.json();
      toast({ title: `Imported ${d.created} contacts`, description: d.skipped > 0 ? `${d.skipped} skipped (duplicates)` : undefined });
      setCsvText("");
      onRefresh(search);
    }
    setCsvImporting(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const syncPatients = async () => {
    const r = await fetch("/api/admin/patients?limit=1000");
    if (!r.ok) return;
    const d = await r.json();
    const patients = d.patients || d;
    const cd = patients
      .filter((p: any) => p.email)
      .map((p: any) => ({
        email: p.email,
        firstName: p.name?.split(" ")[0] || "",
        lastName: p.name?.split(" ").slice(1).join(" ") || "",
        source: "patient",
      }));
    const res = await fetch("/api/admin/email-contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, contacts: cd }),
    });
    if (res.ok) {
      const d2 = await res.json();
      toast({ title: `Synced ${d2.created} new patients as contacts` });
      onRefresh(search);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search contacts..."
            value={search}
            onChange={e => { setSearch(e.target.value); onRefresh(e.target.value); }}
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => onRefresh(search)}><RefreshCw className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={syncPatients}><Users className="h-4 w-4 mr-1.5" />Sync Patients</Button>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1.5" />Add Contact</Button>
      </div>

      {/* Add single contact */}
      {showAdd && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Add Single Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Email *" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
              <Input placeholder="First name" value={newContact.firstName} onChange={e => setNewContact({ ...newContact, firstName: e.target.value })} />
              <Input placeholder="Last name" value={newContact.lastName} onChange={e => setNewContact({ ...newContact, lastName: e.target.value })} />
              <Input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addContact}><Check className="h-4 w-4 mr-1" />Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV import */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" />Bulk Import (CSV)</CardTitle>
          <CardDescription className="text-xs">Format: email, first name, last name — one per line. Header row is ignored automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" />Upload CSV File
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={csvGroupId}
              onChange={e => setCsvGroupId(e.target.value)}
            >
              <option value="">No group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <Textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={"john@example.com, John, Smith\njane@example.com, Jane, Doe"}
            rows={4}
            className="font-mono text-xs"
          />
          <Button size="sm" onClick={importCSV} disabled={!csvText.trim() || csvImporting}>
            {csvImporting
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Importing...</>
              : <><Upload className="h-4 w-4 mr-1.5" />Import Contacts</>}
          </Button>
        </CardContent>
      </Card>

      {/* Contacts table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 border-b text-xs text-muted-foreground">
            Showing {contacts.length} of {total} contacts
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Source</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-xs">{c.email}</td>
                  <td className="px-4 py-2.5 text-xs">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{c.source || "manual"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.subscribed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {c.subscribed ? "Subscribed" : "Unsubscribed"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteContact(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No contacts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
