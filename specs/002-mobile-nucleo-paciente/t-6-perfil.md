# T-6: Perfil — ver + editar dados básicos

**Status:** concluído (QA `report-t-6.md` aprovado 4/4)
**Depende de:** T-1, T-2

## Objetivo
Tela de perfil do paciente: visualizar dados e editar campos básicos (nome, telefone).

## Contexto
Edição limitada a campos básicos nesta fase (Suposição #2). Sem upload de foto.

## Passos
1. Confirmar a rota de perfil (GET/PATCH) e aplicar auth dual (T-1).
2. Tela de visualização: nome, e-mail, telefone, clínica.
3. Formulário de edição (RHF) para nome/telefone; validação; salvar via PATCH.
4. Feedback de sucesso/erro; invalidar query do perfil após salvar.
5. Botão de logout (mover o atual da home para o perfil).

## Arquivos afetados
- `mobile/app/(app)/(tabs)/profile.tsx`
- `mobile/src/api/profile.ts`
- rota de perfil no backend (auth dual)

## Critérios de aceite
- [ ] Perfil exibe dados reais do paciente.
- [ ] Editar nome/telefone persiste (confirmado por reload).
- [ ] Validação de campos.
- [ ] Logout funciona a partir do perfil.
