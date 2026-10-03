# T-5: Medir quanto tempo esteve parada, e porquê

**Status:** instrumentada (03/10); a medição espera o deploy e o Bruno reconectar
**Depende de:** T-1, T-2, T-3

## Objetivo

Saber, depois do deploy, se a ligação volta a parar — e por que motivo.

## Contexto

A T-1 fecha a corrida que eu **consigo explicar**. O que não se sabe é se foi a
única causa: a ligação esteve morta ~27 dias e a única prova é uma linha de log
que diz `invalid refresh_token`, sem dizer quem chamou nem quando.

## O que ficou feito

1. `withingsAccessToken` recebe a **origem** — `cron`, `webhook`, `manual`,
   `sondagem`, `desligar` — e os cinco chamadores identificam-se.
2. Duas linhas de log: `<origem> renova <id>` e
   `<origem> esperou a trava de <id> (volta N)`.
3. Sem origem declarada diz `?`, em vez de atribuir a alguém.

## O que falta, e só se mede em produção

4. Depois do Bruno reconectar: medir uma semana e registar aqui.
5. Se voltar a parar, o log diz qual caminho estava a renovar — a última vez não
   havia nenhuma linha assim, e ficou um mês sem se saber.

## Critérios

- [x] A renovação diz a origem — 3 testes
- [x] A espera pela trava também, com a volta
- [ ] Uma semana de produção sem a ligação parar
- [ ] O número de esperas pela trava é **> 0** — se for zero, a corrida não era
      esta e a causa é outra
- [ ] O relatório fica neste `qa/`
