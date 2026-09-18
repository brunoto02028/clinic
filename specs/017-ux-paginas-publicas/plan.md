# Atividade 17 — UX/Design das páginas públicas (auditoria + backlog)

**Status geral:** auditoria concluída — aguardando o Bruno priorizar o que vira tarefa.

## Objetivo
Auditar as páginas públicas de bpr.clinic (home, serviços, artigos, livro) ao vivo e propor
melhorias de UX/design/performance/SEO, priorizadas por **impacto × esforço**. Este `plan.md` é
o relatório + backlog; cada item escolhido vira uma `t-N` com QA.

## Método
Auditoria ao vivo (Playwright) em **produção**: home (desktop + mobile 390px), `/articles`,
`/services/mls-laser`. Extração estruturada (headings, CTAs, alt-text, JSON-LD, hreflang,
prova social, contraste, lazy-load) + erros de console.

## O que já está BOM (não mexer)
- **Acessibilidade de imagem:** alt-text 100% na home e nos artigos.
- **SEO on-page:** 1 H1 por página, `<title>` e meta description corretas, **JSON-LD presente**.
- **Páginas de serviço:** boas — têm **FAQ e depoimentos**, ~580 palavras, meta ok.
- **Mobile:** WhatsApp flutuante ativo (nossa mudança), hero com foto real.

## Achados (priorizados por impacto × esforço)

### 🐞 Bugs ao vivo (corrigir primeiro — são erros reais em produção)
| ID | Achado | Impacto | Esforço |
|----|--------|---------|---------|
| B1 | **Widget de voz Vapi quebrado** — `/api/vapi/web-token` retorna **503** na home | Médio (feature morta no ar) | Baixo (corrigir ou desativar) |
| B2 | **Cloudflare Managed Challenge dá 403 no prefetch RSC** de `/login` e `/signup` (`?_rsc=`) — quebra o prefetch do Next (console sujo + nav mais lenta) | Médio | Baixo (ajuste da regra no painel: excluir `_rsc`) |

### 💰 Conversão (maior alavanca pra clínica)
| ID | Achado | Impacto | Esforço |
|----|--------|---------|---------|
| C1 | **CTA sem hierarquia** — 6+ CTAs competindo na home (Start Programme, Start Your Programme, Book, Patient Portal, Contact, Read Chapter…). Definir **1 primário**, resto quieto | Alto | Baixo |
| C2 | **Sem prova social na home** — depoimentos/reviews existem nas páginas de serviço mas **não** na home. Trazer 2–3 depoimentos + estrelas Google perto do CTA | Alto | Médio |
| C3 | **Contato de baixo compromisso** — hoje só "criar conta" (pesado) ou WhatsApp. Adicionar **"Solicitar retorno de ligação"** (nome + telefone) | Alto | Médio |
| C4 | **Sem preço/expectativa** — `£` não aparece em nenhuma página. Bloco "O que esperar / Investimento" (faixas ou "avaliação a partir de £X") | Médio-Alto | Baixo |
| C5 | **CTA primário abaixo da dobra no mobile** — nenhum botão de ação no 1º viewport. **Barra fixa de ação no mobile** (Agendar) | Alto | Médio |

### 🔒 Confiança
| ID | Achado | Impacto | Esforço |
|----|--------|---------|---------|
| T1 | **Sem FAQ na home** (existe nas páginas de serviço) — trazer um FAQ curto (referral? seguro? domicílio? condições?) | Médio | Baixo |
| T2 | **Bio do profissional fraca** — "Meet Bruno" com foto + qualificações + **nº de registro** (paciente de fisio confere) | Médio | Baixo |

### 🔎 SEO
| ID | Achado | Impacto | Esforço |
|----|--------|---------|---------|
| S1 | **Sem `hreflang` EN/PT** em nenhuma página (site é bilíngue) — adicionar tags recíprocas | Médio | Baixo |

### ⚡ Performance
| ID | Achado | Impacto | Esforço |
|----|--------|---------|---------|
| P1 | **`/articles`: só 3 de 33 imagens com lazy-load** — carrega tudo de uma vez (LCP/banda). Lazy-load abaixo da dobra | Alto (35 artigos) | Baixo |
| P2 | Auditar imagens da home (hero `priority`, `next/image`, tamanhos) | Médio | Médio |

