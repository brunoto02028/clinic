import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Authenticate via X-API-Key header
async function authenticateApiKey(req: NextRequest): Promise<{ clinicId: string; permissions: string[] } | null> {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) return null;

  const keyHash = hashKey(apiKey);
  const key = await prisma.apiKey.findFirst({
    where: { keyHash, isActive: true },
  });

  if (!key) return null;

  // Check expiry
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    clinicId: key.clinicId,
    permissions: key.permissions.split(",").map((p) => p.trim()),
  };
}

// GET — external read of financial data
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid API key via X-API-Key header." },
      { status: 401, headers: { "WWW-Authenticate": "ApiKey" } }
    );
  }

  if (!auth.permissions.includes("finance:read")) {
    return NextResponse.json({ error: "Insufficient permissions. Required: finance:read" }, { status: 403 });
  }

  const url = req.nextUrl;
  const action = url.searchParams.get("action") || "summary";
  const period = url.searchParams.get("period") || "thisMonth";
  const type = url.searchParams.get("type"); // INCOME | EXPENSE
  const status = url.searchParams.get("status");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

  // Build date range
  const now = new Date();
  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  if (period === "thisMonth") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (period === "lastMonth") {
    dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (period === "thisYear") {
    dateFrom = new Date(now.getFullYear(), 0, 1);
    dateTo = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  }

  if (action === "summary") {
    const summaryWhere: any = { clinicId: auth.clinicId };
    if (dateFrom && dateTo) summaryWhere.createdAt = { gte: dateFrom, lte: dateTo };

    const [incomeAgg, expenseAgg, pendingIncome, pendingExpense, overdueExpense] = await Promise.all([
      prisma.financialEntry.aggregate({ where: { ...summaryWhere, type: "INCOME", status: "PAID" }, _sum: { amount: true } }),
      prisma.financialEntry.aggregate({ where: { ...summaryWhere, type: "EXPENSE", status: "PAID" }, _sum: { amount: true } }),
      prisma.financialEntry.aggregate({ where: { ...summaryWhere, type: "INCOME", status: "PENDING" }, _sum: { amount: true } }),
      prisma.financialEntry.aggregate({ where: { ...summaryWhere, type: "EXPENSE", status: "PENDING" }, _sum: { amount: true } }),
      prisma.financialEntry.aggregate({ where: { ...summaryWhere, type: "EXPENSE", status: "OVERDUE" }, _sum: { amount: true } }),
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpenses = expenseAgg._sum.amount || 0;

    return NextResponse.json({
      period,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        pendingIncome: pendingIncome._sum.amount || 0,
        pendingExpenses: pendingExpense._sum.amount || 0,
        overdueExpenses: overdueExpense._sum.amount || 0,
      },
      generatedAt: new Date().toISOString(),
    });
  }

  if (action === "entries") {
    const where: any = { clinicId: auth.clinicId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom && dateTo) where.createdAt = { gte: dateFrom, lte: dateTo };

    const [entries, total] = await Promise.all([
      prisma.financialEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      generatedAt: new Date().toISOString(),
    });
  }

  if (action === "categories") {
    const categories = await prisma.financialCategory.findMany({
      where: { clinicId: auth.clinicId, isActive: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ categories, generatedAt: new Date().toISOString() });
  }

  if (action === "company") {
    const profile = await (prisma as any).companyProfile.findUnique({
      where: { clinicId: auth.clinicId },
    });
    return NextResponse.json({ company: profile || null, generatedAt: new Date().toISOString() });
  }

  return NextResponse.json({
    error: "Unknown action",
    availableActions: ["summary", "entries", "categories", "company"],
    usage: {
      summary: "GET /api/external/finance?action=summary&period=thisMonth",
      entries: "GET /api/external/finance?action=entries&type=INCOME&status=PAID&page=1&limit=50",
      categories: "GET /api/external/finance?action=categories",
      company: "GET /api/external/finance?action=company",
    },
  }, { status: 400 });
}

// POST — external write of financial entries (requires finance:write permission)
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid API key via X-API-Key header." },
      { status: 401 }
    );
  }

  if (!auth.permissions.includes("finance:write")) {
    return NextResponse.json({ error: "Insufficient permissions. Required: finance:write" }, { status: 403 });
  }

  const body = await req.json();
  const { type, description, amount, currency, status: entryStatus, incomeCategory, expenseCategory, dueDate, paidDate, paymentMethod, patientName, supplierName, categoryId, notes } = body;

  if (!type || !description || !amount) {
    return NextResponse.json({ error: "Required fields: type, description, amount" }, { status: 400 });
  }

  const entry = await prisma.financialEntry.create({
    data: {
      clinicId: auth.clinicId,
      type,
      status: entryStatus || (paidDate ? "PAID" : "PENDING"),
      description,
      amount: parseFloat(amount),
      currency: currency || "GBP",
      incomeCategory: type === "INCOME" ? incomeCategory : null,
      expenseCategory: type === "EXPENSE" ? expenseCategory : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      paidDate: paidDate ? new Date(paidDate) : null,
      paymentMethod: paymentMethod || null,
      patientName: patientName || null,
      supplierName: supplierName || null,
      categoryId: categoryId || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ success: true, entry }, { status: 201 });
}
