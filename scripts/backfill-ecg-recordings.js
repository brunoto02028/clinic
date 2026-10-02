/**
 * Traz os ECG antigos do `WearableDataPoint` para o `EcgRecording` (119 T-2).
 *
 * Até 02/10/2026 um ECG era guardado como um ponto diário, com chave
 * `(utilizador, dia, tipo)`. Isso é a chave de um **total do dia** — e um ECG é
 * um evento. Duas gravações no mesmo dia colapsavam numa: o Bruno fez duas em
 * 01/10, às 22:44 e às 23:54, e ficou a última.
 *
 * **O que este script pode e não pode recuperar.** As que foram apagadas não
 * voltam — não há onde as ir buscar senão a uma nova sincronização, que é o que
 * a ingestão corrigida faz na próxima volta do cron. O que ele faz é trazer o
 * que **sobreviveu**, para o histórico não começar do zero no dia da correção.
 *
 * É idempotente: a chave é `(utilizador, provedor, instante)`, e correr duas
 * vezes não duplica nada.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * A mesma tabela do `lib/ecg-record.ts`, e pela mesma razão.
 *
 * `0` é "sem sinais de fibrilhação", `1` é fibrilhação, e tudo o resto é
 * inconclusivo — nunca "normal". Até 02/10/2026 a leitura estava deslocada em
 * um e um ECG com fibrilhação aparecia como ritmo normal.
 *
 * Está repetida aqui porque este ficheiro corre no boot, fora do bundle do
 * Next, e não consegue importar TypeScript. A duplicação é guardada por teste.
 */
function traduzir(v) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (n === 0) return "normal";
  if (n === 1) return "fibrilacao";
  return "inconclusivo";
}

async function main() {
  const pontos = await prisma.wearableDataPoint.findMany({
    where: { dataType: "ECG" },
    select: {
      userId: true,
      connectionId: true,
      provider: true,
      dataDate: true,
      restingHr: true,
      rawPayload: true,
    },
  });

  let trazidos = 0;
  let jaLa = 0;
  let semInstante = 0;

  for (const p of pontos) {
    let bruto = {};
    try {
      bruto = p.rawPayload ? JSON.parse(p.rawPayload) : {};
    } catch {
      bruto = {};
    }

    /*
     * Sem `recordedAt` no payload não há instante, e inventar um a partir do
     * dia poria todas as gravações à meia-noite — uma hora que ninguém mediu.
     * Fica de fora, e a próxima sincronização traz a gravação com a hora certa.
     */
    const quando = typeof bruto.recordedAt === "string" ? new Date(bruto.recordedAt) : null;
    if (!quando || Number.isNaN(quando.getTime())) {
      semInstante++;
      continue;
    }

    const provider = p.provider || "withings";
    const existente = await prisma.ecgRecording.findUnique({
      where: { userId_provider_recordedAt: { userId: p.userId, provider, recordedAt: quando } },
      select: { id: true },
    });
    if (existente) {
      jaLa++;
      continue;
    }

    const afibRaw = Number(bruto.afibClassification);
    await prisma.ecgRecording.create({
      data: {
        userId: p.userId,
        connectionId: p.connectionId ?? null,
        provider,
        recordedAt: quando,
        heartRate: typeof p.restingHr === "number" ? Math.round(p.restingHr) : null,
        afibRaw: Number.isFinite(afibRaw) ? afibRaw : null,
        conclusao: traduzir(bruto.afibClassification),
        signalId: bruto.signalId == null ? null : String(bruto.signalId),
      },
    });
    trazidos++;
  }

  console.log(
    `[backfill-ecg] pontos de ECG: ${pontos.length} | trazidos: ${trazidos} | ` +
      `já estavam: ${jaLa} | sem instante no payload: ${semInstante}`
  );
}

main()
  .catch((e) => {
    console.error("[backfill-ecg]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
