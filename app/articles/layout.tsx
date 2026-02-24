import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <SiteHeader currentPage="articles" />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}
