import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import LandingPage from "@/components/landing-page";

// Disable caching for this page to always show fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const userRole = (session.user as any)?.role;
    if (userRole === "ADMIN" || userRole === "THERAPIST" || userRole === "SUPERADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  // Fetch settings and articles on server for instant rendering
  let settings = null;
  let articles = [];

  try {
    [settings, articles] = await Promise.all([
      prisma.siteSettings.findFirst(),
      prisma.article.findMany({
        where: { published: true },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { firstName: true, lastName: true }
          }
        }
      })
    ]);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }

  return <LandingPage initialSettings={settings} initialArticles={articles} />;
}
