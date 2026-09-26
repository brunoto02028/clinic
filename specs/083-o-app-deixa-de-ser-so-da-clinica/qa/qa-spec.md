# QA — Atividade 083 (o app deixa de ser só da clínica)

Escrita retroativamente com o plano, em 26/09/2026. **Nenhum destes cenários foi rodado ainda** —
o que existe são 724 testes automatizados verdes e um code review aprovado
(`../../082-preco-e-plano-por-paciente/qa/review-082-083.md`). Isto é o que falta.

Regras que valem em todos: conta de **teste** identificada, nunca paciente real; em produção,
confirmar o commit pela lista de deployments do Coolify antes de medir.

## T-1 — Exame independente

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | Pedido de quem tem consulta no histórico | `reviewMode: THERAPIST` |
| 1.2 | API | Pedido de quem tem pacote ativo | `THERAPIST` |
| 1.3 | API | Pedido de conta nunca atendida | `DIRECT` |
| 1.4 | API | Resultado chega num pedido `DIRECT` | estágio `released`, sem passar por `in_review` |
| 1.5 | API | Resultado chega num pedido `THERAPIST` | `in_review`, e entra na fila do admin |
| 1.6 | UI | Fila de liberação do admin | pedidos `DIRECT` **não** aparecem |
| 1.7 | UI | Tela do resultado `DIRECT` | a frase de não-diagnóstico **não** cita revisão de terapeuta |
| 1.8 | UI | Tela do resultado `THERAPIST` liberado | cita a revisão, e mostra a nota da clínica |
| 1.9 | API | Pedido `DIRECT` de quem depois virou paciente | segue `DIRECT` (congelou na compra) |

## T-2 — A área da clínica

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | API | `GET /api/mobile/modules` de conta nova que só comprou exame | sem `clinica` |
| 2.2 | API | Conta criada pela clínica, primeiro login | com `clinica` |
| 2.3 | API | Primeiro agendamento | a conta passa a `isClinicPatient: true` |
| 2.4 | API | Comprar exame | `isClinicPatient` **não** muda |
| 2.5 | API | `mod_clinica` negado numa conta `isClinicPatient` | sem `clinica` (negação ganha) |
| 2.6 | UI | App da conta só-laboratório | nenhuma tela da clínica alcançável, nem por link |

## T-3 — Bifurcação e perfil

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | Cadastro novo | cai em `welcome-choice`, **não** na triagem |
| 3.2 | UI | Porta "comprar exame" | vai ao perfil do laboratório, não à triagem |
| 3.3 | UI | Porta "virar paciente" | vai à triagem, e a conta vira paciente |
| 3.4 | UI | Porta "só olhar" | entra sem virar paciente |
| 3.5 | UI | Perfil do laboratório | os 4 campos, cada um com o porquê, e um "pular" |
| 3.6 | API | Gravar `sex` | persiste (faltava, e sem ele as faixas saem erradas) |
| 3.7 | API | `intent: "lab"` numa conta já paciente | **não** desmarca |
| 3.8 | UI | Pular o perfil e tentar comprar | pede os campos que a LML exige, sem travar antes |

## T-4 — Pagamento dentro do app

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | Pagar uma consulta no aparelho | folha dentro do app; Safari nunca abre |
| 4.2 | UI | Stripe conclui | a folha fecha sozinha e a tela relê o estado |
| 4.3 | UI | Cancelar no Stripe | "Pagamento cancelado. Nada foi cobrado." |
| 4.4 | UI | Fechar a folha com o X | **não** diz que cancelou; relê o estado |
| 4.5 | UI | Assinar um plano | mesma folha, mesmo retorno |
| 4.6 | UI | Conectar a Withings | folha dentro do app |
| 4.7 | UI | Varredura de texto nas telas pagas | nenhum módulo do app listado como benefício (3.1.1) |

## T-5 — Tenants e idioma

| # | tipo | cenário | esperado |
|---|---|---|---|
| 5.1 | API | Tenant `DOCTOR` com `languages: ["pt"]`, pedido em `en` | não aparece |
| 5.2 | API | O mesmo, pedido em `pt` | aparece |
| 5.3 | API | `languages: []` | aparece nos dois idiomas |
| 5.4 | API | `acceptingPatients: false` | não aparece em nenhum idioma |
| 5.5 | API | Diretório pedido por alguém do próprio tenant | o próprio tenant fora da lista |

## T-6 — A porta para as outras áreas

| # | tipo | cenário | esperado |
|---|---|---|---|
| 6.1 | UI | Rodapé do menu no aparelho do Bruno | `v1.0.0 · update <id>` (prova de que o update chegou) |
| 6.2 | UI | Menu da clínica | linha "Trocar de área" presente |
| 6.3 | UI | Tocar nela | seletor **abre** e fica (não desvia de volta) |
| 6.4 | UI | Escolher Laboratory | entra no laboratório |
| 6.5 | UI | Menu do laboratório | "Trocar de área" presente — há volta |
| 6.6 | UI | Conta com uma área só | o botão não existe |
| 6.7 | UI | Matar e reabrir o app | cai direto na clínica (o desvio segue valendo no login) |

## Fora deste QA

Agendar com o tenant médico (não existe), Android (nunca construído), videoconsulta.
