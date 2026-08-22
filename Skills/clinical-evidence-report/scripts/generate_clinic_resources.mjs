#!/usr/bin/env node
/*
 * generate_clinic_resources.mjs — gera clinic-resources.json a partir do banco da clínica.
 *
 * Uso (a partir da raiz do projeto, onde o @prisma/client e o DATABASE_URL resolvem):
 *   node Skills/clinical-evidence-report/scripts/generate_clinic_resources.mjs
 *
 * Lê a biblioteca de exercícios (Exercise) e os templates de protocolo (ProtocolTemplate),
 * deriva os equipamentos do campo equipment[] dos protocolos, e escreve o catálogo em
 * Skills/clinical-evidence-report/clinic-resources.json.
 *
 * IMPORTANTE: o catálogo reflete o banco apontado por DATABASE_URL. Rodando localmente você
 * pega só o que existe no banco de dev. Para o catálogo REAL e completo, rode com o
 * DATABASE_URL de produção (equipamentos e protocolos vivem lá).
 */

import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "clinic-resources.json");

// O app é multi-clínica (Exercise.clinicId é obrigatório). Sem filtrar, o catálogo
// misturaria dados de todas as clínicas. Resolve a clínica por CLINIC_ID; se houver só
// uma no banco, usa ela; se houver várias e nenhuma foi informada, para e lista.
async function resolveClinicId() {
  if (process.env.CLINIC_ID) return process.env.CLINIC_ID;
  const clinics = await prisma.clinic.findMany({ select: { id: true, name: true } });
  if (clinics.length === 1) return clinics[0].id;
  if (clinics.length === 0) {
    console.error("Nenhuma clínica no banco.");
    await prisma.$disconnect();
    process.exit(2);
  }
  console.error(`Múltiplas clínicas (${clinics.length}) — informe CLINIC_ID. Disponíveis:`);
  clinics.forEach((c) => console.error(`  ${c.id}  ${c.name}`));
  await prisma.$disconnect();
  process.exit(2);
}

async function main() {
  const clinicId = await resolveClinicId();

  const exercises = await prisma.exercise.findMany({
    where: { isActive: true, clinicId },
    select: {
      name: true,
      namePt: true,
      bodyRegion: true,
      difficulty: true,
      tags: true,
      defaultSets: true,
      defaultReps: true,
      defaultHoldSec: true,
      defaultRestSec: true,
    },
    orderBy: [{ bodyRegion: "asc" }, { name: "asc" }],
  });

  const protocols = await prisma.protocolTemplate.findMany({
    where: { isActive: true, clinicId },
    select: {
      name: true,
      condition: true,
      bodyRegion: true,
      equipment: true,
      estimatedWeeks: true,
      sessionsPerWeek: true,
    },
    orderBy: { name: "asc" },
  });

  // Equipamento não tem modelo próprio — deriva do equipment[] dos protocolos.
  const equipmentSet = new Set();
  for (const p of protocols) for (const e of p.equipment || []) equipmentSet.add(e);

  const catalog = {
    _note: "Gerado por generate_clinic_resources.mjs a partir do banco. Reflete o DATABASE_URL usado — rode contra produção para o catálogo completo.",
    generatedAt: new Date().toISOString(),
    source: "database",
    equipment: [...equipmentSet].sort().map((name) => ({ name, category: null, usedFor: null })),
    exercises: exercises.map((e) => ({
      name: e.name,
      namePt: e.namePt || null,
      bodyRegion: e.bodyRegion,
      difficulty: e.difficulty,
      tags: e.tags || [],
      defaults: {
        sets: e.defaultSets,
        reps: e.defaultReps,
        holdSec: e.defaultHoldSec,
        restSec: e.defaultRestSec,
      },
    })),
    protocols: protocols.map((p) => ({
      name: p.name,
      condition: p.condition,
      bodyRegion: p.bodyRegion,
      equipment: p.equipment || [],
      estimatedWeeks: p.estimatedWeeks,
      sessionsPerWeek: p.sessionsPerWeek,
    })),
  };

  writeFileSync(OUT, JSON.stringify(catalog, null, 2) + "\n");
  console.log(
    `clinic-resources.json gerado: ${catalog.exercises.length} exercícios, ` +
      `${catalog.protocols.length} protocolos, ${catalog.equipment.length} equipamentos.`,
  );
  console.log(`→ ${OUT}`);
  if (catalog.protocols.length === 0 || catalog.equipment.length === 0) {
    console.log(
      "AVISO: protocolos/equipamentos vazios — provável banco de dev. Rode contra produção para o catálogo completo.",
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Erro ao gerar clinic-resources.json:", e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
