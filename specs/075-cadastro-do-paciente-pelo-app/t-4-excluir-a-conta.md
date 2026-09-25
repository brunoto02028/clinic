# T-4: Excluir a conta pelo app (exigência da Apple)

**Status:** pendente · **Depende de:** decisão do Bruno (suposição 5 do plano)

## Objetivo
Que o paciente consiga encerrar a própria conta de dentro do app.

## Contexto
Diretriz 5.1.1(v): app que **permite criar conta** tem que permitir **excluir a conta**, de
dentro do app, sem e-mail nem telefone. Não existe nada disso no produto — nem no app, nem na
web. Sem isto, a submissão à App Store é rejeitada, e sem loja o paciente não baixa o app.

Conflito real: prontuário tem retenção legal, e a própria tela de consentimento promete
"no mínimo 5 anos após o último tratamento". Apagar tudo seria quebrar essa promessa e a
obrigação clínica. A saída usual, e a que proponho: **encerrar o acesso e anonimizar o
identificável**, preservando o registro clínico sob a base legal já declarada.

**Precisa da sua palavra antes de eu escrever isto.**

## Passos (na leitura proposta)
1. `POST /api/patient/delete-account`, exigindo a senha atual.
2. Anonimizar: e-mail → valor irreversível e único, nome → "Paciente removido", telefone, foto,
   endereço, contato de emergência → nulos. `isActive: false`. Revogar refresh tokens.
   Preservar o clínico (triagem, notas, protocolo, medições) ligado ao registro anonimizado.
3. Gravar `ConsentLog`/auditoria do pedido: quem, quando, de onde.
4. Tela no app, com duas confirmações e o texto do que fica e do que sai — sem eufemismo.
5. Mesma ação na web, para não existir só numa ponta.

## Arquivos afetados
- `app/api/patient/delete-account/route.ts` (novo), `lib/account-closure.ts` (novo)
- `mobile/app/(app)/(clinica)/(tabs)/profile.tsx`, tela nova de confirmação
- `app/dashboard/profile/page.tsx`

## Critérios de aceite
- [ ] Exclusão pedida no app encerra o acesso na hora (token deixa de valer)
- [ ] Nenhum dado identificável do paciente sobrevive em `User`
- [ ] Registro clínico continua existindo, ligado ao registro anonimizado
- [ ] A ação aparece na auditoria
- [ ] Senha errada não exclui nada
- [ ] O texto diz exatamente o que fica guardado, e por quê
