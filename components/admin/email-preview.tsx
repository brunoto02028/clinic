"use client";

export interface EmailPreviewData {
  to: string;
  from: string;
  subject: string;
  html: string;
}

// What an e-mail will look like before anyone presses send (Bruno's rule,
// 18/09/2026: nothing goes out without being seen). The body renders in a
// sandboxed iframe so the e-mail's own styles can't touch the page.
export default function EmailPreview({ preview }: { preview: EmailPreviewData }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/40 px-3 py-2 text-xs space-y-0.5 border-b">
        <p><span className="text-muted-foreground">From:</span> {preview.from}</p>
        <p><span className="text-muted-foreground">To:</span> {preview.to}</p>
        <p><span className="text-muted-foreground">Subject:</span> <strong>{preview.subject}</strong></p>
      </div>
      <iframe title="E-mail preview" sandbox="" srcDoc={preview.html} className="w-full h-[50vh] min-h-[280px] max-h-[440px] bg-white" />
    </div>
  );
}
