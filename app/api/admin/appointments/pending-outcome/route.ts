import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { FOLGA_DEPOIS_MIN } from "@/lib/video-call";
import { frasesDoVeredito, resumoDaChamada } from "@/lib/chamada-aconteceu";

export const dynamic = "force-dynamic";

/**
 * O que venceu e ninguém fechou (103 T-2).
 *
 * O Bruno: *"agora só organizar quando já passou a consulta, perdeu um
 * agendamento"*.
 *
 * Os botões de concluir, cancelar e marcar falta já existiam, um a um, dentro
 * da lista inteira. O que não existia era a **pergunta**: *o que ficou em
 * aberto?* Sem ela, uma consulta de ontem fica `CONFIRMED` para sempre — no
 * painel e no app do paciente, sobre uma coisa que não aconteceu.
 *
 * ## Esta rota não decide nada
 *
 * Ela lista. Marcar falta tira a sessão do pacote do paciente, e a regra da casa
 * desde 17/09/2026 é que nada acontece com paciente automaticamente. O sistema
 * aponta; uma pessoa confirma.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  /**
   * Uma consulta vence no **fim da janela**, não no horário.
   *
   * Horário + duração + a mesma folga que a sala de vídeo usa. Antes disso ela
   * ainda pode estar acontecendo, e aparecer aqui seria pedir desfecho de algo
   * em curso.
   *
   * O corte é feito por `dateTime` com a duração máxima plausível e refinado
   * depois, em memória: a duração varia por consulta e o Prisma não compara
   * duas colunas num `where`.
   */
  const agora = Date.now();
  const cortePessimista = new Date(agora - FOLGA_DEPOIS_MIN * 60_000);

  const abertas = await prisma.appointment.findMany({
    where: {
      clinicId: actor.clinicId,
      status: { in: ["PENDING", "PENDING_PATIENT", "CONFIRMED"] },
      dateTime: { lt: cortePessimista },
    },
    // A mais antiga primeiro: quem esperou mais tempo por um desfecho é quem
    // mais precisa dele.
    orderBy: { dateTime: "asc" },
    take: 100,
    select: {
      id: true,
      dateTime: true,
      duration: true,
      mode: true,
      status: true,
      treatmentType: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      therapist: { select: { firstName: true, lastName: true } },
    },
  });

  const vencidas = abertas.filter(
    (a) => agora > +a.dateTime + (a.duration + FOLGA_DEPOIS_MIN) * 60_000
  );

  /**
   * A prova, só onde ela existe.
   *
   * Presencial e domicílio ninguém sabe pelo sistema — só quem estava lá —, e
   * inventar uma frase para eles seria pior que o silêncio. Vídeo tem o registro
   * da T-1.
   */
  const comProva = await Promise.all(
    vencidas.map(async (a) => {
      if (a.mode !== "VIDEO") {
        return { ...a, chamada: null };
      }
      const r = await resumoDaChamada(a.id);
      const frases = frasesDoVeredito(r.veredito);
      return {
        ...a,
        chamada: {
          veredito: r.veredito,
          en: frases.en,
          pt: frases.pt,
          /**
           * `true` quando marcar falta do **paciente** seria injusto: ele
           * apareceu e a clínica não. A tela usa isto para esconder o botão, e
           * não só para mudar a frase.
           */
          culpaDaClinica: frases.culpaDaClinica,
          profissionalEntrouAs: r.profissionalEntrouAs,
          pacienteEntrouAs: r.pacienteEntrouAs,
        },
      };
    })
  );

  return NextResponse.json({ appointments: comProva, count: comProva.length });
}