### 🎨 Design
| ID | Achado | Impacto | Esforço |
|----|--------|---------|---------|
| D1 | **"The Method (01–04)" e "Your Journey (01–04)" são redundantes** — dizem quase a mesma coisa 2x. Consolidar/diferenciar | Médio | Médio |
| D2 | **Paleta mista** (`ba1` no público vs `bruno`/`clinic`) + acento **rosa "Healing With Heart"** destoa do teal da marca. Unificar identidade | Médio | Médio |
| D3 | **~40 textos pequenos (<14px) com baixo contraste** na home — possível falha WCAG. Ajustar contraste/tamanho | Médio (acessibilidade) | Baixo |

## Progresso
- **Fase 1 implementada e QA-aprovada** (2026-08-24): B1 ✓, P1 ✓ (commit 4059c37); **C1 ✓, D3 ✓, C4 ✓, T1 ✓** (ver `qa/report-fase-1.md`).
- **B2 ✓ resolvido** (2026-08-25): regra WAF `Challenge auth endpoints` agora exclui `?_rsc=` (prefetch do Next não é mais desafiado; navegação real segue desafiada). Aplicado via API Cloudflare com token WAF.
- **Fase 2 implementada e QA-aprovada** (2026-08-25): **C2 ✓** (prova social pronta-porém-oculta, lê `startTestimonialsJson`), **C3 ✓** (callback → SalesLead no `/admin/sales`), **C5 ✓** (barra fixa mobile) — ver `qa/report-fase-2.md` (t-2/t-3/t-4).
- **D1 ✓** (2026-08-25): as seções "The Method" e "Your Journey" mostravam **os mesmos 4 passos (01–04) duas vezes**. Diferenciadas: **"The Method"** mantém a sequência 01–04 (o processo); a antiga "Your Journey" virou **"Technology"** (a tecnologia por trás de cada etapa — sem números de passo, tags de tecnologia + chips linkando as páginas de serviço). Acentos da seção também migrados pra paleta earthy (D2 completo aqui).
- **D2 ~ (parcial, aprovado)** (2026-08-25): unificada a paleta das seções **"The Method"** e **"Why we are different"** da home — os gradientes off-brand (azul/laranja/esmeralda/violeta/ciano) viraram um conjunto **earthy da marca** (moss `#4F7361` · rosa `#9E5E6E` mantendo o Healing With Heart · sálvia `#55705F` · ocre `#8A6D3B`). **Pendente (decisão do Bruno):** páginas de serviço usam um sistema **intencional de cor por serviço** (11 serviços) — não alterado sem confirmação. Selos de credencial do About mantidos com variação de categoria.
- **T2 ✓ (versão genérica)** (2026-08-25): selos de credencial da seção About agora **bilíngues** (EN/PT) + linha de confiança nível-prática ("Registrado, segurado e baseado em evidências"). **Sem nº de registro pessoal** (decisão do Bruno) — a evolução para "Nossa equipe" com card por profissional (usando `hcpcRegistrationNumber` + model `Qualification`) fica parqueada até definir os profissionais.
- **S1 ✓ resolvido** (2026-08-25) via **spec 12** (URLs por idioma nos artigos: `/pt/articles/[slug]` server-side + hreflang recíproco + sitemap). Home/serviços em `/pt` ficam para um passo futuro, se desejado.

## Sugestão de fases (se aprovar)
1. **Rápidas de alto impacto:** B1 ✓, B2 (CF), C1 ✓, C4 ✓, T1 ✓, S1 (spec 12), P1 ✓, D3 ✓.
2. **Conversão:** C2 (prova social), C3 (callback), C5 (CTA fixo mobile).
3. **Design/estrutura:** D1 (consolidar seções), D2 (paleta), P2, T2.

## Como seguir
O Bruno escolhe os IDs; cada um vira uma `t-N` com implementação → qa-tester → review → concluir.
(B2 é config de Cloudflare, do lado dele; eu documento o ajuste.)
