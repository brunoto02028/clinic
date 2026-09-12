"use client";

import { useState, useEffect } from "react";
import {
    Building2,
    Plus,
    Search,
    MoreVertical,
    Settings2,
    Users,
    UserPlus,
    Trash2,
    ExternalLink,
    ShieldCheck,
    AlertCircle
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
import { t as i18nT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Clinic {
    id: string;
    name: string;
    slug: string;
    type: string;
    email: string;
    isActive: boolean;
    city: string;
    createdAt: string;
    instagramImportEnabled: boolean;
    _count: {
        users: number;
        patients: number;
    };
}

export default function ClinicsPage() {
    const { locale } = useLocale();
    const { relabel } = useVocab();
    const T = (key: string) => relabel(i18nT(key, locale));
    const { toast } = useToast();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Create-tenant dialog (SUPERADMIN provisions a clinic or a personal studio).
    const emptyForm = { name: "", slug: "", type: "CLINIC", email: "", ownerFirst: "", ownerLast: "", ownerEmail: "" };
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [slugEdited, setSlugEdited] = useState(false);
    const isStudio = form.type === "PERSONAL_TRAINER";

    const slugify = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const setName = (name: string) =>
        setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : slugify(name) }));

    const handleCreate = async () => {
        if (!form.name.trim() || !form.slug.trim()) { toast({ title: "Error", description: "Name and slug are required", variant: "destructive" }); return; }
        setCreating(true);
        try {
            const res = await fetch("/api/admin/clinics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.name.trim(), slug: form.slug.trim(), type: form.type, email: form.email.trim() || undefined }),
            });
            const clinic = await res.json();
            if (!res.ok) throw new Error(clinic?.error || "Failed to create");

            // Optional owner (trainer ADMIN) — reuses the staff-user flow, which
            // hashes a temp password and emails the owner a /staff-login link.
            if (form.ownerEmail.trim()) {
                // Strong, single-use temp password (CSPRNG) — emailed to the owner,
                // changed on first login.
                const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
                const rand = new Uint8Array(14);
                crypto.getRandomValues(rand);
                const tempPassword = "St-" + Array.from(rand, (b) => alphabet[b % alphabet.length]).join("");
                const ures = await fetch("/api/admin/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        firstName: form.ownerFirst.trim(), lastName: form.ownerLast.trim(),
                        email: form.ownerEmail.trim(), password: tempPassword,
                        role: "ADMIN", targetClinicId: clinic.id,
                    }),
                });
                if (!ures.ok) {
                    const ue = await ures.json().catch(() => ({}));
                    toast({ title: "Warning", description: `${isStudio ? "Studio" : "Clinic"} created, but the owner account failed: ${ue?.error || ures.status}. Add it under Users.`, variant: "warning" });
                } else {
                    toast({ title: "Success", description: `${isStudio ? "Studio" : "Clinic"} and owner created — the owner got an email with sign-in details.`, variant: "success" });
                }
            } else {
                toast({ title: "Success", description: isStudio ? "Studio created" : "Clinic created", variant: "success" });
            }
            setCreateOpen(false); setForm(emptyForm); setSlugEdited(false); fetchClinics();
        } catch (e: any) {
            toast({ title: "Error", description: e?.message || "Failed to create", variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        fetchClinics();
    }, []);

    const fetchClinics = async () => {
        try {
            const res = await fetch("/api/admin/clinics");
            if (res.ok) {
                const data = await res.json();
                setClinics(data);
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load clinics", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const copyLink = async (path: string) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}${path}`);
            toast({ title: "Success", description: `Copied ${path}`, variant: "success" });
        } catch {
            toast({ title: "Error", description: "Couldn't copy — copy it manually: " + path, variant: "destructive" });
        }
    };

    // Per-clinic settings dialog (activity 36 — starts with just the
    // Instagram-import toggle, but is the natural home for future per-clinic
    // feature flags too, rather than each one growing its own dialog).
    const [settingsClinic, setSettingsClinic] = useState<Clinic | null>(null);
    const [settingsInstagramImport, setSettingsInstagramImport] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const openSettings = (clinic: Clinic) => {
        setSettingsClinic(clinic);
        setSettingsInstagramImport(clinic.instagramImportEnabled);
    };

    const saveSettings = async () => {
        if (!settingsClinic) return;
        setSavingSettings(true);
        try {
            const res = await fetch(`/api/admin/clinics/${settingsClinic.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ instagramImportEnabled: settingsInstagramImport }),
            });
            if (!res.ok) throw new Error("Failed to save");
            toast({ title: "Success", description: "Clinic settings saved", variant: "success" });
            setClinics((prev) => prev.map((c) => c.id === settingsClinic.id ? { ...c, instagramImportEnabled: settingsInstagramImport } : c));
            setSettingsClinic(null);
        } catch {
            toast({ title: "Error", description: "Failed to save clinic settings", variant: "destructive" });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSwitchContext = async (clinicId: string) => {
        try {
            const res = await fetch("/api/admin/switch-clinic", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clinicId }),
            });

            if (res.ok) {
                toast({ title: "Success", description: "Context switched successfully", variant: "success" });
                window.location.href = "/admin"; // Go to dashboard with new context
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to switch context", variant: "destructive" });
        }
    };

    const filteredClinics = clinics.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        {T("admin.clinicsTitle")}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage all clinics and medical centers on the platform
                    </p>
                </div>
                <Button className="md:w-auto w-full gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Clinic / Studio
                </Button>
            </div>

            <Card className="border-none shadow-md bg-card/60 backdrop-blur">
                <CardHeader className="pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, slug or city..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="py-4 px-4 font-semibold text-sm">Clinic Name</th>
                                    <th className="py-4 px-4 font-semibold text-sm">Location</th>
                                    <th className="py-4 px-4 font-semibold text-sm">Activity</th>
                                    <th className="py-4 px-4 font-semibold text-sm">Status</th>
                                    <th className="py-4 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="py-6 px-4">
                                                <div className="h-8 bg-muted rounded w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredClinics.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                            No clinics found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClinics.map((clinic) => (
                                        <tr key={clinic.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm flex items-center gap-2">
                                                            {clinic.name}
                                                            {clinic.type === "PERSONAL_TRAINER" && (
                                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-primary/10 text-primary border border-primary/20">Studio</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">/{clinic.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-muted-foreground whitespace-nowrap">
                                                {clinic.city || "Remote"}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-4 text-xs">
                                                    <div className="flex items-center gap-1.5" title="Patients">
                                                        <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                                                        <span>{clinic._count.patients}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5" title="Staff">
                                                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                                                        <span>{clinic._count.users}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${clinic.isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {clinic.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleSwitchContext(clinic.id)}>
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            Manage this Clinic
                                                        </DropdownMenuItem>
                                                        {clinic.type === "PERSONAL_TRAINER" && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => copyLink(`/studio/${clinic.slug}`)}>
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    Copy student login link
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => copyLink(`/join/${clinic.slug}`)}>
                                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                                    Copy invite link
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        <DropdownMenuItem onClick={() => openSettings(clinic)}>
                                                            <Settings2 className="mr-2 h-4 w-4" />
                                                            Clinic Settings
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Clinic
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setForm(emptyForm); setSlugEdited(false); } }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add clinic or studio</DialogTitle>
                        <DialogDescription>
                            Create a new tenant. A <strong>Personal Studio</strong> gets the trainer/student experience; a <strong>Clinic</strong> gets the clinical one.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CLINIC">Clinic</SelectItem>
                                    <SelectItem value="PERSONAL_TRAINER">Personal Studio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tname">{isStudio ? "Studio name" : "Clinic name"}</Label>
                            <Input id="tname" value={form.name} onChange={(e) => setName(e.target.value)} placeholder={isStudio ? "e.g. Peak Strength Studio" : "e.g. Riverside Physio"} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tslug">Link slug</Label>
                            <Input
                                id="tslug"
                                value={form.slug}
                                onChange={(e) => { setSlugEdited(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
                                placeholder="peak-strength"
                            />
                            <p className="text-xs text-muted-foreground">
                                {isStudio
                                    ? <>Student login: <span className="font-mono">/studio/{form.slug || "slug"}</span> · Invite: <span className="font-mono">/join/{form.slug || "slug"}</span></>
                                    : <>Sign-up: <span className="font-mono">/join/{form.slug || "slug"}</span></>}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="temail">Contact email <span className="text-muted-foreground">(optional)</span></Label>
                            <Input id="temail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="hello@example.com" />
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                            <p className="text-sm font-medium">{isStudio ? "Studio owner (trainer)" : "Owner / admin"} <span className="text-muted-foreground font-normal">— optional, gets an email to sign in</span></p>
                            <div className="grid grid-cols-2 gap-2">
                                <Input value={form.ownerFirst} onChange={(e) => setForm((f) => ({ ...f, ownerFirst: e.target.value }))} placeholder="First name" />
                                <Input value={form.ownerLast} onChange={(e) => setForm((f) => ({ ...f, ownerLast: e.target.value }))} placeholder="Last name" />
                            </div>
                            <Input type="email" value={form.ownerEmail} onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))} placeholder="owner.email@example.com" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating || !form.name.trim() || !form.slug.trim()}>
                            {creating ? "Creating…" : (isStudio ? "Create studio" : "Create clinic")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!settingsClinic} onOpenChange={(o) => { if (!o) setSettingsClinic(null); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{settingsClinic?.name} — Settings</DialogTitle>
                        <DialogDescription>Per-tenant feature flags.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                            <div className="space-y-1">
                                <Label htmlFor="ig-import-toggle">Instagram Import</Label>
                                <p className="text-xs text-muted-foreground">
                                    Lets admins download videos from any Instagram post/profile straight into the exercise library.
                                    Copyright-sensitive — only enable it for a tenant you trust to use it responsibly.
                                </p>
                            </div>
                            <Switch
                                id="ig-import-toggle"
                                checked={settingsInstagramImport}
                                onCheckedChange={setSettingsInstagramImport}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsClinic(null)} disabled={savingSettings}>Cancel</Button>
                        <Button onClick={saveSettings} disabled={savingSettings}>
                            {savingSettings ? "Saving…" : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
