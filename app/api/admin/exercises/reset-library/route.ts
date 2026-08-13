import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { resolveClinicId } from "@/lib/exercise-folders";
import { deleteR2Url, isR2Configured, listR2, deleteFromR2, keyFromR2Url } from "@/lib/r2";
import path from "path";
import { existsSync, statSync, unlinkSync, readdirSync } from "fs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * TEMPORARY — wipes the exercise library so it can be re-uploaded already
 * organised into folders. The UI can't do this today: the region cards aren't
 * real folders, there's no select-all, and deleting only flips isActive, which
 * would leave every .mp4 orphaned on disk.
 *
 * Deliberately awkward to fire: SUPERADMIN, POST, and `?confirm=DELETE-ALL`.
 * Run `?dryRun=true` first — it reports exactly what would go without touching
 * anything.
 *
 * Delete this route once the library has been rebuilt.
 */

const EXERCISES_SUBDIR = "exercises";

function uploadsBase() {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
}

/** Resolve a /uploads/... URL to a real path, refusing anything outside the
 *  exercises folder so a tampered row can't point the unlink at, say, /etc. */
function safeExercisePath(url: string | null): string | null {
  if (!url || !url.startsWith("/uploads/")) return null;
  const base = uploadsBase();
  const resolved = path.resolve(path.join(base, url.replace(/^\/uploads\//, "")));
  const allowed = path.resolve(path.join(base, EXERCISES_SUBDIR));
  if (!resolved.startsWith(allowed + path.sep)) return null;
  return resolved;
}

function countFilesIn(dir: string): number {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) n++;
    else if (entry.isDirectory()) n += countFilesIn(path.join(dir, entry.name));
  }
  return n;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "true";
  const confirmed = searchParams.get("confirm") === "DELETE-ALL";
  const purgeOrphans = searchParams.get("purgeOrphans") === "true";

  if (!dryRun && !confirmed) {
    return NextResponse.json(
      { error: "Refusing to run. Pass ?dryRun=true to preview, or ?confirm=DELETE-ALL to really wipe the library." },
      { status: 400 }
    );
  }

  // Scoped to one clinic by default. A SUPERADMIN in Global View resolves to
  // the first clinic, so `?allClinics=true` is required to reach beyond it —
  // wiping every tenant's library must be asked for, never inferred.
  const allClinics = searchParams.get("allClinics") === "true";
  const clinicId = await resolveClinicId(session);
  if (!allClinics && !clinicId) {
    return NextResponse.json({ error: "No clinic context" }, { status: 400 });
  }
  const clinicWhere = allClinics ? {} : { clinicId: clinicId! };

  const exercises = await prisma.exercise.findMany({
    where: clinicWhere,
    select: { id: true, name: true, videoUrl: true, thumbnailUrl: true, isActive: true },
  });
  const exerciseIds = exercises.map((e) => e.id);

  const [prescriptionCount, folderCount, clinicsAffected] = await Promise.all([
    prisma.exercisePrescription.count({ where: { exerciseId: { in: exerciseIds } } }),
    prisma.exerciseFolder.count({ where: clinicWhere }),
    prisma.clinic.findMany({
      where: allClinics ? {} : { id: clinicId! },
      select: { id: true, name: true },
    }),
  ]);

  // Work out the files up front so the dry run reports the same set the real
  // run would delete.
  const files: string[] = [];
  let missingFiles = 0;
  let bytes = 0;
  for (const ex of exercises) {
    for (const url of [ex.videoUrl, ex.thumbnailUrl]) {
      const p = safeExercisePath(url);
      if (!p) continue;
      if (!existsSync(p)) {
        missingFiles++;
        continue;
      }
      files.push(p);
      try {
        bytes += statSync(p).size;
      } catch {
        /* size is only for the report */
      }
    }
  }

  const exercisesDir = path.join(uploadsBase(), EXERCISES_SUBDIR);
  const filesOnDisk = countFilesIn(exercisesDir);

  // Media now lives in R2; the disk numbers only ever describe leftovers from
  // before the migration.
  const r2Keys = isR2Configured() ? await listR2("exercises/") : [];

  // Objects this run would actually remove, as opposed to everything sitting
  // under the prefix — those differ as soon as there is more than one clinic,
  // and reporting only the global number would understate nothing and
  // overstate everything.
  const scopedKeys = new Set(
    exercises
      .flatMap((e) => [e.videoUrl, e.thumbnailUrl])
      .map((u) => keyFromR2Url(u))
      .filter((k): k is string => !!k)
  );

  const plan = {
    scope: allClinics ? "ALL CLINICS" : "this clinic only",
    clinics: clinicsAffected.map((c) => c.name),
    exercises: exercises.length,
    exercisesActive: exercises.filter((e) => e.isActive).length,
    prescriptions: prescriptionCount,
    folders: folderCount,
    filesReferenced: files.length,
    filesMissing: missingFiles,
    filesOnDisk,
    objectsInR2Total: r2Keys.length,
    objectsInR2ThisScope: scopedKeys.size,
    orphansAfter: filesOnDisk - files.length,
    megabytesFreed: +(bytes / 1048576).toFixed(1),
  };

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      plan,
      note: "Nothing was deleted. Re-run with ?confirm=DELETE-ALL to apply.",
    });
  }

  // Prescriptions cascade off Exercise, but deleting them explicitly keeps the
  // reported numbers honest rather than silently-implied.
  const deletedPrescriptions = await prisma.exercisePrescription.deleteMany({
    where: { exerciseId: { in: exerciseIds } },
  });
  const deletedExercises = await prisma.exercise.deleteMany({ where: clinicWhere });
  const deletedFolders = await prisma.exerciseFolder.deleteMany({ where: clinicWhere });

  let deletedObjects = 0;
  const fileErrors: string[] = [];
  for (const ex of exercises) {
    for (const url of [ex.videoUrl, ex.thumbnailUrl]) {
      try {
        if (await deleteR2Url(url)) deletedObjects++;
      } catch (err: any) {
        fileErrors.push(`R2 ${url}: ${err.message}`);
      }
    }
  }
  // "Orphan" has to mean "no surviving row points at it" — not "everything
  // under the prefix". R2 keys carry no clinic segment, so a blind sweep would
  // destroy other clinics' videos even when this reset is scoped to one, and R2
  // is now the only copy there is.
  let purgedOrphanObjects = 0;
  if (purgeOrphans && isR2Configured()) {
    const survivors = await prisma.exercise.findMany({
      select: { videoUrl: true, thumbnailUrl: true },
    });
    const stillReferenced = new Set(
      survivors
        .flatMap((e) => [e.videoUrl, e.thumbnailUrl])
        .map((u) => keyFromR2Url(u))
        .filter((k): k is string => !!k)
    );
    for (const key of await listR2("exercises/")) {
      if (stillReferenced.has(key)) continue;
      try {
        await deleteFromR2(key);
        purgedOrphanObjects++;
      } catch (err: any) {
        fileErrors.push(`R2 ${key}: ${err.message}`);
      }
    }
  }

  let deletedFiles = 0;
  for (const p of files) {
    try {
      unlinkSync(p);
      deletedFiles++;
    } catch (err: any) {
      fileErrors.push(`${path.basename(p)}: ${err.message}`);
    }
  }

  // Anything left in the folder is unreferenced by definition now that every
  // row is gone — but only sweep it when explicitly asked.
  let purgedOrphans = 0;
  if (purgeOrphans && existsSync(exercisesDir)) {
    const sweep = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) sweep(full);
        else {
          try {
            unlinkSync(full);
            purgedOrphans++;
          } catch (err: any) {
            fileErrors.push(`${entry.name}: ${err.message}`);
          }
        }
      }
    };
    sweep(exercisesDir);
  }

  return NextResponse.json({
    dryRun: false,
    scope: plan.scope,
    clinics: plan.clinics,
    deleted: {
      prescriptions: deletedPrescriptions.count,
      exercises: deletedExercises.count,
      folders: deletedFolders.count,
      files: deletedFiles,
      objectsInR2: deletedObjects,
      orphanObjectsPurged: purgedOrphanObjects,
      orphansPurged: purgedOrphans,
    },
    megabytesFreed: plan.megabytesFreed,
    filesRemaining: countFilesIn(exercisesDir),
    objectsRemainingInR2: isR2Configured() ? (await listR2("exercises/")).length : null,
    fileErrors: fileErrors.slice(0, 20),
  });
}
