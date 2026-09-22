# T-2: Gating do paciente + remoção dos módulos do aluno

**Status:** concluido (QA aprovado 2a rodada + code review aplicado)
**Depende de:** nenhuma

## Objetivo
Fazer o app entregar **só a área do paciente da clínica**: BA e Lab escondidos, módulos do aluno de estúdio removidos, e nenhum usuário preso numa tela quebrada.

## Contexto
Decisões de 22/09/2026: `ba` e `lab` **ficam no código**, escondidos pelo gating; `treino`, `avaliacoes` e `nutricao` **saem do app** — o aluno de estúdio terá app próprio.

O **Lab é caso especial**: está escondido só por enquanto. É feature futura do paciente, a ser liberada quando as APIs estiverem conectadas. Portanto o gating tem que deixar ligá-lo **por dado** (`ClinicModuleAccess.DIAGNOSTICS` ou `moduleOverrides.mod_lab`), sem nova release. Cuidado para o fallback seguro do passo 1 não fechar essa porta.

Dois problemas a resolver juntos:

**1. O fallback que vaza.** `app/api/mobile/modules/route.ts` termina com:

```ts
// If no modules found via permissions, show all (graceful fallback for new users)
if (available.length === 0) return corsJson(withTraining([...MODULE_DEFS]));
```

Paciente sem `ClinicModuleAccess` configurada recebe BA e Lab hoje.

**2. O aluno que fica sem rota.** O mesmo endpoint devolve `[TREINO, AVALIACOES, NUTRICAO]` para tenant PERSONAL. Removendo os route groups, o `ROUTE_MAP` do `module-select` aponta para rotas inexistentes e o app quebra no login. O **Manu Training já está em produção** — isso atinge usuário real.

## Passos
1. Trocar o fallback "mostra tudo" por um fallback seguro: paciente (role não-staff) de tenant de clínica recebe `[clinica]`.
2. Manter intactos: admin/superadmin/`fullAccessOverride` e o `moduleOverrides` (a clínica ainda pode abrir BA/Lab para um paciente específico).
3. Remover os route groups `(treino)`, `(avaliacoes)` e `(nutricao)` de `mobile/app/(app)/` e os clients `training.ts`, `assessments.ts`, `nutrition.ts` — conferindo antes se alguma tela do módulo clínica os importa.
4. Tratar o tenant PERSONAL no app: em vez de navegar para rota inexistente, mostrar aviso explícito de que o estúdio terá app próprio. Alternativa a avaliar: o endpoint deixar de devolver esses módulos para o cliente mobile.
5. Limpar `ROUTE_MAP` e `ICON_MAP` no `module-select.tsx`, tirando as chaves removidas.
6. Corrigir o tipo `ModuleKey` em `mobile/src/store/module.ts` (hoje `"lab" | "clinica" | "ba"`, desalinhado do `ROUTE_MAP`, que usa `as any`) e `AppModule["key"]` em `mobile/src/api/modules.ts`.

## Arquivos afetados
- `app/api/mobile/modules/route.ts`
- `mobile/app/(app)/(treino)/`, `(avaliacoes)/`, `(nutricao)/` (remover)
- `mobile/src/api/training.ts`, `assessments.ts`, `nutrition.ts` (remover)
- `mobile/app/(app)/module-select.tsx`
- `mobile/src/store/module.ts`, `mobile/src/api/modules.ts`

## Critérios de aceite
- [ ] Paciente sem `ClinicModuleAccess` recebe só `clinica` e cai direto na área clínica
- [ ] Admin e superadmin continuam vendo todos os módulos
- [ ] `moduleOverrides` ainda libera BA/Lab para um paciente específico
- [ ] **Habilitar `DIAGNOSTICS` na clínica faz o Lab aparecer para o paciente sem novo build** — provado em QA
- [ ] Aluno de tenant PERSONAL **não** vê tela quebrada — recebe aviso claro
- [ ] Nenhum import órfão após a remoção; app compila e o bundle não cresce com código morto
- [ ] Tipos de módulo alinhados, sem `as any` no `ROUTE_MAP`
