import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { conteudoDaClinica } from "@/lib/clinic-contents";

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

/**
 * O que existe dentro da clínica, para decidir antes de apagar.
 *
 * `User.clinicId` cascateia, e outras noventa e cinco tabelas também: apagar
 * uma clínica apaga todo paciente dela e todo prontuário, sem aviso e sem
 * volta. Esta resposta é o que a tela mostra antes de perguntar "tem certeza".
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const conteudo = await conteudoDaClinica(params.id);
    if (!conteudo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(conteudo);
}

/**
 * Apagar uma clínica.
 *
 * **Isto era um `prisma.clinic.delete` sem nenhuma verificação**, e o item de
 * menu que deveria chamá-lo não tinha `onClick`. Foi só por isso que nada se
 * perdeu até hoje: o gatilho nunca esteve ligado.
 *
 * Duas travas, e nenhuma delas impede o Bruno de apagar o que ele quer apagar:
 *
 * 1. **O nome tem de ser digitado.** Numa lista de clínicas, a linha errada
 *    fica a um pixel da certa, e o que se perde não volta.
 * 2. **Uma clínica com gente dentro precisa de `force`.** Não é proibição — é
 *    a diferença entre "apaguei um cadastro de teste" e "apaguei quarenta
 *    pacientes achando que era teste".
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conteudo = await conteudoDaClinica(params.id);
    if (!conteudo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const confirmacao = request.nextUrl.searchParams.get("confirm");
    if (confirmacao !== conteudo.name) {
        return NextResponse.json(
            { error: "Type the clinic's exact name to confirm", expected: conteudo.name },
            { status: 400 }
        );
    }

    const forcar = request.nextUrl.searchParams.get("force") === "1";
    if (conteudo.total > 0 && !forcar) {
        return NextResponse.json(
            {
                error: "This clinic still holds records. Deleting it deletes all of them.",
                conteudo,
            },
            { status: 409 }
        );
    }

    try {
        await prisma.clinic.delete({ where: { id: params.id } });
        // Quem apagou, o quê e quanto levou junto — a única coisa que sobra
        // depois de uma exclusão em cascata.
        console.warn(
            `[clinic-delete] ${(session.user as any).email} apagou "${conteudo.name}" (${conteudo.slug}) — ` +
            `${conteudo.pacientes} pacientes, ${conteudo.equipe} da equipe, ${conteudo.consultas} consultas`
        );
        return NextResponse.json({ success: true, apagado: conteudo });
    } catch (error) {
        console.error("[clinic-delete] falhou:", error);
        return NextResponse.json({ error: "Failed to delete clinic" }, { status: 500 });
    }
}
