# Specs — índice das atividades

Cada atividade é uma pasta `NNN-nome-em-kebab/`: número com **3 dígitos**, para ficarem em ordem no explorador. Dentro dela:

- `plan.md`: objetivo, decisões e tabela de tarefas com status;
- `t-N-*.md`: uma tarefa por arquivo;
- `qa/qa-spec.md` e `qa/report-t-N.md`: cenários e relatórios de QA, com `qa/screenshots/`.

**Nova atividade:** use o próximo número livre (hoje **093**) com 3 dígitos. Nunca reaproveite número: 011 e 040 aparecem citados em documentos, mas não têm pasta.

> **Recuperado em 27/09/2026.** O índice estava 21 atividades atrasado — faltavam 065–069,
> 070-fatura, 071-alerta, as duas 072, 073, 075–080 e 087–092 — e ainda mandava usar o 075, que
> existe desde 23/09. Como este arquivo é o que se consulta ao retomar trabalho, estar errado nele
> custa mais que não existir. As linhas abaixo saem do `plan.md` de cada pasta, não de memória.
>
> **E três números foram usados duas vezes** (sessões paralelas criando pasta ao mesmo tempo, o
> mesmo acidente da 069/070 descrito adiante). Ficam os dois, porque os commits citam os dois
> caminhos: **070** (app do paciente · fatura em PDF), **071** (segurança da API mobile · alerta de
> adesão), **072** (fatura estruturada · motor de acompanhamento).

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
| [081](081-exames-de-laboratorio-pelo-app/) | Exames de laboratório pelo app (London Medical Laboratory) — revenda com margem, kit de casa | 🟡 T-1..T-4 concluídas; T-5..T-9 esperam o token da LML |
| [082](082-preco-e-plano-por-paciente/) | Preço e plano por paciente — para todos ou individualizado | 🟡 em andamento |
| [083](083-o-app-deixa-de-ser-so-da-clinica/) | O app deixa de ser só da clínica — exame independente, conta só-laboratório, bifurcação do cadastro, pagamento no app, tenants por idioma | 🟡 implementada e revisada; QA formal pendente (spec escrita retroativamente) |
| [084](084-cupom-de-desconto/) | Cupom de desconto — código com prazo e limite, para todos ou para um paciente | 🟡 T-1 a T-4 implementadas; 3 rounds de QA + 2 de review; R-1 corrigido, telas do app sem QA |
| [085](085-saber-quem-usa-e-avisar/) | Saber quem usa o app, de onde e por quanto tempo; e avisar por push só o transacional | ⚪ aguardando aprovação |
| [086](086-claro-e-escuro/) | Os dois tons do app, com a escolha na mão da pessoa — sem build | 🟡 T-1 implementada |

| [075](075-cadastro-do-paciente-pelo-app/) | Cadastro do paciente pelo app (autocadastro, rede de segurança do wearable) | 🟡 6 de 14 concluídas; 7 pendentes, 1 em andamento |
| [076](076-video-do-exercicio-em-casa/) | Vídeo do exercício em casa, anexos na conversa, aviso por resumo | ✅ QA aprovado (30 cenários) |
| [077](077-notificacao-push-para-o-app/) | Notificação push: o aviso geral e o aviso que é só seu | 🟡 T-2/T-3 QA aprovado; T-4/T-5 reprovaram e foram corrigidas; T-1/T-6/T-7 esperam aparelho |
| [078](078-exercicio-chega-ao-paciente/) | O exercício chega ao paciente (prescrever libera o módulo) | 🟡 3 implementadas; T-1/T-3 aguardam QA, T-2 aguarda aparelho |
| [079](079-revisao-notifications/) | Revisão das notificações | 🟡 só `qa/` — **sem `plan.md`** |
| [087](087-o-video-tem-onde-chegar-e-a-agenda-tem-forma/) | O vídeo tem onde chegar, e a agenda tem forma (fila no admin + calendário diário/semanal/mensal) | ✅ 6 concluídas |
| [088](088-o-aviso-toca-no-telefone/) | O aviso toca no telefone | 🟡 T-2 concluída; T-1 escrita, esperava o dia do build |
| [089](089-a-voz-e-a-cara/) | A voz e a cara (videochamada + recado de voz) | 🟡 T-1 estava bloqueada na escolha do provedor — **decidido: Daily.co**. Ver a nota abaixo |
| [090](090-pronto-para-a-apple/) | Prontidão para a App Store (auditoria) | 🟡 **sem `plan.md`** — é auditoria: `prontidao.md`, `categoria-e-classificacao.md`, `exame-para-um-filho.md`. Dos 5 bloqueios, o 1º (apagar conta) caiu |
| [091](091-exame-para-quem-voce-cuida/) | Exame para quem você cuida, e onde ele é feito (paciente gerido, consentimento em duas vozes) | 🟡 **em produção** desde 27/09, mas o QA reprovou 4 cenários e **1 segue aberto** — ver abaixo |
| [092](092-a-pressao-a-chamada-e-os-ajustes/) | A pressão, a chamada, e os ajustes do app | 🟡 T-1 e T-4 concluídas; T-2/T-3/T-6 esperam re-medição; T-5 não existe; T-7 bloqueada (sem Stripe em prod) |

