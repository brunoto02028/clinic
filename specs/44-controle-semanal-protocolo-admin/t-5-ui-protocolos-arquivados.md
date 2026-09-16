# T-5: UI — protocolos arquivados recolhidos

**Status:** concluído
**Depende de:** T-4 (o "Restore" depende da correção de status)

## Objetivo
Protocolos com status `ARCHIVED` não parecem ativos na aba Protocol.

## Contexto
Ver plan.md, decisão 6. Hoje a aba lista todos os protocolos do paciente em sequência, com o mesmo
visual e botão "Edit" — o duplicado arquivado da Ana aparece igual ao ativo.

## Passos
1. Na aba Protocol, separar: primeiro os protocolos não arquivados (ordem atual), depois uma seção
   "Archived (N)" recolhida por padrão.
2. Card arquivado expandido mostra badge "Archived", sem o bloco de liberação/grupos editáveis
   (só leitura) e com um botão "Restore" que volta o status pra `SENT_TO_PATIENT` (com
   `confirm()`), usando o PATCH existente — seguro depois da T-4 (voltar de `ARCHIVED` não cria consultas nem exige agenda).

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Protocolo arquivado aparece só na seção "Archived", recolhida por padrão
- [ ] Protocolo ativo continua igual, primeiro na lista
- [ ] "Restore" pede confirmação e volta o protocolo pra ativo
