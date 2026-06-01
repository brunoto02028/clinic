"use client";

import { useState } from "react";
import { ChevronDown, Search, BookOpen, Video, FileText, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocale } from "@/hooks/use-locale";

const getFaqs = (isPt: boolean) => [
  {
    category: isPt ? "Primeiros Passos" : "Getting Started",
    icon: BookOpen,
    questions: [
      {
        q: isPt ? "Como faço upload de um scan do pé?" : "How do I upload a foot scan?",
        a: isPt 
          ? "1. Vá para 'Pacientes' no menu\n2. Selecione o paciente\n3. Clique em 'Novo Scan'\n4. Arraste o arquivo 3D ou clique para selecionar\n5. Aguarde o processamento (30-60 segundos)"
          : "1. Go to 'Patients' in the menu\n2. Select the patient\n3. Click 'New Scan'\n4. Drag the 3D file or click to select\n5. Wait for processing (30-60 seconds)",
        video: "/videos/upload-scan.mp4"
      },
      {
        q: isPt ? "Quanto tempo leva para processar um scan?" : "How long does it take to process a scan?",
        a: isPt
          ? "O processamento geralmente leva entre 30 a 60 segundos, dependendo do tamanho do arquivo e complexidade do scan. Você receberá uma notificação quando estiver pronto."
          : "Processing typically takes 30 to 60 seconds, depending on file size and scan complexity. You'll receive a notification when it's ready.",
      },
      {
        q: isPt ? "Quais formatos de arquivo são suportados?" : "What file formats are supported?",
        a: isPt
          ? "Aceitamos arquivos 3D nos formatos:\n• .OBJ (recomendado)\n• .STL\n• .GLB\n• .FBX\n\nTamanho máximo: 50MB por arquivo"
          : "We accept 3D files in the following formats:\n• .OBJ (recommended)\n• .STL\n• .GLB\n• .FBX\n\nMaximum size: 50MB per file",
      },
    ],
  },
  {
    category: isPt ? "Palmilhas" : "Insoles",
    icon: FileText,
    questions: [
      {
        q: isPt ? "Como gero palmilhas customizadas?" : "How do I generate custom insoles?",
        a: isPt
          ? "1. Após o scan ser processado, clique em 'Gerar Palmilhas'\n2. Revise as medidas biomecânicas\n3. Ajuste se necessário\n4. Clique em 'Confirmar e Gerar'\n5. Aguarde a geração (15-30 segundos)\n6. Baixe os arquivos STL para impressão 3D"
          : "1. After the scan is processed, click 'Generate Insoles'\n2. Review the biomechanical measurements\n3. Adjust if necessary\n4. Click 'Confirm and Generate'\n5. Wait for generation (15-30 seconds)\n6. Download STL files for 3D printing",
      },
      {
        q: isPt ? "Posso ajustar as palmilhas manualmente?" : "Can I adjust the insoles manually?",
        a: isPt
          ? "Sim! Após a geração automática, você pode:\n• Ajustar altura do arco\n• Modificar suporte do calcanhar\n• Alterar densidade do material\n• Adicionar correções específicas\n\nTodas as mudanças são salvas automaticamente."
          : "Yes! After automatic generation, you can:\n• Adjust arch height\n• Modify heel support\n• Change material density\n• Add specific corrections\n\nAll changes are saved automatically.",
      },
      {
        q: isPt ? "Como envio as palmilhas para o paciente?" : "How do I send the insoles to the patient?",
        a: isPt
          ? "1. Após gerar, clique em 'Compartilhar com Paciente'\n2. O paciente receberá um email com link\n3. Ele pode visualizar em 3D no navegador\n4. Pode baixar os arquivos se autorizado\n5. Você pode revogar acesso a qualquer momento"
          : "1. After generating, click 'Share with Patient'\n2. The patient will receive an email with a link\n3. They can view in 3D in the browser\n4. Can download files if authorized\n5. You can revoke access at any time",
      },
    ],
  },
  {
    category: isPt ? "Portal do Paciente" : "Patient Portal",
    icon: HelpCircle,
    questions: [
      {
        q: isPt ? "Como o paciente acessa seus scans?" : "How does the patient access their scans?",
        a: isPt
          ? "O paciente recebe um email com link único e seguro. Não precisa criar conta. Pode visualizar:\n• Scans 3D interativos\n• Timeline de progresso\n• Análise biomecânica\n• Recomendações\n\nO link expira após 30 dias por segurança."
          : "The patient receives an email with a unique and secure link. No account needed. They can view:\n• Interactive 3D scans\n• Progress timeline\n• Biomechanical analysis\n• Recommendations\n\nThe link expires after 30 days for security.",
      },
      {
        q: isPt ? "O paciente pode baixar os arquivos?" : "Can the patient download the files?",
        a: isPt
          ? "Depende da sua configuração:\n• Visualização: Sempre permitida\n• Download: Você controla\n• Compartilhamento: Você controla\n\nVá em Configurações > Privacidade para ajustar."
          : "It depends on your settings:\n• Viewing: Always allowed\n• Download: You control\n• Sharing: You control\n\nGo to Settings > Privacy to adjust.",
      },
    ],
  },
  {
    category: isPt ? "Análise Biomecânica" : "Biomechanical Analysis",
    icon: Video,
    questions: [
      {
        q: isPt ? "O que significa 'Arch Index'?" : "What does 'Arch Index' mean?",
        a: isPt
          ? "Arch Index é a razão entre a área do mediopé e a área total do pé:\n• Normal: 0.21 - 0.26\n• Pé Plano: > 0.26\n• Arco Alto: < 0.21\n\nÉ calculado automaticamente pelo nosso algoritmo de IA."
          : "Arch Index is the ratio between the midfoot area and the total foot area:\n• Normal: 0.21 - 0.26\n• Flat Foot: > 0.26\n• High Arch: < 0.21\n\nIt's calculated automatically by our AI algorithm.",
      },
      {
        q: isPt ? "Como interpreto o mapa de pressão?" : "How do I interpret the pressure map?",
        a: isPt
          ? "O mapa de pressão mostra distribuição de força:\n• Vermelho: Alta pressão (>100 kPa)\n• Amarelo: Pressão média (50-100 kPa)\n• Verde: Pressão baixa (<50 kPa)\n• Azul: Sem contato\n\nÁreas vermelhas indicam pontos de atenção."
          : "The pressure map shows force distribution:\n• Red: High pressure (>100 kPa)\n• Yellow: Medium pressure (50-100 kPa)\n• Green: Low pressure (<50 kPa)\n• Blue: No contact\n\nRed areas indicate points of attention.",
      },
    ],
  },
  {
    category: isPt ? "Problemas Comuns" : "Common Issues",
    icon: HelpCircle,
    questions: [
      {
        q: isPt ? "O scan não está processando" : "The scan is not processing",
        a: isPt
          ? "Verifique:\n1. Arquivo está no formato correto (.obj, .stl, .glb)\n2. Tamanho é menor que 50MB\n3. Conexão com internet está estável\n4. Tente fazer upload novamente\n\nSe persistir, contate suporte."
          : "Check:\n1. File is in the correct format (.obj, .stl, .glb)\n2. Size is less than 50MB\n3. Internet connection is stable\n4. Try uploading again\n\nIf it persists, contact support.",
      },
      {
        q: isPt ? "Esqueci minha senha" : "I forgot my password",
        a: isPt
          ? "1. Clique em 'Esqueci minha senha' no login\n2. Digite seu email\n3. Verifique sua caixa de entrada\n4. Clique no link recebido (válido por 1 hora)\n5. Crie nova senha\n\nSe não receber o email, verifique spam."
          : "1. Click 'Forgot password' on login\n2. Enter your email\n3. Check your inbox\n4. Click the link received (valid for 1 hour)\n5. Create new password\n\nIf you don't receive the email, check spam.",
      },
      {
        q: isPt ? "Como cancelo minha assinatura?" : "How do I cancel my subscription?",
        a: isPt
          ? "1. Vá em Configurações > Assinatura\n2. Clique em 'Gerenciar Assinatura'\n3. Selecione 'Cancelar'\n4. Confirme o cancelamento\n\nVocê terá acesso até o fim do período pago."
          : "1. Go to Settings > Subscription\n2. Click 'Manage Subscription'\n3. Select 'Cancel'\n4. Confirm cancellation\n\nYou'll have access until the end of the paid period.",
      },
    ],
  },
];

export default function HelpPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{isPt ? "Central de Ajuda" : "Help Center"}</h1>
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

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <Video className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">{isPt ? "Vídeos Tutoriais" : "Video Tutorials"}</CardTitle>
              <CardDescription>{isPt ? "Aprenda assistindo" : "Learn by watching"}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <BookOpen className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">{isPt ? "Guia Completo" : "Complete Guide"}</CardTitle>
              <CardDescription>{isPt ? "Documentação detalhada" : "Detailed documentation"}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <HelpCircle className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">{isPt ? "Contato" : "Contact"}</CardTitle>
              <CardDescription>{isPt ? "Fale com suporte" : "Talk to support"}</CardDescription>
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
                                {isPt ? "Ver vídeo tutorial" : "Watch video tutorial"}
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
            <div className="flex gap-4">
              <Button>{isPt ? "Enviar Mensagem" : "Send Message"}</Button>
              <Button variant="outline">{isPt ? "Agendar Chamada" : "Schedule Call"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
