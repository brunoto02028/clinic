# T-1: Onde a clínica decide

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que quem administra a clínica alcance as regras da própria clínica.

## Contexto

Três campos são lidos pelas regras e **nenhuma tela acessível ao ADMIN os
escreve**:

| campo | quem lê | quem escreve hoje |
|---|---|---|
| `consultationAllowsVideo` | `formatosPermitidos` | `/admin/clinics`, só SUPERADMIN |
| `consultationAllowsHomeVisit` | idem | idem |
| `extraSessionPayment` | `bookingOptionsFor` | **ninguém** |

O Bruno procurou os dois primeiros nos ajustes da clínica, não achou, e concluiu
que o recurso não existia — enquanto o motivo real de a escolha de formato não
aparecer no app era só o interruptor desligado. Uma configuração sem tela é uma
constante com passos extras.

## Passos

1. Uma seção **Agendamento** nos ajustes da clínica, com:
   - consulta por vídeo: sim/não;
   - atendimento em domicílio: sim/não;
   - sessão extra: pagar no ato / faturar;
   - (a primeira consulta entra pela T-2).
2. Rota que aceita esses campos para **ADMIN da própria clínica**, com a parede
   de inquilino de sempre — ninguém configura a clínica dos outros.
3. O domicílio diz o que exige: ligado, ele só aparece para paciente com
   endereço completo. Um interruptor que liga e não acontece nada é a pior
   espécie de botão, e este tem um pré-requisito invisível.
4. Os mesmos campos continuam em `/admin/clinics` para o SUPERADMIN — quem
   pode tudo continua podendo, sem duas fontes de verdade.
5. Mudança fica no log de auditoria: quem mudou como a clínica recebe dinheiro,
   e quando.

## Arquivos afetados
- a tela de ajustes da clínica
- uma rota nova, ou a existente aberta a ADMIN com filtro de inquilino
- `__tests__/tenant/ajustes-da-clinica.test.ts`

## Critérios de aceite
- [ ] ADMIN da clínica muda os três campos, e o efeito aparece no app.
- [ ] ADMIN de outra clínica não muda estes — **404**, não 403.
- [ ] O domicílio explica o pré-requisito do endereço.
- [ ] A mudança fica registrada com autor e data.
- [ ] O padrão de quem nunca abrir a tela continua o de hoje.
