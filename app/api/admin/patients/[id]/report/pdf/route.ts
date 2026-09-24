export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { buildPatientReport, periodFromQuery, periodProblem } from "@/lib/patient-timeline";
import { buildPatientReportPdf } from "@/lib/patient-report-pdf";

/**
 * The same report, as a PDF, downloaded by staff.
 *
 * It is a download, never a send. Nothing here queues a message or touches the
 * patient: handing the report over is a separate, manual act, which is the
 * clinic's standing rule (nothing reaches a patient automatically, and nothing
 * leaves with the clinic's identity before Bruno has seen it).
 */

/**
 * The clinic logo as a data URI, because jsPDF in Node cannot fetch a URL.
 *
 * Best-effort on purpose: a logo that will not load must not cost the clinic
 * its report. PNG and JPEG only — the two formats jsPDF draws — and a size cap,
 * since this URL comes from clinic settings and is fetched by the server.
 *
 * And it is fetched *by the server*, which is why the host is checked first: a
 * clinic admin could otherwise point `logoUrl` at `169.254.169.254` or an
 * address on the internal network and use the report as a probe. Only https,
 * or the app's own origin, and never a private or loopback address.
 */
function safeLogoHost(target: URL, base: URL): boolean {
  if (target.origin === base.origin) return true;
  if (target.protocol !== "https:") return false;
  const host = target.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "[::1]") return false;
  // Literal private ranges. A hostname that resolves to one still gets through,
  // which is why the response is also limited to an image of bounded size.
  if (/^(10|127)\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (/^0\./.test(host)) return false;
  return true;
}

async function logoDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const base = new URL(process.env.NEXTAUTH_URL || "https://bpr.clinic");
    const target = new URL(url, base);
    if (!safeLogoHost(target, base)) return null;
    const absolute = target.toString();
    const res = await fetch(absolute, { signal: AbortSignal.timeout(4000), redirect: "error" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (type !== "image/png" && type !== "image/jpeg") return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 2_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** A filename a person can find later: patient and period, ASCII only. */
function fileName(report: any): string {
  const name = `${report.patient?.firstName ?? ""}-${report.patient?.lastName ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "patient";
  const from = report.period.from.split("T")[0];
  const to = report.period.to.split("T")[0];
  return `report-${name}-${from}-to-${to}.pdf`;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await staffPatientAccess(req, params.id);
  if (guard.response) return guard.response;

  const url = new URL(req.url);
  const { from, to } = periodFromQuery(url);
  const problem = periodProblem(from, to);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const report = await buildPatientReport(params.id, from, to, guard.actor.clinicId);
    if (!report) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const lang = url.searchParams.get("lang") === "pt-BR" ? "pt-BR" : "en-GB";
    const pdf = buildPatientReportPdf(report, {
      lang,
      logoDataUri: await logoDataUri(report.patient?.clinic?.logoUrl),
    });

    return new NextResponse(pdf as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName(report)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[admin/patient-report-pdf] error:", error?.message);
    return NextResponse.json({ error: "Failed to build report" }, { status: 500 });
  }
}
