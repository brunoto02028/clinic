import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = (session.user as any).clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "7d"; // 7d, 30d, 90d, today
  const section = searchParams.get("section") || "overview"; // overview, visitors, heatmap, conversions

  // Calculate date range
  const now = new Date();
  let since = new Date();
  if (range === "today") since.setHours(0, 0, 0, 0);
  else if (range === "7d") since.setDate(now.getDate() - 7);
  else if (range === "30d") since.setDate(now.getDate() - 30);
  else if (range === "90d") since.setDate(now.getDate() - 90);

  if (section === "overview") {
    const [
      totalVisitors,
      newVisitors,
      returningVisitors,
      totalPageViews,
      totalClicks,
      totalConversions,
      pageViews,
      topPages,
      topReferrers,
      deviceBreakdown,
      countryBreakdown,
      browserBreakdown,
      recentVisitors,
      conversionsByType,
      hourlyPageViews,
    ] = await Promise.all([
      // Total unique visitors in range
      prisma.siteVisitor.count({
        where: { clinicId, lastSeenAt: { gte: since } },
      }),
      // New visitors
      prisma.siteVisitor.count({
        where: { clinicId, firstSeenAt: { gte: since }, isReturning: false },
      }),
      // Returning visitors
      prisma.siteVisitor.count({
        where: { clinicId, lastSeenAt: { gte: since }, isReturning: true },
      }),
      // Total page views
      prisma.analyticsPageView.count({
        where: { clinicId, createdAt: { gte: since } },
      }),
      // Total clicks
      prisma.analyticsClick.count({
        where: { clinicId, createdAt: { gte: since } },
      }),
      // Total conversions
      prisma.analyticsConversion.count({
        where: { clinicId, createdAt: { gte: since } },
      }),
      // Page views per day (for chart)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "AnalyticsPageView"
        WHERE "clinicId" = ${clinicId} AND "createdAt" >= ${since}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      ` as Promise<{ date: Date; count: number }[]>,
      // Top pages
      prisma.$queryRaw`
        SELECT path, COUNT(*)::int as views, 
               COALESCE(AVG("timeOnPage"), 0)::int as "avgTime",
               COALESCE(AVG("scrollDepthMax"), 0)::int as "avgScroll"
        FROM "AnalyticsPageView"
        WHERE "clinicId" = ${clinicId} AND "createdAt" >= ${since}
        GROUP BY path
        ORDER BY views DESC
        LIMIT 20
      ` as Promise<{ path: string; views: number; avgTime: number; avgScroll: number }[]>,
      // Top referrers
      prisma.$queryRaw`
        SELECT "referrerDomain" as domain, COUNT(*)::int as count
        FROM "SiteVisitor"
        WHERE "clinicId" = ${clinicId} AND "lastSeenAt" >= ${since} AND "referrerDomain" IS NOT NULL
        GROUP BY "referrerDomain"
        ORDER BY count DESC
        LIMIT 10
      ` as Promise<{ domain: string; count: number }[]>,
      // Device breakdown
      prisma.$queryRaw`
        SELECT "deviceType" as device, COUNT(*)::int as count
        FROM "SiteVisitor"
        WHERE "clinicId" = ${clinicId} AND "lastSeenAt" >= ${since} AND "deviceType" IS NOT NULL
        GROUP BY "deviceType"
        ORDER BY count DESC
      ` as Promise<{ device: string; count: number }[]>,
      // Country breakdown
      prisma.$queryRaw`
        SELECT country, "countryCode", COUNT(*)::int as count
        FROM "SiteVisitor"
        WHERE "clinicId" = ${clinicId} AND "lastSeenAt" >= ${since} AND country IS NOT NULL
        GROUP BY country, "countryCode"
        ORDER BY count DESC
        LIMIT 15
      ` as Promise<{ country: string; countryCode: string; count: number }[]>,
      // Browser breakdown
      prisma.$queryRaw`
        SELECT browser, COUNT(*)::int as count
        FROM "SiteVisitor"
        WHERE "clinicId" = ${clinicId} AND "lastSeenAt" >= ${since} AND browser IS NOT NULL
        GROUP BY browser
        ORDER BY count DESC
      ` as Promise<{ browser: string; count: number }[]>,
      // Recent visitors (last 20)
      prisma.siteVisitor.findMany({
        where: { clinicId, lastSeenAt: { gte: since } },
        orderBy: { lastSeenAt: "desc" },
        take: 20,
        select: {
          id: true,
          ip: true,
          country: true,
          countryCode: true,
          city: true,
          browser: true,
          os: true,
          deviceType: true,
          referrerDomain: true,
          totalPageViews: true,
          totalClicks: true,
          totalTimeOnSite: true,
          isReturning: true,
          firstSeenAt: true,
          lastSeenAt: true,
          language: true,
          screenWidth: true,
          screenHeight: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      }),
      // Conversions by type
      prisma.$queryRaw`
        SELECT type, label, COUNT(*)::int as count
        FROM "AnalyticsConversion"
        WHERE "clinicId" = ${clinicId} AND "createdAt" >= ${since}
        GROUP BY type, label
        ORDER BY count DESC
      ` as Promise<{ type: string; label: string; count: number }[]>,
      // Hourly page views (for today/recent activity)
      prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::int as count
        FROM "AnalyticsPageView"
        WHERE "clinicId" = ${clinicId} AND "createdAt" >= ${since}
        GROUP BY hour
        ORDER BY hour ASC
      ` as Promise<{ hour: number; count: number }[]>,
    ]);

    // Calculate averages
    const avgTimeOnSite = totalVisitors > 0
      ? Math.round(
          (await prisma.siteVisitor.aggregate({
            where: { clinicId, lastSeenAt: { gte: since } },
            _avg: { totalTimeOnSite: true },
          }))._avg.totalTimeOnSite || 0
        )
      : 0;

    const bounceCount = await prisma.analyticsPageView.count({
      where: { clinicId, createdAt: { gte: since }, isBounce: true },
    });
    const bounceRate = totalPageViews > 0 ? Math.round((bounceCount / totalPageViews) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalVisitors,
        newVisitors,
        returningVisitors,
        totalPageViews,
        totalClicks,
        totalConversions,
        avgTimeOnSite,
        bounceRate,
      },
      pageViewsChart: pageViews,
      hourlyChart: hourlyPageViews,
      topPages,
      topReferrers,
      deviceBreakdown,
      countryBreakdown,
      browserBreakdown,
      recentVisitors,
      conversionsByType,
    });
  }

  if (section === "visitors") {
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = 50;

    const [visitors, total] = await Promise.all([
      prisma.siteVisitor.findMany({
        where: { clinicId, lastSeenAt: { gte: since } },
        orderBy: { lastSeenAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          pageViews: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { path: true, title: true, timeOnPage: true, scrollDepthMax: true, createdAt: true },
          },
          conversions: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { type: true, label: true, pagePath: true, createdAt: true },
          },
          _count: { select: { pageViews: true, clicks: true, conversions: true } },
        },
      }),
      prisma.siteVisitor.count({ where: { clinicId, lastSeenAt: { gte: since } } }),
    ]);

    return NextResponse.json({ visitors, total, page, perPage });
  }

  if (section === "heatmap") {
    const pagePath = searchParams.get("path") || "/";

    // Get all clicks for this page in the range
    const clicks = await prisma.analyticsClick.findMany({
      where: { clinicId, pagePath, createdAt: { gte: since } },
      select: { x: true, y: true, pageWidth: true, pageHeight: true, elementTag: true, elementText: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    // Get available pages with click counts
    const pages = await prisma.$queryRaw`
      SELECT "pagePath" as path, COUNT(*)::int as clicks
      FROM "AnalyticsClick"
      WHERE "clinicId" = ${clinicId} AND "createdAt" >= ${since}
      GROUP BY "pagePath"
      ORDER BY clicks DESC
      LIMIT 50
    ` as { path: string; clicks: number }[];

    return NextResponse.json({ clicks, pages, pagePath });
  }

  if (section === "conversions") {
    const conversions = await prisma.analyticsConversion.findMany({
      where: { clinicId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        visitor: {
          select: { ip: true, country: true, city: true, browser: true, os: true, deviceType: true, referrerDomain: true },
        },
      },
    });

    return NextResponse.json({ conversions });
  }

  return NextResponse.json({ error: "Invalid section" }, { status: 400 });
}
