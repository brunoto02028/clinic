export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { getActor } from "@/lib/tenant-access";
import { findTherapist } from "@/lib/appointment-access";
import {
  disponibilidadeDoDia,
  disponibilidadeDoIntervalo,
  diasEntre,
  MAX_DIAS_NO_INTERVALO,
} from "@/lib/availability-day";

/**
 * Horários livres — de um dia, ou de um intervalo.
 *
 * `?date=YYYY-MM-DD` responde como sempre respondeu, campo a campo: é o que a
 * tela de horários consome, e mudar a forma dela quebraria quem já está no
 * aparelho de alguém.
 *
 * `?from=&to=` responde **quantos** horários cada dia tem, sem os horários em
 * si. É o que o calendário precisa para pintar a semana ou o mês antes de a
 * pessoa tocar em qualquer dia, e um mês com todos os horários de todos os
 * dias é uma resposta enorme para desenhar trinta e uma bolinhas (087, T-2).
 *
 * A regra de um dia não mora mais aqui — ela é uma função, e as duas formas
 * chamam a mesma. Duplicada, a segunda cópia seria a que ninguém lembra de
 * corrigir.
 */
export async function GET(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const dateStr = request.nextUrl.searchParams.get("date");
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const therapistId = request.nextUrl.searchParams.get("therapistId");
    const duration = parseInt(request.nextUrl.searchParams.get("duration") || "60", 10);
    const kind = request.nextUrl.searchParams.get("kind");

    if (!dateStr && !(from && to)) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Quem atende — se ninguém for pedido, quem vê pacientes.
    // O papel não é o teste: o dono da clínica e o desenvolvedor têm ambos
    // SUPERADMIN, e este `findFirst` não tinha ordenação, então podia devolver
    // o desenvolvedor — que não tem disponibilidade nenhuma configurada,
    // deixando o paciente diante de um calendário sem horário.
    // Só o tenant de quem chama: um terapeuta de outro tenant responde como um
    // que não existe.
    const actor = await getActor(request);
    const therapist = actor?.clinicId
      ? await findTherapist(actor.clinicId, therapistId, actor.role === "PATIENT")
      : null;
    if (!therapist) {
      return NextResponse.json(
        { error: "No therapist available" },
        { status: therapistId ? 404 : 400 }
      );
    }
    const clinicId = actor!.clinicId!;

    if (dateStr) {
      const dia = await disponibilidadeDoDia(clinicId, therapist.id, dateStr, { kind, duration });
      return NextResponse.json(dia);
    }

    const dias = diasEntre(from!, to!);
    if (!dias) {
      // Um só erro para as três formas de pedir errado — data torta, intervalo
      // invertido, intervalo longo demais —, porque a tela faz a mesma coisa
      // com os três: mostra que o pedido não serve.
      return NextResponse.json(
        {
          error: `Invalid range: dates must be YYYY-MM-DD, "from" must not be after "to", and the range must not exceed ${MAX_DIAS_NO_INTERVALO} days`,
        },
        { status: 400 }
      );
    }

    const resposta = await disponibilidadeDoIntervalo(clinicId, therapist.id, dias, {
      kind,
      duration,
    });
    return NextResponse.json({ dias: resposta, therapistId: therapist.id });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
