# QA spec — Atividade 062

## T-1: Texto do guia (consulta domiciliar)

- **UI** — paciente PT abre `/dashboard/guide` → vê o novo parágrafo em português no card do
  step 4.
- **UI** — paciente EN abre a mesma página → vê o parágrafo em inglês.
- **UI mobile** — 390px, card não quebra layout nem corta texto.

## T-2: Permissões padrão por clínica

- **UI** — admin abre a tela de permissões padrão, marca alguns módulos, salva.
- **API** — paciente novo criado (via `/join/[slug]`, fixture de teste) depois da configuração →
  `computePatientAccess` (ou a UI do paciente logo após cadastro) já mostra os módulos do padrão.
- **API — não retroativo** — paciente já existente antes da configuração não muda.
- **API — não reduz plano pago** — paciente com pacote pago continua com tudo que o pacote já
  concedia, mesmo que o padrão da clínica seja mais restrito.
- **API auth** — só staff (ADMIN/SUPERADMIN) consegue ler/gravar o padrão; patient/outro
  role → 401/403.
- **API cross-tenant** — staff de outra clínica não consegue ler/gravar o padrão de uma clínica
  que não é a sua.

## T-3: `forceLocale` central em `notifyPatient`

- **Unit/API** — `notifyPatient({..., yesterdayMissingTitles: [...], forceLocale: "en"})` numa
  paciente `pt-BR` → texto em inglês.
- **Unit/API** — mesmo com `forceLocale: "pt"` numa paciente `en-GB` → texto em português.
- **Regressão** — sem `forceLocale`, comportamento idêntico ao de antes (detecção automática).

## T-4: Escolha de idioma na UI dos lembretes

- **UI** — seção "Today", selecionar PT, clicar "Send now" → lembrete sai em português
  (confirmar no `ClinicMessage`/canal de teste), mesmo numa paciente `en-GB`.
- **UI** — Preview reflete o idioma selecionado antes de mandar.
- **UI regressão** — sem mexer no seletor, comportamento é o de hoje (automático).
- **UI mobile** — 390px, card "Adherence" continua com 3 seções + fechamento semanal, sem
  duplicar, sem cortar texto.
- **API entrada inválida** — `locale` fora de `"en"`/`"pt"` no body → 400.

## T-5: (se confirmado) — escrever cenários específicos só quando a tarefa sair de "pendente
confirmação".
