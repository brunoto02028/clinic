import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "SUPERADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const tab = searchParams.get("tab") || "all"; // all | system | audit
  const level = searchParams.get("level"); // INFO, WARN, ERROR, CRITICAL
  const category = searchParams.get("category");
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format"); // csv

  const skip = (page - 1) * limit;

  try {
    if (tab === "audit") {
      // Audit logs
      const where: any = {};
      if (search) {
        where.OR = [
          { userEmail: { contains: search, mode: "insensitive" } },
          { action: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { userName: { contains: search, mode: "insensitive" } },
        ];
      }
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: format === "csv" ? 0 : skip,
          take: format === "csv" ? 10000 : limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      if (format === "csv") {
        const csv = auditLogsToCSV(logs);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return NextResponse.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    // System logs
    const where: any = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { message: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
        { path: { contains: search, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
    }

    const [logs, total, stats] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: format === "csv" ? 0 : skip,
        take: format === "csv" ? 10000 : limit,
      }),
      prisma.systemLog.count({ where }),
      prisma.systemLog.groupBy({
        by: ["level"],
        _count: true,
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    if (format === "csv") {
      const csv = systemLogsToCSV(logs);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="system-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const statsMap: Record<string, number> = {};
    stats.forEach((s: any) => {
      statsMap[s.level] = s._count;
    });

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats24h: statsMap,
    });
  } catch (err: any) {
    console.error("System logs API error:", err);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

// Mark log as resolved
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "SUPERADMIN" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, resolved } = await req.json();
    const log = await prisma.systemLog.update({
      where: { id },
      data: {
        resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? (session.user as any)?.email : null,
      },
    });
    return NextResponse.json(log);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update log" }, { status: 500 });
  }
}

// ─── CSV helpers ───────────────────────────────────────

function escapeCSV(val: any): string {
  if (val == null) return "";
  const str = String(val).replace(/"/g, '""');
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str}"`
    : str;
}

function systemLogsToCSV(logs: any[]): string {
  const headers = [
    "ID", "Timestamp", "Level", "Category", "Message", "Source",
    "Method", "Path", "Status Code", "Duration (ms)",
    "User Email", "User Role", "IP", "Resolved",
  ];
  const rows = logs.map((l) => [
    l.id,
    new Date(l.createdAt).toISOString(),
    l.level,
    l.category,
    l.message,
    l.source || "",
    l.method || "",
    l.path || "",
    l.statusCode ?? "",
    l.duration ?? "",
    l.userEmail || "",
    l.userRole || "",
    l.ip || "",
    l.resolved ? "Yes" : "No",
  ]);
  return [headers.map(escapeCSV).join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n");
}

function auditLogsToCSV(logs: any[]): string {
  const headers = [
    "ID", "Timestamp", "User Email", "User Name", "Role",
    "Action", "Entity", "Entity ID", "Description", "IP", "Path",
  ];
  const rows = logs.map((l) => [
    l.id,
    new Date(l.createdAt).toISOString(),
    l.userEmail,
    l.userName || "",
    l.userRole,
    l.action,
    l.entity || "",
    l.entityId || "",
    l.description,
    l.ip || "",
    l.path || "",
  ]);
  return [headers.map(escapeCSV).join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n");
}
