# T-2: Painel da clínica — preço de venda, margem e pedidos

**Status:** concluído — QA aprovado com ressalvas (qa/report-t-2.md, 12/12), ressalvas corrigidas e revisão feita em 25/09/2026
**Depende de:** T-1

## Objetivo
O Bruno controla o preço de venda pela tela, vê a margem de cada pedido e acompanha o que foi
vendido — sem depender de eu rodar script.

## Contexto
Regra do projeto: ação de administração é pela UI, não por script meu. O preço de venda é **a**
decisão comercial desta atividade; deixá-la num seed seria entregar pela metade.

## Passos
1. Tela de catálogo no admin: produto, custo (da LML), preço de venda (editável), margem calculada
   em £ e em %, e o interruptor de ativo.
2. Aviso quando o preço de venda for menor ou igual ao custo — e recusa em gravar abaixo do custo
   sem confirmação explícita.
3. Botão de sincronizar catálogo (T-1), mostrando o que entrou, mudou e saiu na última vez.
4. Lista de pedidos: paciente, exame, estado, pago em, custo, venda, margem.
5. Totais do período: vendido, custo, margem.
6. Liberar resultado (T-6) a partir do pedido, com campo de comentário.
7. Tudo sob o tenant do actor: `getActor`, nunca `session.user.clinicId`.

## Arquivos afetados
- `app/admin/labs/page.tsx` (novo)
- `app/admin/labs/orders/page.tsx` (novo)
- `app/api/admin/labs/products/[id]/route.ts` (novo)
- `app/api/admin/labs/orders/route.ts` (novo)

## Critérios de aceite
- [ ] Mudar o preço de venda muda o que o app mostra, sem deploy
- [ ] Preço abaixo do custo exige confirmação e fica registrado em `AuditLog`
- [ ] A margem exibida no pedido é a congelada na venda, não a recalculada com o preço de hoje
- [ ] Admin da clínica A não vê pedido da clínica B
- [ ] Paciente chamando qualquer rota `/api/admin/labs/*` → 403
