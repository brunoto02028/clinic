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
import { toast } from "sonner";

interface Clinic {
    id: string;
    name: string;
    slug: string;
    email: string;
    isActive: boolean;
    city: string;
    createdAt: string;
    _count: {
        users: number;
        patients: number;
    };
}

export default function ClinicsPage() {
    const { locale } = useLocale();
    const T = (key: string) => i18nT(key, locale);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

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
            toast.error("Failed to load clinics");
        } finally {
            setLoading(false);
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
                toast.success("Context switched successfully");
                window.location.href = "/admin"; // Go to dashboard with new context
            }
        } catch (error) {
            toast.error("Failed to switch context");
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
                <Button className="md:w-auto w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Clinic
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
                                                        <p className="font-bold text-sm">{clinic.name}</p>
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
                                                        <DropdownMenuItem>
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
        </div>
    );
}
