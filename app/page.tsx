import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import LandingPage from "@/components/landing-page";

// Enable ISR (Incremental Static Regeneration) - revalidate every 1 hour
export const revalidate = 3600;

// Cache DB queries for 1 hour to avoid repeated slow connections
const getCachedHomeData = unstable_cache(
  async () => {
    const [settings, articles] = await Promise.all([
      prisma.siteSettings.findFirst(),
      prisma.article.findMany({
        where: { published: true },
        take: 3,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          imageUrl: true,
          createdAt: true,
          authorName: true,
          author: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);
    return { settings, articles };
  },
  ["homepage-data"],
  { revalidate: 3600, tags: ["homepage"] }
);

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

  // Fetch from cache (instant after first load)
  let settings = null;
  let articles: any[] = [];

  try {
    const data = await getCachedHomeData();
    settings = data.settings;
    articles = data.articles;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }

  return <LandingPage initialSettings={settings} initialArticles={articles} />;
}
