export const dynamic = "force-dynamic";

/**
 * As metas diárias do paciente (118 T-7).
 *
 * *"o paciente define as metas"* — decisão do Bruno, e ela governa esta rota
 * inteira: quem escreve é o próprio, e o que não for definido **fica vazio**
 * em vez de ganhar um valor por omissão.
 *
 * Um valor por omissão aqui seria pôr na tela de alguém um alvo que ele não
 * escolheu, e depois desenhar uma barra a dizer o quanto lhe falta para o
 * atingir. É a mesma classe de coisa que a faixa de referência que saiu da tela
 * na 099 T-2.
 *
 * ## "O próprio" exclui quem está a ver o portal como ele
 *
 * O `patientGate` deixa passar quem não é paciente **de propósito**, e a
 * impersonação da web chega aqui com `role: "PATIENT"` e o `userId` do
 * paciente — a conta do admin a escrever na linha dele, com o painel depois a
 * rotular aquilo como *"Goals the patient set"*. O rótulo passaria a mentir
 * sobre quem escolheu, que é o oposto exacto da decisão. Daí o
 * `patientOnlyWriteRefusal`, o mesmo guarda que a foto de perfil usa desde o
 * QA de 24/09/2026.
 */

import { patientGate } from "@/lib/patient-gate";
import { patientOnlyWriteRefusal } from "@/lib/patient-only-write";
import {
  LIMITES_DAS_METAS,
  CAMPOS_DE_META,
  intervaloEscrito,
  fraseDaRecusa,
} from "@/lib/metas-do-paciente";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SELECT = {
  steps: true,
  activeMinutes: true,
  sleepMinutes: true,
  activeCalories: true,
  updatedAt: true,
} as const;

function recusaDeIntervalo(recusados: string[]) {
  /*
   * A frase vem pronta nas duas línguas porque é ela que a tela mostra. Mandar
   * só `out_of_range` punha um código de máquina na linha de erro do app — e o
   * `ApiError` cai no inglês quando o `errorPt` falta. A tela valida antes, mas
   * um binário antigo contra servidor novo chega aqui, e aí isto é tudo o que a
   * pessoa lê.
   */
  return NextResponse.json(
    {
      error: fraseDaRecusa(recusados, "en"),
      errorPt: fraseDaRecusa(recusados, "pt"),
      code: "out_of_range",
      fields: recusados,
      limits: Object.fromEntries(recusados.map((c) => [c, intervaloEscrito(c)])),
    },
    { status: 400 }
  );
}

export async function GET() {
  /*
   * Quem é a pessoa vem **do portão**, que já a carregou. Chamar
   * `getEffectiveUser()` outra vez aqui era uma segunda ida ao banco para
   * saber o que já se sabia — e abria a hipótese de as duas respostas
   * divergirem, lendo as metas de alguém que o portão tinha recusado.
   */
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;
  const userId = __gate.gate.userId;

  const metas = await prisma.patientGoals.findUnique({ where: { userId }, select: SELECT });

  /*
   * Sem registo não é erro: é alguém que ainda não definiu nenhuma. A tela
   * trata os dois iguais — nada desenha progresso — e um 404 aqui obrigaria
   * cada chamador a traduzir "não encontrado" para "ainda não escolheu".
   */
  return NextResponse.json({
    goals: metas ?? { steps: null, activeMinutes: null, sleepMinutes: null, activeCalories: null },
  });
}

export async function PUT(request: NextRequest) {
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;
  const userId = __gate.gate.userId;

  /* A leitura é de quem está a ver; a **escrita** é só do próprio. */
  const recusa = patientOnlyWriteRefusal(__gate.gate);
  if (recusa === "impersonation") {
    return NextResponse.json(
      {
        error: "These are the patient's own goals. Read-only while viewing as them.",
        errorPt: "Estas metas são do paciente. Somente leitura enquanto o vê por dentro.",
        code: "on_behalf_read_only",
      },
      { status: 403 }
    );
  }
  if (recusa === "not_patient") {
    return NextResponse.json(
      {
        error: "Only the patient sets these goals.",
        errorPt: "Só o paciente define estas metas.",
        code: "patient_only",
      },
      { status: 403 }
    );
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "We could not read what was sent.",
        errorPt: "Não foi possível ler o que foi enviado.",
        code: "invalid_body",
      },
      { status: 400 }
    );
  }

  /*
   * `null`, um número e uma string são JSON perfeitamente válido, e `"steps" in
   * null` estoura. Sem isto, `curl -d 'null'` dava 500 com stack no log em vez
   * de uma recusa.
   */
  if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) {
    return NextResponse.json(
      {
        error: "We could not read what was sent.",
        errorPt: "Não foi possível ler o que foi enviado.",
        code: "invalid_body",
      },
      { status: 400 }
    );
  }
  const recebido = corpo as Record<string, unknown>;

  const dados: Record<string, number | null> = {};
  const recusados: string[] = [];

  for (const campo of CAMPOS_DE_META) {
    if (!(campo in recebido)) continue;
    const v = recebido[campo];

    /* `null` é um valor legítimo: é **apagar a meta**, e tem de ser possível. */
    if (v === null) {
      dados[campo] = null;
      continue;
    }

    const n = Number(v);
    const lim = LIMITES_DAS_METAS[campo];
    if (!Number.isFinite(n) || n < lim.min || n > lim.max) {
      recusados.push(campo);
      continue;
    }
    dados[campo] = Math.round(n);
  }

  /*
   * Recusa **nomeando o campo e o intervalo**, e sem guardar nada: deixar
   * passar os bons daria à pessoa metade do que pediu mais um erro, sem lhe
   * dizer qual metade passou.
   */
  if (recusados.length > 0) return recusaDeIntervalo(recusados);

  if (Object.keys(dados).length === 0) {
    return NextResponse.json(
      {
        error: "No goal was sent.",
        errorPt: "Nenhuma meta foi enviada.",
        code: "nothing_to_change",
      },
      { status: 400 }
    );
  }

  const metas = await prisma.patientGoals.upsert({
    where: { userId },
    create: { userId, ...dados },
    update: dados,
    select: SELECT,
  });

  return NextResponse.json({ goals: metas });
}
