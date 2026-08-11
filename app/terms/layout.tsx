import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Bruno Physical Rehabilitation",
  description: "Terms of use for the Bruno Physical Rehabilitation clinical platform, including the medical disclaimer, informed consent for treatment, and data protection.",
  alternates: { canonical: "https://bpr.clinic/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
