export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientGate } from "@/lib/patient-gate";
import { formatosPermitidos, porQueSemDomicilio } from "@/lib/appointment-format";

// GET: active treatment types for the patient's clinic (read-only, for waitlist/booking pickers)
export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate();
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const patient = await prisma.user.findUnique({
      where: { id: effectiveUser.userId },
      // O endereço entra porque ele decide se o domicílio pode ser pedido
      // (098). Sem cidade e código postal, um terapeuta não acha a porta.
      select: { clinicId: true, address: true, city: true, postcode: true },
    });

    if (!patient?.clinicId) return NextResponse.json([]);

    const treatments = await prisma.treatmentType.findMany({
      where: { clinicId: patient.clinicId, isActive: true },
      select: {
        id: true,
        name: true,
        namePt: true,
        duration: true,
        price: true,
        requiresInPerson: true,
        allowsHomeVisit: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    /**
     * Os formatos vêm prontos, calculados aqui (098 T-2).
     *
     * A tela não recebe `requiresInPerson` e `allowsHomeVisit` para decidir
     * sozinha: a regra mora em `lib/appointment-format.ts` e é a mesma que a
     * rota de agendar usa para recusar. Duas cópias dela seria a garantia de
     * que uma oferece vídeo numa eletroterapia.
     */
    return NextResponse.json(
      treatments.map(({ requiresInPerson, allowsHomeVisit, ...t }) => ({
        ...t,
        formats: formatosPermitidos({ requiresInPerson, allowsHomeVisit }, patient),
        // Por que o domicílio não está na lista: a tela precisa separar "este
        // tratamento não sai da clínica" de "falta o seu endereço" — a segunda
        // a pessoa resolve em trinta segundos.
        homeVisitBlockedBy: porQueSemDomicilio({ requiresInPerson, allowsHomeVisit }, patient),
      }))
    );
  } catch (err: any) {
    console.error("[patient-treatment-types] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
