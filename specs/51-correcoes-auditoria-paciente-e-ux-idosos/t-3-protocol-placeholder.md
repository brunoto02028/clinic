# T-3: Corrigir "?" literal no cabeçalho do Protocol

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Quando `totalSessions`/`estimatedWeeks` não estiverem preenchidos, o cabeçalho do protocolo não
mostra um "?" cru.

## Contexto
`app/admin/patients/[id]/page.tsx:1951`:
```tsx
<p className="text-[10px] text-muted-foreground mt-0.5">{pr.items?.length || 0} items · {pr.totalSessions || "?"} sessions · {pr.estimatedWeeks || "?"} weeks</p>
```
Padrão já usado em outro lugar do sistema pra "sem valor" (ex.: Evidence Report) é um traço
"—", não "?".

## Passos
1. Trocar os dois fallbacks `"?"` por `"—"`.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Protocolo sem `totalSessions`/`estimatedWeeks` mostra "— sessions · — weeks" em vez de "?
      sessions · ? weeks".
- [ ] Protocolo com os dois valores preenchidos continua mostrando os números normalmente.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
