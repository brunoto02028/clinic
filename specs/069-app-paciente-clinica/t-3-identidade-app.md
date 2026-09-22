# T-3: Renomear o app para BPR

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Trocar o nome exibido do app de "BA One" para "BPR".

## Contexto
A identidade **visual** atual está aprovada e não muda (Bruno, 22/09/2026): o slate `#20242D`, o moss e o greige já são as cores da marca. Só o nome muda.

O `bundleIdentifier`/`package` (`com.bpr.rehab`) **não muda** — está publicado na App Store (ascAppId 6781295479) e trocá-lo criaria um app novo, o oposto da decisão tomada.

`slug` e `scheme` ficam como estão: trocar o `scheme` (`bprrehab`) quebra deep links já em circulação, e o `slug` está amarrado ao projeto EAS.

## Passos
1. Em `mobile/app.json`, trocar `expo.name` de `"BA One"` para `"BPR"`.
2. Conferir se o nome aparece hard-coded em alguma tela (splash, login, seletor de módulo) e ajustar.
3. Não tocar em `bundleIdentifier`, `package`, `slug`, `scheme`, `eas.projectId`, ícone, splash ou paleta.
4. Confirmar que o nome sob o ícone muda no build (o nome da ficha na loja é alterado no App Store Connect, não aqui).

## Arquivos afetados
- `mobile/app.json`
- eventuais telas com o nome em texto

## Critérios de aceite
- [ ] App aparece como "BPR" no dispositivo
- [ ] `bundleIdentifier`, `package`, `slug`, `scheme` e `eas.projectId` inalterados
- [ ] Nenhuma mudança de cor, ícone ou splash
- [ ] Nenhum "BA One" sobrando em tela de paciente
