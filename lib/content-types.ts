/**
 * Single table for extension → MIME type.
 *
 * There used to be one list here and none in the upload path, so `.mp4` went
 * out as `application/octet-stream` and Safari refused to play it. Anything
 * that stores or serves a file resolves its type through this one place.
 */
export const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".ogg": "video/ogg",
  // Accepted by the upload routes, so they must resolve to a real type: when
  // normalisation fails the original extension is what gets stored, and an
  // object saved as octet-stream stays that way until it is re-uploaded.
  ".avi": "video/x-msvideo",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

export function contentTypeFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return CONTENT_TYPES[filename.slice(dot).toLowerCase()] || "application/octet-stream";
}
