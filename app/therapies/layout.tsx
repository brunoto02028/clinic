import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Therapies | Bruno Physical Rehabilitation",
  description: "A complete range of evidence-based rehabilitation therapies — electrotherapy, exercise therapy, therapeutic ultrasound, microcurrent, sports injury treatment and more — each tailored to your specific needs.",
  alternates: { canonical: "https://bpr.clinic/therapies" },
};

export default function TherapiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
