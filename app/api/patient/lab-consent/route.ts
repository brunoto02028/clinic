export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { relacaoPorExtenso } from "@/lib/managed-patients";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { LAB_TESTS_CONSENT_VERSION, labConsentFor, hasLabConsent } from "@/lib/lab-consent";

/**
 * O paciente dizendo, uma vez, que leu o que um exame pelo app implica
 * (081 T-4). Gata o primeiro pedido; a rota do pedido recusa sem isto.
 *
 * `getEffectiveUser` aceita o bearer do app e a sessão da web, como as outras
 * rotas de consentimento.
 *
 * ## Consentir por quem você cuida (091 T-4)
 *
 * `?for=<id>` pede o texto na voz de responsável, com o nome da pessoa. O
 * consentimento é então **registrado no nome dela** — é o exame dela que está
 * sendo feito —, e quem consentiu fica no `metadata`. Sem as duas metades,
 * "houve consentimento?" não tem resposta completa.
 *
 * O id é sempre conferido contra `managedById` de quem pediu: consentir pela
 * criança de outra pessoa não é uma operação que exista.
 */
async function sujeito(req: NextRequest, guardianId: string) {
  const id = req.nextUrl.searchParams.get("for") || null;
  if (!id) return { id: guardianId, nome: null as string | null, proprio: true };

  const pessoa = await prisma.user.findFirst({
    where: { id, managedById: guardianId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      // O parentesco entra no texto do consentimento e no registro do aceite
      // (095 T-3): é ele que responde, depois, quem autorizou o atendimento.
      managedRelationship: true,
      managedRelationshipOther: true,
    },
  });
  if (!pessoa) return null;
  return {
    id: pessoa.id,
    nome: pessoa.firstName,
    proprio: false,
    relacao: pessoa.managedRelationship,
    relacaoOutro: pessoa.managedRelationshipOther,
  };
}

export async function GET(req: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alvo = await sujeito(req, user.userId);
  if (!alvo) return NextResponse.json({ error: "Not found", errorPt: "Não encontrado" }, { status: 404 });

  const locale = req.nextUrl.searchParams.get("locale");
  const { accepted, acceptedAt } = await hasLabConsent(alvo.id);
  return NextResponse.json({
    accepted,
    acceptedAt,
    version: LAB_TESTS_CONSENT_VERSION,
    // A voz sai de `proprio`, que a rota já sabe — não da presença do nome.
    text: labConsentFor(
      locale,
      alvo.nome,
      !alvo.proprio,
      relacaoPorExtenso(
        (alvo as any).relacao,
        (alvo as any).relacaoOutro,
        locale === "pt-BR" ? "pt" : "en"
      )
    ),
    forName: alvo.nome,
  });
}

export async function POST(req: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isImpersonating) {
    // É a declaração do paciente, não da clínica: um terapeuta olhando a tela
    // dele não pode aceitar por ele.
    return NextResponse.json({ error: "Read-only while viewing as someone else", errorPt: "Somente leitura durante a visualização" }, { status: 403 });
  }

  const alvo = await sujeito(req, user.userId);
  if (!alvo) return NextResponse.json({ error: "Not found", errorPt: "Não encontrado" }, { status: 404 });

  const log = await prisma.consentLog.create({
    data: {
      // No nome do sujeito: é o exame dele que vai acontecer.
      patientId: alvo.id,
      action: "LAB_TESTS_CONSENT_ACCEPTED",
      termsVersion: LAB_TESTS_CONSENT_VERSION,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: req.headers.get("user-agent") || null,
      // Quem consentiu é a outra metade da pergunta. Consentimento de
      // responsável é registro, não caixinha marcada.
      metadata: alvo.proprio
        ? { where: "labs" }
        : {
            where: "labs",
            consentedById: user.userId,
            onBehalf: true,
            // **Em que qualidade.** É a pergunta que fica quando alguém volta
            // a este registro meses depois.
            relationship: (alvo as any).relacao ?? null,
            relationshipOther: (alvo as any).relacaoOutro ?? null,
          },
    },
    select: { createdAt: true },
  });

  return NextResponse.json({ accepted: true, acceptedAt: log.createdAt, version: LAB_TESTS_CONSENT_VERSION });
}
