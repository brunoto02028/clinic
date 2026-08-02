import type { Metadata } from "next";

// Utility page — keep out of the index so crawl budget goes to content (P4.1).
// page.tsx is a client component ("use client"), so metadata must live here.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function StaffLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
