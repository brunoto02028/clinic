import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biohacking & Performance | Bruno Physical Rehabilitation",
  description: "IPHM-certified biohacking protocols using data, technology and lifestyle optimisation to enhance recovery, energy and long-term health performance.",
  alternates: { canonical: "https://bpr.rehab/biohacking" },
};

export default function BiohackingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
