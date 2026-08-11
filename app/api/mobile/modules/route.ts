export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";

export function OPTIONS() {
  return corsPreflight();
}

const MODULE_DEFS = [
  { key: "lab", name: "Laboratory", icon: "flask-outline", description: "Lab tests & results" },
  { key: "clinica", name: "Clinic", icon: "medkit-outline", description: "Sessions & rehab" },
  { key: "ba", name: "BA", icon: "briefcase-outline", description: "Business & community" },
] as const;

// Maps our mobile module keys to the ClinicModule enum values that gate them.
const MODULE_KEY_MAP: Record<string, string[]> = {
  lab: ["DIAGNOSTICS"],
  clinica: ["APPOINTMENTS", "CLINICAL_NOTES"],
  ba: ["ORDERS", "SOCIAL_MEDIA"],
};

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return corsJson({ error: "Invalid token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, moduleOverrides: true, fullAccessOverride: true, clinicId: true },
    });

    if (!user) {
      return corsJson({ error: "User not found" }, { status: 404 });
    }

    // Admins and full-access users see everything
    if (user.fullAccessOverride || user.role === "SUPERADMIN" || user.role === "ADMIN") {
      return corsJson(MODULE_DEFS);
    }

    const overrides = (user.moduleOverrides as Record<string, boolean> | null) || {};

    // Check clinic-level module access
    let clinicModules: string[] = [];
    if (user.clinicId) {
      const access = await prisma.clinicModuleAccess.findMany({
        where: { clinicId: user.clinicId, isEnabled: true },
        select: { module: true },
      });
      clinicModules = access.map((a) => a.module);
    }

    const available = MODULE_DEFS.filter((mod) => {
      const overrideKey = `mod_${mod.key}`;
      if (overrideKey in overrides) return overrides[overrideKey];
      const requiredModules = MODULE_KEY_MAP[mod.key] || [];
      if (requiredModules.length === 0) return true;
      return requiredModules.some((m) => clinicModules.includes(m));
    });

    // If no modules found via permissions, show all (graceful fallback for new users)
    if (available.length === 0) {
      return corsJson(MODULE_DEFS);
    }

    return corsJson(available);
  } catch (error: any) {
    console.error("[mobile/modules] error:", error?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
