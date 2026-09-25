# T-4: Painel - escrever, ver a previa, enviar

**Status:** pendente
**Depende de:** T-3

## Objetivo
O Bruno escreve um aviso, ve exatamente o que vai chegar, sabe quantos aparelhos recebem, e envia.

## Contexto
A tela `/admin/notifications` ja existe e manda broadcast **dentro do app**. O push entra como uma
segunda perna do mesmo envio: a mensagem continua sendo criada (e o registro), e o push e o toque
no ombro.

Regra do Bruno: nada sai sem ele ver a previa. Push nao tem desfazer.

## Passos
1. Caixa "tambem notificar no celular" no compositor, com a contagem real de aparelhos ativos.
2. Etapa de previa: titulo e corpo como aparecem na tela bloqueada, mais "vai para N aparelhos de
   M pacientes" - e o que acontece com quem nao tem o app.
3. Envio tenant-scoped por `getActor`/`tenantWhere`, nunca por `clinicId` de query.
4. Registrar o resultado (enviados, falhos) junto do `ClinicBroadcast`.

## Arquivos afetados
- `app/admin/notifications/page.tsx`, `app/api/admin/broadcasts/route.ts`

## Criterios de aceite
- [ ] Sem passar pela previa, nao envia
- [ ] Terapeuta de outra clinica nao alcanca paciente desta
- [ ] Contagem mostrada bate com a quantidade de tokens ativos
- [ ] Sem nenhum aparelho registrado, diz isso em vez de fingir que enviou
