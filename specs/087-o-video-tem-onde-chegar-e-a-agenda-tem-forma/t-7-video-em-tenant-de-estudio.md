# T-7: O vídeo em tenant de estúdio deixa de sumir

**Status:** pendente
**Depende de:** T-6

## Objetivo
Em tenant de estúdio/personal, o vídeo que o aluno manda para de ficar inacessível pela interface.

## Contexto
A aba "Exercises" é escondida por `!isPersonal` — decisão da atividade 55, para o estúdio prescrever
por Workouts e não ter dois caminhos desconexos. Mas o **envio** continua aceito nesses tenants: o
vídeo entra no R2, nasce o registro, conta no badge, e **não existe tela para vê-lo**.

É o defeito que o Bruno acabou de viver, com o agravante de nem haver aba para procurar.

Aceitar e esconder é a única saída que não se defende. Entre mostrar e recusar, **mostrar** ganha: o
aluno já gravou, e recusar depois do esforço é pior.

## Passos
1. Decidir onde o painel aparece no estúdio — dentro da aba de Workouts, ou a aba de exercícios
   liberada só quando há vídeo.
2. Garantir que a fila da T-4 também funcione nesse tenant.
3. Teste que prova: envio aceito ⇒ existe caminho na interface até ele.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`
- `__tests__/exercises/video-no-estudio.test.ts` (novo)

## Critérios de aceite
- [ ] Vídeo enviado em tenant de estúdio tem caminho na interface
- [ ] A fila da T-4 mostra vídeos desse tenant
- [ ] Nenhuma regra de tenant afrouxada de lado nenhum
