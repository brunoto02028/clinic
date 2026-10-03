# QA — 122 O BeamO, e o que já deitamos fora

O aparelho chega em 04/10/2026 (7h–13h). Os cenários estão divididos em **o que
se mede sem ele** (unitário e local, agora) e **o que só se mede com ele na
mão** (T-7).

## T-1 — a janela decide de quem é cada medição

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 1.1 | Unit | Ligação pessoal de conta partilhada, medição **dentro** de janela | Não escreve; o log conta |
| 1.2 | Unit | A mesma, **fora** de janela | Escreve no dono, sem exigir ação |
| 1.3 | Unit | Aparelho de pulso (`93`/`94`) dentro de janela | Escreve no dono — o relógio é dele |
| 1.4 | Unit | Modelo `null` dentro de janela | **Não** escreve no dono (o erro cai do lado seguro) |
| 1.5 | Unit | Conta não partilhada | Nada muda |
| 1.6 | Unit | `APARELHOS_DE_PULSO` | Só `[93, 94]` — nada por palpite |

## T-2 — o ECG do paciente entra na ficha do paciente

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 2.1 | Unit | Clínica, ECG **dentro** de janela | `ecgRecording.upsert` com o `userId` do paciente, na chave **e** no create |
| 2.2 | Unit | Clínica, ECG **sem** janela | Nada escrito; log `ECG nao atribuidos: N sem janela` |
| 2.3 | Unit | Clínica, **duas** janelas no mesmo instante | Nada escrito; log `N com duas janelas` |
| 2.4 | Unit | Clínica, aparelho de pulso dentro de janela | Nada escrito; log `N de pulso (do dono)` |
| 2.5 | Unit | Ligação pessoal comum | Escreve em quem sincroniza |
| 2.6 | Unit | Auditoria | `CLINIC_MEASUREMENT_ASSIGN` / `EcgRecording`, com quem abriu, o paciente e a sessão |
| 2.7 | Unit | A régua nos dois lados | `ehDeQuemFoiMedido === entraPelaAtribuicao` nas 6 combinações |
| 2.8 | API | `POST /api/admin/measurement-sessions/{id}/fetch` | Pede `bp` **e** `ecg`; a resposta traz `ecg` |
| 2.9 | UI | "Já medi" com ECG e sem pressão | A tela diz que o ECG foi salvo — **não** "nada veio do aparelho" |
| 2.10 | UI | A frase nas duas línguas | Inglês primeiro, PT a seguir; sem a palavra "diagnóstico" |
| 2.11 | Prod | Janela aberta num paciente de **teste**, ECG com o BeamO | A gravação aparece na ficha do paciente de teste, nunca na do dono |

## T-3 a T-8 — pendentes

A escrever quando a tarefa for planeada. O que já está decidido:

- **T-7** (medir o BeamO) é o único cenário que exige o aparelho: para cada
  biomarcador, *chega?*, *com que tipo de medida?*, *com que `model`?*
- **T-5** (o `130`) não tem cenário de UI até o Bruno decidir como ele entra.
  Enquanto não entrar, o número aparece no log `tipos de medida sem nome` — e é
  isso que o QA confere.

## Regras de QA em produção

- Paciente de **teste**, identificado. Nunca uma ficha real (ver
  `feedback_paciente-real-vs-teste`).
- Confirmar o commit pela lista de deployments do Coolify antes de medir
  (`qa-online-buildDate-nao-prova-deploy`).
- Conferir `in sync` no log do contentor se houver mudança de schema
  (`deploy-schema-db-push-silencioso`).
