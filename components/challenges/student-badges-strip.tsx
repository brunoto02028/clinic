"use client";

// Admin-side: a read-only badge strip for one student on the trainer's student
// detail page (activity 30). Fetches the student's derived badges.
import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import BadgesStrip from "@/components/challenges/badges-strip";

export default function StudentBadgesStrip({ studentId }: { studentId: string }) {
  const { locale } = useLocale();
  const isPt = !!locale?.startsWith("pt");
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/badges?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => (r.ok ? r.json() : { badges: [] }))
      .then((d) => { if (alive) setBadges(d.badges || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [studentId]);

  if (badges.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{isPt ? "Conquistas" : "Achievements"}</p>
      <BadgesStrip badges={badges} isPt={isPt} />
    </div>
  );
}
