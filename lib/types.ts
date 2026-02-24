import { UserRole, AppointmentStatus, PaymentStatus } from "@prisma/client";

export type { UserRole, AppointmentStatus, PaymentStatus };

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface AppointmentWithRelations {
  id: string;
  patientId: string;
  therapistId: string;
  dateTime: Date;
  duration: number;
  treatmentType: string;
  status: AppointmentStatus;
  notes: string | null;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  therapist: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  payment: {
    id: string;
    status: PaymentStatus;
    amount: number;
  } | null;
  soapNote: {
    id: string;
  } | null;
}

export interface SOAPNoteWithRelations {
  id: string;
  appointmentId: string;
  patientId: string;
  therapistId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  painLevel: number | null;
  rangeOfMotion: string | null;
  functionalTests: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointment: {
    dateTime: Date;
    treatmentType: string;
  };
  patient: {
    firstName: string;
    lastName: string;
    email: string;
  };
  therapist: {
    firstName: string;
    lastName: string;
  };
}

export interface MedicalScreeningForm {
  unexplainedWeightLoss: boolean;
  nightPain: boolean;
  traumaHistory: boolean;
  neurologicalSymptoms: boolean;
  bladderBowelDysfunction: boolean;
  recentInfection: boolean;
  cancerHistory: boolean;
  steroidUse: boolean;
  osteoporosisRisk: boolean;
  cardiovascularSymptoms: boolean;
  severeHeadache: boolean;
  dizzinessBalanceIssues: boolean;
  currentMedications: string;
  allergies: string;
  surgicalHistory: string;
  otherConditions: string;
  gpDetails: string;
  emergencyContact: string;
  emergencyContactPhone: string;
  consentGiven: boolean;
}

export interface TreatmentOption {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export const TREATMENT_OPTIONS: TreatmentOption[] = [
  {
    id: "initial-assessment",
    name: "Initial Assessment",
    description: "Comprehensive first consultation including full medical history, physical examination, and treatment plan development.",
    duration: 60,
    price: 75,
  },
  {
    id: "follow-up",
    name: "Follow-up Treatment",
    description: "Standard follow-up session for ongoing rehabilitation and treatment progression.",
    duration: 45,
    price: 60,
  },
  {
    id: "sports-massage",
    name: "Sports Massage Therapy",
    description: "Deep tissue massage targeting specific muscle groups for injury prevention and recovery.",
    duration: 45,
    price: 55,
  },
  {
    id: "electrotherapy",
    name: "Electrotherapy Session",
    description: "Advanced electrotherapy treatment including TENS, EMS, or ultrasound therapy.",
    duration: 30,
    price: 50,
  },
  {
    id: "shockwave",
    name: "Shockwave Therapy",
    description: "High-energy acoustic wave treatment for chronic conditions and accelerated healing.",
    duration: 30,
    price: 70,
  },
  {
    id: "rehabilitation",
    name: "Rehabilitation Programme",
    description: "Structured exercise-based rehabilitation session with personalised programme development.",
    duration: 60,
    price: 65,
  },
];
