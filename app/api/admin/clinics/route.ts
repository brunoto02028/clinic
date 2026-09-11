import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const clinics = await prisma.clinic.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(clinics);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch clinics" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, slug, email, phone, address, city, postcode } = body;
        // Tenant type: only the two enum values; anything else falls back to CLINIC.
        const type = body.type === "PERSONAL_TRAINER" ? "PERSONAL_TRAINER" : "CLINIC";

        if (!name || !slug) {
            return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
        }

        // Slug is unique — a collision is a clear 409, not a raw 500.
        const existing = await prisma.clinic.findUnique({ where: { slug }, select: { id: true } });
        if (existing) {
            return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
        }

        const clinic = await prisma.clinic.create({
            data: {
                name,
                slug,
                type,
                email,
                phone,
                address,
                city,
                postcode,
                isActive: true,
            }
        });

        return NextResponse.json(clinic);
    } catch (error) {
        console.error("Error creating clinic:", error);
        return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
    }
}

// DELETE, PATCH etc would go here as well, usually under [id]/route.ts
