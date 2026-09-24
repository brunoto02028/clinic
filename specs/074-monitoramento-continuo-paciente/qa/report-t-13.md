# QA Report — T-13: Aviso de não emergência no app

**Data:** 24/09/2026 · **Ambiente:** worktree `C:\Users\bruno\orca\workspaces\clinic\app_clinic`, dev em `http://localhost:4010` (PID confirmado como `next dev -p 4010` deste worktree)
**Dados de teste:** prefixo `qa-t13-` (clínica, admin e dois pacientes, en-GB e pt-BR). Nenhum paciente real tocado.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — 11 cenários ✅, 1 ❌ (13.2 pela metade), 1 não executado (app).

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Aviso completo nas duas telas, EN e PT | UI | ✅ |
| 2 | Sem aceite: pedido aparece; conectar não faz nada | UI | ✅ |
| 3 | `GET /api/patient/monitoring-consent` sem aceite / sem sessão | API | ✅ |
| 4 | `POST` grava `ConsentLog` com ação, versão, IP e user-agent | API | ✅ *(reprovou antes da correção)* |
| 5 | Gate no servidor: 403 `notice_not_accepted`; passa depois do aceite | API | ✅ |
| 6 | Staff com `clinic=1` não é bloqueado pelo aviso | API | ✅ |
| 7 | Impersonação não aceita pelo paciente → 403 | API | ✅ |
| 8 | Aceite de versão `0.9` não conta | API | ✅ |
| 9 | E-mail de crise: "agora, não depois" + rodapé, EN e PT | API | ✅ |
| 10 | Console sem erro nas duas telas, nos dois idiomas | UI | ✅ |
| 11 | Sem "Rehab"; "Terapeuta"/therapist | Texto | ✅ |
| 12 | Telas do app (mobile) | UI | ⚠️ não executado |
| 13 | Rodapé do aviso na **mensagem curta** (push/SMS) | API | ❌ → corrigido |

## Evidências decisivas

**4 — o bug que teria travado a funcionalidade inteira.** Às 07:28 o `POST` respondia **500**:

```
Unknown argument `ip`. Did you mean `id`? Available options are marked with ?.
?   ipAddress?: String | Null
POST /api/patient/monitoring-consent 500 in 60ms
```

O modelo chama o campo `ipAddress`; a rota escrevia `ip`, e o `as any` do `create` escondeu isso do
TypeScript. Combinado com o gate do cenário 5: **nenhum paciente conseguiria aceitar, logo nenhum
conseguiria conectar aparelho**. Corrigido durante a execução; reteste completo:

```json
POST → {"accepted":true,"acceptedAt":"2026-09-24T06:34:05.142Z","version":"1.0"}
linha: {"action":"MONITORING_NOTICE_ACCEPTED","termsVersion":"1.0",
        "ipAddress":"203.0.113.9","userAgent":"QA-T13/1.0 (curl)",
        "metadata":{"where":"devices"}}
```

`ipAddress` traz só o primeiro item da cadeia `X-Forwarded-For`, como a rota promete.

**5 — o gate é do servidor.**

```
Sem aceite:  GET /api/wearables/connect/withings?format=json
  → 403 {"error":"Please read and accept the monitoring notice…","code":"notice_not_accepted"}
  → sem format=json: 307 para /dashboard/devices?connected=0&error=notice_not_accepted

Depois do aceite, mesma chamada e mesmo token:
  → 200 {"url":"https://account.withings.com/oauth2_user/authorize2?…&state=…"}
     (state decodificado termina em `.self.` — aparelho do paciente)
```

**6 — o staff não é bloqueado**, e os controles provam que o gate não está morto:

```
admin com clinic=1          → 200, state "…withings.clinic…"
o MESMO admin sem clinic=1  → 403 notice_not_accepted
paciente com clinic=1       → 403 "Only clinic staff can connect a clinic device"
```

**7 — impersonação:** `GET` sob impersonação responde o estado (útil), `POST` responde
`403 Read-only during impersonation`, e nenhuma linha nova é criada.

**8 — versão errada não conta:** com um `ConsentLog` de `termsVersion: "0.9"`, o GET continua
`accepted: false` e o connect continua 403.

**9 — o e-mail de crise**, capturado do HTML renderizado:

```
en-GB: "This reading is high enough to need medical attention now, not later. Please seek urgent care."
       "🚨 Call 999 now, or go to A&E."
       rodapé == NON_EMERGENCY_NOTICE['en-GB'].short
pt-BR: "Esta leitura é alta o suficiente para precisar de atenção médica agora, não depois."
       "🚨 Ligue 999 (ou a emergência local) agora, ou vá ao pronto-socorro."
       rodapé == NON_EMERGENCY_NOTICE['pt-BR'].short
OK  EN sem 'if this reading persists' · PT sem 'se esta leitura for persistente'
```

A incoerência que o QA da T-11 achou (e-mail "se persistir" × push "pronto-socorro agora") sumiu.

**10 —** zero erros e zero warnings em quatro percursos completos, nos dois idiomas.

## Achados e o que foi feito

1. **❌ → corrigido — o aviso não ia na mensagem curta.** A qa-spec 13.2 pede "e-mail **e** push". O
   `plainMessage`/`plainMessagePt` de `lib/bp-alerts.ts` não levava o aviso. **Corrigido:** os dois
   agora terminam com `noticeFor(locale).short`.
2. **❌ → corrigido — `noticeEmailFooter()` existia e ninguém usava.** `lib/email-i18n.ts` repetia a
   frase como literal: duas fontes para o mesmo texto, e a versão que o paciente aceitou se refere ao
   arquivo. **Corrigido:** o e-mail passa a ler de `noticeFor()`.
3. **⚠️ → corrigido — na web o botão "Connect" parecia ativo e não fazia nada.** Sete botões roxos,
   clicáveis, silenciosos. **Corrigido:** `connectDisabled` no `ConnectDeviceCard`, com `title`
   explicando, nos dois idiomas.
4. **⚠️ → corrigido — contraste do botão desabilitado no app** (texto branco em fundo claro).
5. **⚠️ Pré-requisito de deploy:** o valor `MONITORING_NOTICE_ACCEPTED` do enum precisa estar no banco
   de produção **antes** de o código novo servir tráfego, senão `/api/patient/monitoring-consent` e
   todo `/api/wearables/connect/*` de paciente respondem 500. Em produção o schema é aplicado por
   `prisma db push` no start — mas o `start.sh` sobe o servidor **antes** de rodar o push, então
   existe uma janela de alguns segundos em que isso acontece. Aceitável, mas registrado.
6. **⚠️ Telas do app não executadas** — é app nativo, não dá para dirigir por Playwright, e as telas
   da 074 ainda esperam o build EAS. Verificado por código: o texto do componente do app é **byte a
   byte igual** ao de `lib/non-emergency-notice.ts`, mas é cópia manual, não import.

## Nota sobre o cache (terceiro falso negativo da atividade)

`/dashboard/blood-pressure` não mostrou o aviso em várias tentativas — reload, `localStorage.clear()`,
`caches.delete()`, unregister de service worker e até `Network.setCacheDisabled` na aba já aberta. O
chunk servido **continha** a chamada. Em contexto de browser novo, aparece. Limpar storage numa aba
existente **não basta**: tem que ser `browser.newContext()`.

## Limpeza

Todos os dados `qa-t13-*` removidos (`usuários: 0`, `clínicas: 0`). Oito capturas em
`qa/screenshots/t-13-*.png`.
