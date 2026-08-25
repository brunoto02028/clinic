"use client";

// Mobile sticky action bar (activity 17, C5). The home hero's primary CTA sits
// below the fold on phones, so this fixed bar keeps "Start Programme" reachable
// after the user scrolls past the hero. Mobile only (sm:hidden). The WhatsApp
// floating button lifts above this bar on the home page (see whatsapp-button).

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function MobileCtaBar({ isPt = false }: { isPt?: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <Link
          href="/signup"
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3 text-sm"
        >
          {isPt ? "Começar o Programa" : "Start Your Programme"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
