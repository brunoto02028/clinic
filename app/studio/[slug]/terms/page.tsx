import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { studioConsentTexts } from "@/lib/studio-terms";

// A studio's public training terms — what "Read full terms" opens on its
// sign-up page (activity 55, T-3). Public like the rest of /studio/<slug>.

async function studio(slug: string) {
  const clinic = await prisma.clinic.findUnique({ where: { slug }, select: { name: true, type: true, isActive: true } });
  return clinic && clinic.isActive && clinic.type === "PERSONAL_TRAINER" ? clinic : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await studio(params.slug);
  return { title: { absolute: s ? `${s.name} · Terms` : "Terms" }, robots: { index: false } };
}

export default async function StudioTermsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { lang?: string };
}) {
  const s = await studio(params.slug);
  if (!s) notFound();
  const acceptLang = headers().get("accept-language") || "";
  const isPt = searchParams.lang ? searchParams.lang === "pt" : /^pt/i.test(acceptLang);
  const t = studioConsentTexts(s.name, isPt);

  const block = (title: string, sections: { number: number; title: string; body: string }[]) => (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {sections.map((sec) => (
        <div key={sec.number}>
          <h3 className="font-medium">{sec.number}. {sec.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{sec.body}</p>
        </div>
      ))}
    </section>
  );

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{s.name}</h1>
        <a href={`/studio/${params.slug}/terms?lang=${isPt ? "en" : "pt"}`} className="text-sm text-primary underline">
          {isPt ? "English" : "Português"}
        </a>
      </div>
      {block(t.termsTitle, t.termsSections)}
      {block(t.liabilityTitle, t.liabilitySections)}
      {block(t.privacyTitle, t.privacySections)}
      <p>
        <a href={`/join/${params.slug}`} className="text-sm text-primary underline">
          {isPt ? "← Voltar ao cadastro" : "← Back to sign-up"}
        </a>
      </p>
    </main>
  );
}
