# T-3: Uma ligação morta grita

**Status:** feita (03/10/2026)
**Depende de:** T-2

## Contexto

Procurar `status: "ERROR"` no caminho da reautorização devolvia **zero**. A
ligação ficava `CONNECTED` e morta, e a tela do paciente lia `CONNECTED`: um mês
de buracos com cara de *"não mediu"*.

A tela **já sabia dizê-lo** — `resumo-de-saude.ts` tem `autorizacao_expirada` e
casa com `/refresh_token|invalid_grant|unauthor/i`. O que faltava era alguém
escrever o estado.

## O que ficou feito

- `WearableConnection.needsReauthAt` — um estado, não uma linha de log. Uma
  cadeia invalidada não volta sozinha.
- O `withingsAccessToken` marca-o **no sítio onde a renovação falha**, que é o
  ponto por onde os quatro caminhos passam.
- E uma renovação que corre bem **apaga** o estado, no mesmo sítio. Um aviso que
  fica depois de resolvido mente tanto quanto um que nunca aparece.
- O cron e o puxar-a-tela também o limpam quando a passagem corre bem.

## Critérios, medidos

- [x] `invalid refresh_token` marca `needsReauthAt` e põe a ligação em `ERROR`
- [x] Sem refresh token nenhum, idem
- [x] Uma renovação bem sucedida apaga o estado
- [x] Um erro passageiro **não** marca

## O que falta

A tela do paciente já lê o `lastSyncError` e sabe dizer *"autorização
expirada"*. **Não foi medida com o estado novo** — e o painel da clínica é a
T-4.
