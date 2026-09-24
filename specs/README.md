# Specs — índice das atividades

Cada atividade é uma pasta `NNN-nome-em-kebab/`: número com **3 dígitos**, para ficarem em ordem no explorador. Dentro dela:

- `plan.md`: objetivo, decisões e tabela de tarefas com status;
- `t-N-*.md`: uma tarefa por arquivo;
- `qa/qa-spec.md` e `qa/report-t-N.md`: cenários e relatórios de QA, com `qa/screenshots/`.

**Nova atividade:** use o próximo número livre (hoje **075**) com 3 dígitos. Nunca reaproveite número: 011 e 040 aparecem citados em documentos, mas não têm pasta.

> Reorganizado em 18/09/2026. As pastas eram `1-…`, `10-…` sem zeros e existiam **duas** "1".
> - `1-mobile-fundacao` (jun/2026, abre a série mobile 001–006) manteve o **001**.
> - `1-book-referral-and-homepage-cta` (ago/2026) virou **054**.
>
> Commits antigos citam os caminhos sem zeros: `specs/28-…` = `specs/028-…`.

Legenda: ✅ concluída · 🟡 parcial / aguardando algo · 📋 planejada · ⏸ aguardando decisão

## Personal trainer

| Nº | Atividade | Status |
|---|---|---|
| [019](019-prontidao-personal-multitenant/) | Prontidão para personal trainers e multi-tenant (auditoria) | ✅ |
| [021](021-avaliacoes-personal/) | Avaliações do personal trainer | ✅ |
| [023](023-onboarding-personal-admin/) | Onboarding do personal (provisionado por admin) | ✅ |
| [024](024-getting-started-trainer/) | Getting started do personal trainer | ✅ |
| [025](025-limpeza-admin-personal/) | Limpeza do admin do personal | ✅ |
| [026](026-limpeza-admin-personal-completa/) | Limpeza completa do admin do personal | ✅ |
| [027](027-nutricao-personal/) | Nutrição / plano alimentar | ✅ |
| [028](028-cobranca-personal-stripe-connect/) | Cobrança do aluno via Stripe Connect | 🟡 código em prod, desligado; falta ativar o Connect + QA em modo teste |
| [029](029-challenges-personal/) | Challenges / gamificação | ✅ |
| [030](030-badges-personal/) | Badges / conquistas do aluno | ✅ |
| [031](031-banco-alimentos/) | Banco de alimentos | ✅ |
| [032](032-ai-workout-builder/) | AI Workout Builder | ✅ |
| [033](033-program-templates-calendar/) | Program Templates (multi-semana + atribuição em massa) | ✅ |
| [038](038-fechamento-gaps-personal/) | Fechamento dos gaps da atividade 20 | ✅ |
| [052](052-seguranca-rotas-legadas-personal/) | Segurança das rotas legadas antes do 1º personal externo | ✅ concluída (deploy 18/09) |
| [055](055-primeiro-uso-personal/) | Destravar o 1º uso do personal e do aluno | ✅ |
| [056](056-email-boas-vindas-estudio/) | E-mail de boas-vindas do estúdio (personal) | ✅ |
| [057](057-superadmin-visao-estudio/) | Superadmin enxerga o estúdio como o personal vê | ✅ |
| [058](058-esconder-jornada-aluno-estudio/) | Esconder a Jornada do aluno de estúdio | ✅ |
| [059](059-limpeza-jornada-comunidade-estudio/) | Comunidade fora do aluno de estúdio e limpeza do Journey do personal | ✅ |

## App mobile do paciente

| Nº | Atividade | Status |
|---|---|---|
| [070](070-app-paciente-clinica/) | App do paciente da clínica BPR (gating, identidade, porte da área web) | 🟡 em andamento |
| [071](071-seguranca-api-mobile/) | Segurança da API mobile (catálogo aberto, GET que escreve, auth sem releitura) | 📋 planejada |
| [074](074-monitoramento-continuo-paciente/) | Monitoramento contínuo: limiares como regra, relatório do paciente, webhook Withings, bloqueio pré-exercício, aparelho da clínica | 🟡 em andamento |

> **070 nasceu como 069** e foi renumerada em 22/09/2026: outra sessão criou `069-pressao-arterial-pelo-terapeuta` ao mesmo tempo, e aquela já estava no `main`. Commits anteriores à renumeração citam `069` e `specs/069-app-paciente-clinica`; a 071 era `070-seguranca-api-mobile`.

## Plataforma (multi-tenant, segurança, design, custos)

| Nº | Atividade | Status |
|---|---|---|
| [016](016-protecao-bots/) | Proteção contra bots (camada 2) | 🟡 verificada; prod precisa da secret real |
| [020](020-multitenant-clinica-e-personal/) | Multi-tenant: clínicas e personal trainers | 🟡 20/30; itens grandes em aberto (aulas em grupo, app do profissional) |
| [022](022-acesso-branded-tenant/) | Acesso branded por tenant | ✅ |
| [034](034-identidade-visual-ba-one/) | Identidade visual BA One | ✅ |
| [035](035-sidebar-hover-expand/) | Menu lateral hover-to-expand | ✅ |
| [036](036-instagram-import-permission/) | Permissão do "Import from Instagram" | ✅ |
| [047](047-migrar-rotas-legadas-para-clinica-ativa/) | Migrar rotas legadas para a clínica ativa | ✅ |
| [053](053-centro-custos-ia/) | Centro de controle de custos de IA (repasse ao personal) | 📋 |

