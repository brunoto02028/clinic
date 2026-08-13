import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { existsSync, readdirSync, statSync } from "fs";
import { timingSafeEqual } from "crypto";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Lists the server's upload directory so the backup script knows what to fetch.
 *
 * `scripts/backup.ps1` used to archive `public/uploads` relative to the project
 * root — on the operator's own machine, not the server. It reported
 * "uploads/ (13 files)" while production held 296, so the report read as
 * success while nothing on the server was ever protected.
 *
 * SSH would be the tidier transport, but the key on the operator's machine is
 * not authorised on the VPS (`Permission denied (publickey,password)`).
 *
 * A manifest rather than an archive: building a tarball needs a package that
 * is only present transitively here, and streaming files one at a time also
 * survives an interrupted run and reports which file failed. The files
 * themselves come from `/uploads/*`, which already serves them without auth —
 * this endpoint adds no exposure, it just says what exists.
 *
 * Exercise videos are no longer here — they live in R2. What this protects is
 * everything still on disk: article images, the logo, patient documents.
 */

function uploadsRoot(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
}

interface Entry {
  path: string;
  bytes: number;
}

function walk(dir: string, base: string, out: Entry[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Dotfiles are skipped: they are `.gitkeep` placeholders holding no data,
    // and Next refuses to serve them (400), so listing them would leave the
    // backup permanently reporting a shortfall it can never close — which
    // trains the reader to ignore the report.
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      walk(full, base, out);
    } else if (entry.isFile()) {
      let bytes = 0;
      try {
        bytes = statSync(full).size;
      } catch {
        /* listed even if the size can't be read */
      }
      // Forward slashes so the script can build a URL directly.
      out.push({ path: path.relative(base, full).split(path.sep).join("/"), bytes });
    }
  }
}

/**
 * A backup runs unattended, so it authenticates with a long-lived secret rather
 * than a browser session: session cookies are httpOnly and expire, which would
 * mean the backup quietly stops working every few weeks — the same shape of
 * silent failure this whole endpoint exists to end.
 *
 * Compared in constant time so a wrong token can't be discovered byte by byte.
 */
function hasValidBackupToken(req: NextRequest): boolean {
  const expected = process.env.BACKUP_TOKEN;
  if (!expected || expected.length < 32) return false;

  const provided =
    req.headers.get("x-backup-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  // Either a signed-in SUPERADMIN (useful for checking by hand) or the backup
  // token. The list covers every uploaded file the clinic holds, patient
  // documents included, so nothing weaker than these two is accepted.
  if (!hasValidBackupToken(req)) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const root = uploadsRoot();
  if (!existsSync(root)) {
    return NextResponse.json(
      { error: "Uploads directory not found on the server", path: root },
      { status: 404 }
    );
  }

  const files: Entry[] = [];
  walk(root, root, files);
  const bytes = files.reduce((sum, f) => sum + f.bytes, 0);

  return NextResponse.json({
    path: root,
    count: files.length,
    bytes,
    megabytes: +(bytes / 1048576).toFixed(1),
    files,
  });
}
