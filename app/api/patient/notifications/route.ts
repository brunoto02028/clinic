export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export async function GET(request: NextRequest) {
  try {
    const effective = await getEffectiveUser();
    if (!effective) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = effective.userId;
    const now = new Date();
    const notifications: { id: string; type: string; title: string; titlePt: string; message: string; messagePt: string; link: string; icon: string; color: string; createdAt: string; isUrgent: boolean }[] = [];

    // 1. Upcoming appointments (next 7 days)
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingAppts = await prisma.appointment.findMany({
      where: {
        patientId: userId,
        dateTime: { gte: now, lte: sevenDays },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dateTime: "asc" },
      take: 5,
    });

    for (const appt of upcomingAppts) {
      const apptDate = new Date(appt.dateTime);
      const isToday = apptDate.toDateString() === now.toDateString();
      const isTomorrow = apptDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
      const dateStr = apptDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      const timeStr = apptDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const therapistName = appt.therapist ? `${appt.therapist.firstName}` : "";

      const dayLabel = isToday ? "today" : isTomorrow ? "tomorrow" : dateStr;
      const dayLabelPt = isToday ? "hoje" : isTomorrow ? "amanhã" : dateStr;

      notifications.push({
        id: `appt-${appt.id}`,
        type: "appointment",
        title: isToday ? "Appointment Today" : isTomorrow ? "Appointment Tomorrow" : "Upcoming Appointment",
        titlePt: isToday ? "Consulta Hoje" : isTomorrow ? "Consulta Amanhã" : "Próxima Consulta",
        message: `${appt.treatmentType || "Appointment"} ${dayLabel} at ${timeStr}${therapistName ? ` with ${therapistName}` : ""}`,
        messagePt: `${appt.treatmentType || "Consulta"} ${dayLabelPt} às ${timeStr}${therapistName ? ` com ${therapistName}` : ""}`,
        link: "/dashboard/appointments",
        icon: "Calendar",
        color: isToday ? "red" : isTomorrow ? "amber" : "blue",
        createdAt: appt.createdAt?.toISOString?.() || now.toISOString(),
        isUrgent: isToday,
      });
    }

    // 2. Screening not completed
    const hasScreening = await prisma.medicalScreening.findUnique({
      where: { userId },
    });
    if (!hasScreening?.consentGiven) {
      const hasUpcoming = upcomingAppts.length > 0;
      notifications.push({
        id: "screening-pending",
        type: "screening",
        title: hasUpcoming ? "Screening Required" : "Complete Your Screening",
        titlePt: hasUpcoming ? "Triagem Obrigatória" : "Complete a Sua Triagem",
        message: hasUpcoming
          ? "Please complete your medical screening before your appointment. It takes 5-10 minutes."
          : "Complete your medical screening to help us prepare the best treatment plan for you.",
        messagePt: hasUpcoming
          ? "Por favor complete a triagem médica antes da consulta. Demora 5-10 minutos."
          : "Complete a triagem médica para nos ajudar a preparar o melhor plano de tratamento.",
        link: "/dashboard/screening",
        icon: "Shield",
        color: hasUpcoming ? "red" : "amber",
        createdAt: now.toISOString(),
        isUrgent: hasUpcoming,
      });
    }

    // 3. Profile incomplete (no DOB or no address)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfBirth: true, address: true, firstName: true, lastName: true, phone: true },
    });
    const profileMissing = !user?.dateOfBirth || !user?.address;
    if (profileMissing) {
      notifications.push({
        id: "profile-incomplete",
        type: "profile",
        title: "Complete Your Profile",
        titlePt: "Complete o Seu Perfil",
        message: `Please add your ${!user?.dateOfBirth ? "date of birth" : ""}${!user?.dateOfBirth && !user?.address ? " and " : ""}${!user?.address ? "address" : ""} to your profile.`,
        messagePt: `Por favor adicione ${!user?.dateOfBirth ? "data de nascimento" : ""}${!user?.dateOfBirth && !user?.address ? " e " : ""}${!user?.address ? "endereço" : ""} ao seu perfil.`,
        link: "/dashboard/profile",
        icon: "User",
        color: "amber",
        createdAt: now.toISOString(),
        isUrgent: false,
      });
    }

    // 4. Pending payments (use raw query to avoid type issues)
    try {
      const appts = await (prisma as any).appointment.findMany({
        where: { patientId: userId, dateTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
        include: { payment: true },
        take: 5,
      });
      for (const appt of appts) {
        if (appt.payment && appt.payment.status !== "COMPLETED" && appt.payment.status !== "PAID") {
          notifications.push({
            id: `payment-${appt.id}`,
            type: "payment",
            title: "Payment Pending",
            titlePt: "Pagamento Pendente",
            message: `Payment of £${(appt.price || 0).toFixed(2)} for ${appt.treatmentType || "appointment"} is pending.`,
            messagePt: `Pagamento de £${(appt.price || 0).toFixed(2)} para ${appt.treatmentType || "consulta"} pendente.`,
            link: "/dashboard/appointments",
            icon: "CreditCard",
            color: "amber",
            createdAt: appt.createdAt?.toISOString?.() || now.toISOString(),
            isUrgent: false,
          });
        }
      }
    } catch {}

    // Sort: urgent first, then by date
    notifications.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return 0;
    });

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error: any) {
    console.error("[patient/notifications] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
