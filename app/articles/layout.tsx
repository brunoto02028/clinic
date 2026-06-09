import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";

export default async function ArticlesLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettingsLogo();
  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col overflow-x-hidden">
      <SiteHeader currentPage="articles" initialSettings={settings} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}
