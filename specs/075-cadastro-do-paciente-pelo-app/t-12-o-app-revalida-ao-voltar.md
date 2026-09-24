# T-12: O app revalida quando o paciente volta para ele

**Status:** em revisão · **Depende de:** nenhuma

## Objetivo
Que o que a clínica muda no admin apareça no app sem o paciente reinstalar nada.

## Contexto — medido, não suposto
A auditoria de paridade de 24/09 registrou isto como **F5**, e acabei de confirmar no código:

- `mobile/src/lib/query-client.ts:17` — `refetchOnWindowFocus: false`;
- não existe `AppState`, `focusManager`, `onlineManager` nem `NetInfo` em `mobile/`;
- as queries usam `staleTime: 0` + `refetchOnMount`, o que só dispara quando a tela **desmonta e
  remonta** — e as abas do app nunca desmontam durante a sessão.

Resultado: o terapeuta troca o protocolo, revoga um módulo, marca uma consulta — e o paciente
continua vendo o estado antigo até fechar e abrir o app. As 17 `invalidateQueries` que existem são
todas disparadas por ação do próprio paciente; nenhuma por mudança da clínica.

Congelados por sessão: home (consultas, prescrições, protocolos, mensagens), liberação para
exercício, módulos, acesso, notas clínicas e notificações.

## Passos
1. Ligar o `focusManager` do React Query ao `AppState` do React Native — é o padrão documentado
   deles para mobile. Voltar do segundo plano passa a revalidar tudo que está montado.
2. Ligar o `onlineManager` ao NetInfo, para o app recuperar sozinho ao voltar a ter rede em vez de
   ficar com a tela de erro até alguém puxar.
3. ~~`staleTime` por tipo de dado~~ — **não feito, de propósito.** O objetivo é que a mudança da
   clínica apareça, e qualquer `staleTime` maior que zero é exatamente um atraso nisso. São ~10
   queries por tela; se bateria ou dado virarem problema de verdade, aí se ajusta com medida, não
   com palpite.
4. Conferir que o `clearSessionCache` do logout continua valendo — revalidar não pode ressuscitar
   cache de quem saiu.

## Arquivos afetados
- `mobile/src/lib/query-client.ts`, `mobile/app/_layout.tsx`, possivelmente `mobile/src/store/auth.ts`

## Critérios de aceite
- [x] Mudança feita no admin aparece no app ao trazer o app de volta ao primeiro plano —
      provado na tela, sem recarregar (`qa/report-t-12.md`)
- [x] Módulo revogado some da navegação sem reiniciar o app — mesma revalidação; `patient-access`
      e `modules` estão entre as queries montadas
- [x] Sem rede, e depois com rede, a tela se recupera sozinha — `onlineManager` + NetInfo, com a
      decisão coberta por teste; o efeito no aparelho depende de build novo
- [x] Nenhum dado de outro usuário reaparece depois de sair e entrar — `clearSessionCache` continua
      cancelando e limpando antes de a identidade mudar, e revalidar não ressuscita cache limpo
