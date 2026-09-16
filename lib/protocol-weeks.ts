// Week grouping and patient-visibility rules for protocol items, as the
// admin Protocol tab shows them (activity 44). The key and labels match
// app/dashboard/treatment/page.tsx; the visibility rules match
// app/api/patient/protocol/route.ts.

export type WeekRange = { start: number; end: number | null };

export function groupKey(item: { startWeek?: number | null; endWeek?: number | null }): string {
  return `${item.startWeek || 1}-${item.endWeek || ""}`;
}

export function parseKey(key: string): WeekRange {
  const [s, e] = key.split("-");
  return { start: Number(s), end: e ? Number(e) : null };
}

export function weekLabel(start: number, end: number | null): string {
  if (end === null) return `Week ${start}+`;
  if (end === start) return `Week ${start}`;
  return `Weeks ${start}-${end}`;
}

/** Start week first; for the same start, the shorter range first, ongoing last. */
export function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const pa = parseKey(a), pb = parseKey(b);
    if (pa.start !== pb.start) return pa.start - pb.start;
    return (pa.end ?? Infinity) - (pb.end ?? Infinity);
  });
}

export function groupItems<T extends { startWeek?: number | null; endWeek?: number | null }>(items: T[]): {
  groups: Record<string, T[]>;
  keys: string[];
} {
  const groups: Record<string, T[]> = {};
  for (const item of items) (groups[groupKey(item)] ||= []).push(item);
  return { groups, keys: sortKeys(Object.keys(groups)) };
}

/** Whether the patient's API returns this item: not hidden, and within releasedThroughWeek. */
export function patientCanSee(
  item: { hiddenFromPatient?: boolean | null; startWeek?: number | null },
  releasedThroughWeek: number | null | undefined
): boolean {
  if (item.hiddenFromPatient) return false;
  return releasedThroughWeek == null || (item.startWeek || 1) <= releasedThroughWeek;
}

/** Released items still don't reach the patient until the protocol is sent and its latest package paid. */
export function protocolGated(protocol: { status?: string; packages?: { isPaid?: boolean | null }[] | null }): boolean {
  const pkg = protocol.packages?.[0];
  return protocol.status !== "SENT_TO_PATIENT" || !!(pkg && !pkg.isPaid);
}

/** "Weeks 1–2, 7–8" — the weeks the patient can currently see, as separate ranges. */
export function visibleSummary(protocol: {
  status?: string;
  packages?: { isPaid?: boolean | null }[] | null;
  releasedThroughWeek?: number | null;
  items?: { hiddenFromPatient?: boolean | null; startWeek?: number | null; endWeek?: number | null }[] | null;
}): string {
  if (protocol.status !== "SENT_TO_PATIENT") return "nothing — protocol not sent to the patient yet";
  if (protocolGated(protocol)) return "nothing — package payment pending";
  const seen = (protocol.items || []).filter((i) => patientCanSee(i, protocol.releasedThroughWeek));
  if (seen.length === 0) return "nothing yet";
  const ranges = seen
    .map((i): [number, number] => [i.startWeek || 1, i.endWeek == null ? Infinity : i.endWeek])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const fmt = ([s, e]: [number, number]) => (e === Infinity ? `${s}+` : s === e ? `${s}` : `${s}–${e}`);
  const single = merged.length === 1 && merged[0][0] === merged[0][1];
  return `${single ? "Week" : "Weeks"} ${merged.map(fmt).join(", ")}`;
}

/** Visibility an item takes when moved into `destination` (the other items of that week). */
export function hiddenAfterMove(destination: { hiddenFromPatient?: boolean | null }[]): boolean {
  return !(destination.length > 0 && destination.every((i) => !i.hiddenFromPatient));
}
