"use client";

import AppointmentsList from "@/components/appointments/appointments-list";
import AssessmentGate from "@/components/dashboard/assessment-gate";

export default function AppointmentsPage() {
  return (
    <AssessmentGate requiredService="CONSULTATION">
      <AppointmentsList />
    </AssessmentGate>
  );
}
