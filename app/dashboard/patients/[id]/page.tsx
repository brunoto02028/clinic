import PatientDetail from "@/components/patients/patient-detail";

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PatientDetail patientId={params.id} />;
}