> **A 091 está no ar com um furo conhecido.** O QA (`qa/report-091.md`) reprovou 4 cenários; três
> foram consertados no mesmo dia — o portão do paciente passou a olhar o aceite de **quem responde**
> pela criança (`lib/patient-gate.ts`), o `middleware.ts` recusa escrita com sessão emprestada
> (`lib/sessao-emprestada.ts`), e o detalhe do pedido no admin mostra **de quem é o exame** e não
> quem pagou. O quarto **não**: fechar a conta de quem responde deixa a criança **ativa e
> inalcançável** — `closePatientAccount` (`lib/account-closure.ts`) não conhece
> `managedPatients`, e a criança tem e-mail sintético e `password: null`, então ninguém entra por
> ela. É o próximo item da 091.

> **A videochamada está em duas atividades, e é o mesmo trabalho.** A **089** nasceu para ela em
> 26/09 e ficou bloqueada esperando a escolha do provedor; a **092 T-5** a listou de novo em 27/09,
> já com o Daily.co decidido e a chave no `.env`. Quem for implementar: o plano bom é o da 089
> (tem as tarefas quebradas), e o gate `VIDEO_CALLS_ENABLED` está descrito na 092. Nenhuma das duas
> roda em produção — falta `DAILY_API_KEY` e `VIDEO_CALLS_ENABLED` no Coolify.

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
| [065](065-correcao-gate-red-flag-automacao/) | Correção do gate de red flag da automação do relatório clínico | ✅ |
| [066](066-automacao-relatorio-evidencia-exames-consulta/) | Automação completa do relatório de evidência clínica | ✅ 3 concluídas |
| [067](067-medidas-membro-pos-operatorio/) | Medidas do membro no pós-operatório (coxas + ADM do joelho) | ✅ 2 concluídas |
| [068](068-envio-email-paciente-com-previa/) | Envio de e-mail ao paciente pelo sistema, com prévia e aprovação | ✅ 2 concluídas |
| [069](069-pressao-arterial-pelo-terapeuta/) | Pressão arterial registrada pelo terapeuta | ✅ QA online em `qa/report-online.md` |
| [070](070-fatura-pdf-em-vez-de-html/) | Fatura em PDF de verdade (em vez de anexo HTML) | 🟡 2 rodadas de QA de geração OK; falta QA do fluxo completo e **sua aprovação para deploy** |
| [071](071-alerta-adesao-staff/) | Alerta de adesão para o staff + observação do paciente | ✅ 4 concluídas |
| [072](072-fatura-estruturada-e-organizacao/) | Fatura estruturada + área de organização | ✅ 4 concluídas |
| [072](072-motor-acompanhamento-paciente/) | Motor de acompanhamento contínuo (Fase 0) | ✅ 6 concluídas |
| [073](073-melhorias-finance/) | Melhorias no Finance (dashboard, Stripe, recorrência, categorias) | ✅ 4 concluídas |
| [080](080-primeira-consulta-sessao-e-extra/) | Primeira consulta, sessão do pacote e sessão extra; agenda configurável | 🟡 5 implementadas; 4 aguardam QA, 1 aguarda aparelho |
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

## O que só falta o Bruno olhar no telefone

Seis tarefas em quatro atividades estavam escritas como "implementada, aguarda aparelho" ou
"esperando o dia do build". **Em 27/09/2026 isso deixou de ser um bloqueio:** o build **18** ficou
pronto e o `eas update` do canal `production` saiu com runtime `e1a1a594…`, o mesmo do build 17 —
ou seja, o código de hoje já está no aparelho que ele tem instalado, sem precisar de build.

| onde | o que olhar |
|---|---|
| [077](077-notificacao-push-para-o-app/) T-1, T-6, T-7 | o app pede permissão e registra o aparelho; tocar na notificação abre a tela certa; o paciente desliga o aviso no próprio app |
| [078](078-exercicio-chega-ao-paciente/) T-2 | os dois textos de tela vazia dizendo a verdade |
| [080](080-primeira-consulta-sessao-e-extra/) T-3 | uma porta só de agendamento, com o texto certo |
| [088](088-o-aviso-toca-no-telefone/) T-1 | o aviso tocando de verdade |
| [092](092-a-pressao-a-chamada-e-os-ajustes/) T-6 e A.1–A.6 | alternador de tema no cabeçalho; bolinhas do calendário nos dois tons; Face ID sem piscar; recado de voz gravando, enviando e tocando ali mesmo |

**Para o update pegar:** fechar e reabrir o app **duas vezes** — a primeira baixa, a segunda aplica.
A linha da versão no perfil confirma o que está rodando; sem ela, um "não funcionou" não distingue
problema de código de problema de entrega.

## O que está parado esperando uma variável no Coolify

Levantado em 27/09/2026 pela API do Coolify. Não é código faltando — é chave que nunca subiu, e o
código está inerte esperando:

| falta lá | trava |
|---|---|
| `STRIPE_SECRET_KEY` e as outras `STRIPE_*` | **028** (cobrança do personal) e **092 T-7** (o pagamento de £1). Não existe nenhuma `STRIPE_*` na aplicação, e no `.env` local as três estão comentadas — nunca foi questão de modo de teste |
| `LML_API_KEY` + `LAB_ORDERING_ENABLED` | **081 T-5..T-9**, os exames de laboratório |
| `DAILY_API_KEY` + `VIDEO_CALLS_ENABLED` | **089** e **092 T-5**, a videochamada |
