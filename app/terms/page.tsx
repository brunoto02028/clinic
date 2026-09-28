"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, Database, Lock, Shield, ArrowLeft, FlaskConical } from "lucide-react";
import { termosNaLingua } from "@/lib/terms-content";

/** O ícone de cada seção — a única coisa da seção que é da tela, não do texto. */
const ICONES: Record<string, typeof Scale> = {
  servico: Scale,
  dados: Database,
  laboratorio: FlaskConical,
  responsabilidade: Lock,
};
import { useLocale } from "@/hooks/use-locale";

export default function TermsPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [customHtml, setCustomHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.termsContentHtml) setCustomHtml(d.termsContentHtml);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="public-site min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Back to Signup */}
          <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {isPt ? "Voltar ao Cadastro" : "Back to Sign Up"}
          </Link>

          <div>
            <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {isPt ? "Termos de Uso e Política de Privacidade" : "Terms of Use & Privacy Policy"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isPt
                ? "Por favor, leia estes termos com atenção antes de criar sua conta."
                : "Please read these terms carefully before creating your account."}
            </p>
          </div>

          {/* If admin set custom HTML content, render that */}
          {!loading && customHtml ? (
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold"
              dangerouslySetInnerHTML={{ __html: customHtml }}
            />
          ) : !loading ? (
            <>
              {/* As quatro seções saíram daqui e viraram dado (26/09/2026).
                  Eram 360 linhas de JSX com o texto jurídico cravado em
                  ternários, e o app tinha a **própria** cópia, com nove itens
                  destes vinte e seis. Duas cópias do mesmo texto divergem na
                  primeira edição, e a esquecida era a que o paciente lê. */}
              {termosNaLingua(isPt ? "pt" : "en").map((secao) => {
                const Icone = ICONES[secao.chave] ?? Scale;
                return (
                  <section key={secao.chave}>
                    <div className="flex items-center gap-2 mb-4">
                      <Icone className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">{secao.titulo}</h2>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-5 space-y-4 text-sm text-muted-foreground">
                      {secao.itens.map((item) => (
                        <div key={item.n} className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 flex-shrink-0">{item.n}</Badge>
                          <div>
                            <p className="font-semibold text-foreground">{item.titulo}</p>
                            <p className="mt-1">{item.corpo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* Privacy Summary */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Sua Privacidade é Importante" : "Your Privacy Matters"}</p>
                  <p className="text-muted-foreground mt-1">{isPt
                    ? "Seus dados são protegidos de acordo com o UK GDPR. Nunca vendemos seus dados. Imagens de avaliação corporal são automaticamente desfocadas no rosto para privacidade. Você pode retirar consentimento ou solicitar exclusão de dados a qualquer momento entrando em contato conosco."
                    : "Your data is protected in accordance with UK GDPR. We never sell your data. Body assessment images are automatically face-blurred for privacy. You can withdraw consent or request data deletion at any time by contacting us."}</p>
                </div>
              </div>
            </>
          ) : null}

          {/* Back to Signup */}
          <div className="text-center pb-4 space-y-3">
            <Link href="/signup">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {isPt ? "Voltar ao Cadastro" : "Back to Sign Up"}
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
