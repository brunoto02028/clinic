// Shared by every patient-facing video player (dashboard/treatment,
// dashboard/exercises) — a YouTube watch/shorts/live URL isn't a playable
// media file, so it needs an <iframe> embed instead of a bare <video src>.
// Kept in one place after the same detection/regex logic drifted between
// two separate copies once already (found in review, 13/09/2026).

export function isYoutubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

/** Extracts the video ID from any common YouTube URL shape and returns an embeddable URL. Falls back to the original URL if no ID is found (embed will fail visibly rather than silently). */
export function getYoutubeEmbedUrl(url: string, opts?: { muted?: boolean }): string {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (!match) return url;
  const params = opts?.muted ? "?mute=1" : "";
  return `https://www.youtube.com/embed/${match[1]}${params}`;
}
