export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientPrescriptionWhere } from "@/lib/protocol-exercise-gating";
import { getExpectedToday } from "@/lib/patient-daily-adherence";
import { computePatientAccess, PATIENT_ACCESS_SELECT } from "@/lib/patient-access";

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
      select: { isSubmitted: true },
    });
    // isSubmitted, not consentGiven: a patient who finished the form was still
    // being nagged to complete it, because this asked a different question
    // than every other screen.
    if (hasScreening?.isSubmitted !== true) {
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

    // 5. Pending patient tasks (from admin)
    try {
      const pendingTasks = await (prisma as any).patientTask.findMany({
        where: { patientId: userId, status: { in: ["pending", "in_progress"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      for (const task of pendingTasks) {
        const isUrgent = task.priority === "urgent" || task.priority === "high";
        notifications.push({
          id: `task-${task.id}`,
          type: "task",
          title: task.title,
          titlePt: task.titlePt || task.title,
          message: task.description || "Your clinic has requested an action from you.",
          messagePt: task.descriptionPt || "A sua clinica solicitou uma acao.",
          link: task.actionUrl || "/dashboard/tasks",
          icon: "Bell",
          color: isUrgent ? "red" : "violet",
          createdAt: task.createdAt?.toISOString?.() || now.toISOString(),
          isUrgent,
        });
      }
    } catch {}

    // 6. Exercises prescribed but not yet started
    //
    // Grouped into a single row on purpose: a folder of twenty videos would
    // otherwise bury every other notification. It clears itself once the
    // patient completes any one of them, so nothing has to be marked as read.
    try {
      const fresh = await (prisma as any).exercisePrescription.findMany({
        where: {
          patientId: userId,
          isActive: true,
          completedCount: 0,
          ...(await patientPrescriptionWhere(userId)),
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      });
      if (fresh.length > 0) {
        const n = fresh.length;
        notifications.push({
          id: `exercises-${fresh[0].id}`,
          type: "exercise",
          title: n === 1 ? "New exercise to start" : `${n} new exercises to start`,
          titlePt: n === 1 ? "Novo exercício para começar" : `${n} novos exercícios para começar`,
          message: "Your therapist prescribed these for you — each one has a video.",
          // Was "O seu fisioterapeuta prescreveu estes para si" — European
          // Portuguese, and "fisioterapeuta" where the product says
          // "terapeuta" to patients.
          messagePt: "Seu terapeuta prescreveu estes para você — cada um tem vídeo.",
          link: "/dashboard/treatment",
          icon: "Dumbbell",
          color: "emerald",
          createdAt: fresh[0].createdAt?.toISOString?.() || now.toISOString(),
          isUrgent: false,
        });
      }
    } catch {}

    // 7. Today's plan not finished yet (activity 49 — same rule as the
    // "Today" card and the clinic's daily-adherence report, so this notice
    // never disagrees with either).
    try {
      const today = await getExpectedToday(userId, now);
      const remaining = today.expected.length - today.completed.length;
      if (remaining > 0) {
        notifications.push({
          id: `today-pending-${now.toDateString()}`,
          type: "adherence",
          title: remaining === 1 ? "1 activity left today" : `${remaining} activities left today`,
          titlePt: remaining === 1 ? "1 atividade restando hoje" : `${remaining} atividades restando hoje`,
          message: "Skipping days can slow your recovery and increase the risk of complications — a few minutes now makes a real difference.",
          messagePt: "Pular dias pode atrasar sua recuperação e aumentar o risco de complicações — alguns minutos agora fazem toda a diferença.",
          link: "/dashboard/treatment",
          icon: "Activity",
          color: "amber",
          createdAt: now.toISOString(),
          isUrgent: true,
        });
      }
    } catch {}

    // Drop anything the patient's plan does not include. The list was built
    // from the data regardless of access, so a patient whose exercises module
    // was switched off still read "4 new exercises to start" — while the home
    // screen, which does check, said "Not included in your plan". One of the
    // two had to be wrong; it was this one.
    const MODULE_FOR_TYPE: Record<string, string> = {
      exercise: "mod_exercises",
      adherence: "mod_exercises",
      appointment: "mod_appointments",
      screening: "mod_screening",
      task: "mod_tasks",
    };
    try {
      const me = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: PATIENT_ACCESS_SELECT,
      });
      if (me) {
        const access = computePatientAccess({ ...me, role: effective.role });
        const granted = new Set(access.modules);
        for (let i = notifications.length - 1; i >= 0; i--) {
          const key = MODULE_FOR_TYPE[notifications[i].type];
          if (key && !granted.has(key)) notifications.splice(i, 1);
        }
      }
    } catch (e) {
      // Access is a filter, not the source: if it cannot be read, show the
      // notifications rather than silently emptying the list.
      console.error("[patient/notifications] access filter failed:", e);
    }

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
