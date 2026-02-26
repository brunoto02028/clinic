import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Get the clinic ID (single-tenant for now — first active clinic)
async function getClinicId(): Promise<string | null> {
  const clinic = await prisma.clinic.findFirst({ where: { isActive: true }, select: { id: true } });
  return clinic?.id || null;
}

// Extract IP from request headers
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

// IP geolocation via free API (ip-api.com — 45 req/min)
async function getGeoFromIp(ip: string): Promise<{
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
} | null> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return null;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status === "success") {
      return {
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
      };
    }
  } catch {
    // Geolocation is best-effort
  }
  return null;
}

// Extract referrer domain
function extractDomain(referrer: string | undefined): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).hostname;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...data } = body;

    const clinicId = await getClinicId();
    if (!clinicId) return new NextResponse("OK", { status: 200 });

    const ip = getClientIp(req);

    if (type === "page_view") {
      // ─── Upsert visitor ───
      const fingerprint = data.fingerprint;
      if (!fingerprint) return new NextResponse("OK", { status: 200 });

      let visitor = await prisma.siteVisitor.findUnique({
        where: { clinicId_fingerprint: { clinicId, fingerprint } },
      });

      const geo = visitor?.country ? null : await getGeoFromIp(ip);

      if (visitor) {
        // Update existing visitor
        visitor = await prisma.siteVisitor.update({
          where: { id: visitor.id },
          data: {
            ip,
            lastSeenAt: new Date(),
            totalVisits: { increment: data.isEntryPage ? 1 : 0 },
            totalPageViews: { increment: 1 },
            isReturning: true,
            ...(geo && {
              country: geo.country,
              countryCode: geo.countryCode,
              region: geo.region,
              city: geo.city,
              latitude: geo.latitude,
              longitude: geo.longitude,
            }),
          },
        });
      } else {
        // Create new visitor
        visitor = await prisma.siteVisitor.create({
          data: {
            clinicId,
            fingerprint,
            ip,
            userAgent: data.userAgent,
            browser: data.browser,
            browserVersion: data.browserVersion,
            os: data.os,
            osVersion: data.osVersion,
            deviceType: data.deviceType,
            screenWidth: data.screenWidth,
            screenHeight: data.screenHeight,
            language: data.language,
            referrer: data.referrer,
            referrerDomain: extractDomain(data.referrer),
            utmSource: data.utmSource,
            utmMedium: data.utmMedium,
            utmCampaign: data.utmCampaign,
            utmTerm: data.utmTerm,
            utmContent: data.utmContent,
            totalPageViews: 1,
            ...(geo && {
              country: geo.country,
              countryCode: geo.countryCode,
              region: geo.region,
              city: geo.city,
              latitude: geo.latitude,
              longitude: geo.longitude,
            }),
          },
        });
      }

      // ─── Create page view ───
      await prisma.analyticsPageView.create({
        data: {
          id: data.pageViewId,
          clinicId,
          visitorId: visitor.id,
          url: data.url || data.path,
          path: data.path,
          title: data.title,
          queryParams: data.queryParams || null,
          isEntryPage: data.isEntryPage || false,
          sessionId: data.sessionId,
        },
      });
    } else if (type === "page_exit") {
      // ─── Update page view with engagement data ───
      if (data.pageViewId) {
        try {
          await prisma.analyticsPageView.update({
            where: { id: data.pageViewId },
            data: {
              timeOnPage: data.timeOnPage || 0,
              scrollDepthMax: data.scrollDepthMax || 0,
              exitedAt: new Date(),
              isExitPage: data.isExitPage || false,
              isBounce: data.isExitPage && data.timeOnPage < 10,
            },
          });

          // Update visitor total time
          if (data.fingerprint) {
            await prisma.siteVisitor.updateMany({
              where: { clinicId, fingerprint: data.fingerprint },
              data: { totalTimeOnSite: { increment: data.timeOnPage || 0 } },
            });
          }
        } catch {
          // Page view might not exist yet if created in parallel
        }
      }
    } else if (type === "click") {
      // ─── Record click ───
      const fingerprint = data.fingerprint;
      if (!fingerprint) return new NextResponse("OK", { status: 200 });

      const visitor = await prisma.siteVisitor.findUnique({
        where: { clinicId_fingerprint: { clinicId, fingerprint } },
      });
      if (!visitor) return new NextResponse("OK", { status: 200 });

      // Verify pageView exists before linking
      let pageViewId = data.pageViewId || null;
      if (pageViewId) {
        const pvExists = await prisma.analyticsPageView.findUnique({ where: { id: pageViewId }, select: { id: true } });
        if (!pvExists) pageViewId = null;
      }

      await prisma.analyticsClick.create({
        data: {
          clinicId,
          visitorId: visitor.id,
          pageViewId,
          x: data.x,
          y: data.y,
          pageWidth: data.pageWidth,
          pageHeight: data.pageHeight,
          viewportHeight: data.viewportHeight,
          selector: data.selector,
          elementTag: data.elementTag,
          elementText: data.elementText?.slice(0, 200),
          elementHref: data.elementHref,
          pagePath: data.pagePath || "/",
        },
      });

      // Update visitor click count
      await prisma.siteVisitor.update({
        where: { id: visitor.id },
        data: { totalClicks: { increment: 1 } },
      });
    } else if (type === "conversion") {
      // ─── Record conversion ───
      const fingerprint = data.fingerprint;
      if (!fingerprint) return new NextResponse("OK", { status: 200 });

      const visitor = await prisma.siteVisitor.findUnique({
        where: { clinicId_fingerprint: { clinicId, fingerprint } },
      });
      if (!visitor) return new NextResponse("OK", { status: 200 });

      await prisma.analyticsConversion.create({
        data: {
          clinicId,
          visitorId: visitor.id,
          type: data.type || "cta_click",
          label: data.label,
          pagePath: data.pagePath,
          elementSelector: data.elementSelector,
          metadata: data.metadata,
          value: data.value,
        },
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[Analytics Track Error]", error);
    // Always return 200 to not block the client
    return new NextResponse("OK", { status: 200 });
  }
}
