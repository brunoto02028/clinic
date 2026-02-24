import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { analyzeMedicalScreening, ClinicalAnalysis } from '@/lib/clinical-analysis';
import { MedicalScreeningForm } from '@/lib/types';

/**
 * GET /api/medical-screening/analyze?patientId=xxx
 * 
 * Analyzes a patient's medical screening data and returns:
 * - Risk score and urgency level
 * - Clinical summary and triage classification
 * - Red flag assessment
 * - Modality safety gating (which treatments are safe/require precautions)
 * - Targeted follow-up questions
 * - Session planning suggestions
 * 
 * Access: Admin and Therapist only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userRole = (session.user as { role?: string })?.role;
    
    // Only admins and therapists can access clinical analysis
    if (userRole !== 'ADMIN' && userRole !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'Access denied. Clinical analysis is for staff only.' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch patient with medical screening
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        medicalScreening: true,
      },
    });
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    if (!patient.medicalScreening) {
      return NextResponse.json(
        { error: 'Patient has not completed medical screening yet' },
        { status: 400 }
      );
    }
    
    // Convert database model to MedicalScreeningForm
    const screeningData: MedicalScreeningForm = {
      unexplainedWeightLoss: patient.medicalScreening.unexplainedWeightLoss,
      nightPain: patient.medicalScreening.nightPain,
      traumaHistory: patient.medicalScreening.traumaHistory,
      neurologicalSymptoms: patient.medicalScreening.neurologicalSymptoms,
      bladderBowelDysfunction: patient.medicalScreening.bladderBowelDysfunction,
      recentInfection: patient.medicalScreening.recentInfection,
      cancerHistory: patient.medicalScreening.cancerHistory,
      steroidUse: patient.medicalScreening.steroidUse,
      osteoporosisRisk: patient.medicalScreening.osteoporosisRisk,
      cardiovascularSymptoms: patient.medicalScreening.cardiovascularSymptoms,
      severeHeadache: patient.medicalScreening.severeHeadache,
      dizzinessBalanceIssues: patient.medicalScreening.dizzinessBalanceIssues,
      currentMedications: patient.medicalScreening.currentMedications || '',
      allergies: patient.medicalScreening.allergies || '',
      surgicalHistory: patient.medicalScreening.surgicalHistory || '',
      otherConditions: patient.medicalScreening.otherConditions || '',
      gpDetails: patient.medicalScreening.gpDetails || '',
      emergencyContact: patient.medicalScreening.emergencyContact || '',
      emergencyContactPhone: patient.medicalScreening.emergencyContactPhone || '',
      consentGiven: patient.medicalScreening.consentGiven,
    };
    
    // Perform clinical analysis
    const analysis: ClinicalAnalysis = analyzeMedicalScreening(screeningData);
    
    return NextResponse.json({
      success: true,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      screeningCompletedAt: patient.medicalScreening.createdAt,
      analysis,
    });
    
  } catch (error) {
    console.error('Error analyzing medical screening:', error);
    return NextResponse.json(
      { error: 'Failed to analyze medical screening' },
      { status: 500 }
    );
  }
}
