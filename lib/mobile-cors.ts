import { NextResponse } from "next/server";

/**
 * CORS for the mobile auth endpoints. Native apps don't enforce CORS, but the
 * Expo Web target (and a future PWA) run in a browser and do. Defaults to "*"
 * since these endpoints use bearer tokens, not cookies; restrict in production
 * via MOBILE_CORS_ORIGIN.
 */
const ORIGIN = process.env.MOBILE_CORS_ORIGIN || "*";

const HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsJson(
  data: unknown,
  init?: { status?: number }
): NextResponse {
  const res = NextResponse.json(data, init);
  for (const [k, v] of Object.entries(HEADERS)) res.headers.set(k, v);
  return res;
}

export function corsPreflight(): NextResponse {
  const res = new NextResponse(null, { status: 204 });
  for (const [k, v] of Object.entries(HEADERS)) res.headers.set(k, v);
  return res;
}
