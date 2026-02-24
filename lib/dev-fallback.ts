/**
 * Development Fallback Layer
 * 
 * When the remote database is unreachable from local dev,
 * this module provides mock data so all admin features can be tested locally.
 * 
 * Only active when NODE_ENV !== "production".
 */

import { NextResponse } from "next/server";

export function isDbUnreachableError(error: any): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const msg = error?.message || "";
  return (
    msg.includes("Can't reach database") ||
    msg.includes("Timed out") ||
    msg.includes("connection pool") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("connect ECONNREFUSED")
  );
}

// ─── Mock Patients ───────────────────────────────────────────────
export const MOCK_PATIENTS = [
  {
    id: "pat-001",
    firstName: "Ana",
    lastName: "Silva",
    email: "ana.silva@example.com",
    phone: "+44 7700 100001",
    dateOfBirth: "1990-03-15",
    gender: "Female",
    address: "12 Richmond Road, London, TW10 6RE",
    emergencyContact: "Carlos Silva - +44 7700 200001",
    notes: "Knee rehabilitation post-ACL surgery. Good progress.",
    isActive: true,
    createdAt: "2025-11-10T09:00:00Z",
    medicalScreening: [{ id: "ms-001", consentGiven: true }],
    patientAppointments: [
      { id: "apt-001", dateTime: "2026-02-14T10:30:00Z", status: "CONFIRMED" },
      { id: "apt-002", dateTime: "2026-02-10T14:00:00Z", status: "COMPLETED" },
    ],
  },
  {
    id: "pat-002",
    firstName: "João",
    lastName: "Pereira",
    email: "joao.pereira@example.com",
    phone: "+44 7700 100002",
    dateOfBirth: "1985-07-22",
    gender: "Male",
    address: "45 Kew Gardens, London, TW9 3AB",
    emergencyContact: "Maria Pereira - +44 7700 200002",
    notes: "Post-surgical shoulder rehabilitation. Requires careful progression.",
    isActive: true,
    createdAt: "2025-12-05T10:00:00Z",
    medicalScreening: [{ id: "ms-002", consentGiven: true }],
    patientAppointments: [
      { id: "apt-003", dateTime: "2026-02-13T11:45:00Z", status: "CONFIRMED" },
    ],
  },
  {
    id: "pat-003",
    firstName: "Maria",
    lastName: "Santos",
    email: "maria.santos@example.com",
    phone: "+44 7700 100003",
    dateOfBirth: "1978-01-30",
    gender: "Female",
    address: "88 Thames Street, Richmond, TW10 1AA",
    emergencyContact: "Pedro Santos - +44 7700 200003",
    notes: "Chronic lower back pain. Sedentary lifestyle, needs posture correction.",
    isActive: true,
    createdAt: "2026-01-15T14:00:00Z",
    medicalScreening: [{ id: "ms-003", consentGiven: true }],
    patientAppointments: [
      { id: "apt-004", dateTime: "2026-02-15T14:00:00Z", status: "PENDING" },
    ],
  },
  {
    id: "pat-004",
    firstName: "Carlos",
    lastName: "Oliveira",
    email: "carlos.oliveira@example.com",
    phone: "+44 7700 100004",
    dateOfBirth: "1995-09-12",
    gender: "Male",
    address: "5 Hill Rise, Richmond, TW10 6UB",
    emergencyContact: "Lucia Oliveira - +44 7700 200004",
    notes: "Sports injury - ankle sprain. Athlete, needs quick recovery protocol.",
    isActive: true,
    createdAt: "2026-01-20T11:00:00Z",
    medicalScreening: [],
    patientAppointments: [
      { id: "apt-005", dateTime: "2026-02-12T09:00:00Z", status: "COMPLETED" },
      { id: "apt-006", dateTime: "2026-02-16T09:00:00Z", status: "CONFIRMED" },
    ],
  },
  {
    id: "pat-005",
    firstName: "Beatriz",
    lastName: "Costa",
    email: "beatriz.costa@example.com",
    phone: "+44 7700 100005",
    dateOfBirth: "2001-05-08",
    gender: "Female",
    address: "22 Sheen Lane, London, SW14 8LW",
    emergencyContact: "Roberto Costa - +44 7700 200005",
    notes: "Scoliosis management. Young patient, postural education required.",
    isActive: true,
    createdAt: "2026-02-01T16:00:00Z",
    medicalScreening: [{ id: "ms-005", consentGiven: false }],
    patientAppointments: [],
  },
  {
    id: "pat-006",
    firstName: "Ricardo",
    lastName: "Lima",
    email: "ricardo.lima@example.com",
    phone: "+44 7700 100006",
    dateOfBirth: "1970-11-25",
    gender: "Male",
    address: "10 Paradise Road, Richmond, TW9 1SE",
    emergencyContact: "Elena Lima - +44 7700 200006",
    notes: "Tendinitis in right elbow. Manual worker, occupational considerations.",
    isActive: true,
    createdAt: "2026-02-05T08:00:00Z",
    medicalScreening: [{ id: "ms-006", consentGiven: true }],
    patientAppointments: [
      { id: "apt-007", dateTime: "2026-02-17T16:00:00Z", status: "PENDING" },
    ],
  },
];

