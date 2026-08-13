import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * components/web-vitals.tsx has beaconed every page's Core Web Vitals here
 * since it was written — and the route never existed, so every single page
 * view logged a 404 in the console. The metrics already reach the browser
 * console via the same component; this simply accepts the beacon so the noise
 * stops. If the numbers are ever wanted server-side, this is where they land.
 */
export async function POST() {
  return new NextResponse(null, { status: 204 });
}
