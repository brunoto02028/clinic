// Preenche `lastReadingAt` com o que já está no banco.
//
// A coluna nasceu vazia (atividade 075, T-11) e `daysSilent` cai na data de
// criação da conexão quando ela é nula. Sem isto, no primeiro boot depois do
// deploy **todo** aparelho aparece como mudo há meses — inclusive os que
// reportam todo dia — até a próxima leitura chegar. Um alarme que grita em
// cima de quem está bem é pior que alarme nenhum: ensina a ignorar.
//
// As três fontes são as três formas pelas quais um dado já chegou:
//  - `WearableDataPoint.dataDate` — atividade, sono e vitais, por conexão;
//  - `BloodPressureReading.measuredAt` — a pressão do próprio dono da conexão;
//  - `UnassignedMeasurement.measuredAt` — o aparelho da clínica medindo
//    alguém que nenhuma janela nomeou. É dado chegando do mesmo jeito.
//
// Idempotente: só toca linhas com `lastReadingAt` nulo. Pode rodar todo boot.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // `dataDate` é texto "YYYY-MM-DD"; o cast é o que permite compará-lo como
  // data sem depender do locale do servidor.
  const pontos = await prisma.$executeRawUnsafe(`
    UPDATE "WearableConnection" c
       SET "lastReadingAt" = sub.mx
      FROM (
        SELECT "connectionId" AS id, MAX(("dataDate")::date)::timestamp AS mx
          FROM "WearableDataPoint"
         GROUP BY "connectionId"
      ) sub
     WHERE c.id = sub.id
       AND c."lastReadingAt" IS NULL`);

  const pressao = await prisma.$executeRawUnsafe(`
    UPDATE "WearableConnection" c
       SET "lastReadingAt" = sub.mx
      FROM (
        SELECT "patientId" AS uid, MAX("measuredAt") AS mx
          FROM "BloodPressureReading"
         GROUP BY "patientId"
      ) sub
     WHERE c."userId" = sub.uid
       AND (c."lastReadingAt" IS NULL OR c."lastReadingAt" < sub.mx)
       AND c."lastReadingAt" IS NULL`);

  const clinica = await prisma.$executeRawUnsafe(`
    UPDATE "WearableConnection" c
       SET "lastReadingAt" = sub.mx
      FROM (
        SELECT "connectionId" AS id, MAX("measuredAt") AS mx
          FROM "UnassignedMeasurement"
         GROUP BY "connectionId"
      ) sub
     WHERE c.id = sub.id
       AND c."lastReadingAt" IS NULL`);

  if (pontos || pressao || clinica) {
    console.log(`[backfill-last-reading] pontos=${pontos} pressao=${pressao} clinica=${clinica}`);
  } else {
    console.log('[backfill-last-reading] nothing to fill');
  }
}

main()
  .catch((e) => {
    console.error('[backfill-last-reading] error', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
