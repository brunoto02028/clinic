import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";

export const dynamic = "force-dynamic";

// GET — every non-empty ProtocolItem.patientNotes across ALL of this
// patient's protocols (activity 071), regardless of status. Deliberately not
// scoped to SENT_TO_PATIENT: a protocol gets archived (superseded by a new
// one, see app/api/admin/protocols/[id]/assign/route.ts) as part of normal
// clinical progress, and the Bruno was explicit that notes must stay visible
// when that happens — "sempre deixar arquivado visivel para a clinic ok?
// quero acompanhar tudo que ja fizemos e o que melhoramos" (23/09/2026).
// v1 has no per-staff "seen" tracking — a note just shows up whenever it's
// there. A timestamp field could be added later without touching this
// contract's shape if staff needs "new since I last looked" — see
// specs/071-alerta-adesao-staff/t-4-observacao-visivel-staff.md.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const protocols = await (prisma as any).treatmentProtocol.findMany({
    where: { patientId: params.id },
    select: {
      status: true,
      title: true,
      items: {
        where: { patientNotes: { not: null } },
        select: { id: true, title: true, patientNotes: true, updatedAt: true },
      },
    },
  });

  const notes = protocols
    .flatMap((p: any) => p.items.map((item: any) => ({ ...item, protocolTitle: p.title, protocolStatus: p.status })))
    .filter((item: any) => item.patientNotes && item.patientNotes.trim())
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ notes });
}
