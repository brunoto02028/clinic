import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";

// Mirror of app/articles/layout.tsx so the Portuguese article URLs (activity 12)
// get the same public header/footer shell as the English ones.
export default async function ArticlesLayoutPt({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettingsLogo();
  return (
    <div className="public-site min-h-screen bg-background flex flex-col overflow-x-hidden">
      <SiteHeader currentPage="articles" initialSettings={settings} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}
