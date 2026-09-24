# QA — Atividade 075

Ambiente: worktree `app_clinic`, dev em `:4010` (confirmar o PID que serve a porta). Pacientes de
teste com prefixo `qa-075-`, removidos ao final. **Nenhuma paciente real, em nenhum cenário.**

## T-1 — Tela de cadastro

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | UI | Cadastro com dados válidos | Entra autenticado; `User` novo com `role PATIENT`, `clinicId` da padrão, `consentAcceptedAt` nulo |
| 1.2 | UI | Senha com 7 caracteres | Recusa na tela, sem chamada ao servidor |
| 1.3 | UI | Confirmação diferente da senha | Recusa na tela |
| 1.4 | API | `POST /api/mobile/register` sem `lastName` | 400 |
| 1.5 | API | Clínica no limite de pacientes | 403 com a mensagem do limite; nenhum usuário criado |
| 1.6 | UI | Idioma PT e EN | Todos os textos e erros traduzidos |

## T-2 — Para onde vai quem se cadastrou

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | UI | Terminar o cadastro | Primeira tela é a avaliação, não a home |
| 2.2 | UI | Voltar para a home sem terminar | **Um** convite para completar a avaliação; nenhuma pilha de erros |
| 2.3 | API | Rotas do paciente antes do aceite | `403 consent_required` (gate da 074) |
| 2.4 | UI | Terminar a avaliação com o aceite | Home carrega; `consentAcceptedAt` gravado |

## T-3 — Paciente que já existe

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 3.1 | UI | Cadastrar com e-mail existente | Convite "você já tem conta", com Entrar e Definir minha senha |
| 3.2 | DB | Depois de 3.1 | Continua **um** usuário com aquele e-mail |
| 3.3 | UI | "Definir minha senha" | Abre com o e-mail preenchido; resposta neutra |
| 3.4 | E2E | Paciente criado pela clínica, sem senha | Define senha pelo link e entra |

## T-4 — Excluir a conta

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 4.1 | UI | Excluir com senha correta | Sessão encerrada; volta ao login |
| 4.2 | API | Token anterior depois de 4.1 | 401 |
| 4.3 | DB | Depois de 4.1 | Nenhum dado identificável em `User`; `isActive false` |
| 4.4 | DB | Registro clínico | Triagem, notas e medições preservadas, ligadas ao registro anonimizado |
| 4.5 | API | Senha errada | 401/403, nada alterado |
| 4.6 | DB | Auditoria | Linha com quem, quando e de onde |
| 4.7 | UI | Texto da confirmação | Diz o que fica guardado e por quê |

## T-5 — Código do profissional

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 5.1 | UI | Cadastro sem código | Clínica padrão |
| 5.2 | UI | Código válido de outra clínica | Nome da clínica aparece antes; paciente criado nela |
| 5.3 | API | Código inexistente | 404; **nenhum** usuário criado |
| 5.4 | API | Código de clínica inativa | 404 |
| 5.5 | E2E | `/join/<slug>` no iPhone com o app instalado | Abre o app com o código preenchido |

## T-6 — Atalho no site

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 6.1 | UI | `/get-the-app` no desktop | Link real da App Store + QR |
| 6.2 | UI | `/get-the-app` no Android | Não promete app que não existe |
| 6.3 | UI | Banner no `/dashboard` | Aparece na web, não dentro do app |

## T-7 — Submissão

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 7.1 | Manual | Conta de demonstração | Revisor entra e vê o produto, com dados de teste |
| 7.2 | Manual | App Privacy | Declara coleta de dado de saúde, coerente com o que o app faz |
| 7.3 | Manual | Exclusão de conta | O revisor acha sem instrução extra (é o que ele procura) |

## T-8 — Google e Apple *(se autorizada)*

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 8.1 | E2E | Entrar com Google, e-mail novo | Conta na clínica certa, sem consentimento, indo para a avaliação |
| 8.2 | E2E | Entrar com Google, e-mail já existente | Reconhece; **nenhuma** conta duplicada |
| 8.3 | E2E | Sign in with Apple com e-mail privado | Conta criada; decidido como a clínica contata |
| 8.4 | Manual | Tela de login | Os dois botões presentes (4.8) |

## Transversal

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| X.1 | API | Todo cadastro | Nunca cria conta sem `clinicId` |
| X.2 | API | Paciente de uma clínica lendo dados de outra | 0 resultados / 404 |
| X.3 | API | Rotas novas com bearer inválido | 401 |
| X.4 | DB | Fim do QA | Nenhuma linha `qa-075-` sobrando |
