# T-7: "View as Student" abre o portal do aluno

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Com a impersonação ativa, `/dashboard` mostra a home do aluno, não o "Therapist Dashboard".

## Contexto
Achado do QA da 52/T-1: `app/dashboard/page.tsx` escolhe o painel pelo papel da sessão, ignorando a impersonação.

## Passos
1. Usar a identidade efetiva (impersonação) para escolher o painel.

## Arquivos afetados
- `app/dashboard/page.tsx`

## Critérios de aceite
- [ ] Trainer → View as Student → home do aluno; "Voltar ao Admin" funciona.
