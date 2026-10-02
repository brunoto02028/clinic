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
 * Next, e não consegue importar TypeScript.
 *
 * **A duplicação é guardada por teste** — `__tests__/wearables/a-tabela-do-afib-
 * num-sitio-so.test.ts`. Até 02/10/2026 este comentário afirmava isso e era
 * **falso**: o QA mutou a tabela aqui e a suíte inteira ficou verde. Um
 * comentário que promete uma guarda que não existe é pior do que nenhum, porque
 * convence o próximo a não procurar.
 *
 * E a consequência não é teórica. A `conclusao` é recalculada a cada
 * sincronização, portanto um erro aqui sara-se sozinho **para os registos que a
 * API ainda devolve**. Um registo trazido por este script cujo instante já saiu
 * da janela da Withings fica com a palavra errada **para sempre** — e a palavra
 * errada deste erro específico é "normal" numa fibrilhação.
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

    /*
     * Sempre em maiúsculas, como a `WearableConnection` guarda. A primeira
     * versão usava `p.provider || "withings"`, e a ingestão usava `"withings"`
     * — a mesma gravação dava duas linhas, uma por grafia, e a chave única não
     * tinha como as juntar.
     */
    const provider = String(p.provider || "WITHINGS").toUpperCase();
    const existente = await prisma.ecgRecording.findUnique({
      where: { userId_provider_recordedAt: { userId: p.userId, provider, recordedAt: quando } },
      select: { id: true },
    });
    if (existente) {
      jaLa++;
      continue;
    }

    /*
     * **`Number(null)` é `0`, e `0` é "sem sinais de fibrilhação".**
     *
     * A ingestão antiga escrevia `afibClassification: null` quando a Withings
     * não mandava o campo, e o `JSON.stringify` preserva esse `null`. Converter
     * cegamente dava `afibRaw: 0` a um registo que o relógio **não
     * classificou** — e o `afibRaw` existe justamente para que uma correcção
     * futura da tabela possa ser reaplicada. Reaplicá-la transformaria um
     * "não sei" num "ritmo sinusal", que é o lado que não pode errar.
     */
    const cru = bruto.afibClassification;
    const afibRaw = cru == null ? null : Number(cru);
    await prisma.ecgRecording.create({
      data: {
        userId: p.userId,
        connectionId: p.connectionId ?? null,
        provider,
        recordedAt: quando,
        heartRate: typeof p.restingHr === "number" ? Math.round(p.restingHr) : null,
        afibRaw: afibRaw !== null && Number.isFinite(afibRaw) ? afibRaw : null,
        conclusao: traduzir(bruto.afibClassification),
        signalId: bruto.signalId == null ? null : String(bruto.signalId),
      },
    });
    trazidos++;
  }

  /*
   * Junta o que a grafia partiu. Entre 02/10 04:20 e a correção, a ingestão
   * gravou `withings` e este script `WITHINGS` — duas linhas para a mesma
   * gravação. A de minúsculas vai embora quando existe a gémea; quando não
   * existe, é promovida em vez de apagada, senão perdia-se a gravação.
   */
  const minusculas = await prisma.ecgRecording.findMany({
    where: { provider: { not: "WITHINGS" } },
    select: { id: true, userId: true, provider: true, recordedAt: true },
  });
  let juntadas = 0;
  let promovidas = 0;
  for (const r of minusculas) {
    const gemea = await prisma.ecgRecording.findUnique({
      where: {
        userId_provider_recordedAt: {
          userId: r.userId,
          provider: r.provider.toUpperCase(),
          recordedAt: r.recordedAt,
        },
      },
      select: { id: true },
    });
    /*
     * `gemea.id !== r.id` **não é zelo**: para qualquer provedor já em
     * maiúsculas e diferente de WITHINGS — `GARMIN`, `OURA` —, o
     * `toUpperCase()` é um no-op e o `findUnique` devolve **a própria linha**.
     * Sem esta condição o script criava a linha e apagava-a na mesma execução,
     * imprimindo `trazidos: 1 | grafia juntada: 1`, que se lê como sucesso.
     */
    if (gemea && gemea.id !== r.id) {
      await prisma.ecgRecording.delete({ where: { id: r.id } });
      juntadas++;
    } else if (r.provider !== r.provider.toUpperCase()) {
      await prisma.ecgRecording.update({
        where: { id: r.id },
        data: { provider: r.provider.toUpperCase() },
      });
      promovidas++;
    }
  }

  console.log(
    `[backfill-ecg] pontos de ECG: ${pontos.length} | trazidos: ${trazidos} | ` +
      `já estavam: ${jaLa} | sem instante no payload: ${semInstante} | ` +
      `grafia juntada: ${juntadas} | promovidas: ${promovidas}`
  );
}

main()
  .catch((e) => {
    console.error("[backfill-ecg]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
