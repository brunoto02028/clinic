import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const CH_OAUTH_BASE = "https://account.companieshouse.gov.uk";

// GET — Initiate OAuth flow with Companies House
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [clientId, redirectUri] = await Promise.all([
      getConfigValue("COMPANIES_HOUSE_OAUTH_CLIENT_ID"),
      getConfigValue("COMPANIES_HOUSE_OAUTH_REDIRECT_URI"),
    ]);

    if (!clientId || !redirectUri) {
      return NextResponse.json({
        error: "Companies House OAuth not configured. Add COMPANIES_HOUSE_OAUTH_CLIENT_ID and COMPANIES_HOUSE_OAUTH_REDIRECT_URI in Settings → API Keys.",
      }, { status: 400 });
    }

    const state = crypto.randomBytes(16).toString("hex");

    const authUrl = new URL(`${CH_OAUTH_BASE}/oauth2/authorise`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "https://identity.company-information.service.gov.uk/user/profile.read");
    authUrl.searchParams.set("state", state);

    return NextResponse.json({ authUrl: authUrl.toString(), state });
  } catch (err: any) {
    console.error("[ch-oauth-init] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
