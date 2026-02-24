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

// ─── Date range builder ───
function buildDateRange(period: string) {
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
  } else if (period === "lastYear") {
    dateFrom = new Date(now.getFullYear() - 1, 0, 1);
    dateTo = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else if (period === "all") {
    // No date filter
  }
  // Custom: from=YYYY-MM-DD&to=YYYY-MM-DD handled separately
  return { dateFrom, dateTo };
}

// ─── Reusable: fetch summary ───
async function fetchSummary(clinicId: string, dateFrom?: Date, dateTo?: Date) {
  const w: any = { clinicId };
  if (dateFrom && dateTo) w.paidDate = { gte: dateFrom, lte: dateTo };

  const [incomeAgg, expenseAgg, pendingIncome, pendingExpense, overdueExpense, totalEntries] = await Promise.all([
    prisma.financialEntry.aggregate({ where: { ...w, type: "INCOME", status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.financialEntry.aggregate({ where: { ...w, type: "EXPENSE", status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.financialEntry.aggregate({ where: { clinicId, type: "INCOME", status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.financialEntry.aggregate({ where: { clinicId, type: "EXPENSE", status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.financialEntry.aggregate({ where: { clinicId, type: "EXPENSE", status: "OVERDUE" }, _sum: { amount: true }, _count: true }),
    prisma.financialEntry.count({ where: { clinicId } }),
  ]);

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpenses = expenseAgg._sum.amount || 0;

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    paidIncomeCount: incomeAgg._count || 0,
    paidExpenseCount: expenseAgg._count || 0,
    pendingIncome: pendingIncome._sum.amount || 0,
    pendingIncomeCount: pendingIncome._count || 0,
    pendingExpenses: pendingExpense._sum.amount || 0,
    pendingExpenseCount: pendingExpense._count || 0,
    overdueExpenses: overdueExpense._sum.amount || 0,
    overdueExpenseCount: overdueExpense._count || 0,
    totalEntries,
  };
}

// ─── Reusable: fetch breakdown by category ───
async function fetchBreakdown(clinicId: string, dateFrom?: Date, dateTo?: Date) {
  const w: any = { clinicId, status: "PAID" };
  if (dateFrom && dateTo) w.paidDate = { gte: dateFrom, lte: dateTo };

  // Income breakdown by incomeCategory
  const incomeEntries = await prisma.financialEntry.findMany({
    where: { ...w, type: "INCOME" },
    select: { amount: true, incomeCategory: true, categoryId: true },
  });

  const expenseEntries = await prisma.financialEntry.findMany({
    where: { ...w, type: "EXPENSE" },
    select: { amount: true, expenseCategory: true, categoryId: true },
  });

  // Load custom categories for HMRC mapping
  const customCats = await prisma.financialCategory.findMany({
    where: { clinicId, isActive: true },
  });
  const catMap = new Map(customCats.map((c) => [c.id, c]));

  // Group income by category
  const incomeByCategory: Record<string, { total: number; count: number; hmrcCode?: string; ct600Box?: string }> = {};
  for (const e of incomeEntries) {
    const cat = e.incomeCategory || "OTHER_INCOME";
    if (!incomeByCategory[cat]) incomeByCategory[cat] = { total: 0, count: 0 };
    incomeByCategory[cat].total += e.amount;
    incomeByCategory[cat].count++;
    // Add HMRC mapping from custom category if available
    if (e.categoryId && catMap.has(e.categoryId)) {
      const cc = catMap.get(e.categoryId)!;
      incomeByCategory[cat].hmrcCode = cc.hmrcCode || undefined;
      incomeByCategory[cat].ct600Box = cc.ct600Box || undefined;
    }
  }

  // Group expenses by category
  const expenseByCategory: Record<string, { total: number; count: number; hmrcCode?: string; ct600Box?: string }> = {};
  for (const e of expenseEntries) {
    const cat = e.expenseCategory || "OTHER_EXPENSE";
    if (!expenseByCategory[cat]) expenseByCategory[cat] = { total: 0, count: 0 };
    expenseByCategory[cat].total += e.amount;
    expenseByCategory[cat].count++;
    if (e.categoryId && catMap.has(e.categoryId)) {
      const cc = catMap.get(e.categoryId)!;
      expenseByCategory[cat].hmrcCode = cc.hmrcCode || undefined;
      expenseByCategory[cat].ct600Box = cc.ct600Box || undefined;
    }
  }

  return { incomeByCategory, expenseByCategory };
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
  const rawDateBy = url.searchParams.get("dateBy") || "paidDate";
  const dateBy = ["paidDate", "dueDate", "createdAt"].includes(rawDateBy) ? rawDateBy : "paidDate";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

  // Build date range
  let { dateFrom, dateTo } = buildDateRange(period);

  // Custom date range override
  const customFrom = url.searchParams.get("from");
  const customTo = url.searchParams.get("to");
  if (customFrom) dateFrom = new Date(customFrom + "T00:00:00Z");
  if (customTo) dateTo = new Date(customTo + "T23:59:59Z");

  // ═══════════════════════════════════════════
  // ACTION: summary — financial totals
  // ═══════════════════════════════════════════
  if (action === "summary") {
    const summary = await fetchSummary(auth.clinicId, dateFrom, dateTo);
    return NextResponse.json({ period, summary, generatedAt: new Date().toISOString() });
  }

  // ═══════════════════════════════════════════
  // ACTION: entries — paginated financial entries with category details
  // ═══════════════════════════════════════════
  if (action === "entries") {
    const where: any = { clinicId: auth.clinicId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom && dateTo) where[dateBy] = { gte: dateFrom, lte: dateTo };

    const [rawEntries, total] = await Promise.all([
      prisma.financialEntry.findMany({
        where,
        orderBy: [{ [dateBy]: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialEntry.count({ where }),
    ]);

    // Enrich entries with custom category HMRC details
    const categoryIds = rawEntries.map((e) => e.categoryId).filter(Boolean) as string[];
    const categories = categoryIds.length > 0
      ? await prisma.financialCategory.findMany({ where: { id: { in: categoryIds } } })
      : [];
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const entries = rawEntries.map((e) => {
      const cat = e.categoryId ? catMap.get(e.categoryId) : null;
      return {
        ...e,
        categoryDetails: cat ? {
          name: cat.name,
          nameEn: cat.nameEn,
          hmrcCode: cat.hmrcCode,
          hmrcLabel: cat.hmrcLabel,
          ct600Box: cat.ct600Box,
          companiesHouseSection: (cat as any).companiesHouseSection,
          isTaxDeductible: cat.isTaxDeductible,
        } : null,
      };
    });

    return NextResponse.json({
      entries,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      generatedAt: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════
  // ACTION: breakdown — income/expense grouped by category with HMRC codes
  // ═══════════════════════════════════════════
  if (action === "breakdown") {
    const breakdown = await fetchBreakdown(auth.clinicId, dateFrom, dateTo);
    return NextResponse.json({ period, breakdown, generatedAt: new Date().toISOString() });
  }

  // ═══════════════════════════════════════════
  // ACTION: categories — all financial categories with HMRC mapping
  // ═══════════════════════════════════════════
  if (action === "categories") {
    const categories = await prisma.financialCategory.findMany({
      where: { clinicId: auth.clinicId, isActive: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ categories, generatedAt: new Date().toISOString() });
  }

  // ═══════════════════════════════════════════
  // ACTION: company — full company profile (Companies House, HMRC, banking, etc.)
  // ═══════════════════════════════════════════
  if (action === "company") {
    const profile = await (prisma as any).companyProfile.findUnique({
      where: { clinicId: auth.clinicId },
    });
    return NextResponse.json({ company: profile || null, generatedAt: new Date().toISOString() });
  }

  // ═══════════════════════════════════════════
  // ACTION: clinic — basic clinic information
  // ═══════════════════════════════════════════
  if (action === "clinic") {
    const clinic = await prisma.clinic.findUnique({
      where: { id: auth.clinicId },
      select: {
        id: true, name: true, slug: true,
        email: true, phone: true,
        address: true, city: true, postcode: true, country: true,
        currency: true, timezone: true,
        logoUrl: true, primaryColor: true, secondaryColor: true,
        stripeAccountId: true, stripeOnboarded: true,
        isActive: true, createdAt: true,
      },
    });
    return NextResponse.json({ clinic: clinic || null, generatedAt: new Date().toISOString() });
  }

  // ═══════════════════════════════════════════
  // ACTION: all — complete data package for full sync
  // Combines: clinic + company + summary + breakdown + categories + recent entries
  // ═══════════════════════════════════════════
  if (action === "all") {
    const [clinic, company, summary, breakdown, categories, recentEntries, totalEntries] = await Promise.all([
      prisma.clinic.findUnique({
        where: { id: auth.clinicId },
        select: {
          id: true, name: true, slug: true,
          email: true, phone: true,
          address: true, city: true, postcode: true, country: true,
          currency: true, timezone: true,
          logoUrl: true, primaryColor: true, secondaryColor: true,
          stripeAccountId: true, stripeOnboarded: true,
          isActive: true, createdAt: true,
        },
      }),
      (prisma as any).companyProfile.findUnique({ where: { clinicId: auth.clinicId } }),
      fetchSummary(auth.clinicId, dateFrom, dateTo),
      fetchBreakdown(auth.clinicId, dateFrom, dateTo),
      prisma.financialCategory.findMany({
        where: { clinicId: auth.clinicId, isActive: true },
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      }),
      prisma.financialEntry.findMany({
        where: { clinicId: auth.clinicId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.financialEntry.count({ where: { clinicId: auth.clinicId } }),
    ]);

    return NextResponse.json({
      period,
      clinic: clinic || null,
      company: company || null,
      summary,
      breakdown,
      categories,
      recentEntries,
      totalEntries,
      generatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    error: "Unknown action. See 'availableActions' below.",
    availableActions: ["summary", "entries", "breakdown", "categories", "company", "clinic", "all"],
    usage: {
      summary: "GET ?action=summary&period=thisMonth",
      entries: "GET ?action=entries&type=INCOME&status=PAID&dateBy=paidDate&page=1&limit=50",
      breakdown: "GET ?action=breakdown&period=thisYear",
      categories: "GET ?action=categories",
      company: "GET ?action=company",
      clinic: "GET ?action=clinic",
      all: "GET ?action=all&period=thisYear",
    },
    parameters: {
      period: "thisMonth | lastMonth | thisYear | lastYear | all (or use from/to for custom)",
      from: "Custom start date: YYYY-MM-DD",
      to: "Custom end date: YYYY-MM-DD",
      type: "INCOME | EXPENSE (entries only)",
      status: "PAID | PENDING | OVERDUE | CANCELLED (entries only)",
      dateBy: "paidDate | dueDate | createdAt (entries only, default: paidDate)",
      page: "Page number (entries only, default: 1)",
      limit: "Items per page (entries only, max: 500, default: 100)",
    },
    auth: "Header: X-API-Key: bpr_k_your_key",
    baseUrl: "/api/external/finance",
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
