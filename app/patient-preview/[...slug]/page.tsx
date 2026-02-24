"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load each dashboard page component
const AppointmentsList = dynamic(() => import("@/components/appointments/appointments-list"));
const MedicalScreeningForm = dynamic(() => import("@/components/screening/medical-screening-form"));
const PatientRecords = dynamic(() => import("@/components/records/patient-records"));
const PatientScansPage = dynamic(() => import("@/app/dashboard/scans/page"));
const PatientBodyAssessmentsPage = dynamic(() => import("@/app/dashboard/body-assessments/page"));
const PatientEducationPage = dynamic(() => import("@/app/dashboard/education/page"));
const PatientExercisesPage = dynamic(() => import("@/app/dashboard/exercises/page"));
const PatientTreatmentPage = dynamic(() => import("@/app/dashboard/treatment/page"));
const PatientDocumentsPage = dynamic(() => import("@/app/dashboard/documents/page"));
const PatientBloodPressurePage = dynamic(() => import("@/app/dashboard/blood-pressure/page"));
const PatientConsentPage = dynamic(() => import("@/app/dashboard/consent/page"));
const PatientClinicalNotesPage = dynamic(() => import("@/app/dashboard/clinical-notes/page"));
const PatientProfilePage = dynamic(() => import("@/app/dashboard/profile/page"));
const PatientMembershipPage = dynamic(() => import("@/app/dashboard/membership/page"));
const PatientPlansPage = dynamic(() => import("@/app/dashboard/plans/page"));
const PatientJourneyPage = dynamic(() => import("@/app/dashboard/journey/page"));
const PatientCommunityPage = dynamic(() => import("@/app/dashboard/community/page"));
const PatientMarketplacePage = dynamic(() => import("@/app/dashboard/marketplace/page"));
const PatientQuizPage = dynamic(() => import("@/app/dashboard/quiz/page"));
const PatientCancellationPage = dynamic(() => import("@/app/dashboard/cancellation-policy/page"));

const ROUTE_MAP: Record<string, React.ComponentType> = {
  appointments: AppointmentsList,
  screening: MedicalScreeningForm,
  records: PatientRecords,
  scans: PatientScansPage,
  "body-assessments": PatientBodyAssessmentsPage,
  education: PatientEducationPage,
  exercises: PatientExercisesPage,
  treatment: PatientTreatmentPage,
  documents: PatientDocumentsPage,
  "blood-pressure": PatientBloodPressurePage,
  consent: PatientConsentPage,
  "clinical-notes": PatientClinicalNotesPage,
  profile: PatientProfilePage,
  membership: PatientMembershipPage,
  plans: PatientPlansPage,
  journey: PatientJourneyPage,
  community: PatientCommunityPage,
  marketplace: PatientMarketplacePage,
  quiz: PatientQuizPage,
  "cancellation-policy": PatientCancellationPage,
};

export default function PatientPreviewSubPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug : [params?.slug];
  const routeKey = slug[0] || "";

  const Component = ROUTE_MAP[routeKey];

  if (!Component) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <p>Page not found: /{slug.join("/")}</p>
      </div>
    );
  }

  return <Component />;
}
