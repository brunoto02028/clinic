# QA final — atividade 070, sobre o estado revertido

**Data:** 22/09/2026 · **Branch:** `brunoto02028/app_clinic` em `c5453528` · `main` em `5a9c02e3`
**Ambiente:** Next dev :4000 · Expo Web :8081 `--offline` · Postgres `bpr_clinic_local`
**Regra:** nenhum código-fonte editado; falhas simuladas com `page.route(...)`.
**Veredito:** ✅ **Aprovado com ressalvas. Pode publicar.**

## Por que pode publicar

- **A web não mudou.** Fora de `mobile/`, a branch difere do `main` só nas 3 rotas do app; `prisma/schema.prisma` é idêntico, então não há migração. Agendar pela web com cookie continua dando 200 e grava a linha — tanto o paciente quanto a equipe agendando por ele.
- **Personal e aluno intactos.** O ramo do personal em `/api/mobile/modules` é igual ao `main` byte a byte. O aluno recebe `treino, avaliacoes, nutricao` e abre as três áreas.
- **Sem perda de dado na triagem (T5).** Depois de um rascunho completo salvo pela web, o autosave do app mudou **só `updatedAt`** no banco.
- **Sem vazamento entre contas (T7).** B entrou por cima da sessão de A, no mesmo processo JS; o formulário abriu vazio e nada de A foi para B.

As ressalvas **não são regressão desta branch**.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| P1a | Só as 3 rotas do app diferem do `main` fora de `mobile/` | ✅ |
| P1b | `prisma/schema.prisma` idêntico ao `main` | ✅ |
| P1c | POST `/api/appointments` com cookie da web → 200 + linha | ✅ |
| P1d | Equipe agenda pela web em nome do paciente → 200 | ✅ |
| P1e | Sem sessão 307 · `paymentMethod` inválido 400 · sem `patientId` 400 · outro tenant 404 | ✅ |
| P1f | As rotas novas/alteradas não têm chamador na web | ✅ |
| P2a | Aluno PERSONAL → `treino,avaliacoes,nutricao` | ✅ |
| P2b | Aluno abre Treino (com treino real), Avaliações e Nutrição | ✅ |
| T1 | Etapas "Sinais de alerta" e "Consentimento" com texto do `screening-config` | ✅ |
| T2 | Sem consentimento: botão desabilitado; API 400 | ✅ |
| T3 | Consentimento + Sim/Não misturados → banco com os valores escolhidos | ✅ |
| T4 | "Fumante" grava `smoker: true` | ✅ |
| **T5** | **Rascunho completo da web + autosave do app → nenhum campo perdido** | ✅ |
| T5b | Triagem travada: autosave recusado | ✅ |
| T5c | GET falhando → wizard não abre, 0 POST | ✅ |
| T6 | `consent.tsx` mostra o estado real, sem data | ✅ |
| — | Red flag não perguntada gravada como `false`, igual à web | registrado |
| **T7** | **Cache entre contas: B abre vazio; nada de A em B** | ✅ |
| T8 | Agendar pelo app → 200 + linha; 23/09 09:00 → `08:00Z` | ✅ |
| T9 | Paciente sem `ClinicModuleAccess` → só `clinica`; Lab/BA bloqueados | ✅ |
| T10 | Terapeuta recebe `lab,clinica,ba` | ✅ |
| R1–R6 | clinical-notes, outcome e tratamento com GET falhando, status PENDING, perfil, menu | ✅ |

## Destaques

**T5 — resposta direta: com o backend original, o app não perde dado.** O wizard carrega a linha inteira e o autosave reenvia o objeto todo (80 chaves, inclusive as que o app não mostra). Comparação coluna a coluna depois do autosave do app: `colunas alteradas: [ 'updatedAt' ]`. `painPattern`, `alcoholUse`, `gpDetails`, contato de emergência e red flags — todos intactos. A mudança de `updatedAt` prova que o UPDATE rodou; não foi a trava que protegeu.

**T7 — variante mais dura do que a pedida.** Como o sign-out congela no Expo Web (F1), o teste navegou client-side para `/login` sem recarregar (um marcador em `window` provou que era o mesmo processo JS) e entrou com B por cima de A. Wizard vazio, e no banco B ficou sem nenhum dado de A.

**T9/T10 — a guarda distingue as contas.** O mesmo `/orders` bloqueado para o paciente abre "My Orders" para o terapeuta.

**P1 — prova de que a web não mudou.** `getActor` → `getEffectiveUser` lê primeiro a sessão da web e só depois o bearer; para a web o caminho é o mesmo do `main`, que já chamava `getActor` logo abaixo.

## Ressalvas — nenhuma introduzida por esta branch, nenhuma bloqueia

**F1 — ~~pré-existente, já no ar~~ CORRIGIDO em 23/09, ver [report-f1-signout.md](report-f1-signout.md): o app congelava ao sair da conta.** Perfil → Sign out: `/api/mobile/logout` responde 200, depois a página entra em loop de render ("Maximum update depth exceeded") e para. **Confirmado idêntico no `main`**: o `mobile/` do `main` exportado e rodado na :8082 deu 476 erros e a mesma página congelada. Hipótese: a rota `/` é ambígua — `app/index.tsx` e os `index` de `(clinica)/(tabs)`, `(lab)/(tabs)`, `(ba)/(tabs)` e `(treino)` resolvem todos para `/`. Hipótese confirmada e corrigida: os dois pontos que mandavam para `/` agora mandam para `/login`.

**F2 — igual à web, consequência aceita:** red flag não perguntada vira "Não"; o rascunho reaberto vem com as 12 "Não" pré-selecionadas e o envio liberado.

**F3 — igual à web:** triagem travada pode ser reenviada — o autosave é recusado, mas o envio final não passa por trava no backend. A web faz o mesmo.

**F4 — cosmético:** a data de nascimento reabre como `1990-03-15T00:00:00.000Z` em vez de 15/03/1990. Salvar de novo funciona.

**F5 — menor:** a home mostra "0 exercises today" quando `/api/exercises` responde 403.

**F6 — só na web de desenvolvimento:** `/api/public/schedule` fora do `MOBILE_API_PREFIXES`; no nativo não há CORS.

**Observação:** a confirmação do agendamento mistura idiomas ("You're booked" junto de "Sua avaliação foi enviada") — assunto da T-16.

## Dados de teste e efeitos colaterais

- **Criados** (prefixo `qa070g`, e-mails `@example.com`): 2 clínicas, 9 usuários, 7 `TherapistAvailability`, 1 `SOAPNote`, 1 `Workout`, e pelos testes 5 `Appointment`, 5 `MedicalScreening`, 3 `ClinicalEvidenceReport`, 41 refresh tokens, 30 `SystemLog`, 30 `AuditLog`.
- **Removidos, todos.** Varredura final em todas as colunas texto e json por `%qa070g%` e pelos ids criados: `sobras {}`.
- **E-mails: 0 reais.** O `outbound-guard` (`NODE_ENV=development`) descartou 15, todos para `qa070g-*@example.com`. Nada foi para `brunotoaz@gmail.com`.
- ⚠️ **IA sem crédito.** O job de relatórios de evidência processou as triagens de teste; o modelo primário falhou e o fallback do **OpenRouter respondeu 402, sem créditos**. Os rascunhos gerados foram apagados.
- **Código:** nenhum arquivo-fonte editado. `.env`, `.qa-tmp/`, `.playwright-mcp/` e a cópia do `main` removidos; portas livres.
