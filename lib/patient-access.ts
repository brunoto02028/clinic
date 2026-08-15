import { ALWAYS_VISIBLE_MODULES, MODULE_REGISTRY, PERMISSION_REGISTRY } from "@/lib/module-registry";

/**
 * One answer to "what does this patient have access to?".
 *
 * There were two implementations of this question — one in
 * /api/patient/access, one in the admin permissions screen — and they
 * disagreed in ways nobody could see until a patient was told something was
 * unlocked and then found it missing:
 *
 *   - the admin read overrides as `if (val)`, so the strings "hidden" and
 *     "locked" were truthy and *granted* the module the portal was removing
 *   - fullAccessOverride was applied in the portal and ignored in the admin
 *   - a free plan granted everything in the portal, nothing in the admin
 *
 * Both now call this. The reasons map exists so the admin screen can show
 * *why* something is granted, which is what makes a future divergence
 * visible rather than silent.
 */

/** How a module or permission came to be granted. */
export type GrantReason =
  | "always" // always-visible module
  | "plan" // feature of an active subscription
  | "treatment" // active, paid treatment package
  | "free" // active subscription on a free plan
  | "fullAccess" // per-patient full access override
  | "staff" // the viewer is not a patient
  | "override"; // per-patient admin override

export interface PatientAccessInput {
  role?: string | null;
  fullAccessOverride?: boolean | null;
  moduleOverrides?: Record<string, boolean | string> | null;
  consentAcceptedAt?: Date | string | null;
  medicalScreening?: { isSubmitted?: boolean | null } | null;
  patientSubscriptions?: Array<{ plan?: { isFree?: boolean | null; features?: string[] | null } | null }> | null;
  packagesAsPatient?: Array<unknown> | null;
}

export interface PatientAccessResult {
  modules: string[];
  hiddenModules: string[];
  permissions: string[];
  /** moduleKey | permissionKey -> why it is granted. */
  reasons: Record<string, GrantReason>;
  fullAccessOverride: boolean;
  isFree: boolean;
  hasActiveSubscription: boolean;
  hasActiveTreatment: boolean;
  onboarding: { screeningComplete: boolean; consentAccepted: boolean };
}

const STAFF_ROLES = ["ADMIN", "THERAPIST", "SUPERADMIN"];

/** A paid treatment package carries the clinical side of the portal with it. */
const TREATMENT_MODULES = [
  "mod_treatment",
  "mod_appointments",
  "mod_records",
  "mod_clinical_notes",
  "mod_documents",
  "mod_screening",
  "mod_exercises",
];
const TREATMENT_PERMISSIONS = [
  "perm_book_in_person",
  "perm_book_online",
  "perm_view_exercise_videos",
  "perm_request_cancellation",
  "perm_progress_tracking",
  "perm_download_reports",
];

function everything(reason: GrantReason, base: Partial<PatientAccessResult>): PatientAccessResult {
  const reasons: Record<string, GrantReason> = {};
  for (const m of MODULE_REGISTRY) reasons[m.key] = reason;
  for (const p of PERMISSION_REGISTRY) reasons[p.key] = reason;
  return {
    modules: MODULE_REGISTRY.map((m) => m.key),
    hiddenModules: [],
    permissions: PERMISSION_REGISTRY.map((p) => p.key),
    reasons,
    fullAccessOverride: false,
    isFree: false,
    hasActiveSubscription: true,
    hasActiveTreatment: true,
    onboarding: { screeningComplete: true, consentAccepted: true },
    ...base,
  };
}

export function computePatientAccess(patient: PatientAccessInput): PatientAccessResult {
  const screeningComplete = patient.medicalScreening?.isSubmitted === true;
  const consentAccepted = !!patient.consentAcceptedAt;
  const onboarding = { screeningComplete, consentAccepted };

  // Staff see the whole portal; onboarding does not apply to them.
  if (patient.role && STAFF_ROLES.includes(patient.role)) {
    return everything("staff", {});
  }

  const subscriptions = patient.patientSubscriptions || [];
  const hasActiveTreatment = (patient.packagesAsPatient || []).length > 0;
  const hasActiveSubscription = subscriptions.length > 0;

  if (patient.fullAccessOverride) {
    return everything("fullAccess", {
      fullAccessOverride: true,
      hasActiveSubscription: true,
      hasActiveTreatment: true,
      onboarding,
    });
  }

  if (subscriptions.some((s) => s.plan?.isFree === true)) {
    return everything("free", {
      isFree: true,
      hasActiveSubscription: true,
      hasActiveTreatment: true,
      onboarding,
    });
  }

  const modules = new Set<string>();
  const permissions = new Set<string>();
  const reasons: Record<string, GrantReason> = {};

  const grantModule = (key: string, reason: GrantReason) => {
    modules.add(key);
    // First reason wins: "always" is a stronger explanation than "plan" for a
    // module the patient would have had regardless.
    if (!reasons[key]) reasons[key] = reason;
  };
  const grantPermission = (key: string, reason: GrantReason) => {
    permissions.add(key);
    if (!reasons[key]) reasons[key] = reason;
  };

  for (const mod of ALWAYS_VISIBLE_MODULES) grantModule(mod.key, "always");

  for (const sub of subscriptions) {
    for (const featureKey of sub.plan?.features || []) {
      if (featureKey.startsWith("mod_")) grantModule(featureKey, "plan");
      else if (featureKey.startsWith("perm_")) grantPermission(featureKey, "plan");
    }
  }

  if (hasActiveTreatment) {
    for (const m of TREATMENT_MODULES) grantModule(m, "treatment");
    for (const p of TREATMENT_PERMISSIONS) grantPermission(p, "treatment");
  }

  // Per-patient overrides, last word. "hidden" and "locked" are strings, and
  // a truthy check on them is what made the two screens disagree.
  const overrides = (patient.moduleOverrides || {}) as Record<string, boolean | string>;
  const hiddenModules = new Set<string>();
  for (const [key, val] of Object.entries(overrides)) {
    if (key.startsWith("mod_")) {
      if (val === "hidden") {
        modules.delete(key);
        delete reasons[key];
        hiddenModules.add(key);
      } else if (val === true || val === "unlocked") {
        modules.add(key);
        reasons[key] = "override";
      } else if (val === false || val === "locked") {
        modules.delete(key);
        delete reasons[key];
      }
    } else if (key.startsWith("perm_")) {
      if (val === true || val === "unlocked") {
        permissions.add(key);
        reasons[key] = "override";
      } else if (val === false || val === "locked") {
        permissions.delete(key);
        delete reasons[key];
      }
    }
  }

  return {
    modules: Array.from(modules),
    hiddenModules: Array.from(hiddenModules),
    permissions: Array.from(permissions),
    reasons,
    fullAccessOverride: false,
    isFree: false,
    hasActiveSubscription,
    hasActiveTreatment,
    onboarding,
  };
}

/** The relations computePatientAccess needs, for callers building a query. */
export const PATIENT_ACCESS_SELECT = {
  id: true,
  role: true,
  consentAcceptedAt: true,
  moduleOverrides: true,
  fullAccessOverride: true,
  medicalScreening: { select: { isSubmitted: true } },
  patientSubscriptions: {
    where: { status: "ACTIVE" as const },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          features: true,
          modulePermissions: true,
          price: true,
          interval: true,
          isFree: true,
        },
      },
    },
  },
  packagesAsPatient: {
    where: { isPaid: true, status: { in: ["PAID", "ACTIVE"] } },
    select: { id: true, status: true, protocol: { select: { id: true, status: true } } },
  },
} as const;
