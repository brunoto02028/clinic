# T-15: Tranca biométrica (Face ID / Touch ID / digital)

**Status:** em andamento
**Depende de:** nenhuma

## Objetivo
O paciente pode exigir rosto ou digital para abrir o app, com o nome que o aparelho dele usa.

## Contexto
Pedido do Bruno, e a observação dele é o coração da tarefa: *"isso depende do aparelho que a
pessoa está usando"*. "Face ID" é marca da Apple e só existe em iPhone com TrueDepth; num
iPhone SE é Touch ID, num Android é digital. O rótulo vem do sistema, não de nós.

O app já guarda a sessão no cofre do aparelho, então o paciente já não digitava senha a cada
abertura. A biometria não economiza digitação — põe uma **tranca** em cima, que é o que importa
num app de saúde num telefone que fica desbloqueado.

Regra que não pode quebrar: ninguém fica trancado para fora da própria conta. Quem apagou o
rosto do aparelho tem a tranca derrubada sozinha, e a senha continua sendo a chave de verdade.

## Passos
1. `expo-local-authentication` + `NSFaceIDUsageDescription` (sem isso o iOS derruba o app).
2. Regras puras em `biometric-rules.ts`: qual sensor anunciar, como chamá-lo, quando trancar.
3. Estado `locked` no store, entre `loading` e `authenticated`.
4. Tela de tranca com duas saídas: o rosto e a senha.
5. Opção no perfil, que só aparece em aparelho com sensor.
6. Re-trancar após 2 min em segundo plano.

## Arquivos afetados
- `mobile/src/lib/biometric-rules.ts`, `biometrics.ts`, `app-lock.ts` (novos)
- `mobile/src/components/BiometricLockRow.tsx` (novo)
- `mobile/app/lock.tsx` (novo)
- `mobile/src/store/auth.ts`, `mobile/app/_layout.tsx`, `app/(app)/_layout.tsx`, `app/index.tsx`
- `mobile/app.json`, `mobile/src/lib/secure-storage.ts`, `mobile/src/lib/i18n.ts`

## Critérios de aceite
- [ ] iPhone com TrueDepth lê "Face ID"; com sensor de digital, "Touch ID"; Android, "digital"
- [ ] Aparelho sem sensor não mostra a opção
- [ ] Sensor sem cadastro mostra a opção desligada, dizendo o que fazer
- [ ] Ligar pede o rosto na hora (confirma que funciona antes de valer)
- [ ] Com a tranca ligada, nada do paciente é buscado antes de destrancar
- [ ] Apagar o rosto do aparelho derruba a tranca, não tranca a pessoa para fora
- [ ] A tela de tranca sempre oferece entrar com a senha
- [ ] Volta ao primeiro plano em menos de 2 min não pede o rosto de novo
