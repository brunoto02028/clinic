import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendWhatsAppMessage, sendWhatsAppTemplate, sendAIWhatsAppMessage, isWhatsAppConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/whatsapp — List sent/received WhatsApp messages
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const direction = url.searchParams.get("direction") || undefined;
    const patientId = url.searchParams.get("patientId") || undefined;

    const where: any = {};
    if (direction) where.direction = direction;
    if (patientId) where.patientId = patientId;

    const [messages, total] = await Promise.all([
      (prisma as any).whatsAppMessage.findMany({
        where,
        include: { patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (prisma as any).whatsAppMessage.count({ where }),
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      pages: Math.ceil(total / limit),
      configured: isWhatsAppConfigured(),
    });
  } catch (err: any) {
    console.error("[admin/whatsapp] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/whatsapp — Send a WhatsApp message
 * body: { patientId, phone, message, type: "text"|"template"|"ai", templateName?, context?, additionalInfo? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isWhatsAppConfigured()) {
      return NextResponse.json({ error: "WhatsApp is not configured. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to .env" }, { status: 400 });
    }

    const { patientId, phone, message, type, templateName, templateParams, language, context, additionalInfo } = await req.json();

    // Resolve phone number
    let toPhone = phone;
    let patientName = "";
    let resolvedPatientId = patientId;

    if (patientId && !toPhone) {
      const patient = await prisma.user.findUnique({
        where: { id: patientId },
        select: { phone: true, firstName: true, lastName: true, id: true },
      });
      if (!patient?.phone) {
        return NextResponse.json({ error: "Patient has no phone number on file" }, { status: 400 });
      }
      toPhone = patient.phone;
      patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
    }

    if (!toPhone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const clinicId = (session.user as any).clinicId;

    let result;

    switch (type) {
      case "template":
        if (!templateName) return NextResponse.json({ error: "templateName is required for template messages" }, { status: 400 });
        result = await sendWhatsAppTemplate({
          to: toPhone,
          templateName,
          templateParams: templateParams || [],
          language: language || "en_US",
          patientId: resolvedPatientId,
          clinicId,
          triggerEvent: "admin_manual",
        });
        break;

      case "ai":
        result = await sendAIWhatsAppMessage({
          to: toPhone,
          patientName: patientName || "Patient",
          context: context || "general",
          additionalInfo,
          patientId: resolvedPatientId,
          clinicId,
          triggerEvent: "admin_ai",
        });
        break;

      default: // "text"
        if (!message) return NextResponse.json({ error: "message is required for text messages" }, { status: 400 });
        result = await sendWhatsAppMessage({
          to: toPhone,
          message,
          patientId: resolvedPatientId,
          clinicId,
          triggerEvent: "admin_manual",
        });
    }

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[admin/whatsapp] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
