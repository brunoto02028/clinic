import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Default patient portal configuration
const DEFAULT_CONFIG = {
  welcomeTitle: "Welcome Back",
  welcomeSubtitle: "Manage your appointments and track your rehabilitation progress.",
  modules: [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Overview of your appointments, records and screening status",
      icon: "LayoutDashboard",
      href: "/dashboard",
      enabled: true,
      order: 0,
    },
    {
      id: "appointments",
      label: "Appointments",
      description: "View and manage your upcoming and past appointments",
      icon: "Calendar",
      href: "/dashboard/appointments",
      enabled: true,
      order: 1,
    },
    {
      id: "scans",
      label: "Foot Scans",
      description: "Manage your foot scan sessions and view results",
      icon: "Footprints",
      href: "/dashboard/scans",
      enabled: true,
      order: 2,
    },
    {
      id: "records",
      label: "My Records",
      description: "Access your treatment history and clinical notes",
      icon: "FileText",
      href: "/dashboard/records",
      enabled: true,
      order: 3,
    },
    {
      id: "screening",
      label: "Medical Screening",
      description: "Complete your medical screening form for safe treatment",
      icon: "Shield",
      href: "/dashboard/screening",
      enabled: true,
      order: 4,
    },
    {
      id: "exercises",
      label: "My Exercises",
      description: "View and complete your prescribed exercises with video guidance",
      icon: "Dumbbell",
      href: "/dashboard/exercises",
      enabled: true,
      order: 5,
    },
    {
      id: "body-assessments",
      label: "Body Assessment",
      description: "View your biomechanical and posture assessment results",
      icon: "Activity",
      href: "/dashboard/body-assessments",
      enabled: true,
      order: 6,
    },
    {
      id: "treatment",
      label: "Treatment Plan",
      description: "Follow your personalised treatment protocol and track progress",
      icon: "Heart",
      href: "/dashboard/treatment",
      enabled: true,
      order: 7,
    },
    {
      id: "documents",
      label: "My Documents",
      description: "Upload and view your medical documents, referrals and reports",
      icon: "FileUp",
      href: "/dashboard/documents",
      enabled: true,
      order: 8,
    },
    {
      id: "blood-pressure",
      label: "Blood Pressure",
      description: "Track your blood pressure readings and measure with your phone camera",
      icon: "HeartPulse",
      href: "/dashboard/blood-pressure",
      enabled: true,
      order: 9,
    },
    {
      id: "education",
      label: "Education",
      description: "Access educational content, articles and health tips",
      icon: "GraduationCap",
      href: "/dashboard/education",
      enabled: true,
      order: 10,
    },
    {
      id: "clinical-notes",
      label: "Clinical Notes",
      description: "View clinical notes from your sessions",
      icon: "ClipboardList",
      href: "/dashboard/clinical-notes",
      enabled: true,
      order: 11,
    },
    {
      id: "profile",
      label: "My Profile",
      description: "View and edit your personal information and preferences",
      icon: "User",
      href: "/dashboard/profile",
      enabled: true,
      order: 12,
    },
    {
      id: "membership",
      label: "Plans & Membership",
      description: "View available plans and manage your subscription",
      icon: "CreditCard",
      href: "/dashboard/membership",
      enabled: true,
      order: 13,
    },
    {
      id: "consent",
      label: "Terms & Consent",
      description: "Accept terms of use and privacy policy",
      icon: "Scale",
      href: "/dashboard/consent",
      enabled: true,
      order: 14,
    },
    {
      id: "journey",
      label: "BPR Journey",
      description: "Your rehabilitation journey milestones and progress",
      icon: "Map",
      href: "/dashboard/journey",
      enabled: true,
      order: 15,
      group: "journey",
    },
    {
      id: "community",
      label: "Community",
      description: "Connect with other patients and share experiences",
      icon: "Trophy",
      href: "/dashboard/community",
      enabled: true,
      order: 16,
      group: "journey",
    },
    {
      id: "marketplace",
      label: "Marketplace",
      description: "Browse rehabilitation products, insoles and accessories",
      icon: "ShoppingCart",
      href: "/dashboard/marketplace",
      enabled: false,
      order: 17,
      group: "journey",
    },
  ],
  quickActions: [
    {
      id: "book",
      title: "Book Appointment",
      description: "Schedule your next physiotherapy or sports therapy session at a time that works for you.",
      buttonText: "Book Now",
      buttonLink: "/dashboard/appointments/book",
      icon: "Calendar",
      enabled: true,
    },
    {
      id: "records",
      title: "View Records",
      description: "Access your treatment history, clinical notes, and track your rehabilitation progress.",
      buttonText: "View Records",
      buttonLink: "/dashboard/records",
      icon: "FileText",
      enabled: true,
    },
    {
      id: "treatment",
      title: "Treatment Plan",
      description: "View your personalised treatment protocol, complete exercises and track your rehabilitation journey.",
      buttonText: "View Plan",
      buttonLink: "/dashboard/treatment",
      icon: "Heart",
      enabled: true,
    },
    {
      id: "body-assessment",
      title: "Body Assessment",
      description: "Check your latest biomechanical assessment results, posture scores and recommendations.",
      buttonText: "View Assessment",
      buttonLink: "/dashboard/body-assessments",
      icon: "Activity",
      enabled: true,
    },
  ],
  statsCards: [
    {
      id: "upcoming",
      label: "Upcoming",
      sublabel: "Appointments",
      field: "upcomingAppointments",
      icon: "Clock",
      color: "primary",
      enabled: true,
    },
    {
      id: "completed",
      label: "Completed",
      sublabel: "Sessions",
      field: "completedAppointments",
      icon: "CheckCircle",
      color: "emerald",
      enabled: true,
    },
    {
      id: "notes",
      label: "Clinical",
      sublabel: "Notes",
      field: "clinicalNotes",
      icon: "FileText",
      color: "violet",
      enabled: true,
    },
  ],
  showScreeningAlert: true,
  screeningAlertTitle: "Complete Your Medical Screening",
  screeningAlertText: "Please complete the medical screening form before your first appointment. This helps us provide you with the safest and most effective care.",
};

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst({
      select: { patientPortalJson: true },
    });

    if (settings?.patientPortalJson) {
      try {
        const config = JSON.parse(settings.patientPortalJson);
        // Merge any new modules from DEFAULT_CONFIG that aren't in saved config
        const savedHrefs = new Set((config.modules || []).map((m: any) => m.href));
        const missingModules = DEFAULT_CONFIG.modules.filter(m => !savedHrefs.has(m.href));
        if (missingModules.length > 0) {
          const maxOrder = Math.max(0, ...((config.modules || []).map((m: any) => m.order || 0)));
          config.modules = [
            ...(config.modules || []),
            ...missingModules.map((m, i) => ({ ...m, order: maxOrder + 1 + i })),
          ];
        }
        return NextResponse.json(config, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } });
      } catch {
        return NextResponse.json(DEFAULT_CONFIG, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } });
      }
    }

    return NextResponse.json(DEFAULT_CONFIG, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } });
  } catch (error) {
    console.error("Error fetching patient portal config:", error);
    return NextResponse.json(DEFAULT_CONFIG, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "SUPERADMIN" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await request.json();
    const jsonString = JSON.stringify(config);

    // Upsert site settings
    const existing = await prisma.siteSettings.findFirst();
    if (existing) {
      await prisma.siteSettings.update({
        where: { id: existing.id },
        data: { patientPortalJson: jsonString },
      });
    } else {
      await prisma.siteSettings.create({
        data: { patientPortalJson: jsonString },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving patient portal config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