// ─── Mock Users (Staff) ──────────────────────────────────────────
export const MOCK_USERS = [
  {
    id: "dev-admin-local",
    email: "admin@bpr.rehab",
    firstName: "Bruno",
    lastName: "Admin",
    phone: "07700 900000",
    role: "ADMIN",
    isActive: true,
    clinicId: "dev-clinic-local",
    canManageUsers: true,
    canManageAppointments: true,
    canManageArticles: true,
    canManageSettings: true,
    canViewAllPatients: true,
    canCreateClinicalNotes: true,
    canManageFootScans: true,
    canManageOrders: true,
    createdAt: "2025-01-01T00:00:00Z",
    _count: { patientAppointments: 45, soapNotesFor: 22 },
  },
  {
    id: "dev-therapist-01",
    email: "therapist@bpr.rehab",
    firstName: "Sarah",
    lastName: "Johnson",
    phone: "07700 900001",
    role: "THERAPIST",
    isActive: true,
    clinicId: "dev-clinic-local",
    canManageUsers: false,
    canManageAppointments: true,
    canManageArticles: false,
    canManageSettings: false,
    canViewAllPatients: true,
    canCreateClinicalNotes: true,
    canManageFootScans: true,
    canManageOrders: false,
    createdAt: "2025-06-15T00:00:00Z",
    _count: { patientAppointments: 30, soapNotesFor: 18 },
  },
];

