"use client";

// Unified "what did this patient do" timeline (activity 48). Reads
// /api/admin/patients/[id]/activity, which merges login, exercise
// completions, video views, messages, screening and documents into one list.

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, LogIn, Dumbbell, Video, MessageSquare, ClipboardList, FileText, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ActivityEvent = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  at: string;
};

const ICONS: Record<string, any> = {
  LOGIN: LogIn,
  EXERCISE_COMPLETED: Dumbbell,
  VIDEO_WATCHED: Video,
  MESSAGE_SENT: MessageSquare,
  MESSAGE_RECEIVED: MessageSquare,
  SCREENING_SUBMITTED: ClipboardList,
  SCREENING_UPDATED: ClipboardList,
  DOCUMENT_UPLOADED: FileText,
};

const LIMIT = 50;

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function PatientActivityTab({ patientId }: { patientId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (offset: number) => {
    const res = await fetch(`/api/admin/patients/${patientId}/activity?limit=${LIMIT}&offset=${offset}`);
    if (!res.ok) return null;
    return res.json();
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    load(0).then((data) => {
      if (data) {
        setEvents(data.events);
        setHasMore(data.hasMore);
      }
      setLoading(false);
    });
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    const data = await load(events.length);
    if (data) {
      setEvents((prev) => [...prev, ...data.events]);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((ev) => {
        const Icon = ICONS[ev.type] || History;
        return (
          <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30">
            <span className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{ev.title}</p>
              {ev.description && <p className="text-xs text-muted-foreground truncate">{ev.description}</p>}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0" title={new Date(ev.at).toLocaleString()}>
              {relativeTime(ev.at)}
            </span>
          </div>
        );
      })}
      {hasMore && (
        <div className="pt-2 text-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
