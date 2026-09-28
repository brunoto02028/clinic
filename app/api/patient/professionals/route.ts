import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { patientBookingPrice } from "@/lib/service-price";
import { podeAparecerNoApp, tipoDoInquilino } from "@/lib/tenant-type";
import { findTherapist } from "@/lib/appointment-access";

export const dynamic = "force-dynamic";

/**
 * O catálogo: com quem este paciente pode marcar (102 T-5).
 *
 * O Bruno: *"o paciente pode querer agendar uma consulta com a reabilitação
 * mas ele pode escolher todos os profissionais disponíveis ali"*.
 *
 * ## O que decide quem aparece
 *
 * `podeAparecerNoApp`, e nada além: profissional intermediado pela BPR, **ligado
 * por alguém** (`visibleInApp`, que nasce falso), e com registro do conselho.
 * *"A gente que dá essas permissões."*
 *
 * A clínica de reabilitação **não** entra: ela é a casa, e aparecer no catálogo
 * de profissionais seria a BPR se intermediando a si mesma.
 *
 * ## Por que o preço vem daqui
 *
 * Quem escolhe precisa comparar antes de tocar em qualquer agenda. O valor é o
 * do inquilino do profissional (`patientBookingPrice`), e é o servidor que o
 * diz — a tela nunca calcula preço.
 */
export async function GET(req: NextRequest) {
  const gate = await patientGate({ module: "mod_appointments" });
  if (gate.response) return gate.response;

  const idioma = req.nextUrl.searchParams.get("language");

  /**
   * O filtro grosso no banco, o fino em memória.
   *
   * `visibleInApp` e o tipo cortam a maior parte; `podeAparecerNoApp` é quem
   * decide de verdade, porque ele também exige o registro — e a regra tem de
   * morar num lugar só, não metade numa cláusula de `where`.
   */
  const clinicas = await prisma.clinic.findMany({
    where: { isActive: true, visibleInApp: true },
    select: {
      id: true,
      name: true,
      type: true,
      professionalRegistry: true,
      registryKind: true,
      languages: true,
      currency: true,
      timezone: true,
      logoUrl: true,
    },
    orderBy: { name: "asc" },
  });

  const visiveis = clinicas.filter((c) => podeAparecerNoApp(c));

  const comIdioma = idioma
    ? visiveis.filter((c) =>
        // *"Brasileiros que vivem no exterior e querem profissionais
        // brasileiros"* — o idioma é a razão de a pessoa escolher, não enfeite.
        (c.languages ?? []).some((l) => l.toLowerCase().startsWith(idioma.toLowerCase()))
      )
    : visiveis;

  const profissionais = await Promise.all(
    comIdioma.map(async (c) => {
      const tipo = tipoDoInquilino(c.type);
      /**
       * Quem **atende** naquela prática.
       *
       * O catálogo lista a prática; a agenda e a consulta são de uma pessoa, e
       * `resolverProfissional` (T-4) trabalha com o id dela. Sem ninguém que
       * atenda, o cartão seria um beco — ver o filtro logo abaixo.
       */
      const quemAtende = await findTherapist(c.id, null, true);
      return {
        id: c.id,
        professionalUserId: quemAtende?.id ?? null,
        name: c.name,
        kind: tipo.label,
        kindPt: tipo.labelPt,
        registry: c.professionalRegistry,
        registryKind: c.registryKind,
        languages: c.languages ?? [],
        currency: c.currency,
        timezone: c.timezone,
        logoUrl: c.logoUrl,
        price: await patientBookingPrice(c.id),
        /**
         * Médico e psicólogo podem atender só por vídeo; a reabilitação não —
         * e ela nem chega aqui. O tipo decide o que a tela pode oferecer.
         */
        videoOnly: tipo.soVideoPossivel,
      };
    })
  );

  /**
   * Prática sem quem atender **não aparece**.
   *
   * Um cartão que abre uma agenda vazia e nunca vai ter horário é a falha de
   * "existe e não leva a lugar nenhum" com outro nome — a mesma que a varredura
   * da 100 T-4 nasceu para pegar.
   */
  return NextResponse.json({
    professionals: profissionais.filter((p) => p.professionalUserId),
  });
}
