import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        // Plan seat limits (activity 38 T-3) live on Subscription, a separate
        // model from Clinic — pulled out here so the rest of `body` can still
        // go straight into `clinic.update` unchanged.
        const { maxTherapists, maxPatients, ...clinicFields } = body;

        // One transaction: a clinic field (e.g. instagramImportEnabled) and a
        // limit change saved together should not be able to half-apply if the
        // second write fails.
        const clinic = await prisma.$transaction(async (tx) => {
            const updated = await tx.clinic.update({
                where: { id: params.id },
                data: clinicFields,
            });

            if (maxTherapists !== undefined || maxPatients !== undefined) {
                const limits: { maxTherapists?: number; maxPatients?: number } = {};
                if (maxTherapists !== undefined) limits.maxTherapists = Math.max(0, Number(maxTherapists) || 0);
                if (maxPatients !== undefined) limits.maxPatients = Math.max(0, Number(maxPatients) || 0);

                await tx.subscription.upsert({
                    where: { clinicId: params.id },
                    update: limits,
                    create: {
                        clinicId: params.id,
                        maxTherapists: limits.maxTherapists ?? 0,
                        maxPatients: limits.maxPatients ?? 0,
                    },
                });
            }

            return updated;
        });

        return NextResponse.json(clinic);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update clinic" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.clinic.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete clinic" }, { status: 500 });
    }
}
