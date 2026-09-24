# T-4: Alerta de emergência — clínica sempre, paciente só em crise

**Status:** pendente
**Depende de:** T-2, T-3

## Objetivo
Leitura alta gera `Alert` na central da clínica e push para a equipe; crise gera também push para
o paciente.

## Contexto
Decisão D1. A regra "nada sai para o paciente automaticamente" tem exatamente uma exceção:
≥180/120, onde a mensagem é "vá ao pronto-socorro agora". A ativ. 070 já subiu o e-mail ao
paciente para crise; falta o `Alert` e o push.

## Passos
1. A rota de PA chama `createAlert` (ativ. 072) além do `sendAdminAlert`, com `alertDedupeKey`
   para não repetir no mesmo dia.
2. Push para a equipe da clínica em toda leitura acima do limiar de alerta.
3. Push para o paciente **apenas** em crise, com o texto bilíngue que já existe.
4. Prioridade do alerta reflete a faixa (crise = `URGENT`).
5. Leitura vinda do sync Withings passa pelo mesmo caminho — uma leitura é uma leitura, venha do
   manguito ou do teclado.

## Arquivos afetados
- `app/api/patient/blood-pressure/route.ts`
- `app/api/wearables/sync/route.ts`
- `lib/alerts.ts`

## Critérios de aceite
- [ ] 145/92 → alerta na central + push para a equipe, nada para o paciente
- [ ] 190/125 → tudo acima + push para o paciente
- [ ] Duas leituras altas no mesmo dia geram **um** alerta, não dois
- [ ] Leitura normal não gera nada
- [ ] Leitura que chega pelo sync dispara igual à digitada
