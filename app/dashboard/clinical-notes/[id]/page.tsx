import SOAPNoteDetail from "@/components/clinical-notes/soap-note-detail";

export default function ClinicalNoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <SOAPNoteDetail noteId={params.id} />;
}
