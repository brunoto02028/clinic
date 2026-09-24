# T-9: Conectar o aparelho logo depois do cadastro

**Status:** pendente · **Depende de:** T-2

## Objetivo
Que o paciente saia do cadastro com o aparelho conectado, sem procurar onde fazer isso.

## Contexto
Não dá para criar a conta Withings dele por API — a API pública é toda OAuth e pressupõe que a
conta existe. O que dá é tirar o atrito: a própria tela de login da Withings oferece criar conta
ali, então quem ainda não tem cria no meio do fluxo, sem sair da jornada.

Hoje conectar é uma tela dentro de Dispositivos, que ele precisa descobrir sozinho.

## Passos
1. Depois da avaliação (onde o aceite acontece), um convite: "Conectar meu aparelho", explicando
   em uma frase o que a clínica passa a ver.
2. O aviso de não emergência da T-13 da 074 continua antes da autorização — é ele que separa
   "conectei um gadget" de "alguém está me acompanhando".
3. Quem pular, encontra o mesmo convite na home até conectar ou dispensar.
4. Ao voltar da Withings com `connected=1`, confirmar na tela **e dizer se estamos mesmo
   recebendo** (depende da T-10).

## Arquivos afetados
- `mobile/app/(app)/(clinica)/screening.tsx` (fim do fluxo), `(tabs)/index.tsx`, `wearables.tsx`

## Critérios de aceite
- [ ] Do fim da avaliação até a tela da Withings em um toque
- [ ] Quem não tem conta Withings consegue criar sem sair do caminho
- [ ] O aviso de não emergência continua obrigatório antes de autorizar
- [ ] Dispensar não reaparece a cada abertura
