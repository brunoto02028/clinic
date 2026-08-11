import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowRight, BookOpen, Sparkles, HeartHandshake, HeartPulse, Heart, Flame, ShieldCheck } from "lucide-react";
import { getBookConfig, getBookReaderFromToken, resolveReferrerContact } from "@/lib/book";
import { BookCaptureForm } from "@/components/book-capture-form";
import { BookReferForm } from "@/components/book-refer-form";
import { Book3DCover } from "@/components/book-3d-cover";
import { BookRoadmap } from "@/components/book-roadmap";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";
import { LocalizedText } from "@/app/articles/[slug]/localized";

export const dynamic = "force-dynamic";

const BASE_URL = "https://bpr.clinic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getBookConfig();
  const title = `${config.title} — ${config.subtitle} | Bruno Physical Rehabilitation`;
  const description = "Pain is rarely only physical. Read the first chapter of Beyond Pain, a new book on the science and soul of healing, free.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/beyond-pain` },
    openGraph: { title, description, type: "website", url: `${BASE_URL}/beyond-pain` },
  };
}

export default async function BeyondPainPage({
  searchParams,
}: {
  searchParams: { refFrom?: string; ref?: string };
}) {
  const config = await getBookConfig();
  const cookieStore = cookies();
  const reader = await getBookReaderFromToken(cookieStore.get("book_access")?.value);

  // refFrom = a known EmailContact referring a friend (arrived via a link in
  // a marketing email) — pre-identifies them in the refer form below.
  // ref = a friend who was referred (arrived via the invite email) — passed
  // through to BookCaptureForm so a successful signup gets attributed.
  const refFrom = searchParams?.refFrom;
  const referralId = searchParams?.ref;
  const referrerContact = await resolveReferrerContact(refFrom);
  // Only forward the id once it's actually confirmed to resolve to a real
  // contact — never hand an unverified URL param to the refer API.
  const verifiedRefFrom = referrerContact ? refFrom : undefined;

  const pageUrl = `${BASE_URL}/beyond-pain`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": pageUrl,
    url: pageUrl,
    name: config.title,
    description: config.subtitle,
    author: { "@type": "Person", name: config.authorName || "Bruno" },
    workExample: { "@type": "Book", bookFormat: "https://schema.org/EBook" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-dot-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text */}
            <div>
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
                <Sparkles className="h-3.5 w-3.5" /><LocalizedText fallback="A new book · coming soon" en="A new book · coming soon" pt="Um novo livro · em breve" />
              </span>
              <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight mb-5">
                <LocalizedText fallback={config.title} en={config.title} pt={config.titlePt || config.title} />
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-4">
                <LocalizedText fallback={config.subtitle} en={config.subtitle} pt={config.subtitlePt || config.subtitle} />
              </p>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                <LocalizedText
                  fallback="We're taught that pain lives in the body. The truth is bigger — and far more hopeful."
                  en="We're taught that pain lives in the body. The truth is bigger — and far more hopeful."
                  pt="Fomos ensinados que a dor mora no corpo. A verdade é maior — e muito mais esperançosa."
                />
              </p>
              {!reader && config.status !== "ON_SALE" && (
                <div className="mt-8">
                  <a href="#join">
                    <Button size="lg" variant="ba1Primary" className="gap-2">
                      <LocalizedText fallback="Read the first chapter free" en="Read the first chapter free" pt="Leia o primeiro capítulo grátis" /> <ArrowRight className="h-5 w-5" />
                    </Button>
                  </a>
                  <p className="text-xs text-muted-foreground mt-3 max-w-sm">
                    <LocalizedText
                      fallback="The first chapter, sent straight to your inbox — free. Then follow the book, chapter by chapter, as it's written."
                      en="The first chapter, sent straight to your inbox — free. Then follow the book, chapter by chapter, as it's written."
                      pt="O primeiro capítulo, direto na sua caixa de entrada — grátis. Depois acompanhe o livro, capítulo por capítulo, à medida que é escrito."
                    />
                  </p>
                </div>
              )}
              <p className="mt-4">
                <Link href="/beyond-pain/chapters" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <LocalizedText fallback="See the table of contents" en="See the table of contents" pt="Ver o índice de capítulos" /> <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>

            {/* Cover — 3D book mockup */}
            <div className="relative mx-auto w-full max-w-xs lg:max-w-sm pb-6">
              <Book3DCover coverImage={config.coverImage} coverImagePt={config.coverImagePt} title={config.title} />
              <div className="hidden sm:block absolute -bottom-1 -left-5 bg-white rounded-2xl p-4 shadow-xl border border-border ba1-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><HeartHandshake className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">
                      <LocalizedText fallback="Body, soul & spirit" en="Body, soul & spirit" pt="Corpo, alma & espírito" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <LocalizedText fallback="A whole-person guide to healing" en="A whole-person guide to healing" pt="Um guia de cura para a pessoa inteira" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        {/* What the book is about */}
        <section className="mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <LocalizedText fallback="What it's about" en="What it's about" pt="Sobre o que é" />
          </span>
          <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
            <LocalizedText fallback="A guide out of suffering and into wholeness" en="A guide out of suffering and into wholeness" pt="Um guia para sair do sofrimento e entrar na plenitude" />
          </h2>
          <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
            <LocalizedText
              fallback={`Pain is rarely only physical. It speaks the language of the body, the mind and the spirit — and lasting healing has to meet all three. Drawing on the real science of how pain works, alongside a faith that takes the whole person seriously, ${config.title} is being written now — chapter by chapter — and you can follow the journey from the very first page.`}
              en={`Pain is rarely only physical. It speaks the language of the body, the mind and the spirit — and lasting healing has to meet all three. Drawing on the real science of how pain works, alongside a faith that takes the whole person seriously, ${config.title} is being written now — chapter by chapter — and you can follow the journey from the very first page.`}
              pt={`A dor raramente é só física. Ela fala a língua do corpo, da mente e do espírito, e a cura duradoura precisa alcançar os três. Baseado na ciência real de como a dor funciona, e também numa fé que leva a pessoa inteira a sério, ${config.title} está sendo escrito agora, capítulo por capítulo, e você pode acompanhar essa jornada desde a primeira página.`}
            />
          </p>
        </section>

        {/* The three dimensions */}
        <section className="mb-14">
          <p className="text-center text-muted-foreground text-sm sm:text-base mb-8">
            <LocalizedText fallback="One person, three dimensions — cared for together." en="One person, three dimensions — cared for together." pt="Uma pessoa, três dimensões — cuidadas juntas." />
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-border bg-card ba1-card p-6">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <HeartPulse className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-sora text-lg font-bold text-foreground mb-2"><LocalizedText fallback="Body" en="Body" pt="Corpo" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText
                  fallback="Why pain is an alarm, not a measure of damage — and what that changes about every ache you've ever felt."
                  en="Why pain is an alarm, not a measure of damage — and what that changes about every ache you've ever felt."
                  pt="Por que a dor é um alarme, não uma medida do dano — e o que isso muda em cada dor que você já sentiu."
                />
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card ba1-card p-6">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-sora text-lg font-bold text-foreground mb-2"><LocalizedText fallback="Soul" en="Soul" pt="Alma" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText
                  fallback="How stress, emotion and a hurried world quietly turn into pain in the body — and how they can be turned around."
                  en="How stress, emotion and a hurried world quietly turn into pain in the body — and how they can be turned around."
                  pt="Como o estresse, a emoção e um mundo apressado se transformam silenciosamente em dor no corpo — e como isso pode ser revertido."
                />
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card ba1-card p-6">
              <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Flame className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-sora text-lg font-bold text-foreground mb-2"><LocalizedText fallback="Spirit" en="Spirit" pt="Espírito" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText
                  fallback="The deepest layer of all: meaning, connection and a hope that doesn't depend on the pain going away."
                  en="The deepest layer of all: meaning, connection and a hope that doesn't depend on the pain going away."
                  pt="A camada mais profunda de todas: sentido, conexão e uma esperança que não depende de a dor desaparecer."
                />
              </p>
            </div>
          </div>
        </section>

        {/* In this book — full 12-chapter roadmap, builds curiosity for readers of Chapter One */}
        <section className="mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <LocalizedText fallback="In this book" en="In this book" pt="Neste livro" />
          </span>
          <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
            <LocalizedText fallback="Twelve chapters, four parts" en="Twelve chapters, four parts" pt="Doze capítulos, quatro partes" />
          </h2>
          <p className="text-muted-foreground leading-relaxed text-base mb-6">
            <LocalizedText
              fallback="Chapter One is free today. Here's where the rest of the journey goes."
              en="Chapter One is free today. Here's where the rest of the journey goes."
              pt="O Capítulo Um é grátis hoje. Aqui está para onde vai o resto da jornada."
            />
          </p>
          <BookRoadmap canReadChapterOne={!!reader} />
          <div className="text-center mt-6">
            <Link href="/beyond-pain/chapters" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <LocalizedText fallback="See the full table of contents" en="See the full table of contents" pt="Ver o índice completo" /> <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* About the author */}
        <section className="mb-14 rounded-2xl border border-border bg-card ba1-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-[#EDF3EF] to-[#E4E3DF] border border-border shrink-0 flex items-center justify-center">
              {config.authorPhoto ? (
                <Image
                  src={config.authorPhoto}
                  alt={`${config.authorName || "Bruno"} — sports and clinical therapist and author of ${config.title}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span className="font-sora text-2xl font-bold text-primary">{(config.authorName || "B").charAt(0)}</span>
              )}
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                <LocalizedText fallback="About the author" en="About the author" pt="Sobre o autor" />
              </span>
              <div className="space-y-3">
                {(
                  config.authorBio ||
                  `Written by ${config.authorName || "Bruno"}, a sports and clinical therapist in Ipswich and a former professional footballer who came back from three knee surgeries. "My purpose is simple: to treat every person the way I wish I'd been treated during my own recovery — with real attention, not just protocol."`
                )
                  .split(/\n\s*\n/)
                  .map((paragraph: string, i: number, arr: string[]) => (
                    <p
                      key={i}
                      className={`text-muted-foreground leading-relaxed ${i === arr.length - 1 && paragraph.trim().startsWith('"') ? "italic" : ""}`}
                    >
                      {paragraph.trim()}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* Join / buy block — launch switch */}
        <section id="join" className="mb-14 scroll-mt-24">
          {config.status === "ON_SALE" ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-10 text-center">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-sora text-2xl font-bold text-foreground mb-2">
                <LocalizedText fallback={`${config.title} is available now`} en={`${config.title} is available now`} pt={`${config.title} já está disponível`} />
              </h2>
              {config.priceDisplay && <p className="text-muted-foreground mb-6">{config.priceDisplay}</p>}
              <div className="flex flex-wrap gap-3 justify-center">
                {config.buyLinkDirect && (
                  <a href={config.buyLinkDirect}>
                    <Button size="lg" variant="ba1Primary" className="gap-2"><LocalizedText fallback="Buy direct" en="Buy direct" pt="Comprar diretamente" /> <ArrowRight className="h-4 w-4" /></Button>
                  </a>
                )}
                {config.buyLinkAmazon && (
                  <a href={config.buyLinkAmazon}>
                    <Button size="lg" variant="ba1Outline"><LocalizedText fallback="Buy on Amazon" en="Buy on Amazon" pt="Comprar na Amazon" /></Button>
                  </a>
                )}
              </div>
            </div>
          ) : reader ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-10 text-center">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-sora text-xl font-bold text-foreground mb-2"><LocalizedText fallback="Welcome back" en="Welcome back" pt="Bem-vindo de volta" /></h2>
              <p className="text-sm text-muted-foreground mb-6"><LocalizedText fallback="You've already confirmed your email — jump straight back in." en="You've already confirmed your email — jump straight back in." pt="Você já confirmou o seu email — volte direto à leitura." /></p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/beyond-pain/chapter-one">
                  <Button size="lg" variant="ba1Primary" className="gap-2"><LocalizedText fallback="Continue reading" en="Continue reading" pt="Continuar lendo" /> <ArrowRight className="h-4 w-4" /></Button>
                </Link>
                <Link href="/beyond-pain/chapters">
                  <Button size="lg" variant="ba1Outline"><LocalizedText fallback="All chapters" en="All chapters" pt="Todos os capítulos" /></Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card ba1-card p-6 sm:p-10">
              <h2 className="font-sora text-2xl font-bold text-foreground mb-2 text-center">
                {config.status === "WAITLIST" ? (
                  <LocalizedText fallback="Join the waitlist for launch-day pricing" en="Join the waitlist for launch-day pricing" pt="Entre na lista de espera para o preço de lançamento" />
                ) : (
                  <LocalizedText fallback="Read Chapter One free — and follow the book as it's written" en="Read Chapter One free — and follow the book as it's written" pt="Leia o Capítulo Um grátis — e acompanhe o livro à medida que é escrito" />
                )}
              </h2>
              <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">
                {config.status === "WAITLIST" ? (
                  <LocalizedText
                    fallback="Join the list to read the opening chapter today, get behind-the-scenes insights as each chapter is written, and be first to know when the book launches — with a special early-reader price."
                    en="Join the list to read the opening chapter today, get behind-the-scenes insights as each chapter is written, and be first to know when the book launches — with a special early-reader price."
                    pt="Entre na lista para ler o capítulo de abertura hoje, receber bastidores à medida que cada capítulo é escrito, e ser o primeiro a saber quando o livro for lançado — com um preço especial de leitor antecipado."
                  />
                ) : (
                  <LocalizedText
                    fallback="Enter your email and I'll send you the first chapter today. As each new chapter is finished, you'll be among the first to read it — and the first to know when Beyond Pain is published."
                    en="Enter your email and I'll send you the first chapter today. As each new chapter is finished, you'll be among the first to read it — and the first to know when Beyond Pain is published."
                    pt="Digite o seu email e eu envio o primeiro capítulo hoje. À medida que cada novo capítulo for concluído, você será um dos primeiros a lê-lo — e o primeiro a saber quando Além da Dor for publicado."
                  />
                )}
              </p>
              <BookCaptureForm compact referralId={referralId} />
            </div>
          )}
        </section>

        {/* Refer a friend */}
        <section className="mb-14">
          <BookReferForm referrerContactId={verifiedRefFrom} referrerName={referrerContact?.firstName || undefined} />
        </section>

        {/* An honest note */}
        <section className="mb-14 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <div className="flex gap-4 items-start">
            <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-sora text-base font-bold text-foreground mb-2"><LocalizedText fallback="A note of honesty" en="A note of honesty" pt="Uma nota de honestidade" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText
                  fallback="This book won't promise miracle cures or quick fixes — that wouldn't be true, and it wouldn't be kind. What it offers is something more trustworthy: a clear-eyed look at how pain really works, faith that never blames the person who's suffering, and real hope for the whole person. It's a companion to your care — never a replacement for your doctor or therapist."
                  en="This book won't promise miracle cures or quick fixes — that wouldn't be true, and it wouldn't be kind. What it offers is something more trustworthy: a clear-eyed look at how pain really works, faith that never blames the person who's suffering, and real hope for the whole person. It's a companion to your care — never a replacement for your doctor or therapist."
                  pt="Este livro não vai prometer curas milagrosas ou soluções rápidas — isso não seria verdade, nem seria bondoso. O que ele oferece é algo mais confiável: um olhar honesto sobre como a dor realmente funciona, uma fé que nunca culpa quem sofre, e uma esperança real para a pessoa inteira. É um companheiro para o seu cuidado — nunca um substituto do seu médico ou terapeuta."
                />
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <h2 className="font-sora text-2xl font-bold text-foreground mb-6 tracking-tight text-center">
            <LocalizedText fallback="Frequently asked questions" en="Frequently asked questions" pt="Perguntas frequentes" />
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card ba1-card p-5">
              <h3 className="font-semibold text-foreground mb-1.5"><LocalizedText fallback="Is the book finished?" en="Is the book finished?" pt="O livro já está pronto?" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText fallback="It's being written now, chapter by chapter. Subscribers follow along and read each chapter as it's completed." en="It's being written now, chapter by chapter. Subscribers follow along and read each chapter as it's completed." pt="Está sendo escrito agora, capítulo por capítulo. Os inscritos acompanham e leem cada capítulo à medida que é concluído." />
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card ba1-card p-5">
              <h3 className="font-semibold text-foreground mb-1.5"><LocalizedText fallback="What will it cost?" en="What will it cost?" pt="Quanto vai custar?" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText fallback="Chapter One is free. The full book will be available to buy at launch — subscribers hear first." en="Chapter One is free. The full book will be available to buy at launch — subscribers hear first." pt="O Capítulo Um é grátis. O livro completo estará disponível para compra no lançamento — os inscritos são avisados primeiro." />
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card ba1-card p-5">
              <h3 className="font-semibold text-foreground mb-1.5"><LocalizedText fallback="Is this a religious book?" en="Is this a religious book?" pt="Este é um livro religioso?" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText fallback="It takes both science and faith seriously, honestly and without preaching. It's written for people of faith and of none — the science stands on its own, and the deeper questions are offered, never forced." en="It takes both science and faith seriously, honestly and without preaching. It's written for people of faith and of none — the science stands on its own, and the deeper questions are offered, never forced." pt="Ele leva a ciência e a fé a sério, com honestidade e sem pregar. É escrito para pessoas de fé e sem fé — a ciência se sustenta por si só, e as questões mais profundas são oferecidas, nunca impostas." />
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card ba1-card p-5">
              <h3 className="font-semibold text-foreground mb-1.5"><LocalizedText fallback="English or Portuguese?" en="English or Portuguese?" pt="Inglês ou Português?" /></h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <LocalizedText fallback="Beyond Pain is being written in English first, with a Portuguese edition to follow — but Chapter One is already available in both. Choose your language when you sign up below." en="Beyond Pain is being written in English first, with a Portuguese edition to follow — but Chapter One is already available in both. Choose your language when you sign up below." pt="Além da Dor está sendo escrito primeiro em inglês, com uma edição em português a seguir — mas o Capítulo Um já está disponível nos dois idiomas. Escolha o seu idioma ao se inscrever abaixo." />
              </p>
            </div>
          </div>
        </section>

        <div className="text-center mb-10">
          <Link href="/articles" className="text-sm text-primary hover:underline">
            <LocalizedText fallback="← Back to the study centre" en="← Back to the study centre" pt="← Voltar ao centro de estudos" />
          </Link>
        </div>

        <MedicalDisclaimer />
      </div>
    </>
  );
}
