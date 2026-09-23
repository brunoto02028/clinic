# T-4: Fase 2A — canal com o terapeuta e prontuário

**Status:** pendente
**Depende de:** T-1

## Objetivo
Levar ao app o núcleo clínico que falta: o canal do paciente com o terapeuta e o prontuário.

## Contexto
Agrupamento definido pelo inventário da T-1 (`qa/report-t-1.md`).

`questions` ("Messages") é item do **menu curado, visível para os dois públicos** — o canal do paciente com a clínica — e hoje **não existe no app**. Foi a ausência mais grave do inventário, por isso abre a Fase 2.

| Tela | Endpoint | Módulo |
|---|---|---|
| `questions` | `/api/patient/questions`, `/api/patient/messages` | — (menu curado) |
| `records` | componente `PatientRecords` | `mod_records` |
| `recordings` | `/api/patient/consultation-recording` | `mod_recordings` |
| `clinical-notes/create` | sub-rota | `mod_clinical_notes` |

Todos os endpoints já existem — **nenhum backend novo**.

## Passos
1. Criar os clients em `mobile/src/api/` no padrão dos existentes (`apiFetch`, tipos em `types.ts`).
2. Criar as telas em `mobile/app/(app)/(clinica)/` com o design system do app.
3. `questions`: listar, enviar pergunta e marcar lida. Conferir como a resposta do staff chega (`senderRole === "staff"`, `readAt`).
4. `recordings`: decidir se o app grava áudio ou só lista. Gravar exige permissão de microfone — `app.json` hoje tem `permissions: []`, e mexer nisso afeta a ficha da loja.
5. Ligar os pontos de entrada a partir da home/tabs.

## Arquivos afetados
- `mobile/src/api/*.ts` (novos clients)
- `mobile/app/(app)/(clinica)/*.tsx` (novas telas)
- `mobile/app/(app)/(clinica)/(tabs)/index.tsx`
- `mobile/app.json` (só se `recordings` gravar áudio)

## Critérios de aceite
- [ ] Paciente envia pergunta e vê a resposta do terapeuta
- [ ] Contador de não lidas bate com a web
- [ ] Nenhum endpoint novo no backend
- [ ] Decisão sobre gravação de áudio registrada no report
- [ ] Estados de carregando/vazio/erro cobertos
- [ ] Nenhuma tela acessível a quem não tem o módulo (usar o `ModuleGuard` da T-2 como referência)
