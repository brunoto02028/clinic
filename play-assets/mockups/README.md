# Capturas do app — Google Play e App Store

Feitas em 29/09/2026, do app rodando **no navegador**, apontando para o
**banco local**. Nenhum dado de produção, nenhum paciente real — a paciente é a
`Maria Santos` do banco de desenvolvimento.

## Pastas

| pasta | tamanho | para quê |
|---|---|---|
| `cru/` | 414×896 | telefone, direto do navegador |
| `cru-tablet7/` | 800×1422 | tablet 7", direto do navegador |
| `cru-tablet10/` | 1024×1820 | tablet 10", direto do navegador |
| `google-play-phone/` | 1080×1920 | Play → Phone screenshots |
| `google-play-tablet-7/` | 1080×1920 | Play → **7-inch tablet** (exigido) |
| `google-play-tablet-10/` | 1440×2560 | Play → **10-inch tablet** (exigido) |
| `app-store-6.7/` | 1290×2796 | App Store, iPhone 6.7" (15/16 Pro Max) |
| `app-store-ipad-12.9/` | 2048×2732 | App Store, iPad Pro 12,9" |

Os tablets foram capturados **já em 9:16**, para o conteúdo preencher o quadro
em vez de ser completado com borda. A primeira tentativa foi em 4:3 e ficou com
metade da imagem vazia — refeita.

**Tudo em inglês**, que é a língua primária do produto. Não há versão em
português: se a ficha for ter uma, são outras dez por tamanho.

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

## Uma coisa honesta sobre os tablets

**O app não tem layout de tablet.** Numa tela grande ele mantém a coluna do
telefone centralizada, e sobra espaço embaixo nas telas curtas. As capturas
mostram isso porque é o que existe — não dá para consertar numa vitrine.

Quem resolveria é um layout próprio para tela grande: duas colunas, ou cartões
lado a lado. É trabalho de produto, não de captura. Fica registrado como
decisão sua: publicar assim, ou fazer o layout antes.

As telas mais longas — marcar consulta, exercícios, documentos — preenchem bem.
As curtas — quem tem acesso, notificações — é que mostram o vazio. Se for
publicar assim, escolha as longas para a vitrine.
