export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function authGuard(session: any) {
  const role = (session?.user as any)?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

// GET — list contacts with optional search/filter
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const groupId = searchParams.get("groupId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (groupId) {
    where.groupMembers = { some: { groupId } };
  }

  const [contacts, total] = await Promise.all([
    (prisma as any).emailContact.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    (prisma as any).emailContact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, pages: Math.ceil(total / limit) });
}

// POST — create single contact OR bulk import from CSV data
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();

  // Bulk import: { contacts: [{email, firstName, lastName}...], groupId? }
  if (body.bulk && Array.isArray(body.contacts)) {
    const results = { created: 0, skipped: 0, errors: 0 };
    for (const c of body.contacts) {
      if (!c.email || !c.email.includes("@")) { results.errors++; continue; }
      try {
        const contact = await (prisma as any).emailContact.upsert({
          where: { email: c.email.toLowerCase().trim() },
          update: { firstName: c.firstName || undefined, lastName: c.lastName || undefined, source: c.source || "csv" },
          create: {
            email: c.email.toLowerCase().trim(),
            firstName: c.firstName || null,
            lastName: c.lastName || null,
            source: c.source || "csv",
            subscribed: true,
          },
        });
        if (body.groupId) {
          await (prisma as any).emailGroupMember.upsert({
            where: { groupId_contactId: { groupId: body.groupId, contactId: contact.id } },
            update: {},
            create: { groupId: body.groupId, contactId: contact.id },
          });
        }
        results.created++;
      } catch { results.skipped++; }
    }
    return NextResponse.json(results);
  }

  // Single contact
  const { email, firstName, lastName, phone, notes, tags, groupId, source } = body;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  try {
    const contact = await (prisma as any).emailContact.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        notes: notes || null,
        tags: tags || [],
        source: source || "manual",
        subscribed: true,
      },
    });
    if (groupId) {
      await (prisma as any).emailGroupMember.create({ data: { groupId, contactId: contact.id } });
    }
    return NextResponse.json(contact);
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — update contact
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const contact = await (prisma as any).emailContact.update({ where: { id }, data });
  return NextResponse.json(contact);
}

// DELETE — delete contact(s)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const ids: string[] = body.ids || (body.id ? [body.id] : []);
  if (!ids.length) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });

  await (prisma as any).emailContact.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: ids.length });
}
