import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Bruno Physical Rehabilitation",
  description: "How Bruno Physical Rehabilitation collects, uses and protects your personal and health data, in accordance with UK GDPR and the Data Protection Act 2018.",
  alternates: { canonical: "https://bpr.clinic/privacy" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
