# T-3: Quem já é paciente — reconhecer em vez de recusar

**Status:** concluído · **Depende de:** T-1

## Objetivo
Que o paciente que a clínica já cadastrou não bata num muro ao tentar "se cadastrar".

## Contexto
Hoje a rota responde `409 An account with this email already exists`. Para quem foi cadastrado
pela clínica e nunca definiu senha, isso é um beco: ele não sabe a senha e acabou de ser
informado de que não pode criar conta. A tela de recuperar senha da 074 é exatamente a saída.

## Passos
1. No `409`, trocar o erro por um convite: "Você já tem conta aqui", com dois botões — **Entrar**
   e **Definir minha senha** (a tela da 074, levando o e-mail digitado).
2. Nunca criar segunda linha para o mesmo e-mail. O `409` do servidor é a fonte da verdade.
3. Conferir que a rota de reset funciona para conta criada pela clínica sem senha definida.

## Arquivos afetados
- `mobile/app/register.tsx`, `mobile/app/forgot-password.tsx`

## Critérios de aceite
- [ ] E-mail já cadastrado leva ao convite, não a uma mensagem de erro
- [ ] "Definir minha senha" chega na tela com o e-mail preenchido
- [ ] Paciente criado pela clínica consegue definir senha e entrar
- [ ] Nenhum usuário duplicado no banco depois do teste
