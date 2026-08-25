"use client";

// Home social proof (activity 17, C2). Reads the SAME admin-managed source as
// the /start page (SiteSettings.startTestimonialsJson) so there's a single real
// list of testimonials. It renders NOTHING when the list is empty — we never
// ship placeholder or invented reviews. Add real quotes in the admin and they
// appear here automatically.

import { Quote } from "lucide-react";

export interface Testimonial {
  quoteEn?: string;
  quotePt?: string;
  nameEn?: string;
  namePt?: string;
}

export function HomeTestimonials({ testimonials, isPt = false }: { testimonials: Testimonial[]; isPt?: boolean }) {
  const items = (testimonials || []).filter((t) => (isPt ? t.quotePt : t.quoteEn));
  if (items.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#4F7361] mb-2">
            {isPt ? "O que dizem os pacientes" : "What patients say"}
          </p>
          <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {isPt ? "Resultados reais, pessoas reais" : "Real results, real people"}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.slice(0, 3).map((t, i) => (
            <div key={i} className="bg-[#F5F4F1] rounded-2xl border border-slate-100 p-6 flex flex-col">
              <Quote className="h-5 w-5 text-[#4F7361]/50 mb-3" />
              <p className="text-sm text-foreground/90 italic leading-relaxed mb-4 flex-1">
                &ldquo;{isPt ? t.quotePt : t.quoteEn}&rdquo;
              </p>
              <p className="text-xs font-bold text-foreground">{isPt ? t.namePt : t.nameEn}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
