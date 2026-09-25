import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";

export const dynamic = "force-dynamic";

/**
 * A série de dor, sono e humor do paciente ao longo do tempo.
 *
 * O paciente respondia "como você está hoje?" todo dia e aquilo ia parar num
 * feed de atividade, misturado com upload de documento e mensagem — não havia
 * como ver se a dor está cedendo. O terapeuta ficava sem a única coisa que o
 * check-in diária existe para dar: a **tendência**.
 *
 * **É o gráfico do paciente, não o gráfico do check-in.** A origem de cada
 * ponto é um detalhe: hoje tudo vem preenchido à mão, e quando o relógio e o
 * aparelho de pressão entrarem, eles somam pontos na mesma série, com o
 * histórico manual atrás. Por isso `source` viaja em cada ponto desde já —
 * duas telas contando metades da mesma história seria o desfecho da outra
 * escolha.
 *
 * Escalas, como estão no banco: dor 0–10, humor 1–5, e energia, sono e
 * estresse 1–10. **Não são normalizadas aqui.** Espremer humor de 1–5 para
 * 0–10 inventaria precisão que a pergunta não tem; quem desenha decide como
 * mostrar.
 */

const DIAS_PADRAO = 60;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // A mesma porta das outras abas do prontuário: a clínica do ator tem de
  // bater com a do paciente, ou isto responde 404.
  const acesso = await staffPatientAccess(req, params.id);
  if (acesso.response) return acesso.response;

  const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days")) || DIAS_PADRAO, 7), 365);
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const desdeStr = desde.toISOString().slice(0, 10);

  const linhas = await (prisma as any).dailyCheckIn.findMany({
    where: { patientId: params.id, checkinDate: { gte: desdeStr } },
    orderBy: { checkinDate: "asc" },
    select: {
      checkinDate: true,
      painLevel: true,
      moodLevel: true,
      energyLevel: true,
      sleepQuality: true,
      stressLevel: true,
      exercisesDone: true,
      notes: true,
    },
  });

  const points = linhas.map((l: any) => ({
    date: l.checkinDate,
    pain: l.painLevel,
    mood: l.moodLevel,
    energy: l.energyLevel,
    sleep: l.sleepQuality,
    stress: l.stressLevel,
    exercisesDone: l.exercisesDone,
    // O paciente escreveu isto. Não entra em gráfico, mas é o que explica um
    // pico — e é o que o terapeuta quer ler quando vê um.
    notes: l.notes,
    source: "self" as const,
  }));

  return NextResponse.json({ days: dias, points });
}
