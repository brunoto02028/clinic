import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { WhatsAppFloatingButton } from "@/components/whatsapp-button";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BPR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={inter.className}>
        <Providers>
          <DynamicFavicon />
          {children}
          <WhatsAppFloatingButton />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
