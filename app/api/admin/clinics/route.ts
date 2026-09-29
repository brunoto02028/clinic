import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { registroExigido, tipoValido } from "@/lib/tenant-type";

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
                },
                subscription: {
                    select: { maxTherapists: true, maxPatients: true }
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
        const { name, slug, email, phone, address, city, postcode, professionalRegistry } = body;
        /**
         * O tipo, conferido contra o mapa (102 T-1).
         *
         * Era um ternario entre dois valores, e tudo o que nao fosse
         * `PERSONAL_TRAINER` virava clinica — inclusive `DOCTOR`, que passou a
         * existir no enum e teria sido engolido em silencio.
         */
        const type = tipoValido(body.type) ? body.type : "CLINIC";

        if (!name || !slug) {
            return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
        }

        /**
         * O registro profissional e **obrigatorio** para quem o conselho exige.
         *
         * Em consulta a distancia no Brasil, mostrar o numero de quem atende e
         * obrigacao da plataforma que o apresenta. Deixar cadastrar sem ele
         * daria um profissional que nunca pode ser mostrado — e o erro
         * apareceria semanas depois, como "por que ele nao aparece no app?".
         */
        const exige = registroExigido(type);
        if (exige && exige !== "OUTRO" && !String(professionalRegistry ?? "").trim()) {
            return NextResponse.json(
                {
                    error: `A ${exige} number is required for this kind of professional.`,
                    errorPt: `O numero do ${exige} e obrigatorio para este tipo de profissional.`,
                },
                { status: 400 }
            );
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
                professionalRegistry: String(professionalRegistry ?? "").trim() || null,
                registryKind: exige,
                /**
                 * **Nasce invisivel.** O Bruno: *"uma vez que eu cadastrei os
                 * medicos, as modalidades de cada um vai aparecer para o
                 * paciente... ou nao. A gente que da essas permissoes."*
                 *
                 * Cadastrar nao e por a venda. Quem liga e uma pessoa, depois,
                 * e o campo tem `@default(false)` no banco junto — a regra nao
                 * pode depender de esta linha existir.
                 */
                visibleInApp: false,
            }
        });

        return NextResponse.json(clinic);
    } catch (error) {
        console.error("Error creating clinic:", error);
        return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
    }
}

// DELETE, PATCH etc would go here as well, usually under [id]/route.ts
