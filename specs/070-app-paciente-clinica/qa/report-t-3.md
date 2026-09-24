# QA — T-3: Renomear o app para BPR

**Data:** 22/09/2026 · **Branch:** `brunoto02028/app_clinic`
**Ambiente:** local — Next dev na 4000, Expo Web na 8081 (`EXPO_PUBLIC_API_URL=http://localhost:4000`, `npx expo start --offline`), Postgres `bpr_clinic_local`
**Veredito:** ✅ **APROVADA** — 8 cenários passaram, 0 falharam, 2 não testáveis sem build EAS

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | Tela de abertura mostra "BPR" e o tagline novo | UI | ✅ |
| 2 | Tela de registro mostra "Start your journey with BPR." | UI | ✅ |
| 3 | Nenhum "BA One" sobrando em tela de paciente | grep + UI | ✅ |
| 4 | `slug`, `scheme`, `bundleIdentifier`, `package`, `projectId` inalterados | config | ✅ |
| 5 | Ícone, splash e paleta inalterados | config + git | ✅ |
| 6 | Nome sob o ícone no dispositivo | nativo | ⚠️ exige build EAS |
| 7 | Deep link por `bprrehab://` | nativo | ⚠️ exige build EAS |
| 8 | Regressão: o app compila (bundle Metro) | build | ✅ |
| 9 | Regressão: typecheck sem erro novo | build | ✅ |
| 10 | Regressão: login funciona ponta a ponta | UI + API | ✅ |

## Evidências

### Telas

Abertura (`screenshots/t-3-c10-abertura-bpr.png`):

```yaml
- generic: BPR
- generic: Your recovery, step by step.
- button "Get started"
- generic: Already a member? Sign in
```

Registro (`screenshots/t-3-c10-register-bpr.png`): `Start your journey with BPR.`

### Nenhum "BA One" no app

```
$ grep -rn --exclude-dir=node_modules --exclude-dir=.expo --exclude-dir=dist -i "ba one\|ba-one\|baone" mobile/
--- exit: 1 ---   (zero ocorrências)
```

No resto do repositório sobram só comentários e docs — `app/globals.css`, `prisma/schema.prisma`, `tailwind.config.ts`, `start.sh`, `docs/`, `specs/`. Nenhuma string renderizada.

Visualmente inspecionadas sem "BA One": abertura, registro, login, home da clínica e perfil. O perfil, onde moraria um rodapé "sobre o app", não tem nenhum.

### Identificadores de publicação intactos

Era o ponto de falha grave da tarefa. O diff de `mobile/app.json` é de **uma linha**:

```diff
-    "name": "BA One",
+    "name": "BPR",
```

Confirmado por duas vias independentes — o diff textual e a **config resolvida**, que é o que um build EAS consome de fato:

```
$ npx expo config --type public --json
{ "name": "BPR", "slug": "bpr-rehab", "scheme": "bprrehab",
  "ios": "com.bpr.rehab", "android": "com.bpr.rehab",
  "projectId": "2ac11231-fdb1-485a-adaf-8cf0209bf51d",
  "icon": "./assets/icon.png", "splashBg": "#20242D" }
```

O app publicado continua sendo o mesmo app. Sem risco de ficha nova nem de quebrar deep link em circulação.

### Assets e tema não tocados

```
$ git status --short -- mobile/assets mobile/src/theme
(vazio)
```

Arquivos de código alterados pela T-3, exatamente os esperados: `mobile/app.json`, `mobile/app/index.tsx`, `mobile/app/register.tsx`.

### Regressão

Bundle: `Web Bundled 1729ms (1037 modules)`, sem erro.

Typecheck: 15 erros, **todos pré-existentes** (prop `variant` em `CardProps`, overload de `Platform.select`), nenhum nos arquivos da T-3.

Login ponta a ponta: `POST /api/mobile/login` → 200 com tokens; na UI, o paciente caiu **direto na área clínica** sem passar pelo seletor — comportamento da T-2 preservado. Navegação entre abas funcionando (`screenshots/t-3-regressao-login-ok.png`).

## Erros de console

Nenhum erro de JavaScript. Só `403 @ /api/exercises` (2×), que é o gate de entitlement respondendo — o paciente de teste foi criado sem `ClinicModuleAccess`, e `/api/exercises` é rota web que a T-3 não tocou. A tela degrada corretamente ("0 exercises today").

## O que não foi testado

- **`expo.name` sob o ícone (cenário 6).** Só observável num build nativo. Parcialmente evidenciado: o `<title>BPR</title>` servido pelo Metro vem de `expo.name` — não há `app/+html.tsx` nem `expo.web.name` no projeto. Isso prova que a chave está correta e é lida pelo pipeline, **não** que o rótulo nativo mudou. Confirmar no build EAS.
- **Deep link `bprrehab://` (cenário 7).** Resolução de scheme é do SO. O `scheme` não foi alterado, então não há motivo para quebrar — mas é dedução, não teste.
- **Ficha da loja.** O nome na App Store muda no App Store Connect, não no `app.json`. Passo manual, fora do código.

## Dados de teste

Postgres local, fictícios: clinic `qa069t3-clinic`, user `qa069t3-paciente@example.com`, 3 `MobileRefreshToken`.

**Remoção confirmada:** `users qa069t3 = 0 | clinics qa069t3 = 0`. Totais restaurados: clinics = 9, users = 48. `.env` e `.playwright-mcp/` removidos, processos encerrados. Nenhuma alteração temporária de código.

## Pendências registradas

1. **Confirmar `expo.name` e o deep link no próximo build EAS** — único critério sem evidência direta.
2. **Renomear a ficha no App Store Connect** — senão o app fica "BPR" no dispositivo e com o nome antigo na loja.
3. **Fora do escopo — `mobile/tsconfig.json` sem typecheck limpo.** `npx tsc --noEmit` não roda sem `--ignoreDeprecations 6.0` (TS5101, `baseUrl` deprecado) e, com a flag, acusa 15 erros pré-existentes. Nenhum da T-3, mas significa que **não existe guarda de tipos funcionando no app mobile**.
4. **Fora do escopo — "Rehab" nos identificadores.** `slug`, `scheme` e `bundleIdentifier` carregam o termo que a orientação pede para evitar. Aqui é correto mantê-los: são identificadores técnicos publicados e nenhum aparece para o paciente.
