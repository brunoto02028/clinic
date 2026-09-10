import type { Metadata } from "next";
import StudentAssessments from "@/components/assessments/student-assessments";

export const metadata: Metadata = {
  title: "My Assessments",
  robots: { index: false, follow: false },
};

export default function AssessmentsPage() {
  return <StudentAssessments />;
}
