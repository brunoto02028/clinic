import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";

export const revalidate = 3600;

export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let settings = null;
  try {
    settings = await prisma.siteSettings.findFirst();
  } catch (error) {
    console.error("Failed to fetch settings:", error);
  }

  return (
    <>
      <SiteHeader
        initialSettings={settings ? JSON.parse(JSON.stringify(settings)) : null}
      />
      {children}
    </>
  );
}
