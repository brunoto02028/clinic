"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Clinic {
    id: string;
    name: string;
    slug: string;
}

export function ClinicSelector() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClinics();
        // Fetch selected clinic from server (cookie is httpOnly)
        fetch("/api/admin/switch-clinic")
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.clinicId) setSelectedClinicId(data.clinicId);
            })
            .catch(() => {});
    }, []);

    const fetchClinics = async () => {
        try {
            // Try admin endpoint first (returns full clinic data), fallback to public
            let res = await fetch("/api/admin/clinics");
            if (!res.ok) {
                res = await fetch("/api/clinics");
            }
            if (res.ok) {
                const data = await res.json();
                // Normalize: both endpoints return id, name, slug
                setClinics(data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })));
            }
        } catch (error) {
            console.error("Failed to fetch clinics:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async (clinicId: string | null) => {
        try {
            const res = await fetch("/api/admin/switch-clinic", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clinicId }),
            });

            if (res.ok) {
                setSelectedClinicId(clinicId);
                window.location.reload(); // Reload to apply new clinic context
            }
        } catch (error) {
            console.error("Failed to switch clinic:", error);
        }
    };

    const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

    return (
        <div className="px-2 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Active Clinic
            </p>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-between bg-muted/50 border-dashed border-2 hover:bg-muted"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <Building2 className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">
                                {selectedClinic ? selectedClinic.name : "Global View"}
                            </span>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[260px]">
                    <DropdownMenuItem
                        onClick={() => handleSwitch(null)}
                        className="flex items-center justify-between"
                    >
                        <span>Global View (All Clinics)</span>
                        {!selectedClinicId && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                    <div className="h-px bg-muted my-1" />
                    {clinics.map((clinic) => (
                        <DropdownMenuItem
                            key={clinic.id}
                            onClick={() => handleSwitch(clinic.id)}
                            className="flex items-center justify-between"
                        >
                            <span className="truncate">{clinic.name}</span>
                            {selectedClinicId === clinic.id && (
                                <Check className="h-4 w-4 text-primary" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
