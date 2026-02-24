import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

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

        const clinic = await prisma.clinic.create({
            data: {
                name,
                slug,
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
