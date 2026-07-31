import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get the App | Bruno Physical Rehabilitation",
  description: "Book appointments, track your exercises, message your therapist and manage your rehabilitation programme from your phone with the BPR patient app.",
  alternates: { canonical: "https://bpr.rehab/get-the-app" },
};

export default function GetTheAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
