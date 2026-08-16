import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Flame, Heart, HeartPulse, Package, RotateCcw, Truck } from "lucide-react";
import { getBookConfig, getBookProduct } from "@/lib/book";
import { Book3DCover } from "@/components/book-3d-cover";
import { BuyBox } from "@/components/book/buy-box";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";
import { LocalizedText } from "@/app/articles/[slug]/localized";

export const dynamic = "force-dynamic";

const BASE_URL = "https://bpr.clinic";
const PAGE_URL = `${BASE_URL}/beyond-pain/buy`;
const FREE_CHAPTER = "/beyond-pain#join";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getBookConfig();
  const title = `Buy ${config.title} — ${config.subtitle}`;
  const description =
    "Pain is rarely only physical. Beyond Pain is a whole-person guide to healing — body, soul and spirit. Paperback, delivered across the UK.";
  return {
    title,
    description,
    alternates: { canonical: PAGE_URL },
    openGraph: {
      title,
      description,
      type: "website",
      url: PAGE_URL,
      images: [{ url: `${BASE_URL}/images/book/beyond-pain-og.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/images/book/beyond-pain-og.jpg`],
    },
  };
}

export default async function BuyBeyondPainPage({
  searchParams,
}: {
  searchParams: { preview?: string };
}) {
  const config = await getBookConfig();
  const product = await getBookProduct(config);

  // Two independent switches have to agree before anything can be bought: the
  // book has to be launched, and the product has to be active. Either one off
  // means the page still sells the idea but offers no cart.
  const onSale = config.status === "ON_SALE" && product?.isActive === true;

  // ?preview=1 shows the buy box exactly as it will look, with the button
  // dead — so the layout can be approved before the book goes on sale.
  const preview = !onSale && searchParams?.preview === "1" && !!product;
  const buyable = onSale || preview ? product : null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": PAGE_URL,
    url: PAGE_URL,
    name: config.title,
    description: config.subtitle,
    author: { "@type": "Person", name: config.authorName || "Bruno" },
    bookFormat: "https://schema.org/Paperback",
    // Only ever advertise an offer that can actually be taken up — never in
    // preview, or search engines would list a price nobody can pay.
    ...(onSale && product
      ? {
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: product.currency || "GBP",
            availability: "https://schema.org/InStock",
            url: PAGE_URL,
          },
        }
      : {}),
  };

  const dimensions = [
    {
      icon: HeartPulse,
      en: "Body", pt: "Corpo",
      textEn: "Why pain is an alarm, not a measure of damage — and what that changes about every ache you've ever felt.",
      textPt: "Por que a dor é um alarme, não uma medida do dano — e o que isso muda em cada dor que você já sentiu.",
    },
    {
      icon: Heart,
      en: "Soul", pt: "Alma",
      textEn: "How stress, emotion and a hurried world quietly turn into pain in the body — and how they can be turned around.",
      textPt: "Como o estresse, a emoção e um mundo apressado se transformam silenciosamente em dor no corpo — e como isso pode ser revertido.",
    },
    {
      icon: Flame,
      en: "Spirit", pt: "Espírito",
      textEn: "The deepest layer of all: meaning, connection and a hope that doesn't depend on the pain going away.",
      textPt: "A camada mais profunda de todas: sentido, conexão e uma esperança que não depende de a dor desaparecer.",
    },
  ];

  const faqs = [
    {
      icon: Truck,
      qEn: "How is it delivered?", qPt: "Como é entregue?",
      aEn: "Posted from Ipswich, UK. As soon as it's dispatched you get an email with the tracking number and a link to follow it.",
      aPt: "Enviado de Ipswich, Reino Unido. Assim que for despachado você recebe um e-mail com o código de rastreio e um link para acompanhar.",
    },
    {
      icon: RotateCcw,
      qEn: "Can I change my mind?", qPt: "Posso desistir?",
      aEn: "Yes. Under UK law you have 14 days from the day it arrives to cancel and return it for a refund.",
      aPt: "Sim. Pela lei do Reino Unido você tem 14 dias, a contar da entrega, para cancelar e devolver com reembolso.",
    },
    {
      icon: Package,
      qEn: "What exactly do I get?", qPt: "O que exatamente eu recebo?",
      aEn: "The paperback edition of Beyond Pain — twelve chapters across four parts.",
      aPt: "A edição impressa de Beyond Pain — doze capítulos em quatro partes.",
    },
    {
      icon: BookOpen,
      qEn: "Can I read some of it first?", qPt: "Posso ler um trecho antes?",
      aEn: "Yes — the first chapter is free, and yours to keep whether or not you buy the book.",
      aPt: "Pode — o primeiro capítulo é grátis e continua seu, comprando o livro ou não.",
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Hero — the promise, the cover and the only call to action, above the fold */}
      <section className="relative overflow-hidden bg-dot-pattern">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-16 pb-12 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <h1 className="font-sora text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight mb-4">
                <LocalizedText
                  fallback="We're taught that pain lives in the body. The truth is bigger — and far more hopeful."
                  en="We're taught that pain lives in the body. The truth is bigger — and far more hopeful."
                  pt="Fomos ensinados que a dor mora no corpo. A verdade é maior — e muito mais esperançosa."
                />
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6 max-w-lg">
                <LocalizedText
                  fallback={`${config.title} — ${config.subtitle}. A whole-person guide to healing, written by a physiotherapist who has lived with pain since he was seventeen.`}
                  en={`${config.title} — ${config.subtitle}. A whole-person guide to healing, written by a physiotherapist who has lived with pain since he was seventeen.`}
                  pt={`${config.title} — ${config.subtitle}. Um guia de cura para a pessoa inteira, escrito por um fisioterapeuta que convive com dor desde os dezessete anos.`}
                />
              </p>

              {/* Deliberately small on a phone. The cookie banner takes the
                  bottom ~195px on first visit, so anything below that is
                  invisible until it is dismissed — and the price has to be
                  one of the things that survives. */}
              <div className="lg:hidden mb-5 mx-auto w-full max-w-[132px]">
                <Book3DCover coverImage={config.coverImage} coverImagePt={config.coverImagePt} title={config.title} />
              </div>

              <BuyBox product={buyable} freeChapterHref={FREE_CHAPTER} preview={preview} />
            </div>

            <div className="hidden lg:block relative mx-auto w-full max-w-sm">
              <Book3DCover coverImage={config.coverImage} coverImagePt={config.coverImagePt} title={config.title} />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Who it's for */}
        <section className="mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <LocalizedText fallback="Who it's for" en="Who it's for" pt="Para quem é" />
          </span>
          <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
            <LocalizedText
              fallback="For anyone who was told the scan was fine — and still hurts"
              en="For anyone who was told the scan was fine — and still hurts"
              pt="Para quem ouviu que o exame estava normal — e continua sentindo dor"
            />
          </h2>
          <ul className="space-y-3">
            {[
              ["You've had pain longer than anyone promised you would.", "Você sente dor há mais tempo do que qualquer um prometeu."],
              ["You've been given exercises, and not an explanation.", "Você recebeu exercícios, mas não uma explicação."],
              ["You suspect stress and life are part of it, and no one has said so.", "Você desconfia que o estresse e a vida têm parte nisso, e ninguém disse isso."],
              ["You want to understand your body, not just be treated by someone else.", "Você quer entender o próprio corpo, não apenas ser tratado por outra pessoa."],
            ].map(([en, pt]) => (
              <li key={en} className="flex gap-3 text-muted-foreground leading-relaxed">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <LocalizedText fallback={en} en={en} pt={pt} />
              </li>
            ))}
          </ul>
        </section>

        {/* What the book covers */}
        <section className="mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <LocalizedText fallback="What it covers" en="What it covers" pt="O que aborda" />
          </span>
          <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground mb-6 tracking-tight">
            <LocalizedText
              fallback="One person, three dimensions — cared for together"
              en="One person, three dimensions — cared for together"
              pt="Uma pessoa, três dimensões — cuidadas juntas"
            />
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {dimensions.map(({ icon: Icon, en, pt, textEn, textPt }) => (
              <div key={en} className="rounded-2xl border border-border bg-card ba1-card p-6">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-sora text-lg font-bold text-foreground mb-2">
                  <LocalizedText fallback={en} en={en} pt={pt} />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <LocalizedText fallback={textEn} en={textEn} pt={textPt} />
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5">
            <Link href="/beyond-pain/chapters" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <LocalizedText fallback="See the full table of contents" en="See the full table of contents" pt="Ver o índice completo" />
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </section>

        {/* The author — the reason to trust the book */}
        {config.authorBio && (
          <section className="mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
              <LocalizedText fallback="Who wrote it" en="Who wrote it" pt="Quem escreveu" />
            </span>
            <div className="rounded-2xl border border-border bg-card ba1-card p-6 sm:p-8">
              <h3 className="font-sora text-xl font-bold text-foreground mb-3">{config.authorName || "Bruno"}</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{config.authorBio}</p>
            </div>
          </section>
        )}

        {/* Questions that stop a purchase */}
        <section className="mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <LocalizedText fallback="Before you order" en="Before you order" pt="Antes de encomendar" />
          </span>
          <div className="space-y-4">
            {faqs.map(({ icon: Icon, qEn, qPt, aEn, aPt }) => (
              <div key={qEn} className="rounded-2xl border border-border bg-card ba1-card p-5">
                <h3 className="font-sora font-bold text-foreground mb-1.5 inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <LocalizedText fallback={qEn} en={qEn} pt={qPt} />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <LocalizedText fallback={aEn} en={aEn} pt={aPt} />
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The call to action, repeated after the objections are answered */}
        <section className="mb-14">
          <BuyBox product={buyable} freeChapterHref={FREE_CHAPTER} preview={preview} />
        </section>

        {/* The single alternative exit, for whoever won't buy today */}
        {onSale && (
          <section className="mb-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              <LocalizedText
                fallback="Not ready to buy?"
                en="Not ready to buy?"
                pt="Ainda não quer comprar?"
              />
            </p>
            <a href={FREE_CHAPTER}>
              <Button variant="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <LocalizedText fallback="Read the first chapter free" en="Read the first chapter free" pt="Leia o primeiro capítulo grátis" />
              </Button>
            </a>
          </section>
        )}

        <MedicalDisclaimer />
      </div>
    </>
  );
}