// ─── Mock Appointments ───────────────────────────────────────────
export const MOCK_APPOINTMENTS = [
  {
    id: "apt-001",
    dateTime: "2026-02-14T10:30:00Z",
    endTime: "2026-02-14T11:30:00Z",
    status: "CONFIRMED",
    treatmentType: "Physiotherapy - Knee Rehab",
    notes: "Continue ROM exercises, progress to resistance.",
    clinicId: "dev-clinic-local",
    patient: { id: "pat-001", firstName: "Ana", lastName: "Silva", email: "ana.silva@example.com" },
    therapist: { id: "dev-admin-local", firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-01T09:00:00Z",
  },
  {
    id: "apt-003",
    dateTime: "2026-02-13T11:45:00Z",
    endTime: "2026-02-13T12:45:00Z",
    status: "CONFIRMED",
    treatmentType: "Post-Surgical Rehabilitation",
    notes: "Shoulder mobility assessment. Careful with external rotation.",
    clinicId: "dev-clinic-local",
    patient: { id: "pat-002", firstName: "João", lastName: "Pereira", email: "joao.pereira@example.com" },
    therapist: { id: "dev-admin-local", firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-02T10:00:00Z",
  },
  {
    id: "apt-004",
    dateTime: "2026-02-15T14:00:00Z",
    endTime: "2026-02-15T15:00:00Z",
    status: "PENDING",
    treatmentType: "Initial Consultation",
    notes: "First visit - full assessment needed.",
    clinicId: "dev-clinic-local",
    patient: { id: "pat-003", firstName: "Maria", lastName: "Santos", email: "maria.santos@example.com" },
    therapist: { id: "dev-admin-local", firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-05T14:00:00Z",
  },
  {
    id: "apt-005",
    dateTime: "2026-02-12T09:00:00Z",
    endTime: "2026-02-12T10:00:00Z",
    status: "COMPLETED",
    treatmentType: "Sports Injury - Ankle",
    notes: "RICE protocol complete. Ready for progressive loading.",
    clinicId: "dev-clinic-local",
    patient: { id: "pat-004", firstName: "Carlos", lastName: "Oliveira", email: "carlos.oliveira@example.com" },
    therapist: { id: "dev-therapist-01", firstName: "Sarah", lastName: "Johnson" },
    createdAt: "2026-02-08T09:00:00Z",
  },
  {
    id: "apt-006",
    dateTime: "2026-02-16T09:00:00Z",
    endTime: "2026-02-16T10:00:00Z",
    status: "CONFIRMED",
    treatmentType: "Sports Injury - Follow Up",
    notes: "Progress check, introduce proprioceptive exercises.",
    clinicId: "dev-clinic-local",
    patient: { id: "pat-004", firstName: "Carlos", lastName: "Oliveira", email: "carlos.oliveira@example.com" },
    therapist: { id: "dev-therapist-01", firstName: "Sarah", lastName: "Johnson" },
    createdAt: "2026-02-10T09:00:00Z",
  },
  {
    id: "apt-007",
    dateTime: "2026-02-17T16:00:00Z",
    endTime: "2026-02-17T17:00:00Z",
    status: "PENDING",
    treatmentType: "Tendinitis Treatment",
    notes: "Elbow assessment + TENS trial.",
    clinicId: "dev-clinic-local",
    patient: { id: "pat-006", firstName: "Ricardo", lastName: "Lima", email: "ricardo.lima@example.com" },
    therapist: { id: "dev-admin-local", firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-11T16:00:00Z",
  },
];

// ─── Mock Articles ───────────────────────────────────────────────
export const MOCK_ARTICLES = [
  {
    id: "art-001",
    title: "Understanding ACL Rehabilitation: A Complete Guide",
    slug: "understanding-acl-rehabilitation",
    content: "ACL rehabilitation is a structured process that typically spans 6-12 months...",
    excerpt: "A comprehensive guide to ACL rehabilitation timelines and milestones.",
    published: true,
    imageUrl: null,
    clinicId: "dev-clinic-local",
    authorId: "dev-admin-local",
    author: { firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "art-002",
    title: "The Benefits of Microcurrent Therapy (MENS)",
    slug: "benefits-microcurrent-therapy",
    content: "Microcurrent therapy uses extremely low-level electrical currents...",
    excerpt: "Discover how microcurrent therapy accelerates tissue healing.",
    published: true,
    imageUrl: null,
    clinicId: "dev-clinic-local",
    authorId: "dev-admin-local",
    author: { firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-01-20T14:00:00Z",
    updatedAt: "2026-01-20T14:00:00Z",
  },
  {
    id: "art-003",
    title: "Posture Correction: Why It Matters",
    slug: "posture-correction-why-it-matters",
    content: "Poor posture is one of the most common causes of chronic pain...",
    excerpt: "Learn about the long-term impact of posture on your health.",
    published: false,
    imageUrl: null,
    clinicId: "dev-clinic-local",
    authorId: "dev-admin-local",
    author: { firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-02-01T09:00:00Z",
  },
];

// ─── Mock SOAP Notes ─────────────────────────────────────────────
export const MOCK_SOAP_NOTES = [
  {
    id: "soap-001",
    subjective: "Patient reports improvement in knee ROM. Pain reduced from 6/10 to 3/10. Able to walk without crutches for short distances.",
    objective: "Knee flexion 110°, extension -5°. Quad strength 4/5. Mild swelling still present. Gait pattern improving.",
    assessment: "Good progress post-ACL reconstruction. On track for 12-week milestone. Ready to progress strengthening programme.",
    plan: "1. Progress quad strengthening to closed chain. 2. Begin balance board exercises. 3. Continue ice post-session. 4. Review in 1 week.",
    clinicId: "dev-clinic-local",
    patientId: "pat-001",
    therapistId: "dev-admin-local",
    patient: { id: "pat-001", firstName: "Ana", lastName: "Silva" },
    therapist: { id: "dev-admin-local", firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-10T14:30:00Z",
    updatedAt: "2026-02-10T14:30:00Z",
  },
  {
    id: "soap-002",
    subjective: "Patient reports difficulty sleeping due to shoulder pain. Night pain persistent. Cannot reach overhead.",
    objective: "Shoulder flexion 90°, abduction 80°. External rotation limited to 20°. Tenderness over anterior capsule.",
    assessment: "Post-surgical shoulder. Recovery slower than expected. Capsular tightness limiting progress.",
    plan: "1. Gentle mobilisation grades 1-2. 2. Pendulum exercises x3 daily. 3. Consider referral for review if no improvement in 2 weeks.",
    clinicId: "dev-clinic-local",
    patientId: "pat-002",
    therapistId: "dev-admin-local",
    patient: { id: "pat-002", firstName: "João", lastName: "Pereira" },
    therapist: { id: "dev-admin-local", firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-11T12:00:00Z",
    updatedAt: "2026-02-11T12:00:00Z",
  },
];

// ─── Mock Foot Scans ─────────────────────────────────────────────
export const MOCK_FOOT_SCANS = [
  {
    id: "scan-001",
    scanNumber: "FS-2026-00001",
    status: "COMPLETED",
    notes: "Bilateral flat foot. Recommend custom orthotics.",
    clinicId: "dev-clinic-local",
    patientId: "pat-001",
    therapistId: "dev-admin-local",
    patient: { id: "pat-001", firstName: "Ana", lastName: "Silva" },
    therapist: { id: "dev-admin-local", firstName: "Bruno", lastName: "Admin" },
    createdAt: "2026-02-08T10:00:00Z",
    updatedAt: "2026-02-08T10:00:00Z",
  },
];

// ─── Mock Settings ───────────────────────────────────────────────
export const MOCK_SETTINGS = {
  id: "settings-dev",
  siteName: "Bruno Physical Rehabilitation",
  tagline: "Where Innovation Meets Care",
  logoUrl: null,
  logoPath: null,
  heroTitle: "Your Recovery, Our Priority",
  heroSubtitle: "Expert Physical Rehabilitation & Sports Therapy in Richmond, UK. Specialising in advanced recovery techniques and personalised treatment plans.",
  heroImageUrl: null,
  heroImagePath: null,
  heroCTA: "Book Appointment",
  heroCTALink: "/signup",
  portalTitle: "Your Rehabilitation Portal",
  portalSubtitle: "Access your personalized treatment plan",
  portalText: "Manage your appointments, view clinical notes, track your progress, and communicate with your therapist all in one secure platform.",
  servicesTitle: "I Specialise In...",
  servicesSubtitle: "Professional treatments for your recovery",
  servicesJson: JSON.stringify([
    { id: "1", title: "Kinesiotherapy", description: "Movement-based therapy for rehabilitation and recovery" },
    { id: "2", title: "MENS Therapy", description: "Microcurrent electrical neuromuscular stimulation" },
    { id: "3", title: "Laser Therapy", description: "Low-level laser treatment for tissue healing" },
    { id: "4", title: "Shockwave Therapy", description: "Acoustic waves for musculoskeletal conditions" },
    { id: "5", title: "EMS Treatment", description: "Electrical muscle stimulation for recovery" },
    { id: "6", title: "Therapeutic Ultrasound", description: "Deep tissue treatment with sound waves" },
  ]),
  aboutTitle: "About Bruno",
  aboutText: "My name is Bruno, and I'm a therapist based in the UK with a strong foundation in physical rehabilitation, sports recovery, and human performance.\n\nBefore becoming a therapist, I lived the journey many of my clients now face. I was a professional footballer for over a decade, playing in Brazil, Germany, and Sweden. After undergoing three major knee surgeries, I understand firsthand the physical and emotional challenges of rehabilitation.\n\nThis personal experience drives my passion for helping others recover, rebuild, and return to their best selves.",
  aboutImageUrl: null,
  aboutImagePath: null,
  articlesTitle: "Stay Informed. Stay Empowered",
  articlesSubtitle: "Latest insights and tips from our physiotherapy blog",
  articlesPlaceholderTitle: "Articles Coming Soon",
  articlesPlaceholderText: "We're working on bringing you valuable content about physiotherapy, rehabilitation techniques, and wellness tips. Stay tuned!",
  contactTitle: "Get in Touch",
  contactSubtitle: "We're here to help",
  contactText: "Have questions about our services? Ready to book your first appointment? Feel free to reach out to us.",
  phone: "+44 7XXX XXXXXX",
  email: "admin@bpr.rehab",
  address: "Richmond, London, UK",
  footerText: "© 2026 Bruno Physical Rehabilitation. All rights reserved.",
  footerLinksJson: JSON.stringify([]),
  socialLinksJson: JSON.stringify([]),
  navigationJson: null,
  metaTitle: "Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond",
  metaDescription: "Professional physiotherapy and sports rehabilitation services in Richmond, London.",
  metaKeywords: "physiotherapy, sports rehabilitation, Richmond, London",
  ogImageUrl: null,
  ogImagePath: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2026-02-12T00:00:00Z",
};

// ─── Mock Clinical Notes ─────────────────────────────────────────
export const MOCK_CLINICAL_NOTES = MOCK_SOAP_NOTES;

// ─── Helper: wrap API handler with DB fallback ───────────────────
export function devFallbackResponse(mockData: any, status = 200) {
  console.warn("[DEV-FALLBACK] Remote DB unreachable — returning mock data");
  return NextResponse.json(mockData, { status });
}
