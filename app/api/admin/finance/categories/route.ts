import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { HMRC_DEFAULT_CATEGORIES } from "@/lib/hmrc-categories";

// GET — list categories (auto-seeds defaults if none exist)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  // Auto-seed if no categories exist
  const count = await prisma.financialCategory.count({ where: { clinicId: user.clinicId } });
  if (count === 0) {
    await prisma.financialCategory.createMany({
      data: HMRC_DEFAULT_CATEGORIES.map((c) => ({
        clinicId: user.clinicId!,
        type: c.type as any,
        name: c.name,
        nameEn: c.nameEn,
        namePt: c.namePt,
        hmrcCode: c.hmrcCode,
        hmrcLabel: c.hmrcLabel,
        companiesHouseSection: c.companiesHouseSection,
        ct600Box: c.ct600Box,
        isTaxDeductible: c.isTaxDeductible,
        isDefault: true,
        sortOrder: c.sortOrder,
        description: c.description,
      })),
    });
  }

  const url = req.nextUrl;
  const type = url.searchParams.get("type"); // INCOME | EXPENSE
  const activeOnly = url.searchParams.get("activeOnly") !== "false";

  const where: any = { clinicId: user.clinicId };
  if (type) where.type = type;
  if (activeOnly) where.isActive = true;

  const categories = await prisma.financialCategory.findMany({
    where,
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(categories);
}

// POST — create a new category
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const { type, name, nameEn, namePt, hmrcCode, hmrcLabel, companiesHouseSection, ct600Box, isTaxDeductible, description, sortOrder } = body;

  if (!type || !name || !nameEn || !namePt) {
    return NextResponse.json({ error: "Missing required fields: type, name, nameEn, namePt" }, { status: 400 });
  }

  const category = await prisma.financialCategory.create({
    data: {
      clinicId: user.clinicId,
      type,
      name,
      nameEn,
      namePt,
      hmrcCode: hmrcCode || null,
      hmrcLabel: hmrcLabel || null,
      companiesHouseSection: companiesHouseSection || null,
      ct600Box: ct600Box || null,
      isTaxDeductible: isTaxDeductible ?? true,
      isDefault: false,
      sortOrder: sortOrder ?? 50,
      description: description || null,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

// PATCH — update a category
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const existing = await prisma.financialCategory.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ["name", "nameEn", "namePt", "hmrcCode", "hmrcLabel", "companiesHouseSection", "ct600Box", "isTaxDeductible", "isActive", "sortOrder", "description"];
  const data: any = {};
  for (const f of allowed) {
    if (updates[f] !== undefined) data[f] = updates[f];
  }

  const category = await prisma.financialCategory.update({ where: { id }, data });
  return NextResponse.json(category);
}

// DELETE — deactivate a category (soft delete)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const url = req.nextUrl;
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const existing = await prisma.financialCategory.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete — just deactivate
  await prisma.financialCategory.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
