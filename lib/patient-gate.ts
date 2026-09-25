import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { computePatientAccess, PATIENT_ACCESS_SELECT } from "@/lib/patient-access";
import { getModuleByKey } from "@/lib/module-registry";

/**
 * The two things the patient area promises, enforced where they hold.
 *
 * The web blocks the whole dashboard until the patient accepts the terms, and
 * hides a screen whose module the clinic revoked. The app shows the same
 * locks. Neither was true on the server: the parity audit of 24/09/2026 found
 * a patient with `consentAcceptedAt = null` reading their documents, tasks,
 * messages, blood pressure and appointments through the app, and a revoked
 * module still being served by 33 of the 35 patient routes. The UI was the
 * only thing standing there, and the UI is not a boundary.
 *
 * Fails closed on purpose: no patient record, no consent, module missing —
 * all refused. The two refusals carry a `code`, because a screen needs to tell
 * "you have to accept the terms" apart from "this is not in your plan".
 *
 * One exception, deliberate: routes the patient must reach *in order to*
 * consent, or to see who they are and what they pay for. Blocking those would
 * lock the door from the inside. They pass `skipConsent`, and the set is close
 * to `consentBypass` in `components/dashboard/module-gate.tsx` — close, not
 * identical, because that list is of pages and this is of the routes those
 * pages call. Two that looked like they belonged were taken out in the code
 * review: giving consent to wearable monitoring and to the use of one's image
 * are consents of their own, and collecting either before the Terms are
 * accepted is the thing the wall exists to stop.
 */

export interface PatientGateResult {
  userId: string;
  clinicId: string | null;
  isImpersonating: boolean;
  /** The effective role — PATIENT while an admin is impersonating one. */
  role: string;
  /**
   * The row this gate already loaded, with `PATIENT_ACCESS_SELECT` plus the
   * clinic and the consent date. Handed back so a route that needs the same
   * thing — `/api/patient/access` is the obvious one, and it is the most
   * called route in the portal — does not pay for it twice.
   */
  patient: any;
}

export interface PatientGateOptions {
  /** The `mod_*` this route serves. Omit when the route has no module. */
  module?: string;
  /** For routes needed before consent exists (account, consent, plans). */
  skipConsent?: boolean;
}

type Guarded =
  | { gate: PatientGateResult; response?: never }
  | { gate?: never; response: NextResponse };

export async function patientGate(options: PatientGateOptions = {}): Promise<Guarded> {
  const effective = await getEffectiveUser();
  if (!effective) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const patient = await (prisma as any).user.findUnique({
    where: { id: effective.userId },
    select: { ...PATIENT_ACCESS_SELECT, clinicId: true, consentAcceptedAt: true },
  });
  if (!patient) {
    return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const base = {
    userId: effective.userId,
    clinicId: patient.clinicId ?? null,
    isImpersonating: !!effective.isImpersonating,
    role: effective.role,
    patient,
  };

  // Consent and plan are things a patient has. Staff calling a route that
  // both sides share (medical screening, for one) has neither, and refusing
  // them here would break the admin over a rule that was never about them —
  // their own authorisation is the route's, and it already ran.
  if (patient.role !== "PATIENT") {
    return { gate: base };
  }

  if (!options.skipConsent && !patient.consentAcceptedAt) {
    return {
      response: NextResponse.json(
        {
          error: "You must accept the Terms of Use and Privacy Policy before using this.",
          errorPt: "É preciso aceitar os Termos de Uso e a Política de Privacidade antes de usar isto.",
          code: "consent_required",
        },
        { status: 403 }
      ),
    };
  }

  if (options.module) {
    const access = computePatientAccess(patient);
    if (!access.modules.includes(options.module)) {
      const mod = getModuleByKey(options.module);
      return {
        response: NextResponse.json(
          {
            error: `${mod?.label || "This module"} is not included in your plan`,
            errorPt: `${mod?.labelPt || "Este recurso"} não está incluído no seu plano`,
            code: "module_not_in_plan",
          },
          { status: 403 }
        ),
      };
    }
  }

  return { gate: base };
}

