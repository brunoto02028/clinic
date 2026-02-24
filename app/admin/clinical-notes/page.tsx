"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ClipboardList } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import ClinicalNotesList from "@/components/clinical-notes/clinical-notes-list";
import ComprehensiveAssessment from "@/components/clinical-notes/comprehensive-assessment";

export default function AdminClinicalNotesPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  return (
    <div className="space-y-6">
      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            SOAP Notes
          </TabsTrigger>
          <TabsTrigger value="assessment" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Full Assessment
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notes" className="mt-6">
          <ClinicalNotesList />
        </TabsContent>
        <TabsContent value="assessment" className="mt-6">
          <ComprehensiveAssessment />
        </TabsContent>
      </Tabs>
    </div>
  );
}
