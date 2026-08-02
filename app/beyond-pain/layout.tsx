import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSettingsLogo } from "@/lib/get-site-settings";

// Matches every other public page (articles, conditions, services): the
// `.public-site` wrapper applies the BA1 bone/ink/moss light theme instead
// of the dark admin shell — without it, /beyond-pain was rendering with
// the wrong (dark) palette.
export default async function BeyondPainLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettingsLogo();
  return (
    <div className="public-site min-h-screen bg-background flex flex-col overflow-x-hidden">
      <SiteHeader initialSettings={settings} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}
