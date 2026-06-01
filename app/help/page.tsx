"use client";

import { useState } from "react";
import { ChevronDown, Search, BookOpen, Video, FileText, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SiteHeader } from "@/components/site-header";

const faqs = [
  {
    category: "Primeiros Passos",
    icon: BookOpen,
    questions: [
      {
        q: "Como faço upload de um scan do pé?",
        a: "1. Vá para 'Pacientes' no menu\n2. Selecione o paciente\n3. Clique em 'Novo Scan'\n4. Arraste o arquivo 3D ou clique para selecionar\n5. Aguarde o processamento (30-60 segundos)",
        video: "/videos/upload-scan.mp4"
      },
      {
        q: "Quanto tempo leva para processar um scan?",
        a: "O processamento geralmente leva entre 30 a 60 segundos, dependendo do tamanho do arquivo e complexidade do scan. Você receberá uma notificação quando estiver pronto.",
      },
      {
        q: "Quais formatos de arquivo são suportados?",
        a: "Aceitamos arquivos 3D nos formatos:\n• .OBJ (recomendado)\n• .STL\n• .GLB\n• .FBX\n\nTamanho máximo: 50MB por arquivo",
      },
    ],
  },
  {
    category: "Palmilhas",
    icon: FileText,
    questions: [
      {
        q: "Como gero palmilhas customizadas?",
        a: "1. Após o scan ser processado, clique em 'Gerar Palmilhas'\n2. Revise as medidas biomecânicas\n3. Ajuste se necessário\n4. Clique em 'Confirmar e Gerar'\n5. Aguarde a geração (15-30 segundos)\n6. Baixe os arquivos STL para impressão 3D",
      },
      {
        q: "Posso ajustar as palmilhas manualmente?",
        a: "Sim! Após a geração automática, você pode:\n• Ajustar altura do arco\n• Modificar suporte do calcanhar\n• Alterar densidade do material\n• Adicionar correções específicas\n\nTodas as mudanças são salvas automaticamente.",
      },
      {
        q: "Como envio as palmilhas para o paciente?",
        a: "1. Após gerar, clique em 'Compartilhar com Paciente'\n2. O paciente receberá um email com link\n3. Ele pode visualizar em 3D no navegador\n4. Pode baixar os arquivos se autorizado\n5. Você pode revogar acesso a qualquer momento",
      },
    ],
  },
  {
    category: "Portal do Paciente",
    icon: HelpCircle,
    questions: [
      {
        q: "Como o paciente acessa seus scans?",
        a: "O paciente recebe um email com link único e seguro. Não precisa criar conta. Pode visualizar:\n• Scans 3D interativos\n• Timeline de progresso\n• Análise biomecânica\n• Recomendações\n\nO link expira após 30 dias por segurança.",
      },
      {
        q: "O paciente pode baixar os arquivos?",
        a: "Depende da sua configuração:\n• Visualização: Sempre permitida\n• Download: Você controla\n• Compartilhamento: Você controla\n\nVá em Configurações > Privacidade para ajustar.",
      },
    ],
  },
  {
    category: "Análise Biomecânica",
    icon: Video,
    questions: [
      {
        q: "O que significa 'Arch Index'?",
        a: "Arch Index é a razão entre a área do mediopé e a área total do pé:\n• Normal: 0.21 - 0.26\n• Pé Plano: > 0.26\n• Arco Alto: < 0.21\n\nÉ calculado automaticamente pelo nosso algoritmo de IA.",
      },
      {
        q: "Como interpreto o mapa de pressão?",
        a: "O mapa de pressão mostra distribuição de força:\n• Vermelho: Alta pressão (>100 kPa)\n• Amarelo: Pressão média (50-100 kPa)\n• Verde: Pressão baixa (<50 kPa)\n• Azul: Sem contato\n\nÁreas vermelhas indicam pontos de atenção.",
      },
    ],
  },
  {
    category: "Problemas Comuns",
    icon: HelpCircle,
    questions: [
      {
        q: "O scan não está processando",
        a: "Verifique:\n1. Arquivo está no formato correto (.obj, .stl, .glb)\n2. Tamanho é menor que 50MB\n3. Conexão com internet está estável\n4. Tente fazer upload novamente\n\nSe persistir, contate suporte.",
      },
      {
        q: "Esqueci minha senha",
        a: "1. Clique em 'Esqueci minha senha' no login\n2. Digite seu email\n3. Verifique sua caixa de entrada\n4. Clique no link recebido (válido por 1 hora)\n5. Crie nova senha\n\nSe não receber o email, verifique spam.",
      },
      {
        q: "Como cancelo minha assinatura?",
        a: "1. Vá em Configurações > Assinatura\n2. Clique em 'Gerenciar Assinatura'\n3. Selecione 'Cancelar'\n4. Confirme o cancelamento\n\nVocê terá acesso até o fim do período pago.",
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Central de Ajuda</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Encontre respostas para suas dúvidas
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Pesquisar dúvidas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-lg"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <Video className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Vídeos Tutoriais</CardTitle>
              <CardDescription>Aprenda assistindo</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <BookOpen className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Guia Completo</CardTitle>
              <CardDescription>Documentação detalhada</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <HelpCircle className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Contato</CardTitle>
              <CardDescription>Fale com suporte</CardDescription>
            </CardHeader>
          </Card>
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
                            {faq.video && (
                              <Button variant="link" className="mt-4 p-0">
                                <Video className="h-4 w-4 mr-2" />
                                Ver vídeo tutorial
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
            <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Não encontramos nada para "{searchQuery}"
            </p>
            <Button onClick={() => setSearchQuery("")}>Limpar busca</Button>
          </div>
        )}

        {/* Contact Support */}
        <Card className="mt-12 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Ainda precisa de ajuda?</CardTitle>
            <CardDescription>
              Nossa equipe está pronta para ajudar você
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button>Enviar Mensagem</Button>
              <Button variant="outline">Agendar Chamada</Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
