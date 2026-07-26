import {
  Home,
  Calendar,
  Stethoscope,
  Dumbbell,
  BookOpen,
  User,
  MessageCircleQuestion,
  type LucideIcon,
} from "lucide-react";

export interface PatientSection {
  key: string;
  label: string;
  labelPt: string;
  icon: LucideIcon;
  href: string;
  matchRoutes: string[];
}

export const PATIENT_SECTIONS: PatientSection[] = [
  {
    key: "home",
    label: "Home",
    labelPt: "Inicio",
    icon: Home,
    href: "/dashboard",
    matchRoutes: ["/dashboard"],
  },
  {
    key: "appointments",
    label: "Appointments",
    labelPt: "Consultas",
    icon: Calendar,
    href: "/dashboard/appointments",
    matchRoutes: [
      "/dashboard/appointments",
      "/dashboard/screening",
      "/dashboard/consent",
      "/dashboard/assessment-flow",
      "/dashboard/waitlist",
    ],
  },
  {
    key: "health",
    label: "My Health",
    labelPt: "Minha Saude",
    icon: Stethoscope,
    href: "/dashboard/clinical-notes",
    matchRoutes: [
      "/dashboard/clinical-notes",
      "/dashboard/treatment",
      "/dashboard/plans",
      "/dashboard/documents",
      "/dashboard/records",
      "/dashboard/outcome-measures",
      "/dashboard/follow-up",
    ],
  },
  {
    key: "exercises",
    label: "Exercises",
    labelPt: "Exercicios",
    icon: Dumbbell,
    href: "/dashboard/exercises",
    matchRoutes: [
      "/dashboard/exercises",
      "/dashboard/tasks",
      "/dashboard/journey",
      "/dashboard/achievements",
      "/dashboard/quizzes",
      "/dashboard/quiz",
    ],
  },
  {
    key: "learn",
    label: "Learn",
    labelPt: "Aprender",
    icon: BookOpen,
    href: "/dashboard/education",
    matchRoutes: [
      "/dashboard/education",
      "/dashboard/guide",
      "/dashboard/community",
    ],
  },
  {
    key: "questions",
    label: "Messages",
    labelPt: "Mensagens",
    icon: MessageCircleQuestion,
    href: "/dashboard/questions",
    matchRoutes: ["/dashboard/questions"],
  },
];

export const PATIENT_PROFILE_SECTION: PatientSection = {
  key: "profile",
  label: "My Profile",
  labelPt: "Meu Perfil",
  icon: User,
  href: "/dashboard/profile",
  matchRoutes: [
    "/dashboard/profile",
    "/dashboard/membership",
    "/dashboard/marketplace",
    "/dashboard/recordings",
  ],
};

export function getActivePatientSection(pathname: string): PatientSection {
  const clean = pathname.replace(/\/$/, "") || "/dashboard";

  if (clean === "/dashboard") {
    return PATIENT_SECTIONS[0];
  }

  if (
    PATIENT_PROFILE_SECTION.matchRoutes.some(
      (r) => clean === r || clean.startsWith(r + "/")
    )
  ) {
    return PATIENT_PROFILE_SECTION;
  }

  for (const section of [...PATIENT_SECTIONS].reverse()) {
    if (section.key === "home") continue;
    if (
      section.matchRoutes.some(
        (r) => clean === r || clean.startsWith(r + "/")
      )
    ) {
      return section;
    }
  }

  return PATIENT_SECTIONS[0];
}
