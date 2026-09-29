# Capturas do app — Google Play e App Store

Feitas em 29/09/2026, do app rodando **no navegador**, apontando para o
**banco local**. Nenhum dado de produção, nenhum paciente real — a paciente é a
`Maria Santos` do banco de desenvolvimento.

## Pastas

| pasta | tamanho | para quê |
|---|---|---|
| `cru/` | 414×896 | o que saiu do navegador, sem tratamento |
| `google-play-phone/` | 1080×1920 (9:16) | Play Console → Store listing → Phone screenshots |
| `app-store-6.7/` | 1290×2796 | App Store Connect, iPhone 6.7" (15/16 Pro Max) |

As tratadas são escaladas pela largura e **completadas** em cima e embaixo com a
cor do próprio topo da tela. Sem esticar: interface esticada numa vitrine parece
interface mal feita.

## As doze telas

| arquivo | o que mostra |
|---|---|
| `01-inicio` | próxima sessão, plano do dia, atalhos |
| `02-marcar` | escolher o tipo de consulta |
| `02-marcar-formato` | **os três formatos**: na clínica, por vídeo, em casa |
| `03-consultas` | histórico e o que vem |
| `04-exercicios` | o programa, com séries |
| `05-mensagens` | conversa com a clínica |
| `06-artigos` | material da clínica, com capa |
| `07-documentos` | exames, laudos e receitas |
| `08-notificacoes` | a chave e **o que chega no celular** |
| `09-quem-tem-acesso` | quem vê os dados, e cortar |
| `10-menu` | o menu do paciente |
| `11-artigo` | artigo aberto, legível |

## Por que isto não existia antes

Duas telas do app importavam pacote **só-nativo** direto, e cada uma derrubava o
navegador de um jeito:

- `@stripe/stripe-react-native` em `invoices.tsx` quebrava o **empacotamento**;
- `@daily-co/react-native-daily-js` em `consulta-video.tsx` quebrava a
  **execução**, e derrubava o app inteiro — o `expo-router` importa todas as
  rotas na abertura, então uma tela leva todas.

Os dois viraram módulo por plataforma (`src/lib/stripe-nativo.ts` e
`daily-nativo.ts`, com irmão `.web.ts`). Era por isso que o QA terminou a 102
T-8, T-9 e T-10 com *"a tela do app não foi medida"* — e o diagnóstico corrente,
cache do Metro, estava errado nas três vezes.

## O que eu mudei **no banco local** para as telas não saírem vazias

Nada disso toca produção:

- `First consultation` e `Follow-up session` passaram a permitir vídeo e
  domicílio (`requiresInPerson: false`, `allowsHomeVisit: true`);
- a paciente ganhou endereço completo — sem ele o domicílio **nunca** aparece,
  por desenho;
- `fullAccessOverride` na paciente, agenda de seg a sex 09–17, o terapeuta
  marcado como `bookable`, uma consulta futura por vídeo e dois artigos.

## Para reproduzir

```
npx next dev -p 4020
cd mobile && EXPO_PUBLIC_API_URL=http://127.0.0.1:4020 npx expo start --web --port 8090
```
Entrar com `maria.final.email@example.com` / `MockUp2026!` (**só no banco local**).

## O que ainda falta para a ficha

- **Tablet de 7" e de 10"** — o Play marca as duas como exigidas. Mesmo método,
  outro viewport; faço quando você disser.
- As capturas mostram a interface em **inglês**. Se a ficha for ter português,
  são outras doze.