## Clínica (fisioterapia BPR)

| Nº | Atividade | Status |
|---|---|---|
| [007](007-biblioteca-categorias-pastas/) | Biblioteca de exercícios: categoria → pasta → vídeos | 🟡 4/6 |
| [008](008-videos-no-r2/) | Vídeos de exercício no Cloudflare R2 | 🟡 3/5 |
| [009](009-fluxo-acesso-paciente/) | Fluxo de acesso do paciente | ✅ |
| [013](013-graficos-progresso-paciente/) | Gráficos de progresso do paciente | 🟡 implementada, em QA |
| [014](014-skill-evidencia-clinica/) | Skill `clinical-evidence-report` | ✅ QA + review |
| [015](015-relatorio-evidencia-no-admin/) | Relatório de evidência na área clínica | 🟡 implementada e verificada; status do plano desatualizado |
| [018](018-kit-rotina-clinica/) | Kit de rotina clínica | 🟡 4 concluídas, 2 aguardando GO, 2 backlog |
| [037](037-notificacoes-email-admin/) | Notificações por e-mail pro admin | ✅ |
| [039](039-fila-aprovacao-email-financeiro/) | Fila de aprovação de e-mails financeiros | ✅ |
| [041](041-invoice-recorrente-pacote-mensal/) | Invoice recorrente de pacote mensal | 🟡 3/4; mecanismo do cron pendente |
| [042](042-protocolo-semanal-checklist-diario/) | Protocolo semanal + checklist diário | ✅ |
| [043](043-unificar-tela-exercicios-paciente/) | Unificar a tela de exercícios do paciente | ✅ |
| [044](044-controle-semanal-protocolo-admin/) | Controle semanal do protocolo no admin | ✅ |
| [045](045-templates-por-clinica-e-atribuicao-segura/) | Templates por clínica + atribuição segura | ✅ |
| [046](046-prescricoes-do-protocolo-e-clinica-ativa/) | Prescrições do protocolo + clínica ativa | ✅ |
| [048](048-atividade-do-paciente/) | Linha do tempo de atividade do paciente | ✅ |
| [049](049-relatorio-adesao-diaria/) | Relatório diário de adesão | 🟡 5/6; WhatsApp adiado |
| [050](050-agendamento-livre-pagamento-presencial/) | Agendamento livre + pagamento presencial | ✅ |
| [051](051-correcoes-auditoria-paciente-e-ux-idosos/) | Correções da auditoria do paciente + UX para idosos | ✅ |
| [060](060-fechamento-semanal/) | Fechamento semanal (mensagem manual pedindo pra marcar/explicar) | ✅ |
| [061](061-liga-lembrete-diario-por-clinica/) | Toggle por clínica pro lembrete diário automático | ✅ |
| [062](062-guia-permissoes-padrao-idioma-lembretes/) | Guia da consulta domiciliar, permissões padrão e idioma dos lembretes | ✅ |
| [063](063-historico-evidencia-checkin-semanal/) | Histórico de relatórios de evidência clínica + check-in semanal de dor/função (passivo) | ✅ |
| [064](064-gravacao-robusta-consultas-diarizacao/) | Gravação robusta de consultas ao vivo (multi-hora) com distinção de voz (diarização, AssemblyAI) | ⏸ |

## App mobile

| Nº | Atividade | Status |
|---|---|---|
| [001](001-mobile-fundacao/) | App nativo do paciente: fundação | ✅ |
| [002](002-mobile-nucleo-paciente/) | App nativo: núcleo (fase 1) | ✅ |
| [003](003-mobile-saude-dados/) | App nativo: saúde & dados (fase 2) | ✅ |
| [004](004-mobile-extras/) | App nativo: extras (fase 4) | ✅ |
| [005](005-mobile-scans-3d/) | App nativo: scans 3D (fase 3) | ✅ |
| [006](006-mobile-captura/) | Captura nativa: foot scan por fotos (fase A) | 🟡 fase A concluída; B/C futuras |

## Site e marketing

| Nº | Atividade | Status |
|---|---|---|
| [010](010-venda-do-livro/) | Página de vendas do livro | 🟡 em andamento |
| [012](012-artigos-url-por-idioma-seo/) | URLs por idioma nos artigos (SEO) | ⏸ ver plan.md |
| [017](017-ux-paginas-publicas/) | UX das páginas públicas (auditoria + backlog) | ⏸ aguardando priorização |
| [054](054-book-referral-and-homepage-cta/) | Indicação do livro "Beyond Pain" + chamada na home | ✅ |

## Próximas (ainda sem pasta)

- **Cardápio com IA** (nutrição), depois da 053.
- **App mobile:** correções M1–M7 da revisão, antes do build EAS.
