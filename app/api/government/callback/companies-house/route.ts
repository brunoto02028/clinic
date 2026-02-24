import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const CH_OAUTH_BASE = "https://account.companieshouse.gov.uk";

// GET — OAuth callback from Companies House
// After user authorises, CH redirects here with ?code=XXX&state=YYY
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.redirect(new URL("/staff-login", req.url));
    }

    const url = req.nextUrl;
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("[ch-oauth] Error from Companies House:", error, url.searchParams.get("error_description"));
      return NextResponse.redirect(
        new URL(`/admin/finance?tab=company&ch_oauth=error&message=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/admin/finance?tab=company&ch_oauth=error&message=no_code", req.url)
      );
    }

    // Exchange code for access token
    const [clientId, clientSecret, redirectUri] = await Promise.all([
      getConfigValue("COMPANIES_HOUSE_OAUTH_CLIENT_ID"),
      getConfigValue("COMPANIES_HOUSE_OAUTH_CLIENT_SECRET"),
      getConfigValue("COMPANIES_HOUSE_OAUTH_REDIRECT_URI"),
    ]);

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL("/admin/finance?tab=company&ch_oauth=error&message=oauth_not_configured", req.url)
      );
    }

    const tokenRes = await fetch(`${CH_OAUTH_BASE}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("[ch-oauth] Token exchange failed:", tokenRes.status, errorText);
      return NextResponse.redirect(
        new URL(`/admin/finance?tab=company&ch_oauth=error&message=token_exchange_failed`, req.url)
      );
    }

    const tokenData = await tokenRes.json();
    // tokenData: { access_token, refresh_token, expires_in, token_type, scope }

    // Store tokens securely in system-config
    const tokensToStore = [
      { key: "COMPANIES_HOUSE_ACCESS_TOKEN", value: tokenData.access_token, label: "Companies House Access Token" },
      { key: "COMPANIES_HOUSE_REFRESH_TOKEN", value: tokenData.refresh_token || "", label: "Companies House Refresh Token" },
      { key: "COMPANIES_HOUSE_TOKEN_EXPIRES", value: String(Date.now() + (tokenData.expires_in || 3600) * 1000), label: "Companies House Token Expiry" },
    ];

    for (const { key, value, label } of tokensToStore) {
      const existing = await prisma.systemConfig.findUnique({ where: { key } });
      if (existing) {
        await prisma.systemConfig.update({ where: { key }, data: { value } });
      } else {
        await (prisma.systemConfig as any).create({ data: { key, value, label } });
      }
    }

    console.log("[ch-oauth] Successfully stored Companies House OAuth tokens");

    return NextResponse.redirect(
      new URL("/admin/finance?tab=company&ch_oauth=success", req.url)
    );
  } catch (err: any) {
    console.error("[ch-oauth] Callback error:", err);
    return NextResponse.redirect(
      new URL(`/admin/finance?tab=company&ch_oauth=error&message=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
