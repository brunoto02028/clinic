import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complaints Policy | Bruno Physical Rehabilitation",
  description: "How to raise a concern or formal complaint with Bruno Physical Rehabilitation, our response timeframes, and how to escalate if you're not satisfied with the outcome.",
  alternates: { canonical: "https://bpr.clinic/complaints-policy" },
};

export default function ComplaintsPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
