# T-5: Preferências de notificação do paciente

**Status:** pendente
**Depende de:** T-1

## Objetivo
O paciente escolhe o que quer receber, e entende o que está desligado no sistema operacional.

## Contexto
Risco do plano: permissão negada é o estado mais comum no iOS, e sem explicação o paciente acha
que o app está quebrado. A tela precisa distinguir "eu desliguei" de "o iPhone bloqueou".

## Passos
1. Tela em Perfil → Notificações (a rota existe; hoje só lista notificações).
2. Chaves por tipo: lembretes de exercício, consultas, mensagens da clínica.
3. **Alertas de emergência não são desligáveis** — dizer isso na tela, com o motivo.
4. Com a permissão do sistema negada, mostrar o aviso e um botão que abre os ajustes.
5. Persistir em `User.notificationPreferences` (Json).

## Arquivos afetados
- `mobile/app/(app)/notifications.tsx`
- `app/api/patient/profile/route.ts`
- `prisma/schema.prisma`

## Critérios de aceite
- [ ] Desligar um tipo impede aquele push, e só aquele
- [ ] Emergência continua chegando com tudo desligado
- [ ] Permissão negada é explicada, não escondida
- [ ] A preferência sobrevive a reinstalar o app (está no servidor, não no aparelho)
