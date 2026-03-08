export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { analyzeMedicalScreening } from "@/lib/clinical-analysis";
import { sendEmail, emailTemplates } from "@/lib/email";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";
import { getEffectiveUser } from "@/lib/get-effective-user";

export async function GET(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const userRole = effectiveUser.role;
    const isPreview = effectiveUser.isImpersonating;

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
          redFlagDetails: body?.redFlagDetails ?? null,
          // Chief Complaint & Pain
          chiefComplaint: body?.chiefComplaint ?? null,
          painLocation: body?.painLocation ?? null,
          painDuration: body?.painDuration ?? null,
          painScore: body?.painScore ?? null,
          painType: body?.painType ?? null,
          painAggravating: body?.painAggravating ?? null,
          painRelieving: body?.painRelieving ?? null,
          painPattern: body?.painPattern ?? null,
          // Functional Impact
          functionalLimitations: body?.functionalLimitations ?? null,
          sleepAffected: body?.sleepAffected ?? false,
          workAffected: body?.workAffected ?? false,
          mobilityAffected: body?.mobilityAffected ?? false,
          // Patient Background
          occupation: body?.occupation ?? null,
          dominantSide: body?.dominantSide ?? null,
          activityLevel: body?.activityLevel ?? null,
          hobbiesSports: body?.hobbiesSports ?? null,
          // Lifestyle
          smoker: body?.smoker ?? false,
          alcoholUse: body?.alcoholUse ?? null,
          height: body?.height ?? null,
          weight: body?.weight ?? null,
          // Previous Treatment
          previousPhysio: body?.previousPhysio ?? false,
          previousPhysioDetails: body?.previousPhysioDetails ?? null,
          previousInjections: body?.previousInjections ?? false,
          previousInjectionsDetails: body?.previousInjectionsDetails ?? null,
          currentlyUnderCare: body?.currentlyUnderCare ?? false,
          currentlyUnderCareDetails: body?.currentlyUnderCareDetails ?? null,
          // Goals
          treatmentGoals: body?.treatmentGoals ?? null,
          returnToSport: body?.returnToSport ?? false,
          returnToWork: body?.returnToWork ?? false,
          // Medical History
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

      // Notify admin that patient updated their screening
      try {
        const patient = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : (session.user?.name || 'Patient');
        const adminEmail = process.env.ADMIN_EMAIL || 'brunotoaz@gmail.com';
        const adminUrl = `${process.env.NEXTAUTH_URL || 'https://bpr.rehab'}/admin/patients/${userId}`;
        const complaint = body?.chiefComplaint || 'Not specified';
        const painScore = body?.painScore != null ? `${body.painScore}/10` : 'N/A';

        await sendEmail({
          to: adminEmail,
          subject: `📋 Screening Submitted: ${patientName}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;">
              <h2 style="color:#607d7d;font-size:20px;margin:0 0 16px;">Assessment Screening Submitted</h2>
              <p style="color:#374151;font-size:15px;margin:0 0 16px;"><strong>${patientName}</strong> has completed their assessment screening.</p>
              <div style="background:#f0fdf9;border:1px solid #d1fae5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:120px;">Chief Complaint</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${complaint}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Pain Score</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${painScore}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Type</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">Updated screening</td></tr>
                </table>
              </div>
              <div style="text-align:center;margin:20px 0;">
                <a href="${adminUrl}" style="display:inline-block;background:linear-gradient(135deg,#5dc9c0 0%,#4db8b0 100%);color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Patient Profile →</a>
              </div>
            </div>
          `,
        });
      } catch (notifErr) {
        console.error('[screening] Failed to notify admin on update:', notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Screening updated successfully",
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
        redFlagDetails: body?.redFlagDetails ?? null,
        // Chief Complaint & Pain
        chiefComplaint: body?.chiefComplaint ?? null,
        painLocation: body?.painLocation ?? null,
        painDuration: body?.painDuration ?? null,
        painScore: body?.painScore ?? null,
        painType: body?.painType ?? null,
        painAggravating: body?.painAggravating ?? null,
        painRelieving: body?.painRelieving ?? null,
        painPattern: body?.painPattern ?? null,
        // Functional Impact
        functionalLimitations: body?.functionalLimitations ?? null,
        sleepAffected: body?.sleepAffected ?? false,
        workAffected: body?.workAffected ?? false,
        mobilityAffected: body?.mobilityAffected ?? false,
        // Patient Background
        occupation: body?.occupation ?? null,
        dominantSide: body?.dominantSide ?? null,
        activityLevel: body?.activityLevel ?? null,
        hobbiesSports: body?.hobbiesSports ?? null,
        // Lifestyle
        smoker: body?.smoker ?? false,
        alcoholUse: body?.alcoholUse ?? null,
        height: body?.height ?? null,
        weight: body?.weight ?? null,
        // Previous Treatment
        previousPhysio: body?.previousPhysio ?? false,
        previousPhysioDetails: body?.previousPhysioDetails ?? null,
        previousInjections: body?.previousInjections ?? false,
        previousInjectionsDetails: body?.previousInjectionsDetails ?? null,
        currentlyUnderCare: body?.currentlyUnderCare ?? false,
        currentlyUnderCareDetails: body?.currentlyUnderCareDetails ?? null,
        // Goals
        treatmentGoals: body?.treatmentGoals ?? null,
        returnToSport: body?.returnToSport ?? false,
        returnToWork: body?.returnToWork ?? false,
        // Medical History
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
        plainMessage: 'Your assessment screening has been received and is being reviewed by our team. Thank you!',
        plainMessagePt: 'Sua triagem de avaliação foi recebida e está sendo revisada pela nossa equipe. Obrigado!',
      });
    } catch (emailErr) {
      console.error('[screening] Failed to send confirmation:', emailErr);
    }

    // Analyze screening for red flags
    const analysis = analyzeMedicalScreening(body);

    // Notify admin that a new screening was submitted
    try {
      const patient = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
      const patientName = patient ? `${patient.firstName} ${patient.lastName}` : (session.user?.name || 'Patient');
      const adminEmail = process.env.ADMIN_EMAIL || 'brunotoaz@gmail.com';
      const adminUrl = `${process.env.NEXTAUTH_URL || 'https://bpr.rehab'}/admin/patients/${userId}`;
      const complaint = body?.chiefComplaint || 'Not specified';
      const painScore = body?.painScore != null ? `${body.painScore}/10` : 'N/A';
      const hasRedFlags = analysis.redFlagAssessment.status === 'urgent_red_flags';
      const flagsList = hasRedFlags ? analysis.redFlagAssessment.flags.map((f: any) => f.flag) : [];
      const redFlagHtml = hasRedFlags
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:0 0 16px;">
             <p style="color:#dc2626;font-weight:700;margin:0 0 4px;">🚩 Red Flags Detected</p>
             <ul style="margin:0;padding-left:20px;color:#991b1b;font-size:13px;">${flagsList.map((f: string) => `<li>${f}</li>`).join('')}</ul>
           </div>`
        : '';

      await sendEmail({
        to: adminEmail,
        subject: hasRedFlags
          ? `🚩 Screening Submitted (RED FLAGS): ${patientName}`
          : `📋 Screening Submitted: ${patientName}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#607d7d;font-size:20px;margin:0 0 16px;">New Assessment Screening</h2>
            <p style="color:#374151;font-size:15px;margin:0 0 16px;"><strong>${patientName}</strong> has completed their assessment screening.</p>
            ${redFlagHtml}
            <div style="background:#f0fdf9;border:1px solid #d1fae5;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:120px;">Chief Complaint</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${complaint}</td></tr>
                <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Pain Score</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${painScore}</td></tr>
                <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Risk Level</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${analysis.urgencyLevel || 'Normal'}</td></tr>
              </table>
            </div>
            <div style="text-align:center;margin:20px 0;">
              <a href="${adminUrl}" style="display:inline-block;background:linear-gradient(135deg,#5dc9c0 0%,#4db8b0 100%);color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Patient Profile →</a>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error('[screening] Failed to notify admin:', err);
    }

    return NextResponse.json({
      success: true,
      message: "Screening submitted successfully",
      screening,
      analysis, // Return analysis to frontend as well
    });
  } catch (error) {
    console.error("Error saving medical screening:", error);
    return NextResponse.json(
      { error: "Failed to save screening" },
      { status: 500 }
    );
  }
}
