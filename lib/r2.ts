import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { contentTypeFor } from "@/lib/content-types";
import type { Readable } from "stream";

/**
 * Cloudflare R2 for exercise videos.
 *
 * Not `lib/s3.ts`: that one builds AWS-shaped URLs (`s3.<region>.amazonaws.com`)
 * with no way to point elsewhere, and it's what foot scans and body assessments
 * already run on. Changing it to reach R2 would put working features at risk for
 * no gain, so R2 gets its own small module.
 *
 * Why R2 at all: files on the VPS disk had no backup of any kind, and the CDN in
 * front of them answered `Range` requests with a plain 200 and an occasional
 * `application/octet-stream`, which Safari will not play. Serving from R2 through
 * its own domain returns 206 with a correct Content-Range, measured.
 */

const REQUIRED = [
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

export function isR2Configured(): boolean {
  return REQUIRED.every((k) => !!process.env[k]);
}

export function missingR2Vars(): string[] {
  return REQUIRED.filter((k) => !process.env[k]);
}

let cached: S3Client | null = null;

function client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cached;
}

const bucket = () => process.env.R2_BUCKET_NAME!;

/** Absolute URL for a stored object. This is what goes in the database. */
export function r2PublicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}

/** True for URLs this module is responsible for — used before trying to delete.
 *
 *  Compares origins rather than string prefixes: `startsWith` would treat
 *  `https://media.example.com.attacker.net/x` as ours. */
export function isR2Url(url: string | null | undefined): boolean {
  return keyFromR2Url(url) !== null;
}

/** The object key behind a public URL, or null if it isn't one of ours. */
export function keyFromR2Url(url: string | null | undefined): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!url || !base) return null;
  try {
    const target = new URL(url);
    const ours = new URL(base);
    if (target.origin !== ours.origin) return null;
    const basePath = ours.pathname.replace(/\/+$/, "");
    if (basePath && !target.pathname.startsWith(basePath + "/")) return null;
    const key = target.pathname.slice(basePath.length).replace(/^\/+/, "");
    return key || null;
  } catch {
    // Relative URLs (the legacy /uploads/... form) are not R2 objects.
    return null;
  }
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType?: string
): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      // An object stored with the wrong type serves with the wrong type
      // forever — this is the header Safari checks before playing.
      ContentType: contentType || contentTypeFor(key),
    })
  );
  return r2PublicUrl(key);
}

/** Streaming variant, for files large enough that a second in-memory copy
 *  matters. `contentLength` is required — S3 cannot size a stream itself. */
export async function uploadStreamToR2(
  key: string,
  body: Readable,
  contentLength: number,
  contentType?: string
): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentLength: contentLength,
      ContentType: contentType || contentTypeFor(key),
    })
  );
  return r2PublicUrl(key);
}

/** Deleting something that isn't there is not an error worth propagating. */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) return;
    throw err;
  }
}

/** Convenience for the delete paths, which hold URLs rather than keys. */
export async function deleteR2Url(url: string | null | undefined): Promise<boolean> {
  const key = keyFromR2Url(url);
  if (!key) return false;
  await deleteFromR2(key);
  return true;
}

export async function listR2(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await client().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const o of res.Contents || []) if (o.Key) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}
