export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { analyzeMedicalScreening } from "@/lib/clinical-analysis";
import { sendEmail, emailTemplates } from "@/lib/email";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";
import { getEffectiveUserId, isPreviewRequest } from "@/lib/preview-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = getEffectiveUserId(session, request);
    const userRole = (session.user as any).role;
    const isPreview = isPreviewRequest(session, request);

    // Patients can only view their own screening
    // Therapists/Admins can view any patient's screening
    let screening;

    if (userRole === "PATIENT" || isPreview) {
      screening = await prisma.medicalScreening.findUnique({
        where: { userId },
      });
    } else {
      const patientId = request.nextUrl.searchParams.get("patientId");
      if (patientId) {
        screening = await prisma.medicalScreening.findUnique({
          where: { userId: patientId },
        });
      } else {
        screening = await prisma.medicalScreening.findUnique({
          where: { userId },
        });
      }
    }

    return NextResponse.json({ screening });
  } catch (error) {
    console.error("Error fetching medical screening:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical screening" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Check if screening already exists
    const existingScreening = await prisma.medicalScreening.findUnique({
      where: { userId },
    });

    if (existingScreening) {
      // Patients can always update their own medical information
      // Unlock if previously locked
      // Update existing screening
      const screening = await prisma.medicalScreening.update({
        where: { userId },
        data: {
          unexplainedWeightLoss: body?.unexplainedWeightLoss ?? false,
          nightPain: body?.nightPain ?? false,
          traumaHistory: body?.traumaHistory ?? false,
          neurologicalSymptoms: body?.neurologicalSymptoms ?? false,
          bladderBowelDysfunction: body?.bladderBowelDysfunction ?? false,
          recentInfection: body?.recentInfection ?? false,
          cancerHistory: body?.cancerHistory ?? false,
          steroidUse: body?.steroidUse ?? false,
          osteoporosisRisk: body?.osteoporosisRisk ?? false,
          cardiovascularSymptoms: body?.cardiovascularSymptoms ?? false,
          severeHeadache: body?.severeHeadache ?? false,
          dizzinessBalanceIssues: body?.dizzinessBalanceIssues ?? false,
          currentMedications: body?.currentMedications ?? null,
          allergies: body?.allergies ?? null,
          surgicalHistory: body?.surgicalHistory ?? null,
          otherConditions: body?.otherConditions ?? null,
          gpDetails: body?.gpDetails ?? null,
          emergencyContact: body?.emergencyContact ?? null,
          emergencyContactPhone: body?.emergencyContactPhone ?? null,
          consentGiven: body?.consentGiven ?? false,
          isSubmitted: true,
          isLocked: true,
          editApprovedAt: null,
        } as any,
      });

      return NextResponse.json({
        success: true,
        message: "Medical screening updated successfully",
        screening,
      });
    }

    // Create new screening
    const screening = await prisma.medicalScreening.create({
      data: {
        userId,
        unexplainedWeightLoss: body?.unexplainedWeightLoss ?? false,
        nightPain: body?.nightPain ?? false,
        traumaHistory: body?.traumaHistory ?? false,
        neurologicalSymptoms: body?.neurologicalSymptoms ?? false,
        bladderBowelDysfunction: body?.bladderBowelDysfunction ?? false,
        recentInfection: body?.recentInfection ?? false,
        cancerHistory: body?.cancerHistory ?? false,
        steroidUse: body?.steroidUse ?? false,
        osteoporosisRisk: body?.osteoporosisRisk ?? false,
        cardiovascularSymptoms: body?.cardiovascularSymptoms ?? false,
        severeHeadache: body?.severeHeadache ?? false,
        dizzinessBalanceIssues: body?.dizzinessBalanceIssues ?? false,
        currentMedications: body?.currentMedications ?? null,
        allergies: body?.allergies ?? null,
        surgicalHistory: body?.surgicalHistory ?? null,
        otherConditions: body?.otherConditions ?? null,
        gpDetails: body?.gpDetails ?? null,
        emergencyContact: body?.emergencyContact ?? null,
        emergencyContactPhone: body?.emergencyContactPhone ?? null,
        consentGiven: body?.consentGiven ?? false,
        isSubmitted: true,
        isLocked: true,
      } as any,
    });

    // Send confirmation to patient via preferred channel
    try {
      await notifyPatient({
        patientId: userId,
        emailTemplateSlug: 'SCREENING_RECEIVED',
        emailVars: {
          portalUrl: `${process.env.NEXTAUTH_URL || ''}/dashboard/screening`,
        },
        plainMessage: 'Your medical screening has been received and is being reviewed by our team. Thank you!',
      });
    } catch (emailErr) {
      console.error('[screening] Failed to send confirmation:', emailErr);
    }

    // Analyze screening for red flags
    const analysis = analyzeMedicalScreening(body);

    // If urgent red flags detected, send alert to admin
    if (analysis.redFlagAssessment.status === 'urgent_red_flags') {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'brunotoaz@gmail.com';
        const patientName = `${session.user?.name || 'Patient'}`;
        const flags = analysis.redFlagAssessment.flags.map(f => f.flag);
        const adminUrl = `${process.env.NEXTAUTH_URL}/admin/patients/${userId}`;

        await sendEmail({
          to: adminEmail,
          subject: `🚩 HIGH RISK ALERT: ${patientName}`,
          html: emailTemplates.highRiskAlert(patientName, flags, adminUrl),
        });
      } catch (err) {
        console.error("Failed to send high-risk alert email:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Medical screening submitted successfully",
      screening,
      analysis, // Return analysis to frontend as well
    });
  } catch (error) {
    console.error("Error saving medical screening:", error);
    return NextResponse.json(
      { error: "Failed to save medical screening" },
      { status: 500 }
    );
  }
}
