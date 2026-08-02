"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Search, BookOpen, HelpCircle, Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocale } from "@/hooks/use-locale";

type FaqQuestion = { q: string; a: string; link?: { href: string; label: string } };
type FaqCategory = { category: string; icon: any; questions: FaqQuestion[] };

const getFaqs = (isPt: boolean): FaqCategory[] => [
  {
    category: isPt ? "Marcações e Primeiros Passos" : "Bookings & Getting Started",
    icon: Calendar,
    questions: [
      {
        q: isPt ? "Como marco a minha primeira consulta?" : "How do I book my first appointment?",
        a: isPt
          ? "Clica em 'Iniciar o Meu Programa' em qualquer página do site, ou contacta-nos diretamente. A nossa equipa entra em contacto para agendar a tua primeira consulta."
          : "Click 'Start Your Programme' on any page of the site, or contact us directly. Our team will get in touch to schedule your first appointment.",
      },
      {
        q: isPt ? "O que esperar na minha primeira consulta?" : "What should I expect at my first appointment?",
        a: isPt
          ? "A tua primeira consulta é feita presencialmente com o teu terapeuta, que avalia a tua condição e define o plano de tratamento mais adequado. Antes da consulta, vamos pedir-te para completares um breve questionário de triagem médica no teu portal."
          : "Your first appointment is carried out in person with your therapist, who assesses your condition and defines the most suitable treatment plan. Ahead of your appointment, we'll ask you to complete a short medical screening questionnaire in your portal.",
      },
    ],
  },
  {
    category: isPt ? "Portal do Paciente" : "Patient Portal",
    icon: BookOpen,
    questions: [
      {
        q: isPt ? "Como acedo ao portal do paciente?" : "How do I access the patient portal?",
        a: isPt
          ? "A tua conta é criada pela nossa equipa. Vais receber um email de convite para definires a tua palavra-passe e entrares no portal."
          : "Your account is created by our team. You'll receive an email invite to set your password and log in to the portal.",
      },
      {
        q: isPt ? "O que posso ver no portal?" : "What can I see in the portal?",
        a: isPt
          ? "Consultas, o teu histórico clínico, plano de exercícios, artigos educativos e as tuas mensagens com a clínica — tudo num só lugar."
          : "Appointments, your clinical history, exercise plan, educational articles and your messages with the clinic — all in one place.",
      },
      {
        q: isPt ? "Esqueci a minha palavra-passe" : "I forgot my password",
        a: isPt
          ? "Clica em 'Esqueci a minha palavra-passe' na página de login, introduz o teu email e segue o link que recebes (válido por 1 hora) para criares uma nova."
          : "Click 'Forgot password' on the login page, enter your email, and follow the link you receive (valid for 1 hour) to set a new one.",
      },
    ],
  },
  {
    category: isPt ? "Consultas e Cancelamentos" : "Appointments & Cancellations",
    icon: RefreshCw,
    questions: [
      {
        q: isPt ? "Como cancelo ou remarco uma consulta?" : "How do I cancel or reschedule an appointment?",
        a: isPt
          ? "Consulta a nossa Política de Cancelamento e Reembolso para todos os detalhes, ou contacta-nos diretamente para remarcar."
          : "Please check our Cancellation & Refund Policy for full details, or contact us directly to reschedule.",
        link: { href: "/cancellation-policy", label: isPt ? "Ver Política de Cancelamento" : "View Cancellation Policy" },
      },
    ],
  },
];

export default function HelpPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [settings, setSettings] = useState<{ whatsappEnabled?: boolean; whatsappNumber?: string; whatsappMessage?: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings(d))
      .catch(() => {});
  }, []);

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const faqs = getFaqs(isPt);
  
  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full">
          {/* Header */}
          <div className="text-center mb-12">
          <h1 className="font-sora text-4xl font-bold mb-4 tracking-tight">{isPt ? "Central de Ajuda" : "Help Centre"}</h1>
          <p className="text-muted-foreground text-lg mb-8">
            {isPt ? "Encontre respostas para suas dúvidas" : "Find answers to your questions"}
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder={isPt ? "Pesquisar dúvidas..." : "Search questions..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-lg"
            />
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-8">
          {filteredFaqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <div className="flex items-center gap-3 mb-4">
                <category.icon className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{category.category}</h2>
              </div>

              <div className="space-y-3">
                {category.questions.map((faq, faqIndex) => {
                  const itemId = `${categoryIndex}-${faqIndex}`;
                  const isOpen = openItems.includes(itemId);

                  return (
                    <Card key={faqIndex}>
                      <Collapsible open={isOpen} onOpenChange={() => toggleItem(itemId)}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-medium">
                                {faq.q}
                              </CardTitle>
                              <ChevronDown
                                className={`h-5 w-5 transition-transform ${
                                  isOpen ? "transform rotate-180" : ""
                                }`}
                              />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <p className="text-muted-foreground whitespace-pre-line">
                              {faq.a}
                            </p>
                            {faq.link && (
                              <Button variant="link" className="mt-2 p-0 h-auto" asChild>
                                <Link href={faq.link.href}>{faq.link.label} →</Link>
                              </Button>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredFaqs.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{isPt ? "Nenhum resultado encontrado" : "No results found"}</h3>
            <p className="text-muted-foreground mb-6">
              {isPt ? `Não encontramos nada para "${searchQuery}"` : `We couldn't find anything for "${searchQuery}"`}
            </p>
            <Button onClick={() => setSearchQuery("")}>{isPt ? "Limpar busca" : "Clear search"}</Button>
          </div>
        )}

        {/* Contact Support */}
        <Card className="mt-12 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>{isPt ? "Ainda precisa de ajuda?" : "Still need help?"}</CardTitle>
            <CardDescription>
              {isPt ? "Nossa equipe está pronta para ajudar você" : "Our team is ready to help you"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {settings?.whatsappEnabled && settings?.whatsappNumber && (
                <Button asChild>
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}${settings.whatsappMessage ? `?text=${encodeURIComponent(settings.whatsappMessage)}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isPt ? "Enviar Mensagem" : "Send Message"}
                  </a>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/signup">{isPt ? "Iniciar o Meu Programa" : "Start Your Programme"}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
