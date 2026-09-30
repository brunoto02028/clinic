export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { computePatientAccess } from "@/lib/patient-access";
import { patientGate } from "@/lib/patient-gate";
import { GRUPOS_NO_APP, MODULE_REGISTRY, grupoNoApp } from "@/lib/module-registry";

/**
 * Os grupos do menu, **montados uma vez** (112 T-1).
 *
 * Vão na mesma resposta que já traz os módulos, e não num segundo pedido: um
 * pedido que pode falhar sozinho deixaria o menu sem grupos justamente quando a
 * rede está ruim — e aí a tela fica pior do que era antes de agrupar.
 *
 * Montado no servidor, e não no app, porque a taxonomia vive no catálogo:
 * mandar o catálogo para o telefone seria uma segunda cópia para divergir.
 *
 * E **fora da função**, porque não depende do paciente nem de nada em tempo de
 * execução — refazer esta lista a cada abertura do app é trabalho que não muda
 * de resposta. O app abre esta rota sempre que volta ao primeiro plano.
 */
const GRUPOS_DO_MENU = GRUPOS_NO_APP.map((g) => ({
  key: g.key,
  en: g.en,
  pt: g.pt,
  modulos: MODULE_REGISTRY.filter((m) => grupoNoApp(m.key) === g.key).map((m) => m.key),
}));

/**
 * GET /api/patient/access
 *
 * What this patient can open. The rules themselves live in lib/patient-access
 * so that the admin permissions screen answers with the same voice — the two
 * used to compute it separately and disagreed about the strings "hidden" and
 * "locked", about full access, and about free plans.
 */
export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  try {
    // The gate above already resolved the session and loaded this exact row.
    // This is the most called route in the portal — every ModuleGate and the
    // sidebar ask it, with no store — so asking Prisma the same question twice
    // doubled the cost of the page that runs on every navigation.
    const { userId, role: userRole, patient } = __gate.gate;

    const access = computePatientAccess({ ...patient, role: userRole });

    const activePlans = (patient.patientSubscriptions || [])
      .map((s: any) => s.plan)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        interval: p.interval,
        isFree: p.isFree,
      }));

    return NextResponse.json({
      modules: access.modules,
      grupos: GRUPOS_DO_MENU,
      hiddenModules: access.hiddenModules,
      permissions: access.permissions,
      role: userRole,
      fullAccessOverride: access.fullAccessOverride,
      isFree: access.isFree,
      hasActiveSubscription: access.hasActiveSubscription,
      hasActiveTreatment: access.hasActiveTreatment,
      activePlans,
      onboarding: access.onboarding,
    });
  } catch (error: any) {
    console.error("[patient/access] Error:", error);
    return NextResponse.json({ error: "Failed to check access" }, { status: 500 });
  }
}
