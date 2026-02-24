"use client";

import { PreviewShell } from "@/components/preview-shell";
import { ReactNode } from "react";

export default function PreviewClientLayout({ children }: { children: ReactNode }) {
  return <PreviewShell>{children}</PreviewShell>;
}
