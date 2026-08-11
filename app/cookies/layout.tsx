import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Bruno Physical Rehabilitation",
  description: "How the bpr.clinic website uses cookies and similar technologies, in compliance with PECR and UK GDPR.",
  alternates: { canonical: "https://bpr.clinic/cookies" },
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
