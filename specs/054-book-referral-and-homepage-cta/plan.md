# Atividade 1 — Indicação do livro "Beyond Pain" + chamada na home

## Objetivo
1. Deixar o leitor indicar o livro "Beyond Pain" pra um amigo (digitando o e-mail dele), tanto nas páginas do livro quanto a partir de e-mails de marketing recebidos — sem inscrever o amigo automaticamente na lista, e rastreando quem indicou quem pra uso futuro (badge "Ambassador"/XP de referral, hoje dormant em `lib/journey.ts`).
2. Dar destaque real ao livro na homepage, hoje ausente (só existe um link discreto no rodapé).

## Decisões de design (já validadas com o usuário)
- **Convite pontual, sem auto-inscrição**: o amigo recebe 1 e-mail avulso ("[Nome] indicou este livro pra você"), com link rastreável pro capítulo grátis. Ele só entra na lista de e-mails se preencher o formulário normal de captura — igual qualquer outro visitante.
- **Rastrear indicações**: guardamos quem indicou quem (`BookReferral`), incluindo quando o amigo efetivamente se cadastra (conversão). Não inclui, nesta atividade, a integração de fato com o badge "Ambassador"/XP — só a base de dados que vai alimentar isso depois (ver Suposições).

## Arquitetura da indicação
Dois parâmetros de URL distintos, direções opostas:
- `?refFrom={contactId}` — usado nos links de e-mails de marketing: "eu sou o contato X, quero indicar alguém" → pré-identifica o indicador nas páginas do livro, sem precisar digitar o nome.
- `?ref={referralId}` — usado no e-mail de convite enviado ao amigo: "eu sou o amigo indicado pela indicação Y" → se o amigo se cadastrar de fato, marca a indicação como convertida.

Reaproveita o funil de captura já existente (`lib/book.ts`, `/api/beyond-pain/capture`) — o amigo passa pelo mesmo formulário/consentimento de sempre, só que com atribuição por trás.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Modelo `BookReferral` no schema | concluído |
| T-2 | API de indicação (`/api/beyond-pain/refer`) + atribuição de conversão na captura | concluído |
| T-3 | Formulário de indicação nas páginas do livro (`/beyond-pain`, `/beyond-pain/chapter-one`) | concluído |
| T-4 | CTA de indicação nos e-mails (newsletter de artigo, e-mails do livro) | concluído |
| T-5 | Seção de destaque do livro na home | concluído |

## Achados de QA e code review (corrigidos)
- **QA (T-4):** o bloco de indicação não aparecia no e-mail de fato enviado — o corpo real do `ARTICLE_NEWSLETTER` vem de `lib/email-i18n.ts`, não do template "documentação" em `lib/email-templates.ts`. Corrigido nas duas variantes (EN/PT) e reverificado ao vivo no preview admin.
- **Review — segurança (T-2):** `referrerContactId` enviado pelo cliente não era verificado contra um `EmailContact` real antes de ser usado no limite anti-abuso e no bloqueio de auto-indicação — um id falso e sempre novo burlava os dois. Corrigido: só conta como "indicador conhecido" depois de confirmado no banco.
- **Review — segurança (T-2):** a atribuição de conversão só checava o `id` da indicação, não o e-mail do amigo — como o `ref` aparece na URL do convite (encaminhável), qualquer pessoa que obtivesse esse id podia reivindicar a indicação com outro e-mail. Corrigido: exige que o e-mail capturado bata com `friendEmail`.
- **Review — escopo (T-4):** campanhas de e-mail genéricas (não ligadas a um artigo) recebiam o bloco de indicação do livro à força, sem o admin ver isso no preview e sem relação com o conteúdo da campanha. Removido — o bloco fica só na newsletter de artigo e nos e-mails do próprio livro, que fazem sentido editorialmente.
- **Review — duplicação/robustez:** busca de `refFrom` duplicada entre as duas páginas do livro, extraída para `lib/book.ts`; falha de `getBookConfig()` isolada do restante dos dados da home (não derruba `settings`/`articles` junto).

## Suposições (validar com o usuário)
- **Placement da seção na home**: logo após a faixa escura de CTA (`components/landing-page.tsx:815`) e antes da seção de Artigos (`:867`) — ponto de maior visibilidade sem competir com o CTA principal de agendamento na parte de cima. Pode ajustar depois de ver.
- **Limite anti-abuso**: máx. 10 indicações por indicador (contactId ou IP) a cada 24h, mais um campo honeypot escondido no formulário. Sem CAPTCHA visível — se virar problema real, adiciono depois.
- **Assunto/corpo do e-mail de convite**: tom pessoal, sem imagens pesadas, com o nome do indicador quando disponível ("Bruno achou que você ia gostar deste livro") ou genérico ("Um amigo achou que você ia gostar...") quando anônimo (visitante que não digitou o nome).
- **Badge "Ambassador"**: fora do escopo desta atividade — fica só a tabela `BookReferral` pronta pra, no futuro, decidir como ligar `EmailContact` a uma conta `User` de paciente (hoje são modelos separados) e então disparar o XP/badge.
- **E-mails de campanha (`EmailCampaign`)**: o link de indicação (`?refFrom={contactId}`) entra tanto no template de newsletter de artigo quanto nos e-mails de campanha genéricos e nos e-mails do próprio livro (confirmação/entrega/nutrição) — em todos os casos o destinatário já é um `EmailContact` conhecido, então o `contactId` está sempre disponível.
