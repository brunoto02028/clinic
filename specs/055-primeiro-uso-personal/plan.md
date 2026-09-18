# Atividade 55 — Destravar o 1º uso do personal e do aluno

## Objetivo
Deixar o estúdio do Emanuel (primeiro personal externo) usável de ponta a ponta antes de ele convidar alunos. Corrige o que a revisão de 18/09 (`docs/personal-review-2026-09-18.md`, seções 2 e 3) achou no caminho do personal e do aluno: paywall falso, termos e guia clínicos da BPR, marca da BPR nas páginas do estúdio, menu com item quebrado e vocabulário clínico.

## Decisões do Bruno (18/09/2026)
1. **Biblioteca de exercícios:** **não** copiar a da BPR. O personal monta a dele. O sistema orienta: estado vazio com instruções e mensagem clara da IA quando faltam exercícios com vídeo.
2. **Termos do aluno:** **termo genérico de treino da plataforma** (PT/EN), com o nome do estúdio. Eu escrevo o rascunho e o Bruno revisa o texto jurídico antes de valer.
3. **Acesso do aluno:** Sessões, Exercícios e Aprender **liberados por padrão**. O personal ainda pode esconder ou travar módulos por aluno (tela Permissions) e, depois, cobrar pelos planos dele (Connect).
4. **Ficha do aluno:** esconder a aba **"Exercises"** (herdada da clínica) para o personal; fica só "Workouts".
5. **Marketplace fica fora** ("não está visível para ninguém e não é hora").

## Decisões de design
- Tudo condicionado ao tipo do tenant (`isPersonalTenant` / `useVocab().isPersonal`). **A clínica BPR não muda.**
- **Acesso (T-1):** em `computePatientAccess`, o aluno de estúdio começa com todos os módulos e permissões concedidos (motivo `studio`). Os ajustes por aluno (`moduleOverrides`: hidden/locked) continuam valendo por último. Módulos clínicos seguem escondidos no menu e bloqueados por URL (ativ. 52/T-7).
- **Termos (T-3):** o `GET` dos termos devolve o termo de treino quando quem pede é aluno de estúdio (ou quando a página é `/join/<slug>` de um estúdio). O termo da BPR e a edição pelo SUPERADMIN não mudam.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Aluno de estúdio com acesso liberado por padrão (sem paywall falso) | concluído |
| T-2 | Menu do aluno de estúdio sem itens quebrados ou clínicos ("Exercises" → rota bloqueada; guia "How It Works" da BPR) | concluído |
| T-3 | Termo genérico de treino para o aluno de estúdio (PT/EN, com nome do estúdio) | concluído |
| T-4 | Onboarding do aluno de estúdio sem triagem médica | concluído |
| T-5 | Marca do estúdio no título das páginas e no `/join` (sem cabeçalho/rodapé da BPR) | concluído |
| T-6 | Ficha do aluno: esconder a aba "Exercises" para o personal | concluído |
| T-7 | "View as Student" abre o portal do aluno (não o painel do terapeuta) | concluído |
| T-8 | Biblioteca vazia: orientação na biblioteca e mensagem clara da IA de treino | concluído |
| T-9 | Vocabulário clínico restante nas telas do personal e do aluno | concluído |
| T-10 | Painel do personal: contador de treinadores e ícones de treino | concluído |

## Fora de escopo
- App mobile (M1–M7 da revisão), que é atividade própria antes do build EAS.
- Config do portal por estúdio (quais módulos o estúdio oferece), que é futura.
- Fatura com a marca do estúdio (achado F-3 da 52/T-6), que é futura.
- Marketplace (decisão 5).

## Suposições (peço validação)
1. **T-2:** ~~"Learn" continua visível com conteúdo da BPR~~. Conferido: o conteúdo de "Learn" já é do próprio tenant (não da BPR), mas o personal não pode criar conteúdo (`/admin/education` é bloqueado), então a página ficaria sempre vazia. **Escondido do menu do aluno de estúdio** (18/09, após o Bruno reforçar que a área do aluno é independente da do paciente). A Comunidade continua acessível como item próprio.
2. **T-3:** o termo de treino cobre: natureza do serviço (treino físico, não é tratamento médico), aptidão e saúde (o aluno declara condições e procura médico se preciso), riscos do exercício, dados pessoais (GDPR/LGPD), cancelamento e responsabilidade. É um **rascunho a revisar**, marcado assim no código.
3. **T-5:** o título das páginas do aluno de estúdio fica "<nome do estúdio>" (ex.: "Manu Training"). O `/join` do estúdio usa só a marca do estúdio, sem o menu do site da BPR.

## Encerramento (18/09/2026)
Todas as tarefas têm QA aprovado (`qa/report-t-1-t-5.md`, `qa/report-t-6-t-10.md`, `qa/report-t-9-reteste.md`) e code review feito (2 rodadas). O que entrou além do plano, vindo do QA e do review:
- **Menu do aluno:** sem os módulos clínicos extras (Records, Documents, gravação pré-consulta, Clinical Notes) e sem "Learn" (o estúdio não cria conteúdo). Gravação pré-consulta e guia clínico também bloqueados por URL.
- **Sessions:** sem paywall falso (`/api/patient/status`) e sem o banner clínico "Initial Assessment".
- **Módulo travado pelo personal:** o aluno vê "Esta área ainda não foi liberada pelo seu personal", sem os planos da BPR.
- **Títulos:** "<página> · <Estúdio>" em todas as páginas do portal.
- **Vocabulário:** as regras EN também valem no idioma PT (telas só em inglês), gênero em PT ("do estúdio") e sem "BPR" em Journey/Arena/Ambassador.
- **Orientação da biblioteca:** deixa claro que o vídeo é **opcional**. Treino manual funciona com qualquer exercício; só a IA exige vídeo.
- **Único efeito na clínica:** acento no rótulo PT do menu ("Clinico" → "Clínico").

## Pendências para o Bruno
- **Revisar o termo de treino** (`lib/studio-terms.ts`, página `/studio/<slug>/terms`) antes do Emanuel convidar alunos.
- **Decidir a Jornada e a Comunidade do aluno de estúdio:** hoje ficam visíveis, sem "BPR" e com o vocabulário trocado, mas as missões ("check-in de dor", "ler artigo") são pensadas para reabilitação.
- **Fora do escopo** (anotado): e-mail de lembrete com a marca BPR (envio manual), logo BPR no menu do aluno (marca do estúdio no portal), "Notificacoes" sem acento.
