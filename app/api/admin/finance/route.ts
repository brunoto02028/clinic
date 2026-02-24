import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET — list financial entries with filters
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true, role: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const url = req.nextUrl;
  const type = url.searchParams.get("type"); // INCOME | EXPENSE
  const status = url.searchParams.get("status"); // PAID | PENDING | OVERDUE | CANCELLED
  const period = url.searchParams.get("period") || "thisMonth"; // thisMonth | lastMonth | thisYear | allTime
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const search = url.searchParams.get("search") || "";

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
  // allTime: no date filter

  const where: any = { clinicId: user.clinicId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (dateFrom && dateTo) {
    where.createdAt = { gte: dateFrom, lte: dateTo };
  }
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { patientName: { contains: search, mode: "insensitive" } },
      { supplierName: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.financialEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.financialEntry.count({ where }),
  ]);

  // Summary aggregation for the same period
  const summaryWhere: any = { clinicId: user.clinicId };
  if (dateFrom && dateTo) {
    summaryWhere.createdAt = { gte: dateFrom, lte: dateTo };
  }

  const [incomeAgg, expenseAgg, pendingIncomeAgg, pendingExpenseAgg, overdueAgg] = await Promise.all([
    prisma.financialEntry.aggregate({
      where: { ...summaryWhere, type: "INCOME", status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.financialEntry.aggregate({
      where: { ...summaryWhere, type: "EXPENSE", status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.financialEntry.aggregate({
      where: { ...summaryWhere, type: "INCOME", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.financialEntry.aggregate({
      where: { ...summaryWhere, type: "EXPENSE", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.financialEntry.aggregate({
      where: { ...summaryWhere, type: "EXPENSE", status: "OVERDUE" },
      _sum: { amount: true },
    }),
  ]);

  // Category breakdown for income
  const incomeByCat = await prisma.financialEntry.groupBy({
    by: ["incomeCategory"],
    where: { ...summaryWhere, type: "INCOME", status: "PAID" },
    _sum: { amount: true },
  });

  // Category breakdown for expense
  const expenseByCat = await prisma.financialEntry.groupBy({
    by: ["expenseCategory"],
    where: { ...summaryWhere, type: "EXPENSE", status: "PAID" },
    _sum: { amount: true },
  });

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpenses = expenseAgg._sum.amount || 0;

  return NextResponse.json({
    entries,
    total,
    page,
    limit,
    summary: {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      pendingIncome: pendingIncomeAgg._sum.amount || 0,
      pendingExpenses: pendingExpenseAgg._sum.amount || 0,
      overdueExpenses: overdueAgg._sum.amount || 0,
    },
    incomeByCategory: incomeByCat.map((c) => ({
      category: c.incomeCategory,
      amount: c._sum.amount || 0,
    })),
    expenseByCategory: expenseByCat.map((c) => ({
      category: c.expenseCategory,
      amount: c._sum.amount || 0,
    })),
  });
}

// POST — create a new financial entry
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const {
    type, description, amount, currency, incomeCategory, expenseCategory,
    dueDate, paidDate, paymentMethod, patientId, patientName, supplierName,
    isRecurring, recurringDay, notes, status,
  } = body;

  if (!type || !description || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const entry = await prisma.financialEntry.create({
    data: {
      clinicId: user.clinicId,
      type,
      status: status || (paidDate ? "PAID" : "PENDING"),
      description,
      amount: parseFloat(amount),
      currency: currency || "GBP",
      incomeCategory: type === "INCOME" ? incomeCategory : null,
      expenseCategory: type === "EXPENSE" ? expenseCategory : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      paidDate: paidDate ? new Date(paidDate) : null,
      paymentMethod: paymentMethod || null,
      patientId: patientId || null,
      patientName: patientName || null,
      supplierName: supplierName || null,
      isRecurring: isRecurring || false,
      recurringDay: recurringDay ? parseInt(recurringDay) : null,
      notes: notes || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

// PATCH — update a financial entry
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });

  // Verify ownership
  const existing = await prisma.financialEntry.findFirst({
    where: { id, clinicId: user.clinicId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Process date fields
  const data: any = {};
  const allowedFields = [
    "description", "amount", "currency", "incomeCategory", "expenseCategory",
    "dueDate", "paidDate", "paymentMethod", "patientId", "patientName",
    "supplierName", "isRecurring", "recurringDay", "notes", "status", "attachmentUrl",
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === "amount") data[field] = parseFloat(updates[field]);
      else if (field === "recurringDay" && updates[field]) data[field] = parseInt(updates[field]);
      else if ((field === "dueDate" || field === "paidDate") && updates[field]) data[field] = new Date(updates[field]);
      else data[field] = updates[field];
    }
  }

  // Auto-set status to PAID if paidDate is set
  if (data.paidDate && !data.status) data.status = "PAID";

  const entry = await prisma.financialEntry.update({ where: { id }, data });
  return NextResponse.json(entry);
}

// DELETE — remove a financial entry
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const url = req.nextUrl;
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const existing = await prisma.financialEntry.findFirst({
    where: { id, clinicId: user.clinicId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.financialEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
